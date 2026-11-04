let myUsername = localStorage.getItem('zingra_my_username') || ("user" + Math.floor(100 + Math.random() * 900));
localStorage.setItem('zingra_my_username', myUsername);
document.getElementById('myUsernameDisplay').innerText = "@" + myUsername;

function changeMyUsername() {
  const newU = prompt("Naya Username likho:", myUsername);
  if (newU && newU.trim()) {
    myUsername = newU.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    localStorage.setItem('zingra_my_username', myUsername);
    document.getElementById('myUsernameDisplay').innerText = "@" + myUsername;
    updateActiveRoom();
  }
}

const urlParams = new URLSearchParams(window.location.search);
let partnerUsername = urlParams.get('chat') || localStorage.getItem('zingra_active_partner') || '';
let currentRoomId = '';

const socket = io();

function updateActiveRoom() {
  if (!partnerUsername) {
    document.getElementById('activePartnerText').innerText = "🔒 Dost ka username connect karein";
    return;
  }
  const sorted = [myUsername, partnerUsername].sort();
  currentRoomId = `room_${sorted[0]}_${sorted[1]}`;
  document.getElementById('activePartnerText').innerText = `🔒 Chatting with: @${partnerUsername}`;
  document.getElementById('partnerInput').value = partnerUsername;
  localStorage.setItem('zingra_active_partner', partnerUsername);
  socket.emit('join-room', currentRoomId);
  loadSavedChats();
}

function connectToPartnerManual() {
  const val = document.getElementById('partnerInput').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!val || val === myUsername) return alert("Valid dost ka username likhein!");
  partnerUsername = val;
  updateActiveRoom();
}

function shareMyChatLink() {
  const link = `${window.location.origin}/?chat=${myUsername}`;
  navigator.clipboard.writeText(link);
  alert("Link copied! WhatsApp par bhej do:\n" + link);
}

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

let sharedKey;
async function initCrypto() {
  sharedKey = await window.crypto.subtle.importKey(
    "raw", new TextEncoder().encode("12345678901234567890123456789012"),
    { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
  updateActiveRoom();
}
initCrypto();

function loadSavedChats() {
  const box = document.getElementById('chatsContainer');
  box.innerHTML = '';
  if (!currentRoomId) return;
  const saved = JSON.parse(localStorage.getItem(`zingra_${currentRoomId}`) || '[]');
  saved.forEach(m => renderBubble(m.text, m.type, m.time));
}

async function sendMsg() {
  if (!partnerUsername) return alert("Pehle dost ka username likho!");
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, new TextEncoder().encode(text));
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const payload = {
    cipher: btoa(String.fromCharCode(...new Uint8Array(cipher))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    time
  };
  socket.emit('encrypted-message', payload);
  renderBubble(text, 'sent', time);
  const saved = JSON.parse(localStorage.getItem(`zingra_${currentRoomId}`) || '[]');
  saved.push({ text, type: 'sent', time });
  localStorage.setItem(`zingra_${currentRoomId}`, JSON.stringify(saved));
  input.value = '';
}

socket.on('encrypted-message', async (data) => {
  const dec = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(atob(data.iv), c => c.charCodeAt(0)) },
    sharedKey,
    Uint8Array.from(atob(data.cipher), c => c.charCodeAt(0))
  );
  const text = new TextDecoder().decode(dec);
  renderBubble(text, 'received', data.time);
  const saved = JSON.parse(localStorage.getItem(`zingra_${currentRoomId}`) || '[]');
  saved.push({ text, type: 'received', time: data.time });
  localStorage.setItem(`zingra_${currentRoomId}`, JSON.stringify(saved));
});

function renderBubble(text, type, time) {
  const box = document.getElementById('chatsContainer');
  const div = document.createElement('div');
  div.className = `bubble ${type}`;
  div.innerHTML = `<div>${text}</div><div class="time-tick">${time} ${type === 'sent' ? '✓✓' : ''}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

renderFeed();
