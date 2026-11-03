
let audioCtx=null;
let oscNodes={hp:null,lp:null,hv:null,lv:null,ut:null,ot:null,hpSt:null,lpSt:null,_wf:null};
let gainNodes={hp:null,lp:null,hv:null,lv:null,ut:null,ot:null,hpSt:null,lpSt:null};
let bidirFilterNodes={hp:null,lp:null,hv:null,lv:null,ut:null,ot:null};

let extraOscs = [];

function isEoChopperForced(eo){
  const isSingle = get('dChopper').value === 'single';
  if(eo.type === 'harmonic') return false;
  const isHpVane = eo.type === 'vane' && (eo.linkedChopper === 'hp' || !eo.linkedChopper);
  return isSingle && !isHpVane;
}
function isEoUserDisabled(eo){
  return eo.enabled === false;
}
function isEoDisabled(eo){
  return isEoChopperForced(eo) || isEoUserDisabled(eo);
}
function refreshEoDisabledVisuals(eo){
  const item = document.getElementById('eoItem'+eo.id);
  if(item){
    item.classList.toggle('single-tone-disabled', isEoChopperForced(eo));
    item.classList.toggle('eo-off', isEoUserDisabled(eo));
  }
  if(eo.type === 'rotor'){
    const statorItem = document.getElementById('statorItem'+eo.id);
    if(statorItem) statorItem.classList.toggle('single-tone-disabled', isEoChopperForced(eo));
  }
}

let extraOscCounter = 0;
let filterNodes=[];
let lpfEnabled=true;
let reverbEnabled=true;
let reverbNode=null;
let reverbWetGain=null;
let reverbDryGain=null;
let reverbPreDelay=null;
let reverbHFDamp=null;
let reverbLowCut=null;
let reverbBuildPending=false;

let reverb2Enabled=true;
let reverb2Node=null;
let reverb2WetGain=null;
let reverb2DryGain=null;
let reverb2PreDelay=null;
let reverb2HFDamp=null;
let reverb2LowCut=null;
let reverb2BuildPending=false;
let reverb2SplitGain=null;

let reverb3Enabled=true;
let reverb3Node=null;
let reverb3WetGain=null;
let reverb3DryGain=null;
let reverb3PreDelay=null;
let reverb3HFDamp=null;
let reverb3LowCut=null;
let reverb3BuildPending=false;
let reverb3SplitGain=null;

let spatialFxMode='omni';
let distanceEnabled=true;
let distancePanner=null;
let distanceCenterSrc=null;
let distanceLfo=null;
let distanceDepthGain=null;
let distancePreGainNode=null;
let distanceAutoFilterNode=null;
let posRecalc=null;
let getPosMapState=null;
let setPosMapState=null;
let getUserAngleDeg=null;

function getUserHeadingDeg() {
  const cb = document.getElementById('posUserTidal'), inp = document.getElementById('posUserDir');
  const v = inp ? parseFloat(inp.value) : 0, val = isFinite(v) ? v : 0;
  let h = val;
  if (!cb || cb.checked) {
    const ua = (typeof getUserAngleDeg === 'function') ? (getUserAngleDeg() || 0) : 0;
    h = ua + 180 + val;
  }
  return ((h % 360) + 360) % 360;
}

function getRelativeAngleDeg() {
  const userAngle = (typeof getUserAngleDeg === 'function') ? (getUserAngleDeg() || 0) : 0;
  const facing = (typeof rotAngleDeg === 'number' && isFinite(rotAngleDeg)) ? rotAngleDeg : 0;
  const rel = ((facing - (isFinite(userAngle) ? userAngle : 0)) % 360 + 360) % 360;
  return isFinite(rel) ? rel : 0;
}

function interpDispersion(raw, lo, mid, hi) {
  if (raw >= 0.5) {
    const t = (raw - 0.5) / 0.5;
    return mid + (hi - mid) * t;
  }
  const t = raw / 0.5;
  return lo + (mid - lo) * t;
}

