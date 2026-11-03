let fxChainOut = null;

window._dampFxIn = null;

window.FXGM = window.FXGM || { edges: null };
function fxgDefaultEdges(){
  const o=['in','filter','rev1','blower','rev2','dist','sos','direction','distance','rev3','norm','out'], e=[];
  for(let i=0;i<o.length-1;i++) e.push(o[i]==='filter' ? [o[i],o[i+1],'lpf'] : [o[i],o[i+1]]);
  return e;
}
function fxgEdges(){ if(!Array.isArray(window.FXGM.edges)) window.FXGM.edges = fxgDefaultEdges(); return window.FXGM.edges; }
function fxgReaches(edges, from, to){
  const seen={}, st=[from];
  while(st.length){ const n=st.pop(); if(n===to) return true; if(seen[n]) continue; seen[n]=1; edges.forEach(e=>{ if(e[0]===n) st.push(e[1]); }); }
  return false;
}

function fxgApplyDyn(id, imm){
  const d = (window.FXGM.dyn || {})[id], n = (window.FXGM.dynNodes || {})[id];
  if (!d || !n || !audioCtx) return;
  const t = audioCtx.currentTime, p = d.params || {}, byp = !!d.bypass;
  const S = (prm, v) => { try { if (imm) { prm.cancelScheduledValues(t); prm.value = v; } else prm.setTargetAtTime(v, t, 0.015); } catch(e) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, isFinite(+v) ? +v : a));
  if (d.type === 'mixer') {
    const r = clamp(p.ratio, 0, 100) / 100;
    S(n.ga.gain, byp ? 1 : 1 - r); S(n.gb.gain, byp ? 0 : r);
  } else if (d.type === 'gain') {
    const db = clamp(p.db, -60, 24);
    S(n.g.gain, byp ? 1 : (db <= -60 ? 0 : Math.pow(10, db / 20)));
  } else if (d.type === 'splitter') {
    S(n.sa.gain, 1); S(n.sb.gain, byp ? 0 : 1); S(n.sc.gain, byp ? 0 : 1);
  } else if (d.type === 'delay') {
    S(n.dly.delayTime, clamp(p.time, 1, 2000) / 1000);
    S(n.fb.gain, byp ? 0 : clamp(p.fb, 0, 90) / 100);
    S(n.wet.gain, byp ? 0 : clamp(p.mix, 0, 100) / 100);
  } else if (d.type === 'filter') {
    const f = n.f, hz = clamp(p.cutoff, 20, 20000);
    if (['lowpass','highpass','bandpass','notch'].indexOf(p.type) >= 0 && f.type !== p.type) f.type = p.type;
    S(f.frequency, Math.min(hz, audioCtx.sampleRate / 2 - 1)); S(f.Q, clamp(p.q, 0.1, 20));
    S(n.wetG.gain, byp ? 0 : 1); S(n.bypG.gain, byp ? 1 : 0);
  } else if (d.type === 'reverb') {
    const mix = clamp(p.mix, 0, 100) / 100;
    S(n.pre.delayTime, clamp(p.pre, 0, 200) / 1000);
    S(n.damp.frequency, Math.min(clamp(p.damp, 500, 20000), audioCtx.sampleRate / 2 - 1));
    S(n.wet.gain, byp ? 0 : mix); S(n.dry.gain, byp ? 1 : 1 - mix);
    const dec = clamp(p.decay, 0.2, 10);
    if (n.built !== dec) {
      const build = function(){ n.built = dec; try { n.conv.buffer = _fxgImpulse(dec); } catch(e) {} };
      if (n.built === undefined || imm) build(); else { clearTimeout(n.timer); n.timer = setTimeout(build, 120); }
    }
  } else if (d.type === 'distortion' || d.type === 'xdist') {
    const mix = clamp(p.mix, 0, 100) / 100, ck = clamp(p.drive, 0, 100) + '|' + p.char;
    if (n.ck !== ck) { n.ck = ck; n.ws.curve = makeDistCurve(clamp(p.drive, 0, 100) / 100, p.char); }
    S(n.tone.frequency, Math.min(clamp(p.tone, 200, 20000), audioCtx.sampleRate / 2 - 1));
    S(n.outG.gain, clamp(p.out, 0, 200) / 100);
    if (n.width) { const a = clamp(p.asym === undefined ? 50 : p.asym, 0, 100); S(n.width.gain, a <= 50 ? 1 + (50 - a) / 50 : 1 - (a - 50) / 50); }
    S(n.wet.gain, byp ? 0 : mix); S(n.dry.gain, byp ? 1 : 1 - mix);
  } else if (d.type === 'xfilter') {
    [[n.h, p.hc, p.hq, p.hm], [n.l, p.lc, p.lq, p.lm]].forEach(a => {
      const mix = clamp(a[3], 0, 100) / 100;
      S(a[0].f.frequency, Math.min(clamp(a[1], 20, 20000), audioCtx.sampleRate / 2 - 1)); S(a[0].f.Q, clamp(a[2], 0.1, 20));
      S(a[0].wet.gain, byp ? 0 : mix); S(a[0].dry.gain, byp ? 1 : 1 - mix);
    });
  } else if (d.type === 'xrev') {
    const mix = clamp(p.mix, 0, 100) / 100, color = clamp(p.color, 0, 100) / 100;
    S(n.wet.gain, byp ? 0 : mix); S(n.dry.gain, byp ? 1 : 1 - mix);
    S(n.hf.frequency, 20000 * Math.pow(50 / 1000, color));
    S(n.lo.frequency, Math.max(20, clamp(p.lowcut, 20, 800)));
    S(n.pre.delayTime, Math.min(0.15, clamp(p.pre, 0, 150) / 1000));
    if (p.mode === 'reverb') {
      const key = 'S' + clamp(p.size, 0, 100) + '|' + clamp(p.decay, 0, 100) + '|' + clamp(p.diff, 0, 100);
      if (n.ik !== key) {
        n.ik = key; clearTimeout(n.timer);
        const build = function(){ buildImpulseAsync(clamp(p.size, 0, 100) / 100, clamp(p.decay, 0, 100) / 100, clamp(p.diff, 0, 100) / 100, function(b){ if (n.ik === key) { try { n.conv.buffer = b; } catch(e) {} } }); };
        if (imm) build(); else n.timer = setTimeout(build, 200);
      }
    } else {
      const b = (window.FXGM_IR || {})[id];
      if (b) { n.ik = 'C'; if (n.conv.buffer !== b) { try { n.conv.buffer = b; } catch(e) {} } }
      else if (p.preset && !n.loading) {
        n.loading = true; n.ik = 'C';
        fxgIRPreset(id, p.preset, function(buf){ n.loading = false; try { n.conv.buffer = buf; } catch(e) {} });
      }
    }
  }
}
window.FXGM_IR = window.FXGM_IR || {};
function fxgIRStatus(id, name, msg, color){
  const el = document.querySelector('[data-fxn="' + id + '"]'); if (!el) return;
  const nm = el.querySelector('.xr-name'), st = el.querySelector('.xr-status');
  if (nm && name != null) nm.textContent = name;
  if (st && msg != null) { st.textContent = msg; st.style.color = color || 'var(--muted)'; st.style.display = ''; }
}
function fxgIRPreset(id, key, cb){
  const url = (typeof IR_PRESETS !== 'undefined') ? IR_PRESETS[key] : null;
  if (!url || !audioCtx) return;
  fxgIRStatus(id, key.replace('_IR', '').replace('_', ' ') + '.wav', 'Decoding...');
  const raw = safeAtob(url.split(',')[1]), u8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  audioCtx.decodeAudioData(u8.buffer, function(b){
    const d = (window.FXGM.dyn || {})[id];
    if (!d || d.params.preset !== key) return;
    window.FXGM_IR[id] = b; fxgIRStatus(id, null, 'Loaded \u2014 ' + b.duration.toFixed(2) + 's', 'var(--accent)'); cb(b);
  }, function(){ fxgIRStatus(id, null, 'Decode failed', 'var(--red)'); });
}
function _fxgImpulse(sec){
  const rate = audioCtx.sampleRate, len = Math.max(1, Math.floor(rate * sec)), buf = audioCtx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  return buf;
}

