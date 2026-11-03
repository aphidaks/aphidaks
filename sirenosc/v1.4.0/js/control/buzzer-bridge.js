
(function(){
  const live = {}; let seq = 0, raf = 0;
  const $ = function(id){ return document.getElementById(id); };
  const WAVES = {sine:1, triangle:1, sawtooth:1, square:1, noise:1};
  const clampHz = function(v){ v = +v; return isFinite(v) ? Math.max(0.01, Math.min(20000, v)) : 440; };
  function cfg(h){
    let d = null; try{ d = h.get(); }catch(e){} d = d || {};
    const v = +d.vol;
    return { wave: WAVES[d.wave] ? d.wave : 'square', vol: isFinite(v) ? Math.max(0, Math.min(100, v))/100 : 0.5,
             link: !!d.blowerLink, pos: d.pos === 'dot' ? 'dot' : 'follow', db10: isFinite(+d.db10) ? +d.db10 : (isFinite(+d.db) ? +d.db + 20 : 126), off: d.off, steep: d.steep };
  }
  function dispose(h){ if(h.cd){ ['lpf','gain'].forEach(function(k){ try{ h.cd[k].disconnect(); }catch(e){} }); h.cd = null; } }
  function mkSrc(h, c){
    const ac = h.ctx;
    if(h.osc){ try{ h.osc.stop(); }catch(e){} try{ h.osc.disconnect(); }catch(e){} h.osc = null; }
    if(h.noise){ try{ h.noise.stop(); }catch(e){} try{ h.noise.disconnect(); }catch(e){} h.noise = null; }
    if(c.wave === 'noise'){ const n = makeNoiseSource(ac); n.connect(h.gain); n.start(); h.noise = n; }
    else {
      if(h.curF === undefined) h.curF = c.link ? 0.01 : h.hz;
      const o = ac.createOscillator(); o.type = c.wave; o.frequency.value = Math.max(0.01, h.curF);
      o.connect(h.gain); o.start(); h.osc = o;
    }
  }
  function route(h, c){
    if(!h.gain) return;
    const mode = (c.pos === 'dot' && typeof window._ctrlDotCalc === 'function') ? 'dot' : 'follow';
    const want = (mode === 'dot') ? (masterGain || audioCtx.destination) : (window._constPosIn || fxChainOut || audioCtx.destination);
    const rt = h.rt; if(rt && rt.mode === mode && rt.dest === want) return;
    try{ h.gain.disconnect(); }catch(e){}
    dispose(h);
    if(mode === 'dot'){
      const l = h.ctx.createBiquadFilter(); l.type = 'lowpass'; l.Q.value = 0.7071;
      const g = h.ctx.createGain(), v = window._ctrlDotCalc(c.off, c.steep, c.db10);
      l.frequency.value = Math.min(v.hz, h.ctx.sampleRate/2 - 1); g.gain.value = v.gain;
      h.gain.connect(l); l.connect(g); g.connect(want); h.cd = {lpf:l, gain:g, key:''};
    } else { h.gain.connect(want); }
    h.rt = {mode:mode, dest:want};
  }
  function applyDot(h, c){
    if(!h.cd) return;
    const v = window._ctrlDotCalc(c.off, c.steep, c.db10), key = v.hz.toFixed(1) + '|' + v.gain.toFixed(4);
    if(h.cd.key === key) return; h.cd.key = key;
    const t = h.ctx.currentTime;
    h.cd.lpf.frequency.setTargetAtTime(Math.min(v.hz, h.ctx.sampleRate/2 - 1), t, 0.01);
    h.cd.gain.gain.setTargetAtTime(v.gain, t, 0.03);
  }
  function blowerFreq(h){
    const now = performance.now();
    const sb = (typeof window._ceBlowerState === 'function') ? window._ceBlowerState() : null;
    const on  = sb ? !!sb.on : true;
    const off = !on;
    if(on && h.ws !== 'winding-up' && h.ws !== 'up'){
      const w = $('nBlowerConstWindUpOffset'), f = $('dBlowerConstWindUpFn');
      h.ws = 'winding-up'; h.wStart = now; h.wDur = (w ? parseFloat(w.value) || 5 : 5) * getOffsetMultiplier() * 1000;
      h.wFrom = 0; h.wTo = h.hz; h.wFn = f ? f.value : 'sine';
    } else if(off && (h.ws === 'up' || h.ws === 'winding-up')){
      const w = $('nBlowerConstWindDownOffset'), f = $('dBlowerConstWindDownFn');
      h.ws = 'winding-down'; h.wStart = now; h.wDur = (w ? parseFloat(w.value) || 5 : 5) * getOffsetMultiplier() * 1000;
      h.wFrom = h.curF || h.hz; h.wTo = 0; h.wFn = f ? f.value : 'exponential';
    }
    if(h.ws === 'winding-up' || h.ws === 'winding-down'){
      const t = Math.min(1, (now - h.wStart) / h.wDur), up = (h.ws === 'winding-up');
      const hz = h.wFrom + (h.wTo - h.wFrom) * applyFn(h.wFn, t, 'easeout');
      if(t >= 1) h.ws = up ? 'up' : 'idle';
      return (t >= 1 && !up) ? 0.01 : Math.max(0.01, hz);
    }
    return h.ws === 'up' ? h.hz : 0.01;
  }
  function lost(h){
    h.dead = true; delete live[h.id];
    try{ if(h.osc) h.osc.stop(); if(h.noise) h.noise.stop(); }catch(e){}
    try{ h.gain.disconnect(); }catch(e){}
    dispose(h);
    if(h.onLost){ try{ h.onLost(); }catch(e){} }
  }
  function step(h){
    if(h.dead) return;
    if(!audioCtx || h.ctx !== audioCtx){ lost(h); return; }
    const c = cfg(h), t = h.ctx.currentTime;
    if(c.wave !== h.wave){ h.wave = c.wave; mkSrc(h, c); }
    if(Math.abs(c.vol - h.vol) > 1e-6){ h.vol = c.vol; h.gain.gain.setTargetAtTime(c.vol, t, 0.03); }
    if(h.osc){
      let f;
      if(c.link) f = blowerFreq(h); else { h.ws = 'idle'; f = h.hz; }
      if(Math.abs(f - h.curF) > 1e-6){ h.osc.frequency.setValueAtTime(Math.max(0.01, f), t); h.curF = f; }
    }
    route(h, c);
    applyDot(h, c);
  }
  function tick(){
    raf = 0; const ids = Object.keys(live); if(!ids.length) return;
    ids.forEach(function(id){ const h = live[id]; if(h){ try{ step(h); }catch(e){} } });
    raf = requestAnimationFrame(tick);
  }
  window._buzzBridge = {
    start: function(get, hz, onLost){
      try{ ensureAudio(); }catch(e){ return null; }
      const ac = audioCtx; if(!ac) return null;
      const h = {id:++seq, get:get, ctx:ac, hz:clampHz(hz), onLost:onLost, osc:null, noise:null, gain:null, wave:null, vol:0, curF:undefined, ws:'idle', rt:null, cd:null, dead:false};
      const c = cfg(h);
      h.gain = ac.createGain(); h.gain.gain.value = 0; h.gain.gain.setTargetAtTime(c.vol, ac.currentTime, 0.005); h.vol = c.vol;
      h.wave = c.wave; mkSrc(h, c); route(h, c);
      live[h.id] = h; if(!raf) raf = requestAnimationFrame(tick);
      return h;
    },
    setFreq: function(h, hz){
      if(!h || h.dead) return;
      h.hz = clampHz(hz);
      if(h.osc && !cfg(h).link){ h.osc.frequency.setValueAtTime(h.hz, h.ctx.currentTime); h.curF = h.hz; }
    },
    stop: function(h){
      if(!h || h.dead) return;
      h.dead = true; delete live[h.id];
      const now = h.ctx.currentTime;
      try{ h.gain.gain.cancelScheduledValues(now); h.gain.gain.setTargetAtTime(0, now, 0.01); }catch(e){}
      try{ if(h.osc) h.osc.stop(now + 0.08); if(h.noise) h.noise.stop(now + 0.08); }catch(e){}
      setTimeout(function(){ try{ h.gain.disconnect(); }catch(e){} dispose(h); }, 250);
    }
  };
})();
