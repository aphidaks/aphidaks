
get('nDampRate').addEventListener('input',()=>{updateContactorMaxRpmLabel();});

let showHighVanes = true;
let showLowVanes = true;
let chopperAnimEnabled = true;
let chopperAnimId = null;
let chopperAngleA = 0;
let chopperAngleB = 0;
let chopperAnimLastTs = null;


function getPermOscColor(id, fallback){
  const el = document.getElementById('permColor'+id);
  return (el && el.value) ? el.value : fallback;
}

function darkenHex(hex, amount){
  hex = hex.replace('#','');
  if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  const dr=Math.max(0,Math.round(r*(1-amount))),dg=Math.max(0,Math.round(g*(1-amount))),db=Math.max(0,Math.round(b*(1-amount)));
  return '#'+[dr,dg,db].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function _chopVaneOwner(v){ var k = window.rcParentOf ? window.rcParentOf(String(v.id)) : ''; if(!k) k = (v.linkedChopper||'hp'); return String(k).replace(/^eo/,''); }
function _chopVaneLive(v){ return v.type==='vane' && v.visible !== false && !isEoUserDisabled(v) && !isEoChopperForced(v); }
function _chopVaneEnd(R, floorR, len){ var tick = R*0.22, t = 1, maxD = Math.max(tick, R - Math.max(0,floorR)); return R - (tick + t*(maxD - tick)); }
function _chopPos(id, def){ var e = document.getElementById(id), v = e ? parseFloat(e.value) : NaN; return v > 0 ? v : def; }

function _drawChopperStrokes(ctx, R, ports, vanes, showVanes, vaneLen, isDouble, innerR, innerPorts, innerVanes, showInnerVanes, innerVaneLen, rotorColor, vaneColor, innerRotorColor, innerVaneColor){
  const _R0 = R;
  const _wallPx = k => _R0 * (window.rcParam && k ? window.rcParam('rotor', k, 'rotorWall', 4.5) : 4.5) / 100;
  const _lw = _wallPx(window._rcKeyRotor), _lwIn = _wallPx('lp') * 2.5/3;
  const _scIn = window.rcRotorScale ? window.rcRotorScale('lp') : 1;
  const _scHp = window.rcRotorScale ? window.rcRotorScale(window._rcKeyRotor) : 1;
  if(window.rcRotorScale){ innerR *= _scHp; R *= _scHp; }
  const _Rw = R + 1.5 - _lw/2;
  const portCount = Math.max(1, Math.round(ports));
  const portSpan  = (Math.PI * 2) / portCount;
  const gapHalfWidth = portSpan * (1 - (window.rcMark ? window.rcMark(window._rcKeyRotor) : 50) / 100) / 2;
  {
    const tickLen = R * 0.22;
    ctx.beginPath(); ctx.arc(0,0,_Rw,0,Math.PI*2);
    ctx.strokeStyle = rotorColor; ctx.lineWidth = _lw; ctx.stroke();
    ctx.beginPath();
    for(let i = 0; i < portCount; i++){
      const aMid = (i / portCount) * Math.PI * 2 + portSpan*0.5;
      ctx.moveTo(Math.cos(aMid-gapHalfWidth)*_Rw, Math.sin(aMid-gapHalfWidth)*_Rw);
      ctx.arc(0,0,_Rw,aMid-gapHalfWidth,aMid+gapHalfWidth);
    }
    ctx.strokeStyle = '#151618'; ctx.lineWidth = _lw + 1.5; ctx.stroke();
    ctx.beginPath();
    for(let i = 0; i < 0; i++){
      const a = (i / portCount) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      ctx.moveTo(c*R, sn*R); ctx.lineTo(c*(R-tickLen), sn*(R-tickLen));
    }
    ctx.strokeStyle = rotorColor; ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0,0,_Rw,0,Math.PI*2);
  ctx.strokeStyle = rotorColor+'59'; ctx.lineWidth = _lw; ctx.stroke();
  if(showVanes){
    const vaneCount  = Math.max(1, Math.round(vanes));
    const vaneInner  = (isDouble && !(window.rcLayering && window.rcLayering()==='pass')) ? innerR : 0;
    const t          = 1;
    const portTickD  = R*0.22;
    const vaneEndR   = R - (portTickD + t*(R-vaneInner-portTickD));
    if(window.rcDrawVanes) window.rcDrawVanes(ctx,window._rcKeyOuter,window._rcKeyRotor,portCount,vaneCount,R,vaneEndR,vaneColor);
    else { ctx.beginPath();
      for(let i=0;i<vaneCount;i++){ const a=(i/vaneCount)*Math.PI*2; ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R); ctx.lineTo(Math.cos(a)*vaneEndR,Math.sin(a)*vaneEndR); }
      ctx.strokeStyle=vaneColor; ctx.lineWidth=2.5; ctx.stroke(); }
  }
  if(isDouble){
    innerR *= _scIn / (_scHp||1);
    if(window._lyr){ ctx.globalAlpha=window._lyr.inRot; window._vaneLvl=window._lyr.inVane; }
    const innerPortCount=Math.max(1,Math.round(innerPorts));
    const innerPortSpan=(Math.PI*2)/innerPortCount;
    const innerGapHW=innerPortSpan*(1 - (window.rcMark ? window.rcMark('lp') : 50) / 100) / 2;
    for(let i=0;i<innerPortCount;i++){
      const a=(i/innerPortCount)*Math.PI*2;
      const aNext=a+innerPortSpan;
      ctx.beginPath(); ctx.arc(0,0,innerR,a,aNext);
      ctx.strokeStyle=innerRotorColor; ctx.lineWidth=_lwIn; ctx.stroke();
      const aMid=a+innerPortSpan*0.5;
      ctx.beginPath(); ctx.arc(0,0,innerR,aMid-innerGapHW,aMid+innerGapHW);
      ctx.strokeStyle='#151618'; ctx.lineWidth=_lwIn+1.5; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0,0,innerR,0,Math.PI*2);
    ctx.strokeStyle=innerRotorColor+'59'; ctx.lineWidth=_lwIn; ctx.stroke();
    if(showInnerVanes){
      const ivc=Math.max(1,Math.round(innerVanes));
      const t2=1;
      const itd=innerR*0.26;
      const iver=innerR-(itd+t2*(innerR-itd));
      if(window.rcDrawVanes){ const _pt=window.rcLayering&&window.rcLayering()==='pass'; var _sv=window._vaneLvl; if(_pt){ ctx.globalAlpha=0.5; window._vaneLvl=(_sv===undefined?1:_sv)*0.5; } window.rcDrawVanes(ctx,'lv','lp',innerPortCount,ivc,innerR,iver,innerVaneColor); window._vaneLvl=_sv; ctx.globalAlpha=1; }
      else for(let i=0;i<ivc;i++){
        const a=(i/ivc)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*innerR,Math.sin(a)*innerR); ctx.lineTo(Math.cos(a)*iver,Math.sin(a)*iver);
        ctx.strokeStyle=innerVaneColor; ctx.lineWidth=2.5; ctx.stroke();
      }
    }
  }
}