const _SOP = window._sop = { lag: null, nodes: [] };
function _sopTeardown(){
  _SOP.nodes.forEach(n => { try { if (n.onaudioprocess) n.onaudioprocess = null; n.disconnect(); } catch(e) {} });
  _SOP.nodes = []; _SOP.lag = null;
}
function _sopSpeed(){ const v = parseFloat((get('sSosSpeed') || {}).value); return isFinite(v) && v > 0 ? v : 343; }
function _sopDistM(){
  const st = (typeof getPosMapState === 'function') ? getPosMapState() : null; if (!st) return 0;
  return Math.hypot(+st.posUserX || 0, +st.posUserY || 0) * 1609.344;
}
function _buildSos(){
  const ctx = audioCtx, inp = fxChainOut, out = ctx.createGain();
  const A = ctx.createDelay(30), B = ctx.createDelay(30), gA = ctx.createGain(), gB = ctx.createGain();
  const first = Math.min(30, _sopDistM() / _sopSpeed());
  A.delayTime.value = first; B.delayTime.value = first; gA.gain.value = 1; gB.gain.value = 0;
  inp.connect(A); inp.connect(B); A.connect(gA); B.connect(gB); gA.connect(out); gB.connect(out);
  const L = { cur: first, act: 0, last: 0,
    set: function(t){
      const now = ctx.currentTime;
      if (Math.abs(t - L.cur) < 0.0003 || now - L.last < 0.09) return;
      const idle = L.act ? A : B, on = L.act ? gB : gA, off = L.act ? gA : gB;
      idle.delayTime.value = t;
      [on.gain, off.gain].forEach(p => { p.cancelScheduledValues(now); });
      on.gain.setValueAtTime(on.gain.value, now); on.gain.linearRampToValueAtTime(0, now + 0.06);
      off.gain.setValueAtTime(off.gain.value, now); off.gain.linearRampToValueAtTime(1, now + 0.06);
      L.act = L.act ? 0 : 1; L.cur = t; L.last = now;
    } };
  _SOP.lag = L; _SOP.nodes.push(inp, A, B, gA, gB, out);
  fxChainOut = out;
}
function _sopFmtTime(t){ return !isFinite(t) ? '--' : (t < 1 ? (t * 1000).toFixed(0) + ' ms' : t.toFixed(2) + ' s'); }
setInterval(function(){
  const dm = _sopDistM(), c = _sopSpeed();
  const travel = dm / c, lag = Math.min(30, travel);
  if (_SOP.lag) _SOP.lag.set(lag);
  const dEl = get('svSosDelay'); if (!dEl) return;
  dEl.textContent = !sosEnabled ? 'OFF' : (travel > 30 ? '30 s (MAX)' : _sopFmtTime(lag)); get('svSosTravel').textContent = (get('posDistanceReadout') || {}).textContent || '--';
}, 40);

