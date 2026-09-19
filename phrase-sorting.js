function phraseChapterNumber(phrase) {
  const match = String(phrase.location || phrase.chapter || '').match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function comparePhrases(first, second) {
  const starredDifference = Number(Boolean(second.starred)) - Number(Boolean(first.starred));
  if (starredDifference) return starredDifference;
  return phraseChapterNumber(first) - phraseChapterNumber(second);
}

const originalNormalizeWithPhraseFlags = normalizeBook;
normalizeBook = book => {
  const normalized = originalNormalizeWithPhraseFlags(book);
  normalized.phrases = (normalized.phrases || []).map(phrase => ({...phrase, starred: Boolean(phrase.starred)}));
  return normalized;
};

function addPhraseStarField(form, phrase = null) {
  if (form.dataset.phraseStarReady || !form.querySelector('[name="text"]')) return;
  form.dataset.phraseStarReady = 'true';
  const field = document.createElement('div');
  field.className = 'field phrase-star-field';
  field.innerHTML = `<label><input type="checkbox" name="starred" ${phrase?.starred ? 'checked' : ''}> ${language === 'zh' ? '星標／置頂' : 'Star and pin'}</label>`;
  form.querySelector('[name="location"]')?.closest('.field')?.after(field);
  const originalSubmit = form.onsubmit;
  form.onsubmit = event => {
    const starred = form.querySelector('[name="starred"]').checked;
    if (phrase) phrase.starred = starred;
    originalSubmit(event);
    if (!phrase && activeBook()) {
      const created = activeBook().phrases[activeBook().phrases.length - 1];
      if (created) created.starred = starred;
      activeBook().phrases.sort(comparePhrases);
      save();
      renderPhrases(activeBook());
    }
  };
}

setTimeout(() => {
  const originalPhraseEditor = openPhraseModal;
  openPhraseModal = function(phrase = null) {
    window.editingPhrase = phrase;
    originalPhraseEditor(phrase);
    addPhraseStarField(document.querySelector('#modalForm'), phrase);
  };
  const originalRenderPhrases = renderPhrases;
  renderPhrases = function(book) {
    book.phrases.sort(comparePhrases);
    originalRenderPhrases(book);
    document.querySelectorAll('.phrase-card').forEach((card, index) => {
      if (!book.phrases[index]?.starred) return;
      const marker = document.createElement('span');
      marker.className = 'phrase-star';
      marker.textContent = '★';
      marker.title = language === 'zh' ? '星標句子' : 'Starred phrase';
      card.prepend(marker);
    });
  };
  const modalRoot = document.querySelector('#modalRoot');
  if (modalRoot) new MutationObserver(() => {
    const form = modalRoot.querySelector('#modalForm');
    if (form) addPhraseStarField(form, window.editingPhrase || null);
  }).observe(modalRoot, {childList: true});
}, 0);
