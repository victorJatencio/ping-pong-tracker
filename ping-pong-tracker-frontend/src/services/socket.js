import { io } from 'socket.io-client';
import { store } from '../store';
import { 
    addNotification, 
    markNotificationAsRead,
    updateUnreadCount 
} from '../store/slices/notificationSlice';
import { 
    updateMatchScore, 
    updateMatchStatus,
    addMatchUpdate 
} from '../store/slices/matchSlice';
import { 
    updateLeaderboard 
} from '../store/slices/leaderboardSlice';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
    }

    connect(token) {
        if (this.socket) {
            this.disconnect();
        }

        this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
            auth: {
                token
            },
            transports: ['websocket', 'polling'],
            autoConnect: true
        });

        this.setupEventListeners();
        
        return new Promise((resolve, reject) => {
            this.socket.on('connection:success', (data) => {
                this.isConnected = true;
                console.log('Socket connected successfully:', data);
                resolve(data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                reject(error);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.isConnected = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.isConnected = false;
        });

        // Notification events
        this.socket.on('notification:new', (data) => {
            store.dispatch(addNotification(data.notification));
            store.dispatch(updateUnreadCount());
        });

        this.socket.on('notification:marked-read', (data) => {
            store.dispatch(markNotificationAsRead(data.notificationId));
        });

        // Match events
        this.socket.on('match:score-updated', (data) => {
            store.dispatch(updateMatchScore({
                matchId: data.matchId,
                match: data.match
            }));
            store.dispatch(addMatchUpdate(data));
        });

        this.socket.on('match:status-updated', (data) => {
            store.dispatch(updateMatchStatus({
                matchId: data.matchId,
                match: data.match
            }));
            store.dispatch(addMatchUpdate(data));
        });

        this.socket.on('match:user-joined', (data) => {
            console.log('User joined match:', data);
        });

        this.socket.on('match:user-left', (data) => {
            console.log('User left match:', data);
        });

        // Leaderboard events
        this.socket.on('leaderboard:updated', (data) => {
            store.dispatch(updateLeaderboard(data.leaderboard));
        });

        // Achievement events
        this.socket.on('achievement:unlocked', (data) => {
            // Show achievement notification
            store.dispatch(addNotification({
                type: 'achievement',
                title: 'Achievement Unlocked!',
                message: `You unlocked: ${data.achievement.title}`,
                data: data.achievement
            }));
        });

        // System events
        this.socket.on('system:announcement', (data) => {
            store.dispatch(addNotification({
                type: 'system',
                title: data.announcement.title,
                message: data.announcement.message,
                data: data.announcement
            }));
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    // Match-related methods
    joinMatch(matchId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('match:join', { matchId });
        }
    }

    leaveMatch(matchId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('match:leave', { matchId });
        }
    }

    updateMatchScore(matchId, player1Score, player2Score, notes) {
        if (this.socket && this.isConnected) {
            this.socket.emit('match:score-update', {
                matchId,
                player1Score,
                player2Score,
                notes
            });
        }
    }

    updateMatchStatus(matchId, status, notes) {
        if (this.socket && this.isConnected) {
            this.socket.emit('match:status-update', {
                matchId,
                status,
                notes
            });
        }
    }

    // Notification methods
    markNotificationAsRead(notificationId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('notification:mark-read', { notificationId });
        }
    }

    subscribeToNotifications(types = []) {
        if (this.socket && this.isConnected) {
            this.socket.emit('notification:subscribe', { types });
        }
    }

    // Leaderboard methods
    subscribeToLeaderboard() {
        if (this.socket && this.isConnected) {
            this.socket.emit('leaderboard:subscribe');
        }
    }

    unsubscribeFromLeaderboard() {
        if (this.socket && this.isConnected) {
            this.socket.emit('leaderboard:unsubscribe');
        }
    }

    // Presence methods
    updatePresence(status, activity) {
        if (this.socket && this.isConnected) {
            this.socket.emit('user:presence', { status, activity });
        }
    }
}

export const socketService = new SocketService();
export default socketService;