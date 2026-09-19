const contentTypeLabels = {
  zh: {book: '書籍', drama: '戲劇', comedy: '喜劇', movie: '電影', song: '歌曲', other: '其他'},
  en: {book: 'Book', drama: 'Drama', comedy: 'Comedy', movie: 'Movie', song: 'Song', other: 'Other'}
};
const contentTypeIcons = {book: '📚', drama: '🎭', comedy: '😂', movie: '🎬', song: '🎵', other: '✦'};
const builtInContentTypes = ['book', 'drama', 'comedy', 'movie', 'song', 'other'];

function contentTypeDefinitions() {
  const custom = books.flatMap(book => book.contentTypes || []);
  const overrides = books.find(book => book.contentTypeLabels)?.contentTypeLabels || {};
  const seen = new Set();
  return [...builtInContentTypes.map(id => ({id, label: overrides[id]?.label || contentTypeLabels.zh[id], labelEn: overrides[id]?.labelEn || contentTypeLabels.en[id], icon: overrides[id]?.icon || contentTypeIcons[id]})), ...custom]
    .filter(type => type?.id && !seen.has(type.id) && seen.add(type.id));
}

function contentTypeLabel(type) {
  return language === 'zh' ? type.label : type.labelEn || type.label;
}

function contentTypeIcon(type) {
  return type?.icon || '🏷️';
}

const peopleFieldKeys = ['writers', 'director', 'actors', 'singer'];

function personNameValues(value) {
  return Array.isArray(value) ? value : String(value || '').split(/\s*[·,，]\s*/).filter(Boolean);
}

function sharedPeople() {
  const people = new Map();
  const add = value => {
    const name = String(value || '').trim();
    const key = name.toLocaleLowerCase();
    if (name && !people.has(key)) people.set(key, name);
  };
  books.forEach(book => {
    add(book.author);
    peopleFieldKeys.forEach(field => personNameValues(book[field]).forEach(add));
  });
  return [...people.values()].sort((a, b) => a.localeCompare(b));
}

