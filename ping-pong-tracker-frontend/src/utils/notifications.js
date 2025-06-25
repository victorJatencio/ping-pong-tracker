/**
 * Notification utility functions for the ping-pong tracker application
 * Handles notification creation, formatting, and delivery
 */

// Notification types and their configurations
export const NOTIFICATION_TYPES = {
  MATCH_INVITATION: {
    type: 'match_invitation',
    icon: '🏓',
    priority: 'high',
    category: 'match'
  },
  MATCH_ACCEPTED: {
    type: 'match_accepted',
    icon: '✅',
    priority: 'normal',
    category: 'match'
  },
  MATCH_DECLINED: {
    type: 'match_declined',
    icon: '❌',
    priority: 'normal',
    category: 'match'
  },
  SCORE_UPDATED: {
    type: 'score_updated',
    icon: '🏆',
    priority: 'high',
    category: 'match'
  },
  MATCH_COMPLETED: {
    type: 'match_completed',
    icon: '🎉',
    priority: 'high',
    category: 'match'
  },
  MATCH_CANCELLED: {
    type: 'match_cancelled',
    icon: '🚫',
    priority: 'normal',
    category: 'match'
  },
  LEADERBOARD_UPDATE: {
    type: 'leaderboard_update',
    icon: '📊',
    priority: 'low',
    category: 'achievement'
  },
  SYSTEM_ANNOUNCEMENT: {
    type: 'system_announcement',
    icon: '📢',
    priority: 'normal',
    category: 'system'
  }
};

/**
 * Generate unique notification ID
 */
export const generateNotificationId = () => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create match invitation notification
 */
export const createMatchInvitationNotification = (inviterUser, match) => {
  return {
    type: NOTIFICATION_TYPES.MATCH_INVITATION.type,
    recipientId: match.player2Id,
    title: 'New Match Invitation',
    message: `${inviterUser.displayName || inviterUser.email} has invited you to a ping-pong match`,
    data: {
      matchId: match.id,
      inviterId: inviterUser.uid,
      inviterName: inviterUser.displayName || inviterUser.email,
      location: match.location,
      scheduledDate: match.scheduledDate,
      notes: match.notes
    },
    priority: NOTIFICATION_TYPES.MATCH_INVITATION.priority,
    category: NOTIFICATION_TYPES.MATCH_INVITATION.category,
    actionRequired: true,
    actions: [
      { type: 'accept', label: 'Accept', variant: 'success' },
      { type: 'decline', label: 'Decline', variant: 'danger' }
    ]
  };
};

/**
 * Create score update notification
 */
export const createScoreUpdateNotification = (updaterUser, match, finalScore) => {
  const opponentId = match.player1Id === updaterUser.uid ? match.player2Id : match.player1Id;
  const winner = determineWinner(match, finalScore);
  const isRecipientWinner = winner.playerId === opponentId;
  
  return {
    type: NOTIFICATION_TYPES.SCORE_UPDATED.type,
    recipientId: opponentId,
    title: 'Match Score Updated',
    message: `${updaterUser.displayName || updaterUser.email} has updated the final score: ${finalScore}`,
    data: {
      matchId: match.id,
      updaterId: updaterUser.uid,
      updaterName: updaterUser.displayName || updaterUser.email,
      finalScore,
      winner: winner.playerId,
      isWinner: isRecipientWinner
    },
    priority: NOTIFICATION_TYPES.SCORE_UPDATED.priority,
    category: NOTIFICATION_TYPES.SCORE_UPDATED.category,
    actionRequired: false
  };
};

/**
 * Create match completion notification
 */
export const createMatchCompletionNotification = (match, winner, loser) => {
  return {
    type: NOTIFICATION_TYPES.MATCH_COMPLETED.type,
    recipientId: loser.id,
    title: 'Match Completed',
    message: `Your match against ${winner.displayName || winner.email} has been completed`,
    data: {
      matchId: match.id,
      winnerId: winner.id,
      winnerName: winner.displayName || winner.email,
      finalScore: `${match.player1Score}-${match.player2Score}`,
      location: match.location
    },
    priority: NOTIFICATION_TYPES.MATCH_COMPLETED.priority,
    category: NOTIFICATION_TYPES.MATCH_COMPLETED.category,
    actionRequired: false
  };
};

/**
 * Create match cancellation notification
 */
