const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

// Google Meet API scopes required for full functionality
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly'
];

// Function to set user role in custom claims
exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Only allow admin users to set roles
  if (!context.auth || !context.auth.token.role === 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admin users can set roles.'
    );
  }

  const { userId, role } = data;
  
  if (!userId || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with userId and role arguments.'
    );
  }

  try {
    // Set custom user claims
    await admin.auth().setCustomUserClaims(userId, { role: role });
    return { success: true };
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error setting user role.'
    );
  }
});

// Function to update user role when Firestore user document is updated
exports.onUserRoleUpdate = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const newData = change.after.data();
    const previousData = change.before.data();

    // If the document was deleted or role hasn't changed, do nothing
    if (!newData || (previousData && previousData.role === newData.role)) {
      return null;
    }

    try {
      // Update custom claims to match the new role
      await admin.auth().setCustomUserClaims(userId, { role: newData.role });
      return { success: true };
    } catch (error) {
      console.error('Error updating custom claims:', error);
      return { success: false, error: error.message };
    }
  });

// Function to refresh Google token
exports.refreshGoogleToken = functions
  .region('asia-southeast1')
  .runWith({
    memory: '256MB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      // Get the user's stored credentials
      const userRef = admin.firestore().collection('meetCredentials').doc(context.auth.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists || !userDoc.data().googleRefreshToken) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'No refresh token found'
        );
      }

      const credentials = userDoc.data();

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        functions.config().google.client_id,
        functions.config().google.client_secret,
        functions.config().google.redirect_uri
      );

      // Set credentials
      oauth2Client.setCredentials({
        refresh_token: credentials.googleRefreshToken,
        scope: SCOPES.join(' ')
      });

      // Get new access token
      const { token } = await oauth2Client.getAccessToken();

      // Update stored credentials
      await userRef.update({
        googleAccessToken: token,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
      });

      return { accessToken: token };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error refreshing token'
      );
    }
  });