function rebuildFxChain() {
  if (!audioCtx) return;
  tearAllFx();
  ensureFxChainOut();
  const sirenIn = fxChainOut;
  const made = [];
  const G = () => { const g = audioCtx.createGain(); g.gain.value = 1; made.push(g); return g; };
  const N = {};
  const stage = (id, on, build) => {
    if (!on) { const g = G(); N[id] = { inp: g, out: g }; return; }
    const inp = G(); fxChainOut = inp; build(); N[id] = { inp: inp, out: fxChainOut };
  };
  {
    const finp = G(), hpfOut = G(), lpfOut = G();
    const byp = !!window.FXGM.filterBypass;
    if (!byp && hpfEnabled) { fxChainOut = finp; _buildHpf(); fxChainOut.connect(hpfOut); }
    else finp.connect(hpfOut);
    if (!byp && lpfEnabled && filterNodes.length) {
      const last = filterNodes[filterNodes.length-1];
      try { last.disconnect(); } catch(e) {}
      finp.connect(filterNodes[0]); last.connect(lpfOut);
    } else if (!byp && !lpfEnabled && slpfEnabled) { fxChainOut = finp; _buildSlpf(); fxChainOut.connect(lpfOut); }
    else finp.connect(lpfOut);
    N.filter = { inp: finp, outs: { hpf: hpfOut, lpf: lpfOut } };
  }
  stage('rev1',   reverbEnabled,  () => _buildReverb(1));
  stage('blower', blowerEnabled && window.FXGM.hasBlower !== false, () => _buildBlower());
  stage('rev2',   reverb2Enabled, () => _buildReverb(2));
  stage('dist',   distEnabled,    () => _buildDist());
  stage('distance',  distanceEnabled, () => _build8D('Distance'));
  stage('direction', directionEnabled && (typeof spatialFxMode === 'undefined' || spatialFxMode !== 'omni'), () => _build8D('Direction'));
  stage('sos',     sosEnabled,     () => _buildSos());
  stage('rev3',   reverb3Enabled, () => _buildReverb(3));
  {
    const pre = audioCtx.createGain(), lim = audioCtx.createDynamicsCompressor(), post = audioCtx.createGain();
    lim.knee.value = 0; lim.attack.value = 0.003; lim.release.value = 0.25;
    pre.connect(lim); lim.connect(post);
    made.push(pre, lim, post);
    normPreGainNode = pre; normLimiterNode = lim; normPostGainNode = post;
    N.norm = { inp: pre, out: post };
    updateNormalizerParams();
  }
  window.FXGM.dynNodes = {};
  const dynDef = window.FXGM.dyn || {};
  Object.keys(dynDef).forEach(id => {
    const d = dynDef[id], nn = { type: d.type };
    if (d.type === 'mixer') {
      const a = G(), b = G(), ga = G(), gb = G(), out = G();
      a.connect(ga); b.connect(gb); ga.connect(out); gb.connect(out);
      nn.ga = ga; nn.gb = gb; N[id] = { inp: a, inps: { a: a, b: b }, out: out };
    } else if (d.type === 'gain') {
      const g = G(); nn.g = g; N[id] = { inp: g, out: g };
    } else if (d.type === 'splitter') {
      const s = G(), sa = G(), sb = G(), sc = G();
      s.connect(sa); s.connect(sb); s.connect(sc);
      nn.sa = sa; nn.sb = sb; nn.sc = sc; N[id] = { inp: s, outs: { a: sa, b: sb, c: sc }, out: sa };
    } else if (d.type === 'delay') {
      const inp = G(), dry = G(), wet = G(), fb = G(), out = G(), dly = audioCtx.createDelay(2);
      made.push(dly);
      inp.connect(dry); dry.connect(out); inp.connect(dly); dly.connect(wet); wet.connect(out); dly.connect(fb); fb.connect(dly);
      nn.dly = dly; nn.fb = fb; nn.wet = wet; N[id] = { inp: inp, out: out };
    } else if (d.type === 'filter') {
      const inp = G(), f = audioCtx.createBiquadFilter(), wetG = G(), bypG = G(), out = G();
      made.push(f); inp.connect(f); f.connect(wetG); wetG.connect(out); inp.connect(bypG); bypG.connect(out);
      nn.f = f; nn.wetG = wetG; nn.bypG = bypG; N[id] = { inp: inp, out: out };
    } else if (d.type === 'reverb') {
      const inp = G(), dry = G(), pre = audioCtx.createDelay(0.5), conv = audioCtx.createConvolver(), damp = audioCtx.createBiquadFilter(), wet = G(), out = G();
      damp.type = 'lowpass'; damp.Q.value = 0.7071; made.push(pre, conv, damp);
      inp.connect(dry); dry.connect(out); inp.connect(pre); pre.connect(conv); conv.connect(damp); damp.connect(wet); wet.connect(out);
      nn.dry = dry; nn.pre = pre; nn.conv = conv; nn.damp = damp; nn.wet = wet; N[id] = { inp: inp, out: out };
    } else if (d.type === 'distortion' || d.type === 'xdist') {
      const inp = G(), dry = G(), ws = audioCtx.createWaveShaper(), tone = audioCtx.createBiquadFilter(), outG = G(), wet = G(), out = G();
      ws.oversample = '4x'; tone.type = 'lowpass'; tone.Q.value = 0.7071; made.push(ws, tone);
      inp.connect(dry); dry.connect(out); inp.connect(ws); ws.connect(tone); tone.connect(outG);
      if (d.type === 'xdist') {
        outG.channelCount = 2; outG.channelCountMode = 'explicit'; outG.channelInterpretation = 'speakers';
        const sp = audioCtx.createChannelSplitter(2), mg = audioCtx.createChannelMerger(2), mid = G(), side = G(), width = G(), neg = G();
        const mL = G(), mR = G(), sL = G(), sR = G(); mL.gain.value = 0.5; mR.gain.value = 0.5; sL.gain.value = 0.5; sR.gain.value = -0.5; neg.gain.value = -1;
        made.push(sp, mg);
        outG.connect(sp); sp.connect(mL, 0); sp.connect(mR, 1); sp.connect(sL, 0); sp.connect(sR, 1);
        mL.connect(mid); mR.connect(mid); sL.connect(side); sR.connect(side); side.connect(width);
        mid.connect(mg, 0, 0); width.connect(mg, 0, 0); mid.connect(mg, 0, 1); width.connect(neg); neg.connect(mg, 0, 1);
        mg.connect(wet); nn.width = width;
      } else outG.connect(wet);
      wet.connect(out);
      nn.dry = dry; nn.ws = ws; nn.tone = tone; nn.outG = outG; nn.wet = wet; N[id] = { inp: inp, out: out };
    } else if (d.type === 'xfilter') {
      const inp = G(), hOut = G(), lOut = G();
      const half = (type, dest) => { const dry = G(), wet = G(), f = audioCtx.createBiquadFilter(); f.type = type; made.push(f);
        inp.connect(dry); dry.connect(dest); inp.connect(f); f.connect(wet); wet.connect(dest); return { f: f, dry: dry, wet: wet }; };
      nn.h = half('highpass', hOut); nn.l = half('lowpass', lOut);
      N[id] = { inp: inp, outs: { hpf: hOut, lpf: lOut }, out: lOut };
    } else if (d.type === 'xrev') {
      const inp = G(), dry = G(), wet = G(), pre = audioCtx.createDelay(0.6), conv = audioCtx.createConvolver(), hf = audioCtx.createBiquadFilter(), lo = audioCtx.createBiquadFilter();
      hf.type = 'lowpass'; hf.Q.value = 0.7071; lo.type = 'highpass'; lo.Q.value = 0.7071; conv.normalize = true;
      try { conv.buffer = audioCtx.createBuffer(2, 1, audioCtx.sampleRate); } catch(e) {}
      made.push(pre, conv, hf, lo);
      inp.connect(dry); dry.connect(lo); inp.connect(pre); pre.connect(conv); conv.connect(hf); hf.connect(wet); wet.connect(lo);
      nn.dry = dry; nn.wet = wet; nn.pre = pre; nn.conv = conv; nn.hf = hf; nn.lo = lo; N[id] = { inp: inp, out: lo };
    } else return;
    window.FXGM.dynNodes[id] = nn;
  });
  Object.keys(window.FXGM.dynNodes).forEach(id => fxgApplyDyn(id, true));
  const sirenOut = G(); sirenOut.connect(masterGain);
  N.in = { inp: null, out: sirenIn }; N.out = { inp: sirenOut, out: null };
  const edges = [];
  fxgEdges().forEach(e => {
    const src = N[e[0]], dst = N[e[1]];
    const o = src && (e[2] === 'byp' ? src.inp : (src.outs ? (src.outs[e[2]] || src.outs.lpf || src.out) : src.out));
    const di = dst && (dst.inps ? (dst.inps[e[3]] || dst.inp) : dst.inp);
    if (!o || !di) return;
    if (fxgReaches(edges, e[1], e[0])) return;
    edges.push(e); try { o.connect(di); } catch(x) {}
  });
  const tap = ids => { for (const id of ids) { if (N[id] && N[id].inp && fxgReaches(edges, id, 'out')) return N[id].inp; } return sirenOut; };
  window._dampFxIn = G();
  window._dampFxIn.connect(tap(['filter']));
  if (window._daReconnectGrpGains) window._daReconnectGrpGains();
  window._constPosIn = (function(){
    const ids = ['sos','direction','distance'].filter(id => N[id] && N[id].inp && fxgReaches(edges, id, 'out'));
    if (!ids.length) return sirenOut;
    const rank = id => ids.filter(o => o !== id && fxgReaches(edges, id, o)).length;
    ids.sort((a, b) => rank(b) - rank(a));
    return N[ids[0]].inp;
  })();
  window._fxgMade = made;
  fxChainOut = sirenOut;
  updateFilterCutoff();
  updateBlowerFade();
  if (typeof reconnectConsts === "function") reconnectConsts();
}

