let myUsername = localStorage.getItem('zingra_my_username') || ("user" + Math.floor(100 + Math.random() * 900));
myUsername = myUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
localStorage.setItem('zingra_my_username', myUsername);

document.getElementById('myUsernameInput').value = myUsername;

// FAST WEBSOCKET CLIENT
const socket = io({ transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  socket.emit('register-user', { username: myUsername });
  document.getElementById('lockStatusBadge').innerText = "🟢 Connected (Fast)";
  document.getElementById('lockStatusBadge').style.color = "#10b981";
  updateActiveUI();
});

socket.on('disconnect', () => {
  document.getElementById('lockStatusBadge').innerText = "🔴 Reconnecting...";
  document.getElementById('lockStatusBadge').style.color = "#ef4444";
});

function saveMyIdentity() {
  const u = document.getElementById('myUsernameInput').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!u) return alert("Username likhein!");

  myUsername = u;
  localStorage.setItem('zingra_my_username', myUsername);
  socket.emit('register-user', { username: myUsername });
  updateActiveUI();
  alert(`Aapka username: @${myUsername} save ho gaya!`);
}

const urlParams = new URLSearchParams(window.location.search);
let partnerUsername = urlParams.get('chat') || localStorage.getItem('zingra_active_partner') || '';

if (urlParams.has('chat')) {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function setPartner(name) {
  partnerUsername = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  localStorage.setItem('zingra_active_partner', partnerUsername);
  updateActiveUI();
  loadSavedChats();
}

function updateActiveUI() {
  const statusEl = document.getElementById('activePartnerText');
  if (partnerUsername) {
    statusEl.innerHTML = `🔒 Chatting with: <b style="color:#38bdf8;">@${partnerUsername}</b>`;
    document.getElementById('partnerInput').value = partnerUsername;
  } else {
    statusEl.innerHTML = `🔒 Dost ka username likhkar 'Chat' dabayein`;
  }
}

function connectToPartnerManual() {
  const val = document.getElementById('partnerInput').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!val) return alert("Dost ka username likhein!");
  if (val === myUsername) return alert("Aap khud ko message nahi bhej sakte!");
  setPartner(val);
}

function shareMyChatLink() {
  const link = `${window.location.origin}/?chat=${myUsername}`;
  navigator.clipboard.writeText(link);
  alert("Link Copied! Apne dost ko bhejo:\n" + link);
}

// --- E2EE ENGINE ---
let sharedKey = null;
async function initCrypto() {
  if (!sharedKey) {
    sharedKey = await window.crypto.subtle.importKey(
      "raw", new TextEncoder().encode("12345678901234567890123456789012"),
      { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
    );
  }
}
initCrypto();

function getChatKey() {
  if (!partnerUsername) return null;
  const pair = [myUsername, partnerUsername].sort().join('_');
  return `zingra_chat_${pair}`;
}

function loadSavedChats() {
  const box = document.getElementById('chatsContainer');
  box.innerHTML = '';
  const key = getChatKey();
  if (!key) return;
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  saved.forEach(m => renderBubble(m.text, m.type, m.time, m.status, m.id));
}

// SEND MESSAGE (With Delivery Tracking)
async function sendMsg() {
  if (!partnerUsername) return alert("Pehle dost ka username likhein aur Chat dabayein!");
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;

  await initCrypto();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, new TextEncoder().encode(text));
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgId = 'msg_' + Date.now();

  const payload = {
    id: msgId,
    to: partnerUsername,
    from: myUsername,
    cipher: btoa(String.fromCharCode(...new Uint8Array(cipher))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    time
  };

  // Pehle screen par Single Tick ✓ dikhana
  socket.emit('send-message', payload);
  renderBubble(text, 'sent', time, 'sending', msgId);

  const key = getChatKey();
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  saved.push({ id: msgId, text, type: 'sent', time, status: 'sending' });
  localStorage.setItem(key, JSON.stringify(saved));
  input.value = '';
}

// DELIVERY ACKNOWLEDGEMENT FROM SERVER
socket.on('message-status', ({ id, status, to }) => {
  const tickEl = document.getElementById(`tick_${id}`);
  if (status === 'delivered') {
    if (tickEl) {
      tickEl.innerHTML = `✓✓ Delivered`;
      tickEl.style.color = `#38bdf8`;
    }
  } else if (status === 'offline') {
    if (tickEl) {
      tickEl.innerHTML = `⚠️ @${to} offline hai!`;
      tickEl.style.color = `#f59e0b`;
    }
  }
});

// INCOMING MESSAGE
socket.on('receive-message', async (data) => {
  await initCrypto();
  if (partnerUsername !== data.from) {
    setPartner(data.from);
  }

  try {
    const dec = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Uint8Array.from(atob(data.iv), c => c.charCodeAt(0)) },
      sharedKey,
      Uint8Array.from(atob(data.cipher), c => c.charCodeAt(0))
    );
    const text = new TextDecoder().decode(dec);

    renderBubble(text, 'received', data.time, 'delivered', data.id);
    const key = getChatKey();
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    saved.push({ id: data.id, text, type: 'received', time: data.time, status: 'delivered' });
    localStorage.setItem(key, JSON.stringify(saved));
    
    switchTab('chat');
  } catch (err) {
    console.error("Decryption error:", err);
  }
});

