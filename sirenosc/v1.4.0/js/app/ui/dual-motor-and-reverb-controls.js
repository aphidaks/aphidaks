(function(){
  function syncDualMotorUI(enabled) {
    dualMotorEnabled = true;
    const fields = get('dualMotorFields');
    const badge = get('dualMotorBadge');
    if (fields) fields.style.display = 'block';
    if (badge) badge.style.display = '';
    extraOscs.forEach(eo => {
      const row = document.getElementById('eoMotorRow'+eo.id);
      if (row) row.style.display = 'flex';
    });
    ['Hp','Hv','Lp','Lv','Ut','Ot'].forEach(pid => {
      const row = document.getElementById('permMotorRow'+pid);
      if (row) row.style.display = 'flex';
    });
    startMotor2();
    liveUpdateFreqs(); updateFreqDisplay();
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  }

  syncDualMotorUI(true);

  ['nDualMotorPeakRPM','nDualMotorDelay'].forEach(id => {
    const el = get(id);
    if (el) el.addEventListener('input', function() {
      if (dualMotorEnabled) { liveUpdateFreqs(); updateFreqDisplay(); }
      if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  });

  const LSK = 'sirenosc_extra_motors';
  function persist(){ try{ localStorage.setItem(LSK, JSON.stringify(extraMotors)); }catch(e){} if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); }
  function refreshMotorSelects(){
    const n = getMotorCount();
    document.querySelectorAll('select[id^="eoMotor"], select[id^="permMotor"]').forEach(function(sel){
      if (sel.dataset.motors === String(n)) return;
      const cur = parseInt(sel.value) || 1;
      let h = ''; for (let i = 1; i <= n; i++) h += '<option value="' + i + '">Motor ' + i + '</option>';
      sel.innerHTML = h; sel.dataset.motors = String(n);
      sel.value = String(cur <= n ? cur : 1);
      sel.style.color = (parseInt(sel.value) >= 2) ? 'var(--accent2)' : 'var(--accent)';
    });
  }
  window.refreshMotorSelects = refreshMotorSelects;
  function fixAssignments(){
    const n = getMotorCount();
    extraOscs.forEach(function(eo){ if ((eo.motor||1) > n) eo.motor = 1; });
    Object.keys(permOscMotor).forEach(function(k){ if ((permOscMotor[k]||1) > n) permOscMotor[k] = 1; });
  }
  function renderExtraMotors(){
    const host = get('extraMotorsList'); if (!host) return;
    host.innerHTML = '';
    extraMotors.forEach(function(m, i){
      const n = i + 3, last = (i === extraMotors.length - 1);
      const card = document.createElement('div');
      card.style.cssText = 'margin-top:8px;padding:6px 7px;background:rgba(0,184,217,.05);border:1px solid rgba(0,184,217,.18);border-radius:2px;letter-spacing:1px';
      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px"><span class="field-label" style="margin:0">Motor ' + n + '</span>' +
        '<span style="display:flex;align-items:center;gap:6px">' +
        (last ? '<button type="button" class="vbtn btn-gray" data-rm="' + i + '" title="Remove Motor ' + n + '" style="font-size:11px;padding:0 6px;line-height:14px"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button>' : '') +
        '<span id="dualMotor' + n + 'RPMDisplay" style="font-size:9px !important;color:var(--accent2);font-family:\'Share Tech Mono\',monospace;letter-spacing:1px">0</span></span></div>' +
        '<div class="entry-grid" style="gap:5px;letter-spacing:1px">' +
        '<div class="entry"><label>Peak RPM</label><input type="number" data-f="peak" data-i="' + i + '" value="' + m.peak + '" min="0" max="99999" step="1" style="color:var(--accent2);letter-spacing:1px"></div>' +
        '<div class="entry"><label>Delay (ms)</label><input type="number" data-f="delay" data-i="' + i + '" value="' + m.delay + '" min="0" max="5000" step="1" style="color:var(--accent2);letter-spacing:1px"></div></div>';
      host.appendChild(card);
    });
    host.querySelectorAll('input[data-f]').forEach(function(inp){
      inp.addEventListener('input', function(){
        const m = extraMotors[+inp.dataset.i]; if (!m) return;
        m[inp.dataset.f] = parseFloat(inp.value) || 0; if (m.delay < 0) m.delay = 0;
        liveUpdateFreqs(); updateFreqDisplay(); persist();
      });
    });
    host.querySelectorAll('button[data-rm]').forEach(function(b){
      b.addEventListener('click', function(){ extraMotors.pop(); fixAssignments(); changed(); });
    });
    const lbl = get('motorCountLabel'); if (lbl) lbl.textContent = getMotorCount() + ' / ' + MAX_MOTORS + ' motors';
    const add = get('btnAddMotor'); if (add){ const full = getMotorCount() >= MAX_MOTORS; add.disabled = full; add.style.opacity = full ? '.4' : ''; }
  }
  function changed(){ renderExtraMotors(); refreshMotorSelects(); liveUpdateFreqs(); updateFreqDisplay(); persist(); }
  function setExtraMotors(list){
    extraMotors = (Array.isArray(list) ? list : []).slice(0, MAX_MOTORS - 2).map(function(m){ return { peak: (m && isFinite(parseFloat(m.peak))) ? Math.max(0, parseFloat(m.peak)) : Math.max(0, (parseFloat(get('eRPM').value) || 3600) + (parseFloat(m && m.offset) || 0)), delay: Math.max(0, parseFloat(m && m.delay) || 0) }; });
    motorRPMs = {}; fixAssignments(); renderExtraMotors(); refreshMotorSelects();
  }
  window._setExtraMotors = setExtraMotors;
  window._getExtraMotors = function(){ return extraMotors.map(function(m){ return { peak: m.peak, delay: m.delay }; }); };
  const addBtn = get('btnAddMotor');
  if (addBtn) addBtn.addEventListener('click', function(){ if (getMotorCount() >= MAX_MOTORS) return; extraMotors.push({ peak: parseFloat(get('eRPM').value) || 3600, delay: 0 }); changed(); });
  try { const saved = JSON.parse(localStorage.getItem(LSK) || '[]'); setExtraMotors(saved); } catch(e) { setExtraMotors([]); }

  window._syncDualMotorUI = syncDualMotorUI;
})();

get('btnLpfEnable').addEventListener('click',()=>{
  lpfEnabled=!lpfEnabled;
  const btn=get('btnLpfEnable');
  btn.textContent=lpfEnabled?'ENABLED':'BYPASSED';
  btn.className=lpfEnabled?'vbtn btn-accent active':'vbtn btn-gray';
  get('lpfBody').style.opacity=lpfEnabled?'':'0.4';
  if(audioCtx) buildFilterChain();
});

get('btnReverbEnable').addEventListener('click', () => {
  reverbEnabled = !reverbEnabled;
  const btn = get('btnReverbEnable');
  btn.textContent = reverbEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = reverbEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('reverbBody').classList.toggle('disabled-overlay', !reverbEnabled);
  if (audioCtx) rebuildFxChain();
});
['sReverbSize','sReverbDecay','sReverbDiffusion','sReverbColor','sReverbMix'].forEach(id => {
  get(id).addEventListener('input', () => {
    get(id.replace('sReverb','svReverb')).textContent = get(id).value + '%';
    updateReverbParams(1);
  });
});
get('sReverbLowCut').addEventListener('input', () => {
  const hz = parseFloat(get('sReverbLowCut').value);
  get('svReverbLowCut').textContent = hz >= 1000 ? (hz/1000).toFixed(2)+' kHz' : hz+' Hz';
  updateReverbParams(1);
});
['nReverbPreDelay'].forEach(id => { get(id).addEventListener('input', () => updateReverbParams(1)); });

let reverb1Mode = 'reverb';
let reverb1IRBuffer = null;

function applyReverb1Mode(mode) {
  reverb1Mode = mode;
  const synthParams = get('reverbSynthParams');
  const convolverUI = get('reverbConvolverUI');
  if (mode === 'convolver') {
    if (synthParams) synthParams.style.display = 'none';
    if (convolverUI) convolverUI.style.display = '';
  } else {
    if (synthParams) synthParams.style.display = '';
    if (convolverUI) convolverUI.style.display = 'none';
  }
  if (audioCtx && reverbEnabled) rebuildFxChain();
}

get('dReverb1Mode').addEventListener('change', function() {
  applyReverb1Mode(this.value);
});

get('reverbIRFile').addEventListener('change', function() {
  const file = this.files && this.files[0];
  if (!file) return;
  const nameEl = get('reverbIRName');
  const statusEl = get('reverbIRStatus');
  if (nameEl) nameEl.textContent = file.name;
  if (statusEl) { statusEl.textContent = 'Decoding...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }
  const reader = new FileReader();
  reader.onload = function(e) {
    if (!audioCtx) {
      if (statusEl) { statusEl.textContent = 'Start audio first'; statusEl.style.color = 'var(--warn)'; }
      reverb1IRBuffer = null;
      return;
    }
    audioCtx.decodeAudioData(e.target.result.slice(0), function(buffer) { window._wavReg(buffer, e.target.result);
      reverb1IRBuffer = buffer;
      if (reverbNode) reverbNode.buffer = buffer;
      if (statusEl) { statusEl.textContent = 'Loaded \u2014 ' + (buffer.duration).toFixed(2) + 's'; statusEl.style.color = 'var(--accent)'; }
    }, function() {
      reverb1IRBuffer = null;
      if (statusEl) { statusEl.textContent = 'Decode failed'; statusEl.style.color = 'var(--red)'; }
    });
  };
  reader.readAsArrayBuffer(file);
});

get('btnReverb2Enable').addEventListener('click', () => {
  reverb2Enabled = !reverb2Enabled;
  const btn = get('btnReverb2Enable');
  btn.textContent = reverb2Enabled ? 'ENABLED' : 'ENABLE';
  btn.className = reverb2Enabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('reverb2Body').classList.toggle('disabled-overlay', !reverb2Enabled);
  if (audioCtx) rebuildFxChain();
});
['sReverb2Size','sReverb2Decay','sReverb2Diffusion','sReverb2Color','sReverb2Mix'].forEach(id => {
  get(id).addEventListener('input', () => {
    get(id.replace('sReverb2','svReverb2')).textContent = get(id).value + '%';
    updateReverbParams(2);
  });
});
get('sReverb2LowCut').addEventListener('input', () => {
  const hz = parseFloat(get('sReverb2LowCut').value);
  get('svReverb2LowCut').textContent = hz >= 1000 ? (hz/1000).toFixed(2)+' kHz' : hz+' Hz';
  updateReverbParams(2);
});
get('nReverb2PreDelay').addEventListener('input', () => updateReverbParams(2));

let reverb2Mode = 'reverb';
let reverb2IRBuffer = null;

function applyReverb2Mode(mode) {
  reverb2Mode = mode;
  const synthParams = get('reverb2SynthParams');
  const convolverUI = get('reverb2ConvolverUI');
  if (mode === 'convolver') {
    if (synthParams) synthParams.style.display = 'none';
    if (convolverUI) convolverUI.style.display = '';
  } else {
    if (synthParams) synthParams.style.display = '';
    if (convolverUI) convolverUI.style.display = 'none';
  }
  if (audioCtx && reverb2Enabled) rebuildFxChain();
}

get('dReverb2Mode').addEventListener('change', function() {
  applyReverb2Mode(this.value);
});

get('reverb2IRFile').addEventListener('change', function() {
  const file = this.files && this.files[0];
  if (!file) return;
  const nameEl = get('reverb2IRName');
  const statusEl = get('reverb2IRStatus');
  if (nameEl) nameEl.textContent = file.name;
  if (statusEl) { statusEl.textContent = 'Decoding...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }
  const reader = new FileReader();
  reader.onload = function(e) {
    if (!audioCtx) {
      if (statusEl) { statusEl.textContent = 'Start audio first'; statusEl.style.color = 'var(--warn)'; }
      reverb2IRBuffer = null;
      return;
    }
    audioCtx.decodeAudioData(e.target.result.slice(0), function(buffer) { window._wavReg(buffer, e.target.result);
      reverb2IRBuffer = buffer;
      if (reverb2Node) reverb2Node.buffer = buffer;
      if (statusEl) { statusEl.textContent = 'Loaded \u2014 ' + (buffer.duration).toFixed(2) + 's'; statusEl.style.color = 'var(--accent)'; }
    }, function() {
      reverb2IRBuffer = null;
      if (statusEl) { statusEl.textContent = 'Decode failed'; statusEl.style.color = 'var(--red)'; }
    });
  };
  reader.readAsArrayBuffer(file);
});

get('btnReverb3Enable').addEventListener('click', () => {
  reverb3Enabled = !reverb3Enabled;
  const btn = get('btnReverb3Enable');
  btn.textContent = reverb3Enabled ? 'ENABLED' : 'ENABLE';
  btn.className = reverb3Enabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('reverb3Body').classList.toggle('disabled-overlay', !reverb3Enabled);
  if (audioCtx) rebuildFxChain();
});
['sReverb3Size','sReverb3Decay','sReverb3Diffusion','sReverb3Color','sReverb3Mix'].forEach(id => {
  get(id).addEventListener('input', () => {
    get(id.replace('sReverb3','svReverb3')).textContent = get(id).value + '%';
    updateReverbParams(3);
  });
});
get('sReverb3LowCut').addEventListener('input', () => {
  const hz = parseFloat(get('sReverb3LowCut').value);
  get('svReverb3LowCut').textContent = hz >= 1000 ? (hz/1000).toFixed(2)+' kHz' : hz+' Hz';
  updateReverbParams(3);
});
get('nReverb3PreDelay').addEventListener('input', () => updateReverbParams(3));

let reverb3Mode = 'convolver';
let reverb3IRBuffer = null;

function applyReverb3Mode(mode) {
  reverb3Mode = mode;
  const synthParams = get('reverb3SynthParams');
  const convolverUI = get('reverb3ConvolverUI');
  if (mode === 'convolver') {
    if (synthParams) synthParams.style.display = 'none';
    if (convolverUI) convolverUI.style.display = '';
  } else {
    if (synthParams) synthParams.style.display = '';
    if (convolverUI) convolverUI.style.display = 'none';
  }
  if (audioCtx && reverb3Enabled) rebuildFxChain();
}

get('dReverb3Mode').addEventListener('change', function() {
  applyReverb3Mode(this.value);
});

get('reverb3IRFile').addEventListener('change', function() {
  const file = this.files && this.files[0];
  if (!file) return;
  const nameEl = get('reverb3IRName');
  const statusEl = get('reverb3IRStatus');
  if (nameEl) nameEl.textContent = file.name;
  if (statusEl) { statusEl.textContent = 'Decoding...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }
  const reader = new FileReader();
  reader.onload = function(e) {
    if (!audioCtx) {
      if (statusEl) { statusEl.textContent = 'Start audio first'; statusEl.style.color = 'var(--warn)'; }
      reverb3IRBuffer = null;
      return;
    }
    audioCtx.decodeAudioData(e.target.result.slice(0), function(buffer) { window._wavReg(buffer, e.target.result);
      reverb3IRBuffer = buffer;
      if (reverb3Node) reverb3Node.buffer = buffer;
      if (statusEl) { statusEl.textContent = 'Loaded \u2014 ' + (buffer.duration).toFixed(2) + 's'; statusEl.style.color = 'var(--accent)'; }
    }, function() {
      reverb3IRBuffer = null;
      if (statusEl) { statusEl.textContent = 'Decode failed'; statusEl.style.color = 'var(--red)'; }
    });
  };
  reader.readAsArrayBuffer(file);
});

