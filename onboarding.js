import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { generateKeyPair, exportKey } from './crypto.js';

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
const db = getFirestore(app);

let selectedAvatar = '🦊';
let currentUser = null;

// Wait for auth state to resolve
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'index.html';
    }
});

// Avatar selection logic
const avatarOptions = document.querySelectorAll('.avatar-option');
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar = option.getAttribute('data-avatar');
    });
});

const errorDisplay = document.getElementById('errorDisplay');
const usernameInput = document.getElementById('username');
const saveBtn = document.getElementById('saveBtn');

saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        errorDisplay.textContent = "Error: Not logged in.";
        errorDisplay.style.display = "block";
        return;
    }
    
    const username = usernameInput.value.trim();
    if (!username) {
        errorDisplay.textContent = "Please enter a username.";
        errorDisplay.style.display = "block";
        return;
    }
    
    errorDisplay.style.display = "none";
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.style.opacity = '0.8';
    
    try {
        // Update user profile in Firebase Auth
        await updateProfile(currentUser, {
            displayName: username,
            photoURL: selectedAvatar
        });
        
        // Generate E2EE Keys
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error("End-to-End Encryption requires a secure connection (HTTPS).");
        }
        
        const keyPair = await generateKeyPair();
        const publicKeyString = await exportKey(keyPair.publicKey);
        const privateKeyString = await exportKey(keyPair.privateKey);
        
        // Save private key locally securely (never leaves device)
        localStorage.setItem(`e2ee_private_${currentUser.uid}`, privateKeyString);
        
        // Save user to Firestore to make them globally searchable
        await setDoc(doc(db, "users", currentUser.uid), {
            uid: currentUser.uid,
            username: username,
            avatar: selectedAvatar,
            status: 'Online',
            searchUsername: username.toLowerCase(), // For case-insensitive search
            publicKey: publicKeyString // E2EE Public Key
        });
        
        saveBtn.textContent = 'Welcome to the Café!';
        saveBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 800);
        
    } catch (error) {
        console.error(error);
        errorDisplay.textContent = `Error: ${error.message}`;
        errorDisplay.style.display = "block";
        saveBtn.textContent = originalText;
        saveBtn.style.opacity = '1';
    }
});
