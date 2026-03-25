// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzIhF90avA0snSAOgCqRlKG49lRI2xTuk",
  authDomain: "mehwish-tutoring.firebaseapp.com",
  projectId: "mehwish-tutoring",
  storageBucket: "mehwish-tutoring.appspot.com",
  messagingSenderId: "163983660579",
  appId: "1:163983660579:web:3f13ba6f987db6c6ba8396"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, GoogleAuthProvider };
