// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

// Firebase project configuration (Extracted from existing login.html)
const firebaseConfig = {
  apiKey: "AIzaSyAzIhF90avA0snSAOgCqRlKG49lRI2xTuk",
  authDomain: "mehwish-tutoring.firebaseapp.com",
  projectId: "mehwish-tutoring",
  storageBucket: "mehwish-tutoring.appspot.com",
  messagingSenderId: "163983660579",
  appId: "1:163983660579:web:3f13ba6f987db6c6ba8396"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
