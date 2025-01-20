import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';

export class StudentStatsService {
  constructor(userId) {
    this.userId = userId;
  }

  async getComprehensiveStats() {
    try {
      const stats = {
        activeClasses: 0,
        enrolledCourses: 0,
        progress: 0,
        todayClasses: 0,
        assignments: 0,
        lastClass: null,
        currentIqraProgress: {
          book: null,
          page: 0,
          totalPages: 0
        },
        dateJoined: null,
        notifications: [],
        unreadMessages: 0
      };

      // Get student profile for date joined
      const userDoc = await getDoc(doc(db, 'users', this.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Convert Firestore Timestamp to ISO string
        stats.dateJoined = userData.createdAt instanceof Timestamp 
          ? userData.createdAt.toDate().toISOString()
          : typeof userData.createdAt === 'string' 
            ? userData.createdAt 
            : null;
      }

      // Get enrolled classes
      const classesRef = collection(db, 'classes');
      const classesQuery = query(classesRef, where('studentIds', 'array-contains', this.userId));
      const classesSnapshot = await getDocs(classesQuery);
      const classIds = classesSnapshot.docs.map(doc => doc.id);
      stats.activeClasses = classIds.length;

      // Get enrolled courses
      const coursesMap = new Map();
      let totalProgress = 0;

      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        
        // Track courses
        if (classData.courseId && !coursesMap.has(classData.courseId)) {
          coursesMap.set(classData.courseId, true);
        }

        // Get progress
        const progressRef = doc(db, 'classes', classDoc.id, 'progress', this.userId);
        const progressDoc = await getDoc(progressRef);
        if (progressDoc.exists()) {
          const progressData = progressDoc.data();
          totalProgress += progressData.progress || 0;
          
          // Track current Iqra progress
          if (progressData.currentBook && (!stats.currentIqraProgress.book || progressData.lastUpdated > stats.currentIqraProgress.lastUpdated)) {
            stats.currentIqraProgress = {
              book: progressData.currentBook,
              page: progressData.currentPage || 0,
              totalPages: progressData.totalPages || 30,
              lastUpdated: progressData.lastUpdated
            };
          }
        }
      }

      stats.enrolledCourses = coursesMap.size;
      stats.progress = classIds.length > 0 ? Math.round(totalProgress / classIds.length) : 0;

      // Get today's classes
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      // Modified to use single date field comparison
      const sessionsRef = collection(db, 'sessions');
      const todaySessionsQuery = query(
        sessionsRef,
        where('classId', 'in', classIds),
        where('date', '>=', startOfToday.toISOString())
      );
      
      const todaySessionsSnapshot = await getDocs(todaySessionsQuery);
      stats.todayClasses = todaySessionsSnapshot.docs.filter(
        doc => doc.data().date < endOfToday.toISOString()
      ).length;

      // Get last attended class - modified to reduce index complexity
      const lastSessionQuery = query(
        sessionsRef,
        where('classId', 'in', classIds),
        where('attendees', 'array-contains', this.userId),
        orderBy('endTime', 'desc'),
        limit(1)
      );

      const lastSessionSnapshot = await getDocs(lastSessionQuery);
      if (!lastSessionSnapshot.empty) {
        const lastSessionDoc = lastSessionSnapshot.docs[0];
        const lastSessionData = lastSessionDoc.data();
        // Only process if status is completed
        if (lastSessionData.status === 'completed') {
          const classDoc = await getDoc(doc(db, 'classes', lastSessionData.classId));
          const feedbackData = lastSessionData.feedback?.studentFeedback?.[this.userId];
          const progressData = lastSessionData.studentProgress?.[this.userId];
          
          // Convert empty objects to null
          const feedback = feedbackData && Object.keys(feedbackData).length > 0 ? feedbackData : null;
          const progress = progressData && Object.keys(progressData).length > 0 ? progressData : null;
          
          console.log('Debug - Last Class Data:', {
            feedbackData,
            progressData,
            feedback,
            progress
          });
          
          stats.lastClass = {
            id: lastSessionDoc.id,
            className: classDoc.exists() ? classDoc.data().name : 'Unknown Class',
            endTime: lastSessionData.endTime instanceof Timestamp 
              ? lastSessionData.endTime.toDate().toISOString()
              : typeof lastSessionData.endTime === 'string'
                ? lastSessionData.endTime
                : null,
            feedback,
            progress,
            rating: typeof feedbackData?.rating !== 'undefined' ? feedbackData.rating : null,
            comment: typeof feedbackData?.comment === 'string' ? feedbackData.comment : null
          };
        }
      }

      // Get unread notifications - modified to use composite index
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('userId', '==', this.userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);
      stats.notifications = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get unread messages count
      const messagesRef = collection(db, 'messages');
      const unreadMessagesQuery = query(
        messagesRef,
        where('recipientId', '==', this.userId),
        where('read', '==', false)
      );

      const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
      stats.unreadMessages = unreadMessagesSnapshot.docs.length;

      return stats;
    } catch (error) {
      console.error('Error getting comprehensive stats:', error);
      throw error;
    }
  }

