let _eoDragEls = [];
let _eoDragType = null;
let _eoDragRootId = null;

function eoIsPermEl(el){
  return !!el && el.classList && el.classList.contains('perm-osc');
}
function eoIsChildEl(el){
  return !!el && (el.classList.contains('eo-vane-child') || el.id.indexOf('statorItem') === 0 || el.id.indexOf('permStatorItem') === 0);
}
function eoRootIdOf(el){
  if(!el) return null;
  if(el.id.indexOf('statorItem') === 0) return el.id.slice('statorItem'.length);
  if(el.id.indexOf('permStatorItem') === 0) return el.id.slice('permStatorItem'.length).toLowerCase();
  if(el.dataset && el.dataset.parentRotor) return el.dataset.parentRotor;
  if(el.id.indexOf('eoItem') === 0) return el.id.slice('eoItem'.length);
  if(el.id.indexOf('permOsc') === 0) return el.id.slice('permOsc'.length).toLowerCase();
  return null;
}
function eoRootElFor(rootKey){
  if(rootKey === 'hp') return document.getElementById('permOscHp');
  if(rootKey === 'lp') return document.getElementById('permOscLp');
  if(rootKey === 'ut') return document.getElementById('permOscUt');
  if(rootKey === 'ot') return document.getElementById('permOscOt');
  return document.getElementById('eoItem'+rootKey);
}
function eoStatorElFor(rootKey){
  if(rootKey === 'hp') return document.getElementById('permStatorItemHp');
  if(rootKey === 'lp') return document.getElementById('permStatorItemLp');
  return document.getElementById('statorItem'+rootKey);
}
function eoGetBlockEls(rootEl){
  const out = [rootEl];
  const rootId = eoRootIdOf(rootEl);
  let sib = rootEl.nextElementSibling;
  while(sib && eoIsChildEl(sib) && eoRootIdOf(sib) === rootId){
    out.push(sib);
    sib = sib.nextElementSibling;
  }
  return out;
}
function eoIsDraggableItem(el){
  return !!el && el.classList && el.classList.contains('extra-osc-item');
}
function eoClearDropIndicators(){
  document.querySelectorAll('.eo-drop-before,.eo-drop-after').forEach(function(el){
    el.classList.remove('eo-drop-before','eo-drop-after');
  });
}
function wireEoDragHandle(handleEl, itemEl){
  if(!handleEl || !itemEl) return;
  handleEl.addEventListener('dragstart', function(e){
    e.stopPropagation();
    const isChild = eoIsChildEl(itemEl);
    _eoDragType = isChild ? 'child' : 'root';
    _eoDragRootId = eoRootIdOf(itemEl);
    _eoDragEls = isChild ? [itemEl] : eoGetBlockEls(itemEl);
    _eoDragEls.forEach(function(el){ el.classList.add('eo-dragging'); });
    try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', itemEl.id); }catch(err){}
  });
  handleEl.addEventListener('dragend', function(){
    _eoDragEls.forEach(function(el){ el.classList.remove('eo-dragging'); });
    eoClearDropIndicators();
    _eoDragEls = []; _eoDragType = null; _eoDragRootId = null;
  });
}
function eoComputeDropTarget(e){
  const hovered = e.target.closest ? e.target.closest('.extra-osc-item') : null;
  if(!hovered || !eoIsDraggableItem(hovered)) return null;
  if(_eoDragEls.indexOf(hovered) !== -1) return null;
  if(_eoDragType === 'root'){
    let rootEl = hovered;
    if(eoIsChildEl(hovered)){
      const rid = eoRootIdOf(hovered);
      rootEl = eoRootElFor(rid);
      if(!rootEl) return null;
    }
    if(_eoDragEls.indexOf(rootEl) !== -1) return null;
    const blockEls = eoGetBlockEls(rootEl);
    const lastEl = blockEls[blockEls.length-1];
    const rect = rootEl.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height/2;
    return { anchorEl: before ? rootEl : lastEl, placeBefore: before, indicatorEl: rootEl };
  } else {
    if(hovered.id.indexOf('statorItem') === 0 || hovered.id.indexOf('permStatorItem') === 0){
      if(eoRootIdOf(hovered) !== _eoDragRootId) return null;
      return { anchorEl: hovered, placeBefore: false, indicatorEl: hovered };
    }
    if(eoIsChildEl(hovered)){
      if(eoRootIdOf(hovered) !== _eoDragRootId) return null;
      const rect = hovered.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height/2;
      return { anchorEl: hovered, placeBefore: before, indicatorEl: hovered };
    } else {
      const hid = eoRootIdOf(hovered);
      if(hid === null || hid !== _eoDragRootId) return null;
      const statorEl = eoStatorElFor(hid);
      const anchor = statorEl || hovered;
      return { anchorEl: anchor, placeBefore: false, indicatorEl: anchor };
    }
  }
}
function eoInsertBlock(blockEls, anchorEl, placeBefore){
  const container = get('extraOscList');
  blockEls.forEach(function(el){ if(el.parentNode) el.parentNode.removeChild(el); });
  const refNode = placeBefore ? anchorEl : anchorEl.nextSibling;
  blockEls.forEach(function(el){ container.insertBefore(el, refNode); });
}
function syncExtraOscsOrderFromDOM(){
  const container = get('extraOscList');
  if(!container) return;
  const orderedIds = [];
  Array.prototype.forEach.call(container.children, function(el){
    if(!el.classList || !el.classList.contains('extra-osc-item')) return;
    if(eoIsPermEl(el)) return;
    if(el.id.indexOf('statorItem') === 0) return;
    if(el.id.indexOf('eoItem') === 0){
      orderedIds.push(parseInt(el.id.slice('eoItem'.length), 10));
    }
  });
  const byId = {};
  extraOscs.forEach(function(eo){ byId[eo.id] = eo; });
  const newArr = orderedIds.map(function(id){ return byId[id]; }).filter(Boolean);
  extraOscs.forEach(function(eo){ if(newArr.indexOf(eo) === -1) newArr.push(eo); });
  extraOscs.length = 0;
  newArr.forEach(function(eo){ extraOscs.push(eo); });
}
function gatherOscillatorRootOrder(){
  const container = get('extraOscList');
  if(!container) return [];
  const order = [];
  Array.prototype.forEach.call(container.children, function(el){
    if(!el.classList || !el.classList.contains('extra-osc-item')) return;
    if(eoIsChildEl(el)) return;
    const key = eoRootIdOf(el);
    if(key !== null) order.push(key);
  });
  return order;
}
function applyOscillatorRootOrder(order){
  if(!Array.isArray(order) || !order.length) return;
  const container = get('extraOscList');
  if(!container) return;
  order.forEach(function(key){
    const rootEl = eoRootElFor(key);
    if(!rootEl || !container.contains(rootEl)) return;
    eoGetBlockEls(rootEl).forEach(function(el){ container.appendChild(el); });
  });
}

