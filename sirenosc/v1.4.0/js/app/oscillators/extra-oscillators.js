
function tearEoAttenChain(eo){
  if(eo.attenFilterNodes && eo.attenFilterNodes.length){
    eo.attenFilterNodes.forEach(f=>{try{f.disconnect();}catch(e){}});
  }
  eo.attenFilterNodes = [];
  if(eo.attenDryGain){ try{eo.attenDryGain.disconnect();}catch(e){} eo.attenDryGain = null; }
  if(eo.attenWetGain){ try{eo.attenWetGain.disconnect();}catch(e){} eo.attenWetGain = null; }
  if(eo.attenSumGain){ try{eo.attenSumGain.disconnect();}catch(e){} eo.attenSumGain = null; }
}

function connectEoOutput(eo, sourceNode, dest){
  tearEoAttenChain(eo);
  try{ sourceNode.disconnect(); }catch(e){}
  const attenApplicable = (eo.type === 'vane' || eo.type === 'harmonic');
  if(audioCtx && eo.attenuate && attenApplicable){
    const sum = audioCtx.createGain(); sum.gain.value = 1;
    const dry = audioCtx.createGain();
    const wet = audioCtx.createGain();
    const mixFrac = Math.max(0, Math.min(100, eo.attenMix !== undefined ? eo.attenMix : 100)) / 100;
    dry.gain.setValueAtTime(1 - mixFrac, audioCtx.currentTime);
    wet.gain.setValueAtTime(mixFrac, audioCtx.currentTime);
    sourceNode.connect(dry);
    dry.connect(sum);
    const curve = parseInt(eo.attenCurve) || 12;
    const stageCount = Math.max(1, Math.round(curve / 6));
    const filters = [];
    for(let i=0; i<stageCount; i++){
      const f = audioCtx.createBiquadFilter();
      f.type = (eo.attenFilterType === 'highpass') ? 'highpass' : 'lowpass';
      f.frequency.setValueAtTime(Math.max(20, Math.min(20000, parseFloat(eo.attenCutoff) || 1000)), audioCtx.currentTime);
      f.Q.setValueAtTime(parseFloat(eo.attenQ) || 0.7071, audioCtx.currentTime);
      if(filters.length) filters[filters.length-1].connect(f);
      filters.push(f);
    }
    sourceNode.connect(filters[0]);
    filters[filters.length-1].connect(wet);
    wet.connect(sum);
    sum.connect(dest);
    eo.attenFilterNodes = filters;
    eo.attenDryGain = dry;
    eo.attenWetGain = wet;
    eo.attenSumGain = sum;
  } else {
    sourceNode.connect(dest);
  }
}

function refreshEoAttenRouting(eo){
  if(!audioCtx || !eo.gainNode) return;
  const dest = _sirenInNode();
  connectEoOutput(eo, eo.gainNode, dest);
}

function tearPermAttenChain(key){
  const state = permAtten[key];
  if(!state) return;
  if(state.filterNodes && state.filterNodes.length){
    state.filterNodes.forEach(f=>{try{f.disconnect();}catch(e){}});
  }
  state.filterNodes = [];
  if(state.dryGain){ try{state.dryGain.disconnect();}catch(e){} state.dryGain = null; }
  if(state.wetGain){ try{state.wetGain.disconnect();}catch(e){} state.wetGain = null; }
  if(state.sumGain){ try{state.sumGain.disconnect();}catch(e){} state.sumGain = null; }
}

function connectPermOscOutput(key, sourceNode, dest){
  tearPermAttenChain(key);
  try{ sourceNode.disconnect(); }catch(e){}
  const state = permAtten[key];
  const applicable = PERM_ATTEN_KEYS.indexOf(key) !== -1;
  if(audioCtx && applicable && state && state.enabled){
    const sum = audioCtx.createGain(); sum.gain.value = 1;
    const dry = audioCtx.createGain();
    const wet = audioCtx.createGain();
    const mixFrac = Math.max(0, Math.min(100, state.mix !== undefined ? state.mix : 100)) / 100;
    dry.gain.setValueAtTime(1 - mixFrac, audioCtx.currentTime);
    wet.gain.setValueAtTime(mixFrac, audioCtx.currentTime);
    sourceNode.connect(dry);
    dry.connect(sum);
    const curve = parseInt(state.curve) || 12;
    const stageCount = Math.max(1, Math.round(curve / 6));
    const filters = [];
    for(let i=0; i<stageCount; i++){
      const f = audioCtx.createBiquadFilter();
      f.type = (state.filterType === 'highpass') ? 'highpass' : 'lowpass';
      f.frequency.setValueAtTime(Math.max(20, Math.min(20000, parseFloat(state.cutoff) || 1000)), audioCtx.currentTime);
      f.Q.setValueAtTime(parseFloat(state.q) || 0.7071, audioCtx.currentTime);
      if(filters.length) filters[filters.length-1].connect(f);
      filters.push(f);
    }
    sourceNode.connect(filters[0]);
    filters[filters.length-1].connect(wet);
    wet.connect(sum);
    sum.connect(dest);
    state.filterNodes = filters;
    state.dryGain = dry;
    state.wetGain = wet;
    state.sumGain = sum;
  } else {
    sourceNode.connect(dest);
  }
}