function hiResK(){ var d=Math.max(1,window.devicePixelRatio||1), z=window._uiZoom||1; return Math.min(4,Math.max(1,Math.round(d*z*4)/4)); }
function hiResApply(canvas){
  var st=canvas._hr; if(!st) return false;
  var P=HTMLCanvasElement.prototype, dw=Object.getOwnPropertyDescriptor(P,'width'), dh=Object.getOwnPropertyDescriptor(P,'height');
  var k=hiResK(); if(window._ocOn&&(canvas.id==='chopperCanvasA'||canvas.id==='chopperCanvasB'||canvas.id.indexOf('extraChopperCanvas')===0||canvas.id.indexOf('recChopperCanv')===0)) k=0.75; var bw=Math.max(1,Math.round(st.cw*k)), bh=Math.max(1,Math.round(st.ch*k)), changed=false;
  if(dw.get.call(canvas)!==bw){ dw.set.call(canvas,bw); changed=true; }
  if(dh.get.call(canvas)!==bh){ dh.set.call(canvas,bh); changed=true; }
  st.sx=bw/st.lw; st.sy=bh/st.lh;
  canvas.style.width=st.cw+'px'; canvas.style.height=st.ch+'px'; canvas.style.maxWidth='none'; canvas.style.maxHeight='none';
  return changed;
}
function hiResCanvas(canvas, lw, lh, cssW, cssH){
  if(!canvas) return;
  var st=canvas._hr;
  if(st && lw===undefined){ hiResApply(canvas); return; }
  lw=lw||canvas.width||160; lh=lh||canvas.height||160; cssW=cssW||lw; cssH=cssH||lh;
  if(!st){
    st=canvas._hr={lw:lw,lh:lh,cw:cssW,ch:cssH,sx:1,sy:1};
    Object.defineProperty(canvas,'width',{configurable:true,get:function(){ return st.lw; },set:function(v){ v=+v; if(v>0){ st.lw=v; hiResApply(canvas); } }});
    Object.defineProperty(canvas,'height',{configurable:true,get:function(){ return st.lh; },set:function(v){ v=+v; if(v>0){ st.lh=v; hiResApply(canvas); } }});
    canvas.getContext=function(type,opts){ var c=HTMLCanvasElement.prototype.getContext.call(canvas,type,opts); if(type==='2d'&&c) c.setTransform(st.sx,0,0,st.sy,0,0); return c; };
    canvas.setAttribute('data-hires','1');
  } else { st.lw=lw; st.lh=lh; st.cw=cssW; st.ch=cssH; }
  hiResApply(canvas);
}
window._hiResRefresh=function(){
  try{ if(window._simGraphsRefresh) window._simGraphsRefresh(); if(window._wiringRefresh) window._wiringRefresh(); }catch(e){}
  var any=false; document.querySelectorAll('canvas[data-hires]').forEach(function(c){ if(hiResApply(c)) any=true; });
  if(any){ try{ if(typeof redrawChoppers==='function' && typeof chopperAnimEnabled!=='undefined' && !chopperAnimEnabled) redrawChoppers(chopperAngleA,chopperAngleB); if(typeof syncChopperCanvas==='function') syncChopperCanvas(); }catch(e){} }
};

