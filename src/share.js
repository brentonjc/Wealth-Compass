// share.js — partner handoff. A profile (scores + name) is encrypted on-device
// with a passphrase (WebCrypto AES-GCM + PBKDF2), then either:
//   (a) uploaded to Firestore under a short share code, or
//   (b) downloaded as an encrypted .wc file the partner uploads.
// Firestore only ever holds ciphertext.

import { firebaseConfig, SHARE_COLLECTION } from './firebase-config.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b642buf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt an arbitrary JSON payload with a passphrase.
export async function encryptProfile(profile, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(profile)));
  return { v: 1, salt: buf2b64(salt), iv: buf2b64(iv), data: buf2b64(ciphertext) };
}

export async function decryptProfile(bundle, passphrase) {
  const key = await deriveKey(passphrase, b642buf(bundle.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642buf(bundle.iv) },
    key,
    b642buf(bundle.data)
  );
  return JSON.parse(dec.decode(plain));
}

// A 4-char human-friendly code (no ambiguous chars).
export function makeShareCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

// Cloud sharing is on whenever real keys are present — no separate flag to set.
export function isFirebaseEnabled() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// ---- Firebase (lazy-loaded only when enabled) ----
let _db = null;
async function getDb() {
  if (!isFirebaseEnabled()) return null;
  if (_db) return _db;
  const [{ initializeApp }, firestore] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  _db = { fs: firestore, db: firestore.getFirestore(app) };
  return _db;
}

// Upload an encrypted bundle under a fresh share code. Returns the code.
// Retries a few times so a rare code collision never overwrites someone else's share
// (the security rules also forbid updates, so an existing code can't be clobbered).
export async function uploadShare(bundle) {
  const handle = await getDb();
  if (!handle) throw new Error('firebase-disabled');
  const { fs, db } = handle;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeShareCode();
    const ref = fs.doc(db, SHARE_COLLECTION, code);
    if ((await fs.getDoc(ref)).exists()) continue;
    // Firestore TTL only acts on Timestamp fields (a plain number is ignored), so write
    // real Timestamps. `expiresAt` is what a TTL policy points at: the share is deleted
    // shortly after this moment. See README → "Old share cleanup".
    const SHARE_TTL_DAYS = 30;
    await fs.setDoc(ref, {
      ...bundle,
      createdAt: fs.Timestamp.now(),
      expiresAt: fs.Timestamp.fromMillis(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
    return code;
  }
  throw new Error('code-collision');
}

export async function fetchShare(code) {
  const handle = await getDb();
  if (!handle) throw new Error('firebase-disabled');
  const { fs, db } = handle;
  const snap = await fs.getDoc(fs.doc(db, SHARE_COLLECTION, code.toUpperCase()));
  if (!snap.exists()) throw new Error('not-found');
  return snap.data();
}

// ---- Encrypted-file fallback ----
export function downloadEncryptedFile(bundle, filename = 'my-compass.wc') {
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readEncryptedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch (e) { reject(new Error('bad-file')); }
    };
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsText(file);
  });
}
