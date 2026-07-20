import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, orderBy, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Get roomId and partner name from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const partnerName = urlParams.get('name') || 'Chat Room';
const partnerAvatar = urlParams.get('avatar') || '👤';

if (!roomId) {
    window.location.href = 'home.html';
}

document.getElementById('chatTitle').textContent = partnerName;
document.getElementById('chatAvatar').textContent = partnerAvatar;

const messagesList = document.getElementById('messagesList');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        listenForMessages();
    }
});

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusIcon(status) {
    if (status === 'seen') {
        return `<span class="status-icon status-seen"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg></span>`;
    } else if (status === 'delivered') {
        return `<span class="status-icon"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path></svg></span>`;
    } else {
        // default sent
        return `<span class="status-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path></svg></span>`;
    }
}

function listenForMessages() {
    const q = query(
        collection(db, "chatRooms", roomId, "messages"),
        orderBy("timestamp", "asc")
    );
    
    let isInitialLoad = true;
    
    onSnapshot(q, (snapshot) => {
        let hasNewMessages = false;
        
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const docId = change.doc.id;
            const isSent = data.senderId === currentUser.uid;
            
            if (change.type === "added") {
                // Mark incoming messages as seen
                if (!isSent && data.status !== 'seen') {
                    updateDoc(change.doc.ref, { status: 'seen' }).catch(console.error);
                }
                
                const msgEl = createMessageElement(docId, data, isSent, change.doc.ref);
                messagesList.appendChild(msgEl);
                hasNewMessages = true;
            }
            
            if (change.type === "modified") {
                const existingMsg = document.getElementById(`msg-${docId}`);
                if (existingMsg) {
                    const newMsgEl = createMessageElement(docId, data, isSent, change.doc.ref);
                    messagesList.replaceChild(newMsgEl, existingMsg);
                }
            }
            
            if (change.type === "removed") {
                const existingMsg = document.getElementById(`msg-${docId}`);
                if (existingMsg) existingMsg.remove();
            }
        });
        
        if (hasNewMessages || isInitialLoad) {
            messagesList.scrollTop = messagesList.scrollHeight;
            isInitialLoad = false;
        }
    });
}

function createMessageElement(docId, data, isSent, docRef) {
    let displayText = data.text;
    if (data.isEncrypted) {
        displayText = data.isImage ? "🔒 [Encrypted Image - E2EE Disabled]" : "🔒 [Encrypted Message - E2EE Disabled]";
    }
    
    const msgEl = document.createElement('div');
    msgEl.id = `msg-${docId}`;
    msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    if (data.isImage || displayText.startsWith('data:image/')) {
        msgEl.classList.add('image-message');
        if (displayText.startsWith('data:image/')) {
            contentEl.innerHTML = `<img src="${displayText}" class="chat-image" onclick="window.open(this.src)" />`;
        } else {
            contentEl.textContent = displayText;
        }
    } else {
        contentEl.textContent = displayText;
    }
    msgEl.appendChild(contentEl);
    
    const footerEl = document.createElement('div');
    footerEl.className = 'message-footer';
    
    if (data.isEdited) {
        const editedEl = document.createElement('span');
        editedEl.className = 'message-edited';
        editedEl.textContent = '(edited)';
        footerEl.appendChild(editedEl);
    }
    
    const timeEl = document.createElement('span');
    timeEl.textContent = formatTime(data.timestamp);
    footerEl.appendChild(timeEl);
    
    if (isSent) {
        const statusHtml = getStatusIcon(data.status || 'sent');
        footerEl.insertAdjacentHTML('beforeend', statusHtml);
    }
    
    msgEl.appendChild(footerEl);
    
    if (isSent && !data.isImage && !data.isEncrypted) {
        msgEl.addEventListener('dblclick', async () => {
            const newText = prompt("Edit your message:", data.text);
            if (newText !== null && newText.trim() !== '' && newText.trim() !== data.text) {
                try {
                    await updateDoc(docRef, {
                        text: newText.trim(),
                        isEdited: true
                    });
                    await updateDoc(doc(db, "chatRooms", roomId), {
                        lastMessage: newText.trim()
                    });
                } catch (err) {
                    console.error("Failed to edit message:", err);
                }
            }
        });
    }
    
    return msgEl;
}

// --- Image Compression & Sending ---
const imageInput = document.getElementById('imageInput');
const attachmentBtn = document.getElementById('attachmentBtn');

attachmentBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    imageInput.value = ''; // Reset input
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
            // Compress mathematically via Canvas
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Resize to fit Firestore 1MB limits
            const scaleSize = MAX_WIDTH / img.width;
            
            // Only scale down if image is larger than MAX_WIDTH
            if (img.width > MAX_WIDTH) {
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Output Base64 string at 0.6 JPEG quality
            const base64String = canvas.toDataURL('image/jpeg', 0.6);
            
            // Send exactly like a text message
            await sendMessage(base64String, true);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

async function sendMessage(text, isImage = false) {
    if (!currentUser) return;
    
    try {
        let msgData = {
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
            text: text,
            isImage: isImage,
            isEncrypted: false,
            status: 'sent'
        };
        
        await addDoc(collection(db, "chatRooms", roomId, "messages"), msgData);
        
        // Update the room's last message for the recent chats list
        await updateDoc(doc(db, "chatRooms", roomId), {
            lastMessage: isImage ? "📷 Sent an image" : text,
            lastMessageTime: serverTimestamp()
        });
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Failed to send message.");
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text === '') return;
    
    messageInput.value = ''; 
    
    // Force the keyboard to stay open on mobile devices
    messageInput.focus();
    
    // Prevent the button click from stealing focus on touch
    setTimeout(() => {
        messageInput.focus();
    }, 10);
    
    await sendMessage(text, false);
});

// Prevent the send button from taking focus away from the input field
const sendBtn = document.querySelector('.send-btn');
if (sendBtn) {
    sendBtn.addEventListener('mousedown', (e) => e.preventDefault());
}

// Advanced Emoji Picker Logic
const emojiToggleBtn = document.getElementById('emojiToggleBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
const emojiTabs = document.querySelectorAll('.emoji-tab');

const emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫣','🤭','🫢','🫡','🤫','🫠','🤥','😶','🫥','😐','🫤','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷','🕸','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕️','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽','🥣','🥡','🥢','🧂'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🩼','🛴','🚲','🛵','🏍','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩','💺','🛰','🚀','🛸','🚁','🛶','⛵️','🚤','🛥','🛳','⛴','🚢','⚓️','🪝','⛽️','🚧','🚦','🚥','🚏','🗺','🗿','🗽','🗼','🏰','🏯','🏟','🎡','🎢','🎠','⛲️','⛱','🏖','🏝','🏜','🌋','⛰','🏔','🗻','🏕','⛺️','🛖','🏠','🏡','🏘','🏚','🏗','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛','⛪️','🕌','🕍','🛕','🕋','⛩','🛤','🛣','🗾','🎑','🏞','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙','🌃','🌌','🌉','🌁'],
    objects: ['⌚️','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛️','⏳','📡','🔋','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒','🛠','⛏','🪚','🔩','⚙️','🪤','🧱','⛓','🧲','🔫','💣','🧨','🪓','🔪','🗡','⚔️','🛡','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎','🔑','🗝','🚪','🪑','🛋','🛏','🛌','🧸','🪆','🖼','🪞','🪟','🛍','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒','🗓','📆','📅','🗑','📇','🗃','🗳','🗄','📋','📁','📂','🗂','🗞','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇','📐','📏','🧮','📌','📍','✂️','🖊','🖋','✒️','🖌','🖍','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓']
};

function renderEmojis(category) {
    emojiGrid.innerHTML = '';
    const emojis = emojiCategories[category] || emojiCategories.smileys;
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
        });
        emojiGrid.appendChild(span);
    });
}

// Initial render
renderEmojis('smileys');

// Tab click logic
emojiTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        // Remove active class from all
        emojiTabs.forEach(t => t.classList.remove('active'));
        // Add to clicked
        e.target.classList.add('active');
        // Render
        renderEmojis(e.target.getAttribute('data-category'));
    });
});

emojiToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (emojiPicker.style.display === 'none') {
        emojiPicker.style.display = 'block';
        emojiToggleBtn.style.color = 'var(--accent-color)';
    } else {
        emojiPicker.style.display = 'none';
        emojiToggleBtn.style.color = 'var(--text-secondary)';
    }
});

document.addEventListener('click', (e) => {
    if (emojiPicker && emojiToggleBtn && !emojiPicker.contains(e.target) && !emojiToggleBtn.contains(e.target)) {
        emojiPicker.style.display = 'none';
        emojiToggleBtn.style.color = 'var(--text-secondary)';
    }
});
