const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