function drawChopper(canvas, ports, vanes, showVanes, angleRad, isDouble, innerPorts, innerVanes, showInnerVanes, vaneLen, innerVaneLen){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  const R = W * 0.42;
  const innerR = isDouble ? R * (window.rcLayer ? window.rcLayer() : 0.55) : 0;

  const isCanvasB   = canvas.id === 'chopperCanvasB';
  const rotorColorId= isCanvasB ? 'Lp' : 'Hp';
  const vaneColorId = isCanvasB ? 'Lv' : 'Hv';
  const rotorColor      = getPermOscColor(rotorColorId, '#757575');
  const vaneColor       = getPermOscColor(vaneColorId,  '#757575');
  const innerRotorColor = getPermOscColor('Lp', '#757575');
  const innerVaneColor  = getPermOscColor('Lv', '#757575');
  const rotorDark       = darkenHex(rotorColor, 0.12);
  window._rcKeyOuter = isCanvasB ? 'lv' : 'hv';
  window._rcKeyRotor = isCanvasB ? 'lp' : 'hp';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
  const bgGrad = ctx.createRadialGradient(0,0,0,0,0,R);
  bgGrad.addColorStop(0, rotorDark+'55');
  bgGrad.addColorStop(1, '#151618');
  if(window._ocOn){
    const _h=rotorColor.replace('#',''), _f=_h.length===3?_h.replace(/./g,'$&$&'):_h, _m=function(i){ return Math.round(parseInt(_f.substr(i,2),16)*0.45+255*0.55); };
    ctx.fillStyle='rgb('+_m(0)+','+_m(2)+','+_m(4)+')'; ctx.fill();
  } else {
  ctx.fillStyle='#151618'; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2);
  ctx.fillStyle=bgGrad; ctx.fill();
  }
  ctx.restore();

  if(isDouble && innerR > 0){
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.arc(0,0,innerR,0,Math.PI*2,true); ctx.clip();
    const bandGrad = ctx.createRadialGradient(0,0,innerR,0,0,R);
    bandGrad.addColorStop(0, rotorDark+'66');
    bandGrad.addColorStop(1, rotorColor+'33');
    ctx.fillStyle = bandGrad; ctx.fillRect(-R,-R,R*2,R*2);
    ctx.restore();
    const _cdPct = window.rcParam ? window.rcParam('rotor', 'hp', 'centerDiameter', 0) : 0;
    const holeR = Math.min(innerR*0.9, Math.max(R*0.065, Math.max(0, Math.min(100, _cdPct))/100 * R * 0.85) + 2);
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0,0,innerR,0,Math.PI*2); ctx.fillStyle = '#151618'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,innerR,0,Math.PI*2); ctx.arc(0,0,holeR,0,Math.PI*2,true);
    const _ic = innerRotorColor, _icd = darkenHex(innerRotorColor, 0.12);
    const coreGrad = ctx.createRadialGradient(0,0,holeR,0,0,innerR);
    coreGrad.addColorStop(0, _icd+'66'); coreGrad.addColorStop(1, _ic+'33');
    ctx.fillStyle = coreGrad; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,holeR,0,Math.PI*2);
    const hubGrad = ctx.createRadialGradient(0,0,0,0,0,holeR); hubGrad.addColorStop(0, _icd+'33'); hubGrad.addColorStop(1, _ic+'55');
    ctx.fillStyle = hubGrad; ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  const _lvl = id => { const e = document.getElementById(id); const v = e ? parseFloat(e.value) : NaN; return isNaN(v) ? 1 : Math.max(0, Math.min(1, v/100)); };
  ctx.globalAlpha = 0.3 + 0.7 * _lvl(isCanvasB ? 'sLP' : 'sHP');
  window._vaneLvl = undefined;
  window._lyr = isDouble ? {inRot: 0.3 + 0.7 * _lvl('sLP'), inVane: 1} : undefined;
  try { _drawChopperStrokes(ctx, R, ports, vanes, showVanes, vaneLen, isDouble, innerR, innerPorts, innerVanes, showInnerVanes, innerVaneLen, rotorColor, vaneColor, innerRotorColor, innerVaneColor); }
  finally { window._vaneLvl = undefined; window._lyr = undefined; }
  if(isDouble && innerR > 0){
    const _sc = window.rcRotorScale ? window.rcRotorScale('hp') : 1;
    const _wall = R * (window.rcParam ? window.rcParam('rotor', 'hp', 'rotorWall', 4.5) : 4.5) / 100;
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(0, 0, innerR * _sc, 0, Math.PI*2);
    ctx.strokeStyle = rotorColor; ctx.lineWidth = _wall; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI*2);
  ctx.fillStyle = '#444860';
  ctx.fill();
}

