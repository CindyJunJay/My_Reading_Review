const characterBaseColors = {male: '#6f8795', female: '#b36a5e', other: '#758a68'};
const originalNormalizeWithCharacterColors = normalizeBook;
normalizeBook = book => {
  const normalized = originalNormalizeWithCharacterColors(book);
  normalized.characterColorDefaults = {...characterBaseColors, ...(normalized.characterColorDefaults || {})};
  return normalized;
};

function characterDefaultColor(book, gender) {
  return book?.characterColorDefaults?.[gender] || characterBaseColors[gender] || characterBaseColors.other;
}

setTimeout(() => {
  const originalCharacterEditor = openCharacterModal;
  openCharacterModal = function(character = null) {
    originalCharacterEditor(character);
    const form = document.querySelector('#modalForm');
    if (!form) return;
    const colorInput = form.querySelector('[name="color"]');
    if (!colorInput) return;
    const colorField = colorInput.closest('.field');
    const genderField = document.createElement('div');
    genderField.className = 'field character-gender-field';
    genderField.innerHTML = `<label>${language === 'zh' ? '性別' : 'Gender'}</label><select name="gender"><option value="other">${language === 'zh' ? '其他／未設定' : 'Other / unspecified'}</option><option value="male">${language === 'zh' ? '男性' : 'Male'}</option><option value="female">${language === 'zh' ? '女性' : 'Female'}</option></select>`;
    colorField.after(genderField);
    const genderSelect = genderField.querySelector('[name="gender"]');
    if (!genderSelect) return;
    genderSelect.value = character?.gender || 'other';
    if (!character) colorInput.value = characterDefaultColor(activeBook(), genderSelect.value);
    genderSelect.onchange = () => { colorInput.value = characterDefaultColor(activeBook(), genderSelect.value); };
    const submit = form.onsubmit;
    form.onsubmit = event => {
      const gender = genderSelect.value;
      if (character) character.gender = gender;
      submit(event);
      if (!character && activeBook()) {
        const characters = activeBook().characters;
        const created = characters[characters.length - 1];
        if (created) created.gender = gender;
        save();
      }
    };
  };

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'small-button';
  settingsButton.id = 'characterColorSettingsButton';
  settingsButton.textContent = language === 'zh' ? '人物顏色' : 'Character colors';
  settingsButton.onclick = () => {
    const book = activeBook();
    const defaults = book.characterColorDefaults || characterBaseColors;
    modal(language === 'zh' ? '人物預設顏色' : 'Character default colors', `<div class="relation-setting-row"><span>${language === 'zh' ? '男性' : 'Male'}</span><input name="maleColor" type="color" value="${defaults.male}"></div><div class="relation-setting-row"><span>${language === 'zh' ? '女性' : 'Female'}</span><input name="femaleColor" type="color" value="${defaults.female}"></div><div class="relation-setting-row"><span>${language === 'zh' ? '其他／未設定' : 'Other / unspecified'}</span><input name="otherColor" type="color" value="${defaults.other}"></div>`);
    document.querySelector('#modalForm').onsubmit = event => {
      event.preventDefault();
      const values = new FormData(event.target);
      book.characterColorDefaults = {male: values.get('maleColor'), female: values.get('femaleColor'), other: values.get('otherColor')};
      save();
      closeModal();
      render();
    };
  };
  document.querySelector('.map-tools')?.appendChild(settingsButton);
  const addButton = document.querySelector('#addCharacterButton');
  if (addButton) addButton.onclick = () => openCharacterModal();
}, 0);
