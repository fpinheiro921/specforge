
// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";


// Hardcoded Firebase configuration provided by the user to resolve authentication errors.
const firebaseConfig = {
  apiKey: "AIzaSyDIOsPBKhT3o0iame68nW7g7fu3SJ5aM3M",
  authDomain: "dulcet-opus-461713-n0.firebaseapp.com",
  projectId: "dulcet-opus-461713-n0",
  storageBucket: "dulcet-opus-461713-n0.appspot.com",
  messagingSenderId: "122426031888",
  appId: "1:122426031888:web:b65d91843f2bf6f119af95",
};

// Initialize Firebase with the provided configuration
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();


export { app, auth, db, googleProvider };
