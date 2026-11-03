function isTorqueMode(dir){ return dir ? simPhaseTorque(dir) : (simPhaseTorque('up')||simPhaseTorque('down')); }

var SIM_K_AIR = 0.0424;

function simParams(){
  function num(id,d,min){ var el=document.getElementById(id); var v=el?parseFloat(el.value):NaN; return (isFinite(v)&&v>=min)?v:d; }
  var hz=parseFloat(get('gridHzSelect').value)||60;
  var pk=parseFloat(get('eRPM').value)||3600, mt=get('motorTypeSelect').value;
  var slip=Math.min(0.2,num('nSimSlip',4,0)/100);
  var nRotors=2; try{ nRotors+=extraOscs.filter(function(e){return e.type==='rotor' && !e.parentRotorId;}).length; }catch(e){}
  var actualMass=num('nSimMass',10,0.01)*nRotors;
  var amEl=document.getElementById('nSimMassActual'); if(amEl){ var amStr=String(Math.round(actualMass*1000)/1000); if(amEl.value!==amStr) amEl.value=amStr; }
  var sel=document.getElementById('selSimPrecise'), precise=!!sel && sel.value==='precise';
  var isInd=(mt==='induction1'||mt==='induction3'), isSync=(mt==='synchronous');
  var nr=(precise||isSync)?pk:pk*(1-slip);
  var p={
    Tn:   num('nSimRatedTorque',3,0.001),
    fric: num('nSimFriction',0.2,0),
    rad:  num('nSimRadius',12,0.08)*0.0254/2,
    mass: actualMass,
    massOffset: Math.min(3,Math.max(0.5,num('nSimMassOffset',1,0.5))),
    pk:   pk,
    slip: slip,
    nr:   nr,
    ns:   isSync?pk:isInd?nr/(1-slip):hz*60,
    cur:  get('currentTypeSelect').value,
    mt:   mt,
    r:    getVoltageRatio(),
    K:    SIM_K_AIR
  };
  if(!isSync){
    var q={}; for(var k in p) q[k]=p[k]; q.r=1;
    var Tm=simMotor(nr,q), w=nr*Math.PI/30, den=Math.pow(p.rad,4)*w*w;
    if(Tm>p.fric && den>0) p.K=(Tm-p.fric)/den;
  }
  p.fric *= blowerAirResMul();
  return p;
}
function blowerAirResMul(){
  try{
    if(typeof blowerEnabled==='undefined' || !blowerEnabled) return 1;
    var el=document.getElementById('nBlowerAirRes'), off=el?parseFloat(el.value):1;
    if(!isFinite(off) || off<=0 || off===1) return 1;
    var minM=1-(parseFloat(get('sBlowerVolDrop').value)||0)/100, out=(parseFloat(get('sBlowerOutput').value)||0)/100, frac;
    if(typeof blowerOutputGain!=='undefined' && blowerOutputGain && out>1e-6) frac=blowerOutputGain.gain.value/out;
    else frac=(typeof blowerCurrentGain!=='undefined')?blowerCurrentGain:1;
    var den=1-minM, f=den<1e-6?(frac>=0.999?1:0):(frac-minM)/den;
    f=Math.max(0,Math.min(1,f));
    return 1+(off-1)*f;
  }catch(e){ return 1; }
}
function simInertia(p){ return 0.5*p.mass*(p.massOffset||1)*p.rad*p.rad; }
function simCounter(rpm,p){ var w=rpm*Math.PI/30; return p.fric + (p.K!==undefined?p.K:SIM_K_AIR)*Math.pow(p.rad,4)*w*w; }
function simKl(s,sm){ return s===0?0:2/(s/sm+sm/s); }
function simTf(s,rr){ return s===0?0:1/(s/rr+rr/s); }

function simMotor(rpm,p){
  var r=p.r; if(!(r>0)) return 0;
  var n=Math.max(rpm,-0.98*p.ns), np=Math.max(0,n), pu=0, v2=r*r, s=(p.ns-n)/p.ns;
  switch(p.mt){
    case 'series':
      pu=(n<0?Math.min(8,4*Math.pow(1-n/p.nr,2)):4/Math.pow(1+n/p.nr,2))*v2; break;
    case 'universal': {
      var Tst=(p.cur==='dc')?3.0:2.5, n0=p.nr/(1-1/Tst);
      pu=Math.min(2*Tst,Math.max(0,Tst*(1-n/n0)))*v2; break; }
    case 'bldc':
      pu=Math.min(2.5,Math.max(0,10.86*(r-n/(p.nr*3800/3450)))); break;
    case 'induction3':
      pu=(2.6*simKl(s,Math.max(0.01,5*p.slip))+0.6*Math.pow(Math.max(0,Math.min(1,s)),6))*v2; break;
    case 'induction1': {
      var sm1=Math.max(0.01,5*p.slip), norm1=simTf(p.slip,sm1)-0.6*simTf(2-p.slip,sm1);
      var main=(simTf(s,sm1)-0.6*simTf(2-s,sm1))/(norm1>0?norm1:1);
      var nsw=0.75*p.ns, aux=(np<nsw)?(3.0-2.0*(np/nsw)):0;
      pu=(main+aux)*v2; break; }
    case 'synchronous':
      pu=2.2*simKl(s,0.12)*v2;
      {
        var Tcs=simCounter(p.ns,p), pull=simSyncPullout(p);
        if(pull>Tcs){
          var band=SIM_SYNC_BAND*p.ns, G=(pull-Tcs)/band;
          var w=s>=SIM_SYNC_BAND?0:(s<=SIM_SYNC_BAND*0.4?1:(SIM_SYNC_BAND-s)/(SIM_SYNC_BAND*0.6));
          var Tsync=Tcs+G*(p.ns-n);
          return p.Tn*pu*(1-w)+Tsync*w;
        }
      }
      break;
    default: pu=0;
  }
  return p.Tn*pu;
}
function simSyncPullout(p){ return p.Tn*2.0*p.r; }
var SIM_SYNC_BAND = 0.05;

