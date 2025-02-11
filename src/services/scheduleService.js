import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createCalendarEvent, updateCalendarEvent } from './calendarService';

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

    // Convert timeSlots to actual dates for the first occurrence
    const processedTimeSlots = {};
    const now = new Date('2025-01-07T01:15:47+08:00'); // Using provided time
    
    console.log('Debug - Creating schedule with time slots:', timeSlots);
    
    Object.entries(timeSlots).forEach(([dayIndex, time]) => {
      if (!time) return;
      
      const [hours, minutes] = time.split(':').map(Number);
      const targetDate = new Date(now);
      targetDate.setHours(hours, minutes, 0, 0);
      
      // Calculate days until next occurrence
      const currentDay = now.getDay();
      let daysUntilTarget = Number(dayIndex) - currentDay;
      
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      } else if (daysUntilTarget === 0) {
        // If it's the same day, but the time has passed, go to next week
        if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
          daysUntilTarget = 7;
        }
      }
      
      targetDate.setDate(targetDate.getDate() + daysUntilTarget);
      processedTimeSlots[dayIndex] = targetDate.toISOString();
      console.log('Debug - Processed time slot:', { dayIndex, time, targetDate: targetDate.toISOString() });
    });

    // Create schedule document
    const scheduleRef = await addDoc(collection(db, 'schedules'), {
      classId,
      teacherId: classData.teacherId,
      startDate: startDate.toISOString(),
      recurrencePattern,
      daysOfWeek,
      duration,
      timeSlots: processedTimeSlots,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create individual sessions for the next 12 weeks
    const sessions = [];
    const numberOfWeeks = 12;

    // Check existing sessions to avoid duplicates
    const existingSessionsQuery = query(
      collection(db, 'sessions'),
      where('classId', '==', classId),
      where('status', '==', 'scheduled')
    );
    const existingSessionsSnapshot = await getDocs(existingSessionsQuery);
    const existingSessions = new Map();
    existingSessionsSnapshot.forEach(doc => {
      const data = doc.data();
      existingSessions.set(data.startTime, doc.id);
    });

    console.log('Debug - Creating sessions for class:', classId);
    console.log('Debug - Time slots:', processedTimeSlots);

    // Create sessions for each timeslot for the next 12 weeks
    for (let week = 0; week < numberOfWeeks; week++) {
      for (const [dayIndex, baseTime] of Object.entries(processedTimeSlots)) {
        const sessionDate = new Date(baseTime);
        sessionDate.setDate(sessionDate.getDate() + (week * 7));
        const sessionDateStr = sessionDate.toISOString();

        // Skip if session already exists
        if (existingSessions.has(sessionDateStr)) {
          console.log('Debug - Session already exists:', sessionDateStr);
          sessions.push(existingSessions.get(sessionDateStr));
          continue;
        }

        console.log('Debug - Creating new session for:', { 
          week, 
          dayIndex, 
          sessionDate: sessionDateStr,
          classId,
          duration
        });

        // Create calendar event
        const eventDetails = {
          title: `${classData.name} - Class Session`,
          description: `Regular class session for ${classData.name}`,
          startTime: sessionDateStr,
          endTime: new Date(sessionDate.getTime() + duration * 60000).toISOString(),
          attendees: classData.studentIds || []
        };

        const { eventId, meetLink } = await createCalendarEvent(eventDetails);

        // Create session document
        const sessionRef = await addDoc(collection(db, 'sessions'), {
          scheduleId: scheduleRef.id,
          classId,
          startTime: sessionDateStr,
          endTime: new Date(sessionDate.getTime() + duration * 60000).toISOString(),
          duration,
          status: 'scheduled',
          eventId,
          meetLink,
          teacherId: classData.teacherId,
          teacherName: classData.teacherName,
          className: classData.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log('Debug - Created session:', {
          id: sessionRef.id,
          startTime: sessionDateStr,
          className: classData.name
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
      // First get the classes where the student is enrolled
      const classesRef = collection(db, 'classes');
      const classQuery = query(classesRef, where('studentIds', 'array-contains', userId));
      const classSnapshot = await getDocs(classQuery);
      const classIds = [];
      classSnapshot.forEach(doc => classIds.push(doc.id));
      
      if (classIds.length === 0) {
        return []; // Return empty array if student has no classes
      }
      
      // Then get schedules for those classes
      q = query(schedulesRef, where('classId', 'in', classIds));
    } else if (userRole === 'admin') {
      q = query(schedulesRef);
    } else {
      throw new Error('Invalid user role');
    }

    const snapshot = await getDocs(q);
    const schedules = [];
    snapshot.forEach(doc => {
      schedules.push({ id: doc.id, ...doc.data() });
    });

    return schedules;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
};

export const updateSchedule = async (scheduleId, updates) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    await updateDoc(scheduleRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const updateSingleSession = async (scheduleId, dayIndex, updates) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (!scheduleDoc.exists()) {
      throw new Error('Schedule not found');
    }

    const schedule = scheduleDoc.data();
    const timeSlots = { ...schedule.timeSlots };
    
    // Update only the specific day's time slot
    if (updates.timeSlot) {
      timeSlots[dayIndex] = updates.timeSlot.toISOString();
    }

    // Update the schedule document
    await updateDoc(scheduleRef, {
      timeSlots,
      updatedAt: new Date().toISOString()
    });

    // Update Google Calendar event if needed
    if (schedule.eventIds?.[dayIndex]) {
      await updateCalendarEvent(schedule.eventIds[dayIndex], {
        startTime: updates.timeSlot.toISOString(),
        endTime: new Date(updates.timeSlot.getTime() + schedule.duration * 60000).toISOString()
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    const scheduleRef = doc(db, 'schedules', scheduleId);
    await deleteDoc(scheduleRef);
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};
