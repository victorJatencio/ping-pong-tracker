import { db } from '../config/firebase';
import { 
    collection, 
    getDocs,
    addDoc,
    query,
    where,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Creates a test match for development purposes
 * @param {string} currentUserId - ID of the current user
 * @returns {Promise<string>} - ID of the created match
 */
const createTestMatch = async (currentUserId) => {
    try {
        // Try to find a random user to be the opponent (not the current user)
        const usersQuery = query(
            collection(db, 'users'),
            where('uid', '!=', currentUserId),
            limit(10)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        let opponentId;
        let opponentName = "Test Opponent";
        
        if (usersSnapshot.empty) {
            // No other users found, create a dummy opponent ID
            opponentId = "test-opponent-" + Date.now();
            console.log("No other users found, using dummy opponent ID:", opponentId);
        } else {
            // Select a random user from the results
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const opponent = users[Math.floor(Math.random() * users.length)];
            opponentId = opponent.uid;
            opponentName = opponent.displayName || opponent.email || "Test Opponent";
        }
        
        // Create a date for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0); // Set to noon
        
        // Create the match
        const matchData = {
            player1Id: currentUserId,
            player2Id: opponentId,
            player2Name: opponentName, // Add opponent name for easier display
            status: 'scheduled',
            scheduledDate: Timestamp.fromDate(tomorrow),
            date: tomorrow.toISOString().split('T')[0], // Format as YYYY-MM-DD
            time: '12:00',
            location: 'Office Game Room',
            player1Score: 0,
            player2Score: 0,
            winnerId: null,
            loserId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'matches'), matchData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating test match:', error);
        throw error;
    }
};

export default createTestMatch;