var SIM_DAMPER_AIR_CUT = 0.35;
function simAirOffset(){ var v=parseFloat((document.getElementById('nDampAirOffset')||{}).value); return (isFinite(v)&&v>=0.1)?Math.min(3,v):1; }
function simDamperAirCut(){ return Math.min(0.9,SIM_DAMPER_AIR_CUT*simAirOffset()); }
window._raiseAuto = true;
function torqueRaiseActive(){
  if(!damperEnabled || windDirection==='down' || windDirection==='idle') return false;
  return isTorqueMode(windDirection==='steady'?'up':windDirection);
}
function simEquilibriumRPM(p,cut){
  var q={}; for(var k in p) q[k]=p[k];
  q.K=(p.K!==undefined?p.K:SIM_K_AIR)*(1-cut);
  var top=Math.max(p.ns*1.05,p.nr*1.05,100), N=300, i, n;
  for(i=N;i>=0;i--){
    n=top*i/N;
    if(simMotor(n,q)-simCounter(n,q)>=0){
      var lo=n, hi=Math.min(top,n+top/N), j;
      for(j=0;j<24;j++){ var m=(lo+hi)/2; if(simMotor(m,q)-simCounter(m,q)>=0) lo=m; else hi=m; }
      return lo;
    }
  }
  return 0;
}
function simAutoMaxRaise(){
  var p=simParams(), base=simEquilibriumRPM(p,0), full=simEquilibriumRPM(p,simDamperAirCut());
  return Math.max(0,full-base);
}
function torqueRaiseTarget(blockedFrac){
  var p=simParams(), base=simEquilibriumRPM(p,0), full=simEquilibriumRPM(p,simDamperAirCut());
  var rawAll=Math.max(0,full-base); if(rawAll<=0||!(blockedFrac>0)) return 0;
  var part=Math.max(0,simEquilibriumRPM(p,simDamperAirCut()*Math.min(1,blockedFrac))-base);
  var maxRaise=window._raiseAuto?rawAll:(parseFloat(get('nDampRPMRaise').value)||0);
  return Math.min(maxRaise,part/rawAll*maxRaise);
}
(function(){
  var btn=document.getElementById('btnRaiseAuto'), inp=document.getElementById('nDampRPMRaise');
  if(!btn||!inp) return;
  function sync(){
    btn.classList.toggle('btn-accent',!!window._raiseAuto); btn.classList.toggle('btn-gray',!window._raiseAuto);
    var t=isTorqueMode();
    btn.style.display=t?'':'none';
    var auto=t&&window._raiseAuto;
    inp.readOnly=auto; inp.style.opacity=auto?'.7':'';
    if(auto){ var v=Math.round(simAutoMaxRaise()); if(String(v)!==inp.value) inp.value=v; }
  }
  window._setRaiseAuto=function(on){ window._raiseAuto=!!on; sync(); };
  btn.addEventListener('click',function(){ window._raiseAuto=!window._raiseAuto; sync(); try{ if(damperEnabled&&seqModeActive&&audioCtx) applySeqStep(); }catch(e){} });
  inp.addEventListener('input',function(){ try{ if(damperEnabled&&seqModeActive&&audioCtx&&torqueRaiseActive()) applySeqStep(); }catch(e){} });
  var off=document.getElementById('nDampAirOffset');
  if(off) off.addEventListener('input',function(){ try{ sync(); if(damperEnabled&&seqModeActive&&audioCtx&&torqueRaiseActive()) applySeqStep(); }catch(e){} });
  setInterval(function(){ try{ sync(); }catch(e){} },400);
  sync();
})();

function simEval(rpm,powered,p){
  var Tc=simCounter(rpm,p);
  if(!powered) return {Tm:0,Tc:Tc,lock:null};
  return {Tm:simMotor(rpm,p),Tc:Tc,lock:null};
}

window._simWs = null;
function simSignedRPM(){
  var w=window._simWs, spin=(window._spinDir==='ccw')?-1:1;
  if(typeof w!=='number' || Math.abs(Math.abs(w)-currentRPM)>0.75) w=currentRPM*spin;
  return w;
}
function simMotorSign(){ return (typeof window.getWiringDir==='function' && window.getWiringDir()==='ccw')?-1:1; }

function _torqueReachSteady(){
  windDirection='steady';
  onStateOverrideTransition('steady');
  if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
  liveUpdateFreqs();updateFreqDisplay();
  get('statusTxt').textContent='STEADY';get('playLed').style.cssText='background:var(--led)';
  if(get('tUndulate').checked) applyContactorForPhase('steady');
  setIndicators();
  if(peakWaitMode==='startup'){ peakWaitMode='off'; _applyPeakWaitBtn(); }
}

function startTorqueSim(){
  var last=null;
  function tick(ts){
    if(last===null) last=ts;
    var dt=Math.min((ts-last)/1000,0.05); last=ts;
    var p=simParams(), I=simInertia(p), powered=!!active;
    var mS=simMotorSign(), ws=simSignedRPM(), netF=0;
    var steps=Math.max(1,Math.ceil(dt/0.004)), h=dt/steps;
    for(var i=0;i<steps;i++){
      var fr=mS*ws, Tc=simCounter(Math.abs(ws),p), Tmw=powered?mS*simMotor(fr,p):0, net;
      if(Math.abs(ws)<0.05) net=(Math.abs(Tmw)>Tc)?Tmw-(Tmw>0?1:-1)*Tc:0;
      else net=Tmw-(ws>0?1:-1)*Tc;
      var prev=ws; ws+=(net/I)*h*30/Math.PI;
      if(prev!==0 && (prev>0)!==(ws>0) && Math.abs(Tmw)<=Tc) ws=0;
      netF=mS*net;
    }
    window._simWs=ws; currentRPM=Math.abs(ws);
    if(currentRPM>=0.5) window._spinDir=(ws<0)?'ccw':'cw';
    window._simSettled = powered && (Math.abs(netF) <= (windDirection==='steady' ? 0.08 : 0.03)*p.Tn);
    if(!powered){
      if(currentRPM<=0.5){ currentRPM=0; window._simWs=0; onReachZero(); return; }
    } else if(windDirection==='up'){
      if((Math.abs(ws)<0.05 && netF<=0) || Math.abs(netF)<=0.03*p.Tn) _torqueReachSteady();
    }
    liveUpdateFreqs();updateFreqDisplay();setIndicators();
    windAnimId=requestAnimationFrame(tick);
  }
  windAnimId=requestAnimationFrame(tick);
}

