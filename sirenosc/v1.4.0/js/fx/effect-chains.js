
(function(){
  'use strict';
  var MAX = 40, ROOTS = ['fxSection', 'blowerSection', 'distDirEffectsPanel'];
  var EN = ['btnReverbEnable','btnReverb2Enable','btnReverb3Enable','btnSlpfEnable','btnHpfEnable','btnLpfEnable','btnDistEnable','btnBlowerEnable','btnNormEnable','btnDistanceEnable','btnDirectionEnable','btnSosEnable'];
  var states = {}, sel = '', lastNonMin = null, fastOff = false;
  var DEFAULT = 'Default', MINIMAL = 'Minimal';
  function isBuiltin(n){ n = String(n == null ? '' : n).trim().toLowerCase(); return n === DEFAULT.toLowerCase() || n === MINIMAL.toLowerCase(); }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function names(){ return Object.keys(states); }

  function capture(){
    var ui = {}, en = {};
    ROOTS.forEach(function(r){
      var root = $(r); if(!root) return;
      root.querySelectorAll('input,select').forEach(function(el){
        if(!el.id || el.type === 'file' || el.type === 'button' || el.closest('#fxChainBar')) return;
        ui[el.id] = (el.type === 'checkbox') ? !!el.checked : el.value;
      });
    });
    EN.forEach(function(id){ var b = $(id); if(b) en[id] = b.classList.contains('active'); });
    return { v: 1, ui: ui, en: en, graph: (window.FXG && FXG.serialize) ? FXG.serialize() : null };
  }
  function apply(st){
    if(!st || typeof st !== 'object') return false;
    var ui = st.ui || {};
    Object.keys(ui).forEach(function(id){
      var el = $(id); if(!el || el.type === 'file' || el.closest('#fxChainBar')) return;
      var inFx = ROOTS.some(function(r){ var root = $(r); return root && root.contains(el); }); if(!inFx) return;
      var v = ui[id];
      if(el.type === 'checkbox'){ if(el.checked !== !!v){ el.checked = !!v; el.dispatchEvent(new Event('change', { bubbles: true })); } }
      else if(String(el.value) !== String(v)){ el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    try{ if(ui.dFilterEasing && typeof setEasingGroup === 'function') setEasingGroup('egFilter', 'dFilterEasing', ui.dFilterEasing); }catch(e){}
    var en = st.en || {};
    Object.keys(en).forEach(function(id){ var b = $(id); if(b && b.classList.contains('active') !== !!en[id]) b.click(); });
    if(window.FXG && FXG.load) FXG.load(st.graph || null);
    return true;
  }
  function clean(o){
    var out = {};
    if(o && typeof o === 'object') Object.keys(o).slice(0, MAX).forEach(function(k){
      var n = String(k).trim().slice(0, 24), v = o[k];
      if(n && !isBuiltin(n) && v && typeof v === 'object' && v.ui && typeof v.ui === 'object') out[n] = v;
    });
    return out;
  }
  function refresh(){
    var s = $('fcSelect'); if(!s) return;
    s.innerHTML = '<option value=""></option><option value="' + DEFAULT + '">' + DEFAULT + ' (built in)</option><option value="' + MINIMAL + '">' + MINIMAL + ' (built in)</option>' + names().map(function(n){ return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
    s.value = (states[sel] || isBuiltin(sel)) ? sel : ''; if(s.value !== sel) sel = s.value;
    var bd = $('fcDelete'); if(bd) bd.disabled = !sel || isBuiltin(sel);
  }
  window._fcGather = function(){ return JSON.parse(JSON.stringify(states)); };
  Object.defineProperty(window, '_fcSel', { get: function(){ return sel; }, configurable: true });
  window._fcUseForExport = function(n){
    if(n === MINIMAL){ remember(); applyBuiltin(MINIMAL); return; }
    sel = n; refresh();
    if(n === DEFAULT) applyBuiltin(DEFAULT); else if(n && states[n]) apply(states[n]);
  };
  window._fcLoad = function(o, s){ states = clean(o); sel = (typeof s === 'string' && (states[s] || isBuiltin(s))) ? s : ''; refresh(); };

  function setLink(want){ var b = $('btnLpfEnable'); if(b && b.classList.contains('active') !== !!want) b.click(); }
  function applyBuiltin(name){
    if(!(window.FXG && FXG.serialize)) return;
    var g = FXG.serialize();
    if(name === MINIMAL){
      g.edges = [['in', 'filter'], ['filter', 'out', 'lpf']];
      g.filterBypass = false; g.dyn = {}; g.blower = 0; g.removed = []; setLink(true);
    } else {
      window.FXGM.edges = null; g.edges = fxgEdges().map(function(e){ return e.slice(); }); g.blower = 1; g.removed = [];
    }
    FXG.load(g); sel = name; refresh();
  }
  function remember(){
    if(sel === MINIMAL || !(window.FXG && FXG.serialize)) return;
    lastNonMin = { graph: FXG.serialize(), link: (typeof lpfEnabled !== 'undefined') ? !!lpfEnabled : true, name: sel };
  }
  function restoreLast(){
    var s = lastNonMin;
    if(!s || !s.graph){ applyBuiltin(DEFAULT); return; }
    setLink(s.link); FXG.load(s.graph); sel = (s.name && (states[s.name] || isBuiltin(s.name))) ? s.name : ''; refresh();
  }
  var _dis = window.disableAllEffects, _res = window.restoreAllEffects;
  if(typeof _dis === 'function') window.disableAllEffects = function(){
    if(typeof _fxDisabled !== 'undefined' && !_fxDisabled) remember();
    var r = _dis.apply(this, arguments); applyBuiltin(MINIMAL); return r;
  };
  if(typeof _res === 'function') window.restoreAllEffects = function(){
    var r = _res.apply(this, arguments);
    if(typeof _fxDisabled !== 'undefined' && !_fxDisabled) restoreLast();
    return r;
  };
  window._fcPresetGraph = function(g){
    if(typeof _fxDisabled !== 'undefined' && _fxDisabled){
      lastNonMin = { graph: (g && g.v === 2) ? g : null, link: undefined, name: '' };
      setTimeout(function(){ if(typeof _fxDisabled !== 'undefined' && _fxDisabled){ if(lastNonMin) lastNonMin.link = (typeof lpfEnabled !== 'undefined') ? !!lpfEnabled : true; applyBuiltin(MINIMAL); } }, 0);
    } else if(window.FXG) FXG.load(g || null);
  };
  function watchFast(){
    var badge = $('menuFastBadge'); if(!badge || !window.MutationObserver) return;
    function onFast(){
      var on = badge.textContent.trim() === 'ON';
      if(on && typeof _fxDisabled !== 'undefined' && !_fxDisabled){ fastOff = true; window.disableAllEffects(); }
      else if(!on && fastOff){ fastOff = false; if(typeof _fxDisabled !== 'undefined' && _fxDisabled) window.restoreAllEffects(); }
    }
    new MutationObserver(onFast).observe(badge, { childList: true, characterData: true, subtree: true });
    onFast();
  }

  function download(name, text){
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); if(a.parentNode) a.parentNode.removeChild(a); }, 500);
  }
  function uniq(n){
    n = String(n).trim().slice(0, 24) || 'Chain'; if(!states[n] && !isBuiltin(n)) return n;
    for(var i = 2; i < 100; i++){ var c = n.slice(0, 20) + ' ' + i; if(!states[c] && !isBuiltin(c)) return c; }
    return n;
  }

  function init(){
    var s = $('fcSelect'), bs = $('fcSave'), bd = $('fcDelete'), bi = $('fcImport'), be = $('fcExport'), fi = $('fcImportInput');
    if(!s || !bs || !bd || !bi || !be || !fi) return;
    s.addEventListener('change', function(){
      var n = s.value;
      if(n === MINIMAL){ remember(); applyBuiltin(MINIMAL); return; }
      sel = n; refresh();
      if(n === DEFAULT) applyBuiltin(DEFAULT); else if(n) apply(states[n]);
    });
    bs.addEventListener('click', async function(){
      var nm = await _dsDialog({ title: 'Save effect chain', msg: 'Name for this effect chain:', input: true, def: (sel && !isBuiltin(sel)) ? sel : ('Chain ' + (names().length + 1)), ok: 'SAVE' });
      if(nm === null) return; nm = String(nm).trim().slice(0, 24); if(!nm) return;
      if(isBuiltin(nm)){ await _dsDialog({ title: 'Reserved name', msg: '"' + nm + '" is a built-in chain. Pick another name.', noCancel: true }); return; }
      if(states[nm]){ var yes = await _dsDialog({ title: 'Overwrite?', msg: 'Effect chain "' + nm + '" already exists. Replace it?', ok: 'OVERWRITE' }); if(!yes) return; }
      else if(names().length >= MAX){ await _dsDialog({ title: 'Limit reached', msg: 'Maximum ' + MAX + ' effect chains.' }); return; }
      try{ states[nm] = capture(); }catch(e){ console.error(e); await _dsDialog({ title: 'Could not save', msg: String(e && e.message || e) }); return; }
      sel = nm; refresh();
    });
    bd.addEventListener('click', async function(){
      if(!sel || isBuiltin(sel) || !states[sel]) return;
      var yes = await _dsDialog({ title: 'Delete effect chain', msg: 'Delete "' + sel + '"?', ok: 'DELETE' }); if(!yes) return;
      delete states[sel]; sel = ''; refresh();
    });
    be.addEventListener('click', async function(){
      var out = {}, base;
      if(sel && states[sel]){ out[sel] = states[sel]; base = sel; }
      else if(names().length){ out = states; base = 'effect_chains'; }
      else { out['Current'] = capture(); base = 'effect_chain'; }
      download(base.replace(/[^\w\- ]+/g, '_') + '.oscfx', JSON.stringify({ format: 'oscfx', v: 1, chains: out }, null, 2));
    });
    bi.addEventListener('click', function(){ fi.click(); });
    fi.addEventListener('change', async function(){
      var f = fi.files && fi.files[0]; fi.value = ''; if(!f) return;
      try{
        var data = JSON.parse(await f.text());
        var src = (data && data.format === 'oscfx' && data.chains) ? data.chains : (data && data.ui ? (function(){ var o = {}; o[f.name.replace(/\.oscfx$/i, '')] = data; return o; })() : null);
        var inc = clean(src); var keys = Object.keys(inc);
        if(!keys.length) throw new Error('No effect chains found in this file.');
        var first = null;
        for(var i = 0; i < keys.length; i++){
          if(names().length >= MAX){ await _dsDialog({ title: 'Limit reached', msg: 'Maximum ' + MAX + ' effect chains; the rest were skipped.', noCancel: true }); break; }
          var n = uniq(keys[i]); states[n] = inc[keys[i]]; if(!first) first = n;
        }
        if(first){ sel = first; refresh(); apply(states[first]); }
      }catch(e){ console.error(e); alert('Failed to import .oscfx file: ' + (e && e.message || e)); }
    });
    refresh(); watchFast();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