window._dispHandles = window._dispHandles || { max: { x: 30, y: 0 }, mid: null, min: { x: -30, y: 0 } };
function _dispCleanHandles(o){
  const out = { max: { x: 30, y: 0 }, mid: null, min: { x: -30, y: 0 } };
  ['max','mid','min'].forEach(function(k){ const v = o && o[k]; if (v && isFinite(+v.x) && isFinite(+v.y)) out[k] = { x: +v.x, y: +v.y }; });
  return out;
}
function _dispFold(thetaDeg, bidir){
  let t = ((thetaDeg % 360) + 360) % 360; if (t > 180) t = 360 - t;
  if (bidir && t > 90) t = 180 - t;
  return t;
}
function _dispSegs(hi, mid, lo, bidir){
  const H = window._dispHandles || {}, D = Math.PI / 180;
  const A = bidir ? [[0, hi], [90, mid]] : [[0, hi], [90, mid], [180, lo]];
  const sL = bidir ? 0 : -(hi - mid) * D, sR = bidir ? 0 : -(mid - lo) * D;
  const cl = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  const segs = [];
  for (let i = 0; i < A.length - 1; i++){
    const a = A[i], b = A[i + 1], w = b[0] - a[0];
    const o = (i === 0) ? (H.max ? [cl(H.max.x, 0.5, w), H.max.y] : [w / 3, 0])
                        : (H.mid ? [cl(H.mid.x, 0.5, w), H.mid.y] : [w / 3, sR * w / 3]);
    const n = (i + 1 === 1) ? (H.mid ? [-cl(H.mid.x, 0.5, w), -H.mid.y] : [-w / 3, -sL * w / 3])
                            : (H.min ? [cl(H.min.x, -w, -0.5), H.min.y] : [-w / 3, 0]);
    segs.push([a, [a[0] + o[0], a[1] + o[1]], [b[0] + n[0], b[1] + n[1]], b]);
  }
  return segs;
}
function _dispBz(p, k, s){ const u = 1 - s; return u*u*u*p[0][k] + 3*u*u*s*p[1][k] + 3*u*s*s*p[2][k] + s*s*s*p[3][k]; }
window._dispHandles360 = window._dispHandles360 || { a0: null, a90: null, a180: null, a270: null };
function _dispCleanHandles360(o){
  const out = { a0: null, a90: null, a180: null, a270: null };
  Object.keys(out).forEach(function(k){ const v = o && o[k]; if (v && isFinite(+v.x) && isFinite(+v.y)) out[k] = { x: +v.x, y: +v.y }; });
  return out;
}
function dispIs360(){ const e = document.getElementById('nDispSpan'); return !!e && e.value === '360'; }
function _disp360Pts(hi, mid, lo, bidir, mid2){
  const H = window._dispHandles360 || {}, keys = ['a0', 'a90', 'a180', 'a270'];
  let m2 = mid2; if (m2 === undefined || !isFinite(m2)) { const e = document.getElementById('nLeftDispersion'), v = e ? parseFloat(e.value) : NaN; m2 = isFinite(v) ? v : mid; }
  const vals = [hi, mid, bidir ? hi : lo, m2];
  return vals.map(function(v, i){
    const h = H[(bidir && i === 2) ? 'a0' : keys[i]];
    return { a: i * 90, v: v, hx: h ? h.x : 30, hy: h ? h.y : (vals[(i + 1) % 4] - vals[(i + 3) % 4]) / 6 };
  });
}
function dispEval360(thetaDeg, hi, mid, lo, bidir, mid2){
  const P = _disp360Pts(hi, mid, lo, bidir, mid2), t = ((thetaDeg % 360) + 360) % 360, i = Math.min(3, Math.floor(t / 90));
  const a = P[i], b = P[(i + 1) % 4], bx = (i + 1) * 90, cl = function(v, x, y){ return Math.max(x, Math.min(y, v)); };
  let ox = cl(a.hx, 0.5, 89), ix = cl(b.hx, 0.5, 89); if (ox + ix > 90) { const k = 90 / (ox + ix); ox *= k; ix *= k; }
  const sg = [[a.a, a.v], [a.a + ox, a.v + a.hy], [bx - ix, b.v - b.hy], [bx, b.v]];
  let lo2 = 0, hi2 = 1;
  for (let n = 0; n < 28; n++){ const m = (lo2 + hi2) / 2; if (_dispBz(sg, 0, m) < t) lo2 = m; else hi2 = m; }
  return _dispBz(sg, 1, (lo2 + hi2) / 2);
}
function dispCurveEval(thetaDeg, hi, mid, lo, bidir, mid2){
  if (dispIs360()) return dispEval360(thetaDeg, hi, mid, lo, bidir, mid2);
  const H = window._dispHandles || {};
  if (!H.max && !H.mid && !H.min){
    const th = thetaDeg * Math.PI / 180;
    const raw = bidir ? 0.5 + 0.25 * (1 + Math.cos(2 * th)) : (1 + Math.cos(th)) / 2;
    return interpDispersion(raw, lo, mid, hi);
  }
  const t = _dispFold(thetaDeg, bidir), segs = _dispSegs(hi, mid, lo, bidir);
  let sg = segs[segs.length - 1];
  for (let i = 0; i < segs.length; i++){ if (t <= segs[i][3][0]){ sg = segs[i]; break; } }
  let a = 0, b = 1;
  for (let i = 0; i < 28; i++){ const m = (a + b) / 2; if (_dispBz(sg, 0, m) < t) a = m; else b = m; }
  return _dispBz(sg, 1, (a + b) / 2);
}

