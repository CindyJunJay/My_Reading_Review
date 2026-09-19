function eventChapterNumber(event) {
  const match = String(event.chapter || '').match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function eventDateValue(event) {
  const value = String(event.date || '').trim();
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value.toLocaleLowerCase() : parsed;
}

function compareEvents(first, second) {
  const chapterDifference = eventChapterNumber(first) - eventChapterNumber(second);
  if (chapterDifference) return chapterDifference;
  const firstDate = eventDateValue(first);
  const secondDate = eventDateValue(second);
  if (firstDate === null && secondDate !== null) return 1;
  if (firstDate !== null && secondDate === null) return -1;
  if (firstDate === null && secondDate === null) return 0;
  if (typeof firstDate === 'number' && typeof secondDate === 'number') return firstDate - secondDate;
  return String(firstDate).localeCompare(String(secondDate));
}

const originalNormalizeWithEventDates = normalizeBook;
normalizeBook = book => {
  const normalized = originalNormalizeWithEventDates(book);
  normalized.events = (normalized.events || []).map(event => ({...event, date: event.date || ''}));
  return normalized;
};

function addEventDateField(form, event = null) {
  if (form.dataset.eventDateReady || !form.querySelector('[name="chapter"]') || !form.querySelector('[name="title"]')) return;
  form.dataset.eventDateReady = 'true';
  event = event || window.eventDateEditing || null;
  window.eventDateEditing = null;
  const chapterField = form.querySelector('[name="chapter"]').closest('.field');
  const dateField = document.createElement('div');
  dateField.className = 'field event-date-field';
  dateField.innerHTML = `<label>${language === 'zh' ? '日期' : 'Date'}</label><input name="eventDate" placeholder="${language === 'zh' ? '例如：2026-09-19' : 'e.g. 2026-09-19'}" value="${event?.date || ''}">`;
  chapterField.parentElement.appendChild(dateField);
  const originalSubmit = form.onsubmit;
  form.onsubmit = formEvent => {
    const date = String(form.querySelector('[name="eventDate"]').value || '').trim();
    if (event) event.date = date;
    originalSubmit(formEvent);
    if (!event && activeBook()) {
      const created = activeBook().events[activeBook().events.length - 1];
      if (created) created.date = date;
      activeBook().events.sort(compareEvents);
      save();
      renderEvents(activeBook());
    }
  };
}

setTimeout(() => {
  const modalRoot = document.querySelector('#modalRoot');
  const originalEventEdit = openEventEditModal;
  openEventEditModal = function(event) {
    window.eventDateEditing = event;
    originalEventEdit(event);
  };
  if (modalRoot) new MutationObserver(() => {
    const form = modalRoot.querySelector('#modalForm');
    if (form) addEventDateField(form);
  }).observe(modalRoot, {childList: true});
  const originalRenderEvents = renderEvents;
  renderEvents = function(book) {
    book.events.sort(compareEvents);
    originalRenderEvents(book);
  };
}, 0);
