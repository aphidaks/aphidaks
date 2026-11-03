function buildSeqUI(){
  const count=seqStepCount;
  while(seqGroups.length<seqNumGroups) seqGroups.push(new Array(count).fill(0));
  seqGroups=seqGroups.slice(0,seqNumGroups);
  seqGroups.forEach(function(g,gi){
    while(g.length<count) g.push(0);
    seqGroups[gi]=g.slice(0,count);
  });

  const rowsCont=get('seqGroupRows');
  const markerEl=get('seqMarkers');
  rowsCont.innerHTML='';

  seqGroups.forEach(function(steps,gi){
    const color=SEQ_GROUP_COLORS[gi];
    const cls=SEQ_GROUP_CLASSES[gi];
    const row=document.createElement('div');
    row.className='seq-row';
    row.id='seqGroupRow'+gi;

    const removeBtn=seqNumGroups>2 ? '<button class="seq-count-btn" data-grp="'+gi+'" style="font-size:10px;padding:1px 6px;margin-left:3px;flex-shrink:0" title="Remove group"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button>' : '';

    const labelSpan=document.createElement('span');
    labelSpan.className='seq-row-label';
    labelSpan.style.color=color;
    labelSpan.textContent='G'+( gi+1);
    row.appendChild(labelSpan);

    const stepsDiv=document.createElement('div');
    stepsDiv.className='seq-steps';
    stepsDiv.id='seqStepsG'+gi;
    steps.forEach(function(v,i){
      const btn=document.createElement('button');
      btn.className='seq-step'+(v?' '+cls:'');
      btn.innerHTML=v?'<svg class="si" aria-hidden="true"><use href="#si-sq-f"/></svg>':'<svg class="si" aria-hidden="true"><use href="#si-sq-o"/></svg>';
      btn.title='Step '+(i+1)+': click to toggle';
      btn.addEventListener('click',function(){
        seqGroups[gi][i]=seqGroups[gi][i]?0:1;
        buildSeqUI();
      });
      stepsDiv.appendChild(btn);
    });
    row.appendChild(stepsDiv);

    if(seqNumGroups>2){
      const rmBtn=document.createElement('button');
      rmBtn.className='seq-count-btn';
      rmBtn.innerHTML='<svg class="si" aria-hidden="true"><use href="#si-x"/></svg>';
      rmBtn.style.cssText='font-size:9px;padding:1px 5px;margin-left:3px;flex-shrink:0';
      rmBtn.title='Remove group '+(gi+1);
      rmBtn.addEventListener('click',function(){
        removeSeqGroup(gi);
      });
      row.appendChild(rmBtn);
    }

    rowsCont.appendChild(row);

    const sliderRow=document.createElement('div');
    sliderRow.style.cssText='display:flex;align-items:center;gap:10px;padding:2px 0 5px 52px';

    const onWrap=document.createElement('div');
    onWrap.style.cssText='display:flex;align-items:center;gap:3px;flex-shrink:0';
    const onLabel=document.createElement('span');
    onLabel.style.cssText='font-size:8px;color:'+color+';letter-spacing:.5px;flex-shrink:0';
    onLabel.textContent='ON';
    const onSlider=document.createElement('input');
    onSlider.type='range';onSlider.min=0;onSlider.max=100;onSlider.step=1;
    onSlider.value=seqGroupVol[gi]!==undefined?seqGroupVol[gi]:100;
    onSlider.style.cssText='width:52px;height:3px;accent-color:'+color+';cursor:pointer;flex-shrink:0';
    onSlider.title='Group '+(gi+1)+' ON volume';
    const onVal=document.createElement('span');
    onVal.style.cssText='font-size:9px;color:'+color+';width:26px;text-align:right;letter-spacing:.5px;font-family:\'Share Tech Mono\',monospace;flex-shrink:0';
    onVal.textContent=onSlider.value+'%';
    onSlider.addEventListener('input',function(){
      seqGroupVol[gi]=parseInt(this.value)||0;
      onVal.textContent=this.value+'%';
      if(seqModeActive&&audioCtx) applySeqStep();
    });
    onWrap.appendChild(onLabel);
    onWrap.appendChild(onSlider);
    onWrap.appendChild(onVal);

    const offWrap=document.createElement('div');
    offWrap.style.cssText='display:flex;align-items:center;gap:3px;flex-shrink:0';
    const offLabel=document.createElement('span');
    offLabel.style.cssText='font-size:8px;color:var(--muted);letter-spacing:.5px;flex-shrink:0';
    offLabel.textContent='OFF';
    const offSlider=document.createElement('input');
    offSlider.type='range';offSlider.min=0;offSlider.max=100;offSlider.step=1;
    offSlider.value=seqGroupVolOff[gi]!==undefined?seqGroupVolOff[gi]:10;
    offSlider.style.cssText='width:52px;height:3px;accent-color:var(--muted);cursor:pointer;flex-shrink:0';
    offSlider.title='Group '+(gi+1)+' OFF volume';
    const offVal=document.createElement('span');
    offVal.style.cssText='font-size:9px;color:var(--muted);width:26px;text-align:right;letter-spacing:.5px;font-family:\'Share Tech Mono\',monospace;flex-shrink:0';
    offVal.textContent=offSlider.value+'%';
    offSlider.addEventListener('input',function(){
      seqGroupVolOff[gi]=parseInt(this.value)||0;
      offVal.textContent=this.value+'%';
      if(seqModeActive&&audioCtx) applySeqStep();
    });
    offWrap.appendChild(offLabel);
    offWrap.appendChild(offSlider);
    offWrap.appendChild(offVal);

    sliderRow.appendChild(onWrap);
    sliderRow.appendChild(offWrap);

    const daWrap=document.createElement('div');
    daWrap.style.cssText='display:flex;align-items:center;gap:3px;flex-shrink:0';
    const daIcon=document.createElement('span');
    daIcon.style.cssText='font-size:8px;color:var(--warn);letter-spacing:.5px;flex-shrink:0';
    daIcon.textContent='DA';
    daIcon.title='Damper Audio volume for Group '+(gi+1);
    const daSlider=document.createElement('input');
    daSlider.type='range';daSlider.min=0;daSlider.max=100;daSlider.step=1;
    daSlider.id='daDamperVol'+gi;
    var _existingDA=document.getElementById('daDamperVol'+gi);
    daSlider.value=(window._daGroupVolsPending&&window._daGroupVolsPending[gi]!==undefined)?window._daGroupVolsPending[gi]:(_existingDA?_existingDA.value:(gi===0?35:gi===1?10:0));
    daSlider.style.cssText='width:44px;height:3px;accent-color:var(--warn);cursor:pointer;flex-shrink:0';
    const daVal=document.createElement('span');
    daVal.style.cssText='font-size:9px;color:var(--warn);width:26px;text-align:right;letter-spacing:.5px;font-family:\'Share Tech Mono\',monospace;flex-shrink:0';
    daVal.textContent=daSlider.value+'%';
    daSlider.addEventListener('input',function(){
      daVal.textContent=this.value+'%';
      _daUpdateGroupGain(gi);
    });
    daWrap.appendChild(daIcon);
    daWrap.appendChild(daSlider);
    daWrap.appendChild(daVal);
    sliderRow.appendChild(daWrap);

    rowsCont.appendChild(sliderRow);
  });

  rowsCont.appendChild(markerEl);

  const addBtn=get('seqAddGroup');
  if(addBtn) addBtn.style.display=seqNumGroups>=MAX_DAMPER_GROUPS?'none':'';

  markerEl.innerHTML='';
  for(let i=0;i<count;i++){
    const d=document.createElement('div');
    d.className='seq-marker-num';
    d.id='seqMarker'+i;
    d.textContent=i+1;
    markerEl.appendChild(d);
  }
  get('seqCountVal').textContent=count;
  updateSeqMarkerHighlight();
  rebuildOscGroupDropdowns();
  rebuildGroupIndicators();
}

