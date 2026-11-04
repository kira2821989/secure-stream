// --- 1. USER PROFILE (NAME & AVATAR ENGINE) ---
function getMyProfile() {
  let profile = JSON.parse(localStorage.getItem('zingra_user_profile'));
    if (!profile || !profile.name) {
        // Agar pehle se naam nahi hai toh default set karo
            const defaultName = "User_" + Math.floor(100 + Math.random() * 900);
                profile = { name: defaultName, avatar: defaultName[0], color: "#38bdf8" };
                    localStorage.setItem('zingra_user_profile', JSON.stringify(profile));
                      }
                        return profile;
                        }

                        // User apna naam badal sake
                        function changeMyName() {
                          const current = getMyProfile();
                            const newName = prompt("Apna Display Name ya Handle likhein:", current.name);
                              if (newName && newName.trim()) {
                                  const colors = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];
                                      const randomColor = colors[Math.floor(Math.random() * colors.length)];
                                          const updated = {
                                                name: newName.trim(),
                                                      avatar: newName.trim()[0].toUpperCase(),
                                                            color: randomColor
                                                                };
                                                                    localStorage.setItem('zingra_user_profile', JSON.stringify(updated));
                                                                        renderComments(); // Refresh comment box UI
                                                                          }
                                                                          }

                                                                          // --- 2. COMMENTS RENDER (NAME, AVATAR & TIME KE SATH) ---
                                                                          function renderComments() {
                                                                            const saved = JSON.parse(localStorage.getItem(`comments_${currentVideo.id}`) || '[]');
                                                                              const allC = [...currentVideo.comments, ...saved];
                                                                                document.getElementById('cCount').innerText = allC.length;

                                                                                  const myProfile = getMyProfile();

                                                                                    // Comment input ke upar user ka name dikhana
                                                                                      const inputRow = document.querySelector('.c-input-row');
                                                                                        let nameTag = document.getElementById('userProfileTag');
                                                                                          if (!nameTag) {
                                                                                              nameTag = document.createElement('div');
                                                                                                  nameTag.id = 'userProfileTag';
                                                                                                      nameTag.style.cssText = "font-size: 11px; color: #aaa; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;";
                                                                                                          inputRow.parentNode.insertBefore(nameTag, inputRow);
                                                                                                            }
                                                                                                              nameTag.innerHTML = `
                                                                                                                  <span>Commenting as <b style="color:${myProfile.color}">@${myProfile.name}</b></span>
                                                                                                                      <span style="color:#38bdf8; cursor:pointer; font-weight:bold;" onclick="changeMyName()">✏️ Edit Name</span>
                                                                                                                        `;

                                                                                                                          // Comments list render karna
                                                                                                                            const list = document.getElementById('cList');
                                                                                                                              list.innerHTML = allC.map(c => `
                                                                                                                                  <div class="c-item" style="display:flex; gap:8px; align-items:flex-start;">
                                                                                                                                        <div style="width:24px; height:24px; border-radius:50%; background:${c.color || '#3b82f6'}; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; flex-shrink:0;">
                                                                                                                                                ${c.avatar || c.user[0].toUpperCase()}
                                                                                                                                                      </div>
                                                                                                                                                            <div style="flex:1;">
                                                                                                                                                                    <div style="display:flex; justify-content:space-between;">
                                                                                                                                                                              <b style="color: #fff; font-size:12px;">${c.user}</b>
                                                                                                                                                                                        <span style="font-size:10px; color:#777;">${c.time || 'recently'}</span>
                                                                                                                                                                                                </div>
                                                                                                                                                                                                        <div style="color: #ddd; font-size:12px; margin-top:2px;">${c.text}</div>
                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                    `).join('');
                                                                                                                                                                                                                    }

                                                                                                                                                                                                                    // --- 3. POST COMMENT (USER KE REAL NAME SE POST HONA) ---
                                                                                                                                                                                                                    function postComment() {
                                                                                                                                                                                                                      const input = document.getElementById('cInput');
                                                                                                                                                                                                                        const text = input.value.trim();
                                                                                                                                                                                                                          if (!text) return;

                                                                                                                                                                                                                            const profile = getMyProfile();

                                                                                                                                                                                                                              const newComment = {
                                                                                                                                                                                                                                  user: profile.name,
                                                                                                                                                                                                                                      avatar: profile.avatar,
                                                                                                                                                                                                                                          color: profile.color,
                                                                                                                                                                                                                                              text: text,
                                                                                                                                                                                                                                                  time: "Just now"
                                                                                                                                                                                                                                                    };

                                                                                                                                                                                                                                                      const saved = JSON.parse(localStorage.getItem(`comments_${currentVideo.id}`) || '[]');
                                                                                                                                                                                                                                                        saved.push(newComment);
                                                                                                                                                                                                                                                          localStorage.setItem(`comments_${currentVideo.id}`, JSON.stringify(saved));

                                                                                                                                                                                                                                                            renderComments();
                                                                                                                                                                                                                                                              input.value = '';
                                                                                                                                                                                                                                                              }
