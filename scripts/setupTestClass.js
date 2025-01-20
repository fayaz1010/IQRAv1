import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

// Read service account file
const serviceAccount = JSON.parse(
  await readFile(new URL('../service-account-key.json', import.meta.url))
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function setupTestClass() {
  try {
    // First, get the current user's UID from the auth collection
    const usersSnapshot = await db.collection('users').where('role', '==', 'teacher').limit(1).get();
    
    if (usersSnapshot.empty) {
      throw new Error('No teacher user found. Please create a teacher user first.');
    }

    const teacherDoc = usersSnapshot.docs[0];
    const teacherId = teacherDoc.id;

    // Create test students if they don't exist
    const studentIds = [];
    for (let i = 1; i <= 3; i++) {
      const studentId = `student-${i}`;
      const studentRef = db.collection('users').doc(studentId);
      const studentDoc = await studentRef.get();

      if (!studentDoc.exists) {
        await studentRef.set({
          name: `Test Student ${i}`,
          role: 'student',
          email: `student${i}@test.com`,
          createdAt: FieldValue.serverTimestamp()
        });
      }
      studentIds.push(studentId);
    }

    // Create a test class
    const classRef = db.collection('classes').doc('test-class-1');
    await classRef.set({
      name: 'Test Iqra Class',
      teacher: teacherId,
      students: studentIds,
      schedule: {
        day: 'Monday',
        time: '14:00'
      },
      createdAt: FieldValue.serverTimestamp()
    });

    console.log('Test class created successfully!');
    console.log('Class ID: test-class-1');
    console.log('Teacher ID:', teacherId);
    console.log('Student IDs:', studentIds);
    console.log('You can now access the teaching session at: /teach/test-class-1');
  } catch (error) {
    console.error('Error setting up test class:', error);
  }
}

setupTestClass();