function syncPeopleRegistry() {
  const registry = sharedPeople().map(name => ({id: `person-${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name}));
  books.forEach(book => { book.peopleRegistry = registry.map(person => ({...person})); });
  return registry;
}

function personValues(book, key) {
  return [...new Set([...sharedPeople(), ...personNameValues(book?.[key])])];
}

function personSelectMarkup(book, key, label) {
  const values = personValues(book, key);
  const selected = personNameValues(book?.[key]);
  return `<div class="field"><label>${label}</label><input class="person-search" data-person-search="${key}" placeholder="${language === 'zh' ? '搜尋姓名' : 'Search names'}"><select name="${key}" multiple size="3">${values.map(value => `<option value="${value}" ${selected.includes(value) ? 'selected' : ''}>${value}</option>`).join('')}</select><div class="multi-entry"><input name="${key}New" placeholder="${language === 'zh' ? '輸入新姓名' : 'Add a new name'}"><button type="button" class="small-button" data-add-person="${key}">＋</button></div></div>`;
}

function attachPersonSearch(root) {
  root.querySelectorAll('[data-person-search]').forEach(input => input.oninput = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const select = root.querySelector(`[name="${input.dataset.personSearch}"]`);
    [...select.options].forEach(option => { option.hidden = Boolean(query) && !option.textContent.toLocaleLowerCase().includes(query); });
  });
}

function attachPersonAdd(root) {
  root.querySelectorAll('[data-add-person]').forEach(button => button.onclick = () => {
    const key = button.dataset.addPerson;
    const input = root.querySelector(`[name="${key}New"]`);
    const name = input.value.trim();
    if (!name) return;
    const select = root.querySelector(`[name="${key}"]`);
    if (![...select.options].some(option => option.value === name)) select.add(new Option(name, name, true, true));
    input.value = '';
  });
}

function attachPersonControls(root) {
  attachPersonSearch(root);
  attachPersonAdd(root);
}

function selectedPeople(form, key) {
  const selected = [...form.querySelector(`[name="${key}"]`).selectedOptions].map(option => option.value);
  const added = String(form.querySelector(`[name="${key}New"]`)?.value || '').split(/\s*[·,，]\s*/).map(value => value.trim()).filter(Boolean);
  return [...new Set([...selected, ...added])];
}

function contentDetailsForType(type, book = {}) {
  if (['drama', 'movie', 'comedy'].includes(type)) return [{key: 'director', label: language === 'zh' ? '導演' : 'Director', multi: true}, {key: 'actors', label: language === 'zh' ? '演員' : 'Actors', multi: true}];
  if (type === 'song') return [{key: 'singer', label: language === 'zh' ? '歌手' : 'Singer', multi: true}, {key: 'lyrics', label: language === 'zh' ? '歌詞' : 'Lyrics', multiline: true}];
  if (type === 'other') return [{key: 'additionalInfo', label: language === 'zh' ? '其他資訊' : 'Additional information', multiline: true}];
  return [];
}

function saveContentTypeDefinitions(definitions) {
  const custom = definitions.filter(type => !builtInContentTypes.includes(type.id));
  const overrides = Object.fromEntries(definitions.filter(type => builtInContentTypes.includes(type.id)).filter(type => type.label !== contentTypeLabels.zh[type.id] || type.labelEn !== contentTypeLabels.en[type.id] || type.icon !== contentTypeIcons[type.id]).map(type => [type.id, {label: type.label, labelEn: type.labelEn, icon: type.icon}]));
  books.forEach(book => { book.contentTypes = custom; book.contentTypeLabels = overrides; });
  save();
  render();
  if (typeof renderLibraryHome === 'function') renderLibraryHome();
}

const originalNormalizeBook = normalizeBook;
normalizeBook = book => {
  book.contentType = book.contentType || 'book';
  book.contentTypes = Array.isArray(book.contentTypes) ? book.contentTypes : [];
  book.contentTypeLabels = book.contentTypeLabels && typeof book.contentTypeLabels === 'object' ? book.contentTypeLabels : {};
  book.peopleRegistry = Array.isArray(book.peopleRegistry) ? book.peopleRegistry : [];
  return originalNormalizeBook(book);
};

setTimeout(() => {
  const bookEditor = openBookModal;
  openBookModal = function(book = activeBook()) {
    bookEditor(book);
    const form = document.querySelector('#modalForm');
    if (!form) return;
    const coverLabel = form.querySelector('[name="cover"]')?.closest('.field')?.querySelector('label');
    if (coverLabel) coverLabel.textContent = language === 'zh' ? '封面' : 'Cover';
    const authorField = form.querySelector('[name="author"]')?.closest('.field');
    const genreField = form.querySelector('[name="genre"]')?.closest('.field');
    if (!authorField || !genreField) return;
    authorField.innerHTML = personSelectMarkup(book, 'writers', language === 'zh' ? '作者' : 'Writer') + '<input type="hidden" name="author">';
    attachPersonControls(authorField);
    form.querySelector('[name="writers"]').value = '';
    personValues(book, 'writers').forEach(value => { const option = [...form.querySelector('[name="writers"]').options].find(item => item.value === value); if (option) option.selected = true; });
    const typeField = document.createElement('div');
    typeField.className = 'field content-type-field';
    typeField.innerHTML = `<label>${language === 'zh' ? '內容類型' : 'Content type'}</label><select name="contentType">${contentTypeDefinitions().map(type => `<option value="${type.id}">${contentTypeIcon(type)} ${contentTypeLabel(type)}</option>`).join('')}</select>`;
    genreField.parentElement.after(typeField);
    form.querySelector('[name="contentType"]').value = book?.contentType || 'book';
    const detailsField = document.createElement('div');
    detailsField.className = 'content-details-fields';
    typeField.after(detailsField);
    const renderDetailsFields = () => {
      detailsField.innerHTML = contentDetailsForType(form.querySelector('[name="contentType"]').value, book).map(field => field.multi ? personSelectMarkup(book, field.key, field.label) : `<div class="field"><label>${field.label}</label>${field.multiline ? `<textarea name="${field.key}">${book?.[field.key] || ''}</textarea>` : `<input name="${field.key}" value="${book?.[field.key] || ''}">`}</div>`).join('');
      attachPersonControls(detailsField);
    };
    form.querySelector('[name="contentType"]').onchange = renderDetailsFields;
    renderDetailsFields();
    const submit = form.onsubmit;
    form.onsubmit = event => {
      const contentType = form.querySelector('[name="contentType"]').value;
      const detailFields = contentDetailsForType(contentType, book);
      const formData = new FormData(form);
      const details = Object.fromEntries(detailFields.map(field => [field.key, field.multi ? selectedPeople(form, field.key) : String(formData.get(field.key) || '').trim()]));
      const writers = selectedPeople(form, 'writers');
      form.querySelector('[name="author"]').value = writers.join(' · ');
      registerPeople([...writers, ...detailFields.flatMap(field => field.multi ? details[field.key] : [])]);
      if (book) Object.assign(book, {contentType, writers, author: writers.join(' · '), ...details});
      submit(event);
      if (!book && activeBook()) {
        Object.assign(activeBook(), {contentType, writers, author: writers.join(' · '), ...details});
        registerPeople([...writers, ...detailFields.flatMap(field => field.multi ? details[field.key] : [])]);
        save();
        render();
      }
    };
  };
}, 0);

function registerPeople(names) {
  const current = sharedPeople();
  const keySet = new Set(current.map(name => name.toLocaleLowerCase()));
  names.map(name => String(name || '').trim()).filter(Boolean).forEach(name => {
    if (!keySet.has(name.toLocaleLowerCase())) { current.push(name); keySet.add(name.toLocaleLowerCase()); }
  });
  const registry = current.sort((a, b) => a.localeCompare(b)).map(name => ({id: `person-${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name}));
  books.forEach(item => { item.peopleRegistry = registry.map(person => ({...person})); });
}

function escapePeopleText(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function renderPeopleIndex() {
  const target = document.querySelector('#peopleGroups');
  if (!target) return;
  const query = String(document.querySelector('#peopleIndexSearch')?.value || '').trim().toLocaleLowerCase();
  const roleLabels = {writers: language === 'zh' ? '作者' : 'Writers', director: language === 'zh' ? '導演' : 'Directors', actors: language === 'zh' ? '演員' : 'Actors', singer: language === 'zh' ? '歌手' : 'Singers'};
  const grouped = Object.fromEntries(Object.keys(roleLabels).map(role => [role, new Map()]));
  books.forEach(book => Object.keys(roleLabels).forEach(role => {
    const names = personNameValues(book[role]);
    if (role === 'writers' && !names.length) names.push(...personNameValues(book.author));
    names.forEach(name => {
      const key = name.toLocaleLowerCase();
      if (!grouped[role].has(key)) grouped[role].set(key, {name, works: []});
      if (!grouped[role].get(key).works.some(work => work.id === book.id)) grouped[role].get(key).works.push(book);
    });
  }));
  target.innerHTML = Object.keys(roleLabels).map(role => {
    const people = [...grouped[role].values()].filter(person => !query || person.name.toLocaleLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
    if (!people.length) return '';
    return `<section class="people-group"><h3>${roleLabels[role]}</h3><div class="people-cards">${people.map(person => `<article class="person-card"><strong>${escapePeopleText(person.name)}</strong><div class="person-works">${person.works.map(book => `<button class="person-work" type="button" data-shelf-book="${escapePeopleText(book.id)}">${escapePeopleText(book.title)}<span>${escapePeopleText(contentTypeLabel(contentTypeDefinitions().find(type => type.id === (book.contentType || 'book')) || {label: book.contentType || 'Book', labelEn: book.contentType || 'Book'}))}</span></button>`).join('')}</div></article>`).join('')}</div></section>`;
  }).join('') || `<p class="library-empty">${language === 'zh' ? '尚未建立人物資料。' : 'No people have been added yet.'}</p>`;
}

setTimeout(() => {
  const peopleButton = document.querySelector('#peopleIndexButton');
  const backButton = document.querySelector('#backToBookshelf');
  const shelf = document.querySelector('#bookshelfGrid');
  const index = document.querySelector('#peopleIndex');
  const search = document.querySelector('#peopleIndexSearch');
  if (!peopleButton || !backButton || !shelf || !index || !search) return;
  peopleButton.onclick = () => { syncPeopleRegistry(); renderPeopleIndex(); shelf.classList.add('hidden'); index.classList.remove('hidden'); };
  backButton.onclick = () => { index.classList.add('hidden'); shelf.classList.remove('hidden'); };
  search.oninput = renderPeopleIndex;
}, 0);

setTimeout(() => {
  const originalRender = render;
  render = function() {
    syncPeopleRegistry();
    originalRender();
    const book = activeBook();
    const target = document.querySelector('#contentDetails');
    if (!target || !book) return;
    const type = contentTypeDefinitions().find(item => item.id === (book.contentType || 'book'));
    const fields = contentDetailsForType(book.contentType, book).filter(field => book[field.key]);
    target.innerHTML = fields.length ? `<span class="content-details-type">${contentTypeIcon(type)} ${contentTypeLabel(type || {label: book.contentType, labelEn: book.contentType})}</span>${fields.map(field => `<div><strong>${field.label}</strong><span>${book[field.key]}</span></div>`).join('')}` : '';
    target.classList.toggle('hidden', !fields.length);
  };
}, 0);

setTimeout(() => {
  const filter = document.querySelector('#contentTypeFilter');
  if (!filter) return;
  const manageButton = document.createElement('button');
  manageButton.type = 'button';
  manageButton.className = 'small-button';
  manageButton.textContent = language === 'zh' ? '管理內容類型' : 'Manage types';
  manageButton.onclick = () => {
    const types = contentTypeDefinitions();
    const rows = types.map(type => `<div class="relation-setting-row"><span>${contentTypeIcon(type)} ${contentTypeLabel(type)}</span><button type="button" class="small-button" data-rename-content-type="${type.id}">${language === 'zh' ? '編輯' : 'Edit'}</button></div>`).join('');
    modal(language === 'zh' ? '管理內容類型' : 'Manage content types', `<div class="form-row"><div class="field"><label>${language === 'zh' ? '新增內容類型' : 'Add content type'}</label><input name="newContentType" placeholder="${language === 'zh' ? '例如：播客' : 'e.g. Podcast'}" required></div><div class="field"><label>${language === 'zh' ? '圖示' : 'Icon'}</label><input name="newContentIcon" value="🏷️" maxlength="4" aria-label="${language === 'zh' ? '新增內容類型圖示' : 'New content type icon'}"></div></div><div class="relation-settings-list">${rows || `<span class="detail-bio">${language === 'zh' ? '尚未建立自訂類型' : 'No custom types yet.'}</span>`}</div>`);
    document.querySelectorAll('[data-rename-content-type]').forEach(button => button.onclick = () => {
      const type = contentTypeDefinitions().find(item => item.id === button.dataset.renameContentType);
      if (!type) return;
      modal(language === 'zh' ? '編輯內容類型' : 'Edit content type', `<div class="field"><label>${language === 'zh' ? '名稱' : 'Name'}</label><input name="editedContentType" value="${contentTypeLabel(type)}" required></div><div class="field"><label>${language === 'zh' ? '圖示' : 'Icon'}</label><input name="editedContentIcon" value="${contentTypeIcon(type)}" maxlength="4" required></div>`);
      document.querySelector('#modalForm').onsubmit = event => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const label = String(formData.get('editedContentType') || '').trim();
        const icon = String(formData.get('editedContentIcon') || '').trim();
        if (!label || !icon) return;
        const updated = contentTypeDefinitions().map(item => item.id === type.id ? {...item, label, labelEn: label, icon} : item);
        saveContentTypeDefinitions(updated);
        closeModal();
        manageButton.click();
      };
    });
    document.querySelector('#modalForm').onsubmit = event => {
      event.preventDefault();
      const label = String(new FormData(event.target).get('newContentType') || '').trim();
      const icon = String(new FormData(event.target).get('newContentIcon') || '🏷️').trim();
      if (!label) return;
      const id = `custom-${Date.now()}`;
      saveContentTypeDefinitions([...types, {id, label, labelEn: label, icon}]);
      closeModal();
    };
  };
  filter.parentElement.appendChild(manageButton);
}, 0);
