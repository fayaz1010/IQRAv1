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

export const createGoogleMeet = async (title, startTime, endTime) => {
  try {
    console.log('Getting Calendar token...');
    const accessToken = await getCalendarToken();
    console.log('Access token obtained');

    // Ensure we have valid ISO strings for start and end times
    const start = new Date(startTime).toISOString();
    const end = new Date(endTime).toISOString();

    const event = {
      summary: title,
      description: 'Iqra Teaching Session',
      start: { dateTime: start },
      end: { dateTime: end },
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      }
    );

    const responseData = await response.json();
    console.log('Calendar API response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    if (!response.ok) {
      console.error('Calendar API error details:', responseData);
      throw new Error(responseData.error?.message || 'Failed to create Google Meet');
    }

    const meetLink = responseData.conferenceData?.entryPoints?.[0]?.uri;
    if (!meetLink) {
      throw new Error('No Meet link in response');
    }

    return {
      link: meetLink,
      eventId: responseData.id,
      startTime: responseData.start.dateTime,
      endTime: responseData.end.dateTime
    };
  } catch (error) {
    console.error('Error in createGoogleMeet:', error);
    throw error;
  }
};