function updateSeqMarkerHighlight(){
  for(let i=0;i<8;i++){
    const el=get('seqMarker'+i);
    if(el) el.style.color=(seqModeActive&&i===seqCurrentStep)?'var(--yellow)':'var(--muted)';
    for(let gi=0;gi<seqNumGroups;gi++){
      const gEl=document.querySelectorAll('#seqStepsG'+gi+' .seq-step')[i];
      if(gEl) gEl.classList.toggle('active-marker',seqModeActive&&i===seqCurrentStep);
    }
  }
}

function removeSeqGroup(gi){
  if(seqNumGroups<=2) return;
  seqGroups.splice(gi,1);
  seqGroupVol.splice(gi,1);
  seqGroupVol.push(100);
  seqGroupVolOff.splice(gi,1);
  seqGroupVolOff.push(10);
  seqNumGroups--;
  const remapGroup=function(g){ return g===gi ? Math.max(0,gi-1) : (g>gi ? g-1 : g); };
  Object.keys(oscGroupAssign).forEach(function(k){ oscGroupAssign[k]=remapGroup(oscGroupAssign[k]); });
  extraOscs.forEach(function(eo){ eo.seqGroup=remapGroup(eo.seqGroup||0); });
  buildSeqUI();
}

function addSeqGroup(){
  if(seqNumGroups>=MAX_DAMPER_GROUPS) return;
  seqGroups.push(new Array(seqStepCount).fill(0));
  seqNumGroups++;
  buildSeqUI();
}

