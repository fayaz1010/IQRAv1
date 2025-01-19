import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getMeetCredentials, storeMeetCredentials } from '../services/meetCredentialsService';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    CALENDAR_SCOPES.forEach(scope => {
      console.log('Adding scope:', scope);
      provider.addScope(scope);
    });
    
    provider.setCustomParameters({
      access_type: 'offline',
      prompt: 'consent'
    });

    console.log('Starting Google sign-in...');
    const result = await signInWithPopup(auth, provider);
    console.log('Sign-in successful for:', result.user.email);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    console.log('Credential obtained:', {
      hasAccessToken: !!credential?.accessToken,
      hasRefreshToken: !!credential?.refreshToken,
      providerId: credential?.providerId
    });

    if (!credential?.accessToken) {
      throw new Error('No access token received from Google');
    }

    // Store the credentials
    const credentialData = {
      googleAccessToken: credential.accessToken,
      googleRefreshToken: credential.refreshToken || null,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      associatedEmail: result.user.email
    };

    console.log('Storing credentials...');
    await storeMeetCredentials(result.user.uid, credentialData);
    console.log('Credentials stored successfully');

    return true;
  } catch (error) {
    console.error('Error in signInWithGoogle:', error);
    throw error;
  }
};

export const getCalendarToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    console.log('Current user:', user.email);

    // Try to get stored credentials
    const storedCreds = await getMeetCredentials(user.uid);
    console.log('Stored credentials:', storedCreds ? 'Found' : 'Not found');

    if (storedCreds?.googleAccessToken) {
      console.log('Using stored access token');
      return storedCreds.googleAccessToken;
    }

    throw new Error('No valid Google credentials found. Please sign in with Google first.');
  } catch (error) {
    console.error('Error in getCalendarToken:', error);
    throw error;
  }
};

export const createGoogleMeet = async (title, startTime, durationMinutes = 60) => {
  try {
    console.log('Getting access token...');
    const accessToken = await getCalendarToken();
    console.log('Access token obtained');

    // Ensure startTime is a valid Date object
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    if (isNaN(start.getTime())) {
      throw new Error('Invalid start time provided');
    }

    // Calculate end time
    const end = new Date(start.getTime() + (durationMinutes * 60 * 1000));
  
    console.log('Creating event with times:', {
      start: start.toISOString(),
      end: end.toISOString()
    });

    const event = {
      summary: title,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      conferenceData: {
        createRequest: {
          requestId: Date.now().toString(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    console.log('Creating Calendar event:', event);

    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1&sendNotifications=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Calendar API error details:', error);
      throw new Error(error.error?.message || 'Failed to create Google Meet');
    }

    const data = await response.json();
    console.log('Meet created successfully:', data);
    return {
      meetLink: data.hangoutLink,
      eventId: data.id
    };
  } catch (error) {
    console.error('Error in createGoogleMeet:', error);
    throw error;
  }
};
