import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJlxWwJmGnbX7QSO0WZriQbIRQzUOLtG8",
  authDomain: "ka-28-chat.firebaseapp.com",
  projectId: "ka-28-chat",
  storageBucket: "ka-28-chat.appspot.com",
  messagingSenderId: "77508901571",
  appId: "1:77508901571:web:1690030492c3c897d80076",
  measurementId: "G-LMKK2P7MLY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);