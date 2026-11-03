const CHOP_PER_PAGE = 8;
let chopperDiagPage = 1;

function getTotalChopperItems(mode){
  const isDC = mode === 'dblchopper';
  const isSingle = mode === 'single';
  if(isSingle || !isDC) return 1;
  const extraRotors = extraOscs.filter(eo=>eo.type==='rotor').length;
  return 2 + extraRotors;
}

function rebuildChopperDiagramNav(){
  const mode = get('dChopper').value;
  const total = getTotalChopperItems(mode);
  const totalPages = Math.ceil(total / CHOP_PER_PAGE);
  if(chopperDiagPage > totalPages) chopperDiagPage = 1;
  const _nk = totalPages+'|'+chopperDiagPage;
  if(window._chopNavKey === _nk && document.getElementById('chopperDiagNav')) return;
  window._chopNavKey = _nk;

  let nav = document.getElementById('chopperDiagNav');
  if(!nav){
    nav = document.createElement('div');
    nav.id = 'chopperDiagNav';
    nav.style.cssText = 'display:none;align-items:center;justify-content:space-between;gap:6px;margin-top:6px';
    nav.innerHTML = `<button class="vbtn btn-gray" id="btnChopPrev" style="font-size:10px;padding:2px 10px;letter-spacing:1px"><svg class="si" aria-hidden="true"><use href="#si-tri-l"/></svg></button><span id="chopDiagIndicator" style="font-size:9px;color:var(--muted);letter-spacing:1.5px;font-family:'Share Tech Mono',monospace">1/1</span><button class="vbtn btn-gray" id="btnChopNext" style="font-size:10px;padding:2px 10px;letter-spacing:1px"><svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg></button>`;
    const diagView = get('chopperDiagramView');
    const btnRow = diagView.querySelector('div[style*="flex-wrap"]') || diagView.lastElementChild;
    diagView.insertBefore(nav, btnRow);
    document.getElementById('btnChopPrev').addEventListener('click', function(){
      if(chopperDiagPage > 1){ chopperDiagPage--; redrawChoppers(chopperAngleA, chopperAngleB); }
    });
    document.getElementById('btnChopNext').addEventListener('click', function(){
      if(chopperDiagPage < Math.ceil(getTotalChopperItems(get('dChopper').value)/CHOP_PER_PAGE)){ chopperDiagPage++; redrawChoppers(chopperAngleA, chopperAngleB); }
    });
  }
  nav.style.display = totalPages > 1 ? 'flex' : 'none';
  const ind = document.getElementById('chopDiagIndicator');
  if(ind) ind.textContent = `${chopperDiagPage} / ${totalPages}`;
  const prev = document.getElementById('btnChopPrev');
  const next = document.getElementById('btnChopNext');
  if(prev){ prev.disabled = chopperDiagPage<=1; prev.style.opacity=chopperDiagPage<=1?'0.35':'1'; }
  if(next){ next.disabled = chopperDiagPage>=totalPages; next.style.opacity=chopperDiagPage>=totalPages?'0.35':'1'; }
}

function applyExtraOscSingleToneGrey(){
  const isSingle = get('dChopper').value === 'single';
  ['permOscLp','permOscLv','permOscUt','permOscOt'].forEach(pid=>{
    const el=document.getElementById(pid);
    if(el) el.classList.toggle('single-tone-disabled', isSingle);
  });
  ['permMixRowLp','permMixRowLv','permMixRowUt','permMixRowOt'].forEach(pid=>{
    const sliderRow=document.getElementById(pid);
    if(sliderRow){ sliderRow.classList.toggle('dim', isSingle); const inp=sliderRow.querySelector('input[type=range]'); if(inp) inp.disabled=isSingle; }
  });
  const lpStatorItem = document.getElementById('permStatorItemLp');
  if(lpStatorItem) lpStatorItem.classList.toggle('single-tone-disabled', isSingle);
  const lpStatorMixRow = document.getElementById('permStatorMixRowLp');
  if(lpStatorMixRow){ lpStatorMixRow.classList.toggle('dim', isSingle); const si=lpStatorMixRow.querySelector('input[type=range]'); if(si) si.disabled=isSingle; }
  const hpStatorItem = document.getElementById('permStatorItemHp');
  if(hpStatorItem) hpStatorItem.classList.remove('single-tone-disabled');
  const hpStatorMixRow = document.getElementById('permStatorMixRowHp');
  if(hpStatorMixRow){ hpStatorMixRow.classList.remove('dim'); const si=hpStatorMixRow.querySelector('input[type=range]'); if(si) si.disabled=false; }
  extraOscs.forEach(eo=>{
    const shouldGray = isEoChopperForced(eo);
    const item = document.getElementById('eoItem'+eo.id);
    if(item) item.classList.toggle('single-tone-disabled', shouldGray);
    const mixRow = document.getElementById('mixerRowEO'+eo.id);
    if(mixRow) mixRow.classList.toggle('dim', shouldGray);
    const mixInput = document.getElementById('sEO'+eo.id);
    if(mixInput) mixInput.disabled = shouldGray;
    if(eo.type === 'rotor'){
      const statorItem = document.getElementById('statorItem'+eo.id);
      if(statorItem) statorItem.classList.toggle('single-tone-disabled', shouldGray);
      const statorMixRow = document.getElementById('mixerRowStator'+eo.id);
      if(statorMixRow){ statorMixRow.classList.toggle('dim', shouldGray); const si=statorMixRow.querySelector('input[type=range]'); if(si) si.disabled=shouldGray; }
    }
  });
}

