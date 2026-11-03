const CONST_EXTRA_COLORS = ['#f59e0b','#ef4444','#10b981','#f472b6','#38bdf8','#fb923c','#a3e635','#e879f9'];

const CONSTS = ['A', 'B'];

let constNodes = {
  A: { enabled: false, osc: null, noise: null, noiseGain: null, gain: null, lpf: null, splitGain: null,
       blowerLink: false, blowerWindState: 'idle', blowerWindAnimId: null, blowerWindStart: null, blowerWindStartFreq: 0 },
  B: { enabled: false, osc: null, noise: null, noiseGain: null, gain: null, lpf: null, splitGain: null,
       blowerLink: false, blowerWindState: 'idle', blowerWindAnimId: null, blowerWindStart: null, blowerWindStartFreq: 0 }
};

function getConstColor(id) {
  if (id === 'A') return 'var(--accent2)';
  if (id === 'B') return 'var(--purple)';
  const idx = CONSTS.indexOf(id) - 2;
  return CONST_EXTRA_COLORS[idx % CONST_EXTRA_COLORS.length];
}

function createConstHTML(id) {
  const col = getConstColor(id);
  const colorVal = col.startsWith('var') ? col : col;
  const item = document.createElement('div');
  item.id = 'constItem_' + id;
  item.style.cssText = 'background:var(--inset);border:1px solid var(--border);border-radius:2px;padding:7px 9px;margin-bottom:6px';
  item.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:9px;letter-spacing:1.5px;color:${colorVal};text-transform:uppercase">${id}</span>
      <div style="display:flex;align-items:center;gap:5px">
        <button class="vbtn btn-gray" id="btnConst${id}Enable" style="font-size:10px;padding:2px 7px;letter-spacing:1px">ENABLE</button>
        <button class="vbtn btn-red" id="btnConst${id}Remove" style="font-size:10px;padding:2px 7px;letter-spacing:1px" title="Remove this constant"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button>
      </div>
    </div>
    <div id="const${id}Body" class="disabled-overlay">
      <div class="entry-grid" style="gap:5px;margin-bottom:5px">
        <div class="entry">
          <label>Frequency (Hz)</label>
          <input type="number" id="nConst${id}Freq" value="120" min="1" max="20000" step="1" style="color:${colorVal}">
        </div>
        <div class="entry">
          <label>Waveform</label>
          <select id="dConst${id}Wave" style="color:${colorVal}">
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square" selected>Square</option>
            <option value="noise">White Noise</option>
          </select>
        </div>
        <div class="entry">
          <label>Volume</label>
          <div style="display:flex;align-items:center;gap:5px">
            <input type="range" id="sConst${id}Vol" min="0" max="100" step="1" value="4" style="accent-color:${colorVal};flex:1">
            <span class="slider-val" id="svConst${id}Vol" style="color:${colorVal};width:32px">4%</span>
          </div>
        </div>
        <div class="entry">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><label>LPF Cutoff (%)</label><label class="toggle" title="Turn the RPM-linked LPF cutoff on / off. Off = filter wide open (no cutoff)"><input type="checkbox" id="tConst${id}LpfOn" checked><span class="toggle-slider"></span></label></div>
          <div style="display:flex;align-items:center;gap:5px">
            <input type="range" id="sConst${id}Lpf" min="0" max="100" step="1" value="2" style="accent-color:${colorVal};flex:1">
            <span class="slider-val" id="svConst${id}Lpf" style="color:${colorVal};width:32px">2%</span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <label class="toggle" title="Link wind-up/wind-down to blower RPM thresholds">
          <input type="checkbox" id="tConst${id}BlowerLink">
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label" style="color:${colorVal};font-size:10px;letter-spacing:1px;text-transform:uppercase">Blower Link</span>
        <span id="const${id}BlowerLinkState" style="display:none;font-size:9px;letter-spacing:1px;margin-left:auto;color:var(--muted)">IDLE</span>
      </div>
      <div id="const${id}BlowerLinkPanel" style="display:none;background:var(--inset2);border:1px solid rgba(0,184,217,.2);border-radius:2px;padding:5px 8px;margin-bottom:5px">

      </div>
      <div style="font-size:8px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">RPM-Linked LPF <span id="const${id}LpfHz" style="color:${colorVal};margin-left:4px">-- Hz</span></div>
      <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
        <div id="const${id}LpfBar" style="height:100%;width:0%;background:${colorVal};border-radius:2px;transition:width .1s"></div>
      </div>

        <div class="ccpos" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border);letter-spacing:1px">
          <div class="entry"><label>Position</label>
            <select id="dConst${id}Pos" style="color:${colorVal};letter-spacing:1px" title="Follow Position Effects = same Distance / Direction as the rotor. Controller Dot = its own omnidirectional source on the Position Map">
              <option value="follow" selected>Follow Position Effects</option>
              <option value="dot">Controller Dot</option>
            </select>
          </div>
          <div id="const${id}DotFields" style="display:none;margin-top:5px">
            <div class="entry-grid" style="gap:5px;letter-spacing:1px;grid-template-columns:1fr">
              <div class="entry"><label>DB @ 10FT</label><input type="number" id="nConst${id}Db10" value="126" min="0" max="220" step="1" style="color:${colorVal};letter-spacing:1px"></div>
              <div class="entry"><label>Curve Offset</label><div style="display:flex;align-items:center;gap:5px"><input type="range" id="nConst${id}Off" value="0" min="-100" max="100" step="1" style="accent-color:${colorVal};flex:1;letter-spacing:1px"><span class="slider-val" id="svConst${id}Off" style="color:${colorVal};width:36px;letter-spacing:1px">0</span></div></div>
              <div class="entry"><label>Steepness</label><div style="display:flex;align-items:center;gap:5px"><input type="range" id="nConst${id}Steep" value="0" min="-100" max="300" step="1" style="accent-color:${colorVal};flex:1;letter-spacing:1px"><span class="slider-val" id="svConst${id}Steep" style="color:${colorVal};width:36px;letter-spacing:1px">0</span></div></div>
            </div>
            <div id="const${id}DotRead" style="font-size:10px;color:var(--muted);letter-spacing:1px;margin-top:4px">--</div>
          </div>
          <div style="margin-top:6px;letter-spacing:1px"><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px">Dispersion Curve</div><canvas id="const${id}DispCv" style="width:100%;height:92px;display:block;border:1px solid var(--border);border-radius:3px;background:#0b0c0d"></canvas></div>
        </div>    </div>`;
  return item;
}

function wireConstBlowerLink(id) {
  const toggle = get('tConst' + id + 'BlowerLink');
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    const on = toggle.checked;
    const panel = get('const' + id + 'BlowerLinkPanel');
    const stateEl = get('const' + id + 'BlowerLinkState');
    if (panel) panel.style.display = on ? 'block' : 'none';
    if (stateEl) stateEl.style.display = on ? 'inline' : 'none';
    const c = constNodes[id];
    if (c) {
      c.blowerLink = on;
      if (!on) {
        if (c.blowerWindAnimId) { cancelAnimationFrame(c.blowerWindAnimId); c.blowerWindAnimId = null; }
        c.blowerWindState = 'idle';
        if (stateEl) { stateEl.textContent = 'IDLE'; stateEl.style.color = 'var(--muted)'; }
      }
    }
  });
}

function wireConst(id) {
  get('btnConst' + id + 'Enable').addEventListener('click', () => {
    const c = constNodes[id];
    c.enabled = !c.enabled;
    const btn = get('btnConst' + id + 'Enable');
    btn.textContent = c.enabled ? 'DISABLE' : 'ENABLE';
    btn.className   = c.enabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
    get('const' + id + 'Body').classList.toggle('disabled-overlay', !c.enabled);
    if (c.enabled) {
      ensureAudio();
      buildConst(id);
      updateConstLpf(id);
    } else {
      tearConst(id);
    }
  });

  get('nConst' + id + 'Freq').addEventListener('input', () => {
    const c = constNodes[id];
    if (!c.enabled) return;
    if (isConstRpmLinked(id)) return;
    if (c.blowerLink && c.blowerWindState !== 'up') return;
    const wave = get('dConst' + id + 'Wave').value;
    if (wave !== 'noise' && c.osc) {
      c.osc.frequency.setTargetAtTime(
        parseFloat(get('nConst' + id + 'Freq').value) || 120,
        audioCtx.currentTime, 0.02
      );
    }
  });

  { const _rpmToggle = get('tConst' + id + 'RpmLink');
    if (_rpmToggle) _rpmToggle.addEventListener('change', () => {
      const linked = isConstRpmLinked(id);
      const freqInput    = get('nConst' + id + 'Freq');
      const harmonicWrap = get('const' + id + 'HarmonicWrap');
      const freqDisplay  = get('const' + id + 'RpmFreqDisplay');
      if (freqInput)    { freqInput.disabled = linked; freqInput.style.opacity = linked ? '0.35' : '1'; }
      if (harmonicWrap)   harmonicWrap.style.display = linked ? 'flex' : 'none';
      if (freqDisplay)    freqDisplay.style.display  = linked ? 'inline' : 'none';
      updateConstFreq(id);
    });
  }

  { const _harmonic = get('nConst' + id + 'Harmonic');
    if (_harmonic) _harmonic.addEventListener('input', () => { updateConstFreq(id); }); }

  get('dConst' + id + 'Wave').addEventListener('change', () => {
    if (constNodes[id].enabled) buildConst(id);
  });

  get('sConst' + id + 'Vol').addEventListener('input', () => {
    get('svConst' + id + 'Vol').textContent = get('sConst' + id + 'Vol').value + '%';
    const c = constNodes[id];
    if (c.enabled && c.gain && audioCtx) {
      c.gain.gain.setTargetAtTime(
        parseFloat(get('sConst' + id + 'Vol').value) / 100,
        audioCtx.currentTime, 0.03
      );
    }
  });

  { const _on = get('tConst' + id + 'LpfOn'); if (_on) _on.addEventListener('change', () => updateConstLpf(id)); }

  get('sConst' + id + 'Lpf').addEventListener('input', () => {
    get('svConst' + id + 'Lpf').textContent = get('sConst' + id + 'Lpf').value + '%';
    updateConstLpf(id);
  });

  wireConstBlowerLink(id);

  const removeBtn = get('btnConst' + id + 'Remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      tearConst(id);
      const idx = CONSTS.indexOf(id);
      if (idx !== -1) CONSTS.splice(idx, 1);
      delete constNodes[id];
      const el = get('constItem_' + id);
      if (el) el.remove();
    });
  }
}

document.getElementById('btnAddConstant').addEventListener('click', () => {
  const alphabet = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
  let newId = null;
  for (let i = 0; i < alphabet.length; i++) {
    const candidate = alphabet[i];
    if (!CONSTS.includes(candidate)) { newId = candidate; break; }
  }
  if (!newId) return;
  CONSTS.push(newId);
  constNodes[newId] = {
    enabled: false, osc: null, noise: null, noiseGain: null, gain: null, lpf: null, splitGain: null,
    blowerLink: false, blowerWindState: 'idle', blowerWindAnimId: null, blowerWindStart: null, blowerWindStartFreq: 0
  };
  const list = document.getElementById('constList');
  list.appendChild(createConstHTML(newId));
  wireConst(newId);
});


function makeNoiseSource(ctx) {
  const bufLen = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function buildConst(id) {
  const c = constNodes[id];
  tearConst(id);

  if (!audioCtx) return;

  const wave    = get('dConst' + id + 'Wave').value;
  const vol     = parseFloat(get('sConst' + id + 'Vol').value) / 100;
  const lpfPct  = parseFloat(get('sConst' + id + 'Lpf').value) / 100;

  let freq;
  if (isConstRpmLinked(id) && wave !== 'noise') {
    freq = Math.max(0.01, getConstRpmFreqHz(id));
  } else {
    freq = parseFloat(get('nConst' + id + 'Freq').value) || 120;
  }

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = vol;

  const lpfNode = audioCtx.createBiquadFilter();
  lpfNode.type = 'lowpass';
  lpfNode.Q.value = 0.7071;
  lpfNode.frequency.value = getConstLpfHz(id);

  if (wave === 'noise') {
    const src = makeNoiseSource(audioCtx);
    src.connect(gainNode);
    src.start();
    c.noise = src;
    c.osc   = null;
  } else {
    const osc = audioCtx.createOscillator();
    osc.type = wave;
    osc.frequency.value = (c.blowerLink && !(isConstRpmLinked(id))) ? 0.01 : freq;
    osc.connect(gainNode);
    osc.start();
    c.osc   = osc;
    c.noise = null;
  }

  gainNode.connect(lpfNode);

  const dest = fxChainOut ? fxChainOut : audioCtx.destination;
  lpfNode.connect(dest);

  c.gain = gainNode;
  c.lpf  = lpfNode;
  c.dest = dest;
}

function tearConst(id) {
  const c = constNodes[id];
  if (!c) return;
  if (c.blowerWindAnimId) { cancelAnimationFrame(c.blowerWindAnimId); c.blowerWindAnimId = null; }
  c.blowerWindState = 'idle';
  if (c.osc)   { try { c.osc.stop();   } catch(e) {} c.osc   = null; }
  if (c.noise) { try { c.noise.stop(); } catch(e) {} c.noise = null; }
  if (c.gain)  { try { c.gain.disconnect(); } catch(e) {} c.gain = null; }
  if (c.lpf)   { try { c.lpf.disconnect();  } catch(e) {} c.lpf  = null; }
}

function getConstLpfHz(id) {
  { const on = get('tConst' + id + 'LpfOn'); if (on && !on.checked) return 20000; }
  const peakRPM = parseFloat(get('eRPM').value) || 3600;
  const rpm     = Math.max(0, Math.min(peakRPM, currentRPM + damperExtraRPM));
  const t       = peakRPM > 0 ? rpm / peakRPM : 0;
  const lpfPct  = parseFloat(get('sConst' + id + 'Lpf').value) / 100;
  const maxHz = lpfPct * 20000;
  return 20 + (maxHz - 20) * t;
}

function isConstRpmLinked(id) {
  const el = get('tConst' + id + 'RpmLink');
  return el ? el.checked : false;
}

function getConstRpmFreqHz(id) {
  const rpm      = Math.max(0, currentRPM + damperExtraRPM);
  const harmonic = parseFloat(get('nConst' + id + 'Harmonic').value) || 1;
  return (rpm / 60) * harmonic;
}

function updateConstFreq(id) {
  const c = constNodes[id];
  if (!c.enabled || !c.osc || !audioCtx) return;
  const wave = get('dConst' + id + 'Wave').value;
  if (wave === 'noise') return;
  if (c.blowerLink && c.blowerWindState !== 'up') return;
  let hz;
  if (isConstRpmLinked(id)) {
    hz = getConstRpmFreqHz(id);
  } else {
    hz = parseFloat(get('nConst' + id + 'Freq').value) || 120;
  }
  hz = Math.max(0.01, hz);
  c.osc.frequency.setTargetAtTime(hz, audioCtx.currentTime, 0.04);
  const disp = get('const' + id + 'RpmFreqDisplay');
  if (disp && isConstRpmLinked(id)) {
    disp.textContent = hz < 1000 ? hz.toFixed(1) + ' Hz' : (hz / 1000).toFixed(2) + ' kHz';
  }
}

function updateConstLpf(id) {
  const c = constNodes[id];
  if (!c.enabled || !c.lpf || !audioCtx) return;
  const hz = getConstLpfHz(id);
  c.lpf.frequency.setTargetAtTime(Math.min(hz, audioCtx.sampleRate / 2 - 1), audioCtx.currentTime, 0.012);
  const pct = Math.min(100, (Math.log10(Math.max(20, hz) / 20) / Math.log10(1000)) * 100);
  const barId = 'const' + id + 'LpfBar';
  const hzId  = 'const' + id + 'LpfHz';
  const bar = get(barId); if (bar) bar.style.width = pct.toFixed(1) + '%';
  const _lpfOn = get('tConst' + id + 'LpfOn'), _off = !!(_lpfOn && !_lpfOn.checked);
  const sl = get('sConst' + id + 'Lpf'); if (sl) sl.style.opacity = _off ? '0.4' : '';
  const hzEl = get(hzId); if (hzEl && _off) hzEl.textContent = 'OFF'; else if (hzEl) hzEl.textContent = hz >= 1000 ? (hz/1000).toFixed(1) + ' kHz' : Math.round(hz) + ' Hz';
  updateConstFreq(id);
}

function updateAllConstLpfs() {
  CONSTS.forEach(id => updateConstLpf(id));
}

