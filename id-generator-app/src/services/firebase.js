import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBs73Bei23kJZ1enZNVfMJhCqwUfPrxI8c",
  authDomain: "imis-id-manager.firebaseapp.com",
  projectId: "imis-id-manager",
  storageBucket: "imis-id-manager.firebasestorage.app",
  messagingSenderId: "6647190912",
  appId: "1:6647190912:web:85abc4585b1fa8b9281d65",
  measurementId: "G-925Q6R67S2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

export { db, app, analytics };