function ensureFxChainOut() {
  if (fxChainOut) { try { fxChainOut.disconnect(); } catch(e) {} }
  fxChainOut = audioCtx.createGain();
  fxChainOut.gain.value = 1;
  window._sirenIn = fxChainOut;
  Object.keys(gainNodes).forEach(k => {
    const g = gainNodes[k];
    if (!g) return;
    if(PERM_ATTEN_KEYS.indexOf(k)!==-1) connectPermOscOutput(k, g, fxChainOut);
    else { try { g.disconnect(); } catch(e) {} g.connect(fxChainOut); }
  });
  extraOscs.forEach(eo => {
    if (eo.gainNode) connectEoOutput(eo, eo.gainNode, fxChainOut);
    if (eo.type === 'rotor' && !eo.statorLinked && eo.statorGainNode) {
      try { eo.statorGainNode.disconnect(); } catch(e) {}
      eo.statorGainNode.connect(fxChainOut);
    }
  });
}

function tearAllFx() {
  if (typeof _sopTeardown === 'function') _sopTeardown();
  (window._fxgMade || []).forEach(n => { try { n.disconnect(); } catch(e) {} }); window._fxgMade = [];
  try { if (window._sirenIn) window._sirenIn.disconnect(); } catch(e) {}
  [distanceLfo, distanceCenterSrc, directionLfo, directionCenterSrc].forEach(n => {
    if (n) { try { n.stop(); } catch(e) {} }
  });
  const nodes = [
    reverbSplitGain, reverbPreDelay, reverbNode, reverbHFDamp, reverbLowCut, reverbWetGain, reverbDryGain,
    blowerSplitGain, blowerPreGain, blowerNode, blowerPostFilter, blowerOutputGain, blowerWetGain, blowerDryGain,
    reverb2SplitGain, reverb2PreDelay, reverb2Node, reverb2HFDamp, reverb2LowCut, reverb2WetGain, reverb2DryGain,
    reverb3SplitGain, reverb3PreDelay, reverb3Node, reverb3HFDamp, reverb3LowCut, reverb3WetGain, reverb3DryGain,
    slpfSplitGain, slpfNode, slpfWetGain, slpfDryGain,
    hpfSplitGain, hpfNode, hpfWetGain, hpfDryGain,
    distSplitGain, distNode, distPostFilter, distOutputGain, distWetGain, distDryGain,
    distancePanner, distanceCenterSrc, distanceLfo, distanceDepthGain, distancePreGainNode, distanceAutoFilterNode,
    directionPanner, directionCenterSrc, directionLfo, directionDepthGain,
    fxChainOut
  ];
  nodes.forEach(n => { if (n) { try { n.disconnect(); } catch(e) {} } });
  reverbSplitGain=null; reverbPreDelay=null; reverbNode=null; reverbHFDamp=null; reverbLowCut=null; reverbWetGain=null; reverbDryGain=null;
  blowerSplitGain=null; blowerPreGain=null; blowerNode=null; blowerPostFilter=null; blowerOutputGain=null; blowerWetGain=null; blowerDryGain=null;
  reverb2SplitGain=null; reverb2PreDelay=null; reverb2Node=null; reverb2HFDamp=null; reverb2LowCut=null; reverb2WetGain=null; reverb2DryGain=null;
  reverb3SplitGain=null; reverb3PreDelay=null; reverb3Node=null; reverb3HFDamp=null; reverb3LowCut=null; reverb3WetGain=null; reverb3DryGain=null;
  slpfSplitGain=null; slpfNode=null; slpfWetGain=null; slpfDryGain=null;
  hpfSplitGain=null; hpfNode=null; hpfWetGain=null; hpfDryGain=null;
  distSplitGain=null; distNode=null; distPostFilter=null; distOutputGain=null; distWetGain=null; distDryGain=null;
  distancePanner=null; distanceCenterSrc=null; distanceLfo=null; distanceDepthGain=null; distancePreGainNode=null; distanceAutoFilterNode=null;
  directionPanner=null; directionCenterSrc=null; directionLfo=null; directionDepthGain=null;
  fxChainOut=null;
  try { if (window._dampFxIn) window._dampFxIn.disconnect(); } catch(e) {}
  window._dampFxIn = null;
  if (blowerFadeAnimId) { cancelAnimationFrame(blowerFadeAnimId); blowerFadeAnimId=null; }
  {
    Object.keys(gainNodes).forEach(k => {
      const g = gainNodes[k];
      if (!g) return;
      if(PERM_ATTEN_KEYS.indexOf(k)!==-1) connectPermOscOutput(k, g, masterGain);
      else { try { g.disconnect(); } catch(e) {} g.connect(masterGain); }
    });
  }
}

