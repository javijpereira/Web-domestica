// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZ6FUgCHfudfBasmRNz3vK2KHtiVKTYkU",
  authDomain: "mi-web-domestica.firebaseapp.com",
  projectId: "mi-web-domestica",
  storageBucket: "mi-web-domestica.firebasestorage.com",
  messagingSenderId: "464485161458",
  appId: "1:464485161458:web:d1614a1c307d39ac4df36b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