(function(){
  var btn=document.getElementById('btnCalcTorque'); if(!btn) return;
  btn.addEventListener('click',function(){
    var hp=parseFloat(document.getElementById('nCalcHP').value);
    var sync=parseFloat(document.getElementById('nCalcSync').value);
    var slip=Math.min(20,Math.max(0,parseFloat(document.getElementById('nSimSlip').value)||0))/100;
    var out=document.getElementById('calcTorqueOut');
    if(!(hp>0) || !(sync>0)){ out.textContent='Enter HP and speed'; return; }
    var rpm=sync*(1-slip);
    var T=hp*745.69987/(rpm*Math.PI/30);
    T=Math.min(500,Math.max(0.01,T));
    var el=document.getElementById('nSimRatedTorque');
    el.value=Math.round(T*1000)/1000;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    out.textContent='';
  });
  btn.click();
})();

var MOTOR_SIM_FIELDS = [
  'peakVoltageSelect','peakVoltageOther','liveVoltageInput','gridHzSelect','currentTypeSelect','forwardDirSelect',
  'motorSimTypeSelect','selHybridUp','selHybridDown','motorTypeSelect',
  'nCalcHP','nCalcSync','nSimRatedTorque','nSimRadius','nSimSlip','nSimFriction','nSimMass','nSimMassOffset','selSimPrecise','nSimEff','nSimPF','nSimNoLoad','nSimInrush'
];
function gatherMotorSimData(){
  var d={};
  MOTOR_SIM_FIELDS.forEach(function(id){ var el=document.getElementById(id); if(el) d[id]=el.value; });
  try{ d.voltageLinked=!!voltageLinked; }catch(e){}
  try{ d.graphsCollapsed=window._getSimGraphCollapsed(); }catch(e){}
  try{ d.graphLayoutCols=window._getSimGraphCols(); }catch(e){}
  try{ d.graphSize=window._getSimGraphSize(); }catch(e){}
  return d;
}
function applyMotorSimData(d){
  if(!d) return;
  MOTOR_SIM_FIELDS.forEach(function(id){
    if(d[id]===undefined) return;
    var el=document.getElementById(id); if(!el) return;
    el.value=d[id];
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  try{ if(d.voltageLinked!==undefined) setVoltageLinkState(!!d.voltageLinked); }catch(e){}
  try{ if(d.graphsCollapsed && window._setSimGraphCollapsed) window._setSimGraphCollapsed(d.graphsCollapsed); }catch(e){}
  try{ if(d.graphLayoutCols && window._setSimGraphCols) window._setSimGraphCols(d.graphLayoutCols); }catch(e){}
  try{ if(window._setSimGraphSize) window._setSimGraphSize(d.graphSize||'l'); }catch(e){}
}
(function(){
  var KEY='sirenosc_motor_sim', t=null, restoring=false;
  function save(){
    if(restoring) return;
    clearTimeout(t);
    t=setTimeout(function(){ try{ localStorage.setItem(KEY,JSON.stringify(gatherMotorSimData())); }catch(e){} },150);
  }
  ['input','change','click'].forEach(function(ev){
    document.addEventListener(ev,function(e){
      var id=e.target && e.target.id;
      if(id && (MOTOR_SIM_FIELDS.indexOf(id)>=0 || id==='btnSimLayout1' || id==='btnSimLayout2' || id==='btnLinkVoltage' || id==='btnCalcTorque')) save();
      else if(e.target.classList && e.target.classList.contains('simgraph-head')) save();
    },true);
  });
  window._restoreMotorSim=function(){
    var raw=null; try{ raw=localStorage.getItem(KEY); }catch(e){}
    if(!raw) return;
    var d; try{ d=JSON.parse(raw); }catch(e){ return; }
    restoring=true; try{ applyMotorSimData(d); } finally{ restoring=false; }
  };
})();

(function(){
  var cT=document.getElementById('simTorqueCanvas'), cC=document.getElementById('simCounterCanvas');
  var box=document.getElementById('torqueSimBox'), simSel=document.getElementById('motorSimTypeSelect');
  if(!cT||!cC||!box||!simSel) return;
  var running=false, lastSig='';

  var PEAK_FMT={
    torque :function(v){return v.toFixed(2)+' N·m';},
    counter:function(v){return v.toFixed(2)+' N·m';},
    omega  :function(v){return Math.round(v)+' RPM';},
    alpha  :function(v){return v.toFixed(1)+' rad/s²';},
    voltage:function(v){return v.toFixed(1)+' V';},
    current:function(v){return v.toFixed(1)+' A';}
  };
  var peaks={}, peakT0={}, peakShown={};
  Object.keys(PEAK_FMT).forEach(function(k){ peaks[k]={hi:null,lo:null}; peakT0[k]=0; });
  function updPeak(k,v){
    if(!isFinite(v)) return;
    var q=peaks[k]; if(q.hi===null||v>q.hi) q.hi=v; if(q.lo===null||v<q.lo) q.lo=v;
  }
  function renderPeaks(){
    Object.keys(peaks).forEach(function(k){
      var q=peaks[k], f=PEAK_FMT[k];
      function box_(lbl,col,val){ return '<div class="simgraph-pk" style="border-color:'+col+'55"><b>'+lbl+'</b><i style="color:'+col+'">'+val+'</i></div>'; }
      var html=(q.hi===null)?box_('HIGH','#5a6280','--')+box_('LOW','#5a6280','--')
        :box_('HIGH','#ff7a1a',f(q.hi))+box_('LOW','#35b9f0',f(q.lo));
      if(peakShown[k]===html) return; peakShown[k]=html;
      var el=box.querySelector('.simgraph[data-key="'+k+'"] .simgraph-peaks')||document.querySelector('.simgraph[data-key="'+k+'"] .simgraph-peaks'); if(el) el.innerHTML=html;
    });
  }
  function drawPeakLines(ctx,k,Y,L,pw){
    var q=peaks[k]; if(!q||q.hi===null) return;
    ctx.save(); ctx.lineWidth=1; ctx.setLineDash([4,4]);
    [[q.hi,'rgba(255,122,26,0.7)'],[q.lo,'rgba(53,185,240,0.7)']].forEach(function(a){
      var y=Math.round(Y(a[0]))+0.5; ctx.strokeStyle=a[1]; ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(L+pw,y); ctx.stroke();
    });
    ctx.restore();
  }

  function gScale(w,h,s){ return Math.max(0.35,Math.min(3,Math.max(0.6,Math.min(1.4,Math.min(w/480,h/260)))*(s||1))); }
  function fit(c){
    var dpr=(typeof hiResK==='function'?hiResK():(window.devicePixelRatio||1)), w=c.clientWidth||300, h=c.clientHeight||170;
    var bw=Math.round(w*dpr), bh=Math.round(h*dpr);
    if(c.width!==bw||c.height!==bh){ c.width=bw; c.height=bh; }
    var ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    var scEl=c.closest&&c.closest('[data-vz-sc]'), sc=scEl?(parseFloat(scEl.getAttribute('data-vz-sc'))||1):1;
    return {ctx:ctx,w:w,h:h,sc:sc};
  }
  function niceStep(max,n){
    var raw=max/n, mag=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/mag;
    return (f<1.5?1:f<3.5?2:f<7.5?5:10)*mag;
  }
  function fmt(y,step){ return step>=1?String(Math.round(y)):y.toFixed(step>=0.1?1:2); }

  function drawGraph(c,o){
    var g=fit(c), ctx=g.ctx, gs=gScale(g.w,g.h,g.sc), W=g.w/gs, H=g.h/gs; ctx.scale(gs,gs);
    ctx.clearRect(0,0,W,H); if(!document.documentElement.classList.contains('glossy')){ ctx.fillStyle='#0b0c0d'; ctx.fillRect(0,0,W,H); }
    var L=58,R=12,T=24,B=38, pw=W-L-R, ph=H-T-B;
    var xmin=o.xmin||0;
    function X(x){ return L+(x-xmin)/(o.xmax-xmin)*pw; }
    function Y(y){ return T+ph-(y/o.ymax)*ph; }
    ctx.font='12px "Open Sans", sans-serif';
    ctx.lineWidth=1;
    var xw=ctx.measureText(String(Math.round(o.xmax))).width+18, xs=niceStep(o.xmax,Math.max(1,Math.min(6,Math.floor(pw/xw)))), i, v, px, py, lastR=-1e9;
    for(i=Math.ceil(xmin/xs-1e-9);i*xs<=o.xmax+1e-6;i++){
      v=i*xs; px=Math.round(X(v))+0.5;
      ctx.strokeStyle='#1c2029'; ctx.beginPath(); ctx.moveTo(px,T); ctx.lineTo(px,T+ph); ctx.stroke();
      var lb=String(Math.round(v)), lw=ctx.measureText(lb).width;
      if(px-lw/2>=lastR+6){ ctx.fillStyle='#8a8f9c'; ctx.textAlign='center'; ctx.fillText(lb,px,T+ph+15); lastR=px+lw/2; }
    }
    var ys=niceStep(o.ymax,Math.max(1,Math.min(5,Math.floor(ph/22))));
    for(i=0;i*ys<=o.ymax+1e-9;i++){
      v=i*ys; py=Math.round(Y(v))+0.5;
      ctx.strokeStyle='#1c2029'; ctx.beginPath(); ctx.moveTo(L,py); ctx.lineTo(L+pw,py); ctx.stroke();
      ctx.fillStyle='#8a8f9c'; ctx.textAlign='right'; ctx.fillText(fmt(v,ys),L-6,py+4);
    }
    ctx.strokeStyle='#3a3f4d'; ctx.strokeRect(L+0.5,T+0.5,pw,ph);
    
    ctx.font='12px "Open Sans", sans-serif'; ctx.fillStyle='#8a8f9c';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('RPM',L+pw/2,H-4);
    ctx.save(); ctx.translate(13,T+ph/2); ctx.rotate(-Math.PI/2);
    var yw=ctx.measureText(o.ylabel).width; if(yw>ph){ ctx.font=Math.max(8,Math.floor(12*ph/yw))+'px "Open Sans", sans-serif'; }
    ctx.textBaseline='middle'; ctx.fillText(o.ylabel,0,0); ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.rect(L,T-2,pw,ph+4); ctx.clip();
    if(o.hline!==undefined){
      ctx.strokeStyle='#5a5f6c'; ctx.lineWidth=1.5; ctx.beginPath();
      ctx.moveTo(X(xmin),Y(o.hline)); ctx.lineTo(X(o.xmax),Y(o.hline)); ctx.stroke();
    }
    var N=200, x1=(o.x1!==undefined?o.x1:o.xmax);
    if(o.ghost){
      ctx.save(); ctx.globalAlpha=0.5; ctx.strokeStyle=o.color; ctx.lineWidth=2; ctx.beginPath();
      for(i=0;i<=N;i++){ var gx=xmin+(x1-xmin)*i/N, gy=o.ghost.f(gx); if(i===0) ctx.moveTo(X(gx),Y(gy)); else ctx.lineTo(X(gx),Y(gy)); }
      ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle=o.color; ctx.lineWidth=2; ctx.beginPath();
    for(i=0;i<=N;i++){ var xx=xmin+(x1-xmin)*i/N, yy=o.f(xx); if(i===0) ctx.moveTo(X(xx),Y(yy)); else ctx.lineTo(X(xx),Y(yy)); }
    ctx.stroke();
    if(o.vline){ ctx.beginPath(); ctx.moveTo(X(o.vline.x),Y(0)); ctx.lineTo(X(o.vline.x),Y(o.vline.y)); ctx.stroke(); }
    if(o.pk) drawPeakLines(ctx,o.pk,Y,L,pw);
    ctx.restore();

    if(o.dot){
      var dx=X(o.dot.x), dy=Y(o.dot.y);
      ctx.beginPath(); ctx.arc(dx,dy,5,0,Math.PI*2);
      if(o.dot.hollow){ ctx.lineWidth=2; ctx.strokeStyle=o.dot.color; ctx.stroke(); }
      else { ctx.fillStyle=o.dot.color; ctx.fill(); }
      if(o.dot.ring){ ctx.lineWidth=2; ctx.strokeStyle=o.dot.color; ctx.stroke(); }
    }
    if(o.ghost && o.ghost.label){ ctx.save(); ctx.globalAlpha=0.7; ctx.fillStyle=o.color; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.font='12px "Open Sans", sans-serif'; ctx.fillText(o.ghost.label,L,T-8); ctx.restore(); }
    if(o.readout){ ctx.fillStyle='#8a8f9c'; ctx.textAlign='right'; ctx.font='12px "Open Sans", sans-serif'; ctx.fillText(o.readout,L+pw-4,T+14); }
  }

  var gh={prev:null,since:0,ghost:null,ghostT:0,id:0};
  function updateGhost(p){
    var t=performance.now();
    if(gh.prev===null){ gh.prev=p; gh.since=t; return; }
    if(Math.abs(p.r-gh.prev.r)>1e-9){
      if(t-gh.since>=400){ gh.ghost=gh.prev; gh.ghostT=t; gh.id++; }
      gh.prev=p; gh.since=t;
    }
    if(gh.ghost && t-gh.ghostT>800 && (windDirection==='steady'||windDirection==='idle')){ gh.ghost=null; gh.id++; }
  }
  window._clearTorqueGhost=function(){ gh.ghost=null; gh.id++; lastSig=''; };

  function redraw(){
    var p=simParams(), ws=simSignedRPM(), rpm=Math.abs(ws), fr=simMotorSign()*ws, powered=!!active;
    var xmax=(p.mt==='series'||p.mt==='bldc'||p.mt==='universal')?Math.ceil(p.nr*1.3/500)*500:Math.ceil(p.ns*1.1/500)*500;
    xmax=Math.max(xmax,Math.ceil(rpm*1.02/500)*500);
    var ev=simEval(fr,powered,p);
    var xmin=fr<-1?-Math.max(500,Math.ceil(-fr*1.05/500)*500):0;

    var sync=(p.mt==='synchronous'), x1=xmax;
    var ymax=0, k, yy;
    for(k=0;k<=100;k++){ yy=simMotor(xmin+(x1-xmin)*k/100,p); if(yy>ymax) ymax=yy; }
    var pull=sync&&p.r>0?simSyncPullout(p):0; if(pull>ymax) ymax=pull;
    var gp=gh.ghost;
    if(gp){
      for(k=0;k<=100;k++){ yy=simMotor(xmin+(x1-xmin)*k/100,gp); if(yy>ymax) ymax=yy; }
      if(sync&&gp.r>0){ var gpull=simSyncPullout(gp); if(gpull>ymax) ymax=gpull; }
    }
    if(!(ymax>0)) ymax=p.Tn*3;
    updPeak('torque',powered?ev.Tm:0); updPeak('counter',ev.Tc);
    drawGraph(cT,{
      pk:'torque', title:'Motor/Speed', ylabel:'Torque (N·m)', xmin:xmin, xmax:xmax, ymax:ymax*1.08, color:'#ff4d3d',
      f:function(x){ return simMotor(x,p); }, x1:x1,
      ghost:gp?{f:function(x){ return simMotor(x,gp); },label:'Previous: '+Math.round(inputVolts(gp)*10)/10+' V'}:null,
      hline:ev.Tc,
      dot:{x:fr,y:powered?ev.Tm:0,color:'#ff7a1a',hollow:!powered},
      readout:Math.round(rpm)+' RPM'+(fr<-1?' · PLUGGING':'')
    });

    drawGraph(cC,{
      pk:'counter', title:'Air Resistance/Bearing Friction', ylabel:'Counter Torque (N·m)', xmax:xmax,
      ymax:simCounter(xmax,p)*1.08, color:'#35b9f0',
      f:function(x){ return simCounter(x,p); },
      ghost:{f:function(x){ var q={}; for(var kk in p) q[kk]=p[kk]; q.K=(p.K!==undefined?p.K:SIM_K_AIR)*(1-simDamperAirCut()); return simCounter(x,q); }},
      dot:{x:rpm,y:ev.Tc,color:'#35b9f0',hollow:true,ring:true}
    });
  }

  if(document.fonts&&document.fonts.load){ document.fonts.load('12px "Open Sans"').then(function(){ lastSig=''; }).catch(function(){}); }
  var TS_WINDOW=30, ts=[], tsRpm=[], tsI=[], tsV=[];
  var cI=document.getElementById('simCurrentCanvas'), cW=document.getElementById('simOmegaCanvas'),
      cA=document.getElementById('simAlphaCanvas'), cV=document.getElementById('simVoltageCanvas');
  function csNum(id,d,lo,hi){ var el=document.getElementById(id), v=el?parseFloat(el.value):NaN; return isFinite(v)?Math.min(hi,Math.max(lo,v)):d; }
  function inputVolts(p){
    var pkV=get('peakVoltageSelect').value==='other'?parseFloat(get('peakVoltageOther').value):parseFloat(get('peakVoltageSelect').value);
    if(!(pkV>0)) pkV=240;
    return pkV*(p.r>0?p.r:0);
  }
  function ratedCurrent(p){
    var pkV=get('peakVoltageSelect').value==='other'?parseFloat(get('peakVoltageOther').value):parseFloat(get('peakVoltageSelect').value);
    if(!(pkV>0)) pkV=240;
    var P=p.Tn*p.nr*Math.PI/30, eta=csNum('nSimEff',90,10,100)/100, pf=csNum('nSimPF',0.85,0.1,1);
    if(p.cur==='dc') return P/(eta*pkV);
    if(p.cur==='ac1') return P/(eta*pf*pkV);
    return P/(eta*pf*Math.sqrt(3)*pkV);
  }
  function currentAmps(rpm,powered,p){
    if(!powered || !(p.r>0)) return 0;
    var Ir=ratedCurrent(p), pu, Tm=simEval(rpm,true,p).Tm;
    if(p.mt==='induction1'||p.mt==='induction3'||p.mt==='synchronous'){
      var Inl=csNum('nSimNoLoad',0.35,0,0.95), Ilr=csNum('nSimInrush',6,1.05,20), sl=Math.max(0.005,Math.min(0.5,p.slip)), s=Math.max(0,Math.min(rpm<0?2:1,(p.ns-Math.max(-0.98*p.ns,rpm))/p.ns));
      var a=Math.log((1-Inl)/(Ilr-Inl))/Math.log(sl);
      pu=Inl+(Ilr-Inl)*Math.pow(s,a);
      if(p.mt==='synchronous' && s<0.005) pu=Math.max(Inl,Tm/p.Tn);
    } else pu=Math.max(0,Tm/p.Tn);
    return Ir*pu*p.r;
  }
  function sample(){
    var now=performance.now()/1000, p=simParams();
    var ws=simSignedRPM();
    ts.push(now); tsRpm.push(ws); tsI.push(currentAmps(simMotorSign()*ws,!!active,p)); tsV.push(getLiveVoltageApplied());
    updPeak('omega',ws); updPeak('current',tsI[tsI.length-1]); updPeak('voltage',tsV[tsV.length-1]);
    while(ts.length>2 && now-ts[0]>TS_WINDOW+1){ ts.shift(); tsRpm.shift(); tsI.shift(); tsV.shift(); }
  }
  function niceTicks(lo,hi,n){
    var span=hi-lo; if(!(span>0)){ hi=lo+1; span=1; }
    var raw=span/n, mag=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/mag;
    var step=(f<1.5?1:f<3.5?2:f<7.5?5:10)*mag, out=[];
    for(var v=Math.ceil(lo/step)*step; v<=hi+1e-9; v+=step) out.push(Math.round(v/step)*step);
    return {ticks:out,step:step};
  }
  function drawSeries(c,vals,o){
    if(!c || c.offsetParent===null) return;
    var g=fit(c), ctx=g.ctx, gs=gScale(g.w,g.h,g.sc), W=g.w/gs, H=g.h/gs, now=ts.length?ts[ts.length-1]:0; ctx.scale(gs,gs);
    ctx.clearRect(0,0,W,H); if(!document.documentElement.classList.contains('glossy')){ ctx.fillStyle='#0b0c0d'; ctx.fillRect(0,0,W,H); }
    var L=60,R=12,T=12,B=34, pw=W-L-R, ph=H-T-B, i, lo=0, hi=0, t0=(o.key&&peakT0[o.key])||0;
    for(i=0;i<vals.length;i++){ if(now-ts[i]<=TS_WINDOW && ts[i]>=t0){ if(vals[i]<lo) lo=vals[i]; if(vals[i]>hi) hi=vals[i]; } }
    var clipped=false;
    if(o.robust){
      var av=[]; for(i=0;i<vals.length;i++){ if(now-ts[i]<=TS_WINDOW && ts[i]>=t0) av.push(Math.abs(vals[i])); }
      if(av.length){
        av.sort(function(a,b){ return a-b; });
        var ref=av[Math.min(av.length-1,Math.floor(av.length*0.9))]*1.6;
        if(ref<1e-6) ref=Math.max(Math.abs(lo),Math.abs(hi),1e-6);
        if(hi>ref){ hi=ref; clipped=true; }
        if(lo<-ref){ lo=-ref; clipped=true; }
      }
    }
    if(hi-lo<1e-9) hi=lo+1;
    var pad=(hi-lo)*0.08; if(hi>0) hi+=pad; if(lo<0) lo-=pad;
    function X(t){ return L+(t-(now-TS_WINDOW))/TS_WINDOW*pw; }
    function Y(v){ return T+ph-(v-lo)/(hi-lo)*ph; }
    ctx.font='12px "Open Sans", sans-serif'; ctx.lineWidth=1;
    var yt=niceTicks(lo,hi,Math.max(2,Math.min(4,Math.floor(ph/24))));
    yt.ticks.forEach(function(v){
      var py=Math.round(Y(v))+0.5;
      ctx.strokeStyle=(v===0?'#3a3f4d':'#1c2029'); ctx.beginPath(); ctx.moveTo(L,py); ctx.lineTo(L+pw,py); ctx.stroke();
      ctx.fillStyle='#8a8f9c'; ctx.textAlign='right';
      ctx.fillText(yt.step>=1?String(Math.round(v)):v.toFixed(yt.step>=0.1?1:2),L-6,py+4);
    });
    var lstep=6, lw0=ctx.measureText(String(-TS_WINDOW)).width+10; [1,2,3,6].some(function(k){ if(pw/6*k>=lw0){ lstep=k; return true; } return false; });
    for(i=0;i<=6;i++){
      var px=Math.round(L+i/6*pw)+0.5;
      ctx.strokeStyle='#1c2029'; ctx.beginPath(); ctx.moveTo(px,T); ctx.lineTo(px,T+ph); ctx.stroke();
      if(i%lstep===0||i===6){ if(i===6&&lstep>1&&6%lstep!==0&&pw/6<lw0) continue; ctx.fillStyle='#8a8f9c'; ctx.textAlign='center'; ctx.fillText(String(-(TS_WINDOW-i*TS_WINDOW/6)),px,T+ph+15); }
    }
    ctx.strokeStyle='#3a3f4d'; ctx.strokeRect(L+0.5,T+0.5,pw,ph);
    ctx.fillStyle='#8a8f9c'; ctx.textAlign='center'; ctx.fillText('Time (s)',L+pw/2,H-3);
    ctx.save(); ctx.translate(13,T+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText(o.ylabel,0,0); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(L,T,pw,ph); ctx.clip();
    ctx.strokeStyle=o.color; ctx.lineWidth=2; ctx.beginPath();
    var first=true;
    for(i=0;i<vals.length;i++){
      if(now-ts[i]>TS_WINDOW+1 || ts[i]<t0) continue;
      if(first){ ctx.moveTo(X(ts[i]),Y(vals[i])); first=false; } else ctx.lineTo(X(ts[i]),Y(vals[i]));
    }
    ctx.stroke();
    if(o.key) drawPeakLines(ctx,o.key,Y,L,pw);
    ctx.restore();
    if(vals.length){ ctx.fillStyle='#8a8f9c'; ctx.textAlign='right'; ctx.fillText(o.fmt(vals[vals.length-1]),L+pw-4,T+14); }
    if(clipped){ ctx.fillStyle='#5a6280'; ctx.textAlign='left'; ctx.fillText('peaks clipped',L+6,T+14); }
  }
  function smoothT(v,hw){
    var n=v.length, pre=new Array(n+1), out=new Array(n), a=0, b=0, i; pre[0]=0;
    for(i=0;i<n;i++) pre[i+1]=pre[i]+v[i];
    for(i=0;i<n;i++){
      while(ts[i]-ts[a]>hw) a++;
      while(b<n-1 && ts[b+1]-ts[i]<=hw) b++;
      out[i]=(pre[b+1]-pre[a])/(b-a+1);
    }
    return out;
  }
  function redrawSeries(){
    var n=ts.length, w=new Array(n), al=new Array(n), i, a=0, b=0;
    for(i=0;i<n;i++) w[i]=tsRpm[i]*Math.PI/30;
    w=smoothT(w,0.12);
    for(i=0;i<n;i++){
      while(ts[i]-ts[a]>0.25) a++;
      while(b<n-1 && ts[b+1]-ts[i]<=0.25) b++;
      var dt=ts[b]-ts[a];
      al[i]=dt>0.05?(w[b]-w[a])/dt:0;
    }
    al=smoothT(al,0.2);
    if(n){ var tEnd=ts[n-1]; for(i=0;i<n;i++){ if(tEnd-ts[i]>=0.45 && ts[i]>=peakT0.alpha+0.3) updPeak('alpha',al[i]); } }
    drawSeries(cW,tsRpm,{key:'omega',ylabel:'ω (RPM)',color:'#4dd6a0',fmt:function(v){return Math.round(v)+' RPM';}});
    drawSeries(cA,al,{key:'alpha',robust:true,ylabel:'α (rad/s²)',color:'#b48cff',fmt:function(v){return v.toFixed(1)+' rad/s²';}});
    drawSeries(cV,tsV,{key:'voltage',ylabel:'Voltage (V)',color:'#5aa9ff',fmt:function(v){return v.toFixed(1)+' V';}});
    drawSeries(cI,tsI,{key:'current',ylabel:'Current (A)',color:'#e8c547',fmt:function(v){return v.toFixed(1)+' A';}});
  }

  function updateCurrentFieldState(){
    var dc=get('currentTypeSelect').value==='dc', pf=document.getElementById('nSimPF'), en=document.getElementById('simPfEntry');
    if(!pf||!en) return;
    pf.disabled=dc; en.style.opacity=dc?'0.4':''; en.style.pointerEvents=dc?'none':'';
  }
  get('currentTypeSelect').addEventListener('change',updateCurrentFieldState);
  updateCurrentFieldState();

  var collapsed={};
  function applyCollapse(){
    box.querySelectorAll('.simgraph').forEach(function(w){
      var k=w.getAttribute('data-key'), c=w.querySelector('canvas'), chev=w.querySelector('.simgraph-chev'), head=w.querySelector('.simgraph-head');
      c.style.display=collapsed[k]?'none':'block';
      chev.innerHTML=collapsed[k]?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>':'<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>';
      head.style.borderRadius=collapsed[k]?'2px':'2px 2px 0 0';
    });
    lastSig='';
  }
  box.querySelectorAll('.simgraph-refresh').forEach(function(b){
    b.addEventListener('click',function(e){
      e.stopPropagation();
      var k=b.closest('.simgraph').getAttribute('data-key');
      peaks[k]={hi:null,lo:null}; peakT0[k]=performance.now()/1000; peakShown[k]=null;
      if(k==='torque' && window._clearTorqueGhost) window._clearTorqueGhost();
      lastSig=''; renderPeaks();
    });
  });
  box.querySelectorAll('.simgraph-head').forEach(function(h){
    h.addEventListener('click',function(){
      var k=h.parentNode.getAttribute('data-key'); collapsed[k]=!collapsed[k]; applyCollapse();
      h.dispatchEvent(new Event('change',{bubbles:true}));
    });
  });
  var graphCols=2;
  function applyCols(){
    var grid=document.getElementById('simGraphGrid'), b1=document.getElementById('btnSimLayout1'), b2=document.getElementById('btnSimLayout2'), sw=document.getElementById('simGraphLayoutSwitch');
    if(!grid) return;
    grid.classList.toggle('cols2',graphCols===2);
    if(sw) sw.style.display='flex';
    if(b1) b1.className='vbtn '+(graphCols===1?'btn-accent':'btn-gray');
    if(b2) b2.className='vbtn '+(graphCols===2?'btn-accent':'btn-gray');
    lastSig='';
    requestAnimationFrame(function(){ lastSig=''; });
  }
  ['btnSimLayout1','btnSimLayout2'].forEach(function(id){
    var b=document.getElementById(id); if(!b) return;
    b.addEventListener('click',function(){ graphCols=parseInt(b.getAttribute('data-cols'),10)===2?2:1; applyCols(); });
  });
  var graphSize='l';
  function applySize(){ var grid=document.getElementById('simGraphGrid'); if(!grid) return; grid.classList.toggle('gs-s',graphSize==='s'); grid.classList.toggle('gs-m',graphSize==='m'); lastSig=''; requestAnimationFrame(function(){ lastSig=''; }); }
  window._getSimGraphSize=function(){ return graphSize; };
  window._setSimGraphSize=function(z){ graphSize=(z==='s'||z==='m')?z:'l'; applySize(); };
  (function(){
    var mb=document.getElementById('btnSimGraphMenu'), menu=null; if(!mb) return;
    function close(){ if(menu&&menu.parentNode) menu.parentNode.removeChild(menu); menu=null; }
    function persist(){ var h=document.querySelector('#simGraphGrid .simgraph-head'); if(h) h.dispatchEvent(new Event('change',{bubbles:true})); }
    mb.addEventListener('click',function(e){
      e.stopPropagation(); if(menu){ close(); return; }
      var ab=document.getElementById('btnSimGraphsCollapseAll');
      var rows=[
        {l:'1 COL',on:graphCols===1,fn:function(){ document.getElementById('btnSimLayout1').click(); }},
        {l:'2 COL',on:graphCols===2,fn:function(){ document.getElementById('btnSimLayout2').click(); }},
        {l:ab?ab.textContent:'COLLAPSE ALL',fn:function(){ if(ab) ab.click(); }},
        {sep:1},
        {l:'SMALL',on:graphSize==='s',fn:function(){ graphSize='s'; applySize(); persist(); }},
        {l:'MEDIUM',on:graphSize==='m',fn:function(){ graphSize='m'; applySize(); persist(); }},
        {l:'LARGE',on:graphSize==='l',fn:function(){ graphSize='l'; applySize(); persist(); }}
      ];
      menu=document.createElement('div'); menu.className='sx-ctx'; menu.setAttribute('role','menu');
      rows.forEach(function(r){
        if(r.sep){ var sp=document.createElement('div'); sp.style.cssText='height:0;margin:5px 6px;border-top:1px solid var(--muted);opacity:.6'; menu.appendChild(sp); return; }
        var d=document.createElement('div'); d.className='sx-ctx-item'; d.setAttribute('role','menuitem');
        var ck=document.createElement('span'); ck.className='sx-ctx-ck'; ck.innerHTML=r.on?'<svg class="si" aria-hidden="true"><use href="#si-check"/></svg>':''; d.appendChild(ck); d.appendChild(document.createTextNode(r.l));
        d.addEventListener('click',function(ev){ ev.stopPropagation(); close(); r.fn(); }); menu.appendChild(d);
      });
      document.body.appendChild(menu);
      var br=mb.getBoundingClientRect(), z=parseFloat(document.body.style.zoom)||1, px=Math.min(br.left,window.innerWidth-menu.offsetWidth*z-4);
      menu.style.left=(Math.max(0,px)/z)+'px'; menu.style.top=((br.bottom+2)/z)+'px';
    });
    document.addEventListener('mousedown',function(e){ if(menu&&!(e.target.closest&&(e.target.closest('.sx-ctx')||e.target.closest('#btnSimGraphMenu')))) close(); },true);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    window.addEventListener('resize',close);
  })();
  window._simGraphsRefresh=function(){ lastSig=''; };
  window._simGraphsClear=function(){
    ts.length=0; tsRpm.length=0; tsI.length=0; tsV.length=0;
    var t0=performance.now()/1000;
    Object.keys(peaks).forEach(function(k){ peaks[k]={hi:null,lo:null}; peakT0[k]=t0; peakShown[k]=null; });
    if(window._clearTorqueGhost) window._clearTorqueGhost();
    lastSig=''; try{ renderPeaks(); }catch(e){}
  };
  window._getSimGraphCols=function(){ return graphCols; };
  window._setSimGraphCols=function(n){ graphCols=(parseInt(n,10)===2)?2:1; applyCols(); };
  applyCols();
  window._getSimGraphCollapsed=function(){ return Object.assign({},collapsed); };
  window._setSimGraphCollapsed=function(o){ collapsed=Object.assign({},o||{}); applyCollapse(); };

  function simCvSig(){ var o='', l=document.querySelectorAll('.simgraph canvas'), i; for(i=0;i<l.length;i++) o+=l[i].clientWidth+'x'+l[i].clientHeight+','; return o; }
  function loop(){
    if(!running) return;
    sample();
    redrawSeries();
    renderPeaks();
    var p=simParams(); updateGhost(p);
    var sig=currentRPM.toFixed(1)+'|'+simSignedRPM().toFixed(1)+'|'+simMotorSign()+'|'+(active?1:0)+'|'+JSON.stringify(p)+'|'+simCvSig()+'|g'+gh.id+'|ao'+simAirOffset();
    if(sig!==lastSig){ lastSig=sig; redraw(); }
    requestAnimationFrame(loop);
  }
  function graphsOutside(){
    var l=document.querySelectorAll('.simgraph'), i; for(i=0;i<l.length;i++){ if(!box.contains(l[i])&&l[i].getClientRects().length) return true; } return false;
  }
  function applyMode(){
    var on=isTorqueMode(), show=on||graphsOutside();
    box.style.display=on?'':'none';
    if(show&&!running){ running=true; lastSig=''; requestAnimationFrame(loop); }
    else if(!show){ running=false; }
  }
  setInterval(function(){ var show=isTorqueMode()||graphsOutside(); if(show!==running) applyMode(); },400);
  function restartWindForMode(){
    if(currentRPM<=0 && !active) return;
    if(windAnimId){ cancelAnimationFrame(windAnimId); windAnimId=null; }
    startWind(active?'up':'down');
  }
  simSel.addEventListener('change',function(){ applyMode(); restartWindForMode(); });
  ['selHybridUp','selHybridDown'].forEach(function(id){ var e=document.getElementById(id); if(e) e.addEventListener('change',function(){ applyMode(); restartWindForMode(); }); });
  applyMode();
})();
