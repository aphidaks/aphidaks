
(function(){
  var KEY='sirenosc_ui_settings', REF_W=1100, REF_H=640, MIN=0.9, MAX=3, manual=100, last=0, raf=0;
  function settings(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function isAuto(){ return settings().uiScaleAuto!==false; }
  function touch(){ try{ return window.matchMedia&&window.matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } }
  function autoFactor(){
    if(!isAuto()||touch()) return 1;
    var f=Math.min(window.innerWidth/REF_W, window.innerHeight/REF_H);
    return Math.max(MIN,Math.min(MAX,Math.round(f*20)/20));
  }
  function apply(pct){
    if(typeof pct==='number') manual=pct;
    var z=window._mobileOn?1:autoFactor()*manual/100; z=Math.round(z*1000)/1000;
    window._uiZoom=z;
    document.documentElement.style.setProperty('--uiz',String(z));
    if(document.body && z!==last){ document.body.style.zoom=z.toFixed(3); last=z; }
    if(window._hiResRefresh) window._hiResRefresh();
    if(window._topHRefresh) window._topHRefresh();
    return z;
  }
  window._applyUiZoom=apply; window._uiAutoScale={isAuto:isAuto,factor:autoFactor};
  function soon(){ if(raf) return; raf=requestAnimationFrame(function(){ raf=0; apply(); }); }
  window.addEventListener('resize',soon);
  window.addEventListener('orientationchange',soon);
  apply();
})();