function refreshPermAttenRouting(key){
  if(!audioCtx || !gainNodes[key]) return;
  const dest = _sirenInNode();
  connectPermOscOutput(key, gainNodes[key], dest);
}

function buildExtraOscAudio(eo){
  if(!audioCtx) return;
  if(eo.oscNode){ try{eo.oscNode.stop();}catch(e){} try{eo.oscNode.disconnect();}catch(e){} eo.oscNode=null; }
  if(eo.gainNode){ try{eo.gainNode.disconnect();}catch(e){} eo.gainNode=null; }
  if(eo.bidirFilterNode){ try{eo.bidirFilterNode.disconnect();}catch(e){} eo.bidirFilterNode=null; }
  tearEoAttenChain(eo);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const v = getV();
  const r = centsToRatio(v.detune);
  const rpm = currentRPM + damperExtraRPM;
  const wf = getEoWaveform(eo, v.waveform);
  osc._rasp = eo.rasp;
  setOscWaveform(osc, wf);
  const freqHz = computeExtraOscFreq(eo, rpm, r);
  osc.frequency.setValueAtTime(raspHz(osc, freqHz, rpm), audioCtx.currentTime);
  const vol = (eo.mixerVal ?? 50)/100*0.18;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  const bf = audioCtx.createBiquadFilter();
  bf.type = 'lowpass'; bf.Q.value = getBidirLpfQ(); bf.frequency.setValueAtTime(getBidirLpfOpenHz(), audioCtx.currentTime);
  osc.connect(bf); bf.connect(gain);
  eo.bidirFilterNode = bf;
  const dest = _sirenInNode();
  connectEoOutput(eo, gain, dest);
  osc.start();
  eo.oscNode = osc;
  eo.gainNode = gain;
}


