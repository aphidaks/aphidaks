var _dsStates = {}, _dsSel = '';
function _dsDialog(o){
  return new Promise(function(res){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
    var box=document.createElement('div'); box.className='ds-pop';
    box.style.cssText='background:var(--card);border:1px solid #555;border-radius:8px;padding:16px 18px;width:min(340px,90vw);color:var(--x-ddd,#ddd);font:13px/1.45 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)';
    var t=document.createElement('div'); t.style.cssText='color:var(--x-ddd,#ddd);font-weight:600;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);text-transform:uppercase'; t.textContent=o.title||''; box.appendChild(t);
    if(o.msg){ var m=document.createElement('div'); m.style.cssText='margin-bottom:10px;white-space:pre-wrap;overflow-wrap:anywhere'; m.textContent=o.msg; box.appendChild(m); }
    var inp=null; if(o.input){ inp=document.createElement('input'); inp.type='text'; inp.maxLength=24; inp.value=o.def||''; inp.style.cssText='width:100%;box-sizing:border-box;margin-bottom:12px;font-size:13px'; box.appendChild(inp); }
    var row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;justify-content:flex-end';
    var no=document.createElement('button'); no.type='button'; no.className='vbtn btn-gray'; no.textContent='CANCEL';
    var ok=document.createElement('button'); ok.type='button'; ok.className='vbtn btn-gray'; ok.textContent=o.ok||'OK';
    if(!o.noCancel) row.appendChild(no); row.appendChild(ok); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
    function done(v){ document.removeEventListener('keydown',onKey,true); if(ov.parentNode) ov.parentNode.removeChild(ov); res(v); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); done(null); } else if(e.key==='Enter'){ e.stopPropagation(); e.preventDefault(); ok.click(); } }
    document.addEventListener('keydown',onKey,true);
    ok.addEventListener('click',function(){ done(inp?inp.value:true); });
    no.addEventListener('click',function(){ done(null); });
    ov.addEventListener('mousedown',function(e){ if(e.target===ov) done(null); });
    setTimeout(function(){ if(inp){ inp.focus(); inp.select(); } else ok.focus(); },0);
  });
}
window.alert=function(msg){ try{ _dsDialog({title:'Notice',msg:String(msg==null?'':msg),ok:'OK',noCancel:true}); }catch(e){ console.warn(msg); } };
function _dsSection(){ return document.getElementById('dampersSection'); }
var _DS_SKIP={nDampRPMRaise:1,nDampAirOffset:1,nDampRaiseTime:1,nDampReturnTime:1};
function _dsCapture(){
  var sec=_dsSection(), ui={};
  if(sec) sec.querySelectorAll('input,select').forEach(function(el){
    if(!el.id || _DS_SKIP[el.id] || el.type==='file' || el.type==='button' || el.closest('#damperStateRow')) return;
    if(el.id==='tDamperCtlMode' || /^so(Idle|WindUp|Steady|WindDown)/.test(el.id)) return;
    ui[el.id] = (el.type==='checkbox') ? !!el.checked : el.value;
  });
  return {
    v:1, ui:ui,
    seq:{ count:seqStepCount, groups:seqNumGroups, steps:seqGroups.map(function(g){return g.slice();}), vol:seqGroupVol.slice(), volOff:seqGroupVolOff.slice() },
    so: JSON.parse(JSON.stringify(_stateOverrideConfig)),
    enabled: !!damperUserOn
  };
}
function _dsApply(st){
  if(!st || typeof st!=='object') return false;
  var sec=_dsSection(); if(!sec) return false;
  var ui=st.ui||{};
  Object.keys(ui).forEach(function(id){
    var el=document.getElementById(id); if(!el || !sec.contains(el) || el.type==='file') return; var v=ui[id];
    if(el.type==='checkbox'){ if(el.checked!==!!v){ el.checked=!!v; el.dispatchEvent(new Event('change',{bubbles:true})); } }
    else if(String(el.value)!==String(v)){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  });
  try{ setEasingGroup('egContactorUp','dContactorWindUpEasing',get('dContactorWindUpEasing').value); setEasingGroup('egContactorDown','dContactorWindDownEasing',get('dContactorWindDownEasing').value); }catch(e){}
  if(st.seq){
    seqStepCount=Math.min(8,Math.max(2,parseInt(st.seq.count)||seqStepCount));
    seqNumGroups=Math.min(MAX_DAMPER_GROUPS,Math.max(2,parseInt(st.seq.groups)||seqNumGroups));
    if(Array.isArray(st.seq.steps)) seqGroups=st.seq.steps.map(function(g){ return Array.isArray(g)?g.slice(0,seqStepCount):[]; }).slice(0,seqNumGroups);
    while(seqGroups.length<seqNumGroups) seqGroups.push(new Array(seqStepCount).fill(0));
    seqGroups.forEach(function(g){ while(g.length<seqStepCount) g.push(0); });
    if(Array.isArray(st.seq.vol)) st.seq.vol.forEach(function(v,i){ if(i<MAX_DAMPER_GROUPS) seqGroupVol[i]=Math.max(0,Math.min(100,parseInt(v)||0)); });
    if(Array.isArray(st.seq.volOff)) st.seq.volOff.forEach(function(v,i){ if(i<MAX_DAMPER_GROUPS) seqGroupVolOff[i]=Math.max(0,Math.min(100,parseInt(v)||0)); });
    try{ buildSeqUI(); }catch(e){ console.error(e); }
  }
  if(st.so && typeof st.so==='object'){
    var soMap={idle:'soIdle',up:'soWindUp',steady:'soSteady',down:'soWindDown'};
    Object.keys(soMap).forEach(function(k){
      var src=st.so[k]; if(!src) return; var cfg=_stateOverrideConfig[k];
      cfg.override=!!src.override; cfg.defaultOn=!!src.defaultOn; cfg.delayMs=parseInt(src.delayMs)||0;
      var p=soMap[k], ob=get(p+'Override'), db=get(p+'Default'), di=get(p+'Delay');
      if(ob){ ob.textContent=cfg.override?'ON':'OFF'; ob.className=cfg.override?'vbtn btn-accent':'vbtn btn-gray'; }
      if(db){ db.textContent=cfg.defaultOn?'ON':'OFF'; db.className=cfg.defaultOn?'vbtn btn-accent':'vbtn btn-gray'; db.style.opacity=cfg.override?'':'0.4'; }
      if(di){ di.value=cfg.delayMs; di.style.opacity=cfg.override?'':'0.4'; }
    });
  }
  if(st.enabled!==undefined && !!st.enabled!==!!damperUserOn){ var eb=get('btnDamperHardDisable'); if(eb) eb.click(); }
  try{ if(typeof onStateOverrideTransition==='function' && typeof windDirection!=='undefined') onStateOverrideTransition(windDirection); }catch(e){}
  try{ if(damperEnabled && seqModeActive && audioCtx) applySeqStep(); }catch(e){}
  return true;
}
function _dsNames(){ return Object.keys(_dsStates); }
function _dsRefresh(){
  var sel=document.getElementById('dsSelect');
  if(sel){ sel.innerHTML='<option value=""></option>'+_dsNames().map(function(n){ return '<option value="'+n.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'+n.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</option>'; }).join('');
    sel.value=_dsStates[_dsSel]?_dsSel:''; if(sel.value!==_dsSel) _dsSel=sel.value; }
  try{ if(window._feSetDamperOpts) window._feSetDamperOpts(_dsNames()); }catch(e){}
}
function _dsLoad(states,sel){
  _dsStates={};
  if(states && typeof states==='object') Object.keys(states).slice(0,40).forEach(function(k){
    var n=String(k).trim().slice(0,24), v=states[k]; if(n && v && typeof v==='object' && v.ui && typeof v.ui==='object'){ Object.keys(_DS_SKIP).forEach(function(id){ delete v.ui[id]; }); _dsStates[n]=v; } });
  _dsSel=(typeof sel==='string' && _dsStates[sel])?sel:'';
  _dsRefresh();
}
window._setDamperState=function(name){
  name=String(name==null?'':name); if(!_dsStates[name]) return false;
  _dsSel=name; var sel=document.getElementById('dsSelect'); if(sel) sel.value=name;
  return _dsApply(_dsStates[name]);
};
window._damperStateNames=_dsNames;
(function(){
  function init(){
    var sel=document.getElementById('dsSelect'), bs=document.getElementById('dsSave'), bd=document.getElementById('dsDelete'); if(!sel||!bs||!bd) return;
    sel.addEventListener('change',function(){ _dsSel=sel.value; if(_dsSel) _dsApply(_dsStates[_dsSel]); });
    bs.addEventListener('click',async function(){
      var nm=await _dsDialog({title:'Save damper state',msg:'Name for this state:',input:true,def:_dsSel||('State '+(_dsNames().length+1)),ok:'SAVE'});
      if(nm===null) return; nm=String(nm).trim().slice(0,24); if(!nm) return;
      if(_dsStates[nm]){ var yes=await _dsDialog({title:'Overwrite?',msg:'Damper state "'+nm+'" already exists. Replace it?',ok:'OVERWRITE'}); if(!yes) return; }
      else if(_dsNames().length>=40){ await _dsDialog({title:'Limit reached',msg:'Maximum 40 damper states.'}); return; }
      try{ _dsStates[nm]=_dsCapture(); }catch(e){ console.error(e); await _dsDialog({title:'Could not save',msg:String(e&&e.message||e)}); return; }
      _dsSel=nm; _dsRefresh();
    });
    bd.addEventListener('click',async function(){
      if(!_dsSel||!_dsStates[_dsSel]) return;
      var yes=await _dsDialog({title:'Delete damper state',msg:'Delete "'+_dsSel+'"?',ok:'DELETE'}); if(!yes) return;
      delete _dsStates[_dsSel]; _dsSel=''; _dsRefresh();
    });
    _dsRefresh();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

function gatherTimbreData() {
  return {
    _version: 2,
    chopper: get('dChopper').value,
    rpm: parseFloat(get('eRPM').value),
    waveform: get('dWaveform').value,
    detuneValue: parseFloat(get('detuneSlider').value),
    mixerHP: parseFloat(get('sHP').value),
    mixerLP: parseFloat(get('sLP').value),
    mixerUT: parseFloat(get('sUT').value),
    mixerOT: parseFloat(get('sOT').value),
    mixerHVane: parseFloat(get('sHVane').value),
    mixerLVane: parseFloat(get('sLVane').value),
    masterVol: parseFloat(get('sMasterVol').value)
  };
}

function gatherOscillatorsData() {
  return {
    _version: 2,
    higherPort: parseFloat(get('eHigherPort').value),
    lowerPort: parseFloat(get('eLowerPort').value),
    higherVanes: parseFloat(get('eHigherVanes').value),
    lowerVanes: parseFloat(get('eLowerVanes').value),
    undertone: parseFloat(get('eUndertone').value),
    overtone: parseFloat(get('eOvertone').value),
    extraOscs: extraOscs.map(eo=>({id:eo.id,parentRotorId:eo.parentRotorId||null,type:eo.type,value:eo.value,linkedChopper:eo.linkedChopper,mixerVal:eo.mixerVal,customName:eo.customName||'',customColor:eo.customColor||'',seqGroup:eo.seqGroup||0,enabled:eo.enabled!==false,visible:eo.visible!==false,motor:eo.motor||1,waveform:eo.waveform||'default',statorLinked:eo.statorLinked!==false,statorColor:eo.statorColor||'#e5a61f',statorName:eo.statorName||'',statorVal:eo.statorVal||null,statorMixerVal:eo.statorMixerVal||40,statorEnabled:eo.statorEnabled!==false,statorVisible:eo.statorVisible!==false,bidirSide:eo.bidirSide||1,attenuate:eo.attenuate===true,attenFilterType:eo.attenFilterType||'lowpass',attenCutoff:eo.attenCutoff||1000,attenQ:eo.attenQ||0.7071,attenCurve:eo.attenCurve||'12',attenMix:eo.attenMix!==undefined?eo.attenMix:100,rasp:raspPack(eo.rasp)})),
    permOscEnabled: Object.assign({}, permOscEnabled),
    permOscMotor: Object.assign({}, permOscMotor),
    permOscWaveform: Object.assign({}, permOscWaveform),
    permOscVisible: Object.assign({}, permOscVisible),
    permOscColors: ['Hp','Hv','Lp','Lv','Ut','Ot'].reduce((a,k)=>{ const el=get('permColor'+k); if(el) a[k]=el.value; return a; },{}),
    bidirFilter: { floorHz: (get('nBidirFilterFloorHz')||{}).value, openHz: (get('nBidirFilterOpenHz')||{}).value, q: (get('nBidirFilterQ')||{}).value },
    permAtten: PERM_ATTEN_KEYS.reduce((acc,k)=>{
      const pa = permAtten[k];
      acc[k] = {enabled:pa.enabled===true, filterType:pa.filterType||'lowpass', cutoff:pa.cutoff||1000, q:pa.q||0.7071, curve:pa.curve||'12', mix:pa.mix!==undefined?pa.mix:100};
      return acc;
    }, {}),
    permRasp: RASP_KEYS.reduce((acc,k)=>{ acc[k]=raspPack(permRasp[k]); return acc; },{}),
    permOscNames: {
      Hp: (get('permNameHp') && get('permNameHp').value) || '',
      Hv: (get('permNameHv') && get('permNameHv').value) || '',
      Lp: (get('permNameLp') && get('permNameLp').value) || '',
      Lv: (get('permNameLv') && get('permNameLv').value) || '',
      Ut: (get('permNameUt') && get('permNameUt').value) || '',
      Ot: (get('permNameOt') && get('permNameOt').value) || ''
    },
    permStator: {
      hp: Object.assign({}, permStator.hp),
      lp: Object.assign({}, permStator.lp)
    },
    rootOrder: (typeof gatherOscillatorRootOrder === 'function') ? gatherOscillatorRootOrder() : undefined
  };
}

function _gatherTimbreLegacy() {
  return Object.assign({}, gatherTimbreData(), gatherOscillatorsData());
}

function gatherDiagramData() {
  return {
    showHighVanes: showHighVanes,
    showLowVanes: showLowVanes
  };
}

function gatherMainData() {
  return {
    presetModel: get('ePresetModel').value,
    presetManufacturer: get('ePresetMfg').value,
    presetSeries: get('ePresetSeries').value,
    presetDescription: get('ePresetDesc').value,
    presetCreator: get('ePresetCreator').value,
    presetDerivedFrom: get('ePresetDerivedFrom').value,
    presetDateCreated: new Date().toISOString(),
    motorSim: (typeof gatherMotorSimData === 'function') ? gatherMotorSimData() : undefined,
    version: APP_VERSION
  };
}

function gatherEffectsData() {
  return {
    fxGraph: (window.FXG && FXG.serialize) ? FXG.serialize() : null,
    fxChains: (typeof window._fcGather==='function') ? window._fcGather() : {},
    fxChainSel: window._fcSel || '',
    lpfEnabled: lpfEnabled,
    filterSlope: get('dFilterSlope').value,
    filterFn: get('dFilterFn').value,
    filterEasing: get('dFilterEasing').value,
    filterLow: parseFloat(get('nFilterLow').value),
    filterHigh: parseFloat(get('nFilterHigh').value),
    filterOffset: parseFloat(get('sFilterOffset').value),
    filterSteep: parseFloat(get('sFilterSteep').value)||0,
    reverbEnabled: reverbEnabled,
    reverbMode: (typeof reverb1Mode !== 'undefined') ? reverb1Mode : 'reverb',
    reverbSize: parseFloat(get('sReverbSize').value),
    reverbDecay: parseFloat(get('sReverbDecay').value),
    reverbDiffusion: parseFloat(get('sReverbDiffusion').value),
    reverbColor: parseFloat(get('sReverbColor').value),
    reverbLowCut: parseFloat(get('sReverbLowCut').value),
    reverbPreDelay: parseFloat(get('nReverbPreDelay').value),
    reverbMix: parseFloat(get('sReverbMix').value),
    rvPosLink: _rvPLGather(),
    reverbIRPreset: (get('revPreset1') ? get('revPreset1').value : ''),
    reverbIRName: (get('reverbIRName') ? get('reverbIRName').textContent : ''),
    reverb2Enabled: reverb2Enabled,
    reverb2Mode: (typeof reverb2Mode !== 'undefined') ? reverb2Mode : 'reverb',
    reverb2Size: parseFloat(get('sReverb2Size').value),
    reverb2Decay: parseFloat(get('sReverb2Decay').value),
    reverb2Diffusion: parseFloat(get('sReverb2Diffusion').value),
    reverb2Color: parseFloat(get('sReverb2Color').value),
    reverb2LowCut: parseFloat(get('sReverb2LowCut').value),
    reverb2PreDelay: parseFloat(get('nReverb2PreDelay').value),
    reverb2Mix: parseFloat(get('sReverb2Mix').value),
    reverb2IRPreset: (get('revPreset2') ? get('revPreset2').value : ''),
    reverb2IRName: (get('reverb2IRName') ? get('reverb2IRName').textContent : ''),
    reverb3Enabled: reverb3Enabled,
    reverb3Mode: (typeof reverb3Mode !== 'undefined') ? reverb3Mode : 'reverb',
    reverb3Size: parseFloat(get('sReverb3Size').value),
    reverb3Decay: parseFloat(get('sReverb3Decay').value),
    reverb3Diffusion: parseFloat(get('sReverb3Diffusion').value),
    reverb3Color: parseFloat(get('sReverb3Color').value),
    reverb3LowCut: parseFloat(get('sReverb3LowCut').value),
    reverb3PreDelay: parseFloat(get('nReverb3PreDelay').value),
    reverb3Mix: parseFloat(get('sReverb3Mix').value),
    reverb3IRPreset: (get('revPreset3') ? get('revPreset3').value : ''),
    reverb3IRName: (get('reverb3IRName') ? get('reverb3IRName').textContent : ''),
    slpfEnabled: slpfEnabled,
    slpfCutoff: parseFloat(get('nSlpfCutoff').value),
    slpfQ: parseFloat(get('nSlpfQ').value),
    slpfMix: parseFloat(get('sSlpfMix').value),
    hpfEnabled: hpfEnabled,
    hpfCutoff: parseFloat(get('nHpfCutoff').value),
    hpfQ: parseFloat(get('nHpfQ').value),
    hpfMix: parseFloat(get('sHpfMix').value),
    distEnabled: distEnabled,
    distDrive: parseFloat(get('sDistDrive').value),
    distTone: parseFloat(get('nDistTone').value),
    distChar: get('dDistChar').value,
    distOutput: parseFloat(get('sDistOutput').value),
    distMix: parseFloat(get('sDistMix').value),
    normEnabled: normEnabled,
    normPreGain: parseFloat(get('sNormPreGain').value),
    normPostGain: parseFloat(get('sNormPostGain').value),
    normCeiling: parseFloat(get('nNormCeiling').value),
    masterVol: parseFloat(get('sMasterVol').value)
  };
}

function gatherBlowerData() {
  return {
    blowerEnabled: blowerEnabled,
    blowerAmplitude: parseFloat(get('sBlowerAmplitude').value),
    blowerSmoothing: parseFloat(get('sBlowerSmoothing').value),
    blowerOutput: parseFloat(get('sBlowerOutput').value),
    blowerFadeTime: parseFloat(get('nBlowerFadeTime').value),
    blowerFadeInTime: parseFloat(get('nBlowerFadeInTime').value),
    blowerVolDrop: parseFloat(get('sBlowerVolDrop').value),
    blowerAirRes: parseFloat(get('nBlowerAirRes').value),
    blowerMix: parseFloat(get('sBlowerMix').value),
    blowerConstWindUpOffset: parseFloat(get('nBlowerConstWindUpOffset').value),
    blowerConstWindUpFn: get('dBlowerConstWindUpFn').value,
    blowerConstWindDownOffset: parseFloat(get('nBlowerConstWindDownOffset').value),
    blowerConstWindDownFn: get('dBlowerConstWindDownFn').value
  };
}

function gatherRotationData() {
  return {
    rotPeakWet: parseFloat(get('nRotPeakWet').value),
    rotMaxRPM: parseFloat(get('nRotMaxRPM').value),
    rotLinkedToChopper: rotLinkedToChopper,
    rotMode: rotMode,
    rotOscillate: get('tRotOscillate') ? get('tRotOscillate').checked : false,
    rotOscAngle:  parseFloat(get('nRotOscAngle')  ? get('nRotOscAngle').value  : 180) || 180,
    rotOscPause:  parseFloat(get('nRotOscPause')  ? get('nRotOscPause').value  : 0)   || 0,
    rotOscSine:   get('tRotOscSine') ? get('tRotOscSine').checked : true,
    collectorWear:        get('tCollectorWear')    ? get('tCollectorWear').checked    : false,
    collectorData:        (typeof window._cwGetData==='function') ? window._cwGetData() : undefined,
    collectorOffDur:      parseFloat(get('nCollectorOffDur') ? get('nCollectorOffDur').value : 2) || 2,
    collectorFreq:        parseInt(get('sCollectorFreq')     ? get('sCollectorFreq').value     : 3) || 3,
    rotWindUp: parseFloat(get('nRotWindUp') ? get('nRotWindUp').value : 3) || 3,
    rotWindUpFn: get('dRotWindUpFn') ? get('dRotWindUpFn').value : 'exponential',
    rotWindUpEasing: get('dRotWindUpEasing') ? get('dRotWindUpEasing').value : 'easeout',
    rotWindDown: parseFloat(get('nRotWindDown') ? get('nRotWindDown').value : 5) || 5,
    rotWindDownFn: get('dRotWindDownFn') ? get('dRotWindDownFn').value : 'exponential',
    rotWindDownEasing: get('dRotWindDownEasing') ? get('dRotWindDownEasing').value : 'easeout',
    dirAngle: parseFloat(get('nRotDirAngle') ? get('nRotDirAngle').value : 0) || 0
  };
}

function gatherConstantsData() {
  const out = {
    constAEnabled: constNodes.A.enabled,
    constAFreq: parseFloat(get('nConstAFreq').value),
    constAWave: get('dConstAWave').value,
    constAVol: parseFloat(get('sConstAVol').value),
    constALpf: parseFloat(get('sConstALpf').value),
    constARpmLink: false,
    constAHarmonic: 1,
    constABlowerLink: !!(get('tConstABlowerLink') && get('tConstABlowerLink').checked),
    constALpfOn: !(get('tConstALpfOn') && !get('tConstALpfOn').checked),
    constBLpfOn: !(get('tConstBLpfOn') && !get('tConstBLpfOn').checked),
    constBEnabled: constNodes.B.enabled,
    constBFreq: parseFloat(get('nConstBFreq').value),
    constBWave: get('dConstBWave').value,
    constBVol: parseFloat(get('sConstBVol').value),
    constBLpf: parseFloat(get('sConstBLpf').value),
    constBRpmLink: false,
    constBHarmonic: 1,
    constBBlowerLink: !!(get('tConstBBlowerLink') && get('tConstBBlowerLink').checked)
  };
  CONSTS.filter(id => id !== 'A' && id !== 'B').forEach(id => {
    out['const' + id + 'Enabled']    = constNodes[id] ? constNodes[id].enabled : false;
    out['const' + id + 'Freq']       = parseFloat((get('nConst'+id+'Freq')||{}).value) || 120;
    out['const' + id + 'Wave']       = (get('dConst'+id+'Wave')||{}).value || 'square';
    out['const' + id + 'Vol']        = parseFloat((get('sConst'+id+'Vol')||{}).value) || 4;
    out['const' + id + 'Lpf']        = parseFloat((get('sConst'+id+'Lpf')||{}).value) || 2;
    out['const' + id + 'RpmLink']    = false;
    out['const' + id + 'Harmonic']   = 1;
    out['const' + id + 'BlowerLink'] = !!(get('tConst'+id+'BlowerLink') && get('tConst'+id+'BlowerLink').checked);
    out['const' + id + 'LpfOn']      = !(get('tConst'+id+'LpfOn') && !get('tConst'+id+'LpfOn').checked);
  });
  CONSTS.forEach(id => {
    const ps_ = get('dConst'+id+'Pos'); if (!ps_) return;
    out['const'+id+'Pos']  = ps_.value;
    out['const'+id+'Db10']   = parseFloat(get('nConst'+id+'Db10').value);
    out['const'+id+'Off']    = parseFloat(get('nConst'+id+'Off').value);
    out['const'+id+'Steep']  = parseFloat(get('nConst'+id+'Steep').value);
  });
  return out;
}

