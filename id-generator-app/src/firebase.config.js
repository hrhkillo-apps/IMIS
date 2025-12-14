import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn("Firestore persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore persistence not supported in this environment.");
    }
});

export { app, analytics, auth, db };
