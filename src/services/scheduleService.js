import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { createCalendarEvent, updateCalendarEvent } from './calendarService';
import { startOfDay, addWeeks, addMinutes, format, parseISO } from 'date-fns';

export const createSchedule = async (scheduleData) => {
  try {
    const { classId, startDate, recurrencePattern, daysOfWeek, duration, timeSlots } = scheduleData;

    // Get the class details
    const classRef = doc(db, 'classes', classId);
    const classSnapshot = await getDoc(classRef);
    if (!classSnapshot.exists()) {
      throw new Error('Class not found');
    }
    const classData = classSnapshot.data();

    // Ensure all dates are properly formatted
    const normalizedStartDate = startOfDay(new Date(startDate));
    const normalizedTimeSlots = {};
    for (const [day, time] of Object.entries(timeSlots)) {
      const timeDate = new Date(time);
      normalizedTimeSlots[day] = format(timeDate, "HH:mm");
    }

    // Create schedule document
    const scheduleRef = await addDoc(collection(db, 'schedules'), {
      classId,
      teacherId: classData.teacherId,
      startDate: format(normalizedStartDate, "yyyy-MM-dd"),
      recurrencePattern,
      daysOfWeek,
      duration,
      timeSlots: normalizedTimeSlots,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create individual sessions
    const sessions = [];
    const numberOfWeeks = 12; // Default to 12 weeks of sessions

    // Check for existing sessions
    const existingSessionsQuery = query(
      collection(db, 'sessions'),
      where('classId', '==', classId),
      where('status', '==', 'scheduled')
    );
    const existingSessionsSnapshot = await getDocs(existingSessionsQuery);
    const existingSessions = new Map();
    existingSessionsSnapshot.forEach(doc => {
      const data = doc.data();
      existingSessions.set(data.date, doc.id);
    });

    // Calculate all session dates
    for (let week = 0; week < numberOfWeeks; week++) {
      const weekStartDate = addWeeks(normalizedStartDate, week);
      
      for (const day of daysOfWeek) {
        // Create session date by combining the week date with time slot
        const [hours, minutes] = normalizedTimeSlots[day].split(':');
        const sessionDate = new Date(weekStartDate);
        sessionDate.setDate(sessionDate.getDate() + (Number(day) % 7));
        sessionDate.setHours(Number(hours), Number(minutes), 0, 0);
        
        const sessionDateStr = format(sessionDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
        const sessionEndDate = addMinutes(sessionDate, duration);
        const sessionEndDateStr = format(sessionEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

        // Skip if session already exists
        if (existingSessions.has(sessionDateStr)) {
          sessions.push(existingSessions.get(sessionDateStr));
          continue;
        }

        // Create calendar event
        const eventDetails = {
          title: `${classData.name} - Class Session`,
          description: `Regular class session for ${classData.name}`,
          startTime: sessionDateStr,
          endTime: sessionEndDateStr,
          attendees: classData.studentIds || []
        };

        const { eventId, meetLink } = await createCalendarEvent(eventDetails);

        // Create session document
        const sessionRef = await addDoc(collection(db, 'sessions'), {
          scheduleId: scheduleRef.id,
          classId,
          teacherId: classData.teacherId,
          date: sessionDateStr,
          endDate: sessionEndDateStr,
          duration,
          status: 'scheduled',
          eventId,
          meetLink,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        sessions.push(sessionRef.id);
      }
    }

    // Update schedule with session IDs
    await updateDoc(scheduleRef, {
      sessionIds: sessions
    });

    return {
      scheduleId: scheduleRef.id,
      sessions
    };
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

export const getSchedules = async (userId, userRole) => {
  try {
    const schedulesRef = collection(db, 'schedules');
    let q;
    
    if (userRole === 'teacher') {
      q = query(schedulesRef, where('teacherId', '==', userId));
    } else if (userRole === 'student') {
      // For students, we need to first get their classes
      const classesRef = collection(db, 'classes');
      const classesQuery = query(classesRef, where('studentIds', 'array-contains', userId));
      const classesSnap = await getDocs(classesQuery);
      const classIds = classesSnap.docs.map(doc => doc.id);
      
      if (classIds.length === 0) {
        return []; // No classes, so no schedules
      }
      
      // Get schedules for all their classes
      q = query(schedulesRef, where('classId', 'in', classIds));
    } else if (userRole === 'admin') {
      q = query(schedulesRef); // Admins can see all schedules
    } else {
      throw new Error('Invalid user role');
    }
    
    const querySnapshot = await getDocs(q);
    
    const schedules = [];
    for (const docSnap of querySnapshot.docs) {
      const scheduleData = { id: docSnap.id, ...docSnap.data() };
      
      // Parse dates back to Date objects
      if (scheduleData.startDate) {
        scheduleData.startDate = parseISO(scheduleData.startDate);
      }
      
      // Keep time slots as HH:mm strings
      const timeSlots = {};
      for (const [day, time] of Object.entries(scheduleData.timeSlots || {})) {
        timeSlots[day] = time;  // Keep as HH:mm string
      }
      scheduleData.timeSlots = timeSlots;

      // Get associated class data
      try {
        const classDocRef = doc(db, 'classes', scheduleData.classId);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const classData = classSnap.data();
          scheduleData.className = classData.name;
          scheduleData.studentCount = classData.studentIds ? classData.studentIds.length : 0;
        }
      } catch (classError) {
        console.error('Error fetching class data:', classError);
        scheduleData.studentCount = 0;
      }
      
      schedules.push(scheduleData);
    }
    
    return schedules;
  } catch (error) {
    console.error('Error getting schedules:', error);
    throw error;
  }
};

export const updateSchedule = async (scheduleId, updates) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    
    // Normalize time slots if they're being updated
    if (updates.timeSlots) {
      const normalizedTimeSlots = {};
      for (const [day, time] of Object.entries(updates.timeSlots)) {
        const timeDate = new Date(time);
        normalizedTimeSlots[day] = format(timeDate, "HH:mm");
      }
      updates.timeSlots = normalizedTimeSlots;
    }
    
    // Normalize start date if it's being updated
    if (updates.startDate) {
      updates.startDate = format(new Date(updates.startDate), "yyyy-MM-dd");
    }
    
    await updateDoc(scheduleRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return scheduleId;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const updateSingleSession = async (scheduleId, dayIndex, updates) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleSnap = await getDoc(scheduleRef);
    if (!scheduleSnap.exists()) {
      throw new Error('Schedule not found');
    }
    const scheduleData = scheduleSnap.data();

    // Get the session to update
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('scheduleId', '==', scheduleId),
      where('dayIndex', '==', dayIndex)
    );
    const sessionSnap = await getDocs(sessionsQuery);
    if (sessionSnap.empty) {
      throw new Error('Session not found');
    }
    const sessionDoc = sessionSnap.docs[0];
    const sessionData = sessionDoc.data();

    // Update the session time if provided
    if (updates.time) {
      const [hours, minutes] = updates.time.split(':');
      const sessionDate = parseISO(sessionData.date);
      sessionDate.setHours(Number(hours), Number(minutes), 0, 0);
      const sessionEndDate = addMinutes(sessionDate, scheduleData.duration);
      
      updates.date = format(sessionDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
      updates.endDate = format(sessionEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

      // Update calendar event
      if (sessionData.eventId) {
        await updateCalendarEvent(sessionData.eventId, {
          startTime: updates.date,
          endTime: updates.endDate
        });
      }
    }

    await updateDoc(doc(db, 'sessions', sessionDoc.id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return sessionDoc.id;
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    // Delete all associated sessions first
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('scheduleId', '==', scheduleId)
    );
    const sessionSnap = await getDocs(sessionsQuery);
    const batch = [];
    sessionSnap.forEach((doc) => {
      batch.push(deleteDoc(doc.ref));
    });
    await Promise.all(batch);

    // Delete the schedule document
    await deleteDoc(doc(db, 'schedules', scheduleId));
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};
