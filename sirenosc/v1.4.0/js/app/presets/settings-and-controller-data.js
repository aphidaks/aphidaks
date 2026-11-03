var _SETTINGS_IDS = ['spEffectsToggle','spStartupPopups','spAudioTipPopup','spUpdateNotice','spResetSuggestion','mpopStartup','mpopAudioTip','mpopUpdateNotice','mpopResetSuggestion','controlsLayoutSelect'];
function gatherSettingsData() {
  var o = {};
  _SETTINGS_IDS.forEach(function(id){ var e=document.getElementById(id); if(!e) return; o[id] = (e.type==='checkbox') ? e.checked : e.value; });
  return { v: 1, settings: o };
}
function applySettingsData(data) {
  if (!data || !data.settings) return;
  _SETTINGS_IDS.forEach(function(id){
    var e=document.getElementById(id); if(!e || data.settings[id]===undefined) return;
    if (e.type==='checkbox') { if (e.checked !== !!data.settings[id]) e.click(); }
    else if (e.value !== String(data.settings[id])) { e.value = data.settings[id]; e.dispatchEvent(new Event('change',{bubbles:true})); }
  });
}
function gatherControllerData() {
  var d = (typeof window._getControllerEditorData==='function') ? window._getControllerEditorData() : null;
  return { format: 'oscct', v: 1, controller: d || { comps: [] },
    damperStates: (typeof _dsStates!=='undefined') ? JSON.parse(JSON.stringify(_dsStates)) : {},
    damperStateSel: (typeof _dsSel!=='undefined') ? _dsSel : '' };
}
function applyControllerData(data, undoable) {
  if (!data) return false;
  var d = data.controller || data;
  if (!d || !Array.isArray(d.comps)) return false;
  if (typeof window._setControllerEditorData==='function') window._setControllerEditorData(d, undoable ? {undoable:true} : undefined);
  if (data.damperStates && typeof data.damperStates==='object' && typeof _dsLoad==='function') { try{ _dsLoad(data.damperStates, data.damperStateSel); }catch(e){ console.warn('damper states not loaded',e); } }
  return true;
}
function gatherControlsDataNoCtl() { var c = gatherControlsData(); delete c.controllerEditor; return c; }
(function(){
  function init(){
    var ex=document.getElementById('btnCtlExport'), im=document.getElementById('btnCtlImport'), inp=document.getElementById('ctlImportInput');
    if(!ex||!im||!inp) return;
    ex.addEventListener('click',function(){
      var blob=new Blob([JSON.stringify(gatherControllerData(),null,2)],{type:'application/json'});
      var nm=((document.getElementById('ePresetModel')||{}).value||'controller').replace(/[^a-z0-9]/gi,'_').toLowerCase()||'controller';
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=nm+'.oscct';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); },2000);
    });
    im.addEventListener('click',function(){ inp.value=''; inp.click(); });
    inp.addEventListener('change',async function(){
      var f=inp.files&&inp.files[0]; if(!f) return;
      var data; try{ data=JSON.parse(await f.text()); }catch(e){ alert('Not a valid .oscct file.'); return; }
      var d=data&&(data.controller||data);
      if(!d||!Array.isArray(d.comps)){ alert('Not a valid .oscct file.'); return; }
      try{
        var cur=window._getControllerEditorData&&window._getControllerEditorData();
        if(cur&&cur.comps&&cur.comps.length&&typeof _dsDialog==='function'){
          var yes=await _dsDialog({title:'Import controllers',msg:'This replaces all current controllers and scripts. Continue?',ok:'REPLACE'});
          if(!yes) return;
        }
      }catch(e){}
      applyControllerData(data, true);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

function gatherControlsData() {
  return {
    controllerEditor: (typeof window._getControllerEditorData==='function') ? window._getControllerEditorData() : undefined,
    damperStates: (typeof _dsStates!=='undefined') ? JSON.parse(JSON.stringify(_dsStates)) : {},
    damperStateSel: (typeof _dsSel!=='undefined') ? _dsSel : '',
    damperCtlMode: !!damperCtlMode,
    damperCtlGroups: _ctlGroupOn.slice(0,MAX_DAMPER_GROUPS).map(function(v){return !!v;}),
    peakWaitMode: peakWaitMode,
    pulseHiLo: get('tPulseHiLo').checked,
    undulate: get('tUndulate').checked,
    dampRPMRaise: parseFloat(get('nDampRPMRaise').value),
    dampRPMRaiseAuto: !!window._raiseAuto,
    dampAirOffset: parseFloat(get('nDampAirOffset').value),
    dampRaiseTime: parseFloat(get('nDampRaiseTime').value),
    dampReturnTime: parseFloat(get('nDampReturnTime').value),
    dampRate: parseFloat(get('nDampRate').value),
    dampRateOffset: parseFloat(get('nDampRateOffset').value),
    seqModeActive: seqModeActive,
    seqStepCount: seqStepCount,
    seqNumGroups: seqNumGroups,
    seqGroups: seqGroups.map(function(g){return g.slice();}),
    seqGroupVol: seqGroupVol.slice(),
    seqGroupVolOff: seqGroupVolOff.slice(),
    oscGroupAssign: Object.assign({},oscGroupAssign),
    oscSideAssign: Object.assign({},oscSideAssign),
    damperAudioGroupVols: (function(){ var a=[]; for (var i=0;i<MAX_DAMPER_GROUPS;i++){ var el=document.getElementById('daDamperVol'+i); if(!el) break; a.push(el.value); } return a; })(),
    stateOverrideConfig: JSON.parse(JSON.stringify(_stateOverrideConfig)),
    damperEnabled: damperUserOn,
    contactorWindUp: parseFloat(get('nContactorWindUp').value),
    contactorWindUpFn: get('dContactorWindUpFn').value,
    contactorWindUpEasing: get('dContactorWindUpEasing').value,
    contactorWindDown: parseFloat(get('nContactorWindDown').value),
    contactorWindDownFn: get('dContactorWindDownFn').value,
    contactorWindDownEasing: get('dContactorWindDownEasing').value,
    filterSlope: get('dFilterSlope').value,
    filterFn: get('dFilterFn').value,
    filterEasing: get('dFilterEasing').value,
    filterLow: parseFloat(get('nFilterLow').value),
    filterHigh: parseFloat(get('nFilterHigh').value),
    damperAudio: {
      humEnabled:   !!(get('daHumEnabled')   && get('daHumEnabled').checked),
      humVol:       parseFloat((get('daHumVol')   || {value:60}).value),
      openEnabled:  !!(get('daOpenEnabled')  && get('daOpenEnabled').checked),
      openVol:      parseFloat((get('daOpenVol')  || {value:50}).value),
      closeEnabled: !!(get('daCloseEnabled') && get('daCloseEnabled').checked),
      closeVol:     parseFloat((get('daCloseVol') || {value:80}).value)
    },
    brakeTime: parseFloat((get('nBrakeOffset') || {value:0.1}).value) || 0.1,
    brakeOffset: parseFloat((get('nBrakeOffset') || {value:0.1}).value) || 0.1,
    brakeFn: get('dBrakeFn') ? get('dBrakeFn').value : 'linear',
    brakeEasing: get('dBrakeEasing') ? get('dBrakeEasing').value : 'easeout'
  };
}

function _dmRefreshAudio(){
  try{ if(typeof applySeqStep==='function' && damperEnabled && audioCtx) applySeqStep(); }catch(e){}
  try{ if(typeof setIndicators==='function') setIndicators(); }catch(e){}
  try{ if(typeof window._daUpdate==='function') window._daUpdate(); }catch(e){}
}
function _dmSetMode(on,groups){
  on=!!on; if(on && _midiOn()) on=false;
  if(on) _ovGroup.length=0;
  if(on && !damperCtlMode){
    for(var i=0;i<MAX_DAMPER_GROUPS;i++) _ctlGroupOn[i]=!!(seqGroups[i] && seqGroups[i][seqCurrentStep]);
  }
  if(Array.isArray(groups)) groups.forEach(function(v,i){ if(i<MAX_DAMPER_GROUPS) _ctlGroupOn[i]=!!v; });
  damperCtlMode=on;
  var cb=document.getElementById('tDamperCtlMode'); if(cb && cb.checked!==on) cb.checked=on;
  var sb=document.getElementById('seqBox'); if(sb) sb.style.opacity=on?'0.45':'';
  if(on){ try{ if(typeof _clearStateOverride==='function') _clearStateOverride(); }catch(e){} }
  else { try{ if(typeof onStateOverrideTransition==='function') onStateOverrideTransition(windDirection); }catch(e){} }
  _dmRefreshAudio();
}
window._damperMode=function(){ return damperCtlMode?'controller':'simple'; };
window._damperGroupCount=function(){ return seqNumGroups; };
function _dgIdx(n){ var g=Math.floor(+n)-1; return (!isFinite(g)||g<0||g>=seqNumGroups)?-1:g; }
window._midiDamperGroup=function(n,on){
  var g=_dgIdx(n); if(g<0) return 'range'; if(damperCtlMode) return 'ctl';
  _midiGrp[g]=Math.max(0,(_midiGrp[g]|0)+(on?1:-1)); _dmRefreshAudio(); return 'ok'; };
window._overrideDamperGroup=function(n,state){
  var g=_dgIdx(n); if(g<0) return 'range'; if(damperCtlMode) return 'ctl';
  if(state===null) delete _ovGroup[g]; else _ovGroup[g]=!!state; _dmRefreshAudio(); return 'ok'; };
window._releaseDamperOverrides=function(){ _ovGroup.length=0; _dmRefreshAudio(); };
window._dmPinsChanged=function(){ _dmRefreshAudio(); };
window._dmLock=function(lock){ var cb=document.getElementById('tDamperCtlMode');
  if(cb){ cb.disabled=!!lock; cb.title=lock?'Locked to DATA mode while a MIDI Board is on the layout':''; }
  if(lock && damperCtlMode) _dmSetMode(false); else { if(!lock) _midiGrp.length=0; _dmRefreshAudio(); } };
window._getDamperGroup=function(n){ var g=Math.floor(+n)-1; if(!isFinite(g)||g<0||g>=seqNumGroups) return false;
  if(!damperCtlMode && !(_ovGroup[g]===true||_ovGroup[g]===false) && typeof _stateOverrideApplied!=='undefined' && _stateOverrideApplied!==null) return _stateOverrideApplied==='on';
  return _grpOnNow(g); };
(function(){
  function init(){ var cb=document.getElementById('tDamperCtlMode'); if(!cb) return;
    cb.addEventListener('change',function(){ _dmSetMode(cb.checked); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

