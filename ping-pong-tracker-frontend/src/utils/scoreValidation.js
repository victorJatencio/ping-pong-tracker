/**
 * Comprehensive ping-pong score validation utility
 * Implements anti-cheating logic and standard ping-pong rules
 */

// Historical score patterns for anomaly detection
const SCORE_PATTERNS = {
  COMMON_WINNING_SCORES: [21, 22, 23, 24, 25],
  MAXIMUM_REASONABLE_SCORE: 50,
  MINIMUM_WINNING_SCORE: 21,
  MINIMUM_WIN_MARGIN: 2,
  SUSPICIOUS_PATTERNS: [
    {
      pattern: "identical_digits",
      description: "Scores with identical digits (e.g., 22-11)",
    },
    {
      pattern: "round_numbers",
      description: "Suspiciously round numbers (e.g., 30-10)",
    },
    {
      pattern: "extreme_difference",
      description: "Extremely large score differences",
    },
  ],
};

export const validatePingPongScore = (
  player1Score,
  player2Score,
  options = {}
) => {
  const errors = [];
  const warnings = [];
  const suspiciousPatterns = [];

  // Convert to integers for validation
  const score1 = parseInt(player1Score);
  const score2 = parseInt(player2Score);

  // Basic input validation
  if (isNaN(score1) || isNaN(score2)) {
    errors.push("Scores must be valid numbers");
    return { isValid: false, errors, warnings, suspiciousPatterns };
  }

  if (score1 < 0 || score2 < 0) {
    errors.push("Scores cannot be negative");
  }

  // Rule 1: No ties allowed in ping-pong
  if (score1 === score2) {
    errors.push("Tie scores are not allowed in ping-pong");
  }

  // Rule 2: Winner must score at least 21 points
  const maxScore = Math.max(score1, score2);
  const minScore = Math.min(score1, score2);
  const scoreDiff = Math.abs(score1 - score2);

  if (maxScore < SCORE_PATTERNS.MINIMUM_WINNING_SCORE) {
    errors.push(
      `Winner must score at least ${SCORE_PATTERNS.MINIMUM_WINNING_SCORE} points`
    );
  }

  if (
    maxScore >= SCORE_PATTERNS.MINIMUM_WINNING_SCORE &&
    scoreDiff < SCORE_PATTERNS.MINIMUM_WIN_MARGIN
  ) {
    errors.push(
      `Winner must win by at least ${SCORE_PATTERNS.MINIMUM_WIN_MARGIN} points`
    );
  }

  if (
    score1 > SCORE_PATTERNS.MAXIMUM_REASONABLE_SCORE ||
    score2 > SCORE_PATTERNS.MAXIMUM_REASONABLE_SCORE
  ) {
    errors.push(
      `Score seems unreasonably high (maximum ${SCORE_PATTERNS.MAXIMUM_REASONABLE_SCORE} points)`
    );
  }

  // Advanced pattern analysis for suspicious behavior
  if (errors.length === 0) {
    // Check for identical digit patterns
    if (hasIdenticalDigits(score1, score2)) {
      suspiciousPatterns.push({
        type: "identical_digits",
        description: "Scores contain identical digit patterns",
        severity: "low",
      });
    }
  }

  // Check for suspiciously round numbers
  if (areRoundNumbers(score1, score2)) {
    suspiciousPatterns.push({
      type: "round_numbers",
      description: "Scores are suspiciously round numbers",
      severity: "low",
    });
  }

  // Check for extreme score differences
  if (scoreDiff > 15) {
    suspiciousPatterns.push({
      type: "extreme_difference",
      description: "Unusually large score difference for ping-pong",
      severity: "medium",
    });
    warnings.push("This is an unusually large score difference for ping-pong");
  }

  // Check for unusually high scores
  if (maxScore > 30) {
    suspiciousPatterns.push({
      type: "high_score",
      description: "Unusually high score for standard ping-pong",
      severity: "medium",
    });
    warnings.push("This is an unusually high score for ping-pong");
  }

  // Check for perfect game patterns (might indicate fake scores)
  if (minScore === 0 && maxScore >= 21) {
    suspiciousPatterns.push({
      type: "perfect_game",
      description: "Perfect game (shutout) is rare in ping-pong",
      severity: "low",
    });
    warnings.push("Perfect games (shutouts) are rare in ping-pong");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suspiciousPatterns,
    winner: score1 > score2 ? "player1" : "player2",
    loser: score1 > score2 ? "player2" : "player1",
    scoreDifference: scoreDiff,
    confidence: calculateConfidenceScore(score1, score2, suspiciousPatterns),
  };
};

/**
 * Helper function to detect identical digit patterns
 */
const hasIdenticalDigits = (score1, score2) => {
  const str1 = score1.toString();
  const str2 = score2.toString();

  // Check if scores have identical digits (e.g., 22-11, 33-22)
  if (str1.length === 2 && str2.length === 2) {
    return str1[0] === str1[1] && str2[0] === str2[1];
  }

  return false;
};

