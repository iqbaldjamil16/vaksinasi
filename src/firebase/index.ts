
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';

export function initializeFirebase() {
  const isConfigProvided = firebaseConfig && firebaseConfig.projectId;

  if (getApps().length) {
    const app = getApp();
    const firestore = getFirestore(app);
    // This is a crucial check. If persistence is already enabled, we don't try it again.
    // If we're server-side, this branch will likely be taken on subsequent renders,
    // and we avoid trying to enable persistence again.
    return getSdks(app, firestore);
  }

  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);

  // The key change: only attempt to enable persistence on the client-side.
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestore)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          console.warn('Firestore persistence failed: multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          console.warn('Firestore persistence not available in this browser.');
        }
      });
  }

  return getSdks(app, firestore);
}

export function getSdks(firebaseApp: FirebaseApp, firestore: Firestore) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