function computeEffectiveDispersion() {
  const maxD = parseFloat((get('nMaxDispersion')||{}).value);
  const minD = parseFloat((get('nMinDispersion')||{}).value);
  const midD = parseFloat((get('nMidDispersion')||{}).value);
  const hi = isNaN(maxD) ? 100 : maxD;
  const lo = isNaN(minD) ? -100 : minD;
  const mid = isNaN(midD) ? (hi + lo) / 2 : midD;
  const mode = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni';
  if (mode === 'omni') return hi;
  const isBidir = (mode === 'rotationalBidir' || mode === 'directionalBidir');
  return dispCurveEval(getRelativeAngleDeg(), hi, mid, lo, isBidir);
}

function updateMidDispersionAuto() {
  const auto = get('tMidDispersionAuto');
  const mid = get('nMidDispersion');
  if (!auto || !mid) return;
  if (auto.checked) {
    const maxD = parseFloat((get('nMaxDispersion')||{}).value);
    const minD = parseFloat((get('nMinDispersion')||{}).value);
    const hi = isNaN(maxD) ? 100 : maxD;
    const lo = isNaN(minD) ? -100 : minD;
    mid.value = Math.round((hi + lo) / 2);
    auto.checked = false;
  }
  mid.disabled = false;
}

function updateEffectiveDispersion() {
  const slider = get('sDispersionRate');
  if (!slider) return;
  const v = (function(){ const _b = computeEffectiveDispersion(), _a = window.rcDispersionAdd ? window.rcDispersionAdd() : 0; let _t = _b + _a; if(_a !== 0) _t = Math.max(0, _t); return Math.max(-200, Math.min(200, Math.round(_t * 100) / 100)); })();
  slider.value = v;
  const label = get('svDispersionRate');
  const vi = Math.round(v);
  if (label) label.textContent = (vi > 0 ? '+' : '') + vi;
}

let directionEnabled=true;
let sosEnabled=false;
let directionPanner=null;
let directionCenterSrc=null;
let directionLfo=null;
let directionDepthGain=null;

let rotationEnabled=false;
let rotLinkedToChopper=false;
let rotMode='linked';
let rotAngleDeg=0;
let rotRPM=0;
let _rotRampRPM=0;
let _rotRampTarget=null;
let _rotRampStartRPM=0;
let _rotRampStartTime=null;
let rotAnimId=null;
let rotAnimLastTs=null;

let slpfEnabled=true;
let slpfNode=null;
let slpfWetGain=null;
let slpfDryGain=null;
let slpfSplitGain=null;

let hpfEnabled=true;
let hpfNode=null;
let hpfWetGain=null;
let hpfDryGain=null;
let hpfSplitGain=null;

let distEnabled=true;
let distNode=null;
let distPostFilter=null;
let distWetGain=null;
let distDryGain=null;
let distOutputGain=null;
let distSplitGain=null;

let blowerEnabled=false;
let blowerNode=null;
let blowerWetGain=null;
let blowerDryGain=null;
let blowerOutputGain=null;
let blowerPreGain=null;
let blowerPostFilter=null;
let blowerSplitGain=null;
let blowerFadeAnimId=null;
let blowerFadeStart=null;
let blowerFadeFrom=1;
let blowerFadeTo=1;
let blowerFadeDur=3000;
let blowerCurrentGain=1;

let masterGain = null;

let normEnabled = true;
let normPreGainNode = null;
let normLimiterNode = null;
let normPostGainNode = null;
let normMeterRafId = null;

let currentRPM=0;
let damperExtraRPM=0;
let active=false;

