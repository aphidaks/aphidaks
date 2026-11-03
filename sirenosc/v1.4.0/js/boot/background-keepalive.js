
(function(){
  var rnR = performance.now.bind(performance);
  var nST = window.setTimeout.bind(window), nSI = window.setInterval.bind(window), nCT = window.clearTimeout.bind(window), nCI = window.clearInterval.bind(window);
  var q = {}, nid = 1e9, armH = 0, armAt = Infinity, inTick = false;
  function fire(e){ try{ e.f.apply(window, e.a); }catch(err){ nST(function(){ throw err; }, 0); } }
  function tick(){
    if(inTick) return; inTick = true;
    try{
      var now = rnR(), ids = Object.keys(q);
      for(var k = 0; k < ids.length; k++){ var e = q[ids[k]]; if(!e || e.at > now) continue; if(e.i) e.at = now + e.ms; else delete q[ids[k]]; fire(e); }
      if(window._bgPump) window._bgPump();
    } finally { inTick = false; }
    arm();
  }
  function arm(){
    var next = Infinity, ids = Object.keys(q);
    for(var k = 0; k < ids.length; k++) if(q[ids[k]].at < next) next = q[ids[k]].at;
    if(next === Infinity) return;
    var d = Math.max(0, next - rnR());
    if(armH && armAt <= next + 1) return;
    if(armH) nCT(armH);
    armAt = next; armH = nST(function(){ armH = 0; armAt = Infinity; tick(); }, d);
  }
  function mk(i){ var nat = i ? nSI : nST; return function(f, ms){
    if(typeof f !== 'function') return nat.apply(window, arguments);
    var id = nid++; ms = Math.max(0, +ms || 0);
    q[id] = { f: f, a: Array.prototype.slice.call(arguments, 2), at: rnR() + ms, ms: Math.max(ms, 1), i: i };
    arm(); return id; }; }
  function clr(nat){ return function(id){ if(id >= 1e9) delete q[id]; else nat(id); }; }
  window.setTimeout = mk(0); window.setInterval = mk(1); window.clearTimeout = clr(nCT); window.clearInterval = clr(nCI);
  window.__bgTick = tick;
  try{
    var src = 'setInterval(function(){postMessage(0)},20)';
    var url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
    var W = new Worker(url); URL.revokeObjectURL(url); W.onmessage = tick; W.onerror = function(){};
  }catch(e){}
  window.__bgAttachCtx = function(c){
    try{ var sp = c.createScriptProcessor(4096, 1, 1); sp.onaudioprocess = tick; sp.connect(c.destination); (c._bgKeep = c._bgKeep || []).push(sp); }catch(e){}
  };
  nSI(tick, 1000);
  ['visibilitychange', 'pagehide', 'pageshow', 'focus', 'blur', 'resume'].forEach(function(n){ (n === 'visibilitychange' ? document : window).addEventListener(n, tick); });
  window.setInterval(function(){ try{ if(typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended' && !window._simPaused && window._simResumeCtx) window._simResumeCtx(audioCtx).catch(function(){}); }catch(e){} }, 500);
  try{ if(navigator.locks) navigator.locks.request('sirenosc-keepalive', function(){ return new Promise(function(){}); }); }catch(e){}
})();
