const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const authGate = document.querySelector('#authGate');
const appShell = document.querySelector('.app-shell');
const authForm = document.querySelector('#authForm');
const authSwitch = document.querySelector('#authSwitch');
const authSubmit = document.querySelector('#authSubmit');
const authTitle = document.querySelector('#authTitle');
const authMessage = document.querySelector('#authMessage');
const authStatus = document.querySelector('#authStatus');
const authEmail = document.querySelector('#authEmail');
const authPassword = document.querySelector('#authPassword');
let isSignUp = false;

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.style.color = isError ? 'var(--coral)' : 'var(--green)';
}

function showApp(session) {
  authGate.classList.add('is-hidden');
  appShell.classList.add('is-visible');
  showLibraryHome();
  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.textContent = session.user.email?.slice(0, 1).toUpperCase() || 'U';
    avatar.title = 'Sign out';
    avatar.onclick = async () => {
      await supabaseClient.auth.signOut();
    };
  }
}

function statusText(status) {
  return statusLabels[language][status] || status || '未設定';
}

function renderLibraryHome() {
  const genreFilter = document.querySelector('#genreFilter');
  const statusFilter = document.querySelector('#statusFilter');
  const grid = document.querySelector('#bookshelfGrid');
  if (!genreFilter || !statusFilter || !grid) return;
  const selectedGenre = genreFilter.value;
  const selectedStatus = statusFilter.value;
  const genres = [...new Set(books.map(book => book.genre).filter(Boolean))].sort();
  genreFilter.innerHTML = '<option value="">所有類型</option>' + genres.map(genre => `<option value="${genre}">${genre}</option>`).join('');
  genreFilter.value = genres.includes(selectedGenre) ? selectedGenre : '';
  const filteredBooks = [...books].sort((a, b) => Number(b.id) - Number(a.id)).filter(book => (!genreFilter.value || book.genre === genreFilter.value) && (!selectedStatus || book.status === selectedStatus));
  grid.innerHTML = filteredBooks.map(book => `<button class="shelf-book" type="button" data-shelf-book="${book.id}"><div class="shelf-book-cover" ${book.cover ? `style="background-image:url('${book.cover}')"` : ''}><span>${book.cover ? '' : '✦'}</span></div><strong class="shelf-book-title">${book.title}</strong><span class="shelf-book-meta">${book.author || 'Untitled'}${book.genre ? ` · ${book.genre}` : ''}</span><span class="shelf-book-status">${statusText(book.status)}</span></button>`).join('') || '<p class="library-empty">尚未找到符合條件的書籍。</p>';
}

function showLibraryHome() {
  document.querySelector('#libraryHome')?.classList.remove('hidden');
  document.querySelector('#bookView')?.classList.add('book-detail-hidden');
  renderLibraryHome();
}

function showBookDetail(bookId) {
  activeBookId = bookId;
  selectedCharacter = null;
  document.querySelector('#libraryHome')?.classList.add('hidden');
  document.querySelector('#bookView')?.classList.remove('book-detail-hidden');
  render();
  save();
}

document.addEventListener('click', event => {
  const shelfBook = event.target.closest('[data-shelf-book]');
  if (shelfBook) showBookDetail(shelfBook.dataset.shelfBook);
  if (event.target.closest('[data-book]')) showBookDetail(event.target.closest('[data-book]').dataset.book);
  if (event.target.closest('#libraryNav')) showLibraryHome();
  if (event.target.closest('#brandHome')) showLibraryHome();
});
document.querySelector('#brandHome')?.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') showLibraryHome();
});
document.querySelector('#genreFilter')?.addEventListener('change', renderLibraryHome);
document.querySelector('#statusFilter')?.addEventListener('change', renderLibraryHome);

function showAuth() {
  authGate.classList.remove('is-hidden');
  appShell.classList.remove('is-visible');
}

authSwitch.onclick = () => {
  isSignUp = !isSignUp;
  authTitle.textContent = isSignUp ? '建立你的書庫' : '登入你的書庫';
  authMessage.textContent = isSignUp ? '建立帳戶後保護你的閱讀資料。' : '使用帳戶在不同裝置之間保護你的閱讀資料。';
  authSubmit.textContent = isSignUp ? '建立帳戶' : '登入';
  authSwitch.textContent = isSignUp ? '已有帳戶？登入' : '建立新帳戶';
  setAuthStatus('');
};

authForm.onsubmit = async event => {
  event.preventDefault();
  authSubmit.disabled = true;
  setAuthStatus('處理中...');
  const credentials = {email: authEmail.value.trim(), password: authPassword.value};
  const result = isSignUp
    ? await supabaseClient.auth.signUp(credentials)
    : await supabaseClient.auth.signInWithPassword(credentials);
  authSubmit.disabled = false;
  if (result.error) {
    setAuthStatus(result.error.message, true);
    return;
  }
  if (isSignUp && !result.data.session) {
    setAuthStatus('請檢查你的 email 以完成註冊。');
  }
};

let syncedUserId = null;
let syncingBookLog = false;
window.cloudSyncReady = false;

window.syncBookLog = async () => {
  if (!window.cloudSyncReady || syncingBookLog) return;
  const {data: {user}} = await supabaseClient.auth.getUser();
  if (!user) return;
  const {error} = await supabaseClient.from('book_logs').upsert({
    user_id: user.id,
    books,
    active_book_id: activeBookId,
    updated_at: new Date().toISOString()
  }, {onConflict: 'user_id'});
  if (error) console.error('Unable to sync Story Atlas data:', error);
};

async function syncUserBookLog(session) {
  if (!session || syncedUserId === session.user.id) return;
  syncingBookLog = true;
  const {data, error} = await supabaseClient.from('book_logs').select('books, active_book_id').eq('user_id', session.user.id).maybeSingle();
  if (error) {
    console.error('Unable to load Story Atlas cloud data:', error);
    syncingBookLog = false;
    return;
  }
  if (data) {
    books = (data.books || []).map(normalizeBook);
    activeBookId = data.active_book_id && books.some(book => book.id === data.active_book_id) ? data.active_book_id : books[0]?.id;
    await new Promise(resolve => { save(); setTimeout(resolve, 0); });
    render();
    renderLibraryHome();
  }
  syncedUserId = session.user.id;
  syncingBookLog = false;
  window.cloudSyncReady = true;
  if (!data) await window.syncBookLog();
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp(session);
    syncUserBookLog(session);
  } else {
    syncedUserId = null;
    window.cloudSyncReady = false;
    showAuth();
  }
});

supabaseClient.auth.getSession().then(({data, error}) => {
  if (error) setAuthStatus(error.message, true);
  else if (data.session) {
    showApp(data.session);
    syncUserBookLog(data.session);
  }
  else showAuth();
});
