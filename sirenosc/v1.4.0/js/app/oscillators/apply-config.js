
function applyConfig(){
  const mode=get('dChopper').value;const isSingle=mode==='single';const isDC=mode==='dblchopper';
  const isDouble=mode==='double';
  get('capBadge').style.display=isDC?'inline':'none';
  ['entryLP','entryLVanes','entryUT','entryOT'].forEach(id=>{
    const el=get(id);if(!el)return;el.style.opacity=isSingle?'0.35':'1';el.querySelectorAll('input').forEach(i=>i.disabled=isSingle);
  });
  [get('rowLVane'),get('rowLPS')].forEach(r=>{if(!r)return;r.querySelector('input').disabled=isSingle;r.querySelector('.slider-val').classList.toggle('muted',isSingle);});
  const _rowSUT=get('rowSUT');if(_rowSUT){_rowSUT.querySelector('input').disabled=isSingle;_rowSUT.querySelector('.slider-val').classList.toggle('muted',isSingle);}
  const rowOT=get('rowSOT');if(rowOT){rowOT.querySelector('input').disabled=isSingle;rowOT.querySelector('.slider-val').classList.toggle('muted',isSingle);}
  get('fcLP').classList.toggle('disabled',isSingle);get('fcLV').classList.toggle('disabled',isSingle);get('fcUT').classList.toggle('disabled',isSingle);
  const fcOT=get('fcOT');if(fcOT)fcOT.classList.toggle('disabled',isSingle);
  if(isDC){const el=get('sUT');el.max=65;if(parseFloat(el.value)>65){el.value=65;syncSliderLabel(el);}}
  else{get('sUT').max=100;}
  get('sHVane').max=100;get('sLVane').max=100;
  const chopSec=get('chopperDiagramSec');
  if(chopSec){ chopSec.style.opacity=''; chopSec.style.pointerEvents=''; }
  if(audioCtx){
    const now=audioCtx.currentTime;
    extraOscs.forEach(eo=>{
      if(eo.gainNode){
        const vol=isEoDisabled(eo)?0:(eo.mixerVal ?? 50)/100*0.18;
        eo.gainNode.gain.setTargetAtTime(vol,now,0.04);
      }
    });
    ['lp','lv','ut','ot'].forEach(k=>{
      if(gainNodes[k]) gainNodes[k].gain.setTargetAtTime(isSingle?0:computeGain(k,getV(),true),now,0.04);
    });
  }
  applyExtraOscSingleToneGrey();
  updateBidirAvailability();
  refreshAllVaneLinkedDropdowns();
  liveUpdateFreqs();updateFreqDisplay();
}

function syncSliderLabel(input){
  const map={sHVane:'svHVane',sLVane:'svLVane',sUT:'svUT',sOT:'svOT',sHP:'svHP',sLP:'svLP'};
  const lbl=get(map[input.id]);if(lbl)lbl.textContent=input.value+'%';
}

function setDetune(val){
  val=Math.max(-100,Math.min(100,Math.round(val)));
  get('detuneSlider').value=val;
}

let voltageLinked=false;
function getPeakVoltageValue(){
  var sel=get('peakVoltageSelect');
  if(sel.value==='other') return get('peakVoltageOther').value;
  return sel.value+'V';
}
function syncLiveVoltageToPeak(){
  if(!voltageLinked) return;
  get('liveVoltageInput').value=getPeakVoltageValue();
}
function setVoltageLinkState(linked){
  voltageLinked=linked;
  var btn=get('btnLinkVoltage');
  var inp=get('liveVoltageInput');
  if(linked){
    btn.classList.remove('btn-gray');btn.classList.add('btn-blue','active');
    inp.disabled=true;
    syncLiveVoltageToPeak();
  } else {
    btn.classList.remove('btn-blue','active');btn.classList.add('btn-gray');
    inp.disabled=false;
  }
}
get('btnLinkVoltage').addEventListener('click',function(){
  setVoltageLinkState(!voltageLinked);
});
get('peakVoltageSelect').addEventListener('change',function(){
  get('peakVoltageOtherWrap').style.display=this.value==='other'?'':'none';
  syncLiveVoltageToPeak();
});
get('peakVoltageOther').addEventListener('input',syncLiveVoltageToPeak);

