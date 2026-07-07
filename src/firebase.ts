import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Get config from the injected firebase-applet-config.json
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
