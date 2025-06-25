/**
 * Audit trail management for score updates and match modifications
 * Provides transparency and anti-cheating capabilities
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Store audit entry in Firestore
 */
export const storeAuditEntry = async (auditEntry) => {
  try {
    const auditCollection = collection(db, 'audit_trail');
    const docRef = await addDoc(auditCollection, {
      ...auditEntry,
      createdAt: new Date(),
      version: '1.0'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Failed to store audit entry:', error);
    throw error;
  }
};

/**
 * Retrieve audit trail for a specific match
 */
export const getMatchAuditTrail = async (matchId, limitCount = 50) => {
  try {
    const auditCollection = collection(db, 'audit_trail');
    const q = query(
      auditCollection,
      where('matchId', '==', matchId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const auditEntries = [];
    
    querySnapshot.forEach((doc) => {
      auditEntries.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return auditEntries;
  } catch (error) {
    console.error('Failed to retrieve audit trail:', error);
    return [];
  }
};

/**
 * Retrieve audit trail for a specific user
 */
export const getUserAuditTrail = async (userId, limitCount = 100) => {
  try {
    const auditCollection = collection(db, 'audit_trail');
    const q = query(
      auditCollection,
      where('updatedBy', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const auditEntries = [];
    
    querySnapshot.forEach((doc) => {
      auditEntries.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return auditEntries;
  } catch (error) {
    console.error('Failed to retrieve user audit trail:', error);
    return [];
  }
};

/**
 * Generate audit summary for administrative review
 */
export const generateAuditSummary = (auditEntries) => {
  const summary = {
    totalEntries: auditEntries.length,
    scoreUpdates: 0,
    statusChanges: 0,
    suspiciousActivities: 0,
    averageConfidence: 0,
    timeRange: {
      earliest: null,
      latest: null
    },
    patterns: {
      highRiskEntries: [],
      commonPatterns: {},
      userActivity: {}
    }
  };
  
  if (auditEntries.length === 0) {
    return summary;
  }
  
  let totalConfidence = 0;
  const timestamps = [];
  
  auditEntries.forEach(entry => {
    // Count entry types
    if (entry.type === 'score_update') {
      summary.scoreUpdates++;
    } else if (entry.type === 'status_change') {
      summary.statusChanges++;
    }
    
    // Analyze confidence scores
    if (entry.validation && entry.validation.confidence !== undefined) {
      totalConfidence += entry.validation.confidence;
      
      if (entry.validation.confidence < 70) {
        summary.suspiciousActivities++;
        summary.patterns.highRiskEntries.push({
          id: entry.id,
          matchId: entry.matchId,
          confidence: entry.validation.confidence,
          patterns: entry.validation.suspiciousPatterns || []
        });
      }
    }
    
    // Track timestamps
    if (entry.timestamp) {
      timestamps.push(new Date(entry.timestamp));
    }
    
    // Track user activity
    const userId = entry.updatedBy;
    if (userId) {
      summary.patterns.userActivity[userId] = (summary.patterns.userActivity[userId] || 0) + 1;
    }
  });
  
  // Calculate averages and ranges
  if (summary.scoreUpdates > 0) {
    summary.averageConfidence = totalConfidence / summary.scoreUpdates;
  }
  
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a - b);
    summary.timeRange.earliest = timestamps[0];
    summary.timeRange.latest = timestamps[timestamps.length - 1];
  }
  
  return summary;
};

/**
 * Check for suspicious activity patterns
 */
export const detectSuspiciousActivity = (auditEntries, userId) => {
  const userEntries = auditEntries.filter(entry => entry.updatedBy === userId);
  const suspiciousIndicators = [];
  
  if (userEntries.length === 0) {
    return { indicators: [], riskLevel: 'low' };
  }
  
  // Check for rapid successive updates
  const timestamps = userEntries.map(entry => new Date(entry.timestamp)).sort((a, b) => a - b);
  for (let i = 1; i < timestamps.length; i++) {
    const timeDiff = timestamps[i] - timestamps[i - 1];
    if (timeDiff < 60000) { // Less than 1 minute between updates
      suspiciousIndicators.push({
        type: 'rapid_updates',
        description: 'Multiple score updates within short time period',
        severity: 'medium',
        evidence: { timeDiff: timeDiff / 1000 }
      });
    }
  }
  
  // Check for consistently low confidence scores
  const confidenceScores = userEntries
    .filter(entry => entry.validation && entry.validation.confidence !== undefined)
    .map(entry => entry.validation.confidence);
  
  if (confidenceScores.length > 0) {
    const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    if (avgConfidence < 60) {
      suspiciousIndicators.push({
        type: 'low_confidence',
        description: 'Consistently low confidence scores',
        severity: 'high',
        evidence: { averageConfidence: avgConfidence }
      });
    }
  }
  
  // Check for repeated identical score patterns
  const scorePatterns = {};
  userEntries.forEach(entry => {
    if (entry.changes && entry.changes.to) {
      const pattern = `${entry.changes.to.player1Score}-${entry.changes.to.player2Score}`;
      scorePatterns[pattern] = (scorePatterns[pattern] || 0) + 1;
    }
  });
  
  const repeatedPatterns = Object.entries(scorePatterns).filter(([_, count]) => count > 2);
  if (repeatedPatterns.length > 0) {
    suspiciousIndicators.push({
      type: 'repeated_patterns',
      description: 'Same score patterns reported multiple times',
      severity: 'medium',
      evidence: { patterns: repeatedPatterns }
    });
  }
  
  // Determine overall risk level
  let riskLevel = 'low';
  const highSeverityCount = suspiciousIndicators.filter(indicator => indicator.severity === 'high').length;
  const mediumSeverityCount = suspiciousIndicators.filter(indicator => indicator.severity === 'medium').length;
  
  if (highSeverityCount > 0 || mediumSeverityCount > 2) {
    riskLevel = 'high';
  } else if (mediumSeverityCount > 0) {
    riskLevel = 'medium';
  }
  
  return {
    indicators: suspiciousIndicators,
    riskLevel,
    totalEntries: userEntries.length,
    analysisDate: new Date().toISOString()
  };
};

/**
 * Format audit entry for display
 */
export const formatAuditEntry = (entry) => {
  const formatted = {
    id: entry.id,
    timestamp: new Date(entry.timestamp).toLocaleString(),
    type: entry.type,
    description: generateAuditDescription(entry),
    confidence: entry.validation?.confidence || 'N/A',
    riskLevel: entry.validation?.confidence < 70 ? 'High' : 'Low'
  };
  
  return formatted;
};

/**
 * Generate human-readable description for audit entry
 */
const generateAuditDescription = (entry) => {
  if (entry.type === 'score_update' && entry.changes) {
    const from = entry.changes.from;
    const to = entry.changes.to;
    return `Score updated from ${from.player1Score}-${from.player2Score} to ${to.player1Score}-${to.player2Score}`;
  }
  
  if (entry.type === 'status_change') {
    return `Match status changed to ${entry.changes?.to?.status || 'unknown'}`;
  }
  
  return 'Match modification';
};