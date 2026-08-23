// firebase-config.js — paste your Firebase Web app config below.
//
// Firebase console → Project settings → General → Your apps → Web app →
// "SDK setup and configuration" → Config. Copy the values into the object below.
//
// Cloud share codes turn ON AUTOMATICALLY once `apiKey` + `projectId` are filled in
// — there is no separate flag to toggle. Leave them blank to stay on the encrypted
// -file sharing path (no backend, nothing leaves the device).
//
// SECURITY: only ciphertext is ever written to Firestore. Lock the database with the
// rules in `firestore.rules` (create/read on the `shares` collection, no listing).
// See README → "Firebase setup". Note: these Web config values are NOT secrets — they
// identify the project; access is controlled by the Firestore rules.

export const firebaseConfig = {
  apiKey: 'AIzaSyCGE9eZoD7gmvTCWUL-GSo-wEkPlaqeuSE',
  authDomain: 'wealth-compass-app.firebaseapp.com',
  projectId: 'wealth-compass-app',
  storageBucket: 'wealth-compass-app.firebasestorage.app',
  messagingSenderId: '222163085917',
  appId: '1:222163085917:web:f2c6064f75ef02bb64fbb4',
  measurementId: 'G-T76R9ELQZM',
};

// Firestore collection that holds encrypted share handoffs.
export const SHARE_COLLECTION = 'shares';