function buildImpulse(ctx, sizeVal, decayVal, diffusionVal) {
  const sampleRate = ctx.sampleRate;
  const length = Math.round((0.3 + sizeVal * 5.7) * sampleRate);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const decay = 0.2 + decayVal * 6.8;
  const diffusion = 0.3 + diffusionVal * 0.65;
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const n = length - i;
      const env = Math.pow(n / length, decay);
      let s = (Math.random() * 2 - 1) * env;
      if (i < sampleRate * 0.08) s += (Math.random() * 2 - 1) * env * diffusion;
      data[i] = s;
    }
  }
  return impulse;
}

function buildImpulseAsync(sizeVal, decayVal, diffusionVal, callback) {
  const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
  const length = Math.round((0.3 + sizeVal * 5.7) * sampleRate);
  const decay = 0.2 + decayVal * 6.8;
  const diffusion = 0.3 + diffusionVal * 0.65;

  function buildSync() {
    const bufL = new Float32Array(length);
    const bufR = new Float32Array(length);
    const earlyEnd = Math.round(sampleRate * 0.08);
    for (let i = 0; i < length; i++) {
      const n = length - i;
      const env = Math.pow(n / length, decay);
      if (i < earlyEnd) {
        const ex = (Math.random() * 2 - 1) * env * diffusion;
        bufL[i] = (Math.random() * 2 - 1) * env + ex;
        bufR[i] = (Math.random() * 2 - 1) * env + (Math.random() * 2 - 1) * env * diffusion;
      } else {
        bufL[i] = (Math.random() * 2 - 1) * env;
        bufR[i] = (Math.random() * 2 - 1) * env;
      }
    }
    try {
      const impulse = audioCtx.createBuffer(2, length, sampleRate);
      impulse.copyToChannel(bufL, 0);
      impulse.copyToChannel(bufR, 1);
      callback(impulse);
    } catch(e) {
      callback(buildImpulse(audioCtx, sizeVal, decayVal, diffusionVal));
    }
  }

  requestAnimationFrame(function() { buildSync(); });
}

