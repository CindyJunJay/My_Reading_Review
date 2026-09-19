const relationshipBaseColors = {friendship: '#4374a8', family: '#e36b5d', conflict: '#c79538', mentor: '#4e886f'};
const originalRelationshipDefaultColor = relationshipDefaultColor;
relationshipDefaultColor = (type, book = activeBook()) => book?.relationshipTypes?.find(item => item.id === type)?.color || relationshipBaseColors[type] || originalRelationshipDefaultColor(type);

const originalNormalizeWithRelationshipColors = normalizeBook;
normalizeBook = book => {
  const normalized = originalNormalizeWithRelationshipColors(book);
  normalized.relationshipTypes = normalized.relationshipTypes.map(type => ({...type, color: type.color || relationshipBaseColors[type.id] || '#7e817f'}));
  return normalized;
};

function relationshipTypeColor(book, typeId) {
  return book?.relationshipTypes?.find(type => type.id === typeId)?.color || relationshipDefaultColor(typeId, book);
}

function bindRelationshipColorPicker(form, book) {
  const typeSelect = form.querySelector('[name="type"]');
  const colorInput = form.querySelector('[name="color"]');
  if (!typeSelect || !colorInput) return;
  typeSelect.onchange = () => { colorInput.value = relationshipTypeColor(book, typeSelect.value); };
  colorInput.value = relationshipTypeColor(book, typeSelect.value);
}

setTimeout(() => {
  const book = activeBook();
  const originalSettings = openRelationshipSettings;
  openRelationshipSettings = function() {
    const currentBook = activeBook();
    const rows = currentBook.relationshipTypes.map(type => `<div class="relation-setting-row"><span>${relationTypeLabel(type)}</span><input type="color" value="${type.color || relationshipTypeColor(currentBook, type.id)}" data-relationship-default-color="${type.id}"><button type="button" class="danger-button" data-remove-type="${type.id}">${language === 'zh' ? '刪除' : 'Delete'}</button></div>`).join('');
    modal(language === 'zh' ? '關係設定' : 'Relationship settings', `<div class="field"><label>${language === 'zh' ? '新增關係名稱' : 'New relationship name'}</label><input name="newType" placeholder="${language === 'zh' ? '例如：同事' : 'e.g. Colleague'}"></div><div class="field"><label>${language === 'zh' ? '預設顏色' : 'Default color'}</label><input name="newColor" type="color" value="#7e817f"></div><div class="relation-settings-list">${rows || `<span class="detail-bio">${language === 'zh' ? '尚未建立關係類型' : 'No relationship types yet.'}</span>`}</div>`);
    document.querySelectorAll('[data-relationship-default-color]').forEach(input => input.onchange = () => {
      const type = currentBook.relationshipTypes.find(item => item.id === input.dataset.relationshipDefaultColor);
      if (!type) return;
      type.color = input.value;
      save();
    });
    document.querySelectorAll('[data-remove-type]').forEach(button => button.onclick = () => {
      const id = button.dataset.removeType;
      if (currentBook.relationshipTypes.length <= 1) return;
      if (currentBook.relationships.some(item => item.type === id)) {
        alert(language === 'zh' ? '這個類型仍被使用中，請先刪除相關關係。' : 'This type is still in use. Delete its relationships first.');
        return;
      }
      currentBook.relationshipTypes = currentBook.relationshipTypes.filter(type => type.id !== id);
      save();
      openRelationshipSettings();
    });
    document.querySelector('#modalForm').onsubmit = event => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const label = String(formData.get('newType') || '').trim();
      if (label) currentBook.relationshipTypes.push({id: `custom-${Date.now()}`, label, labelEn: label, color: formData.get('newColor') || '#7e817f'});
      save();
      closeModal();
      render();
    };
  };

  const originalRelationshipEditor = openRelationshipModal;
  openRelationshipModal = function() {
    originalRelationshipEditor();
    bindRelationshipColorPicker(document.querySelector('#modalForm'), activeBook());
  };
  const originalRelationshipEdit = openRelationshipEditModal;
  openRelationshipEditModal = function(relationship) {
    originalRelationshipEdit(relationship);
    bindRelationshipColorPicker(document.querySelector('#modalForm'), activeBook());
  };
  const settingsButton = document.querySelector('#relationSettingsButton');
  if (settingsButton) settingsButton.onclick = () => openRelationshipSettings();
  const addButton = document.querySelector('#addRelationshipButton');
  if (addButton) addButton.onclick = () => openRelationshipModal();
  const modalRoot = document.querySelector('#modalRoot');
  if (modalRoot) new MutationObserver(() => {
    const form = modalRoot.querySelector('#modalForm');
    if (form?.querySelector('[name="type"]')) bindRelationshipColorPicker(form, activeBook());
  }).observe(modalRoot, {childList: true});
}, 0);
