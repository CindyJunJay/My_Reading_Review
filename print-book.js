function printEscape(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function printGraph(book) {
  const characters = new Map(book.characters.map(character => [character.id, character]));
  const places = new Map((book.places || []).map(place => [place.id, place]));
  const labelWidth = value => Math.max(8, Math.min(25, [...String(value || '')].length * 2.1 + 0.6));
  const lines = book.relationships.map(relationship => {
    const from = characters.get(relationship.from);
    const to = characters.get(relationship.to);
    if (!from || !to) return '';
    const color = relationship.color || '#7e817f';
    const type = book.relationshipTypes?.find(item => item.id === relationship.type);
    const label = printEscape(relationship.label || (type ? relationTypeLabel(type) : relationship.type) || 'Relationship');
    const fromX = from.x || 50;
    const fromY = from.y || 50;
    const toX = to.x || 50;
    const toY = to.y || 50;
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
    const midpointX = (fromX + toX) / 2 + (-deltaY / length) * 2.2;
    const midpointY = (fromY + toY) / 2 + (deltaX / length) * 2.2;
    const width = labelWidth(relationship.label || type?.label || relationship.type);
    return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${color}" stroke-width="0.7" /><g class="print-edge-label-group" transform="translate(${midpointX} ${midpointY})"><rect x="${-width / 2}" y="-0.425" width="${width}" height="0.85" rx="0.15" fill="none"/><text x="0" y="0" fill="${color}" class="print-edge-label">${label}</text></g>`;
  }).join('');
  const placeLines = book.characters.flatMap(character => (character.placeIds || []).map(placeId => {
    const place = places.get(placeId);
    if (!place) return '';
    return `<line x1="${character.x || 50}" y1="${character.y || 50}" x2="${place.x || 50}" y2="${place.y || 50}" stroke="#6c8c82" stroke-width="0.45" stroke-dasharray="1.5 1.5"/>`;
  })).join('');
  const nodes = book.characters.map(character => {
    const x = character.x || 50;
    const y = character.y || 50;
    const initial = printEscape(character.name).slice(0, 1);
    const name = printEscape(character.name);
    const role = printEscape(String(character.role || '').split('·')[0]);
    const width = labelWidth(character.name);
    return `<g class="print-node" transform="translate(${x} ${y})"><circle r="3.8" fill="${character.color || '#6f8795'}" stroke="#fff" stroke-width="0.8"/><text y="1.3" class="print-node-initial">${initial}</text><rect x="${-width / 2}" y="4.1" width="${width}" height="1.2" rx="0.15" class="print-node-card"/><text y="5.05" class="print-node-name">${name}</text><text y="7.2" class="print-node-role">${role || 'Character'}</text></g>`;
  }).join('');
  const placeNodes = [...places.values()].map(place => { const width = labelWidth(place.name); return `<g class="print-place" transform="translate(${place.x || 50} ${place.y || 50})"><rect x="-3.8" y="-3.8" width="7.6" height="7.6" rx="1" fill="#6c8c82" stroke="#fff" stroke-width="0.8"/><text y="1.2" class="print-place-icon">⌂</text><rect x="${-width / 2}" y="4.1" width="${width}" height="1.2" rx="0.15" class="print-node-card"/><text y="5.05" class="print-node-name">${printEscape(place.name)}</text><text y="7.2" class="print-node-role">Place</text></g>`; }).join('');
  const relationshipKey = [...new Set(book.relationships.map(relationship => relationship.label || relationship.type).filter(Boolean))].map(label => `<span class="print-relationship-key">${printEscape(label)}</span>`).join('');
  return `<div class="print-graph"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${placeLines}${lines}${nodes}${placeNodes}</svg></div><div class="print-relationship-key-list">${relationshipKey}</div>`;
}

function printEventDate(event) {
  return event.date || event.location || '';
}

function printChapterNumber(event) {
  const match = String(event.chapter || '').match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function printEvents(book) {
  const events = [...book.events].sort((first, second) => {
    const chapterDifference = printChapterNumber(first) - printChapterNumber(second);
    if (chapterDifference) return chapterDifference;
    const firstDate = Date.parse(first.date || '');
    const secondDate = Date.parse(second.date || '');
    if (!Number.isNaN(firstDate) && !Number.isNaN(secondDate)) return firstDate - secondDate;
    if (!Number.isNaN(firstDate)) return -1;
    if (!Number.isNaN(secondDate)) return 1;
    return 0;
  });
  if (!events.length) return '<p class="empty-print">No incidents recorded.</p>';
  const pages = [];
  for (let pageStart = 0; pageStart < events.length; pageStart += 3) {
    const pageEvents = events.slice(pageStart, pageStart + 3);
    pages.push(`<section class="print-page incidents-page"><div class="eyebrow">STORY ATLAS · INCIDENTS</div><h1 class="timeline-title">${printEscape(book.title)}</h1><p class="timeline-subtitle">Key incidents ordered by chapter and date</p><div class="timeline">${pageEvents.map((event, pageIndex) => { const index = pageStart + pageIndex; return `<article class="timeline-event ${index % 2 ? 'right' : 'left'}"><div class="timeline-dot">${index + 1}</div><div class="timeline-copy"><strong class="timeline-label">${printEscape(event.chapter || 'Event')}</strong>${printEventDate(event) ? `<b class="timeline-date">${printEscape(printEventDate(event))}</b>` : ''}<h2>${printEscape(event.title)}</h2><p>${printEscape(event.description)}</p>${event.people ? `<small>${printEscape(event.people)}</small>` : ''}</div></article>`; }).join('')}</div></section>`);
  }
  return pages.join('');
}

function printBook(book) {
  const type = contentTypeDefinitions().find(item => item.id === (book.contentType || 'book'));
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${printEscape(book.title)} - Story Atlas</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#24282d;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-page{width:210mm;min-height:297mm;padding:18mm 17mm;page-break-after:always;break-after:page;position:relative}.print-page:last-child{page-break-after:auto;break-after:auto}.overview-page{height:297mm;overflow:hidden}.incidents-page{height:297mm;overflow:hidden;padding-top:18mm;padding-bottom:0}.eyebrow{font-size:10px;letter-spacing:2px;color:#7e817f;font-weight:700}.book-title{font-family:Georgia,serif;font-size:32px;margin:8px 0 10px}.book-meta{font-size:12px;color:#7e817f;border-bottom:1px solid #ddd;padding-bottom:14px}.book-notes{margin:18px 0;padding:13px 15px;background:#f5f3ed;border-left:4px solid #e36b5d;font-size:12px;line-height:1.7}.graph-heading{font-family:Georgia,serif;font-size:18px;margin:18px 0 8px}.print-graph{height:150mm;border:1px solid #ddd;overflow:hidden;background:#fbfaf7}.print-graph svg{display:block;width:100%;height:100%;overflow:visible}.print-edge-label{font-size:1.25px;font-weight:700;text-anchor:middle;dominant-baseline:middle}.print-node-initial,.print-place-icon{font-size:2.8px;font-weight:700;fill:#fff;text-anchor:middle}.print-node-card{fill:transparent;stroke:transparent;stroke-width:.25}.print-node-name{font-size:2.1px;font-weight:700;fill:#24282d;text-anchor:middle}.print-node-role{font-size:1.8px;fill:#7e817f;text-anchor:middle}.print-relationship-key-list{display:flex;flex-wrap:wrap;gap:0.75px 1.75px;margin-top:1.25px;font-size:5px;color:#24282d}.print-relationship-key{display:inline-block;padding:.25px .75px;border:1px solid transparent;background:transparent}.timeline-title{font-family:Georgia,serif;font-size:30px;margin:8px 0 4px}.timeline-subtitle{color:#7e817f;font-size:12px;margin:0 0 10px}.timeline{position:relative;margin:0 auto;padding:7px 0;height:190mm}.timeline:before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:2px dashed #c9c6bd}.timeline-event{position:relative;height:58mm;width:50%;padding:0 18px 18px;break-inside:avoid;page-break-inside:avoid}.timeline-event.left{padding-right:28px;text-align:right}.timeline-event.right{margin-left:50%;padding-left:28px}.timeline-dot{position:absolute;top:0;width:30px;height:30px;border:2px solid #c79538;border-radius:50%;background:#fff;display:grid;place-items:center;color:#c79538;font-weight:700;z-index:1}.timeline-event.left .timeline-dot{right:-15px}.timeline-event.right .timeline-dot{left:-15px}.timeline-copy{font-size:11px;line-height:1.5}.timeline-label{display:inline-block;background:#f3e7d7;border-radius:10px;padding:3px 8px;font-size:10px;color:#9a6b2d}.timeline-date{display:block;color:#c79538;font-size:12px;margin-top:4px}.timeline-copy h2{font-family:Georgia,serif;font-size:16px;margin:5px 0}.timeline-copy p{margin:0;color:#5f6462}.timeline-copy small{display:block;color:#7e817f;margin-top:6px}.empty-print{color:#7e817f}
    @media print{.print-page{break-after:page}.overview-page{break-after:page}.incidents-page{break-after:page}.print-page:last-child{break-after:auto}.timeline-event{break-inside:avoid-page;page-break-inside:avoid}}
  </style></head><body><section class="print-page overview-page"><div class="eyebrow">STORY ATLAS</div><h1 class="book-title">${printEscape(book.title)}</h1><div class="book-meta">${printEscape(book.author || 'Unknown author')} · ${printEscape(type ? contentTypeLabel(type) : book.genre || 'Uncategorised')}${book.genre ? ` · ${printEscape(book.genre)}` : ''}${book.date ? ` · ${printEscape(book.date)}` : ''}</div>${book.notes ? `<div class="book-notes">${printEscape(book.notes)}</div>` : ''}<h2 class="graph-heading">Relationship map</h2>${printGraph(book)}</section>${printEvents(book)}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => printWindow.print();
}

setTimeout(() => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'outline-button';
  button.id = 'printBookButton';
  button.textContent = '⤓ 列印本書';
  button.title = 'Print book summary and incidents';
  button.onclick = () => printBook(activeBook());
  const hero = document.querySelector('.book-hero');
  if (!hero) return;
  const editButton = document.querySelector('#editBookButton');
  const actions = document.createElement('div');
  actions.className = 'book-actions';
  actions.append(editButton, button);
  hero.appendChild(actions);
}, 0);