function _insertFxStage(wetChain, mixVal, preGainVal) {
  try { fxChainOut.disconnect(masterGain); } catch(e) {}
  const preGain = audioCtx.createGain(); preGain.gain.value = (preGainVal===undefined||preGainVal===null) ? 1 : preGainVal;
  const split = audioCtx.createGain(); split.gain.value = 1;
  fxChainOut.connect(preGain); preGain.connect(split);
  const dry = audioCtx.createGain(); dry.gain.value = 1 - mixVal;
  const wet = audioCtx.createGain(); wet.gain.value = mixVal;
  const out = audioCtx.createGain(); out.gain.value = 1;
  split.connect(dry); dry.connect(out);
  split.connect(wetChain[0]); wetChain[wetChain.length-1].connect(wet); wet.connect(out);
  fxChainOut = out;
  return { preGain, split, dry, wet, out };
}

let reverbSplitGain = null;

function _buildReverb(which) {
  const pfx = which === 1 ? '' : (which === 2 ? '2' : '3');
  const size    = parseFloat(get('sReverb'+pfx+'Size').value)     / 100;
  const decay   = parseFloat(get('sReverb'+pfx+'Decay').value)    / 100;
  const diff    = parseFloat(get('sReverb'+pfx+'Diffusion').value)/ 100;
  const color   = parseFloat(get('sReverb'+pfx+'Color').value)    / 100;
  const lowCutHz= parseFloat(get('sReverb'+pfx+'LowCut').value);
  const preDelMs= parseFloat(get('nReverb'+pfx+'PreDelay').value) || 0;
  const mix     = parseFloat(get('sReverb'+pfx+'Mix').value)      / 100;
  const preDel = audioCtx.createDelay(0.6);
  preDel.delayTime.value = Math.min(0.59, preDelMs / 1000);
  const conv = audioCtx.createConvolver();
  conv.buffer = audioCtx.createBuffer(2, 1, audioCtx.sampleRate);
  conv.normalize = true;
  const hfDamp = audioCtx.createBiquadFilter();
  hfDamp.type = 'lowpass';
  hfDamp.frequency.value = 20000 * Math.pow(50/1000, color);
  hfDamp.Q.value = 0.7071;
  const loCut = audioCtx.createBiquadFilter();
  loCut.type = 'highpass';
  loCut.frequency.value = Math.max(20, lowCutHz);
  loCut.Q.value = 0.7071;
  preDel.connect(conv); conv.connect(hfDamp);
  const stage = _insertFxStage([preDel, hfDamp], mix);
  try { stage.out.disconnect(); } catch(e) {}
  stage.out.connect(loCut);
  fxChainOut = loCut;
  if (which === 1) {
    reverbSplitGain=stage.split; reverbDryGain=stage.dry; reverbWetGain=stage.wet;
    reverbPreDelay=preDel; reverbNode=conv; reverbHFDamp=hfDamp; reverbLowCut=loCut;
    if (typeof reverb1Mode !== 'undefined' && reverb1Mode === 'convolver') {
      if (typeof reverb1IRBuffer !== 'undefined' && reverb1IRBuffer) {
        conv.buffer = reverb1IRBuffer;
      }
      reverbBuildPending = false;
      return;
    }
    reverbBuildPending=true;
    buildImpulseAsync(size, decay, diff, function(impulse) {
      conv.buffer = impulse;
      reverbBuildPending=false;
    });
  } else if (which === 2) {
    reverb2SplitGain=stage.split; reverb2DryGain=stage.dry; reverb2WetGain=stage.wet;
    reverb2PreDelay=preDel; reverb2Node=conv; reverb2HFDamp=hfDamp; reverb2LowCut=loCut;
    if (typeof reverb2Mode !== 'undefined' && reverb2Mode === 'convolver') {
      if (typeof reverb2IRBuffer !== 'undefined' && reverb2IRBuffer) {
        conv.buffer = reverb2IRBuffer;
      }
      reverb2BuildPending = false;
      return;
    }
    reverb2BuildPending=true;
    buildImpulseAsync(size, decay, diff, function(impulse) {
      conv.buffer = impulse;
      reverb2BuildPending=false;
    });
  } else {
    reverb3SplitGain=stage.split; reverb3DryGain=stage.dry; reverb3WetGain=stage.wet;
    reverb3PreDelay=preDel; reverb3Node=conv; reverb3HFDamp=hfDamp; reverb3LowCut=loCut;
    if (typeof reverb3Mode !== 'undefined' && reverb3Mode === 'convolver') {
      if (typeof reverb3IRBuffer !== 'undefined' && reverb3IRBuffer) {
        conv.buffer = reverb3IRBuffer;
      }
      reverb3BuildPending = false;
      return;
    }
    reverb3BuildPending=true;
    buildImpulseAsync(size, decay, diff, function(impulse) {
      conv.buffer = impulse;
      reverb3BuildPending=false;
    });
  }
}

