import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC17Q1pLbTSS7-eldYUUqf62IhjPZ0TvZA",
  authDomain: "midnight-cafe-266dd.firebaseapp.com",
  projectId: "midnight-cafe-266dd",
  storageBucket: "midnight-cafe-266dd.firebasestorage.app",
  messagingSenderId: "451182845332",
  appId: "1:451182845332:web:30b0d9a93bac531be34381"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// State
let isSignUpMode = false;

// UI Elements
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const toggleModeBtn = document.getElementById('toggleMode');
const toggleText = document.getElementById('toggleText');
const formTitle = document.getElementById('formTitle');
const googleSignInBtn = document.getElementById('googleSignInBtn');

const googleProvider = new GoogleAuthProvider();

// Toggle between Sign In and Sign Up
toggleModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    
    if (isSignUpMode) {
        formTitle.textContent = "Create Account";
        submitBtn.textContent = "Sign Up";
        toggleText.textContent = "Already have an account?";
        toggleModeBtn.textContent = "Sign In";
    } else {
        formTitle.textContent = "Midnight Café";
        submitBtn.textContent = "Sign In";
        toggleText.textContent = "New to Midnight Café?";
        toggleModeBtn.textContent = "Create an account";
    }
});

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Connecting...';
    submitBtn.style.opacity = '0.8';
    
    try {
        if (isSignUpMode) {
            // Register new user
            await createUserWithEmailAndPassword(auth, email, password);
            submitBtn.textContent = 'Account Created!';
        } else {
            // Login existing user
            await signInWithEmailAndPassword(auth, email, password);
            submitBtn.textContent = 'Welcome back!';
        }
        
        submitBtn.style.backgroundColor = '#10b981'; // Success green
        
        setTimeout(() => {
            window.location.href = 'onboarding.html';
        }, 500);
        
    } catch (error) {
        console.error(error);
        const errorMessage = error.message;
        
        submitBtn.textContent = 'Error';
        submitBtn.style.backgroundColor = '#ef4444'; // Error red
        
        // Show error message
        alert(`Error: ${errorMessage}`);
        
        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.backgroundColor = '';
            submitBtn.style.opacity = '1';
        }, 2000);
    }
});

googleSignInBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalText = googleSignInBtn.innerHTML;
    googleSignInBtn.innerHTML = 'Connecting...';
    googleSignInBtn.style.opacity = '0.8';
    
    try {
        await signInWithPopup(auth, googleProvider);
        googleSignInBtn.innerHTML = 'Success!';
        googleSignInBtn.style.backgroundColor = '#10b981';
        googleSignInBtn.style.color = 'white';
        
        setTimeout(() => {
            window.location.href = 'onboarding.html';
        }, 500);
    } catch (error) {
        console.error(error);
        alert(`Google Sign-In Error: ${error.message}`);
        
        googleSignInBtn.innerHTML = originalText;
        googleSignInBtn.style.opacity = '1';
    }
});