function mixerRowForOscEl(el){
  if(!el) return null;
  const id = el.id;
  if(id === 'permOscHp'){ const s = document.getElementById('sHP'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permOscLp'){ const s = document.getElementById('sLP'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permOscHv'){ const s = document.getElementById('sHVane'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permOscLv'){ const s = document.getElementById('sLVane'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permOscUt'){ const s = document.getElementById('sUT'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permOscOt'){ const s = document.getElementById('sOT'); return s ? s.closest('.slider-row') : null; }
  if(id === 'permStatorItemHp') return document.getElementById('permStatorMixRowHp');
  if(id === 'permStatorItemLp') return document.getElementById('permStatorMixRowLp');
  if(id.indexOf('statorItem') === 0) return document.getElementById('mixerRowStator'+id.slice('statorItem'.length));
  if(id.indexOf('eoItem') === 0) return document.getElementById('mixerRowEO'+id.slice('eoItem'.length));
  return null;
}
function pruneOrphanedMixerRows(){
  const liveIds = new Set(extraOscs.map(function(eo){ return eo.id; }));
  const seen = new Set();
  document.querySelectorAll('[id^="mixerRowEO"], [id^="mixerRowStator"]').forEach(function(row){
    let id = null, prefix = null;
    if(row.id.indexOf('mixerRowStator') === 0){ id = parseInt(row.id.slice('mixerRowStator'.length),10); prefix='st'; }
    else if(row.id.indexOf('mixerRowEO') === 0){ id = parseInt(row.id.slice('mixerRowEO'.length),10); prefix='eo'; }
    if(id === null || isNaN(id)) return;
    const key = prefix+id;
    if(!liveIds.has(id) || seen.has(key)){ row.remove(); return; }
    seen.add(key);
  });
}
function syncMixerOrderWithOscillatorSection(){
  const anchor = get('extraOscMixerRows');
  if(!anchor || !anchor.parentElement) return;
  pruneOrphanedMixerRows();
  const parent = anchor.parentElement;
  const rootOrder = gatherOscillatorRootOrder();
  rootOrder.forEach(function(rootKey){
    const rootEl = eoRootElFor(rootKey);
    if(!rootEl) return;
    eoGetBlockEls(rootEl).forEach(function(oscEl){
      const row = mixerRowForOscEl(oscEl);
      if(row) parent.insertBefore(row, anchor);
    });
  });
}
(function initEoDragContainer(){
  const container = get('extraOscList');
  if(!container || container._eoDragWired) return;
  container._eoDragWired = true;
  container.addEventListener('dragover', function(e){
    if(!_eoDragEls.length) return;
    e.preventDefault();
    try{ e.dataTransfer.dropEffect = 'move'; }catch(err){}
    const drop = eoComputeDropTarget(e);
    eoClearDropIndicators();
    if(drop && drop.indicatorEl){
      drop.indicatorEl.classList.add(drop.placeBefore ? 'eo-drop-before' : 'eo-drop-after');
    }
  });
  container.addEventListener('drop', function(e){
    if(!_eoDragEls.length) return;
    e.preventDefault();
    const drop = eoComputeDropTarget(e);
    eoClearDropIndicators();
    if(drop){
      eoInsertBlock(_eoDragEls.slice(), drop.anchorEl, drop.placeBefore);
      syncExtraOscsOrderFromDOM();
      syncMixerOrderWithOscillatorSection();
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    }
    _eoDragEls.forEach(function(el){ el.classList.remove('eo-dragging'); });
    _eoDragEls = []; _eoDragType = null; _eoDragRootId = null;
  });
})();

function addStatorItem(eo){
  const id = eo.id;
  const isSingle = get('dChopper').value === 'single';
  const container = get('extraOscList');
  const rotorItem = document.getElementById('eoItem'+id);
  const statorItem = document.createElement('div');
  statorItem.className = 'extra-osc-item stator-osc-item' + (isSingle ? ' single-tone-disabled' : '');
  statorItem.id = 'statorItem'+id;
  statorItem.style.cssText = 'margin-left:12px;border-left:2px solid rgba(229,166,31,.25);border-color:'+eo.statorColor+'40';

  statorItem.innerHTML = `
    <div class="extra-osc-header" style="margin-bottom:5px">
      <input type="color" id="statorColor${id}" value="${eo.statorColor}" title="Change stator color" style="width:22px;height:22px;border:none;border-radius:2px;cursor:pointer;padding:0;background:none;flex-shrink:0">
      <input type="text" id="statorName${id}" value="${eo.statorName||''}" placeholder="Stator" maxlength="24" style="flex:1;background:var(--inset);border:1px solid var(--border);border-radius:2px;color:${eo.statorColor};opacity:.85;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;padding:2px 6px;text-transform:uppercase;min-width:0">
      <button id="statorEye${id}" title="Show/hide in diagram" style="background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--accent);width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;transition:border-color .12s,color .12s">${eyeOpenSVG}</button>
      <button class="vbtn" id="statorLink${id}" title="Link/unlink stator to rotor port" style="background:transparent;font-size:10px;padding:2px 7px;letter-spacing:1px;border-color:${eo.statorColor};color:${eo.statorColor};flex-shrink:0">UNLINK</button>
    </div>
    <div id="statorBody${id}">
    <div style="display:flex;gap:6px;align-items:center">
      <label style="font-size:11px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">Port</label>
      <input type="number" id="statorPort${id}" value="${eo.statorVal||eo.value}" min="1" max="49" style="flex:1;color:${eo.statorColor};background:var(--inset);border:1px solid var(--border);border-radius:2px;font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 5px;min-width:0" disabled>
    </div>
    </div>
    <div id="statorCollapseBar${id}" class="eo-collapse-bar" title="Collapse">
      <svg viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  `;

  if(rotorItem && rotorItem.nextSibling){
    container.insertBefore(statorItem, rotorItem.nextSibling);
  } else {
    container.appendChild(statorItem);
  }

  if(typeof window.normalizeLabelSizes === 'function') window.normalizeLabelSizes();

  const statorCollapseBtn = document.getElementById('statorCollapseBar'+id);
  if(statorCollapseBtn){
    const statorBodyEl = document.getElementById('statorBody'+id);
    statorCollapseBtn.addEventListener('click', function(){
      const collapsed = statorBodyEl.style.display === 'none';
      statorBodyEl.style.display = collapsed ? '' : 'none';
      this.classList.toggle('collapsed', !collapsed);
      this.title = collapsed ? 'Collapse' : 'Expand';
    });
  }

  document.getElementById('statorColor'+id).addEventListener('input', function(){
    eo.statorColor = this.value;
    const stItem = document.getElementById('statorItem'+id);
    if(stItem) stItem.style.borderColor = eo.statorColor + '40';
    const stLabel = document.getElementById('statorName'+id);
    if(stLabel) stLabel.style.color = eo.statorColor;
    const portInput = document.getElementById('statorPort'+id);
    if(portInput) portInput.style.color = eo.statorColor;
    const linkBtn = document.getElementById('statorLink'+id);
    if(linkBtn && eo.statorLinked){ linkBtn.style.borderColor = eo.statorColor; linkBtn.style.color = eo.statorColor; }
    const mixRow = document.getElementById('mixerRowStator'+id);
    if(mixRow){
      const sl = mixRow.querySelector('input[type=range]');
      if(sl) sl.style.accentColor = eo.statorColor;
      const sv = mixRow.querySelector('.slider-val');
      if(sv) sv.style.color = eo.statorColor;
      const lbl = mixRow.querySelector('.slider-label');
      if(lbl) lbl.style.color = eo.statorColor;
    }
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('statorPort'+id).addEventListener('input', function(){
    eo.statorVal = parseFloat(this.value)||1;
    liveUpdateFreqs(); updateFreqDisplay();
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('statorName'+id).addEventListener('input', function(){
    eo.statorName = this.value;
    const mixRow = document.getElementById('mixerRowStator'+id);
    if(mixRow){
      const lbl = mixRow.querySelector('.slider-label');
      if(lbl) lbl.textContent = getStatorDisplayName(eo);
    }
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('statorLink'+id).addEventListener('click', function(){
    eo.statorLinked = !eo.statorLinked;
    _applyStatorLinkState(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  const statorEyeBtn = document.getElementById('statorEye'+id);
  if(statorEyeBtn){
    statorEyeBtn.innerHTML = (eo.statorVisible !== false) ? eyeOpenSVG : eyeClosedSVG;
    statorEyeBtn.style.color       = (eo.statorVisible !== false) ? 'var(--accent)' : 'var(--muted)';
    statorEyeBtn.style.borderColor = (eo.statorVisible !== false) ? 'var(--border)' : 'transparent';
    statorEyeBtn.style.opacity     = (eo.statorVisible !== false) ? '1' : '0.4';
    statorEyeBtn.addEventListener('click', function(){
      eo.statorVisible = eo.statorVisible === false ? true : false;
      this.innerHTML = eo.statorVisible ? eyeOpenSVG : eyeClosedSVG;
      this.style.color       = eo.statorVisible ? 'var(--accent)' : 'var(--muted)';
      this.style.borderColor = eo.statorVisible ? 'var(--border)' : 'transparent';
      this.style.opacity     = eo.statorVisible ? '1' : '0.4';
      redrawChoppers(chopperAngleA, chopperAngleB);
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }
}

function _applyStatorLinkState(eo){
  const id = eo.id;
  const linkBtn = document.getElementById('statorLink'+id);
  const portInput = document.getElementById('statorPort'+id);
  const statorItem = document.getElementById('statorItem'+id);

  if(eo.statorLinked){
    if(linkBtn){ linkBtn.textContent = 'UNLINK'; linkBtn.style.background = eo.statorColor + '33'; linkBtn.style.borderColor = eo.statorColor; linkBtn.style.color = eo.statorColor; }
    if(portInput){ portInput.disabled = true; portInput.style.opacity = '0.4'; portInput.value = eo.value; portInput.style.color = eo.statorColor; }
    const existingMixRow = document.getElementById('mixerRowStator'+id);
    if(existingMixRow) existingMixRow.remove();
    tearStatorAudio(eo);
    const rotorSlider = document.getElementById('sEO'+id);
    if(rotorSlider){ rotorSlider.max = 100; }
  } else {
    if(linkBtn){ linkBtn.textContent = 'LINK'; linkBtn.style.background = 'transparent'; linkBtn.style.borderColor = 'var(--muted)'; linkBtn.style.color = 'var(--muted)'; }
    if(portInput){ portInput.disabled = false; portInput.style.opacity = '1'; if(eo.statorVal) portInput.value = eo.statorVal; portInput.style.color = eo.statorColor; }
    const rotorSlider2 = document.getElementById('sEO'+id);
    if(rotorSlider2){ rotorSlider2.max = 100; }
    if(!document.getElementById('mixerRowStator'+id)){
      addStatorMixerSlider(eo);
    }
    if(audioCtx) buildStatorAudio(eo);
  }
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
  pushGains(0.04);
}

function addStatorMixerSlider(eo){
  const id = eo.id;
  const col = eo.statorColor || '#e5a61f';
  const initVal = eo.statorMixerVal||40;
  const row = document.createElement('div');
  row.className = 'slider-row';
  row.id = 'mixerRowStator'+id;
  row.innerHTML = `<span class="slider-label" style="color:${col}">${getStatorDisplayName(eo)}</span><input type="range" id="sStator${id}" min="0" max="100" step="1" value="${initVal}" style="accent-color:${col}"><span class="slider-val" id="svStator${id}" style="color:${col}">${initVal}%</span>`;
  const rotorMixRow = document.getElementById('mixerRowEO'+id);
  const mixerContainer = get('extraOscMixerRows');
  if(rotorMixRow && rotorMixRow.nextSibling && rotorMixRow.nextSibling.parentElement === mixerContainer){
    mixerContainer.insertBefore(row, rotorMixRow.nextSibling);
  } else if(rotorMixRow){
    rotorMixRow.parentElement.insertBefore(row, rotorMixRow.nextSibling || null);
  } else {
    mixerContainer.appendChild(row);
  }
  document.getElementById('sStator'+id).addEventListener('input', function(){
    eo.statorMixerVal = parseFloat(this.value);
    document.getElementById('svStator'+id).textContent = this.value+'%';
    pushGains(0.04);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
}


function removeExtraOsc(id){
  const idx = extraOscs.findIndex(e=>e.id===id);
  if(idx<0) return;
  const eo = extraOscs[idx];
  if(eo.type === 'rotor'){
    extraOscs.filter(v => v.type==='vane' && v.linkedChopper==='eo'+id).forEach(v => removeExtraOsc(v.id));
  }
  const idx2 = extraOscs.indexOf(eo);
  if(idx2 < 0) return;
  if(eo.oscNode){ try{eo.oscNode.stop();}catch(e){} try{eo.oscNode.disconnect();}catch(e){} }
  if(eo.gainNode){ try{eo.gainNode.disconnect();}catch(e){} }
  tearEoAttenChain(eo);
  tearStatorAudio(eo);
  extraOscs.splice(idx2,1);
  const item = document.getElementById('eoItem'+id);
  if(item) item.remove();
  const statorItem = document.getElementById('statorItem'+id);
  if(statorItem) statorItem.remove();
  const statorMixRow = document.getElementById('mixerRowStator'+id);
  if(statorMixRow) statorMixRow.remove();
  const fc = document.getElementById('fcEO'+id);
  if(fc) fc.remove();
  const ms = document.getElementById('mixerRowEO'+id);
  if(ms) ms.remove();
  relabelExtraOscs();
  updateFreqPageButton();
  chopperDiagPage = 1;
  refreshAllVaneLinkedDropdowns();
  liveUpdateFreqs(); updateFreqDisplay();
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
  if(typeof pruneOrphanedMixerRows === 'function') pruneOrphanedMixerRows();
  if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
}

const EO_COLORS = ['#00e5a0','#004a5e','#f59e0b','#a78bfa','#ef4444','#0f2a5e','#10b981','#f97316','#8b5cf6','#ec4899'];
(function(){ function hx(h,s,l){ s/=100; l/=100; var a=s*Math.min(l,1-l), f=function(n){ var k=(n+h/30)%12, c=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return Math.round(255*c).toString(16).padStart(2,'0'); }; return '#'+f(0)+f(8)+f(4); }
  for(var i=0;i<24;i++) EO_COLORS.push(hx((i*137.5+20)%360,70,i%2?58:50)); })();
const MAX_ROTORS = 32, MAX_OTHER_OSCS = 10;
function canAddExtraOsc(type){
  if(type === 'rotor' || !type) return (2 + extraOscs.filter(function(e){ return e.type === 'rotor'; }).length) < MAX_ROTORS;
  return extraOscs.filter(function(e){ return e.type !== 'rotor'; }).length < MAX_OTHER_OSCS;
}



function getEoColor(idxOrEo){
  if(typeof idxOrEo === 'object') return idxOrEo.customColor || EO_COLORS[extraOscs.indexOf(idxOrEo) % EO_COLORS.length];
  return EO_COLORS[idxOrEo % EO_COLORS.length];
}

function getEoDisplayName(eo){
  if(eo.customName && eo.customName.length > 0) return eo.customName;
  const prefix = eo.type==='harmonic' ? 'Harmonic' : eo.type==='vane' ? 'Vane' : 'Rotor';
  return prefix + ' ' + eo.label;
}

function getNextRotorNumber(){
  return 2 + extraOscs.filter(e=>e.type==='rotor' && !e.parentRotorId).length + 1;
}
function getNextHarmonicNumber(){
  return extraOscs.filter(e=>e.type==='harmonic').length + 1;
}
function getNextVaneNumber(parentRotorId){
  const builtin = (parentRotorId==='hp' || parentRotorId==='lp') ? 1 : 0;
  return builtin + extraOscs.filter(e=>e.type==='vane' && e.parentRotorId===parentRotorId).length + 1;
}

function relabelExtraOscs(){
  let rotorNum = 2;
  let harmonicNum = 0;
  const vaneCounters = {};
  extraOscs.forEach(e=>{
    let newLabel, prefix;
    if(e.type === 'harmonic'){
      harmonicNum++;
      newLabel = String(harmonicNum);
      prefix = 'Harmonic';
    } else if(e.type === 'vane'){
      const key = String(e.parentRotorId);
      if(vaneCounters[key] === undefined){
        vaneCounters[key] = (e.parentRotorId==='hp' || e.parentRotorId==='lp') ? 1 : 0;
      }
      vaneCounters[key]++;
      newLabel = String(vaneCounters[key]);
      prefix = 'Vane';
    } else {
      rotorNum++;
      newLabel = String(rotorNum);
      prefix = 'Rotor';
    }
    e.label = newLabel;
    const defaultName = prefix + ' ' + newLabel;
    const nameInput = document.getElementById('eoName'+e.id);
    if(nameInput){
      nameInput.placeholder = defaultName;
      if(!e.customName) nameInput.value = defaultName;
    }
    syncEoDisplayName(e);
    syncEoColor(e);
    const fc2 = document.getElementById('fcEO'+e.id);
    if(fc2){ const nm = fc2.querySelector('.freq-name'); if(nm) nm.textContent=(e.customName||defaultName); }
    const ms2 = document.getElementById('mixerRowEO'+e.id);
    if(ms2){ const lb = ms2.querySelector('.slider-label'); if(lb) lb.textContent=(e.customName||defaultName); }
    const statorMs = document.getElementById('mixerRowStator'+e.id);
    if(statorMs){ const lb = statorMs.querySelector('.slider-label'); if(lb) lb.textContent=getStatorDisplayName(e); }
  });
}

function getStatorDisplayName(eo){
  return (eo.statorName && eo.statorName.length > 0) ? eo.statorName : 'Stator';
}

function syncEoDisplayName(eo){
  const name = getEoDisplayName(eo);
  const shortName = name;
  const fcName = document.querySelector('#fcEO'+eo.id+' .freq-name');
  if(fcName) fcName.textContent = shortName;
  const mixLabel = document.querySelector('#mixerRowEO'+eo.id+' .slider-label');
  if(mixLabel) mixLabel.textContent = shortName;
  refreshAllVaneLinkedDropdowns();
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
}

function applyVaneBorderColor(item, hexColor){
  if(!item || !hexColor) return;
  item.style.setProperty('border-left-color', hexColor + '66', 'important');
  item.style.setProperty('border-top-color', hexColor + '1f', 'important');
  item.style.setProperty('border-right-color', hexColor + '1f', 'important');
  item.style.setProperty('border-bottom-color', hexColor + '1f', 'important');
}

function syncEoColor(eo){
  const col = eo.customColor;
  if(eo.parentRotorId){
    const item = document.getElementById('eoItem'+eo.id);
    if(item) applyVaneBorderColor(item, col);
  }
  const nameInput = document.getElementById('eoName'+eo.id);
  if(nameInput) nameInput.style.color = col;
  const vb = document.getElementById('vbEO'+eo.id);
  if(vb) vb.style.background = col;
  const mixLabel = document.querySelector('#mixerRowEO'+eo.id+' .slider-label');
  if(mixLabel) mixLabel.style.color = col;
  const mixSlider = document.getElementById('sEO'+eo.id);
  if(mixSlider) mixSlider.style.accentColor = col;
  const mixVal = document.getElementById('svEO'+eo.id);
  if(mixVal) mixVal.style.color = col;
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
}

function addExtraOscFreqCard(eo){
  const col = getEoColor(eo);
  const shortName = getEoDisplayName(eo);
  const card = document.createElement('div');
  card.className = 'freq-card';
  card.id = 'fcEO'+eo.id;
  card.innerHTML = `<div class="freq-name">${shortName}</div><div><span class="freq-val" id="fvEO${eo.id}">0</span><span class="freq-unit">Hz</span></div><div class="vis-bar"><div class="vis-fill" id="vbEO${eo.id}" style="background:${col}"></div></div>`;
  const grid = document.querySelector('#freqPage1 .freq-display');
  if(grid) grid.appendChild(card);
  else get('freqPagesContainer').appendChild(card);
}