function _setTxt(el,v){ if(el.textContent!==v) el.textContent=v; }
function redrawChoppers(angleA, angleB){
  { const _hk = hiResK()+'|'+(window._ocOn?1:0);
    if(_hk !== window._chopHK || !get('chopperCanvasA')._hr){ window._chopHK = _hk; hiResCanvas(get('chopperCanvasA')); hiResCanvas(get('chopperCanvasB')); } }
  const mode = get('dChopper').value;
  const isSingle = mode === 'single';
  const isDC = mode === 'dblchopper';
  const isDouble = mode === 'double';

  const hp = parseFloat(get('eHigherPort').value)||12;
  const hv = parseFloat(get('eHigherVanes').value)||5;
  const lp = parseFloat(get('eLowerPort').value)||10;
  const lv = parseFloat(get('eLowerVanes').value)||4;
  const hvLen = parseFloat(get('sHVane').value) / 100;
  const lvLen = parseFloat(get('sLVane').value) / 100;


  const aRad = (angleA || 0) * Math.PI / 180;
  const bRad = (angleB || 0) * Math.PI / 180;

  const wrap = get('chopperVisWrap');
  const _cs = mode+'|'+chopperDiagPage+'|'+extraOscs.filter(e=>e.type==='rotor').map(e=>e.id+(e.visible===false?'h':'v')).join(',');
  const _csChanged = _cs !== window._chopSig; window._chopSig = _cs;
  if(_csChanged) wrap.querySelectorAll('.extra-chopper-wrap').forEach(el=>el.remove());

  let _chopStash = document.getElementById('chopperCanvasStash');
  if (!_chopStash) {
    _chopStash = document.createElement('div');
    _chopStash.id = 'chopperCanvasStash';
    _chopStash.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(_chopStash);
  }
  if(_csChanged) _chopStash.querySelectorAll('[id^="extraChopperWrap_eo"]').forEach(function(el){
    var eid = parseInt(el.id.replace('extraChopperWrap_eo',''));
    if (!extraOscs.some(function(e){return e.id===eid && e.type==='rotor';})) el.remove();
  });

  const wrapA = get('chopperCanvasWrapA');
  const wrapB = get('chopperCanvasWrapB');

  if(isSingle){
    rebuildChopperDiagramNav();
    wrapA.style.display = '';
    wrapB.style.display = 'none';
    _setTxt(get('chopperLabelA'), (get('permNameHp') && get('permNameHp').value) ? get('permNameHp').value : 'HIGH ROTOR');
    get('chopperLabelA').style.color = '';
    get('chopperLabelA').style.visibility = isRotorVisible('hp') ? '' : 'hidden';
    if(isRotorVisible('hp')){
      drawChopper(get('chopperCanvasA'), hp, hv, showHighVanes && isVaneVisible('hv'), aRad, false, 0, 0, false, hvLen);
      const extraVanes = extraOscs.filter(_chopVaneLive);
      extraVanes.forEach(eo=>{
        if((eo.linkedChopper||'hp')==='hp') drawExtraVanesOnCanvas(get('chopperCanvasA'), parseFloat(eo.value)||1, aRad, (eo.mixerVal ?? 50)/100, eo.customColor||null, eo.id);
      });
      if(permStator.hp.visible) drawPermStatorRing(get('chopperCanvasA'), hp, permStator.hp);
    } else {
      const ctx = get('chopperCanvasA').getContext('2d');
      ctx.clearRect(0,0,get('chopperCanvasA').width,get('chopperCanvasA').height);
    }
    return;
  }

  if(isDouble){
    rebuildChopperDiagramNav();
    wrapA.style.display = '';
    wrapB.style.display = 'none';
    const extraRotors = extraOscs.filter(eo=>eo.type==='rotor');
    const extraVanesAll = extraOscs.filter(_chopVaneLive);
    if(isRotorVisible('hp') && isRotorVisible('lp') && !extraRotors.some(eo=>eo.visible !== false)){
      const cv = get('chopperCanvasA');
      drawChopper(cv, hp, hv, showHighVanes && isVaneVisible('hv'), aRad, true, lp, lv, showLowVanes && isVaneVisible('lv'), hvLen, lvLen);
      const _own = v => { let k = window.rcParentOf ? window.rcParentOf(String(v.id)) : ''; return k || (v.linkedChopper||'hp').replace(/^eo/,''); };
      const ctx = cv.getContext('2d'), W = cv.width, R = W*0.42, cx = W/2;
      const L = window.rcLayer ? window.rcLayer() : 0.55;
      ctx.save(); ctx.translate(cx, cx); ctx.rotate(aRad);
      const _pass = window.rcLayering && window.rcLayering()==='pass';
      extraVanesAll.forEach(v=>{
        const owner = _own(v); if(owner !== 'hp' && owner !== 'lp') return;
        const inner = owner === 'lp';
        const Rs = (inner ? R*L : R) * (window.rcRotorScale ? window.rcRotorScale(owner) : 1);
        const floor = (!inner && !_pass) ? R*L*(window.rcRotorScale ? window.rcRotorScale('lp') : 1) : 0;
        const endR = _chopVaneEnd(Rs, floor, (v.mixerVal ?? 50)/100);
        const _sv = window._vaneLvl; window._vaneLvl = undefined;
        if(window.rcDrawVanes) window.rcDrawVanes(ctx, String(v.id), owner, inner?lp:hp, Math.max(1,Math.round(parseFloat(v.value)||1)), Rs, endR, v.customColor||'#757575');
        window._vaneLvl = _sv;
      });
      ctx.restore();
      if(permStator.hp.visible) drawPermStatorRing(cv, hp, permStator.hp);
      _setTxt(get('chopperLabelA'), 'MULTI-TONE (2)');
      get('chopperLabelA').style.color = '';
      return;
    }
    const rings = [];
    const _own = v => { let k = window.rcParentOf ? window.rcParentOf(String(v.id)) : ''; if(!k) k = (v.linkedChopper||'hp').replace(/^eo/,''); return k; };
    const _xv = (lk, fallback) => extraVanesAll.filter(v=>_own(v)===lk.replace(/^eo/,'') && v.visible !== false)
      .map(v=>({id:v.id, count:parseFloat(v.value)||1, len:(v.mixerVal ?? 40)/100, color:v.customColor||fallback}));
    if(isRotorVisible('hp')){
      rings.push({lvl:'sHP', vlvl:'sHVane', rk:'hp', vk:'hv', ports:hp, vanes:hv, vaneLen:hvLen, color:getPermOscColor('Hp','#757575'), vaneColor:getPermOscColor('Hv','#757575'), showVanes: showHighVanes && isVaneVisible('hv'), label:'HIGH', stator: permStator.hp, extraVanes:_xv('hp',getPermOscColor('Hv','#757575'))});
    }
    if(isRotorVisible('lp')){
      rings.push({lvl:'sLP', vlvl:'sLVane', rk:'lp', vk:'lv', ports:lp, vanes:lv, vaneLen:lvLen, color:getPermOscColor('Lp','#757575'), vaneColor:getPermOscColor('Lv','#757575'), showVanes: showLowVanes && isVaneVisible('lv'), label:'LOW', stator: permStator.lp, extraVanes:_xv('lp',getPermOscColor('Lv','#757575'))});
    }
    extraRotors.filter(eo=>eo.visible !== false).forEach(eo=>{
      const col = getEoColor(eo);
      const vaneLen = 0.4, hasVanes = false;
      const eoStator = (eo.statorVisible !== false) ? {visible:true, linked:eo.statorLinked !== false, val:eo.statorVal||null, color:eo.statorColor||'#e5a61f'} : {visible:false};
      rings.push({lvlv:(eo.mixerVal ?? 50)/100, rk:String(eo.id), vk:'', ports:parseFloat(eo.value)||1, vanes:0, vaneLen, color:col, showVanes:true, label:getEoDisplayName(eo), eo, hasVanes, stator:eoStator, extraVanes:_xv('eo'+eo.id,col)});
    });
    _setTxt(get('chopperLabelA'), 'MULTI-TONE ('+rings.length+')');
    get('chopperLabelA').style.color = '';
    drawConcentricRotorCanvas(get('chopperCanvasA'), rings, aRad, showHighVanes, showLowVanes);
    return;
  }

  const extraRotors = extraOscs.filter(eo=>eo.type==='rotor');
  const slots = [];
  slots.push({type:'builtin-a'});
  slots.push({type:'builtin-b'});
  extraRotors.forEach(eo => slots.push({type:'extra', eo}));

  rebuildChopperDiagramNav();

  const startSlot = (chopperDiagPage - 1) * CHOP_PER_PAGE;
  const endSlot   = Math.min(startSlot + CHOP_PER_PAGE, slots.length);
  const visibleSlots = slots.slice(startSlot, endSlot);

  const showA = visibleSlots.some(s=>s.type==='builtin-a');
  const showB = visibleSlots.some(s=>s.type==='builtin-b');
  wrapA.style.display = showA ? '' : 'none';
  wrapB.style.display = showB ? '' : 'none';

  _setTxt(get('chopperLabelA'), (get('permNameHp') && get('permNameHp').value) ? get('permNameHp').value : 'HIGH ROTOR');
  get('chopperLabelA').style.color = '';
  get('chopperLabelA').style.visibility = isRotorVisible('hp') ? '' : 'hidden';
  if(isRotorVisible('hp')){
    drawChopper(get('chopperCanvasA'), hp, hv, showHighVanes && isVaneVisible('hv'), aRad, false, 0, 0, false, hvLen);
    if(permStator.hp.visible) drawPermStatorRing(get('chopperCanvasA'), hp, permStator.hp);
  } else {
    const ctx = get('chopperCanvasA').getContext('2d'); ctx.clearRect(0,0,get('chopperCanvasA').width,get('chopperCanvasA').height);
  }
  const lblB = get('chopperLabelB');
  if(lblB) _setTxt(lblB, (get('permNameLp') && get('permNameLp').value) ? get('permNameLp').value : 'LOW ROTOR');
  if(lblB) lblB.style.visibility = isRotorVisible('lp') ? '' : 'hidden';
  if(isRotorVisible('lp')){
    drawChopper(get('chopperCanvasB'), lp, lv, showLowVanes && isVaneVisible('lv'), bRad, false, 0, 0, false, lvLen);
    if(permStator.lp.visible) drawPermStatorRing(get('chopperCanvasB'), lp, permStator.lp);
  } else {
    const ctx = get('chopperCanvasB').getContext('2d'); ctx.clearRect(0,0,get('chopperCanvasB').width,get('chopperCanvasB').height);
  }

  visibleSlots.filter(s=>s.type==='extra').forEach(s=>{
    const eo = s.eo;
    if(eo.visible === false) return;
    const portVal = parseFloat(eo.value)||1;
    const mixLen = (eo.mixerVal ?? 50)/100;
    const col = getEoColor(eo);
    { const _o = document.getElementById('extraChopperWrap_eo'+eo.id); if(_o && _o.parentElement === document.getElementById('chopperCanvasStash')) _o.remove(); }
    addExtraRotorCanvas(wrap, eo, portVal, 0, aRad, false, mixLen, col, getEoDisplayName(eo));
    if(eo.type === 'rotor' && eo.statorVisible !== false){
      const statorCanvas = document.getElementById('extraChopperCanvas_eo'+eo.id);
      if(statorCanvas) drawStatorRing(statorCanvas, eo);
    }
    const stashWrap = document.getElementById('chopperCanvasStash');
    if (stashWrap) { const old = document.getElementById('extraChopperWrap_eo'+eo.id); if(old && old.parentElement === stashWrap) old.remove(); }
  });

  slots.filter(s=>s.type==='extra').forEach((s, slotIdx)=>{
    const absIdx = slotIdx + 2;
    const onPage = (absIdx >= startSlot && absIdx < endSlot);
    if (onPage) return;
    const eo = s.eo;
    if(eo.visible === false) return;
    const portVal = parseFloat(eo.value)||1;
    const mixLen = (eo.mixerVal ?? 50)/100;
    const col = getEoColor(eo);
    let stashCanvas = document.getElementById('extraChopperCanvas_eo'+eo.id);
    if (!stashCanvas) {
      addExtraRotorCanvas(_chopStash, eo, portVal, 0, aRad, false, mixLen, col, getEoDisplayName(eo));
      stashCanvas = document.getElementById('extraChopperCanvas_eo'+eo.id);
    } else {
      drawChopperColored(stashCanvas, portVal, 0, false, aRad, false, 0, 0, false, mixLen, col);
    }
    if(eo.type === 'rotor' && eo.statorVisible !== false && stashCanvas){
      drawStatorRing(stashCanvas, eo);
    }
  });

  const extraVanes = extraOscs.filter(_chopVaneLive);
  extraVanes.forEach(eo => {
    const linkedId = _chopVaneOwner(eo);
    if(linkedId === 'hp' && !isRotorVisible('hp')) return;
    if(linkedId === 'lp' && !isRotorVisible('lp')) return;
    if(linkedId !== 'hp' && linkedId !== 'lp'){
      const linkedEo = extraOscs.find(r=>r.id===parseInt(linkedId,10) && r.type==='rotor');
      if(!linkedEo || linkedEo.visible === false) return;
    }
    const vaneLen = (eo.mixerVal ?? 50)/100;
    const vaneCount = parseFloat(eo.value)||1;
    let targetCanvas = null;
    if(linkedId === 'hp' && showA) targetCanvas = get('chopperCanvasA');
    else if(linkedId === 'lp' && showB) targetCanvas = get('chopperCanvasB');
    else {
      const linkedEoId = parseInt(linkedId,10);
      targetCanvas = document.getElementById('extraChopperCanvas_eo'+linkedEoId);
    }
    if(targetCanvas) drawExtraVanesOnCanvas(targetCanvas, vaneCount, aRad, vaneLen, eo.customColor||null, eo.id);
  });
}

