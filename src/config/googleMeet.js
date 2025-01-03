import { getAuth } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// Function to get OAuth2 token with Calendar scope
const getCalendarToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Check if we already have the Calendar scope
  const currentScopes = await user.getIdTokenResult();
  if (currentScopes.claims?.['https://www.googleapis.com/auth/calendar']) {
    return user.getIdToken(true);
  }

  // If not, request Calendar permissions
  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return credential.accessToken;
  } catch (error) {
    console.error('Failed to get Calendar permissions:', error);
    throw new Error('Calendar permissions required');
  }
};

// Function to create a Google Meet link
export const createGoogleMeet = async (title, startTime, duration = 60, attendees = []) => {
  try {
    const token = await getCalendarToken();

    const event = {
      summary: title,
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(new Date(startTime).getTime() + duration * 60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create Google Meet');
    }

    const data = await response.json();
    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime
    };
  } catch (error) {
    console.error('Error creating Google Meet:', error);
    throw error;
  }
};

// Function to update a Google Meet event
export const updateGoogleMeet = async (eventId, updates) => {
  try {
    const token = await getCalendarToken();

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update Google Meet');
    }

    const data = await response.json();
    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime
    };
  } catch (error) {
    console.error('Error updating Google Meet:', error);
    throw error;
  }
};

// Function to delete a Google Meet event
export const deleteGoogleMeet = async (eventId) => {
  try {
    const token = await getCalendarToken();

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete Google Meet');
    }

    return true;
  } catch (error) {
    console.error('Error deleting Google Meet:', error);
    throw error;
  }
};

// Function to get Google Meet event details
export const getGoogleMeetDetails = async (eventId) => {
  try {
    const token = await getCalendarToken();

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get Google Meet details');
    }

    const data = await response.json();
    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime,
      attendees: data.attendees || [],
      status: data.status
    };
  } catch (error) {
    console.error('Error getting Google Meet details:', error);
    throw error;
  }
};
