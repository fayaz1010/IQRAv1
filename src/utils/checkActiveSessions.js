import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function checkActiveSessions(userId) {
  try {
    // Query active sessions directly where the student is a participant
    console.log('Fetching active sessions for user:', userId);
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('studentIds', 'array-contains', userId),
      where('status', '==', 'active'),
      orderBy('startTime', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(sessionsQuery);
    console.log('Total active sessions found:', snapshot.size);
    
    const sessions = [];
    for (const doc of snapshot.docs) {
      const session = doc.data();
      sessions.push({
        id: doc.id,
        ...session,
        className: session.title || 'Active Session'
      });
      console.log('Active Session:', {
        id: doc.id,
        title: session.title,
        startTime: session.startTime
      });
    }

    return sessions;
  } catch (error) {
    console.error('Error checking active sessions:', error);
    return [];
  }
}
