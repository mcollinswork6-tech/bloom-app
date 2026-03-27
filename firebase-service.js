import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8skPQ24F66rvtQ2smMLkePAGn73qW_9o",
    authDomain: "bloom-729ff.firebaseapp.com",
    projectId: "bloom-729ff",
    storageBucket: "bloom-729ff.firebasestorage.app",
    messagingSenderId: "979909510729",
    appId: "1:979909510729:web:fc007c2a6a336a95bf2198",
    measurementId: "G-HQLG1BQ03M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Logic: Log In
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

// Logic: Sign Up
export const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);

// Logic: Log Out
export const logout = () => signOut(auth);

// Logic: Hydration
export const addGlassOfWater = (userId) => {
    const userRef = doc(db, "users", userId);
    return updateDoc(userRef, { dailyHydration: increment(1) });
};

export const resetHydration = (userId) => {
    const userRef = doc(db, "users", userId);
    return updateDoc(userRef, { dailyHydration: 0 });
};

// Logic: Journal
export const saveJournal = (userId, text) => {
    const timestamp = new Date().toISOString();
    return setDoc(doc(db, "users", userId, "journal", timestamp), {
        entry: text,
        date: timestamp
    });
};

export const getJournalEntries = async (userId) => {
    const q = query(collection(db, "users", userId, "journal"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const entries = [];
    querySnapshot.forEach((doc) => {
        entries.push(doc.data());
    });
    return entries;
};