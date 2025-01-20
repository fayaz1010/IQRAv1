const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

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

// Scheduled cleanup function that runs daily at midnight
exports.cleanupStaleData = functions.pubsub
  .schedule('0 0 * * *')  // Run at midnight every day
  .timeZone('Asia/Singapore')
  .onRun(async (context) => {
    const batch = db.batch();
    const batchOperations = [];
    let totalDeleted = 0;

    try {
      console.log('Starting daily cleanup...');

      // 1. Clean up sessions older than 30 days or incomplete sessions older than 24 hours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const sessionsQuery = await db.collection('sessions').where('startTime', '<=', thirtyDaysAgo.toISOString()).get();
      const incompleteSessionsQuery = await db.collection('sessions')
        .where('status', '==', 'active')
        .where('startTime', '<=', twentyFourHoursAgo.toISOString())
        .get();

      // 2. Clean up recordings older than 30 days that aren't marked as important
      const recordingsQuery = await db.collectionGroup('recordings')
        .where('createdAt', '<=', thirtyDaysAgo.toISOString())
        .where('isImportant', '==', false)
        .get();

      // Process sessions
      for (const doc of sessionsQuery.docs) {
        batchOperations.push(batch.delete(doc.ref));
        totalDeleted++;

        // If batch is full, commit it and start a new one
        if (batchOperations.length >= 500) {
          await batch.commit();
          batch = db.batch();
          batchOperations.length = 0;
        }
      }

      // Process incomplete sessions
      for (const doc of incompleteSessionsQuery.docs) {
        const sessionData = doc.data();
        // Only delete if it's truly stale (no recent activity)
        const lastActivity = sessionData.lastActivity || sessionData.startTime;
        if (new Date(lastActivity) <= twentyFourHoursAgo) {
          batchOperations.push(batch.delete(doc.ref));
          totalDeleted++;

          if (batchOperations.length >= 500) {
            await batch.commit();
            batch = db.batch();
            batchOperations.length = 0;
          }
        }
      }

      // Process old recordings
      for (const doc of recordingsQuery.docs) {
        batchOperations.push(batch.delete(doc.ref));
        totalDeleted++;

        if (batchOperations.length >= 500) {
          await batch.commit();
          batch = db.batch();
          batchOperations.length = 0;
        }
      }

      // Commit any remaining operations
      if (batchOperations.length > 0) {
        await batch.commit();
      }

      console.log(`Cleanup completed. Total documents deleted: ${totalDeleted}`);
      
      // Store cleanup statistics
      await db.collection('system').doc('cleanup-stats').set({
        lastRun: admin.firestore.FieldValue.serverTimestamp(),
        documentsDeleted: totalDeleted,
        status: 'success'
      }, { merge: true });

      return { success: true, deletedCount: totalDeleted };
    } catch (error) {
      console.error('Error during cleanup:', error);
      
      // Store error information
      await db.collection('system').doc('cleanup-stats').set({
        lastRun: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        status: 'failed'
      }, { merge: true });
      
      throw error;
    }
  });

// Function to mark a session as completed if it's been inactive
exports.checkInactiveSessions = functions.pubsub
  .schedule('*/15 * * * *')  // Run every 15 minutes
  .timeZone('Asia/Singapore')
  .onRun(async (context) => {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    try {
      const sessionsQuery = await db.collection('sessions')
        .where('status', '==', 'active')
        .where('lastActivity', '<=', thirtyMinutesAgo.toISOString())
        .get();

      const batch = db.batch();
      let updatedCount = 0;

      sessionsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'completed',
          endTime: admin.firestore.FieldValue.serverTimestamp(),
          endReason: 'inactivity'
        });
        updatedCount++;
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`Marked ${updatedCount} inactive sessions as completed`);
      }

      return { success: true, updatedCount };
    } catch (error) {
      console.error('Error checking inactive sessions:', error);
      throw error;
    }
  });
