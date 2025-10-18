/* ---------- CONFIG ---------- */
const ADMIN_USERNAME = 'kairo';
const ADMIN_PASSWORD = 'kairoadmin2';
const LS_KEY = 'kairo_stories_v2';

/* ---------- DEFAULT STORIES ---------- */
function genId(){ return 's_' + Math.random().toString(36).slice(2,9); }
function placeholderDataURI(){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#ff66c4'/><stop offset='1' stop-color='#7f5eff'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)' rx='10'/><text x='50%' y='50%' font-family='Poppins, sans-serif' font-size='36' fill='rgba(255,255,255,0.95)' text-anchor='middle'>Cover</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const DEFAULT_STORIES = [
  { id: genId(), title:'The Dream of Light and Shadow', author:'Kairo_Wynn', desc:'An epic fantasy about balance, fate, and the bond between light and darkness.', coverPath:'T.d.l.S.jpeg', link:'https://www.wattpad.com/story/402730375', category:'mine' },
  { id: genId(), title:'We Were Almost', author:'Kairo_Wynn', desc:'A heartfelt romance about what could’ve been — love, loss, and bittersweet memories.', coverPath:'W.W.A.jpeg', link:'https://www.wattpad.com/story/402956793', category:'mine' },
  { id: genId(), title:'Poem of Human Emotions', author:'Kairo_Wynn', desc:'A poetic collection exploring pain, love, hope, and the fragile beauty of being human.', coverPath:'Poem.png', link:'https://www.wattpad.com/story/402854597', category:'mine' }
];

/* ---------- STATE ---------- */
let stories = loadStories();
let isAdmin = false;

/* ---------- DOM REFS ---------- */
const grid = document.getElementById('grid');
const gearBtn = document.getElementById('gearBtn');
const menuSheet = document.getElementById('menuSheet');
const btnLogin = document.getElementById('btnLogin');
const btnAddMine = document.getElementById('btnAddMine');
const btnAddFriend = document.getElementById('btnAddFriend');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const importFile = document.getElementById('importFile');
const btnLogout = document.getElementById('btnLogout');
const btnReset = document.getElementById('btnReset');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalContent = document.getElementById('modalContent');

/* ---------- INIT ---------- */
renderStories();
updateMenuState();

/* ---------- EVENTS ---------- */
gearBtn.addEventListener('click', ()=> {
  menuSheet.classList.toggle('open');
  menuSheet.setAttribute('aria-hidden', menuSheet.classList.contains('open') ? 'false' : 'true');
});
document.addEventListener('click', (e)=>{
  if(!menuSheet.contains(e.target) && !gearBtn.contains(e.target)){
    if(menuSheet.classList.contains('open')) menuSheet.classList.remove('open');
  }
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    if(modalBackdrop.style.display === 'flex') closeModal();
    if(menuSheet.classList.contains('open')) menuSheet.classList.remove('open');
  }
});

// menu actions
btnLogin.addEventListener('click', openLoginModal);
btnAddMine.addEventListener('click', ()=> openAddModal('mine'));
btnAddFriend.addEventListener('click', ()=> openAddModal('friend'));
btnLogout.addEventListener('click', logout);
btnReset.addEventListener('click', resetLocalData);
btnExport.addEventListener('click', exportStories);
importFile.addEventListener('change', handleImportFile);

