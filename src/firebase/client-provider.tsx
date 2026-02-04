'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { enableIndexedDbPersistence } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []);

  useEffect(() => {
    if (firebaseServices.firestore) {
      enableIndexedDbPersistence(firebaseServices.firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn(
            'Firestore persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.'
          );
        } else if (err.code === 'unimplemented') {
          console.warn(
            'Firestore persistence failed: The current browser does not support all of the features required to enable persistence.'
          );
        }
      });
    }
  }, [firebaseServices.firestore]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