function drawConcentricRotorCanvas(canvas, rings, angleRad, showHighVanes=true, showLowVanes=true){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  const Rmax = W * 0.43;
  const Rmin = W * 0.06;
  const n = rings.length;
  const bandW = (Rmax - Rmin) / n;
  const PT = !!(window.rcLayering && window.rcLayering()==='pass');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  const _rl = id => { const e = document.getElementById(id); const v = e ? parseFloat(e.value) : NaN; return isNaN(v) ? 1 : Math.max(0, Math.min(1, v/100)); };
  rings.forEach((ring, i) => {
    const _lv = ring.lvl ? _rl(ring.lvl) : (ring.lvlv ?? 1), _vl = ring.vlvl ? _rl(ring.vlvl) : _lv;
    ctx.save(); ctx.globalAlpha = 0.3 + 0.7*Math.min(1,_lv); window._vaneLvl = undefined;
    const _sc = window.rcRotorScale ? window.rcRotorScale(ring.rk) : 1;
    const _L = window.rcLayer ? window.rcLayer() : 0.55;
    const _o = k => PT ? Rmax : (k < n ? Math.max(Rmin + 4, Rmax * Math.pow(_L, k)) : Rmin);
    const outerR = _o(i) * _sc;
    const innerR = (PT ? Rmin : _o(i + 1)) * _sc;
    const lowerPT = PT && i > 0;
    const col = ring.color || '#757575';
    const vCol = ring.vaneColor || '#757575';
    const colDark = darkenHex(col, 0.12);
    const doVanes = ring.showVanes !== undefined ? ring.showVanes : (i === 0 ? showHighVanes : (i === 1 ? showLowVanes : true));

    if(!lowerPT){
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI*2);
    ctx.arc(0, 0, innerR, 0, Math.PI*2, true);
    ctx.fillStyle = '#151618';
    ctx.fill();
    }
    ctx.save();
    if(lowerPT) ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI*2);
    ctx.arc(0, 0, innerR, 0, Math.PI*2, true);
    ctx.clip();
    const bgGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
    bgGrad.addColorStop(0, colDark + '44');
    bgGrad.addColorStop(1, col + '22');
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI*2);
    ctx.strokeStyle = '#23252b';
    ctx.lineWidth = 2;
    if(!lowerPT) ctx.stroke();

    const portCount = Math.max(1, Math.round(ring.ports));
    const tickLen = bandW * 0.28;
    {
      const portSpanR = (Math.PI * 2) / portCount;
      const gapHalfWidthR = portSpanR * (1 - (window.rcMark ? window.rcMark(ring.rk) : 50) / 100) / 2;
      for(let j = 0; j < portCount; j++){
        const a = (j / portCount) * Math.PI * 2;
        const aNext = a + portSpanR;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, a, aNext);
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        if(lowerPT){ ctx.save(); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.restore(); } else ctx.stroke();
        const aMidR = a + portSpanR * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, aMidR - gapHalfWidthR, aMidR + gapHalfWidthR);
        ctx.strokeStyle = '#151618';
        ctx.lineWidth = 4.5;
        if(!lowerPT) ctx.stroke();
      }
    }

    ctx.save(); if(lowerPT) ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI*2);
    ctx.strokeStyle = i === 0 ? col + '59' : col + 'CC';
    ctx.lineWidth = i === 0 ? 3 : 2.5;
    ctx.stroke();

    if(doVanes && ring.vanes > 0){
      const vaneCount = Math.max(1, Math.round(ring.vanes));
      const rawVl = ring.vaneLen !== undefined ? ring.vaneLen : 0.4;
      const t = 1;
      const minDepth = tickLen;
      const maxDepth = outerR - innerR;
      const depth = minDepth + t * (maxDepth - minDepth);
      const vaneEndR = outerR - depth;
      if(window.rcDrawVanes && ring.vk){
        const _sv2 = window._vaneLvl; if(lowerPT) window._vaneLvl = (_sv2===undefined?1:_sv2) * 0.5;
        window.rcDrawVanes(ctx, ring.vk, ring.rk, portCount, vaneCount, outerR, vaneEndR, vCol);
        window._vaneLvl = _sv2;
      } else for(let j = 0; j < vaneCount; j++){
        const a = (j / vaneCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.lineTo(Math.cos(a) * vaneEndR, Math.sin(a) * vaneEndR);
        ctx.strokeStyle = vCol;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    if(ring.extraVanes && ring.extraVanes.length){
      const _tl = bandW * 0.28, _pc = Math.max(1, Math.round(ring.ports));
      ring.extraVanes.forEach(xv=>{
        const tt = Math.min(1, xv.len / 0.4);
        const endR = Math.max(innerR, _chopVaneEnd(outerR, innerR, xv.len));
        const cnt = Math.max(1, Math.round(xv.count));
        if(window.rcDrawVanes){ const _s3 = window._vaneLvl; if(lowerPT) window._vaneLvl = (_s3===undefined?1:_s3) * 0.5; window.rcDrawVanes(ctx, String(xv.id), ring.rk, _pc, cnt, outerR, endR, xv.color); window._vaneLvl = _s3; }
        else { ctx.beginPath(); for(let j=0;j<cnt;j++){ const a=(j/cnt)*Math.PI*2; ctx.moveTo(Math.cos(a)*outerR,Math.sin(a)*outerR); ctx.lineTo(Math.cos(a)*endR,Math.sin(a)*endR); } ctx.strokeStyle=xv.color; ctx.lineWidth=2.5; ctx.stroke(); }
      });
    }
    ctx.restore();
    window._vaneLvl = undefined; ctx.restore();
  });

  ctx.restore();

  rings.forEach((ring, i) => {
    const st = ring.stator;
    if(!st || !st.visible) return;
    const color = st.color || '#e5a61f';
    const GAP_PX = 2;
    const THICKNESS = Math.max(1, Rmax * (window.rcParam ? window.rcParam('rotor', ring.rk, 'statorWall', 4.5) : 4.5) / 100);
    const statorInnerR = Rmax + GAP_PX;
    const statorOuterR = statorInnerR + THICKNESS;
    const statorMidR = (statorInnerR + statorOuterR) / 2;
    const statorVal = st.linked ? (parseFloat(ring.ports)||1) : (st.val != null ? parseFloat(st.val)||1 : (parseFloat(ring.ports)||1));
    const segments = Math.max(1, Math.round(statorVal)) * 2;
    const segAngle = (Math.PI * 2) / segments;
    const dashOpacity = i === 0 ? 1.0 : (i === 1 ? 0.2 : 0.1);
    ctx.save();
    for(let s = 0; s < segments; s++){
      if(s % 2 !== 0) continue;
      const startA = s * segAngle - Math.PI/2;
      const endA   = startA + segAngle;
      ctx.beginPath();
      ctx.arc(cx, cy, statorOuterR, startA, endA);
      ctx.arc(cx, cy, statorInnerR, endA, startA, true);
      ctx.closePath();
      ctx.globalAlpha = dashOpacity;
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, statorMidR, 0, Math.PI*2);
    ctx.strokeStyle = color;
    ctx.lineWidth = THICKNESS;
    ctx.stroke();
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI*2);
  ctx.fillStyle = '#444860';
  ctx.fill();
}

function drawPermStatorRing(canvas, portVal, st){
  const eoProxy = {
    value: portVal,
    statorLinked: st.linked,
    statorVal: st.val,
    statorColor: st.color
  };
  drawStatorRing(canvas, eoProxy);
}

function drawStatorRing(canvas, eo){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const rotorR = W * 0.42;
  const GAP_PX = 2;
  const _stK = canvas.id==='chopperCanvasA' ? 'hp' : canvas.id==='chopperCanvasB' ? 'lp' : ((/_eo(\d+)$/.exec(canvas.id||'')||[])[1]);
  const THICKNESS = rotorR * (window.rcParam && _stK ? window.rcParam('rotor', _stK, 'statorWall', 4.5) : 4.5) / 100;
  const statorInnerR = rotorR + GAP_PX;
  const statorOuterR = statorInnerR + THICKNESS;
  const statorVal = eo.statorLinked ? (parseFloat(eo.value)||1) : (eo.statorVal != null ? parseFloat(eo.statorVal)||1 : (parseFloat(eo.value)||1));
  const segments = Math.max(1, Math.round(statorVal)) * 2;
  const color = eo.statorColor || '#e5a61f';
  const segAngle = (Math.PI * 2) / segments;

  ctx.save();
  for(let i = 0; i < segments; i++){
    if(i % 2 !== 0) continue;
    const startA = i * segAngle - Math.PI/2;
    const endA   = startA + segAngle;
    ctx.beginPath();
    ctx.arc(cx, cy, statorOuterR, startA, endA);
    ctx.arc(cx, cy, statorInnerR, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  const statorMidR = (statorInnerR + statorOuterR) / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, statorMidR, 0, Math.PI*2);
  ctx.strokeStyle = document.body.classList.contains('is-light') ? darkenHex(color, 0.45) + 'B8' : color + '4D';
  ctx.lineWidth = THICKNESS;
  ctx.stroke();
  ctx.restore();
}

function addExtraRotorCanvas(wrap, eo, ports, innerPorts, angleRad, isDouble, vaneLen, color, label){
  const _ex = document.getElementById('extraChopperCanvas_eo'+eo.id);
  if(_ex && _ex.parentElement && _ex.parentElement.parentElement === wrap){
    const _l = _ex.parentElement.lastElementChild;
    if(_l){ if(_l.textContent !== label) _l.textContent = label; _l.style.color = color; }
    drawChopperColored(_ex, ports, 0, false, angleRad, false, 0, 0, false, vaneLen, color);
    return;
  }
  const wrapDiv = document.createElement('div');
  wrapDiv.className = 'chopper-canvas-wrap extra-chopper-wrap';
  wrapDiv.id = 'extraChopperWrap_eo'+eo.id;
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 160;
  canvas.id = 'extraChopperCanvas_eo'+eo.id;
  hiResCanvas(canvas,160,160);
  const lbl = document.createElement('div');
  lbl.className = 'chopper-label';
  lbl.textContent = label;
  lbl.style.color = color;
  wrapDiv.appendChild(canvas);
  wrapDiv.appendChild(lbl);
  wrap.appendChild(wrapDiv);
  drawChopperColored(canvas, ports, 0, false, angleRad, false, 0, 0, false, vaneLen, color);
}

function drawChopperColored(canvas, ports, vanes, showVanes, angleRad, isDouble, innerPorts, innerVanes, showInnerVanes, vaneLen, color){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  const R0 = W * 0.42;
  const col = color || '#757575';
  const colDark = darkenHex(col, 0.12);
  const _rkS = (/_eo(\d+)$/.exec(canvas.id || '') || [])[1];
  const R = R0 * (window.rcRotorScale && _rkS ? window.rcRotorScale(_rkS) : 1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.beginPath();
  ctx.arc(0, 0, R0, 0, Math.PI*2);
  ctx.fillStyle = '#151618';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R0, 0, Math.PI*2);
  const bgGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R0);
  bgGrad.addColorStop(0, colDark + '55');
  bgGrad.addColorStop(1, '#151618');
  ctx.fillStyle = bgGrad;
  ctx.fill();
  const portCount = Math.max(1, Math.round(ports));
  const portSpanC = (Math.PI * 2) / portCount;
  const _rkC = (/_eo(\d+)$/.exec(canvas.id || '') || [])[1]; const _lwC = R * (window.rcParam && _rkC ? window.rcParam('rotor', _rkC, 'rotorWall', 4.5) : 4.5) / 100, _RwC = R + 1.5 - _lwC/2; const gapHalfWidthC = portSpanC * (1 - (window.rcMark && _rkC ? window.rcMark(_rkC) : 50) / 100) / 2;
  {
    const tickLen = R * 0.22;
    ctx.beginPath(); ctx.arc(0, 0, _RwC, 0, Math.PI*2);
    ctx.strokeStyle = col; ctx.lineWidth = _lwC; ctx.stroke();
    ctx.beginPath();
    for(let i = 0; i < portCount; i++){
      const aMidC = (i / portCount) * Math.PI * 2 + portSpanC * 0.5;
      ctx.moveTo(Math.cos(aMidC - gapHalfWidthC)*_RwC, Math.sin(aMidC - gapHalfWidthC)*_RwC);
      ctx.arc(0, 0, _RwC, aMidC - gapHalfWidthC, aMidC + gapHalfWidthC);
    }
    ctx.strokeStyle = '#151618'; ctx.lineWidth = _lwC + 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, _RwC, 0, Math.PI*2);
  ctx.strokeStyle = col + '59';
  ctx.lineWidth = _lwC;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI*2);
  ctx.fillStyle = '#444860';
  ctx.fill();
}

