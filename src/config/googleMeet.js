import { getAuth } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getMeetCredentials, storeMeetCredentials, areMeetCredentialsValid } from '../services/meetCredentialsService';

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

  // First try to get stored credentials
  const storedCredentials = await getMeetCredentials(user.uid);
  if (storedCredentials && areMeetCredentialsValid(storedCredentials)) {
    console.log('Using stored credentials');
    return storedCredentials.googleAccessToken;
  }

  console.log('No valid stored credentials, requesting new ones');
  
  // If no valid stored credentials, request new ones
  const provider = new GoogleAuthProvider();
  
  // Add scopes before custom parameters
  CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
  
  provider.setCustomParameters({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true'
  });
  
  try {
    // Store current auth state
    const currentUser = { ...auth.currentUser };
    console.log('Current user before popup:', currentUser.email);
    
    const result = await signInWithPopup(auth, provider);
    console.log('Sign in result:', result.user.email);
    
    const credential = GoogleAuthProvider.credentialFromResult(result);
    console.log('Got credential:', credential ? 'yes' : 'no');
    
    if (!credential?.accessToken) {
      console.error('No access token in credential');
      throw new Error('No access token received');
    }
    
    // Store the credentials
    const credentialData = {
      googleAccessToken: credential.accessToken,
      googleRefreshToken: credential.refreshToken || null,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
      associatedEmail: result.user.email
    };
    
    console.log('Storing credentials:', { ...credentialData, googleAccessToken: '[REDACTED]' });
    await storeMeetCredentials(currentUser.uid, credentialData);

    // Always restore the original user
    if (auth.currentUser.uid !== currentUser.uid) {
      console.log('Restoring original user');
      await auth.updateCurrentUser(currentUser);
    }

    return credential.accessToken;
  } catch (error) {
    console.error('Error in getCalendarToken:', error);
    // Make sure to restore original user even on error
    if (auth.currentUser.uid !== user.uid) {
      await auth.updateCurrentUser(user);
    }
    throw error;
  }
};

// Function to create a Google Meet link
export const createGoogleMeet = async (title, startTime, duration = 60, attendees = [], teacherEmail) => {
  try {
    console.log('Getting Calendar token...');
    const token = await getCalendarToken();
    console.log('Calendar token obtained:', token ? 'Token received' : 'No token');

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
      attendees: [
        // Teacher is host
        { email: teacherEmail, organizer: true },
        // Students are attendees with responseStatus accepted
        ...attendees.map(email => ({ 
          email, 
          responseStatus: 'accepted' 
        }))
      ],
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
          // Configure Meet settings
          conferenceDataVersion: 1,
        }
      },
      // Give attendees permission to modify event
      guestsCanModify: false,
      // Allow guests to invite others
      guestsCanInviteOthers: false,
      // Allow guests to see guest list
      guestsCanSeeOtherGuests: true,
      // Automatically accept all attendees
      anyoneCanAddSelf: false,
      // Send updates to all attendees
      sendUpdates: 'all'
    };

    console.log('Creating Calendar event with Meet...');

    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1&sendNotifications=true`;
    console.log('Calendar API URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    console.log('Calendar API response status:', response.status);
    const responseText = await response.text();
    console.log('Calendar API response text:', responseText);

    if (!response.ok) {
      const error = JSON.parse(responseText);
      console.error('Calendar API error:', error);
      throw new Error(error.error?.message || 'Failed to create Google Meet');
    }

    const data = JSON.parse(responseText);
    console.log('Calendar event created:', data);

    if (!data.hangoutLink) {
      console.error('No hangoutLink in response:', data);
      throw new Error('Meet link not created');
    }

    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime
    };
  } catch (error) {
    console.error('Error in createGoogleMeet:', error);
    throw error;
  }
};

// Function to update a Google Meet event
export const updateGoogleMeet = async (eventId, updates) => {
  try {
    console.log('Getting Calendar token...');
    const token = await getCalendarToken();
    console.log('Calendar token obtained:', token ? 'Token received' : 'No token');

    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`;
    console.log('Calendar API URL:', url);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    console.log('Calendar API response status:', response.status);
    const responseText = await response.text();
    console.log('Calendar API response text:', responseText);

    if (!response.ok) {
      const error = JSON.parse(responseText);
      console.error('Calendar API error:', error);
      throw new Error(error.error?.message || 'Failed to update Google Meet');
    }

    const data = JSON.parse(responseText);
    console.log('Calendar event updated:', data);

    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime
    };
  } catch (error) {
    console.error('Error in updateGoogleMeet:', error);
    throw error;
  }
};

// Function to delete a Google Meet event
export const deleteGoogleMeet = async (eventId) => {
  try {
    console.log('Getting Calendar token...');
    const token = await getCalendarToken();
    console.log('Calendar token obtained:', token ? 'Token received' : 'No token');

    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`;
    console.log('Calendar API URL:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    console.log('Calendar API response status:', response.status);
    const responseText = await response.text();
    console.log('Calendar API response text:', responseText);

    if (!response.ok && response.status !== 404) {
      const error = JSON.parse(responseText);
      console.error('Calendar API error:', error);
      throw new Error(error.error?.message || 'Failed to delete Google Meet');
    }

    console.log('Calendar event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('Error in deleteGoogleMeet:', error);
    throw error;
  }
};

// Function to get Google Meet event details
export const getGoogleMeetDetails = async (eventId) => {
  try {
    console.log('Getting Calendar token...');
    const token = await getCalendarToken();
    console.log('Calendar token obtained:', token ? 'Token received' : 'No token');

    const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`;
    console.log('Calendar API URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    console.log('Calendar API response status:', response.status);
    const responseText = await response.text();
    console.log('Calendar API response text:', responseText);

    if (!response.ok) {
      const error = JSON.parse(responseText);
      console.error('Calendar API error:', error);
      throw new Error(error.error?.message || 'Failed to get Google Meet details');
    }

    const data = JSON.parse(responseText);
    console.log('Calendar event details:', data);

    return {
      meetLink: data.hangoutLink,
      eventId: data.id,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime,
      attendees: data.attendees || [],
      status: data.status
    };
  } catch (error) {
    console.error('Error in getGoogleMeetDetails:', error);
    throw error;
  }
};
