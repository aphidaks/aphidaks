(function(){
  var box=null, on=false, lastUpd=0;
  var frames=0, winStart=performance.now(), lastTs=performance.now();
  var fps=0, avgMs=0, maxMs=0, sumMs=0, longFrames=0, totalLong=0;
  var lastDir=null, flips=0, flipsPerSec=0, totalFlips=0;
  var longTasks=0, longTaskMs=0;
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ longTasks++; longTaskMs+=e.duration; }); }).observe({entryTypes:['longtask']}); }catch(e){}
  function f(v,d){ return (typeof v==='number'&&isFinite(v))?v.toFixed(d):'—'; }
  function safe(fn,dflt){ try{ var r=fn(); return r===undefined?dflt:r; }catch(e){ return dflt===undefined?'—':dflt; } }
  function build(){
    box=document.createElement('pre');
    box.id='f3Debug';
    box.style.cssText='position:fixed;left:6px;top:6px;z-index:2147483647;margin:0;padding:8px 10px;background:rgba(0,0,0,.78);color:#e6ffe6;font:11px/1.35 Consolas,Menlo,monospace;border:1px solid rgba(255,255,255,.2);border-radius:4px;pointer-events:none;white-space:pre;max-height:96vh;overflow:hidden;display:none';
    document.body.appendChild(box);
  }
  function render(now){
    var L=[];
    var mem=performance.memory;
    L.push('SirenOsc debug  [F2 to close]');
    L.push('');
    L.push('PERFORMANCE');
    L.push(' FPS            '+fps+'   frame avg '+f(avgMs,1)+' ms   max '+f(lastMax,1)+' ms');
    L.push(' Frames >50ms   '+longFrames+' /s   total '+totalLong);
    L.push(' Long tasks     '+longTasks+'  ('+Math.round(longTaskMs)+' ms total)');
    if(mem) L.push(' JS heap        '+f(mem.usedJSHeapSize/1048576,1)+' / '+f(mem.totalJSHeapSize/1048576,1)+' MB  (limit '+f(mem.jsHeapSizeLimit/1048576,0)+')');
    L.push(' DOM nodes      '+document.getElementsByTagName('*').length);
    L.push(' CPU threads    '+(navigator.hardwareConcurrency||'—')+(navigator.deviceMemory?'   RAM ~'+navigator.deviceMemory+' GB':''));
    L.push('');
    L.push('SIMULATION');
    var rpm=safe(function(){return currentRPM;});
    var peak=safe(function(){return getEffectivePeakRPM();});
    L.push(' State          '+safe(function(){return String(windDirection).toUpperCase();})+'   powered '+safe(function(){return active;}));
    L.push(' State flips    '+flipsPerSec+' /s   total '+totalFlips);
    L.push(' RPM            '+f(rpm,2)+'   target '+f(peak,2)+'   diff '+f(typeof rpm==='number'&&typeof peak==='number'?peak-rpm:NaN,2));
    L.push(' Voltage ratio  '+f(safe(function(){return getVoltageRatio();}),3)+'   live V '+f(safe(function(){return getVoltageRatio()*(parseFloat(document.getElementById('peakVoltageSelect').value)||0);}),1));
    L.push(' Wind animation '+(safe(function(){return windAnimId;})?'running (id '+windAnimId+')':'none'));
    var tq=safe(function(){return isTorqueMode();},false);
    L.push(' Torque sim     '+(tq?'ON':'off')+(tq?'   settled '+safe(function(){return !!window._simSettled;})+'   ws '+f(safe(function(){return window._simWs;}),2):''));
    if(tq){
      var p=safe(function(){return simParams();},null);
      if(p){
        L.push('   Tn '+f(p.Tn,3)+' N·m   inertia '+f(safe(function(){return simInertia(p);}),5)+' kg·m²');
        if(p.ns!==undefined) L.push('   sync '+f(p.ns,0)+' rpm   rotor '+f(p.nr,0)+' rpm');
      }
    }
    L.push(' Dampers        '+(safe(function(){return damperEnabled;})?'ON':'off')+'   seq mode '+safe(function(){return seqModeActive;}));
    L.push(' Voltage decline  '+(safe(function(){return _vdVolts!==null?f(_vdVolts,1)+' V':'off';})));
    L.push(' Contactor      '+safe(function(){return contactorDirection;}));
    L.push('');
    L.push('AUDIO');
    var ac=safe(function(){return audioCtx;},null);
    if(ac){
      L.push(' Context        '+ac.state+'   '+ac.sampleRate+' Hz');
      L.push(' Time           '+f(ac.currentTime,2)+' s');
      L.push(' Latency        base '+f((ac.baseLatency||0)*1000,1)+' ms   output '+f((ac.outputLatency||0)*1000,1)+' ms');
    } else L.push(' Not started (waiting for user gesture)');
    L.push('');
    L.push('Page up '+f(now/1000,1)+' s   '+window.innerWidth+'x'+window.innerHeight+' @'+(window.devicePixelRatio||1)+'x');
    box.textContent=L.join('\n');
  }
  function loop(now){
    var dt=now-lastTs; lastTs=now;
    frames++; sumMs+=dt; if(dt>maxMs) maxMs=dt;
    if(dt>50){ longFrames++; totalLong++; }
    var d=safe(function(){return windDirection;},null);
    if(d!==lastDir){ if(lastDir!==null){ flips++; totalFlips++; } lastDir=d; }
    if(now-winStart>=1000){
      fps=Math.round(frames*1000/(now-winStart));
      avgMs=sumMs/Math.max(1,frames);
      flipsPerSec=flips;
      var shownMax=maxMs;
      frames=0; sumMs=0; flips=0; winStart=now;
      maxMs=0;
      lastMax=shownMax;
    }
    if(on && now-lastUpd>=250){ lastUpd=now; try{ render(now); }catch(e){} }
    requestAnimationFrame(loop);
  }
  var lastMax=0;
  document.addEventListener('keydown',function(e){
    if(e.key!=='F2') return;
    e.preventDefault();
    if(!box) build();
    on=!on; box.style.display=on?'block':'none';
    if(on){ lastUpd=0; }
  },true);
  requestAnimationFrame(loop);
})();