function rebuildOscGroupDropdowns(){
  ['Hp','Hv','Lp','Lv','Ut','Ot'].forEach(function(id){
    const sel=get('seqGroupSel'+id);
    if(!sel) return;
    const gainKey={Hp:'hp',Hv:'hv',Lp:'lp',Lv:'lv',Ut:'ut',Ot:'ot'}[id];
    const cur=oscGroupAssign[gainKey]||0;
    _fillGroupDropdown(sel, cur);
  });
  extraOscs.forEach(function(eo){
    const sel=get('seqGroupSelEO'+eo.id);
    if(!sel) return;
    _fillGroupDropdown(sel, eo.seqGroup||0);
  });
}

function _fillGroupDropdown(sel, currentGroup){
  const val=Math.min(currentGroup, seqNumGroups-1);
  sel.innerHTML='';
  for(let i=0;i<seqNumGroups;i++){
    const opt=document.createElement('option');
    opt.value=i;
    opt.textContent='Group '+(i+1);
    opt.style.color=SEQ_GROUP_COLORS[i];
    sel.appendChild(opt);
  }
  if(seqNumGroups<MAX_DAMPER_GROUPS){
    const addOpt=document.createElement('option');
    addOpt.value='__add__';
    addOpt.textContent='+ Add Group';
    sel.appendChild(addOpt);
  }
  sel.value=val;
}

function getSeqStepDuration(){
  const rate=parseFloat(get('nDampRate').value)||800;
  const offset=(parseFloat(get('nDampRateOffset').value)||0)*getOffsetMultiplier();
  const anyOn=seqGroups.slice(0,seqNumGroups).some(function(g,gi){return _grpOnNow(gi);});
  if(anyOn) return Math.max(20, rate+offset);
  return Math.max(20, rate-offset);
}

function tickSeq(){
  if(!seqModeActive||!damperEnabled||!audioCtx){seqAnimId=null;return;}
  if(get('tUndulate') && get('tUndulate').checked){
    seqAnimId=requestAnimationFrame(tickSeq);
    return;
  }

  const now_ms=performance.now();
  const elapsed=now_ms-seqPhaseStart;
  const dur=getSeqStepDuration();
  if(elapsed>=dur){
    seqCurrentStep=(seqCurrentStep+1)%seqStepCount;
    seqPhaseStart=now_ms;
    applySeqStep();
    updateSeqMarkerHighlight();
  }
  seqAnimId=requestAnimationFrame(tickSeq);
}

const MAX_INDICATOR_GROUPS = MAX_DAMPER_GROUPS;
function setGroupIndicators(groupOnArr){
  const cont = get('seqGroupIndicators');
  if(!cont) return;
  const n = Math.min(seqNumGroups, MAX_INDICATOR_GROUPS);
  if(cont.children.length !== n){
    cont.innerHTML = '';
    for(var i=0; i<n; i++){
      const row = document.createElement('div');
      row.className = 'ind-row';
      const dot = document.createElement('div');
      dot.className = 'ind-dot';
      dot.id = 'indGrp' + i;
      const lbl = document.createElement('span');
      lbl.className = 'ind-label';
      lbl.id = 'indGrpLbl' + i;
      lbl.textContent = 'G' + (i+1);
      lbl.title = 'Group ' + (i+1);
      row.appendChild(dot);
      row.appendChild(lbl);
      cont.appendChild(row);
    }
  }
  for(var i=0; i<n; i++){
    const dot = get('indGrp'+i);
    if(!dot) continue;
    dot.className = 'ind-dot' + (groupOnArr[i] ? ' on-green' : '');
  }
}

