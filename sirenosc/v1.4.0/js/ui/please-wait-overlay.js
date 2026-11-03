
(function(){
  function hidePleaseWait(){
    var el = document.getElementById('pleaseWaitOverlay');
    if(!el) return;
    setProg(100);
    setTimeout(function(){ el.style.opacity = '0'; }, 150);
    setTimeout(function(){ el.style.display = 'none'; }, 450);
  }
  var pend = 0, peak = 0, pFonts = false, pLoad = false, shown = 0;
  window._pwBegin = function(){ pend++; if(pend > peak) peak = pend; var d = false; return function(){ if(d) return; d = true; pend--; }; };
  function setProg(p){
    p = Math.max(shown, Math.min(100, p)); shown = p;
    var b = document.getElementById('pwBar'), t = document.getElementById('pwPct');
    if(b) b.style.width = p + '%'; if(t) t.textContent = Math.round(p) + '%';
  }
  function calcProg(){
    var p = 10 + (pFonts ? 25 : 0) + (pLoad ? 30 : 0);
    if(pLoad) p += peak > 0 ? 30 * (1 - pend / peak) : 0;
    return Math.min(p, 97);
  }
  setProg(10);
  setInterval(function(){ var c = calcProg(); setProg(c > shown ? c : Math.min(97, shown + 0.15)); }, 100);
  var minTime = new Promise(function(res){ setTimeout(res, 400); });
  var fontsReady = ((document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()).then(function(){ pFonts = true; });
  var pageLoaded = new Promise(function(res){
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, {once:true});
  }).then(function(){ pLoad = true; });
  var tasksDone = pageLoaded.then(function(){ return new Promise(function(res){
    var sub = document.getElementById('pwSub');
    (function poll(){
      if(pend > 0){ if(sub) sub.textContent = 'Opening tabs & preset'; return setTimeout(poll, 60); }
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(function(){ if(pend > 0) return poll(); res(); }, 150); }); });
    })();
  }); });
  var timeoutFallback = new Promise(function(res){ setTimeout(res, 30000); });
  Promise.race([
    Promise.all([minTime, fontsReady, pageLoaded, tasksDone]),
    timeoutFallback
  ]).then(hidePleaseWait);
})();
