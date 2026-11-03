const eyeOpenSVG  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeClosedSVG= `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function _updatePermVaneEyeFromRotor(vaneId, show){
  const btn = document.getElementById('permEye'+vaneId);
  if(!btn) return;
  btn.style.color  = show ? 'var(--accent)' : 'var(--muted)';
  btn.style.borderColor = show ? 'var(--border)' : 'transparent';
  btn.style.opacity = show ? '1' : '0.4';
  btn.innerHTML = show ? eyeOpenSVG : eyeClosedSVG;
}

function isRotorVisible(rotorKey){ return permOscVisible[rotorKey] !== false; }

function getPermStatorDisplayName(id, st){
  return (st.name && st.name.length > 0) ? st.name : 'Stator';
}
function isVaneVisible(vaneKey){
  if(!permOscVisible[vaneKey]) return false;
  if(vaneKey === 'hv' && !permOscVisible['hp']) return false;
  if(vaneKey === 'lv' && !permOscVisible['lp']) return false;
  return true;
}

function buildPermOscItem({id, name, color, valueId, valueMin, valueMax, valueDefault, linkedLabel, fillBtn, startOff, attenApplies}){
  const list = get('extraOscList');
  const wrap = document.createElement('div');
  const isVaneChild = (id === 'Hv' || id === 'Lv');
  wrap.className = 'extra-osc-item perm-osc' + (isVaneChild ? ' eo-vane-child' : '');
  if(isVaneChild){
    wrap.style.setProperty('border-left-color', color+'66', 'important');
    wrap.style.setProperty('border-top-color', color+'1F', 'important');
    wrap.style.setProperty('border-right-color', color+'1F', 'important');
    wrap.style.setProperty('border-bottom-color', color+'1F', 'important');
    wrap.dataset.parentRotor = (id === 'Hv') ? 'hp' : 'lp';
  }
  wrap.id = 'permOsc' + id;

  wrap.innerHTML = `
    <div class="eo-dim-wrap">
    <div class="extra-osc-header">
      <span class="eo-drag-handle" draggable="true" title="Drag to reorder"><svg viewBox="0 0 10 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="2.5" cy="2.5" r="1.6"/><circle cx="7.5" cy="2.5" r="1.6"/><circle cx="2.5" cy="8" r="1.6"/><circle cx="7.5" cy="8" r="1.6"/><circle cx="2.5" cy="13.5" r="1.6"/><circle cx="7.5" cy="13.5" r="1.6"/></svg></span>
      <input type="color" id="permColor${id}" value="${color}" title="Change color" style="width:22px;height:22px;border:none;border-radius:2px;cursor:pointer;padding:0;background:none;flex-shrink:0">
      <input type="text" id="permName${id}" value="${name}" maxlength="24" style="flex:1;background:var(--inset);border:1px solid var(--border);border-radius:2px;color:${color};font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;padding:2px 6px;text-transform:uppercase;min-width:0">
      <button id="permEye${id}" title="Show/hide in diagram" style="background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--accent);width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;transition:border-color .12s,color .12s">${eyeOpenSVG}</button>
      <button class="vbtn btn-accent" id="permEnable${id}" style="font-size:10px;padding:2px 7px;letter-spacing:1px;flex-shrink:0">ON</button>
    </div>

    <div id="permBody${id}">
    <div class="entry" id="permWaveformRow${id}" style="margin-bottom:5px;margin-top:6px">
      <label>Waveform</label>
      <select id="permWaveform${id}" style="color:var(--accent2)">
        <option value="default" selected>Default (Timbre)</option>
        <option value="sine">Sine</option>
        <option value="triangle">Triangle</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="square">Square</option>
        <option value="parabolic">Parabolic</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:2px">
      <label style="font-size:8px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">${linkedLabel||'Value'}</label>
      <input type="number" id="permVal${id}" value="${valueDefault}" min="${valueMin}" max="${valueMax}" style="flex:1;color:${color};background:var(--inset);border:1px solid var(--border);border-radius:2px;font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 5px;min-width:0">
      ${fillBtn ? `<button class="vbtn btn-gray" id="permFill${id}" style="font-size:8px;padding:1px 6px;letter-spacing:1px;flex-shrink:0">FILL</button>` : ''}
    </div>
    ${attenApplies ? `
    <!-- Attenuate (filter) fields — High Vanes / Low Vanes / Undertone / Overtone only -->
    <div id="permAttenWrap${id}" style="margin-top:4px">
      <div class="toggle-row" style="margin-bottom:4px"><label class="toggle"><input type="checkbox" id="permAtten${id}"><span class="toggle-slider"></span></label><label class="toggle-label" for="permAtten${id}" style="cursor:pointer">Attenuation (Fine Rasp)</label></div>
      <div id="permAttenFields${id}" style="display:none;padding-left:6px;border-left:2px solid var(--border);margin-bottom:4px">
        <div class="entry" style="margin-bottom:4px"><label>Filter</label>
          <select id="permAttenFilterType${id}" style="color:var(--accent2)">
            <option value="lowpass" selected>Low Pass</option>
            <option value="highpass">High Pass</option>
          </select>
        </div>
        <div class="entry" style="margin-bottom:4px"><label>Cutoff (Hz)</label><input type="number" id="permAttenCutoff${id}" value="1000" min="20" max="20000" step="1" style="color:var(--accent2)"></div>
        <div class="entry" style="margin-bottom:4px"><label>Resonance</label><input type="number" id="permAttenQ${id}" value="0.7071" min="0.1" max="20" step="0.1" style="color:var(--accent2)"></div>
        <div class="entry" style="margin-bottom:4px"><label>Curve</label>
          <select id="permAttenCurve${id}" style="color:var(--accent2)">
            <option value="6">6 dB/oct</option>
            <option value="12" selected>12 dB/oct</option>
            <option value="24">24 dB/oct</option>
          </select>
        </div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:5px">
          <label style="font-size:8px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">DRY/WET</label>
          <input type="range" id="permAttenMix${id}" min="0" max="100" value="100" style="flex:1">
          <span id="permAttenMixVal${id}" style="font-size:9px;min-width:32px;text-align:right;color:var(--accent2)">100%</span>
        </div>
      </div>
    </div>
    ` : ''}
    ${raspHtml('perm', id)}
    <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">GROUP</label>
      <select id="seqGroupSel${id}" style="flex:1;font-size:9px;padding:2px 4px;color:var(--x-00e5a0,#00e5a0)"></select>
    </div>
    <div id="permMotorRow${id}" style="display:none;gap:6px;align-items:center;margin-top:5px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">MOTOR</label>
      <select id="permMotor${id}" style="flex:1;font-size:9px;padding:2px 4px;color:var(--accent2)">
        <option value="1">Motor 1</option>
        <option value="2">Motor 2</option>
      </select>
    </div>
    <div id="permBidirSideRow${id}" style="display:none;gap:6px;align-items:center;margin-top:5px">
      <label style="font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">SIDE</label>
      <select id="permBidirSide${id}" style="flex:1;font-size:9px;padding:2px 4px">
        <option value="1" style="color:var(--led)">Side 1 - North</option>
        <option value="2" style="color:var(--blue)">Side 2 - South</option>
        <option value="both" style="color:var(--purple)">Both Sides</option>
      </select>
    </div>
    ${(id==='Hp'||id==='Lp') ? `<div id="permAddVaneWrap${id}" style="margin-top:6px;text-align:right"><button id="permAddVane${id}" class="add-vane-btn">+ Vane</button></div>` : ''}
    </div>
    </div>
    <div id="permCollapseBar${id}" class="eo-collapse-bar" title="Collapse">
      <svg viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  `;
  list.appendChild(wrap);
  wireEoDragHandle(wrap.querySelector('.eo-drag-handle'), wrap);

  const hiddenVal = get(valueId);
  const permValInput = document.getElementById('permVal'+id);


  const permNameInput = document.getElementById('permName'+id);
  const permColorInput = document.getElementById('permColor'+id);
  const permEnableBtn = document.getElementById('permEnable'+id);
  const permEyeBtn   = document.getElementById('permEye'+id);
  let permEnabled = true;
  let permColor = color;

  const gainKeyMap2 = {Hp:'hp',Hv:'hv',Lp:'lp',Lv:'lv',Ut:'ut',Ot:'ot'};
  const permGainKey = gainKeyMap2[id];
  const permGroupSel = document.getElementById('seqGroupSel'+id);
  if(permGroupSel){
    _fillGroupDropdown(permGroupSel, oscGroupAssign[permGainKey]||0);
    permGroupSel.addEventListener('change', function(){
      if(this.value==='__add__'){
        addSeqGroup();
        this.value=seqNumGroups-1;
        oscGroupAssign[permGainKey]=seqNumGroups-1;
      } else {
        oscGroupAssign[permGainKey]=parseInt(this.value)||0;
      }
      permGroupSel.style.color=SEQ_GROUP_COLORS[oscGroupAssign[permGainKey]||0];
      if(seqModeActive&&audioCtx) applySeqStep();
    });
    permGroupSel.style.color=SEQ_GROUP_COLORS[oscGroupAssign[permGainKey]||0];
  }

  raspWire('perm', id, permRasp[permGainKey], function(){ raspRefresh(oscNodes[permGainKey]); }, function(){ return oscNodes[permGainKey]; });

  if(attenApplies && permAtten[permGainKey]){
    const pa = permAtten[permGainKey];
    const attenChk = document.getElementById('permAtten'+id);
    const attenFieldsEl = document.getElementById('permAttenFields'+id);
    const attenFilterTypeEl = document.getElementById('permAttenFilterType'+id);
    const attenCutoffEl = document.getElementById('permAttenCutoff'+id);
    const attenQEl = document.getElementById('permAttenQ'+id);
    const attenCurveEl = document.getElementById('permAttenCurve'+id);
    const attenMixEl = document.getElementById('permAttenMix'+id);
    const attenMixValEl = document.getElementById('permAttenMixVal'+id);
    if(attenChk){
      attenChk.checked = pa.enabled;
      attenChk.addEventListener('change', function(){
        pa.enabled = this.checked;
        if(attenFieldsEl) attenFieldsEl.style.display = this.checked ? '' : 'none';
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
    if(attenFilterTypeEl){
      attenFilterTypeEl.value = pa.filterType;
      attenFilterTypeEl.addEventListener('change', function(){
        pa.filterType = this.value;
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
    if(attenCutoffEl){
      attenCutoffEl.value = pa.cutoff;
      attenCutoffEl.addEventListener('input', function(){
        pa.cutoff = parseFloat(this.value) || 1000;
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
    if(attenQEl){
      attenQEl.value = pa.q;
      attenQEl.addEventListener('input', function(){
        pa.q = parseFloat(this.value) || 0.7071;
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
    if(attenCurveEl){
      attenCurveEl.value = pa.curve;
      attenCurveEl.addEventListener('change', function(){
        pa.curve = this.value;
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
    if(attenMixEl){
      attenMixEl.value = pa.mix;
      if(attenMixValEl) attenMixValEl.textContent = pa.mix + '%';
      attenMixEl.addEventListener('input', function(){
        pa.mix = parseFloat(this.value) || 0;
        if(attenMixValEl) attenMixValEl.textContent = pa.mix + '%';
        refreshPermAttenRouting(permGainKey);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }
  }

  const permMotorRow = document.getElementById('permMotorRow'+id);
  const permMotorSel = document.getElementById('permMotor'+id);
  if(permMotorRow && permMotorSel){
    if(permMotorRow) permMotorRow.style.display='flex';
    permMotorSel.value = String(permOscMotor[permGainKey]||1);
    permMotorSel.style.color = (permOscMotor[permGainKey]>=2) ? 'var(--accent2)' : 'var(--accent)';
    permMotorSel.addEventListener('change', function(){
      permOscMotor[permGainKey] = parseInt(this.value)||1;
      this.style.color = permOscMotor[permGainKey]>=2 ? 'var(--accent2)' : 'var(--accent)';
      liveUpdateFreqs(); updateFreqDisplay();
    });
  }

  const permBidirSideRow = document.getElementById('permBidirSideRow'+id);
  const permBidirSideSel = document.getElementById('permBidirSide'+id);
  if(permBidirSideRow && permBidirSideSel){
    const isBidirNow = (spatialFxMode === 'rotationalBidir' || spatialFxMode === 'directionalBidir');
    permBidirSideRow.style.display = isBidirNow ? 'flex' : 'none';
    permBidirSideSel.value = String(oscSideAssign[permGainKey] || 1);
    permBidirSideSel.style.color = sideDropdownColor(permBidirSideSel.value);
    permBidirSideSel.addEventListener('change', function(){
      oscSideAssign[permGainKey] = this.value === 'both' ? 'both' : (parseInt(this.value) || 1);
      this.style.color = sideDropdownColor(this.value);
      if(typeof pushGains === 'function') pushGains(0.03);
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }

  const permWaveformSel = document.getElementById('permWaveform'+id);
  if(permWaveformSel){
    permWaveformSel.value = permOscWaveform[permGainKey] || 'default';
    permWaveformSel.addEventListener('change', function(){
      permOscWaveform[permGainKey] = this.value;
      if(audioCtx){
        const v = getV();
        const wf = getPermWaveform(permGainKey, v.waveform);
        if(oscNodes[permGainKey]){ oscNodes['_wf_'+permGainKey] = wf; setOscWaveform(oscNodes[permGainKey], wf); }
        if(permGainKey==='hp' && oscNodes.hpSt) setOscWaveform(oscNodes.hpSt, wf);
        if(permGainKey==='lp' && oscNodes.lpSt) setOscWaveform(oscNodes.lpSt, wf);
      }
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  }

  const permCollapseBtn = document.getElementById('permCollapseBar'+id);
  if(permCollapseBtn){
    const permBodyEl = document.getElementById('permBody'+id);
    permCollapseBtn.addEventListener('click', function(){
      const collapsed = permBodyEl.style.display === 'none';
      permBodyEl.style.display = collapsed ? '' : 'none';
      this.classList.toggle('collapsed', !collapsed);
      this.title = collapsed ? 'Collapse' : 'Expand';
      if(id==='Hp'||id==='Lp'){
        const key = id==='Hp' ? 'hp' : 'lp';
        document.querySelectorAll('[data-parent-rotor="'+key+'"]').forEach(k=>{
          k.style.display = collapsed ? '' : 'none';
        });
        const statorEl = document.getElementById('permStatorItem'+id);
        if(statorEl) statorEl.style.display = collapsed ? '' : 'none';
      }
    });
  }

  const gainKeyMap = {Hp:'hp',Hv:'hv',Lp:'lp',Lv:'lv',Ut:'ut',Ot:'ot'};
  permEyeBtn.addEventListener('click', function(){
    const gk = gainKeyMap[id];
    permOscVisible[gk] = !permOscVisible[gk];
    const visible = permOscVisible[gk];
    this.style.color  = visible ? 'var(--accent)' : 'var(--muted)';
    this.style.borderColor = visible ? 'var(--border)' : 'transparent';
    this.style.opacity = visible ? '1' : '0.4';
    this.innerHTML = visible ? eyeOpenSVG : eyeClosedSVG;
    if(id === 'Hp' || id === 'Lp'){
      const vaneKey = id === 'Hp' ? 'hv' : 'lv';
      if(!visible){
        _updatePermVaneEyeFromRotor(id === 'Hp' ? 'Hv' : 'Lv', false);
      } else {
        _updatePermVaneEyeFromRotor(id === 'Hp' ? 'Hv' : 'Lv', permOscVisible[vaneKey]);
      }
    }
    redrawChoppers(chopperAngleA, chopperAngleB);
  });

  if(hiddenVal && permValInput){
    permValInput.addEventListener('input', function(){
      if(parseFloat(this.value) > 49){ this.value = 49; }
      hiddenVal.value = this.value;
      liveUpdateFreqs(); updateFreqDisplay();
      if(id === 'Hp' || id === 'Lp'){
        const stKey = id === 'Hp' ? 'hp' : 'lp';
        const st = permStator[stKey];
        if(st && st.linked){
          const portEl = document.getElementById('permStatorPort'+id);
          if(portEl) portEl.value = this.value;
        }
      }
      if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    });
  }

  permColorInput.addEventListener('input', function(){
    permColor = this.value;
    permNameInput.style.color = permColor;
    permValInput.style.color = permColor;
    const mixRow = document.getElementById('permMixRow'+id);
    if(mixRow){
      const lbl = mixRow.querySelector('.slider-label');
      if(lbl) lbl.style.color = permColor;
      const sv = mixRow.querySelector('.slider-val');
      if(sv) sv.style.color = permColor;
      const sl = mixRow.querySelector('input[type=range]');
      if(sl) sl.style.accentColor = permColor;
    }
    if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    if(isVaneChild){
      wrap.style.setProperty('border-left-color', permColor+'66', 'important');
      wrap.style.setProperty('border-top-color', permColor+'1F', 'important');
      wrap.style.setProperty('border-right-color', permColor+'1F', 'important');
      wrap.style.setProperty('border-bottom-color', permColor+'1F', 'important');
    }
  });

  permNameInput.addEventListener('input', function(){
    const mixRow = document.getElementById('permMixRow'+id);
    if(mixRow){ const lbl=mixRow.querySelector('.slider-label'); if(lbl) lbl.textContent=this.value||''; }
    if(id === 'Hp'){
      const lblA = document.getElementById('chopperLabelA');
      if(lblA) lblA.textContent = this.value || 'HIGH ROTOR';
    } else if(id === 'Lp'){
      const lblB = document.getElementById('chopperLabelB');
      if(lblB) lblB.textContent = this.value || 'LOW ROTOR';
    }
  });

  permEnableBtn.addEventListener('click', function(){
    permEnabled = !permEnabled;
    this.textContent = permEnabled ? 'ON' : 'OFF';
    this.className = permEnabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
    wrap.classList.toggle('eo-off', !permEnabled);
    const gainKey = {Hp:'hp',Hv:'hv',Lp:'lp',Lv:'lv',Ut:'ut',Ot:'ot'}[id];
    if(gainKey) permOscEnabled[gainKey] = permEnabled;
    if(gainKey && (gainKey==='hp'||gainKey==='lp'||gainKey==='hv'||gainKey==='lv')){
      permOscVisible[gainKey] = permEnabled;
      const eyeBtn = document.getElementById('permEye'+id);
      if(eyeBtn){
        eyeBtn.style.color       = permEnabled ? 'var(--accent)' : 'var(--muted)';
        eyeBtn.style.borderColor = permEnabled ? 'var(--border)' : 'transparent';
        eyeBtn.style.opacity     = permEnabled ? '1' : '0.4';
        eyeBtn.innerHTML         = permEnabled ? eyeOpenSVG : eyeClosedSVG;
      }
      if(gainKey==='hp'||gainKey==='lp'){
        const vaneKey = gainKey==='hp' ? 'hv' : 'lv';
        const vaneId  = gainKey==='hp' ? 'Hv' : 'Lv';
        _updatePermVaneEyeFromRotor(vaneId, permEnabled ? permOscVisible[vaneKey] : false);
      }
      redrawChoppers(chopperAngleA, chopperAngleB);
    }
    if(audioCtx && gainNodes){
      const gn = gainKey && gainNodes[gainKey];
      if(gn){
        const v = permEnabled ? computeGain(gainKey, getV(), get('dChopper').value!=='single') : 0;
        gn.gain.setTargetAtTime(v, audioCtx.currentTime, 0.04);
      }
    }
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  if(fillBtn){
    document.getElementById('permFill'+id).addEventListener('click', function(){
      const hp = parseFloat(get('eHigherPort').value)||12;
      const lp = parseFloat(get('eLowerPort').value)||10;
      const filled = gcd(hp,lp);
      permValInput.value = filled;
      if(hiddenVal) hiddenVal.value = filled;
      liveUpdateFreqs(); updateFreqDisplay();
    });
  }

  if(id==='Hp'||id==='Lp'){
    const addVaneBtn = document.getElementById('permAddVane'+id);
    if(addVaneBtn){
      addVaneBtn.addEventListener('click', function(){
        addPermRotorVane(id==='Hp' ? 'hp' : 'lp');
      });
    }
  }

  if(startOff){
    permEnabled = false;
    permEnableBtn.textContent = 'OFF';
    permEnableBtn.className = 'vbtn btn-gray';
    wrap.classList.add('eo-off');
    const gainKey = {Hp:'hp',Hv:'hv',Lp:'lp',Lv:'lv',Ut:'ut',Ot:'ot'}[id];
    if(gainKey) permOscEnabled[gainKey] = false;
  }

  if(id === 'Hp' || id === 'Lp'){
    const stKey = id === 'Hp' ? 'hp' : 'lp';
    const st = permStator[stKey];
    const statorWrap = document.createElement('div');
    statorWrap.className = 'extra-osc-item stator-osc-item';
    statorWrap.id = 'permStatorItem'+id;
    statorWrap.style.cssText = 'margin-left:12px;border-left:2px solid rgba(229,166,31,.25);border-color:'+st.color+'40';
    statorWrap.innerHTML = `
      <div class="extra-osc-header" style="margin-bottom:5px">
        <input type="color" id="permStatorColor${id}" value="${st.color}" title="Change stator color" style="width:22px;height:22px;border:none;border-radius:2px;cursor:pointer;padding:0;background:none;flex-shrink:0">
        <input type="text" id="permStatorName${id}" value="${st.name||''}" placeholder="Stator" maxlength="24" style="flex:1;background:var(--inset);border:1px solid var(--border);border-radius:2px;color:${st.color};opacity:.85;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:1.5px;padding:2px 6px;text-transform:uppercase;min-width:0">
        <button id="permStatorEye${id}" title="Show/hide in diagram" style="background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--accent);width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;transition:border-color .12s,color .12s">${eyeOpenSVG}</button>
        <button class="vbtn" id="permStatorLink${id}" title="Link/unlink stator to rotor port" style="background:${st.color}33;font-size:10px;padding:2px 7px;letter-spacing:1px;border-color:${st.color};color:${st.color};flex-shrink:0">UNLINK</button>
      </div>
      <div id="permStatorBody${id}">
      <div style="display:flex;gap:6px;align-items:center">
        <label style="font-size:11px;color:var(--muted);letter-spacing:1px;white-space:nowrap;min-width:48px;font-family:'Share Tech Mono',monospace;text-transform:uppercase">Port</label>
        <input type="number" id="permStatorPort${id}" value="${st.val||valueDefault}" min="1" max="49" style="flex:1;color:${st.color};background:var(--inset);border:1px solid var(--border);border-radius:2px;font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 5px;min-width:0" disabled>
      </div>
      </div>
      <div id="permStatorCollapseBar${id}" class="eo-collapse-bar" title="Collapse">
        <svg viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `;
    list.appendChild(statorWrap);

    const permStatorCollapseBtn = document.getElementById('permStatorCollapseBar'+id);
    if(permStatorCollapseBtn){
      const permStatorBodyEl = document.getElementById('permStatorBody'+id);
      permStatorCollapseBtn.addEventListener('click', function(){
        const collapsed = permStatorBodyEl.style.display === 'none';
        permStatorBodyEl.style.display = collapsed ? '' : 'none';
        this.classList.toggle('collapsed', !collapsed);
        this.title = collapsed ? 'Collapse' : 'Expand';
      });
    }

    document.getElementById('permStatorColor'+id).addEventListener('input', function(){
      st.color = this.value;
      statorWrap.style.borderColor = st.color+'40';
      document.getElementById('permStatorName'+id).style.color = st.color;
      const portEl = document.getElementById('permStatorPort'+id);
      if(portEl) portEl.style.color = st.color;
      const linkBtnEl = document.getElementById('permStatorLink'+id);
      if(linkBtnEl && st.linked){ linkBtnEl.style.borderColor = st.color; linkBtnEl.style.color = st.color; }
      const mixRow = document.getElementById('permStatorMixRow'+id);
      if(mixRow){
        const sl=mixRow.querySelector('input[type=range]'); if(sl) sl.style.accentColor=st.color;
        const sv=mixRow.querySelector('.slider-val'); if(sv) sv.style.color=st.color;
        const lbl=mixRow.querySelector('.slider-label'); if(lbl) lbl.style.color=st.color;
      }
      if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    });

    document.getElementById('permStatorPort'+id).addEventListener('input', function(){
      st.val = parseFloat(this.value)||1;
      liveUpdateFreqs(); updateFreqDisplay();
      if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    });

    document.getElementById('permStatorName'+id).addEventListener('input', function(){
      st.name = this.value;
      const mixRow = document.getElementById('permStatorMixRow'+id);
      if(mixRow){
        const lbl = mixRow.querySelector('.slider-label');
        if(lbl) lbl.textContent = getPermStatorDisplayName(id, st);
      }
      if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });

    document.getElementById('permStatorLink'+id).addEventListener('click', function(){
      st.linked = !st.linked;
      _applyPermStatorLinkState(id, stKey);
    });

    const permStatorEyeBtn = document.getElementById('permStatorEye'+id);
    if(permStatorEyeBtn){
      if(st.visible === undefined) st.visible = true;
      permStatorEyeBtn.innerHTML = st.visible ? eyeOpenSVG : eyeClosedSVG;
      permStatorEyeBtn.style.color       = st.visible ? 'var(--accent)' : 'var(--muted)';
      permStatorEyeBtn.style.borderColor = st.visible ? 'var(--border)' : 'transparent';
      permStatorEyeBtn.style.opacity     = st.visible ? '1' : '0.4';
      permStatorEyeBtn.addEventListener('click', function(){
        st.visible = !st.visible;
        this.innerHTML = st.visible ? eyeOpenSVG : eyeClosedSVG;
        this.style.color       = st.visible ? 'var(--accent)' : 'var(--muted)';
        this.style.borderColor = st.visible ? 'var(--border)' : 'transparent';
        this.style.opacity     = st.visible ? '1' : '0.4';
        if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
        if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
      });
    }

    function addPermStatorMixerSlider(){
      const existingRow = document.getElementById('permStatorMixRow'+id);
      if(existingRow) return;
      const mainMixSliderId = id === 'Hp' ? 'sHP' : 'sLP';
      const mainSlider = get(mainMixSliderId);
      const mixerContainer = mainSlider ? mainSlider.closest('.slider-row').parentElement : null;
      if(!mixerContainer) return;
      const mainRow = mainSlider ? mainSlider.closest('.slider-row') : null;
      const row = document.createElement('div');
      row.className = 'slider-row';
      row.id = 'permStatorMixRow'+id;
      const initVal = st.mixerVal ?? 40;
      row.innerHTML = `<span class="slider-label" style="color:${st.color}">${getPermStatorDisplayName(id, st)}</span><input type="range" id="sPermStator${id}" min="0" max="100" step="1" value="${initVal}" style="accent-color:${st.color}"><span class="slider-val" id="svPermStator${id}" style="color:${st.color}">${initVal}%</span>`;
      if(mainRow && mainRow.nextSibling) mixerContainer.insertBefore(row, mainRow.nextSibling);
      else if(mainRow) mainRow.parentElement.insertBefore(row, mainRow.nextSibling||null);
      else mixerContainer.appendChild(row);
      document.getElementById('sPermStator'+id).addEventListener('input', function(){
        st.mixerVal = parseFloat(this.value);
        document.getElementById('svPermStator'+id).textContent = this.value+'%';
        pushGains(0.04);
      });
    }

    statorWrap._addMixerSlider = addPermStatorMixerSlider;
  }
}

function _applyPermStatorLinkState(id, stKey){
  const st = permStator[stKey];
  const portEl = document.getElementById('permStatorPort'+id);
  const linkBtn = document.getElementById('permStatorLink'+id);
  const hiddenPortId = id === 'Hp' ? 'eHigherPort' : 'eLowerPort';
  const defaultPortVal = parseFloat(get(hiddenPortId).value)||1;

  if(st.linked){
    if(linkBtn){ linkBtn.textContent='UNLINK'; linkBtn.style.background=st.color+'33'; linkBtn.style.borderColor=st.color; linkBtn.style.color=st.color; }
    if(portEl){ portEl.disabled=true; portEl.style.opacity='0.4'; portEl.value=defaultPortVal; portEl.style.color=st.color; }
    const mixRow = document.getElementById('permStatorMixRow'+id);
    if(mixRow) mixRow.remove();
  } else {
    if(linkBtn){ linkBtn.textContent='LINK'; linkBtn.style.background='transparent'; linkBtn.style.borderColor='var(--muted)'; linkBtn.style.color='var(--muted)'; }
    if(portEl){ portEl.disabled=false; portEl.style.opacity='1'; if(st.val) portEl.value=st.val; portEl.style.color=st.color; }
    const statorWrap = document.getElementById('permStatorItem'+id);
    if(statorWrap && statorWrap._addMixerSlider && !document.getElementById('permStatorMixRow'+id)){
      statorWrap._addMixerSlider();
    }
  }
  pushGains(0.04);
  liveUpdateFreqs(); updateFreqDisplay();
  if(!chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
}

function initPermOscs(){
  buildPermOscItem({
    id:'Hp', name:'Rotor 1', color:'#757575',
    valueId:'eHigherPort', valueMin:1, valueMax:49, valueDefault:12,
    linkedLabel:'Port'
  });
  buildPermOscItem({
    id:'Hv', name:'Vane 1', color:'#757575',
    valueId:'eHigherVanes', valueMin:1, valueMax:49, valueDefault:4,
    linkedLabel:'Vanes', attenApplies:true
  });
  buildPermOscItem({
    id:'Lp', name:'Rotor 2', color:'#757575',
    valueId:'eLowerPort', valueMin:1, valueMax:49, valueDefault:10,
    linkedLabel:'Port'
  });
  buildPermOscItem({
    id:'Lv', name:'Vane 2', color:'#757575',
    valueId:'eLowerVanes', valueMin:1, valueMax:49, valueDefault:5,
    linkedLabel:'Vanes', attenApplies:true
  });
  buildPermOscItem({
    id:'Ut', name:'Undertone', color:'#80c090',
    valueId:'eUndertone', valueMin:1, valueMax:49, valueDefault:2,
    linkedLabel:'Divisor', fillBtn:true, attenApplies:true
  });
  buildPermOscItem({
    id:'Ot', name:'Overtone', color:'#80c090',
    valueId:'eOvertone', valueMin:1, valueMax:49, valueDefault:3,
    linkedLabel:'Multiplier', startOff:true, attenApplies:true
  });

  const mixRowMap = {Hp:'sHP', Hv:'sHVane', Lp:'sLP', Lv:'sLVane', Ut:'sUT', Ot:'sOT'};
  Object.entries(mixRowMap).forEach(([pid, sliderId])=>{
    const slider = get(sliderId);
    if(slider){
      const row = slider.closest('.slider-row');
      if(row){
        row.id = 'permMixRow'+pid;
        const lbl = row.querySelector('.slider-label');
        const nameInput = document.getElementById('permName'+pid);
        if(lbl && nameInput) lbl.textContent = nameInput.value;
      }
    }
  });
}
initPermOscs();
refreshDefaultWaveformLabels();

