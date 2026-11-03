(function(){
  var MOTOR_TYPES={
    dc:  [['series','Series Wound'],['bldc','BLDC'],['universal','Universal']],
    ac1: [['universal','Universal'],['induction1','1PH-Induction']],
    ac3: [['synchronous','Synchronous'],['induction3','3PH-Induction']]
  };
  var simSel=get('motorSimTypeSelect');
  var typeSel=get('motorTypeSelect');
  var row=get('motorTypeRow');
  var swBox=get('torqueSwitchControls');

  function fillMotorTypes(){
    var prev=typeSel.value;
    var list=MOTOR_TYPES[get('currentTypeSelect').value]||MOTOR_TYPES.dc;
    typeSel.innerHTML='';
    list.forEach(function(o){
      var op=document.createElement('option');
      op.value=o[0];op.textContent=o[1];
      if(o[0]===prev) op.selected=true;
      typeSel.appendChild(op);
    });
  }
  function lockEl(el,on){
    if(!el) return;
    var isLocked=el.dataset.simLocked==='1';
    if(on===isLocked) return;
    el.dataset.simLocked=on?'1':'';
    el.classList.toggle('sim-locked',on);
    el.querySelectorAll('input,select,button').forEach(function(x){
      if(on){ x.dataset.simPrevDis=x.disabled?'1':''; x.disabled=true; }
      else { x.disabled=(x.dataset.simPrevDis==='1'); delete x.dataset.simPrevDis; }
    });
  }
  var _prevTorqueOn=null;
  function applySimType(){
    var v=simSel.value, hybrid=(v==='hybrid');
    var upT=simPhaseTorque('up'), downT=simPhaseTorque('down');
    var torque=upT||downT;
    row.style.display=torque?'':'none';
    get('hybridUpRow').style.display=hybrid?'':'none';
    get('fnModeGroup').style.display=(v==='function'||hybrid)?'':'none';
    get('hybridDownRow').style.display=hybrid?'':'none';
    if(swBox) swBox.style.display=upT?'none':'';

    var tt=get('tTorque');
    if(upT){ if(_prevTorqueOn===null) _prevTorqueOn=tt.checked; tt.checked=true; }
    else if(_prevTorqueOn!==null){ tt.checked=_prevTorqueOn; _prevTorqueOn=null; }
    lockEl(tt.closest('.toggle-row'),upT);
    get('torqueAutoBadge').style.display=upT?'':'none';

    lockEl(get('nWindUp').closest('.entry-grid'),upT);
    lockEl(get('nWindDown').closest('.entry-grid'),downT);
    get('fnOffBadge').style.display=torque?'':'none';
    syncPeakLock();

    lockEl(get('tSdAutoFill').closest('.toggle-row'),torque);
    lockEl(get('sdWindUpFields'),upT);
    lockEl(get('sdWindDownFields'),downT);
    get('sdOffBadge').style.display=torque?'':'none';
  }
  var _prevPeak=null;
  function syncPeakLock(){
    var rpmEl=get('eRPM'); if(!rpmEl) return;
    var on=(simPhaseTorque('up')||simPhaseTorque('down')) && get('motorTypeSelect').value==='synchronous';
    if(on){
      if(_prevPeak===null){ _prevPeak=rpmEl.value; }
      rpmEl.value=(parseFloat(get('gridHzSelect').value)||60)*60;
      rpmEl.disabled=true;
      rpmEl.dispatchEvent(new Event('input',{bubbles:true}));
    } else if(_prevPeak!==null){
      rpmEl.disabled=false; rpmEl.value=_prevPeak; _prevPeak=null;
      rpmEl.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  get('motorTypeSelect').addEventListener('change',syncPeakLock);
  get('gridHzSelect').addEventListener('change',syncPeakLock);
  simSel.addEventListener('change',applySimType);
  get('selHybridUp').addEventListener('change',applySimType);
  get('selHybridDown').addEventListener('change',applySimType);
  get('currentTypeSelect').addEventListener('change',function(){ fillMotorTypes(); syncPeakLock(); });
  fillMotorTypes();
  if(get('currentTypeSelect').value==='ac3') typeSel.value='induction3';
  applySimType();
})();