export const createMatchCancellationNotification = (cancellerUser, match, reason) => {
  const recipientId = match.player1Id === cancellerUser.uid ? match.player2Id : match.player1Id;
  
  return {
    type: NOTIFICATION_TYPES.MATCH_CANCELLED.type,
    recipientId,
    title: 'Match Cancelled',
    message: `${cancellerUser.displayName || cancellerUser.email} has cancelled your scheduled match`,
    data: {
      matchId: match.id,
      cancellerId: cancellerUser.uid,
      cancellerName: cancellerUser.displayName || cancellerUser.email,
      reason: reason || 'No reason provided',
      originalDate: match.scheduledDate,
      location: match.location
    },
    priority: NOTIFICATION_TYPES.MATCH_CANCELLED.priority,
    category: NOTIFICATION_TYPES.MATCH_CANCELLED.category,
    actionRequired: false
  };
};

/**
 * Create leaderboard update notification
 */
export const createLeaderboardUpdateNotification = (userId, newRank, previousRank) => {
  const rankChange = previousRank - newRank;
  const isImprovement = rankChange > 0;
  
  return {
    type: NOTIFICATION_TYPES.LEADERBOARD_UPDATE.type,
    recipientId: userId,
    title: 'Leaderboard Update',
    message: isImprovement 
      ? `Congratulations! You've moved up ${rankChange} position${rankChange > 1 ? 's' : ''} to rank #${newRank}`
      : `Your leaderboard position has changed to rank #${newRank}`,
    data: {
      newRank,
      previousRank,
      rankChange,
      isImprovement
    },
    priority: NOTIFICATION_TYPES.LEADERBOARD_UPDATE.priority,
    category: NOTIFICATION_TYPES.LEADERBOARD_UPDATE.category,
    actionRequired: false
  };
};

/**
 * Format notification for display
 */
export const formatNotification = (notification) => {
  const config = Object.values(NOTIFICATION_TYPES).find(type => type.type === notification.type);
  const timeAgo = formatTimeAgo(notification.createdAt);
  
  return {
    ...notification,
    icon: config?.icon || '📝',
    priority: config?.priority || 'normal',
    category: config?.category || 'general',
    timeAgo,
    formattedDate: new Date(notification.createdAt).toLocaleDateString(),
    formattedTime: new Date(notification.createdAt).toLocaleTimeString()
  };
};

/**
 * Format time ago string
 */
const formatTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString();
};

/**
 * Determine winner from match and score data
 */
const determineWinner = (match, finalScore) => {
  const [score1, score2] = finalScore.split('-').map(s => parseInt(s));
  const winnerId = score1 > score2 ? match.player1Id : match.player2Id;
  
  return {
    playerId: winnerId,
    score: Math.max(score1, score2)
  };
};

/**
 * Group notifications by category and date
 */
export const groupNotifications = (notifications) => {
  const grouped = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: []
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  
  notifications.forEach(notification => {
    const notifDate = new Date(notification.createdAt);
    const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());
    
    if (notifDay.getTime() === today.getTime()) {
      grouped.today.push(notification);
    } else if (notifDay.getTime() === yesterday.getTime()) {
      grouped.yesterday.push(notification);
    } else if (notifDay >= weekAgo) {
      grouped.thisWeek.push(notification);
    } else {
      grouped.older.push(notification);
    }
  });
  
  return grouped;
};

/**
 * Filter notifications by type or category
 */
export const filterNotifications = (notifications, filters) => {
  return notifications.filter(notification => {
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(notification.type)) return false;
    }
    
    if (filters.categories && filters.categories.length > 0) {
      const config = Object.values(NOTIFICATION_TYPES).find(type => type.type === notification.type);
      if (!filters.categories.includes(config?.category)) return false;
    }
    
    if (filters.unreadOnly && notification.read) return false;
    if (filters.priority && notification.priority !== filters.priority) return false;
    
    return true;
  });
};

/**
 * Get notification summary statistics
 */
export const getNotificationSummary = (notifications) => {
  const summary = {
    total: notifications.length,
    unread: 0,
    byCategory: {},
    byPriority: {},
    recent: 0 // Last 24 hours
  };
  
  const dayAgo = new Date(Date.now() - 86400000);
  
  notifications.forEach(notification => {
    if (!notification.read) summary.unread++;
    if (new Date(notification.createdAt) > dayAgo) summary.recent++;
    
    const config = Object.values(NOTIFICATION_TYPES).find(type => type.type === notification.type);
    const category = config?.category || 'general';
    const priority = config?.priority || 'normal';
    
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    summary.byPriority[priority] = (summary.byPriority[priority] || 0) + 1;
  });
  
  return summary;
};