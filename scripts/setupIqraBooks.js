import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(join(__dirname, '../service-account-key.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'iqra-3fee3.firebasestorage.app'
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

async function setupIqraBooks() {
  try {
    // 1. Setup Firestore metadata for books
    const books = [
      { id: 'iqra-1', title: 'Iqra Book 1', totalPages: 64 },
      { id: 'iqra-2', title: 'Iqra Book 2', totalPages: 32 },
      { id: 'iqra-3', title: 'Iqra Book 3', totalPages: 32 },
      { id: 'iqra-4', title: 'Iqra Book 4', totalPages: 32 },
      { id: 'iqra-5', title: 'Iqra Book 5', totalPages: 32 },
      { id: 'iqra-6', title: 'Iqra Book 6', totalPages: 33 },
    ];

    // Create a batch for Firestore operations
    const batch = db.batch();
    
    // Add book metadata to Firestore
    for (const book of books) {
      const bookRef = db.collection('iqra-books').doc(book.id);
      batch.set(bookRef, {
        title: book.title,
        totalPages: book.totalPages,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log('✅ Book metadata added to Firestore');

    // 2. Upload PDFs to Storage
    const pdfDir = join(rootDir, 'Iqrabookspdf');
    console.log('Looking for PDFs in:', pdfDir);
    for (const book of books) {
      const pdfPath = join(pdfDir, `${book.id}.pdf`);
      if (fs.existsSync(pdfPath)) {
        await bucket.upload(pdfPath, {
          destination: `iqra-books/${book.id}/book.pdf`,
          metadata: {
            contentType: 'application/pdf'
          }
        });
        console.log(`✅ Uploaded PDF for ${book.title}`);
      } else {
        console.log(`⚠️ PDF not found for ${book.title} at ${pdfPath}`);
      }
    }

    // 3. Upload PNGs to Storage
    const pngBaseDir = join(rootDir, 'Iqrapagepng');
    console.log('Looking for PNGs in:', pngBaseDir);
    for (const book of books) {
      const bookPngDir = join(pngBaseDir, book.id);
      if (fs.existsSync(bookPngDir)) {
        const pages = fs.readdirSync(bookPngDir);
        for (const page of pages) {
          if (page.endsWith('.png')) {
            const pagePath = join(bookPngDir, page);
            await bucket.upload(pagePath, {
              destination: `iqra-books/${book.id}/pages/${page}`,
              metadata: {
                contentType: 'image/png'
              }
            });
          }
        }
        console.log(`✅ Uploaded PNG pages for ${book.title}`);
      } else {
        console.log(`⚠️ PNG directory not found for ${book.title} at ${bookPngDir}`);
      }
    }

    console.log('🎉 Setup completed successfully!');
  } catch (error) {
    console.error('❌ Error during setup:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

setupIqraBooks();
