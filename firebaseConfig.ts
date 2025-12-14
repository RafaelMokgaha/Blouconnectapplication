
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/analytics";
import "firebase/compat/firestore";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDB9Glqak0JiWI6KQJG_nman9QGyCQ_YFk",
  authDomain: "blouconnect.firebaseapp.com",
  projectId: "blouconnect",
  storageBucket: "blouconnect.firebasestorage.app",
  messagingSenderId: "280264678640",
  appId: "1:280264678640:web:101568a5f425373a557635",
  measurementId: "G-B654Q9PNGS"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const app = firebase.app();
const auth = firebase.auth();
const analytics = firebase.analytics();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable Offline Persistence
// This allows the app to work offline and sync changes when connectivity returns
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
    } else if (err.code == 'unimplemented') {
        console.warn("Persistence not supported by browser");
    }
  });

export { app, auth, analytics, db, storage };
