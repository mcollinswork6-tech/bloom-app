import { auth, db, login, signup, logout, addGlassOfWater, saveJournal, getJournalEntries } from './firebase-service.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, writeBatch, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. SYNC UI ON LOAD ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {
            window.location.href = "login.html";
        }
        return;
    } else {
        const path = window.location.pathname;
        if (path.includes("login.html") || path.includes("signup.html")) {
            window.location.href = "index.html";
            return;
        }
    }

    // Elements we need to fill
    const nameEl = document.getElementById('user-name-menu');
    const hydroLabel = document.getElementById('hydrationCount');
    const hydroBar = document.getElementById('hydrationBar');

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();

            // Set Side Menu Name
            if (nameEl) nameEl.innerText = userData.displayName || "Bloomer";

            // Set Hydration Progress
            const count = userData.dailyHydration || 0;
            const displayCount = Math.min(count, 8);
            if (hydroLabel) hydroLabel.innerText = `${displayCount} / 8 glasses`;
            if (hydroBar) {
                const percentage = Math.min((displayCount / 8) * 100, 100);
                hydroBar.style.width = `${percentage}%`;
            }

            // Sync Journal History if on history.html
            const logsContainer = document.getElementById('logs-container');
            if (logsContainer) {
                try {
                    const entries = await getJournalEntries(user.uid);
                    logsContainer.innerHTML = ''; // clear loading text
                    if (entries.length === 0) {
                        logsContainer.innerHTML = '<p class="body-lg">No moments gathered yet.</p>';
                    } else {
                        entries.forEach(entryEvent => {
                            const dateObj = new Date(entryEvent.date);
                            const displayDate = dateObj.toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric'
                            });

                            const entryDiv = document.createElement('div');
                            entryDiv.className = 'layer-interactive stack-sm';

                            const dateHeading = document.createElement('h3');
                            dateHeading.className = 'label-md';
                            dateHeading.innerText = displayDate;

                            const textPara = document.createElement('p');
                            textPara.className = 'body-lg';
                            textPara.style.color = 'var(--on-surface)';
                            textPara.innerText = entryEvent.entry;

                            entryDiv.appendChild(dateHeading);
                            entryDiv.appendChild(textPara);
                            logsContainer.appendChild(entryDiv);
                        });
                    }
                } catch (err) {
                    console.error("Failed to load history", err);
                    logsContainer.innerHTML = '<p class="body-lg" style="color: #ff4d4d;">Failed to load moments.</p>';
                }
            }
        }
    } catch (error) {
        console.error("Initial data load failed:", error);
    }
});

// --- 2. INTERACTIVE BUTTONS ---

// Login Form
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password)
            .then(() => window.location.href = "index.html")
            .catch((err) => alert(err.message));
    });
}

// Signup Form
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameElement = document.getElementById('signup-name');
        const emailElement = document.getElementById('signup-email');
        const passwordElement = document.getElementById('signup-password');
        const goalElement = document.getElementById('signup-goal');

        const name = nameElement ? nameElement.value : "";
        const email = emailElement ? emailElement.value : "";
        const password = passwordElement ? passwordElement.value : "";
        const goal = goalElement ? goalElement.value : "";

        try {
            const userCredential = await signup(email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email: email,
                displayName: name || "New Bloomer",
                healthGoal: goal || "General Wellness",
                dailyHydration: 0,
                createdAt: new Date().toISOString()
            });
            window.location.href = "index.html";
        } catch (error) {
            alert(error.message);
        }
    });
}



// Hydration Tracker (Water)
const waterBtn = document.getElementById('hydrationTracker');
if (waterBtn) {
    waterBtn.addEventListener('click', async () => {
        if (auth.currentUser) {
            const label = document.getElementById('hydrationCount');
            const bar = document.getElementById('hydrationBar');
            if (label && bar) {
                const current = parseInt(label.innerText.split(' ')[0]) || 0;
                if (current >= 8) {
                    return; // Already at goal, do nothing
                }

                const next = current + 1;
                try {
                    // Update Firestore via the service
                    await addGlassOfWater(auth.currentUser.uid);

                    // Update UI Instantly for a "Tactile" feel
                    label.innerText = `${next} / 8 glasses`;
                    bar.style.width = `${Math.min((next / 8) * 100, 100)}%`;

                    if (next === 8) {
                        const toast = document.getElementById('supportToast');
                        if (toast) {
                            toast.innerText = "Awesome! You've reached your hydration goal! 💧✨";
                            toast.classList.add('show');
                            setTimeout(() => {
                                toast.classList.remove('show');
                                setTimeout(() => toast.innerText = "You're doing wonderfully. ✨", 400);
                            }, 3000);
                        }
                    }
                } catch (e) {
                    console.error("Failed to add water:", e);
                }
            }
        }
    });
}

// Journal Entry (Log Entry)
const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const input = document.getElementById('mood');
        if (auth.currentUser && input.value.trim() !== "") {
            try {
                await saveJournal(auth.currentUser.uid, input.value);

                // Show the "Toast" notification
                const toast = document.getElementById('supportToast');
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 3000);
                }
                input.value = ""; // Clear input
            } catch (e) {
                console.error("Journal save failed:", e);
            }
        }
    });
}

// Side Menu Toggle
const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
if (menuToggle && sideMenu) {
    menuToggle.addEventListener('click', () => sideMenu.classList.add('open'));
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logout().then(() => window.location.href = "login.html");
    });
}

const deleteBtn = document.getElementById('delete-account-btn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm("Are you sure you want to delete your account?");
        if (confirmed) {
            await deleteAccountAndData();
        }
    });
}

async function deleteAccountAndData() {
    const user = auth.currentUser;
    if (!user) return;

    try {

        const journalRef = collection(db, "users", user.uid, "journal");
        const journalSnapshot = await getDocs(journalRef);
        const batch = writeBatch(db);
        journalSnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        await deleteDoc(doc(db, "users", user.uid));

        await deleteUser(user);

        window.location.replace("login.html");
    } catch (error) {
        console.error("Error deleting user data:", error);
    }
}