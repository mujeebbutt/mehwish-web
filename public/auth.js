// js/auth.js
import { auth, db, GoogleAuthProvider } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleBtn = document.getElementById('google-login-btn');
const authMessage = document.getElementById('auth-message');

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

signupBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await addDoc(collection(db, "students"), {
      uid: userCredential.user.uid,
      email,
      createdAt: serverTimestamp()
    });
    window.location.href = 'dashboard.html';
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

googleBtn.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    window.location.href = 'dashboard.html';
  } catch (error) {
    authMessage.textContent = error.message;
  }
});