function rebuildGroupIndicators(){
  const arr = new Array(seqNumGroups).fill(false);
  setGroupIndicators(arr);
}

function applySeqStep(){
  if(!audioCtx) return;
  if(!damperEnabled) return;
  if(typeof _stateOverrideApplied !== 'undefined' && _stateOverrideApplied !== null){
    _applyAllGroupsVolume(_stateOverrideApplied === 'on');
    return;
  }
  const v=getV();const dual=v.chopper!=='single';const now=audioCtx.currentTime;const r=0.03;

  const phase = windDirection;
  const phaseKey = phase==='up'?'up': phase==='down'?'down': phase==='steady'?'steady': null;
  const groupOn = seqGroups.slice(0,seqNumGroups).map(function(g,gi){
    return _grpOnNow(gi);
  });

  function applyPerm(key, base){
    const g=oscGroupAssign[key]||0;
    const on=groupOn[g]!==undefined?groupOn[g]:false;
    const vol=(seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
    const offVol2=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
    const mul=on?vol:offVol2*vol;
    const gn=gainNodes[key];
    if(gn) gn.gain.setTargetAtTime((permOscEnabled[key]?base:0)*mul,now,r);
  }
  applyPerm('hp', v.sHP*0.18);
  applyPerm('hv', v.sHV*0.18);
  applyPerm('lp', dual?v.sLP*0.18:0);
  applyPerm('lv', dual?v.sLV*0.18:0);
  applyPerm('ut', dual?v.sUT*0.18:0);
  applyPerm('ot', dual?v.sOT*0.18:0);
  extraOscs.forEach(function(eo){
    if(!eo.gainNode) return;
    const g=eo.seqGroup||0;
    const on=groupOn[g]!==undefined?groupOn[g]:false;
    const vol=(seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
    const offVol3=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
    const mul=on?vol:offVol3*vol;
    const base=(eo.mixerVal ?? 50)/100*0.18;
    const mute=isEoDisabled(eo);
    eo.gainNode.gain.setTargetAtTime(mute?0:base*mul,now,r);
  });
  setGroupIndicators(groupOn.slice(0,seqNumGroups).map(function(on,i){
    return on;
  }));

  const raiseRPM=parseFloat(get('nDampRPMRaise').value)||200;
  const raiseTimeMs=(parseFloat(get('nDampRaiseTime').value)||0.5)*1000;
  const returnTimeMs=(parseFloat(get('nDampReturnTime').value)||0.8)*1000;
  const offCount = groupOn.filter(function(v){ return !v; }).length;
  const totalCount = groupOn.length;
  let proportionalRPM = totalCount > 0 ? (offCount / totalCount) * raiseRPM : 0;
  if(typeof torqueRaiseTarget==='function' && torqueRaiseActive()) proportionalRPM = totalCount > 0 ? torqueRaiseTarget(offCount/totalCount) : 0;
  if(proportionalRPM > 0 && windDirection !== 'down'){
    animateExtraRPM(proportionalRPM, raiseTimeMs);
  } else {
    animateExtraRPM(0, returnTimeMs);
  }
  if(typeof window._daUpdate === 'function') window._daUpdate();
}

function startSeq(){
  if(seqAnimId){cancelAnimationFrame(seqAnimId);seqAnimId=null;}
  seqCurrentStep=0;
  seqPhaseStart=performance.now();
  applySeqStep();
  updateSeqMarkerHighlight();
  seqAnimId=requestAnimationFrame(tickSeq);
}

function stopSeq(){
  if(seqAnimId){cancelAnimationFrame(seqAnimId);seqAnimId=null;}
  seqCurrentStep=0;
  seqModeActive=false;
  seqManualMode=false;
  seqManualGroupOn=seqManualGroupOn.map(function(){return false;});
  var stopBtn=get('seqStopBtn');
  if(stopBtn){stopBtn.innerHTML='<svg class="si" aria-hidden="true"><use href="#si-sq-f"/></svg> STOP';stopBtn.style.borderColor='var(--muted)';stopBtn.style.color='var(--muted)';}
  updateSeqMarkerHighlight();
  get('seqActiveBadge').style.display='none';
}

