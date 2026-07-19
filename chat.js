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

function listenForMessages() {
    const q = query(
        collection(db, "chatRooms", roomId, "messages"),
        orderBy("timestamp", "asc")
    );
    
    onSnapshot(q, async (snapshot) => {
        messagesList.innerHTML = '';
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const isSent = data.senderId === currentUser.uid;
            
            let displayText = data.text;
            
            // Legacy support for older encrypted messages
            if (data.isEncrypted) {
                displayText = data.isImage ? "🔒 [Encrypted Image - E2EE Disabled]" : "🔒 [Encrypted Message - E2EE Disabled]";
            }
            
            const msgEl = document.createElement('div');
            msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
            
            if (data.isImage || displayText.startsWith('data:image/')) {
                // It's an image!
                msgEl.classList.add('image-message');
                if (displayText.startsWith('data:image/')) {
                    msgEl.innerHTML = `<img src="${displayText}" class="chat-image" onclick="window.open(this.src)" />`;
                } else {
                    msgEl.textContent = displayText;
                }
            } else {
                msgEl.textContent = displayText;
            }
            
            messagesList.appendChild(msgEl);
        }
        
        // Auto scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    });
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
            isEncrypted: false
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
    await sendMessage(text, false);
});

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