  async getUpcomingClasses() {
    try {
      // Get enrolled classes first
      const classesRef = collection(db, 'classes');
      const classesQuery = query(classesRef, where('studentIds', 'array-contains', this.userId));
      const classesSnapshot = await getDocs(classesQuery);
      const classIds = classesSnapshot.docs.map(doc => doc.id);
      
      console.log('Debug - Found enrolled classes:', classIds);
      
      if (classIds.length === 0) return [];

      // Get all class details including teacher info
      const classDetails = {};
      for (const classDoc of classesSnapshot.docs) {
        const data = classDoc.data();
        if (data.teacherId) {
          // Get teacher details
          const teacherDoc = await getDoc(doc(db, 'users', data.teacherId));
          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data();
            data.teacherName = teacherData.displayName || teacherData.name || 'Unknown Teacher';
          }
        }
        classDetails[classDoc.id] = data;
      }

      console.log('Debug - Class details with teachers:', classDetails);

      // Get sessions for the next week
      const sessionsRef = collection(db, 'sessions');
      const sessionsQuery = query(
        sessionsRef,
        where('classId', 'in', classIds),
        where('status', '==', 'scheduled')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      console.log('Debug - Found sessions:', sessionsSnapshot.docs.length);

      // Map sessions to class details
      const upcomingClasses = await Promise.all(sessionsSnapshot.docs.map(async doc => {
        const sessionData = doc.data();
        console.log('Debug - Session Data:', sessionData);

        const classData = classDetails[sessionData.classId];
        if (!classData) {
          console.log('Debug - No matching class found for session:', sessionData.classId);
          return null;
        }

        console.log('Debug - Class Data:', classData);

        return {
          id: doc.id,
          classId: sessionData.classId,
          className: sessionData.className || classData.name,
          teacherName: sessionData.teacherName || classData.teacherName,
          startTime: sessionData.startTime || sessionData.date,
          endTime: sessionData.endTime || new Date(new Date(sessionData.startTime || sessionData.date).getTime() + (sessionData.duration || 60) * 60000).toISOString(),
          meetLink: sessionData.meetLink || null,
          duration: sessionData.duration || 60,
          recurring: true
        };
      }));

      // Filter out nulls and sort by start time
      const sortedClasses = upcomingClasses
        .filter(Boolean)
        .filter(session => {
          const sessionStart = new Date(session.startTime);
          const now = new Date('2025-01-07T01:21:10+08:00');
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          return sessionStart >= now && sessionStart <= nextWeek;
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      
      console.log('Debug - Final upcoming classes:', sortedClasses);
      
      return sortedClasses;
    } catch (error) {
      console.error('Error getting upcoming classes:', error);
      throw error;
    }
  }

  getNextDayOccurrence(dayName, hours, minutes) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const targetDay = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
    
    if (targetDay === -1) return null;

    const result = new Date(today);
    result.setHours(hours, minutes, 0, 0);

    // Calculate days until next occurrence
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0) {
      // If it's the same day, but the time has passed, go to next week
      if (today.getHours() > hours || (today.getHours() === hours && today.getMinutes() >= minutes)) {
        daysUntilTarget = 7;
      }
    }

    result.setDate(result.getDate() + daysUntilTarget);
    return result;
  }
}
