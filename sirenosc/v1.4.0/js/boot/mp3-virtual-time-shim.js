
(function(){
  var PREFIX = 'sirenosc-mp3-vt:';
  if (String(window.name).indexOf(PREFIX) !== 0) return;
  var P, cfg;
  try { P = window.parent; if (!P || P === window) return; cfg = JSON.parse(decodeURIComponent(window.name.slice(PREFIX.length))); } catch (e) { return; }
  var W = window, realNow = W.performance.now.bind(W.performance), realST = W.setTimeout.bind(W);
  var vnow = 1000, T0 = Date.now(), seq = 1, timers = {}, rq = [], rmap = {}, rid = 1;
  W.performance.now = function() { return vnow; };
  Date.now = function() { return T0 + vnow; };
  function addT(rep) { return function(f, ms) {
    if (typeof f !== 'function') return 0;
    var id = seq++; ms = Math.max(1, +ms || 0);
    timers[id] = { at: vnow + ms, ms: ms, rep: rep, f: f, a: Array.prototype.slice.call(arguments, 2) }; return id; }; }
  W.setTimeout = addT(false); W.setInterval = addT(true);
  W.clearTimeout = W.clearInterval = function(id) { delete timers[id]; };
  W.requestAnimationFrame = function(cb) { var e = { id: rid++, cb: cb, dead: false }; rq.push(e); rmap[e.id] = e; return e.id; };
  W.cancelAnimationFrame = function(id) { var e = rmap[id]; if (e) { e.dead = true; delete rmap[id]; } };
  function advance(target) {
    for (;;) {
      var best = null, bid = 0;
      for (var k in timers) { var t = timers[k]; if (t.at <= target && (!best || t.at < best.at)) { best = t; bid = k; } }
      if (!best) break;
      if (best.at > vnow) vnow = best.at;
      if (best.rep) best.at += best.ms; else delete timers[bid];
      try { best.f.apply(W, best.a); } catch (err) { console.error('[vt timer]', err); }
    }
    if (target > vnow) vnow = target;
    var q = rq; rq = [];
    q.forEach(function(e) { if (e.dead) return; delete rmap[e.id]; try { e.cb(vnow); } catch (err) { console.error('[vt raf]', err); } });
  }
  W.Worker = function() { return { postMessage: function(){}, terminate: function(){}, addEventListener: function(){}, removeEventListener: function(){} }; };
  W.fetch = function() { return Promise.reject(new TypeError('network disabled in export renderer')); };
  W.alert = function(m) { console.warn('[export copy] alert:', m); };
  W.confirm = function() { return true; };
  W.prompt = function() { return null; };
  function mem() {
    var d = {};
    return { getItem: function(k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; }, setItem: function(k, v) { d[k] = String(v); },
             removeItem: function(k) { delete d[k]; }, clear: function() { d = {}; }, key: function(i) { return Object.keys(d)[i] || null; },
             get length() { return Object.keys(d).length; } };
  }
  try { Object.defineProperty(W, 'localStorage', { value: mem(), configurable: true }); } catch (e) {}
  try { Object.defineProperty(W, 'sessionStorage', { value: mem(), configurable: true }); } catch (e) {}
  try { Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true }); } catch (e) {}
  try { Object.defineProperty(W, '__bgAttachCtx', { get: function() { return function(){}; }, set: function(){}, configurable: true }); } catch (e) {}
  try { var C2 = W.CanvasRenderingContext2D.prototype;
    ['fill','stroke','fillRect','strokeRect','clearRect','fillText','strokeText','drawImage','putImageData','clip'].forEach(function(n) { if (C2[n]) C2[n] = function() {}; }); } catch (e) {}
  var OAC = W.OfflineAudioContext || W.webkitOfflineAudioContext, OP = OAC.prototype;
  var oSusp = OP.suspend, oRes = OP.resume, oStart = OP.startRendering;
  function Sim() { var c = new OAC(2, cfg.frames, cfg.sr); Object.setPrototypeOf(c, Sim.prototype); return c; }
  Sim.prototype = Object.create(OP, { constructor: { value: Sim, writable: true, configurable: true } });
  Object.defineProperty(Sim.prototype, 'state', { get: function() { return 'running'; }, configurable: true });
  Sim.prototype.suspend = function() { return Promise.resolve(); };
  Sim.prototype.resume = function() { return Promise.resolve(); };
  Sim.prototype.close = function() { return Promise.resolve(); };
  W.AudioContext = Sim; W.webkitAudioContext = Sim;

  var mc = new MessageChannel(), mcq = [];
  mc.port1.onmessage = function() { var f = mcq.shift(); if (f) f(); };
  function yieldUI() { return new Promise(function(r) { mcq.push(r); mc.port2.postMessage(0); }); }
  function real(ms) { return new Promise(function(r) { realST(r, ms); }); }
  function post(m, tr) { try { P.postMessage(m, '*', tr || []); } catch (e) {} }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  function prog(txt, frac) { post({ t: 'prog', txt: txt, frac: frac || 0 }); }

  async function runJob(job) {
    var macros = job.macros || [], sr = cfg.sr, frames = cfg.frames;
    var stepFrames = 128 * Math.max(1, Math.round(sr / 30 / 128));
    function adv(dt) { advance(vnow + dt); }
    function step(n) { for (var i = 0; i < n; i++) adv(1000 / 30); }
    async function pump(n) { for (var i = 0; i < n; i++) { step(1); await real(2); } }
    async function settle(ms, realMs) {
      var v = 0, t0 = realNow();
      while (v < ms || realNow() - t0 < realMs) { adv(100); v += 100; await real(2); }
    }
    async function waitFor(cond, maxMs, what) {
      var t0 = realNow();
      for (;;) {
        var ok = false; try { ok = cond(); } catch (e) {}
        if (ok) return;
        if (realNow() - t0 > maxMs) throw new Error('Timed out: ' + what);
        adv(1000 / 30); await real(5);
      }
    }
    async function pumpPromise(p, maxMs, what) {
      var done = false, err = null, val, t0 = realNow();
      p.then(function(v) { done = true; val = v; }, function(e) { done = true; err = e; });
      while (!done) { adv(1000 / 30); await real(2); if (realNow() - t0 > maxMs) throw new Error('Timed out: ' + what); }
      if (err) throw err;
      return val;
    }
    var savedOn = [];
    async function readSavedOn() {
      try {
        var z = await W.JSZip.loadAsync(job.preset), f = z.file('controller.json'); if (!f) return;
        var d = JSON.parse(await f.async('string')), comps = (d && d.controller && d.controller.comps) || [];
        var LATCH = { 'switch': 1, toggle: 1, slideswitch: 1, breaker: 1 };
        comps.forEach(function(c) { if (c && c.on && (LATCH[c.type] || (c.latch && /^(circle|squarebtn|square|artimer)$/.test(c.type)))) savedOn.push(+c.id); });
      } catch (e) { console.warn('[Export MP3] saved states', e); }
    }
    function applySavedOn() {
      var api = W._ceApi; if (!api) return;
      savedOn.forEach(function(id) {
        if (macros.some(function(m) { return +m.id === id; })) return;
        try { var st = api.snap(id); if (st && !st.on) api.setOnEmit(id, true); } catch (e) { console.warn('[Export MP3] saved state', id, e); }
      });
    }
    function applyMacros() {
      var api = W._ceApi; if (!api) return;
      macros.forEach(function(m) {
        try {
          var st = api.snap(m.id); if (!st) return;
          if (m.kind === 'latch' || m.kind === 'button') { if (st.on !== !!m.state) api.setOnEmit(m.id, !!m.state); }
          else if (m.kind === 'selector') { if (st.pos !== m.state) api.setPos(m.id, m.state); }
          else if (m.kind === 'pot') { if (Math.abs(st.pct - m.state) > 0.05) api.setPct(m.id, m.state); }
        } catch (e) { console.warn('[Export MP3] macro', m, e); }
      });
    }

    prog('STARTING RENDERER', 0);
    await waitFor(function() {
      return document.readyState !== 'loading' && typeof W._simStart === 'function' && typeof W._simStop === 'function' && typeof W.loadPreset === 'function' &&
             typeof W.ensureAudio === 'function' && W._ceApi && typeof W._fcUseForExport === 'function';
    }, 60000, 'the app did not finish starting');
    await waitFor(function() { return typeof W.JSZip !== 'undefined'; }, 30000, 'the zip library did not load (needs an internet connection, same as Save OSCP)');
    await pump(10);

    prog('LOADING PRESET', 0);
    await pumpPromise(W.loadPreset(new File([job.preset], 'export.oscp')), 60000, 'loading the preset');
    W._fpsCapMs = 0;
    await settle(1500, 500);
    W.ensureAudio();
    await settle(1500, 600);
    if (job.fxChain) W._fcUseForExport(job.fxChain);
    else if (job.fxDisabled && typeof W.disableAllEffects === 'function' && !(typeof _fxDisabled !== 'undefined' && _fxDisabled)) W.disableAllEffects();
    await readSavedOn(); applySavedOn(); applyMacros();
    await settle(800, 300);

    W._simStop(); await pump(10);
    W._simStart(); applySavedOn(); applyMacros(); await pump(2);

    var ctx = audioCtx;
    if (!ctx) throw new Error('The audio engine did not start in the renderer.');
    if (Math.round(ctx.length) !== frames) throw new Error('Renderer audio length mismatch.');
    var base = vnow, t0r = realNow(), lastYield = t0r, k = 0, steps = Math.floor((frames - 1) / stepFrames);
    var rendered = await new Promise(function(resolve, reject) {
      function next() { k++; if (k > steps) return; oSusp.call(ctx, k * stepFrames / sr).then(onSusp, reject); }
      async function onSusp() {
        try {
          var t = k * stepFrames / sr;
          advance(base + t * 1000);
          if (k % 3 === 0) applyMacros();
          var nw = realNow();
          if (nw - lastYield > 60) {
            prog('RENDER ' + fmt(t) + ' / ' + fmt(frames / sr) + '  x' + (t / Math.max(0.001, (nw - t0r) / 1000)).toFixed(1), t * sr / frames);
            await yieldUI(); lastYield = realNow();
          }
          next();
          oRes.call(ctx);
        } catch (e) { reject(e); }
      }
      next();
      oStart.call(ctx).then(resolve, reject);
    });
    var n = rendered.length, l = new Float32Array(n), r = new Float32Array(n);
    rendered.copyFromChannel(l, 0); rendered.copyFromChannel(r, rendered.numberOfChannels > 1 ? 1 : 0);
    post({ t: 'done', secs: (realNow() - t0r) / 1000, l: l, r: r }, [l.buffer, r.buffer]);
  }

  var started = false;
  W.addEventListener('message', function(e) {
    if (e.source !== P || !e.data || e.data.t !== 'job' || started) return;
    started = true;
    runJob(e.data.job).catch(function(err) { console.error('[Export MP3 renderer]', err); post({ t: 'error', msg: String((err && err.message) || err) }); });
  });
  post({ t: 'hello' });
})();