function renderBubble(text, type, time, status, id) {
  const box = document.getElementById('chatsContainer');
  const div = document.createElement('div');
  div.className = `bubble ${type}`;
  
  let statusText = '';
  if (type === 'sent') {
    statusText = status === 'delivered' ? '✓✓ Delivered' : '✓ Sent';
  }

  div.innerHTML = `
    <div>${text}</div>
    <div style="display:flex; justify-content:flex-end; gap:4px; font-size:9px; opacity:0.8; margin-top:3px;">
      <span>${time}</span>
      <span id="tick_${id}" style="color:${status === 'delivered' ? '#38bdf8' : '#aaa'}; font-weight:bold;">${statusText}</span>
    </div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// --- VIDEO FEED ---
const allVideos = [
  { id: "vid1", title: "Big Buck Bunny - 4K Ultra HD Open Source Movie", channel: "Blender Animation", avatar: "B", avatarBg: "#f97316", views: "4.8M views", duration: "10:34", thumb: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600", hlsSrc: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", likes: 42000 },
  { id: "vid2", title: "Tears of Steel - Cyberpunk Sci-Fi VFX Short Film", channel: "Sci-Fi Cinema", avatar: "S", avatarBg: "#06b6d4", views: "2.1M views", duration: "12:14", thumb: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600", hlsSrc: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", likes: 18400 },
  { id: "vid3", title: "Building Mobile Apps with Zero Budget", channel: "OpenDev Tech", avatar: "O", avatarBg: "#10b981", views: "980K views", duration: "18:45", thumb: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600", hlsSrc: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", likes: 35000 }
];

let currentVideo = allVideos[0];
let hlsInstance = null;
const videoPlayer = document.getElementById('watchVideoPlayer');

function renderFeed() {
  const c = document.getElementById('feedList');
  c.innerHTML = '';
  allVideos.forEach(v => {
    const d = document.createElement('div');
    d.className = 'feed-card';
    d.onclick = () => openWatchPage(v);
    d.innerHTML = `
      <div class="thumb-box"><img src="${v.thumb}"><div class="duration">${v.duration}</div></div>
      <div class="feed-info"><div class="feed-avatar" style="background:${v.avatarBg}">${v.avatar}</div>
      <div class="feed-meta"><div class="feed-title">${v.title}</div><div class="feed-subtitle">${v.channel} • ${v.views}</div></div></div>
    `;
    c.appendChild(d);
  });
}

function openWatchPage(v) {
  currentVideo = v;
  document.getElementById('activeTitle').innerText = v.title;
  document.getElementById('activeViews').innerText = `${v.channel} • ${v.views}`;
  if (Hls.isSupported()) {
    if (hlsInstance) hlsInstance.destroy();
    hlsInstance = new Hls();
    hlsInstance.loadSource(v.hlsSrc);
    hlsInstance.attachMedia(videoPlayer);
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = v.hlsSrc;
  }
  videoPlayer.play();
  renderRelated();
  switchTab('watch');
  document.getElementById('backBtn').style.display = 'flex';
  window.scrollTo(0,0);
}

function renderRelated() {
  const c = document.getElementById('relatedVideosList');
  c.innerHTML = '';
  allVideos.filter(v => v.id !== currentVideo.id).forEach(v => {
    const item = document.createElement('div');
    item.className = 'related-card';
    item.onclick = () => openWatchPage(v);
    item.innerHTML = `
      <div class="related-thumb"><img src="${v.thumb}"><div class="related-duration">${v.duration}</div></div>
      <div class="related-meta"><div class="related-card-title">${v.title}</div><div class="related-card-sub">${v.channel}</div></div>
    `;
    c.appendChild(item);
  });
}

function toggleActiveLike() {
  const isLiked = localStorage.getItem(`like_${currentVideo.id}`) === 'true';
  localStorage.setItem(`like_${currentVideo.id}`, !isLiked);
  document.getElementById('likeBtn').classList.toggle('liked', !isLiked);
  document.getElementById('activeLikeCount').innerText = !isLiked ? (currentVideo.likes + 1) : currentVideo.likes;
}

function backToFeed() {
  switchTab('feed');
  document.getElementById('backBtn').style.display = 'none';
  if (videoPlayer) videoPlayer.pause();
}

function switchTab(t) {
  document.getElementById('feed-screen').style.display = t === 'feed' ? 'block' : 'none';
  document.getElementById('watch-screen').style.display = t === 'watch' ? 'block' : 'none';
  document.getElementById('chat-screen').style.display = t === 'chat' ? 'flex' : 'none';
  document.getElementById('nav-home').classList.toggle('active', t === 'feed');
  document.getElementById('nav-watch').classList.toggle('active', t === 'watch');
  document.getElementById('nav-chat').classList.toggle('active', t === 'chat');
  if (t === 'feed') document.getElementById('backBtn').style.display = 'none';
  if (t === 'watch') document.getElementById('backBtn').style.display = 'flex';
}

renderFeed();
updateActiveUI();

if (partnerUsername) {
  setPartner(partnerUsername);
  switchTab('chat');
}