function buildStatorAudio(eo){
  if(!audioCtx) return;
  tearStatorAudio(eo);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const v = getV();
  const r = centsToRatio(v.detune);
  const rpm = getRPMForOsc(eo);
  const portVal = parseFloat(eo.statorVal||eo.value)||1;
  const freqHz = calcHz(portVal, rpm) * r + 5;
  setOscWaveform(osc, getEoWaveform(eo, v.waveform));
  osc.frequency.setValueAtTime(Math.max(0.01, freqHz), audioCtx.currentTime);
  const vol = (eo.statorMixerVal||40)/100 * 0.18;
  gain.gain.setValueAtTime((eo.statorEnabled===false) ? 0 : vol, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(_sirenInNode());
  osc.start();
  eo.statorOscNode = osc;
  eo.statorGainNode = gain;
}

function tearStatorAudio(eo){
  if(eo.statorOscNode){ try{eo.statorOscNode.stop();}catch(e){} try{eo.statorOscNode.disconnect();}catch(e){} eo.statorOscNode=null; }
  if(eo.statorGainNode){ try{eo.statorGainNode.disconnect();}catch(e){} eo.statorGainNode=null; }
}

function getLinkedChopperOptions(){
  const mode = get('dChopper').value;
  if(mode === 'single'){
    return [{value:'hp', label:'High Port'}];
  }
  const opts = [
    {value:'hp', label:'High Port'},
    {value:'lp', label:'Low Port'},
  ];
  if(mode === 'double'){
    opts[1].label = 'Low Port';
  }
  extraOscs.forEach(eo=>{
    if(eo.type==='rotor'){
      opts.push({value:'eo'+eo.id, label: getEoDisplayName(eo)});
    }
  });
  return opts;
}

function renderExtraOscLinkedDropdown(eo, selectEl){
  const opts = getLinkedChopperOptions();
  selectEl.innerHTML = '';
  opts.forEach(o=>{
    const op = document.createElement('option');
    op.value = o.value;
    op.textContent = o.label;
    if(eo.linkedChopper === o.value) op.selected = true;
    selectEl.appendChild(op);
  });
}

function refreshAllVaneLinkedDropdowns(){
  extraOscs.forEach(eo=>{
    if(eo.type==='vane'){
      const sel = document.getElementById('eoLinked'+eo.id);
      if(sel) renderExtraOscLinkedDropdown(eo, sel);
    }
  });
}

function updateExtraOscVaneOnDiagram(eo){
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
}

function getExtraOscVaneLen(eo){
  return (eo.mixerVal ?? 50)/100;
}

function addExtraOsc(initialType, parentRotorId){
  if(!canAddExtraOsc(initialType)) return;
  const isSingle = get('dChopper').value === 'single';
  const isChild = !!parentRotorId;
  const isPermParent = (parentRotorId === 'hp' || parentRotorId === 'lp');
  extraOscCounter++;
  const id = extraOscCounter;
  const effectiveType = initialType || 'rotor';
  const namePrefix = effectiveType === 'harmonic' ? 'Harmonic' : effectiveType === 'vane' ? 'Vane' : 'Rotor';
  const labelNum = effectiveType === 'harmonic' ? getNextHarmonicNumber()
    : effectiveType === 'vane' ? getNextVaneNumber(parentRotorId)
    : getNextRotorNumber();
  const label = String(labelNum);
  const defaultName = namePrefix + ' ' + label;
  const defaultColor = '#757575';
  const defaultValue = effectiveType === 'vane' ? 4 : 8;
  const eo = {id, label, type:effectiveType, value:defaultValue, linkedChopper: isChild ? (isPermParent ? parentRotorId : ('eo'+parentRotorId)) : 'hp', parentRotorId: isChild ? parentRotorId : null, mixerVal:40, enabled:true, visible:true, oscNode:null, gainNode:null, customName:'', customColor: defaultColor, seqGroup:0, motor:1, waveform:'default', attenuate:false, attenFilterType:'lowpass', attenCutoff:1000, attenQ:0.7071, attenCurve:'12', attenMix:100, attenFilterNodes:[], attenDryGain:null, attenWetGain:null, attenSumGain:null, statorName:'Stator', rasp:raspDef()};
  extraOscs.push(eo);

  const container = get('extraOscList');
  const item = document.createElement('div');
  item.className = 'extra-osc-item' + (isSingle ? ' single-tone-disabled' : '') + (isChild ? ' eo-vane-child' : '');
  item.id = 'eoItem'+id;
  if(isChild) applyVaneBorderColor(item, eo.customColor);

  item.innerHTML = `
    <div class="eo-dim-wrap">
    <div class="extra-osc-header">
      <span class="eo-drag-handle" draggable="true" title="Drag to reorder"><svg viewBox="0 0 10 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="2.5" cy="2.5" r="1.6"/><circle cx="7.5" cy="2.5" r="1.6"/><circle cx="2.5" cy="8" r="1.6"/><circle cx="7.5" cy="8" r="1.6"/><circle cx="2.5" cy="13.5" r="1.6"/><circle cx="7.5" cy="13.5" r="1.6"/></svg></span>
      <input type="color" id="eoColor${id}" value="${defaultColor}" title="Change color" style="width:22px;height:22px;border:none;border-radius:2px;cursor:pointer;padding:0;background:none;flex-shrink:0">
      <input type="text" id="eoName${id}" value="${defaultName}" placeholder="${defaultName}" maxlength="24" style="flex:1;background:var(--inset);border:1px solid var(--border);border-radius:2px;color:${defaultColor};font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;padding:2px 6px;text-transform:uppercase;min-width:0">

      <button id="eoEye${id}" title="Show/hide in diagram" style="background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--accent);width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;transition:border-color .12s,color .12s">${eyeOpenSVG}</button>
      <button class="vbtn btn-accent" id="eoEnable${id}" style="font-size:10px;padding:2px 7px;letter-spacing:1px;flex-shrink:0">ON</button>
      <button class="vbtn btn-gray" id="eoRemove${id}" style="font-size:10px;padding:2px 7px;letter-spacing:1px;flex-shrink:0"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button>
    </div>
    </div>
    <div id="eoBody${id}">
    <div class="entry eo-type-entry" id="eoTypeEntry${id}" style="margin-bottom:5px;margin-top:6px">
      <label>Type</label>
      <select id="eoType${id}" style="color:var(--accent2)" disabled>
        <option value="rotor" selected>Rotor</option>
        <option value="vane" hidden>Vane</option>
        <option value="harmonic">Harmonic</option>
      </select>
    </div>
    <div class="eo-dim-wrap">
    <div class="entry" id="eoWaveformRow${id}" style="margin-bottom:5px">
      <label>Waveform</label>
      <select id="eoWaveform${id}" style="color:var(--accent2)">
        <option value="default" selected>Default (Timbre)</option>
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="square">Square</option>
        <option value="parabolic">Parabolic</option>
      </select>
    </div>
    <!-- Rotor fields -->
    <div id="eoRotorFields${id}">
      <div class="entry"><label>Port</label><input type="number" id="eoPort${id}" value="8" min="1" max="49" style="color:var(--accent)"></div>
    </div>
    <!-- Vane fields -->
    <div id="eoVaneFields${id}" style="display:none">
      <div class="entry" style="margin-bottom:4px"><label>Vane</label><input type="number" id="eoVane${id}" value="${eo.value}" min="1" max="49" style="color:var(--warn)"></div>
      <div class="entry" id="eoLinkedRow${id}"><label>Linked Chopper</label>
        <select id="eoLinked${id}" style="color:var(--warn)"></select>
      </div>
    </div>
    <!-- Harmonic fields -->
    <div id="eoHarmonicFields${id}" style="display:none">
      <div class="entry"><label>Harmonic</label><input type="number" id="eoHarmonic${id}" value="1" min="1" max="49" style="color:var(--purple)"></div>
    </div>
    <!-- Attenuate (filter) fields — only shown for Vane / Harmonic oscillator types -->
    <div id="eoAttenWrap${id}" style="display:none;margin-top:4px">
      <div class="toggle-row" style="margin-bottom:4px"><label class="toggle"><input type="checkbox" id="eoAtten${id}"><span class="toggle-slider"></span></label><label class="toggle-label" for="eoAtten${id}" style="cursor:pointer">Attenuation (Fine Rasp)</label></div>
      <div id="eoAttenFields${id}" style="display:none;padding-left:6px;border-left:2px solid var(--border);margin-bottom:4px">
        <div class="entry" style="margin-bottom:4px"><label>Filter</label>
          <select id="eoAttenFilterType${id}" style="color:var(--accent2)">
            <option value="lowpass" selected>Low Pass</option>
            <option value="highpass">High Pass</option>
          </select>
        </div>
        <div class="entry" style="margin-bottom:4px"><label>Cutoff (Hz)</label><input type="number" id="eoAttenCutoff${id}" value="1000" min="20" max="20000" step="1" style="color:var(--accent2)"></div>
        <div class="entry" style="margin-bottom:4px"><label>Resonance</label><input type="number" id="eoAttenQ${id}" value="0.7071" min="0.1" max="20" step="0.1" style="color:var(--accent2)"></div>
        <div class="entry" style="margin-bottom:4px"><label>Curve</label>
          <select id="eoAttenCurve${id}" style="color:var(--accent2)">
            <option value="6">6 dB/oct</option>
            <option value="12" selected>12 dB/oct</option>
            <option value="24">24 dB/oct</option>
          </select>
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:5px">
          <label style="font-size:8px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">DRY/WET</label>
          <input type="range" id="eoAttenMix${id}" min="0" max="100" value="100" style="flex:1">
          <span id="eoAttenMixVal${id}" style="font-size:9px;min-width:32px;text-align:right;color:var(--accent2)">100%</span>
        </div>
      </div>
    </div>
    ${raspHtml('eo', id)}
    <!-- SEQ Group -->
    <div style="display:flex;gap:6px;align-items:center;margin-top:5px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">GROUP</label>
      <select id="seqGroupSelEO${id}" style="flex:1;font-size:9px;padding:2px 4px;color:var(--x-00e5a0,#00e5a0)"></select>
    </div>
    <!-- Motor selection (shown only when dual motor enabled) -->
    <div id="eoMotorRow${id}" style="display:none;gap:6px;align-items:center;margin-top:5px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">MOTOR</label>
      <select id="eoMotor${id}" style="flex:1;font-size:9px;padding:2px 4px;color:var(--accent2)">
        <option value="1">Motor 1</option>
        <option value="2">Motor 2</option>
      </select>
    </div>
    <!-- Bidir side selection (shown only in bidir modes) -->
    <div id="eoBidirSideRow${id}" style="display:none;gap:6px;align-items:center;margin-top:5px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">SIDE</label>
      <select id="eoBidirSide${id}" style="flex:1;font-size:9px;padding:2px 4px">
        <option value="1" style="color:var(--led)">Side 1 - North</option>
        <option value="2" style="color:var(--blue)">Side 2 - South</option>
        <option value="both" style="color:var(--purple)">Both Sides</option>
      </select>
    </div>
    <!-- + VANE (Rotor type only) -->
    <div id="eoAddVaneWrap${id}" style="margin-top:6px;text-align:right">
      <button id="eoAddVane${id}" class="add-vane-btn">+ Vane</button>
    </div>
    </div>
    </div>
    <div id="eoCollapseBar${id}" class="eo-collapse-bar" title="Collapse">
      <svg viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  `;
  container.appendChild(item);
  wireEoDragHandle(item.querySelector('.eo-drag-handle'), item);

  const linkedSel = document.getElementById('eoLinked'+id);
  if(linkedSel) renderExtraOscLinkedDropdown(eo, linkedSel);

  addExtraOscFreqCard(eo);
  addExtraOscMixerSlider(eo);

  document.getElementById('eoName'+id).addEventListener('input', function(){
    eo.customName = this.value.trim();
    syncEoDisplayName(eo);
  });

  document.getElementById('eoColor'+id).addEventListener('input', function(){
    eo.customColor = this.value;
    syncEoColor(eo);
  });

  document.getElementById('eoType'+id).addEventListener('change', function(){
    const prevType = eo.type;
    eo.type = this.value;
    document.getElementById('eoRotorFields'+id).style.display = this.value==='rotor'?'':'none';
    document.getElementById('eoVaneFields'+id).style.display   = this.value==='vane'?'':'none';
    document.getElementById('eoHarmonicFields'+id).style.display = this.value==='harmonic'?'':'none';
    const addVaneWrapEl = document.getElementById('eoAddVaneWrap'+id);
    if(addVaneWrapEl) addVaneWrapEl.style.display = this.value==='rotor'?'':'none';
    const attenApplies = (this.value==='vane' || this.value==='harmonic');
    const attenWrapEl = document.getElementById('eoAttenWrap'+id);
    if(attenWrapEl) attenWrapEl.style.display = attenApplies ? '' : 'none';
    const newMax = 100;
    const mixSlider = document.getElementById('sEO'+id);
    const mixVal = document.getElementById('svEO'+id);
    if(mixSlider){
      mixSlider.max = newMax;
      if(parseFloat(mixSlider.value) > newMax){ mixSlider.value = newMax; eo.mixerVal = newMax; if(mixVal) mixVal.textContent = newMax+'%'; }
    }
    const statorItem = document.getElementById('statorItem'+id);
    if(statorItem) statorItem.style.display = (this.value === 'rotor') ? '' : 'none';
    const collapseBtn = document.getElementById('eoCollapseBar'+id);
    if(collapseBtn){
      eo.childrenCollapsed = false;
      collapseBtn.classList.remove('collapsed');
      collapseBtn.title = (this.value === 'rotor') ? 'Collapse Stator & Vanes' : 'Collapse';
      const bodyEl = document.getElementById('eoBody'+id);
      if(bodyEl) bodyEl.style.display = '';
    }
    if(this.value !== 'rotor') tearStatorAudio(eo);
    else if(!eo.statorLinked && audioCtx) buildStatorAudio(eo);
    if(prevType === 'rotor' && this.value !== 'rotor'){
      extraOscs.filter(v => v.type==='vane' && v.linkedChopper==='eo'+id).forEach(v => removeExtraOsc(v.id));
    }
    if(prevType !== 'rotor' && this.value === 'rotor'){
      const hasVane = extraOscs.some(v => v.type==='vane' && v.linkedChopper==='eo'+id);
      if(!hasVane) addExtraOsc('vane', id);
    }
    if(audioCtx) buildExtraOscAudio(eo);
    refreshAllVaneLinkedDropdowns();
    liveUpdateFreqs(); updateFreqDisplay(); pushGains(0.04);
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    applyExtraOscSingleToneGrey();
  });

  raspWire('eo', id, eo.rasp, function(){ raspRefresh(eo.oscNode); }, function(){ return eo.oscNode; });

  document.getElementById('eoAtten'+id).addEventListener('change', function(){
    eo.attenuate = this.checked;
    const fieldsEl = document.getElementById('eoAttenFields'+id);
    if(fieldsEl) fieldsEl.style.display = this.checked ? '' : 'none';
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  document.getElementById('eoAttenFilterType'+id).addEventListener('change', function(){
    eo.attenFilterType = this.value;
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  document.getElementById('eoAttenCutoff'+id).addEventListener('input', function(){
    eo.attenCutoff = parseFloat(this.value) || 1000;
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  document.getElementById('eoAttenQ'+id).addEventListener('input', function(){
    eo.attenQ = parseFloat(this.value) || 0.7071;
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  document.getElementById('eoAttenCurve'+id).addEventListener('change', function(){
    eo.attenCurve = this.value;
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  document.getElementById('eoAttenMix'+id).addEventListener('input', function(){
    eo.attenMix = parseFloat(this.value) || 0;
    const mixValEl = document.getElementById('eoAttenMixVal'+id);
    if(mixValEl) mixValEl.textContent = eo.attenMix + '%';
    refreshEoAttenRouting(eo);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('eoWaveform'+id).addEventListener('change', function(){
    eo.waveform = this.value;
    if(audioCtx){
      const v = getV();
      const wf = getEoWaveform(eo, v.waveform);
      if(eo.oscNode){ eo._appliedWaveform = wf; setOscWaveform(eo.oscNode, wf); }
      if(eo.statorOscNode){ eo._appliedStatorWaveform = wf; setOscWaveform(eo.statorOscNode, wf); }
    }
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('eoPort'+id).addEventListener('input', function(){
    if(parseFloat(this.value) > 49){ this.value = 49; }
    eo.value = parseFloat(this.value)||1;
    if(eo.statorLinked){
      const statorPortEl = document.getElementById('statorPort'+id);
      if(statorPortEl) statorPortEl.value = eo.value;
    }
    liveUpdateFreqs(); updateFreqDisplay();
    refreshAllVaneLinkedDropdowns();
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    else redrawChoppers(chopperAngleA, chopperAngleB);
  });

  document.getElementById('eoVane'+id).addEventListener('input', function(){
    if(parseFloat(this.value) > 49){ this.value = 49; }
    eo.value = parseFloat(this.value)||1;
    liveUpdateFreqs(); updateFreqDisplay();
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
  });

  if(linkedSel) linkedSel.addEventListener('change', function(){
    eo.linkedChopper = this.value;
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    applyExtraOscSingleToneGrey();
  });

  document.getElementById('eoHarmonic'+id).addEventListener('input', function(){
    if(parseFloat(this.value) > 49){ this.value = 49; }
    eo.value = parseFloat(this.value)||1;
    liveUpdateFreqs(); updateFreqDisplay();
  });

  document.getElementById('eoRemove'+id).addEventListener('click', function(){
    removeExtraOsc(id);
  });

  document.getElementById('eoEnable'+id).addEventListener('click', function(){
    eo.enabled = !eo.enabled;
    this.textContent = eo.enabled ? 'ON' : 'OFF';
    this.className = eo.enabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
    const item = document.getElementById('eoItem'+id);
    if(item) item.classList.toggle('eo-off', !eo.enabled);
    eo.visible = eo.enabled;
    const eyeBtn = document.getElementById('eoEye'+id);
    if(eyeBtn){
      eyeBtn.style.color       = eo.visible ? 'var(--accent)' : 'var(--muted)';
      eyeBtn.style.borderColor = eo.visible ? 'var(--border)' : 'transparent';
      eyeBtn.style.opacity     = eo.visible ? '1' : '0.4';
      eyeBtn.innerHTML         = eo.visible ? eyeOpenSVG : eyeClosedSVG;
    }
    if(eo.type === 'rotor'){
      extraOscs.filter(v => v.type === 'vane' && v.linkedChopper === 'eo'+eo.id).forEach(v => {
        const vEyeBtn = document.getElementById('eoEye'+v.id);
        if(vEyeBtn){
          const effectiveVisible = eo.visible ? v.visible : false;
          vEyeBtn.style.color        = effectiveVisible ? 'var(--accent)' : 'var(--muted)';
          vEyeBtn.style.borderColor  = effectiveVisible ? 'var(--border)' : 'transparent';
          vEyeBtn.style.opacity      = effectiveVisible ? '1' : '0.4';
          vEyeBtn.innerHTML          = effectiveVisible ? eyeOpenSVG : eyeClosedSVG;
        }
      });
    }
    if(audioCtx) pushGains(0.04);
    redrawChoppers(chopperAngleA, chopperAngleB);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  document.getElementById('eoEye'+id).addEventListener('click', function(){
    eo.visible = !eo.visible;
    this.style.color  = eo.visible ? 'var(--accent)' : 'var(--muted)';
    this.style.borderColor = eo.visible ? 'var(--border)' : 'transparent';
    this.style.opacity = eo.visible ? '1' : '0.4';
    this.innerHTML = eo.visible ? eyeOpenSVG : eyeClosedSVG;
    if(eo.type === 'rotor'){
      extraOscs.filter(v => v.type === 'vane' && (v.linkedChopper === 'eo'+eo.id)).forEach(v => {
        const vEyeBtn = document.getElementById('eoEye'+v.id);
        if(vEyeBtn){
          const effectiveVisible = eo.visible ? v.visible : false;
          vEyeBtn.style.color  = effectiveVisible ? 'var(--accent)' : 'var(--muted)';
          vEyeBtn.style.borderColor = effectiveVisible ? 'var(--border)' : 'transparent';
          vEyeBtn.style.opacity = effectiveVisible ? '1' : '0.4';
          vEyeBtn.innerHTML = effectiveVisible ? eyeOpenSVG : eyeClosedSVG;
        }
      });
    }
    redrawChoppers(chopperAngleA, chopperAngleB);
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  const eoGroupSel = document.getElementById('seqGroupSelEO'+id);
  if(eoGroupSel){
    _fillGroupDropdown(eoGroupSel, eo.seqGroup||0);
    eoGroupSel.style.color=SEQ_GROUP_COLORS[eo.seqGroup||0];
    eoGroupSel.addEventListener('change', function(){
      if(this.value==='__add__'){
        addSeqGroup();
        eo.seqGroup=seqNumGroups-1;
        this.value=eo.seqGroup;
      } else {
        eo.seqGroup=parseInt(this.value)||0;
      }
      eoGroupSel.style.color=SEQ_GROUP_COLORS[eo.seqGroup||0];
      if(seqModeActive&&audioCtx) applySeqStep();
    });
  }

  if(audioCtx) buildExtraOscAudio(eo);
  const motorRow = document.getElementById('eoMotorRow'+id);
  if(motorRow) motorRow.style.display = 'flex';
  const motorSel = document.getElementById('eoMotor'+id);
  if(motorSel){
    if(typeof refreshMotorSelects==='function') refreshMotorSelects();
    motorSel.value = String(eo.motor||1);
    motorSel.addEventListener('change', function(){
      eo.motor = parseInt(this.value)||1;
      this.style.color = eo.motor>=2 ? 'var(--accent2)' : 'var(--accent)';
      liveUpdateFreqs(); updateFreqDisplay();
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }
  const eoBidirSideRow = document.getElementById('eoBidirSideRow'+id);
  const eoBidirSideSel = document.getElementById('eoBidirSide'+id);
  if(eoBidirSideRow && eoBidirSideSel){
    const isBidirNow = (spatialFxMode === 'rotationalBidir' || spatialFxMode === 'directionalBidir');
    eoBidirSideRow.style.display = isBidirNow ? 'flex' : 'none';
    if(!eo.bidirSide) eo.bidirSide = 1;
    eoBidirSideSel.value = String(eo.bidirSide);
    eoBidirSideSel.style.color = sideDropdownColor(eoBidirSideSel.value);
    eoBidirSideSel.addEventListener('change', function(){
      eo.bidirSide = this.value === 'both' ? 'both' : (parseInt(this.value) || 1);
      this.style.color = sideDropdownColor(this.value);
      if(typeof pushGains === 'function') pushGains(0.03);
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }

  const collapseBtnEl = document.getElementById('eoCollapseBar'+id);
  if(collapseBtnEl){
    collapseBtnEl.style.display = 'flex';
    collapseBtnEl.title = (eo.type === 'rotor') ? 'Collapse Stator & Vanes' : 'Collapse';
    collapseBtnEl.addEventListener('click', function(){
      if(eo.type === 'rotor'){
        eo.childrenCollapsed = !eo.childrenCollapsed;
        this.classList.toggle('collapsed', eo.childrenCollapsed);
        this.title = eo.childrenCollapsed ? 'Expand Stator & Vanes' : 'Collapse Stator & Vanes';
        document.querySelectorAll('[data-parent-rotor="'+id+'"]').forEach(k=>{
          k.style.display = eo.childrenCollapsed ? 'none' : '';
        });
        const statorItemEl = document.getElementById('statorItem'+id);
        if(statorItemEl) statorItemEl.style.display = eo.childrenCollapsed ? 'none' : '';
      } else {
        const bodyEl = document.getElementById('eoBody'+id);
        if(!bodyEl) return;
        const collapsed = bodyEl.style.display === 'none';
        bodyEl.style.display = collapsed ? '' : 'none';
        this.classList.toggle('collapsed', !collapsed);
        this.title = collapsed ? 'Collapse' : 'Expand';
      }
    });
  }
  const addVaneBtnEl = document.getElementById('eoAddVane'+id);
  if(addVaneBtnEl){
    addVaneBtnEl.addEventListener('click', function(){
      addExtraOsc('vane', id);
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }

  if(!isChild && effectiveType === 'rotor'){
    eo.statorLinked = true;
    eo.statorColor = '#e5a61f';
    eo.statorVal = null;
    eo.statorMixerVal = 40;
    eo.statorEnabled = true;
    eo.statorOscNode = null;
    eo.statorGainNode = null;
    eo.statorVisible = true;
    addStatorItem(eo);
  }

  if(initialType && initialType !== 'rotor'){
    const typeEl = document.getElementById('eoType'+id);
    if(typeEl){ typeEl.value = initialType; typeEl.dispatchEvent(new Event('change')); }
  }

  if(isChild){
    nestVaneUnderParentRotor(eo);
  } else if(initialType === 'rotor'){
    addExtraOsc('vane', id);
  }

  rebuildFreqPages();
  liveUpdateFreqs(); updateFreqDisplay();
  refreshDefaultWaveformLabels();
  if(typeof syncMixerOrderWithOscillatorSection === 'function') syncMixerOrderWithOscillatorSection();
  if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  return eo;
}

function addPermRotorVane(chopperKey){
  const eo = addExtraOsc('vane', chopperKey);
  if(!eo) return;
  if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
}

function nestVaneUnderParentRotor(eo){
  const parentId = eo.parentRotorId || (eo.linkedChopper && eo.linkedChopper.indexOf('eo')===0 ? parseInt(eo.linkedChopper.slice(2),10) : (eo.linkedChopper==='hp'||eo.linkedChopper==='lp' ? eo.linkedChopper : null));
  if(!parentId) return;
  const isPermParent = (parentId === 'hp' || parentId === 'lp');
  let parentCollapsed = false;
  if(isPermParent){
    const permIdStr = parentId === 'hp' ? 'Hp' : 'Lp';
    const permBodyEl = document.getElementById('permBody'+permIdStr);
    parentCollapsed = !!(permBodyEl && permBodyEl.style.display === 'none');
  } else {
    const parentEo = extraOscs.find(e=>e.id===parentId && e.type==='rotor');
    if(!parentEo) return;
    parentCollapsed = !!parentEo.childrenCollapsed;
  }
  const item = document.getElementById('eoItem'+eo.id);
  const container = get('extraOscList');
  if(!item || !container) return;
  const kids = Array.from(container.querySelectorAll('[data-parent-rotor="'+parentId+'"]')).filter(el=>el!==item);
  let anchor = kids.length ? kids[kids.length-1] : null;
  if(!anchor){
    if(isPermParent){
      const permIdStr = parentId === 'hp' ? 'Hp' : 'Lp';
      anchor = document.getElementById('permStatorItem'+permIdStr) || document.getElementById('permOsc'+permIdStr);
    } else {
      anchor = document.getElementById('statorItem'+parentId) || document.getElementById('eoItem'+parentId);
    }
  }
  if(anchor) container.insertBefore(item, anchor.nextSibling);
  item.classList.add('eo-vane-child');
  item.dataset.parentRotor = String(parentId);
  eo.parentRotorId = parentId;
  const typeEntry = document.getElementById('eoTypeEntry'+eo.id);
  if(typeEntry) typeEntry.style.display = 'none';
  const linkedRow = document.getElementById('eoLinkedRow'+eo.id);
  if(linkedRow) linkedRow.style.display = 'none';
  if(parentCollapsed) item.style.display = 'none';
}

