const RASP_KEYS = ['hp','lp','hv','lv','ut','ot'];
function steepWarp(ts, st){ st = parseFloat(st)||0; if(!st) return ts; const k = Math.pow(2, st/50); return ts < 0.5 ? 0.5*Math.pow(2*ts, k) : 1 - 0.5*Math.pow(2*(1-ts), k); }
function raspDef(){ return {ven:false, steep:0, collapsed:false, svLow:0, svHigh:50, fn:'sine', ease:'easeout', off:0, vrnd:0, vn:1, vl:1, vseed:1}; }
const permRasp = {}; RASP_KEYS.forEach(function(k){ permRasp[k] = raspDef(); });
function raspNorm(st){
  st.svLow = Math.max(0, Math.min(100, parseFloat(st.svLow)||0)); st.svHigh = Math.max(0, Math.min(100, parseFloat(st.svHigh)||0));
  st.off = Math.max(-100, Math.min(100, parseFloat(st.off)||0)); st.steep = Math.max(-100, Math.min(100, parseFloat(st.steep)||0)); st.collapsed = st.collapsed === true;
  st.fn = (typeof st.fn === 'string' && st.fn) ? st.fn : 'sine';
  st.ease = (st.ease==='easein' || st.ease==='easeinout') ? st.ease : 'easeout';
  st.vrnd = Math.max(0, Math.min(100, parseFloat(st.vrnd)||0));
  st.vn = Math.max(1, Math.min(32, Math.round(parseFloat(st.vn)||1))); st.vl = Math.max(1, Math.min(32, Math.round(parseFloat(st.vl)||1)));
  st.vseed = (parseInt(st.vseed)||1); return st;
}
function raspPack(st){ st = st || raspDef(); return {steep:st.steep||0, collapsed:st.collapsed===true, ven:st.ven===true, svLow:st.svLow, svHigh:st.svHigh, fn:st.fn, ease:st.ease, off:st.off, vrnd:st.vrnd, vn:st.vn, vl:st.vl, vseed:st.vseed}; }
function raspUnpack(sv){
  sv = sv || {};
  const old = sv.sv;
  return {steep:sv.steep||0, collapsed:sv.collapsed===true, ven:sv.ven===true, svLow:sv.svLow!==undefined?sv.svLow:(old!==undefined?old:0), svHigh:sv.svHigh!==undefined?sv.svHigh:(old!==undefined?old:50),
    fn:sv.fn||'sine', ease:sv.ease||'easeout', off:sv.off||0, vrnd:sv.vrnd||0, vn:sv.vn||1, vl:sv.vl||1, vseed:sv.vseed||1};
}
function raspActive(st){ return !!st && st.ven===true; }
const RASP_SUBV_MAX = 0.01;
function raspSubVPct(st, rpm){
  const peak = parseFloat(get('eRPM').value) || 3600;
  const t = peak > 0 ? Math.max(0, Math.min(1, (rpm||0)/peak)) : 0;
  const ts = steepWarp(Math.max(0, Math.min(1, t - ((parseFloat(st.off)||0)/100)*0.5)), st.steep);
  let c = applyFn(st.fn || 'sine', ts, st.ease || 'easeout'); if(!isFinite(c)) c = ts;
  const lo = parseFloat(st.svLow)||0, hi = parseFloat(st.svHigh)||0;
  return Math.max(0, Math.min(100, lo + (hi-lo)*c));
}
function raspSubVHz(st, rpm){ return (raspSubVPct(st, rpm)/100) * RASP_SUBV_MAX * Math.max(0, rpm||0); }
function raspRatioKey(st, hz, rpm){
  hz = Math.max(0.01, hz||440); if(!rpm && typeof currentRPM === 'number') rpm = currentRPM;
  return Math.max(0, Math.round(raspSubVHz(st, rpm)/hz*1000));
}
function raspRng(seed){ let sd = (seed>>>0) || 1; return function(){ sd = (sd + 0x6D2B79F5)|0; let t = Math.imul(sd ^ (sd>>>15), 1|sd); t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t; return ((t ^ (t>>>14))>>>0)/4294967296; }; }
let _raspParab = null;
function raspParabTable(){
  if(_raspParab) return _raspParab;
  const T = 2048, t = new Float64Array(T); let mx = 0;
  for(let i=0;i<T;i++){ const x=i/T; let v=0; for(let n=1;n<400;n+=2) v += -8/(n*n*Math.PI*Math.PI)*Math.sin(2*Math.PI*n*x); t[i]=v; if(Math.abs(v)>mx) mx=Math.abs(v); }
  for(let i=0;i<T;i++) t[i]/=mx;
  return (_raspParab = t);
}
function raspBaseAt(type, x){
  switch(type){
    case 'sawtooth': return 2*((x+0.5)%1) - 1;
    case 'square': return x < 0.5 ? 1 : -1;
    case 'triangle': return (2/Math.PI)*Math.asin(Math.sin(2*Math.PI*x));
    case 'parabolic': { const T=raspParabTable(), p=x*T, i0=Math.floor(p), f=p-i0; return T[i0%T.length]*(1-f) + T[(i0+1)%T.length]*f; }
    default: return Math.sin(2*Math.PI*x);
  }
}
function raspFFT(re, im){
  const n = re.length;
  for(let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ let t=re[i];re[i]=re[j];re[j]=t; t=im[i];im[i]=im[j];im[j]=t; } }
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang), h=len>>1;
    for(let i=0;i<n;i+=len){ let cr=1, ci=0;
      for(let j=0;j<h;j++){
        const a=i+j, b=a+h, vr=re[b]*cr-im[b]*ci, vi=re[b]*ci+im[b]*cr;
        re[b]=re[a]-vr; im[b]=im[a]-vi; re[a]+=vr; im[a]+=vi;
        const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr;
      } }
  }
}
function raspCoefs(type, st, hz, rpm){
  raspNorm(st);
  const rk = raspRatioKey(st, hz, rpm);
  const NP = st.vn + st.vl, vrnd = st.vrnd/100, rho0 = 1 + rk/1000;
  let M = NP; if(vrnd > 0) M = NP*Math.max(1, Math.floor(64/NP));
  const sig = [type, st.vn, st.vl, st.vrnd, st.vseed, rk].join('|');
  if(st._c && st._c.sig === sig) return st._c;
  const rp = raspRng(st.vseed), rho = new Float64Array(M);
  for(let k=0;k<M;k++){ let u = ((k%NP) < st.vn) ? 0 : 1; if(vrnd > 0) u += (rp()*2-1)*vrnd; rho[k] = Math.max(0.1, 1 + (rho0-1)*u); }
  const w = new Float64Array(M); let Neff = 0;
  for(let k=0;k<M;k++){ w[k] = 1/rho[k]; Neff += w[k]; }
  const S = M > 64 ? 16384 : 8192, K = S/2;
  const re = new Float64Array(S), im = new Float64Array(S);
  let k = 0, acc = 0;
  for(let q=0;q<S;q++){
    const t = q*Neff/S;
    while(k < M-1 && t >= acc + w[k]){ acc += w[k]; k++; }
    re[q] = raspBaseAt(type, Math.min(0.999999, Math.max(0, (t-acc)/w[k])));
  }
  raspFFT(re, im);
  const real = new Float32Array(K), imag = new Float32Array(K);
  for(let n=1;n<K;n++){ const u=Math.PI*n/(2*K), sg=Math.sin(u)/u; real[n] = 2/S*re[n]*sg; imag[n] = -2/S*im[n]*sg; }
  return (st._c = {sig:sig, real:real, imag:imag, M:Neff, rk:rk});
}
function raspApplyWave(osc, type, st){
  const c = raspCoefs(type, st, osc._raspHz, osc._raspRPM);
  osc._raspRk = c.rk;
  if(osc._raspSig === c.sig && osc._raspCtx === audioCtx){ osc._raspN = c.M; return; }
  try{ osc.setPeriodicWave(audioCtx.createPeriodicWave(c.real, c.imag, {disableNormalization:true})); }
  catch(e){ osc.type = type; osc._raspN = 1; osc._raspSig = null; return; }
  osc._raspSig = c.sig; osc._raspCtx = audioCtx; osc._raspN = c.M;
}
function raspHz(osc, hz, rpm){
  hz = Math.max(0.01, hz);
  if(osc){
    osc._raspHz = hz; if(rpm !== undefined) osc._raspRPM = rpm;
    const st = osc._rasp;
    if(st && st.ven === true && osc._bt && audioCtx && osc._raspRk !== raspRatioKey(st, hz, osc._raspRPM)){ try{ raspApplyWave(osc, osc._bt, st); }catch(e){} }
  }
  return hz/((osc && osc._raspN) || 1);
}
function raspRefresh(osc){
  if(!osc || !audioCtx) return;
  const oldN = osc._raspN || 1; osc._raspSig = null; osc._raspRk = null;
  setOscWaveform(osc, osc._bt || 'sine');
  const newN = osc._raspN || 1;
  if(newN !== oldN){ try{ const t=audioCtx.currentTime, f=osc.frequency.value; osc.frequency.cancelScheduledValues(t); osc.frequency.setValueAtTime(Math.max(0.001, f*oldN/newN), t); }catch(e){} }
  try{ liveUpdateFreqs(); }catch(e){}
}
function raspCustomFnOpts(){
  let h = '';
  try{ (JSON.parse(localStorage.getItem('sirenosc_custom_fns')||'[]')||[]).forEach(function(cf){ h += '<option value="'+String(cf.value).replace(/"/g,'&quot;')+'" data-custom="1">'+String(cf.name).replace(/</g,'&lt;')+'</option>'; }); }catch(e){}
  return h;
}
function raspHtml(p, id){
  const ent = 'class="entry" style="margin-bottom:4px"';
  const num = function(key, label, tip, val, min, max){ return `
        <div ${ent} title="${tip}"><label>${label}</label><input type="number" id="${p}${key}${id}" value="${val}" min="${min}" max="${max}" step="1" style="color:var(--accent2)"></div>`; };
  return `
    <div id="${p}RaspVWrap${id}" style="margin-top:4px">
      <div class="toggle-row" style="margin-bottom:4px"><label class="toggle"><input type="checkbox" id="${p}RaspV${id}"><span class="toggle-slider"></span></label><label class="toggle-label" for="${p}RaspV${id}" style="cursor:pointer">Sub-V (Coarse Rasp)</label><button type="button" class="vbtn btn-gray" id="${p}RaspVCollapse${id}" title="Collapse / expand the Coarse Rasp settings" style="font-size:11px;padding:1px 7px;margin-left:auto;display:none"><svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg></button></div>
      <div id="${p}RaspVFields${id}" style="display:none;padding-left:6px;border-left:2px solid var(--border);margin-bottom:4px">
        <div ${ent} title="How the Sub-V is tweened between the At 0 RPM and At Peak RPM values"><label>Function</label>
          <div class="fn-row">
            <select id="${p}RaspVFn${id}" style="flex:1;min-width:0;letter-spacing:1px;color:var(--accent2)">
              <option value="linear">Linear</option><option value="exponential">Exponential</option><option value="sine" selected>Sine</option>
              <option value="tanh">Hyperbolic Tangent</option><option value="quadratic">Quadratic</option><option value="logarithmic">Logarithmic</option>${raspCustomFnOpts()}
            </select>
            <div class="ease-group" id="${p}RaspVEase${id}">
              <button class="ease-btn" data-val="easein">In</button>
              <button class="ease-btn active" data-val="easeout">Out</button>
              <button class="ease-btn" data-val="easeinout">Both</button>
            </div>
          </div>
        </div>${
        num('RaspVLow','At 0 RPM (%)','Sub-V (0% to 100%) used at 0 RPM. The Sub-V maps to 0 to 0.01 x the current motor RPM in Hz, e.g. 30% = 0.003 x RPM = about 10 Hz at 3360 RPM',0,0,100)}${
        num('RaspVHigh','At Peak RPM (%)','Sub-V (0% to 100%) used at the Peak RPM',50,0,100)}
        <div ${ent} title="Shifts the curve: positive = steeper (changes earlier), negative = broader (changes later)"><label>Curve Offset</label>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="range" id="${p}RaspVOff${id}" min="-100" max="100" step="1" value="0" style="accent-color:var(--accent);flex:1">
            <span class="slider-val" id="${p}RaspVOffVal${id}" style="width:32px">0</span>
          </div>
        </div>
        <div ${ent} title="Steepness of the curve: positive = steeper in the middle with flatter ends, negative = more gradual in the middle"><label>Steepness</label>
          <div style="display:flex;align-items:center;gap:6px">
            <input type="range" id="${p}RaspVSteep${id}" min="-100" max="100" step="1" value="0" style="accent-color:var(--accent);flex:1">
            <span class="slider-val" id="${p}RaspVSteepVal${id}" style="width:32px">0</span>
          </div>
        </div>
        <div class="mfn-curve-wrap" style="height:120px;margin:2px 0 6px" title="Sub-V curve: Sub-V % against RPM (0 to Peak RPM). The marker is where this oscillator is right now.">
          <canvas class="mfn-curve-canvas" id="${p}RaspVGraph${id}"></canvas>
          <span class="mfn-curve-label" id="${p}RaspVRead${id}" style="left:24px;right:auto;top:3px;bottom:auto"></span>
          <span class="mfn-curve-label" style="right:34px;bottom:2px">RPM <svg class="si" aria-hidden="true"><use href="#si-arrow-r"/></svg></span>
        </div>${
        num('RaspVRnd','Random',"Offsets every cycle's pitch randomly; the maximum positive/negative offset is this percentage of Sub-V (0% to 100%)",0,0,100)}${
        num('RaspVN','N. Size','The amount of normal pitch cycles before the new pitch cycles occur',1,1,32)}${
        num('RaspVL','L. Size','The amount of new pitch cycles before the normal pitch cycles occur',1,1,32)}
      </div>
    </div>`;
}
function raspSyncUI(p, id, st){
  const g = function(n){ return document.getElementById(p+n+id); };
  const v = g('RaspV'); if(!v) return;
  v.checked = !!st.ven; g('RaspVFields').style.display = (st.ven && !st.collapsed) ? '' : 'none';
  const cb = g('RaspVCollapse'); if(cb){ cb.style.display = st.ven ? '' : 'none'; cb.innerHTML = st.collapsed ? '<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>' : '<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>'; }
  const sp = g('RaspVSteep'); if(sp){ sp.value = st.steep||0; g('RaspVSteepVal').textContent = st.steep > 0 ? '+'+st.steep : String(st.steep||0); }
  g('RaspVLow').value = st.svLow; g('RaspVHigh').value = st.svHigh; g('RaspVRnd').value = st.vrnd; g('RaspVN').value = st.vn; g('RaspVL').value = st.vl;
  const fn = g('RaspVFn'); if(fn){ fn.value = st.fn; if(fn.value !== st.fn) fn.value = 'sine'; }
  const eg = g('RaspVEase'); if(eg) eg.querySelectorAll('.ease-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.val === st.ease); });
  const o = g('RaspVOff'); if(o){ o.value = st.off; g('RaspVOffVal').textContent = st.off > 0 ? '+'+st.off : String(st.off); }
}
function raspWire(p, id, st, apply, getOsc){
  const g = function(n){ return document.getElementById(p+n+id); };
  if(!g('RaspV')) return;
  raspSyncUI(p, id, st);
  const rnd = function(){ return (Math.random()*2147483646|0) + 1; };
  g('RaspV').addEventListener('change', function(){ st.ven = this.checked; raspSyncUI(p, id, st); st.vseed = rnd(); apply(); });
  if(g('RaspVCollapse')) g('RaspVCollapse').addEventListener('click', function(){ st.collapsed = !st.collapsed; raspSyncUI(p, id, st); });
  if(g('RaspVSteep')) g('RaspVSteep').addEventListener('input', function(){ st.steep = parseFloat(this.value)||0; raspNorm(st); g('RaspVSteepVal').textContent = st.steep > 0 ? '+'+st.steep : String(st.steep); apply(); });
  [['RaspVLow','svLow'],['RaspVHigh','svHigh'],['RaspVRnd','vrnd'],['RaspVN','vn'],['RaspVL','vl']].forEach(function(pr){
    g(pr[0]).addEventListener('input', function(){ const v = parseFloat(this.value); if(isNaN(v)) return; st[pr[1]] = v; raspNorm(st); if(pr[1] !== 'svLow' && pr[1] !== 'svHigh') st.vseed = rnd(); apply(); });
    g(pr[0]).addEventListener('change', function(){ raspNorm(st); this.value = st[pr[1]]; });
  });
  g('RaspVFn').addEventListener('change', function(){ st.fn = this.value; raspNorm(st); apply(); });
  g('RaspVEase').querySelectorAll('.ease-btn').forEach(function(b){
    b.addEventListener('click', function(){ st.ease = b.dataset.val; raspSyncUI(p, id, st); apply(); });
  });
  g('RaspVOff').addEventListener('input', function(){ st.off = parseFloat(this.value)||0; raspNorm(st); g('RaspVOffVal').textContent = st.off > 0 ? '+'+st.off : String(st.off); apply(); });
  if(g('RaspVGraph')) raspGraphs.push({cv:g('RaspVGraph'), rd:g('RaspVRead'), st:st, getOsc:getOsc});
}

const raspGraphs = [];
function raspCssVar(n, fb){ try{ const v = getComputedStyle(document.body).getPropertyValue(n).trim(); return v || fb; }catch(e){ return fb; } }
function raspDrawGraph(g){
  const cv = g.cv, st = g.st;
  const W = cv.offsetWidth, H = cv.offsetHeight; if(!W || !H) return;
  const peak = parseFloat(get('eRPM').value) || 3600;
  const osc = g.getOsc ? g.getOsc() : null;
  let rpm = (osc && osc._raspRPM !== undefined) ? osc._raspRPM : currentRPM;
  rpm = Math.max(0, Math.min(peak, rpm||0));
  const pct = raspSubVPct(st, rpm), hz = raspSubVHz(st, rpm);
  const sig = [W,H,peak,st.svLow,st.svHigh,st.fn,st.ease,st.off,st.steep,Math.round(rpm*2),document.body.className].join('|');
  if(cv._sig === sig) return; cv._sig = sig;
  const rdTxt = Math.round(rpm)+' RPM  '+pct.toFixed(1)+'%  '+hz.toFixed(2)+' Hz';
  window.vzPlot(cv, { xmin:0, xmax:peak, ymin:0, ymax:100, xlabel:'RPM', ylabel:'Sub-V (%)',
    series:[{ f:function(x){ return raspSubVPct(st, x); }, color:'#b48cff' }], marker:{ x:rpm, y:pct }, readout:rdTxt });
  if(g.rd) g.rd.textContent = rdTxt;
}
(function raspGraphLoop(){
  try{
    for(let i = raspGraphs.length-1; i >= 0; i--){
      const g = raspGraphs[i];
      if(!g.cv.isConnected){ raspGraphs.splice(i,1); continue; }
      if(g.cv.offsetParent === null) continue;
      raspDrawGraph(g);
    }
  }catch(e){}
  requestAnimationFrame(raspGraphLoop);
})();

function lpfPctAt(rpm, peak){
  const t = peak > 0 ? Math.max(0, Math.min(1, rpm/peak)) : 0;
  const low = Math.max(1, parseFloat(get('nFilterLow').value)||55)/100, high = Math.max(1, parseFloat(get('nFilterHigh').value)||85)/100;
  const off = (parseFloat(get('sFilterOffset').value)||0)/100;
  const ts = steepWarp(Math.max(0, Math.min(1, t - off*0.5)), get('sFilterSteep').value);
  let c = applyFn(get('dFilterFn').value, ts, get('dFilterEasing').value); if(!isFinite(c)) c = ts;
  return (low + (high-low)*c)*100;
}
function lpfDrawGraph(){
  const cv = document.getElementById('lpfCurveGraph'), rd = document.getElementById('lpfCurveRead');
  if(!cv || cv.offsetParent === null) return;
  const W = cv.offsetWidth, H = cv.offsetHeight; if(!W || !H) return;
  const peak = parseFloat(get('eRPM').value) || 3600;
  const rpm = Math.max(0, Math.min(peak, currentRPM||0));
  const pct = lpfPctAt(rpm, peak), hz = 20*Math.pow(1000, pct/100);
  const sig = [W,H,peak,get('nFilterLow').value,get('nFilterHigh').value,get('dFilterFn').value,get('dFilterEasing').value,get('sFilterOffset').value,get('sFilterSteep').value,Math.round(rpm*2),document.body.className].join('|');
  if(cv._sig === sig) return; cv._sig = sig;
  const rdTxt = Math.round(rpm)+' RPM  '+pct.toFixed(1)+'%  '+(hz>=1000?(hz/1000).toFixed(2)+'k':hz.toFixed(0))+' Hz';
  window.vzPlot(cv, { xmin:0, xmax:peak, ymin:0, ymax:100, xlabel:'RPM', ylabel:'Cutoff (%)',
    series:[{ f:function(x){ return lpfPctAt(x, peak); }, color:'#35b9f0' }], marker:{ x:rpm, y:pct }, readout:rdTxt });
  if(rd) rd.textContent = rdTxt;
}
(function lpfGraphLoop(){
  try{ lpfDrawGraph(); }catch(e){}
  requestAnimationFrame(lpfGraphLoop);
})();

function setOscWaveform(osc,type){
  osc._bt=type;
  if(raspActive(osc._rasp)){ raspApplyWave(osc,type,osc._rasp); return; }
  osc._raspN=1; osc._raspSig=null; osc._raspRk=null;
  if(type==='parabolic'){osc.setPeriodicWave(makeParabolicWave(audioCtx));}
  else{osc.type=type;}
}

function getEoWaveform(eo, globalWaveform){
  if(eo.type === 'harmonic') return 'sine';
  if(eo.waveform && eo.waveform !== 'default') return eo.waveform;
  return globalWaveform;
}

function getPermWaveform(key, globalWaveform){
  if(permOscWaveform[key] && permOscWaveform[key] !== 'default') return permOscWaveform[key];
  return globalWaveform;
}

const WAVEFORM_LABELS = {sine:'Sine', triangle:'Triangle', sawtooth:'Sawtooth', square:'Square', parabolic:'Parabolic'};
function refreshDefaultWaveformLabels(){
  const wfEl = get('dWaveform');
  if(!wfEl) return;
  const label = WAVEFORM_LABELS[wfEl.value] || wfEl.value;
  document.querySelectorAll('select[id^="eoWaveform"] option[value="default"], select[id^="permWaveform"] option[value="default"]').forEach(opt=>{
    opt.textContent = 'Default (' + label + ')';
  });
}

function buildFilterChain(){
  filterNodes.forEach(f=>{try{f.disconnect();}catch(e){}});
  filterNodes=[];
  if(!lpfEnabled){
    get('filterMeter').style.width='0%';
    get('filterCutoffTxt').textContent='BYPASS';
  } else {
    const slope=parseInt(get('dFilterSlope').value)||6;
    const count=slope/6;
    for(let i=0;i<count;i++){
      const f=audioCtx.createBiquadFilter();
      f.type='lowpass';f.Q.value=0.7071;
      if(filterNodes.length) filterNodes[filterNodes.length-1].connect(f);
      filterNodes.push(f);
    }
  }
  rebuildFxChain();
}

function _sirenInNode(){ return (window._sirenIn && audioCtx && window._sirenIn.context===audioCtx) ? window._sirenIn : masterGain; }