/* ---------- RENDER ---------- */
function renderStories(){
  grid.innerHTML = '';
  const sorted = stories.slice().sort((a,b)=>{
    if(a.category === b.category) return a.title.localeCompare(b.title);
    return a.category === 'mine' ? -1 : 1;
  });
  for(const s of sorted){
    const card = document.createElement('article');
    card.className = 'card' + (isAdmin ? ' admin-on' : '');
    card.dataset.id = s.id;

    // admin tools
    const adminDiv = document.createElement('div');
    adminDiv.className = 'admin-tools';
    adminDiv.innerHTML = `<div class="tiny" data-action="edit" title="Edit">✏️</div>
                          <div class="tiny" data-action="del" title="Delete">🗑️</div>`;
    if(isAdmin) card.appendChild(adminDiv);

    // cover
    const coverWrap = document.createElement('div');
    coverWrap.className = 'cover-wrap';
    const img = document.createElement('img');
    if(s.coverData && s.coverData.startsWith('data:')) img.src = s.coverData;
    else if(s.coverPath) img.src = s.coverPath;
    else img.src = placeholderDataURI();
    img.alt = s.title + ' cover';
    coverWrap.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="title">${escapeHtml(s.title)}</div><div class="meta">by ${escapeHtml(s.author||'Kairo_Wynn')}</div>`;
    coverWrap.appendChild(overlay);

    card.appendChild(coverWrap);

    // desc
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = s.desc || '';
    card.appendChild(desc);

    // actions
    const actions = document.createElement('div');
    actions.className = 'actions';
    const readBtn = document.createElement('a');
    readBtn.className = 'btn';
    readBtn.href = s.link || '#';
    readBtn.target = '_blank';
    readBtn.textContent = 'Read on Wattpad';
    actions.appendChild(readBtn);

    const badge = document.createElement('div');
    badge.className = 'tiny ghost';
    badge.style.background = 'rgba(255,255,255,0.04)';
    badge.textContent = s.category === 'mine' ? 'My Story' : 'Friend Story';
    actions.appendChild(badge);

    card.appendChild(actions);

    // admin click handlers
    card.addEventListener('click', (ev)=>{
      const actionBtn = ev.target.closest('[data-action]');
      if(!actionBtn) return;
      const action = actionBtn.dataset.action;
      if(action === 'edit') openEditModal(s.id);
      if(action === 'del') confirmAndDelete(s.id);
    });

    grid.appendChild(card);
  }
}

/* ---------- AUTH & MENU ---------- */
function openLoginModal(){
  modalContent.innerHTML = `
    <h3>Admin Login</h3>
    <div class="field"><label class="muted">Username</label><input id="loginUser" placeholder="username" /></div>
    <div class="field"><label class="muted">Password</label><input id="loginPass" type="password" placeholder="password" /></div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
      <button class="btn ghost" id="cancelLogin">Cancel</button>
      <button class="btn" id="doLogin">Login</button>
    </div>
    <p class="hint">Username: <strong>kairo</strong> • Password: <strong>kairoadmin2</strong></p>
  `;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');

  document.getElementById('cancelLogin').addEventListener('click', closeModal);
  document.getElementById('doLogin').addEventListener('click', ()=>{
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if(u === ADMIN_USERNAME && p === ADMIN_PASSWORD){
      isAdmin = true;
      closeModal();
      updateMenuState();
      renderStories();
      alert('Welcome, Kairo — Admin mode enabled.');
    } else {
      alert('Invalid username or password.');
    }
  });
}
function logout(){
  if(confirm('Logout from admin?')){
    isAdmin = false;
    updateMenuState();
    renderStories();
  }
}
function updateMenuState(){
  btnAddMine.style.display = isAdmin ? 'block' : 'none';
  btnAddFriend.style.display = isAdmin ? 'block' : 'none';
  btnExport.style.display = isAdmin ? 'block' : 'none';
  btnImport.style.display = isAdmin ? 'block' : 'none';
  btnLogout.style.display = isAdmin ? 'block' : 'none';
  btnLogin.style.display = isAdmin ? 'none' : 'block';
}

/* ---------- ADD / EDIT / DELETE ---------- */
function openAddModal(category){
  modalContent.innerHTML = `
    <h3>Add ${category === 'mine' ? 'My Story' : "Friend's Story"}</h3>
    <div class="field"><label class="muted">Title</label><input id="fTitle" placeholder="Story title" /></div>
    <div class="field"><label class="muted">Author (display)</label><input id="fAuthor" placeholder="Author name" value="Kairo_Wynn" /></div>
    <div class="field"><label class="muted">Short description</label><textarea id="fDesc" rows="2" placeholder="One-line description"></textarea></div>
    <div class="field"><label class="muted">Wattpad link</label><input id="fLink" placeholder="https://www.wattpad.com/story/..." /></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
      <div>
        <label class="muted">Cover image (optional)</label>
        <input id="fCover" type="file" accept="image/*" />
      </div>
      <img id="preview" class="preview-img" src="${placeholderDataURI()}" alt="preview"/>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
      <button class="btn ghost" id="cancelAdd">Cancel</button>
      <button class="btn" id="doAdd">Add Story</button>
    </div>
  `;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');

  const fCover = document.getElementById('fCover');
  const preview = document.getElementById('preview');
  let coverBase64 = null;
  fCover.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=> { coverBase64 = reader.result; preview.src = coverBase64; };
    reader.readAsDataURL(file);
  });

  document.getElementById('cancelAdd').addEventListener('click', closeModal);
  document.getElementById('doAdd').addEventListener('click', ()=>{
    const title = document.getElementById('fTitle').value.trim();
    const author = document.getElementById('fAuthor').value.trim() || 'Kairo_Wynn';
    const desc = document.getElementById('fDesc').value.trim();
    const link = document.getElementById('fLink').value.trim();
    if(!title || !link){ alert('Please provide at least title and Wattpad link.'); return; }
    const newStory = { id: genId(), title, author, desc, link, category: category==='mine' ? 'mine' : 'friend', coverData: coverBase64 };
    stories.push(newStory);
    saveStories();
    closeModal();
    renderStories();
  });
}

function openEditModal(id){
  const s = stories.find(x=>x.id===id);
  if(!s) return alert('Story not found');
  modalContent.innerHTML = `
    <h3>Edit Story</h3>
    <div class="field"><label class="muted">Title</label><input id="fTitle" value="${escapeAttr(s.title)}" /></div>
    <div class="field"><label class="muted">Author (display)</label><input id="fAuthor" value="${escapeAttr(s.author||'Kairo_Wynn')}" /></div>
    <div class="field"><label class="muted">Short description</label><textarea id="fDesc" rows="2">${escapeAttr(s.desc||'')}</textarea></div>
    <div class="field"><label class="muted">Wattpad link</label><input id="fLink" value="${escapeAttr(s.link||'')}" /></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
      <div>
        <label class="muted">Replace cover image (optional)</label>
        <input id="fCover" type="file" accept="image/*" />
      </div>
      <img id="preview" class="preview-img" src="${s.coverData ? s.coverData : (s.coverPath ? s.coverPath : placeholderDataURI())}" alt="preview"/>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
      <button class="btn ghost" id="cancelEdit">Cancel</button>
      <button class="btn" id="doSave">Save</button>
    </div>
  `;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');

  const fCover = document.getElementById('fCover');
  const preview = document.getElementById('preview');
  let coverBase64 = s.coverData || null;
  fCover.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=> { coverBase64 = reader.result; preview.src = coverBase64; };
    reader.readAsDataURL(file);
  });

  document.getElementById('cancelEdit').addEventListener('click', closeModal);
  document.getElementById('doSave').addEventListener('click', ()=>{
    const title = document.getElementById('fTitle').value.trim();
    const author = document.getElementById('fAuthor').value.trim();
    const desc = document.getElementById('fDesc').value.trim();
    const link = document.getElementById('fLink').value.trim();
    if(!title || !link){ alert('Please provide at least title and Wattpad link.'); return; }
    s.title = title; s.author = author; s.desc = desc; s.link = link;
    if(coverBase64) s.coverData = coverBase64;
    saveStories();
    closeModal();
    renderStories();
  });
}

function confirmAndDelete(id){
  // custom confirmation modal (small)
  modalContent.innerHTML = `
    <h3>Delete story?</h3>
    <p class="muted">Are you sure you want to permanently delete this story?</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn ghost" id="cancelDel">Cancel</button>
      <button class="btn" id="doDel">Yes, delete</button>
    </div>
  `;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');

  document.getElementById('cancelDel').addEventListener('click', closeModal);
  document.getElementById('doDel').addEventListener('click', ()=>{
    stories = stories.filter(s=>s.id !== id);
    saveStories();
    closeModal();
    renderStories();
  });
}

/* ---------- STORAGE ---------- */
function loadStories(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){ localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_STORIES)); return JSON.parse(JSON.stringify(DEFAULT_STORIES)); }
    return JSON.parse(raw);
  }catch(e){
    console.error('loadStories error', e);
    return JSON.parse(JSON.stringify(DEFAULT_STORIES));
  }
}
function saveStories(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(stories)); }catch(e){ alert('Failed to save. Storage may be full or blocked.'); }
}
function resetLocalData(){
  if(!confirm('Reset local stories to default? This deletes your added stories and restores initial three.')) return;
  localStorage.removeItem(LS_KEY);
  stories = loadStories();
  isAdmin = false;
  updateMenuState();
  renderStories();
  alert('Reset complete.');
}

/* ---------- EXPORT / IMPORT ---------- */
function exportStories(){
  const dataStr = JSON.stringify(stories, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stories.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleImportFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try {
      const imported = JSON.parse(reader.result);
      if(!Array.isArray(imported)) return alert('Invalid file: expected an array of stories.');
      if(!confirm('Importing will overwrite your current stories. Continue?')) return;
      stories = imported.map(s => ({ id: s.id || genId(), title: s.title||'Untitled', author: s.author||'Kairo_Wynn', desc: s.desc||'', coverData: s.coverData||null, coverPath: s.coverPath||null, link: s.link||'#', category: s.category||'friend' }));
      saveStories();
      renderStories();
      alert('Import complete.');
    } catch(err){
      alert('Failed to import. File may be invalid.');
    }
  };
  reader.readAsText(file);
}

/* ---------- UTIL ---------- */
function closeModal(){ modalBackdrop.style.display = 'none'; modalBackdrop.setAttribute('aria-hidden','true'); modalContent.innerHTML=''; document.getElementById('importFile').value = ''; }
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s).replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }
