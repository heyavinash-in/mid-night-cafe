import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const currentUserAvatar = document.getElementById('currentUserAvatar');
const searchInput = document.getElementById('searchInput');
const searchResult = document.getElementById('searchResult');
const emptyState = document.getElementById('emptyState');
const requestBtn = document.getElementById('requestBtn');
const incomingRequestsContainer = document.getElementById('incomingRequestsContainer');
const requestsList = document.getElementById('requestsList');

let currentUser = null;
let foundUser = null; // The user currently displayed in search results

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        if (user.photoURL) {
            currentUserAvatar.textContent = user.photoURL;
        }
        // Start listening for incoming requests once auth is confirmed
        listenForRequests();
        loadRecentChats();
    }
});

// Search Logic
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const searchQuery = e.target.value.trim().toLowerCase();
    
    clearTimeout(searchTimeout);
    
    if (searchQuery === '') {
        searchResult.style.display = 'none';
        emptyState.style.display = 'none';
        foundUser = null;
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            // Query Firestore users collection
            console.log(`Searching Firestore for: "${searchQuery}"`);
            const q = query(collection(db, "users"), where("searchUsername", "==", searchQuery));
            const querySnapshot = await getDocs(q);
            console.log(`Found ${querySnapshot.docs.length} results.`);
            
            if (!querySnapshot.empty) {
                // Get the first matching user
                const userData = querySnapshot.docs[0].data();
                
                // Don't show yourself
                if (userData.uid === currentUser.uid) {
                    searchResult.style.display = 'none';
                    emptyState.style.display = 'block';
                    foundUser = null;
                    return;
                }
                
                foundUser = userData;
                
                document.getElementById('resultAvatar').textContent = userData.avatar || '👤';
                document.getElementById('resultUsername').textContent = userData.username;
                
                searchResult.style.display = 'flex';
                emptyState.style.display = 'none';
                
                // Reset button state
                requestBtn.textContent = 'Send Request';
                requestBtn.style.backgroundColor = '';
                requestBtn.disabled = false;
            } else {
                searchResult.style.display = 'none';
                emptyState.style.display = 'block';
                foundUser = null;
            }
        } catch (error) {
            console.error("Error searching users: ", error);
            emptyState.innerHTML = `<p style="color: #ef4444; max-width: 80%; margin: 0 auto;">Error: ${error.message}</p>`;
            emptyState.style.display = 'block';
            searchResult.style.display = 'none';
        }
    }, 500); // 500ms debounce
});

// Send Request Logic
requestBtn.addEventListener('click', async () => {
    if (!foundUser || !currentUser) return;
    
    requestBtn.textContent = 'Sending...';
    requestBtn.style.opacity = '0.8';
    
    try {
        // Write to requests collection
        await addDoc(collection(db, "requests"), {
            fromUid: currentUser.uid,
            fromUsername: currentUser.displayName,
            fromAvatar: currentUser.photoURL,
            toUid: foundUser.uid,
            status: 'pending',
            timestamp: new Date()
        });
        
        requestBtn.textContent = 'Request Sent!';
        requestBtn.style.backgroundColor = '#10b981'; // Success Green
        requestBtn.style.opacity = '1';
        requestBtn.disabled = true;
    } catch (error) {
        console.error("Error sending request: ", error);
        requestBtn.textContent = 'Error';
        requestBtn.style.backgroundColor = '#ef4444';
        
        setTimeout(() => {
            requestBtn.textContent = 'Send Request';
            requestBtn.style.backgroundColor = '';
            requestBtn.style.opacity = '1';
        }, 2000);
    }
});

// Listen for incoming requests
function listenForRequests() {
    if (!currentUser) return;
    
    const q = query(
        collection(db, "requests"), 
        where("toUid", "==", currentUser.uid),
        where("status", "==", "pending")
    );
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            incomingRequestsContainer.style.display = 'none';
            requestsList.innerHTML = '';
            return;
        }
        
        incomingRequestsContainer.style.display = 'block';
        requestsList.innerHTML = '';
        
        snapshot.forEach((docSnap) => {
            const req = docSnap.data();
            const reqId = docSnap.id;
            
            const reqEl = document.createElement('div');
            reqEl.className = 'request-item';
            reqEl.innerHTML = `
                <div class="request-info">
                    <div class="request-avatar">${req.fromAvatar || '👤'}</div>
                    <div class="request-name">${req.fromUsername}</div>
                </div>
                <button class="accept-btn" data-id="${reqId}" data-from="${req.fromUid}" data-name="${req.fromUsername}">Accept</button>
            `;
            
            requestsList.appendChild(reqEl);
        });
        
        // Add event listeners to accept buttons
        const acceptBtns = document.querySelectorAll('.accept-btn');
        acceptBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reqId = e.target.getAttribute('data-id');
                const fromUid = e.target.getAttribute('data-from');
                const fromName = e.target.getAttribute('data-name');
                
                e.target.textContent = 'Accepting...';
                
                try {
                    // Generate a unique chat room ID (alphabetical sort ensures same ID for both)
                    const roomId = [currentUser.uid, fromUid].sort().join('_');
                    
                    // Create the chat room document
                    await setDoc(doc(db, "chatRooms", roomId), {
                        participants: [currentUser.uid, fromUid],
                        createdAt: new Date()
                    });
                    
                    // Update request status (delete for cleanup)
                    await deleteDoc(doc(db, "requests", reqId));
                    
                    // Redirect to chat room
                    window.location.href = `chat.html?room=${roomId}&name=${encodeURIComponent(fromName)}&avatar=${encodeURIComponent(req.fromAvatar)}`;
                    
                } catch (error) {
                    console.error("Error accepting request: ", error);
                    e.target.textContent = 'Error';
                }
            });
        });
    });
}

