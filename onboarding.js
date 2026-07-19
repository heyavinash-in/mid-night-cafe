import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC17Q1pLbTSS7-eldYUUqf62IhjPZ0TvZA",
  authDomain: "midnight-cafe-266dd.firebaseapp.com",
  projectId: "midnight-cafe-266dd",
  storageBucket: "midnight-cafe-266dd.firebasestorage.app",
  messagingSenderId: "451182845332",
  appId: "1:451182845332:web:30b0d9a93bac531be34381"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let selectedAvatar = '🦊';
let currentUser = null;

// Wait for auth state to resolve
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        // Not logged in, redirect to login
        window.location.href = 'index.html';
    }
});

// Avatar selection logic
const avatarOptions = document.querySelectorAll('.avatar-option');
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selected class from all
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        // Add to clicked
        option.classList.add('selected');
        selectedAvatar = option.getAttribute('data-avatar');
    });
});

const form = document.getElementById('onboardingForm');
const usernameInput = document.getElementById('username');
const saveBtn = document.getElementById('saveBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const username = usernameInput.value.trim();
    
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.style.opacity = '0.8';
    
    try {
        // Update user profile in Firebase
        await updateProfile(currentUser, {
            displayName: username,
            photoURL: selectedAvatar
        });
        
        saveBtn.textContent = 'Welcome to the Café!';
        saveBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            alert(`Profile saved! Username: ${username}, Avatar: ${selectedAvatar}\n\n(Normally, this would redirect you to the main chat room!)`);
        }, 1000);
        
    } catch (error) {
        console.error(error);
        alert(`Error: ${error.message}`);
        saveBtn.textContent = originalText;
        saveBtn.style.opacity = '1';
    }
});
