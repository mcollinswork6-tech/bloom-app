import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    deleteUser // Added for Apple Compliance
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    increment,
    deleteDoc // Added to wipe user data
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import dotenv from "dotenv";
dotenv.config();


const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL AUTH OBSERVER ---
onAuthStateChanged(auth, async (user) => {
    const nameElement = document.getElementById('user-name');
    const hydrationCountLabel = document.getElementById('hydrationCount');
    const hydrationBar = document.getElementById('hydrationBar');

    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (nameElement) nameElement.innerText = userData.displayName || "Bloomer";

                const count = userData.dailyHydration || 0;
                if (hydrationCountLabel) hydrationCountLabel.innerText = `${count} / 8 glasses`;
                if (hydrationBar) {
                    const percentage = Math.min((count / 8) * 100, 100);
                    hydrationBar.style.width = `${percentage}%`;
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        const path = window.location.pathname;
        if (path.includes("index.html") || path.endsWith("/")) {
            window.location.href = "login.html";
        }
    }
});

// --- LOGIN & SIGNUP LOGIC ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => window.location.href = "index.html")
            .catch((error) => alert(error.message));
    });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                displayName: "New Bloomer",
                dailyHydration: 0,
                createdAt: new Date().toISOString()
            });
            window.location.href = "index.html";
        } catch (error) {
            alert(error.message);
        }
    });
}

// --- LOGOUT & ACCOUNT DELETION (Apple Compliance) ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "login.html");
    });
}

// NOTE: Add a button with id="delete-account-btn" in your settings/profile
const deleteBtn = document.getElementById('delete-account-btn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (confirm("Are you sure? This will permanently delete your sanctuary data.")) {
            const user = auth.currentUser;
            try {
                // 1. Delete Firestore Data
                await deleteDoc(doc(db, "users", user.uid));
                // 2. Delete Auth Account
                await deleteUser(user);
                window.location.href = "login.html";
            } catch (error) {
                alert("Please re-log in before deleting your account for security.");
            }
        }
    });
}

// --- TRACKER & JOURNAL LOGIC ---
const hydrationTracker = document.getElementById('hydrationTracker');
if (hydrationTracker) {
    hydrationTracker.addEventListener('click', async () => {
        if (auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, { dailyHydration: increment(1) });
            // Smooth UI update without full reload
            const currentLabel = document.getElementById('hydrationCount').innerText;
            const currentVal = parseInt(currentLabel) || 0;
            document.getElementById('hydrationCount').innerText = `${currentVal + 1} / 8 glasses`;
        }
    });
}

const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const moodInput = document.getElementById('mood').value;
        if (auth.currentUser && moodInput) {
            const timestamp = new Date().toISOString();
            await setDoc(doc(db, "users", auth.currentUser.uid, "journal", timestamp), {
                entry: moodInput,
                date: timestamp
            });

            // --- TRIGGER TOAST ---
            const toast = document.getElementById('supportToast');
            if (toast) {
                toast.classList.add('show');

                // Hide it after 3 seconds
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            }

            document.getElementById('mood').value = ""; // Clear the input
        }
    });
}