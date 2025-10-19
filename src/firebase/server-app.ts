import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let cachedApp: FirebaseApp | null = null;

function initServerFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  if (!getApps().length) {
    try {
      cachedApp = initializeApp();
    } catch (error) {
      cachedApp = initializeApp(firebaseConfig);
    }
  } else {
    cachedApp = getApp();
  }

  return cachedApp;
}

export function getServerFirebaseApp(): FirebaseApp {
  return initServerFirebaseApp();
}

export function getServerFirestore(): Firestore {
  return getFirestore(getServerFirebaseApp());
}
