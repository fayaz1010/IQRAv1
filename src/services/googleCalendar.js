import { google } from 'googleapis';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const calendar = google.calendar('v3');

const createGoogleCalendarEvent = async (eventDetails, userToken) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      import.meta.env.VITE_GOOGLE_CLIENT_ID,
      import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
      import.meta.env.VITE_GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({ access_token: userToken });

    const event = {
      summary: eventDetails.title,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime,
        timeZone: 'Asia/Singapore',
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: 'Asia/Singapore',
      },
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: eventDetails.attendees,
    };

    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink,
      success: true,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const updateClassWithMeetLink = async (classId, meetLink) => {
  try {
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      meetLink,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error updating class with meet link:', error);
    return false;
  }
};

const scheduleClass = async (classDetails, userToken) => {
  try {
    // Create calendar event with Meet
    const eventResult = await createGoogleCalendarEvent(
      {
        title: `IQRA Class: ${classDetails.title}`,
        description: classDetails.description,
        startTime: classDetails.startTime,
        endTime: classDetails.endTime,
        attendees: classDetails.students.map(student => ({ email: student.email })),
      },
      userToken
    );

    if (eventResult.success) {
      // Update class in Firestore with Meet link
      await updateClassWithMeetLink(classDetails.id, eventResult.meetLink);
      return {
        success: true,
        meetLink: eventResult.meetLink,
        eventId: eventResult.eventId,
      };
    }

    return {
      success: false,
      error: 'Failed to create calendar event',
    };
  } catch (error) {
    console.error('Error scheduling class:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export { scheduleClass, createGoogleCalendarEvent, updateClassWithMeetLink };