/**
 * Helper function to detect suspiciously round numbers
 */
const areRoundNumbers = (score1, score2) => {
  // Check if both scores are multiples of 5 or 10
  const isRound1 = score1 % 10 === 0 || score1 % 5 === 0;
  const isRound2 = score2 % 10 === 0 || score2 % 5 === 0;

  return isRound1 && isRound2 && (score1 > 25 || score2 > 25);
};

/**
 * Calculate confidence score for the submitted scores
 */
const calculateConfidenceScore = (score1, score2, suspiciousPatterns) => {
  let confidence = 100;

  // Reduce confidence based on suspicious patterns
  suspiciousPatterns.forEach((pattern) => {
    switch (pattern.severity) {
      case "low":
        confidence -= 5;
        break;
      case "medium":
        confidence -= 15;
        break;
      case "high":
        confidence -= 30;
        break;
    }
  });

  // Boost confidence for common score patterns
  const maxScore = Math.max(score1, score2);
  if (SCORE_PATTERNS.COMMON_WINNING_SCORES.includes(maxScore)) {
    confidence += 10;
  }

  return Math.max(0, Math.min(100, confidence));
};

/**
 * Create audit trail entry for score updates
 */
export const createScoreAuditEntry = (
  matchId,
  userId,
  oldScores,
  newScores,
  validation
) => {
  const auditEntry = {
    matchId,
    updatedBy: userId,
    timestamp: new Date().toISOString(),
    changes: {
      from: {
        player1Score: oldScores.player1Score || 0,
        player2Score: oldScores.player2Score || 0,
      },
    },
    to: {
      player1Score: newScores.player1Score,
      player2Score: newScores.player2Score,
    },
    type: "score_update",
    validation:
      validation ||
      validatePingPongScore(newScores.player1Score, newScores.player2Score),
    metadata: {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: generateSessionId(),
    },
  };
  return auditEntry;
};

/**
 * Generate unique session ID for audit tracking
 */
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Analyze historical scores for pattern detection
 */
export const analyzeScoreHistory = (userScores, timeframe = "30d") => {
  if (!userScores || userScores.length === 0) {
    return { patterns: [], riskLevel: "low", recommendations: [] };
  }

  const patterns = [];
  const recommendations = [];
  let riskLevel = "low";

  // Analyze win rate patterns
  const winRate =
    userScores.filter((score) => score.won).length / userScores.length;

  if (winRate > 0.95) {
    patterns.push({
      type: "high_win_rate",
      description: "Unusually high win rate",
      value: winRate,
      severity: "medium",
    });
    riskLevel = "medium";
  }

  // Analyze score difference patterns
  const avgScoreDiff =
    userScores.reduce((sum, score) => sum + score.scoreDifference, 0) /
    userScores.length;

  if (avgScoreDiff > 10) {
    patterns.push({
      type: "high_avg_difference",
      description: "Consistently large score differences",
      value: avgScoreDiff,
      severity: "low",
    });
  }

  const scoreFrequency = {};
  userScores.forEach((score) => {
    const scoreKey = `${score.userScore}-${score.opponentScore}`;
    scoreFrequency[scoreKey] = (scoreFrequency[scoreKey] || 0) + 1;
  });

  const repeatedScores = Object.entries(scoreFrequency).filter(
    ([_, count]) => count > 3
  );
  if (repeatedScores.length > 0) {
    patterns.push({
      type: "repeated_scores",
      description: "Same exact scores reported multiple times",
      value: repeatedScores,
      severity: "high",
    });
    riskLevel = "high";
  }

   // Generate recommendations
   if (patterns.length === 0) {
    recommendations.push('Score patterns appear normal');
  } else {
    recommendations.push('Consider reviewing recent match results for accuracy');
    if (riskLevel === 'high') {
      recommendations.push('Manual review recommended for recent score submissions');
    }
  }

  return {
    patterns,
    riskLevel,
    recommendations,
    analyzedMatches: userScores.length,
    timeframe
  };
};

/**
 * Format score for display
 */
export const formatScore = (
  player1Score,
  player2Score,
  currentUserIsPlayer1 = true
) => {
  const score1 = player1Score || 0;
  const score2 = player2Score || 0;

  if (currentUserIsPlayer1) {
    return `${score1} - ${score2}`;
  } else {
    return `${score2} - ${score1}`;
  }
};

/**
 * Determine match result from current user's perspective
 */
export const getMatchResult = (match, currentUserId) => {
  if (match.status !== "completed") {
    return "ongoing";
  }

  const currentUserIsPlayer1 = match.player1Id === currentUserId;
  const currentUserScore = currentUserIsPlayer1
    ? match.player1Score
    : match.player2Score;
  const opponentScore = currentUserIsPlayer1
    ? match.player2Score
    : match.player1Score;

  return currentUserScore > opponentScore ? "won" : "lost";
};