function drawExtraVanesOnCanvas(canvas, vaneCount, angleRad, vaneLen, color, eoId){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const _cm = /_eo(\d+)$/.exec(canvas.id || '');
  const _pk = _cm ? _cm[1] : (canvas.id === 'chopperCanvasB' ? 'lp' : 'hp');
  const R = W * 0.42 * (window.rcRotorScale ? window.rcRotorScale(_pk) : 1);
  const vaneColor = color || (canvas.id === 'chopperCanvasB' ? getPermOscColor('Lv','#757575') : getPermOscColor('Hv','#757575'));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  const count = Math.max(1, Math.round(vaneCount));
  const portTickDepth = R * 0.22;
  const t = 1;
  const fullDepth = R;
  const lineDepth = portTickDepth + t * (fullDepth - portTickDepth);
  const vaneEndR = R - lineDepth;
  const _eoK = eoId != null ? String(eoId) : null;
  for(let i = 0; i < count; i++){
    if(!window.rcDrawVanes || !_eoK){
      const a = (i / count) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*R, Math.sin(a)*R); ctx.lineTo(Math.cos(a)*vaneEndR, Math.sin(a)*vaneEndR);
      ctx.strokeStyle = vaneColor; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  if(window.rcDrawVanes && _eoK){ const _sv = window._vaneLvl; window._vaneLvl = undefined; try{ window.rcDrawVanes(ctx, _eoK, _pk, (window.rcPortsOf ? window.rcPortsOf(_pk) : 12), count, R, vaneEndR, vaneColor); } finally { window._vaneLvl = _sv; } }
  ctx.restore();
}

function chopperAnimTick(ts){
  if(!chopperAnimEnabled){ chopperAnimId = null; return; }
  if(chopperAnimLastTs === null) chopperAnimLastTs = ts;
  const dt = Math.min((ts - chopperAnimLastTs) / 1000, 0.1);
  chopperAnimLastTs = ts;
  const rpm = currentRPM + damperExtraRPM;
  const degsPerSec = rpm / 60 * 360;
  if(!window._dirReversing && (currentRPM + damperExtraRPM) <= 1 && typeof window.getWiringDir==='function') window._spinDir = window.getWiringDir();
  const dirSign = window._spinDir === 'ccw' ? -1 : 1;
  chopperAngleA = (((chopperAngleA + dirSign * degsPerSec * dt) % 360) + 360) % 360;
  chopperAngleB = (((chopperAngleB + dirSign * degsPerSec * dt) % 360) + 360) % 360;
  try { redrawChoppers(chopperAngleA, chopperAngleB); }
  catch(e) { window._vaneLvl = undefined; window._lyr = undefined; if(!window._chopErrLogged){ window._chopErrLogged = true; console.error('Chopper diagram draw error', e); } }
  chopperAnimId = requestAnimationFrame(chopperAnimTick);
}

function toggleChopperAnim(){
  chopperAnimEnabled = !chopperAnimEnabled;
  get('btnChopperAnim').textContent = chopperAnimEnabled ? 'DISABLE ANIMATION' : 'ENABLE ANIMATION';
  get('btnChopperAnim').className = chopperAnimEnabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
  if(chopperAnimEnabled){
    chopperAnimLastTs = null;
    chopperAnimId = requestAnimationFrame(chopperAnimTick);
  } else {
    if(chopperAnimId){ cancelAnimationFrame(chopperAnimId); chopperAnimId = null; }
    redrawChoppers(0, 0);
  }
}

function toggleHighVanes(){
  showHighVanes = !showHighVanes;
  if(!chopperAnimEnabled) redrawChoppers(0,0);
}

function toggleLowVanes(){
  showLowVanes = !showLowVanes;
  if(!chopperAnimEnabled) redrawChoppers(0,0);
}


get('btnChopperAnim').addEventListener('click', toggleChopperAnim);

['eHigherPort','eLowerPort','eHigherVanes','eLowerVanes','sHVane','sLVane'].forEach(id=>{
  get(id).addEventListener('input',()=>{ if(!chopperAnimEnabled) redrawChoppers(0,0); });
});


get('btnChopperAnim').textContent = 'DISABLE ANIMATION'; get('btnChopperAnim').className = 'vbtn btn-accent';

setDetune(0);

applyConfig();

chopperAnimLastTs = null;
chopperAnimId = requestAnimationFrame(chopperAnimTick);