// Fetch and display Recent Chats
function loadRecentChats() {
    if (!currentUser) return;
    
    const q = query(
        collection(db, "chatRooms"),
        where("participants", "array-contains", currentUser.uid)
    );
    
    onSnapshot(q, async (snapshot) => {
        const recentChatsList = document.getElementById('recentChatsList');
        
        if (snapshot.empty) {
            recentChatsList.innerHTML = '<div class="empty-state" style="display: block; margin-top: 20px;">No recent chats yet. Search for a friend to start!</div>';
            return;
        }
        
        let chats = [];
        
        // Process each chat room
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const roomId = docSnap.id;
            
            // Find the partner's UID
            const partnerUid = data.participants.find(uid => uid !== currentUser.uid);
            
            // Fetch partner's profile
            let partnerName = "Unknown";
            let partnerAvatar = "👤";
            
            if (partnerUid) {
                try {
                    const partnerDoc = await getDoc(doc(db, "users", partnerUid));
                    if (partnerDoc.exists()) {
                        partnerName = partnerDoc.data().username;
                        partnerAvatar = partnerDoc.data().avatar;
                    }
                } catch (e) {
                    console.error("Error fetching partner profile", e);
                }
            }
            
            chats.push({
                roomId: roomId,
                partnerName: partnerName,
                partnerAvatar: partnerAvatar,
                lastMessage: data.lastMessage || 'New Chat Created',
                lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toMillis() : (data.createdAt ? data.createdAt.toMillis() : 0)
            });
        }
        
        // Sort chats by most recent first
        chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        // Render
        recentChatsList.innerHTML = '';
        chats.forEach(chat => {
            const chatEl = document.createElement('a');
            chatEl.href = `chat.html?room=${chat.roomId}&name=${encodeURIComponent(chat.partnerName)}&avatar=${encodeURIComponent(chat.partnerAvatar)}`;
            chatEl.className = 'recent-chat-item';
            
            chatEl.innerHTML = `
                <div class="recent-chat-avatar">${chat.partnerAvatar}</div>
                <div class="recent-chat-details">
                    <div class="recent-chat-name">${chat.partnerName}</div>
                    <div class="recent-chat-msg">${chat.lastMessage}</div>
                </div>
            `;
            
            recentChatsList.appendChild(chatEl);
        });
    });
}

// ==========================================
// PWA Install Logic
// ==========================================
let deferredPrompt;
const pwaInstallPopup = document.getElementById('pwaInstallPopup');
const pwaInstallBtn = document.getElementById('pwaInstallBtn');
const pwaCloseBtn = document.getElementById('pwaCloseBtn');
const inlineInstallBtn = document.getElementById('inlineInstallBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Show inline install button
    if (inlineInstallBtn) {
        inlineInstallBtn.style.display = 'block';
    }
    
    // Show custom popup if they haven't dismissed it recently
    if (!localStorage.getItem('pwa_dismissed')) {
        setTimeout(() => {
            pwaInstallPopup.style.display = 'block';
        }, 2000); // Show 2 seconds after home page loads
    }
});

pwaCloseBtn.addEventListener('click', () => {
    pwaInstallPopup.style.display = 'none';
    localStorage.setItem('pwa_dismissed', 'true');
});

pwaInstallBtn.addEventListener('click', async () => {
    pwaInstallPopup.style.display = 'none';
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        if (inlineInstallBtn) inlineInstallBtn.style.display = 'none';
    }
});

if (inlineInstallBtn) {
    inlineInstallBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            inlineInstallBtn.style.display = 'none';
        }
    });
}

// Check if iOS (iOS doesn't support beforeinstallprompt)
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

// Check if already running as PWA
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode()) {
    if (inlineInstallBtn) {
        inlineInstallBtn.style.display = 'block';
        inlineInstallBtn.addEventListener('click', () => {
            document.querySelector('.pwa-text h3').textContent = 'Install on iOS';
            document.querySelector('.pwa-text p').innerHTML = 'Tap the <b>Share</b> icon below<br>then <b>Add to Home Screen</b>';
            pwaInstallBtn.style.display = 'none';
            pwaInstallPopup.style.display = 'block';
        });
    }

    if (!localStorage.getItem('pwa_dismissed')) {
        // Modify popup for iOS instructions
        document.querySelector('.pwa-text h3').textContent = 'Install on iOS';
        document.querySelector('.pwa-text p').innerHTML = 'Tap the <b>Share</b> icon below<br>then <b>Add to Home Screen</b>';
        pwaInstallBtn.style.display = 'none'; // Can't click to install programmatically on iOS
        
        setTimeout(() => {
            pwaInstallPopup.style.display = 'block';
        }, 2000);
    }
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.replace('index.html');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}
