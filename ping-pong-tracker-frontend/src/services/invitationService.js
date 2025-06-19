import { db } from '../config/firebase';
import { 
    collection, 
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Service for handling match invitation operations
 */
const invitationService = {
    /**
     * Send a match invitation to another user
     * @param {Object} invitationData - Invitation data
     * @returns {Promise<string>} - ID of the created invitation
     */
    async sendInvitation(invitationData) {
        try {
            // Create a scheduledDate Timestamp from date and time strings
            let scheduledDate = null;
            if (invitationData.date && invitationData.time) {
                const [year, month, day] = invitationData.date.split('-').map(Number);
                const [hours, minutes] = invitationData.time.split(':').map(Number);
                scheduledDate = Timestamp.fromDate(new Date(year, month - 1, day, hours, minutes));
            }
            
            const invitationRef = await addDoc(collection(db, 'invitations'), {
                ...invitationData,
                scheduledDate,
                status: 'pending',
                matchId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return invitationRef.id;
        } catch (error) {
            console.error('Error sending invitation:', error);
            throw error;
        }
    },

    /**
     * Get pending invitations for a user
     * @param {string} userId - User ID
     * @param {number} limitCount - Number of invitations to fetch
     * @returns {Promise<Array>} - Array of pending invitations
     */
    async getPendingInvitations(userId, limitCount = 10) {
        try {
            const invitationsQuery = query(
                collection(db, 'invitations'),
                where('recipientId', '==', userId),
                where('status', '==', 'pending'),
                orderBy('scheduledDate', 'asc'),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(invitationsQuery);
            const invitations = [];
            
            querySnapshot.forEach(doc => {
                invitations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return invitations;
        } catch (error) {
            console.error('Error fetching pending invitations:', error);
            throw error;
        }
    },

    /**
     * Accept a match invitation
     * @param {string} invitationId - Invitation ID
     * @returns {Promise<string>} - ID of the created match
     */
    async acceptInvitation(invitationId) {
        try {
            const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
            
            if (!invitationDoc.exists()) {
                throw new Error('Invitation not found');
            }
            
            const invitationData = invitationDoc.data();
            
            if (invitationData.status !== 'pending') {
                throw new Error('Invitation is no longer pending');
            }
            
            // Create a new match based on the invitation
            const matchData = {
                player1Id: invitationData.senderId,
                player2Id: invitationData.recipientId,
                date: invitationData.date,
                time: invitationData.time,
                scheduledDate: invitationData.scheduledDate,
                location: invitationData.location || '',
                notes: invitationData.message || '',
                status: 'scheduled',
                player1Score: 0,
                player2Score: 0,
                winnerId: null,
                loserId: null,
                lastUpdatedBy: invitationData.recipientId
            };
            
            // Add the match to the matches collection
            const matchRef = await addDoc(collection(db, 'matches'), {
                ...matchData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Update the invitation with the match ID and status
            await updateDoc(doc(db, 'invitations', invitationId), {
                status: 'accepted',
                matchId: matchRef.id,
                updatedAt: serverTimestamp()
            });
            
            return matchRef.id;
        } catch (error) {
            console.error('Error accepting invitation:', error);
            throw error;
        }
    },

    /**
     * Decline a match invitation
     * @param {string} invitationId - Invitation ID
     * @returns {Promise<void>}
     */
    async declineInvitation(invitationId) {
        try {
            const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
            
            if (!invitationDoc.exists()) {
                throw new Error('Invitation not found');
            }
            
            const invitationData = invitationDoc.data();
            
            if (invitationData.status !== 'pending') {
                throw new Error('Invitation is no longer pending');
            }
            
            await updateDoc(doc(db, 'invitations', invitationId), {
                status: 'declined',
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error declining invitation:', error);
            throw error;
        }
    }
};

export default invitationService;
