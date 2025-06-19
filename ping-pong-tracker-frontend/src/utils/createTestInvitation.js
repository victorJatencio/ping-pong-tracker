import { db } from '../config/firebase';
import { 
    collection, 
    addDoc,
    query,
    where,
    getDocs,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Create a test invitation in Firebase for development and testing
 * @param {string} recipientId - The recipient user's ID
 * @returns {Promise<string>} - ID of the created invitation
 */
const createTestInvitation = async (recipientId) => {
    try {
        // Try to find a random user to be the sender (not the current user)
        const usersQuery = query(
            collection(db, 'users'),
            where('uid', '!=', recipientId),
            limit(10)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        let senderId;
        let senderName = "Test User";
        
        if (usersSnapshot.empty) {
            // No other users found, create a dummy sender ID
            senderId = "test-sender-" + Date.now();
            console.log("No other users found, using dummy sender ID:", senderId);
        } else {
            // Select a random user from the results
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const randomUser = users[Math.floor(Math.random() * users.length)];
            senderId = randomUser.uid;
            senderName = randomUser.displayName || randomUser.email || "Test User";
        }
        
        // Create a date for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0); // Set to noon
        
        // Create the invitation
        const invitationData = {
            senderId: senderId,
            senderName: senderName, // Add sender name for easier display
            recipientId: recipientId,
            date: tomorrow.toISOString().split('T')[0], // Format as YYYY-MM-DD
            time: '12:00',
            scheduledDate: Timestamp.fromDate(tomorrow),
            location: 'Office Game Room',
            message: 'Hey, let\'s play a match tomorrow!',
            status: 'pending',
            matchId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'invitations'), invitationData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating test invitation:', error);
        throw error;
    }
};

export default createTestInvitation;
