
(function(){
  'use strict';
  var host = document.getElementById('fxg'), inner = document.getElementById('fxgInner'), svg = document.getElementById('fxgWires');
  var statusEl = document.getElementById('fxgStatus');
  if(!host || !inner || !svg || typeof fxgEdges !== 'function') return;

  var NS = 'http://www.w3.org/2000/svg', CARD_W = 300, GX = 70, GY = 36, PAD = 24, KEY = 'sirenosc_fxg_v2';
  var ORDER = ['in','filter','rev1','blower','rev2','dist','sos','direction','distance','rev3','norm','out'];
  var cards = {}, ids = [], pos = {}, zTop = 10, laidOut = false, tmp = null, drag = null;
  Array.prototype.forEach.call(inner.querySelectorAll('.fxn'), function(el){ cards[el.dataset.fxn] = el; ids.push(el.dataset.fxn); });

  var blowerSec = document.getElementById('blowerSection'), blowerTpl = cards.blower || null;
  function hasBlower(){ return !!cards.blower; }
  function syncBlowerUI(){
    var on = hasBlower();
    window.FXGM.hasBlower = on;
    if(blowerSec) blowerSec.classList.toggle('fxb-off', !on);
    var sa = document.getElementById('fxAddType'), o = sa && sa.querySelector('option[value="blower"]');
    if(sa){
      if(on && o){ var was = sa.value === 'blower'; o.parentNode.removeChild(o); if(was) sa.selectedIndex = 0; }
      else if(!on && !o){ o = document.createElement('option'); o.value = 'blower'; o.textContent = 'Blower';
        var first = sa.querySelector('option[value^="static:"]'); sa.insertBefore(o, first || null); }
    }
  }
  function bridgeOut(edges, id){
    var ins = edges.filter(function(e){ return e[1] === id; }), outs = edges.filter(function(e){ return e[0] === id; });
    var rest = edges.filter(function(e){ return e[0] !== id && e[1] !== id; });
    ins.forEach(function(i){ outs.forEach(function(o){
      if(i[0] === o[1]) return;
      var n = [i[0], o[1], i[2] == null ? '' : i[2], o[3] == null ? '' : o[3]]; while(n.length > 2 && (n[n.length - 1] === '' || n[n.length - 1] == null)) n.pop();
      if(!rest.some(function(r){ return r.length === n.length && r.every(function(x, k){ return x === n[k]; }); })) rest.push(n);
    }); });
    return rest;
  }
  function attachBlower(){
    if(cards.blower || !blowerTpl) return false;
    inner.appendChild(blowerTpl); cards.blower = blowerTpl; ids.push('blower');
    if(ro) ro.observe(blowerTpl);
    syncBlowerUI(); return true;
  }
  function detachBlower(noBridge){
    var el = cards.blower; if(!el) return false;
    if(el.parentNode) el.parentNode.removeChild(el);
    if(ro){ try{ ro.unobserve(el); }catch(e){} }
    delete cards.blower; delete pos.blower;
    var k = ids.indexOf('blower'); if(k >= 0) ids.splice(k, 1);
    if(!noBridge) window.FXGM.edges = bridgeOut(E(), 'blower');
    syncBlowerUI();
    var b = document.getElementById('btnBlowerEnable');
    if(b && b.classList.contains('active')) b.click();
    return true;
  }
  function freeSpot(id){
    var el = cards[id], w = CARD_W, h = el.offsetHeight, k = view.z || 1;
    var x0 = -view.x / k + PAD, y0 = -view.y / k + PAD, x1 = x0 + host.clientWidth / k - PAD * 2, y1 = y0 + host.clientHeight / k - PAD * 2;
    function hit(x, y){ return ids.some(function(o){ var p = pos[o], c = cards[o]; if(o === id || !p || !c) return false;
      return x < p.x + c.offsetWidth + 12 && x + w + 12 > p.x && y < p.y + c.offsetHeight + 12 && y + h + 12 > p.y; }); }
    for(var y = y0; y + h <= y1; y += 30) for(var x = x0; x + w <= x1; x += 30) if(!hit(x, y)) return { x: x, y: y };
    return null;
  }
  function addBlowerCard(){
    if(hasBlower()) return;
    attachBlower();
    var s = freeSpot('blower'); if(s){ pos.blower = s; applyPos('blower'); } else placeBelow('blower');
    zTop++; cards.blower.style.zIndex = zTop;
    syncPills(); commit();
  }
  function removeBlowerCard(){ if(!hasBlower()) return; detachBlower(); syncPills(); commit(); }
  function homeBlowerSec(){
    var fxs = document.getElementById('fxSection'); if(!blowerSec || !fxs || !fxs.parentNode) return;
    var placed = false;
    try{ var L = JSON.parse(localStorage.getItem('edLayoutV1') || 'null'); placed = !!(L && Array.isArray(L.order) && L.order.some(function(l){ return Array.isArray(l) && l.indexOf('blowerSection') >= 0; })); }catch(e){}
    if(!placed && blowerSec.previousElementSibling !== fxs) fxs.parentNode.insertBefore(blowerSec, fxs.nextSibling);
  }

  var STATIC = ['filter','rev1','rev2','dist','distance','direction','sos','rev3','norm'];
  var SLABEL = { filter:'Filter', rev1:'Reverb 1', rev2:'Reverb 2', dist:'Distortion', distance:'Distance', direction:'Direction', sos:'Speed of Sound', rev3:'Reverb 3', norm:'Normalizer' };
  var staticEl = {}; STATIC.forEach(function(id){ if(cards[id]) staticEl[id] = cards[id]; });
  function syncStaticUI(){
    var sa = document.getElementById('fxAddType'); if(!sa) return;
    var keep = sa.value;
    Array.prototype.slice.call(sa.querySelectorAll('option[value^="static:"]')).forEach(function(o){ o.parentNode.removeChild(o); });
    STATIC.forEach(function(id){
      if(cards[id]) return;
      var o = document.createElement('option'); o.value = 'static:' + id; o.textContent = SLABEL[id]; sa.appendChild(o);
    });
    sa.value = keep; if(sa.value !== keep) sa.selectedIndex = 0;
  }
  function detachStatic(id, noBridge){
    var el = cards[id]; if(!el || STATIC.indexOf(id) < 0) return false;
    el.classList.add('fxn-removed');
    if(ro){ try{ ro.unobserve(el); }catch(e){} }
    delete cards[id]; delete pos[id];
    var k = ids.indexOf(id); if(k >= 0) ids.splice(k, 1);
    if(!noBridge) window.FXGM.edges = bridgeOut(E(), id);
    var pill = el.querySelector('.fxn-byp'), lid = pill && pill.dataset.led;
    if(!noBridge && lid && lid !== 'fxFilter'){ var b = document.getElementById(lid); if(b && b.classList.contains('active')) b.click(); }
    syncStaticUI(); return true;
  }
  function attachStatic(id){
    var el = staticEl[id]; if(!el || cards[id]) return false;
    el.classList.remove('fxn-removed');
    cards[id] = el; ids.push(id);
    if(ro) ro.observe(el);
    syncStaticUI(); return true;
  }
  function removeStaticCard(id){ if(!detachStatic(id)) return; syncPills(); commit(); }
  function addStaticCard(id){
    if(!attachStatic(id)) return;
    var sp = freeSpot(id); if(sp){ pos[id] = sp; applyPos(id); } else placeBelow(id);
    zTop++; cards[id].style.zIndex = zTop;
    syncPills(); commit();
  }

  function E(){ return fxgEdges(); }
  function mk(tag, attrs){ var n = document.createElementNS(NS, tag); for(var k in attrs) n.setAttribute(k, attrs[k]); return n; }
  function zk(){ var r = inner.getBoundingClientRect(); return (inner.offsetWidth && r.width) ? r.width / inner.offsetWidth : 1; }
  function toInner(cx, cy){ var r = inner.getBoundingClientRect(), k = zk(); return { x: (cx - r.left) / k, y: (cy - r.top) / k }; }
  function sockPt(el){ var r = el.getBoundingClientRect(); return toInner(r.left + r.width/2, r.top + r.height/2); }
  function outSock(id, port){
    var c = cards[id]; if(!c) return null;
    var l = c.querySelectorAll('.fxn-out'); if(!l.length) return null;
    var pick = null;
    Array.prototype.forEach.call(l, function(s){ if(port && s.dataset.port === port) pick = s; });
    if(!pick) Array.prototype.forEach.call(l, function(s){ if(!pick && (!s.dataset.port || s.dataset.port === 'lpf')) pick = s; });
    return pick || l[0];
  }
  function inSock(id, port){
    var c = cards[id]; if(!c) return null;
    var l = c.querySelectorAll('.fxn-in'), pick = null;
    Array.prototype.forEach.call(l, function(s){ if(port && s.dataset.port === port) pick = s; });
    return pick || l[0] || null;
  }
  function wireD(p, q){ var d = Math.max(40, Math.abs(q.x - p.x) * 0.5); return 'M'+p.x+' '+p.y+' C'+(p.x+d)+' '+p.y+' '+(q.x-d)+' '+q.y+' '+q.x+' '+q.y; }
  function rowBottom(id){
    var p = pos[id], c = cards[id]; if(!p || !c) return null;
    var b = p.y + c.offsetHeight;
    ids.forEach(function(o){ if(pos[o] && cards[o] && Math.abs(pos[o].y - p.y) < 30) b = Math.max(b, pos[o].y + cards[o].offsetHeight); });
    return b;
  }
  function roundPoly(pts, r){
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for(var i = 1; i < pts.length - 1; i++){
      var a = pts[i-1], c = pts[i], n = pts[i+1];
      var l1 = Math.hypot(c.x - a.x, c.y - a.y), l2 = Math.hypot(n.x - c.x, n.y - c.y), rr = Math.min(r, l1 / 2, l2 / 2);
      var p1 = { x: c.x - (c.x - a.x) / l1 * rr, y: c.y - (c.y - a.y) / l1 * rr }, p2 = { x: c.x + (n.x - c.x) / l2 * rr, y: c.y + (n.y - c.y) / l2 * rr };
      d += ' L' + p1.x + ' ' + p1.y + ' Q' + c.x + ' ' + c.y + ' ' + p2.x + ' ' + p2.y;
    }
    var z = pts[pts.length - 1]; return d + ' L' + z.x + ' ' + z.y;
  }
  function routeD(e, p, q){
    if(q.x >= p.x + 24) return wireD(p, q);
    var yb = rowBottom(e[0]); if(yb == null) return wireD(p, q);
    var yg = yb + GY / 2;
    if(!(q.y > yg + 8)) return wireD(p, q);
    var xr = p.x + 16, xl = q.x - 14;
    return roundPoly([p, { x: xr, y: p.y }, { x: xr, y: yg }, { x: xl, y: yg }, { x: xl, y: q.y }, q], 10);
  }

  function rebuildAudio(){ try{ if(typeof audioCtx !== 'undefined' && audioCtx && typeof rebuildFxChain === 'function') rebuildFxChain(); }catch(e){ console.error(e); } }

  function draw(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    E().forEach(function(e){
      var a = outSock(e[0], e[2]), b = inSock(e[1], e[3]); if(!a || !b) return;
      var d = routeD(e, sockPt(a), sockPt(b));
      var w = mk('path', { 'class': 'w', d: d }), h = mk('path', { 'class': 'hit', d: d });
      h.addEventListener('mouseenter', function(){ w.classList.add('hov'); });
      h.addEventListener('mouseleave', function(){ w.classList.remove('hov'); });
      var kill = function(ev){ ev.preventDefault(); var arr = E(), k = arr.indexOf(e); if(k >= 0){ arr.splice(k, 1); commit(); } };
      h.addEventListener('dblclick', kill); h.addEventListener('contextmenu', kill);
      svg.appendChild(w); svg.appendChild(h);
    });
    if(tmp) svg.appendChild(tmp);
  }
  function refresh(){
    var arr = E(), ok = fxgReaches(arr, 'in', 'out');
    ids.forEach(function(id){
      if(id === 'in' || id === 'out' || id === 'add') return;
      cards[id].classList.toggle('idle', !(fxgReaches(arr, 'in', id) && fxgReaches(arr, id, 'out')));
    });
    if(statusEl) statusEl.textContent = '';
  }
  function sizeInner(){}
  function applyPos(id){ var p = pos[id], c = cards[id]; if(!p || !c) return; c.style.left = p.x + 'px'; c.style.top = p.y + 'px'; }
  function redraw(){ sizeInner(); draw(); }

  var view = { x: 0, y: 0, z: 1 };
  function pz(){ var r = host.getBoundingClientRect(); return (host.offsetWidth && r.width) ? r.width / host.offsetWidth : 1; }
  function applyView(){
    inner.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
    host.style.backgroundSize = (20 * view.z) + 'px ' + (20 * view.z) + 'px';
    host.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    var t = Math.round(view.z * 100) + '%';
    Array.prototype.forEach.call(document.querySelectorAll('[data-fxg-zoom-label]'), function(el){ el.textContent = t; });
  }
  function setZoom(z, cx, cy){
    var r = host.getBoundingClientRect(), k = pz();
    if(cx == null){ cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    var lx = (cx - r.left) / k, ly = (cy - r.top) / k, nz = Math.max(0.1, Math.min(4, z));
    var wx = (lx - view.x) / view.z, wy = (ly - view.y) / view.z;
    view.z = nz; view.x = lx - wx * nz; view.y = ly - wy * nz; applyView();
  }
  function resetView(){ view.x = 0; view.y = 0; view.z = 1; applyView(); }
  function fitView(){
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, W = host.clientWidth, H = host.clientHeight;
    ids.forEach(function(id){ var p = pos[id], c = cards[id]; if(!p || !c) return; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + c.offsetWidth); y1 = Math.max(y1, p.y + c.offsetHeight); });
    if(x0 > x1 || !W || !H) return resetView();
    var bw = (x1 - x0) + 2 * PAD, bh = (y1 - y0) + 2 * PAD, z = Math.max(0.1, Math.min(1, W / bw, H / bh));
    view.z = z; view.x = (W - (x1 - x0) * z) / 2 - x0 * z; view.y = (H - (y1 - y0) * z) / 2 - y0 * z; applyView();
  }
  var pan = null, pts = {}, pinch = null;
  host.addEventListener('pointerdown', function(e){
    if(e.pointerType !== 'mouse') pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(pts);
    if(keys.length === 2){ pan = null; host.classList.remove('panning'); var a = pts[keys[0]], b = pts[keys[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z }; return; }
    var onCard = e.target.closest && e.target.closest('.fxn, .fxn-sock, path.hit');
    if(e.button === 1 || (e.button === 0 && !onCard)){
      if(e.button === 1) e.preventDefault();
      pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, k: pz() };
      host.classList.add('panning'); try{ host.setPointerCapture(e.pointerId); }catch(_){}
    }
  });
  host.addEventListener('mousedown', function(e){ if(e.button === 1) e.preventDefault(); });
  host.addEventListener('pointermove', function(e){
    if(pts[e.pointerId]) pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if(pinch){
      var k2 = Object.keys(pts); if(k2.length < 2) return;
      var a = pts[k2[0]], b = pts[k2[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setZoom(pinch.z * d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); return;
    }
    if(pan){ view.x = pan.vx + (e.clientX - pan.x) / pan.k; view.y = pan.vy + (e.clientY - pan.y) / pan.k; applyView(); }
  });
  function endPtr(e){
    delete pts[e.pointerId]; if(Object.keys(pts).length < 2) pinch = null;
    if(pan){ pan = null; host.classList.remove('panning'); }
  }
  host.addEventListener('pointerup', endPtr); host.addEventListener('pointercancel', endPtr);
  host.addEventListener('wheel', function(e){
    if(!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); var d = Math.max(-30, Math.min(30, e.deltaY));
    setZoom(view.z * Math.exp(-d * 0.01), e.clientX, e.clientY);
  }, { passive: false });
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-fxg-zoom]'); if(!b) return;
    var a = b.getAttribute('data-fxg-zoom');
    if(a === 'in') setZoom(view.z * 1.25); else if(a === 'out') setZoom(view.z / 1.25); else fitView();
  });
  applyView();

  function depthOrder(){
    var arr = E(), memo = {}, busy = {};
    function dep(id){
      if(memo[id] !== undefined) return memo[id];
      if(busy[id]) return 0; busy[id] = 1;
      var d = 0; arr.forEach(function(e){ if(e[1] === id && cards[e[0]]) d = Math.max(d, dep(e[0]) + 1); });
      busy[id] = 0; return (memo[id] = d);
    }
    var rank = function(id){ var i = ORDER.indexOf(id); return i < 0 ? 99 : i; };
    return ids.slice().sort(function(a, b){ return ((a === 'add') - (b === 'add')) || dep(a) - dep(b) || rank(a) - rank(b); });
  }
  function autoLayout(){
    var order = depthOrder(), W = host.clientWidth || 1200;
    var cols = Math.max(1, Math.floor((W - PAD*2 + GX) / (CARD_W + GX)));
    var y = PAD, i = 0;
    while(i < order.length){
      var rowH = 0;
      for(var c = 0; c < cols && i < order.length; c++, i++){
        var id = order[i]; pos[id] = { x: PAD + c * (CARD_W + GX), y: y };
        rowH = Math.max(rowH, cards[id].offsetHeight);
      }
      y += rowH + GY;
    }
    ids.forEach(applyPos); laidOut = host.clientWidth > 0; resetView(); redraw(); save();
  }

  function filterBypassed(){ return !!window.FXGM.filterBypass; }
  function syncPills(){
    Array.prototype.forEach.call(inner.querySelectorAll('.fxn-byp'), function(p){
      var on;
      if(p.dataset.dyn) on = !!(dynState()[p.dataset.dyn] && dynState()[p.dataset.dyn].bypass);
      else if(p.dataset.led === 'fxFilter') on = filterBypassed();
      else { var b = document.getElementById(p.dataset.led); on = !(b && b.classList.contains('active')); }
      p.classList.toggle('on', on); p.closest('.fxn').classList.toggle('bypassed', on);
    });
    var lb = document.getElementById('btnLpfEnable'), link = lb && lb.classList.contains('active');
    var lk = document.getElementById('fxRpmLink'); if(lk) lk.classList.toggle('on', !!link);
    var sw = document.getElementById('slpfWrap'), rw = document.getElementById('rpmLpfWrap');
    if(sw) sw.style.display = link ? 'none' : ''; if(rw) rw.style.display = link ? '' : 'none';
    redraw();
  }
  Array.prototype.forEach.call(inner.querySelectorAll('.fxn-byp'), function(p){
    p.addEventListener('click', function(ev){
      ev.stopPropagation();
      if(p.dataset.led === 'fxFilter'){
        window.FXGM.filterBypass = !window.FXGM.filterBypass;
        syncPills(); save(); rebuildAudio();
      } else { var b = document.getElementById(p.dataset.led); if(b) b.click(); }
    });
  });
  var lk = document.getElementById('fxRpmLink');
  if(lk) lk.addEventListener('click', function(){ var b = document.getElementById('btnLpfEnable'); if(b) b.click(); });
  var mo = new MutationObserver(syncPills);
  ['btnSlpfEnable','btnHpfEnable','btnLpfEnable'].concat(Array.prototype.map.call(inner.querySelectorAll('.fxn-byp'), function(p){ return p.dataset.led; })).forEach(function(id){
    var b = document.getElementById(id); if(b) mo.observe(b, { attributes: true, attributeFilter: ['class'] });
  });

  function setup(id){
    var card = cards[id], head = card.querySelector('.fxn-head');
    card.style.position = 'absolute';
    if(id !== 'in' && id !== 'out' && card.querySelector('.fxn-in') && !card.querySelector('.fxn-out[data-port="byp"]')){
      var brow = document.createElement('div'); brow.className = 'fxn-io'; brow.style.paddingTop = '0';
      brow.innerHTML = '<span class="fxn-gap"></span><span class="fxn-lbl">Bypass</span><span class="fxn-sock fxn-out" data-sock="out" data-port="byp" title="Bypass - this card\'s input, unprocessed. Drag to an input dot"></span>';
      var bbody = card.querySelector('.fxn-body');
      if(bbody) card.insertBefore(brow, bbody); else card.appendChild(brow);
    }
    card.addEventListener('pointerdown', function(){ zTop++; card.style.zIndex = zTop; ids.forEach(function(o){ cards[o].classList.toggle('sel', o === id); }); }, true);
    var chev = card.querySelector('.fxn-chev');
    var _fb = card.querySelector('.fxn-body');
    if(chev && _fb && !_fb.children.length && !_fb.textContent.trim()){ card.classList.add('nobody'); card.classList.remove('collapsed'); chev.remove(); chev = null; }
    if(chev) chev.addEventListener('click', function(ev){ ev.stopPropagation(); card.classList.toggle('collapsed'); redraw(); save(); });
    head.addEventListener('pointerdown', function(ev){
      if(ev.button > 0 || ev.target.closest('.fxn-chev, .fxn-byp, .fxn-link, .fxn-del')) return;
      var p = pos[id] || { x: 0, y: 0 }, sx = ev.clientX, sy = ev.clientY, ox = p.x, oy = p.y, zf = zk();
      head.setPointerCapture(ev.pointerId); card.classList.add('dragging');
      var mv = function(e){ pos[id] = { x: ox + (e.clientX - sx) / zf, y: oy + (e.clientY - sy) / zf }; applyPos(id); redraw(); };
      var up = function(){ head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); card.classList.remove('dragging'); save(); };
      head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
    });
  }
  ids.slice().forEach(setup);
  STATIC.forEach(function(id){ var el = staticEl[id], d = el && el.querySelector('.fxn-del'); if(d) d.addEventListener('click', function(ev){ ev.stopPropagation(); removeStaticCard(id); }); });
  (function(){ var d = blowerTpl && blowerTpl.querySelector('.fxn-del'); if(d) d.addEventListener('click', function(ev){ ev.stopPropagation(); removeBlowerCard(); }); })();
  Array.prototype.forEach.call(inner.querySelectorAll('.fxn-jump'), function(b){
    b.addEventListener('click', function(){ var t = document.getElementById(b.getAttribute('data-jump') || 'distDirEffectsPanel'); if(t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });

  function mkEdge(from, to, sp, dp){ var e = [from, to]; if(dp){ e.push(sp || '', dp); } else if(sp){ e.push(sp); } return e; }
  function canLink(from, to, port, dport){
    if(from === to || from === 'out' || to === 'in') return false;
    var arr = E();
    for(var i = 0; i < arr.length; i++) if(arr[i][0] === from && arr[i][1] === to && (arr[i][2] || null) === (port || null) && (arr[i][3] || null) === (dport || null)) return false;
    return !fxgReaches(arr, to, from);
  }
  function clearMarks(){ Array.prototype.forEach.call(inner.querySelectorAll('.fxn-sock.ok'), function(s){ s.classList.remove('ok'); }); }
  function markTargets(){
    clearMarks();
    Array.prototype.forEach.call(inner.querySelectorAll(drag.kind === 'out' ? '.fxn-in' : '.fxn-out'), function(s){
      var id = s.closest('.fxn').dataset.fxn, sp = s.dataset.port || null;
      var okk = drag.kind === 'out' ? canLink(drag.id, id, drag.port, sp) : canLink(id, drag.id, sp, drag.dport);
      if(okk) s.classList.add('ok');
    });
  }
  function dragMove(ev){
    if(!drag) return;
    var pt = toInner(ev.clientX, ev.clientY), a = sockPt(drag.anchor);
    tmp.setAttribute('d', drag.kind === 'out' ? wireD(a, pt) : wireD(pt, a));
  }
  function dragEnd(ev){
    window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragEnd);
    if(!drag) return;
    var t = document.elementFromPoint(ev.clientX, ev.clientY), s = t && t.closest ? t.closest('.fxn-sock') : null;
    if(s && inner.contains(s)){
      var tid = s.closest('.fxn').dataset.fxn, sp = s.dataset.port || null;
      if(drag.kind === 'out' && s.classList.contains('fxn-in') && canLink(drag.id, tid, drag.port, sp)){
        E().push(mkEdge(drag.id, tid, drag.port, sp));
      } else if(drag.kind === 'in' && s.classList.contains('fxn-out') && canLink(tid, drag.id, sp, drag.dport)){
        E().push(mkEdge(tid, drag.id, sp, drag.dport));
      }
    }
    clearMarks(); tmp = null; drag = null; commit();
  }
  inner.addEventListener('pointerdown', function(ev){
    var sock = ev.target.closest ? ev.target.closest('.fxn-sock') : null;
    if(!sock || ev.button > 0) return;
    ev.preventDefault(); ev.stopPropagation();
    var id = sock.closest('.fxn').dataset.fxn, kind = sock.classList.contains('fxn-out') ? 'out' : 'in', port = sock.dataset.port || null, anchor = sock, dport = null;
    if(kind === 'in'){
      dport = port; port = null;
      var arr = E(), last = -1; for(var i = 0; i < arr.length; i++) if(arr[i][1] === id && (arr[i][3] || null) === dport) last = i;
      if(last >= 0){ var e = arr.splice(last, 1)[0]; kind = 'out'; id = e[0]; port = e[2] || null; dport = null; anchor = outSock(id, port); }
    }
    drag = { kind: kind, id: id, port: port, dport: dport, anchor: anchor };
    tmp = mk('path', { 'class': 'w tmp' });
    markTargets(); draw(); dragMove(ev);
    window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd);
  });

  function fmtLinear(unit){ return function(v){ return v + unit; }; }
  var DYN = {
    mixer: { title: 'Mixer', cat: 'mix', tip: 'Bypass: Input A passes straight to the output (Input B is dropped)', sliders: [
      { k: 'ratio', label: 'Input A : Input B', min: 0, max: 100, step: 1, def: 50, fmt: function(v){ return (100 - v) + ' : ' + v; } } ] },
    gain: { title: 'Gain', cat: 'mix', tip: 'Bypass: pass the input straight to the output at unity gain', sliders: [
      { k: 'db', label: 'Output gain', min: -60, max: 24, step: 0.5, def: 0, fmt: function(v){ return v <= -60 ? 'MUTE' : (v > 0 ? '+' : '') + v + ' dB'; } } ] },
    splitter: { title: 'Splitter', cat: 'mix', tip: 'Bypass: the input goes to Output A only', sliders: [] },
    delay: { title: 'Delay', cat: 'reverb', tip: 'Bypass: pass the input straight to the output (no echoes)', sliders: [
      { k: 'time', label: 'Time', min: 1, max: 2000, step: 1, def: 300, fmt: fmtLinear(' ms') },
      { k: 'fb', label: 'Feedback', min: 0, max: 90, step: 1, def: 35, fmt: fmtLinear('%') },
      { k: 'mix', label: 'Mix (echo level)', min: 0, max: 100, step: 1, def: 40, fmt: fmtLinear('%') } ] },
    filter: { title: 'Filter', cat: 'filter', tip: 'Bypass: pass the input straight to the output', selects: [
      { k: 'type', label: 'Type', def: 'lowpass', opts: [['lowpass', 'Low-pass'], ['highpass', 'High-pass'], ['bandpass', 'Band-pass'], ['notch', 'Notch']] } ], sliders: [
      { k: 'cutoff', label: 'Cutoff / Center', min: 20, max: 20000, step: 1, def: 2000, log: true, fmt: fmtHz },
      { k: 'q', label: 'Resonance (Q)', min: 0.1, max: 20, step: 0.1, def: 0.7, fmt: function(v){ return (+v).toFixed(1); } } ] },
    reverb: { title: 'Reverb', cat: 'reverb', tip: 'Bypass: dry signal only (no reverb)', sliders: [
      { k: 'decay', label: 'Decay', min: 0.2, max: 10, step: 0.1, def: 2.5, fmt: function(v){ return (+v).toFixed(1) + ' s'; } },
      { k: 'pre', label: 'Pre-delay', min: 0, max: 200, step: 1, def: 20, fmt: fmtLinear(' ms') },
      { k: 'damp', label: 'Damping (high cut)', min: 500, max: 20000, step: 1, def: 6000, log: true, fmt: fmtHz },
      { k: 'mix', label: 'Mix (reverb level)', min: 0, max: 100, step: 1, def: 30, fmt: fmtLinear('%') } ] },
    distortion: { title: 'Distortion', cat: 'dist', tip: 'Bypass: dry signal only (no distortion)', selects: [
      { k: 'char', label: 'Character', def: 'soft', opts: [['soft', 'Soft Clip'], ['hard', 'Hard Clip'], ['fuzz', 'Fuzz'], ['bitcrush', 'Bit Crush']] } ], sliders: [
      { k: 'drive', label: 'Drive', min: 0, max: 100, step: 1, def: 40, fmt: fmtLinear('%') },
      { k: 'tone', label: 'Tone (high cut)', min: 200, max: 20000, step: 1, def: 6000, log: true, fmt: fmtHz },
      { k: 'out', label: 'Output gain', min: 0, max: 200, step: 1, def: 80, fmt: fmtLinear('%') },
      { k: 'mix', label: 'Mix (wet level)', min: 0, max: 100, step: 1, def: 100, fmt: fmtLinear('%') } ] },
    xfilter: { title: 'Filter', cat: 'filter', tip: 'Bypass: both outputs pass the input straight through', sliders: [
      { k: 'hc', label: 'High pass: Cutoff', min: 20, max: 20000, step: 1, def: 350, log: true, fmt: fmtHz },
      { k: 'hq', label: 'High pass: Resonance (Q)', min: 0.1, max: 20, step: 0.1, def: 0.7, fmt: function(v){ return (+v).toFixed(1); } },
      { k: 'hm', label: 'High pass: Dry / Wet', min: 0, max: 100, step: 1, def: 100, fmt: fmtLinear('%') },
      { k: 'lc', label: 'Low pass: Cutoff', min: 20, max: 20000, step: 1, def: 5000, log: true, fmt: fmtHz },
      { k: 'lq', label: 'Low pass: Resonance (Q)', min: 0.1, max: 20, step: 0.1, def: 0.1, fmt: function(v){ return (+v).toFixed(1); } },
      { k: 'lm', label: 'Low pass: Dry / Wet', min: 0, max: 100, step: 1, def: 65, fmt: fmtLinear('%') } ] },
    xdist: { title: 'Distortion', cat: 'dist', tip: 'Bypass: dry signal only (no distortion)', selects: [
      { k: 'char', label: 'Character', def: 'fuzz', opts: [['soft', 'Soft Clip'], ['hard', 'Hard Clip'], ['fuzz', 'Fuzz'], ['bitcrush', 'Bit Crush']] } ], sliders: [
      { k: 'drive', label: 'Drive', min: 0, max: 100, step: 1, def: 5, fmt: fmtLinear('%') },
      { k: 'tone', label: 'Tone (Post LPF Hz)', min: 200, max: 20000, step: 1, def: 6000, log: true, fmt: fmtHz },
      { k: 'out', label: 'Output Gain', min: 0, max: 100, step: 1, def: 100, fmt: fmtLinear('%') },
      { k: 'mix', label: 'Dry / Wet', min: 0, max: 100, step: 1, def: 60, fmt: fmtLinear('%') },
      { k: 'asym', label: 'Asymmetry (Stereo / Mono)', min: 0, max: 100, step: 1, def: 50, fmt: function(v){ v = +v; return v === 50 ? '0%' : (v < 50 ? ((50 - v) * 2) + '% Stereo' : ((v - 50) * 2) + '% Mono'); } } ] },
    xrev: { title: 'Reverb', cat: 'reverb', convolver: true, tip: 'Bypass: dry signal only (no reverb)', selects: [
      { k: 'mode', label: 'Mode', def: 'convolver', opts: [['convolver', 'Convolver'], ['reverb', 'Reverb (legacy)']] },
      { k: 'preset', label: 'IR Preset', def: '50FT_BS', grp: 'conv', groups: [['HOUSING', [['3T22_IR','3T22 - SPATIAL REVERB 2'],['P50_IR','P50 - SPATIAL REVERB 3']]],
      ['DISTANCE', [['20FT','20 FT - LEVEL A1'],['20FT_BS','20 FT - BS - LEVEL A2'],['50FT_BS','50 FT - BS - LEVEL B'],['80FT','80 FT - LEVEL C'],['100FT_IN','100 FT - INDOOR - LEVEL D1'],['WORKSHOP','WORKSHOP - SPATIAL REVERB 1']]],
      ['IR', [['DRY_CLR','DRY CLR'],['WET_OET','WET OET']]]],
        opts: [['', 'None (use file)'],['3T22_IR',''],['P50_IR',''],['20FT',''],['20FT_BS',''],['50FT_BS',''],['80FT',''],['100FT_IN',''],['WORKSHOP',''],['DRY_CLR',''],['WET_OET','']] } ], sliders: [
      { k: 'size', label: 'Room Size', grp: 'synth', min: 0, max: 100, step: 1, def: 100, fmt: fmtLinear('%') },
      { k: 'decay', label: 'Decay', grp: 'synth', min: 0, max: 100, step: 1, def: 48, fmt: fmtLinear('%') },
      { k: 'diff', label: 'Diffusion', grp: 'synth', min: 0, max: 100, step: 1, def: 9, fmt: fmtLinear('%') },
      { k: 'color', label: 'Color (HF Damp)', grp: 'synth', min: 0, max: 100, step: 1, def: 60, fmt: fmtLinear('%') },
      { k: 'lowcut', label: 'Low Cut', grp: 'synth', min: 20, max: 800, step: 1, def: 80, fmt: fmtHz },
      { k: 'pre', label: 'Pre-Delay (ms)', grp: 'synth', min: 0, max: 150, step: 1, def: 1, fmt: fmtLinear(' ms') },
      { k: 'mix', label: 'Dry / Wet', min: 0, max: 100, step: 1, def: 100, fmt: fmtLinear('%') } ] }
  };
  function fmtHz(v){ v = +v; return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz' : Math.round(v) + ' Hz'; }
  function logPos(d, v){ return Math.round(1000 * Math.log(Math.max(d.min, v) / d.min) / Math.log(d.max / d.min)); }
  function logVal(d, pos){ return Math.round(d.min * Math.pow(d.max / d.min, pos / 1000)); }
  function dynState(){ if(!window.FXGM.dyn || typeof window.FXGM.dyn !== 'object') window.FXGM.dyn = {}; return window.FXGM.dyn; }
  function isDyn(id){ return !!dynState()[id]; }
  function newId(type){ for(var n = (type.charAt(0) === 'x' ? 2 : 1); n < 1000; n++){ var id = type + n; if(!cards[id] && !dynState()[id]) return id; } return type + Date.now(); }
  function lbl(t){ return '<span class="fxn-lbl">' + t + '</span>'; }
  function inRow(text, port, first){ return '<div class="fxn-io"' + (first ? '' : ' style="padding-top:0"') + '><span class="fxn-sock fxn-in" data-sock="in"' + (port ? ' data-port="' + port + '"' : '') + ' title="' + text + '"></span>' + lbl(text) + '<span class="fxn-gap"></span>'; }
  function outPart(text, port){ return lbl(text) + '<span class="fxn-sock fxn-out" data-sock="out"' + (port ? ' data-port="' + port + '"' : '') + ' title="' + text + ' - drag to an input dot"></span></div>'; }
  function sockHtml(type){
    if(type === 'mixer') return inRow('Input A', 'a', true) + outPart('Output') + inRow('Input B', 'b', false) + '</div>';
    if(type === 'splitter') return inRow('Input', null, true) + outPart('Output A', 'a') + '<div class="fxn-io" style="padding-top:0"><span class="fxn-gap"></span>' + outPart('Output B', 'b') + '<div class="fxn-io" style="padding-top:0"><span class="fxn-gap"></span>' + outPart('Output C', 'c');
    if(type === 'xfilter') return inRow('Input', null, true) + outPart('HPF Output', 'hpf') + '<div class="fxn-io" style="padding-top:0"><span class="fxn-gap"></span>' + outPart('LPF Output', 'lpf');
    return inRow('Input', null, true) + outPart('Output');
  }
  function sliderHtml(def, val){
    return '<div class="entry"' + (def.grp ? ' data-grp="' + def.grp + '"' : '') + ' style="grid-column:1/-1;letter-spacing:1px"><label>' + def.label + '</label><div style="display:flex;align-items:center;gap:5px">' +
      '<input type="range" data-p="' + def.k + '" min="' + (def.log ? 0 : def.min) + '" max="' + (def.log ? 1000 : def.max) + '" step="' + (def.log ? 1 : def.step) + '" value="' + (def.log ? logPos(def, val) : val) + '" style="accent-color:var(--blue);flex:1;min-width:0">' +
      '<span class="slider-val" data-v="' + def.k + '" style="color:var(--blue);min-width:60px;text-align:right">' + def.fmt(val) + '</span></div></div>';
  }
  function selectHtml(sd, val){
    var op = function(o){ return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>'; };
    var body = sd.groups ? op(['', '\u2014 NONE (USE FILE) \u2014']) + sd.groups.map(function(g){ return '<optgroup label="' + g[0] + '">' + g[1].map(op).join('') + '</optgroup>'; }).join('') : sd.opts.map(op).join('');
    return '<div class="entry"' + (sd.grp ? ' data-grp="' + sd.grp + '"' : '') + ' style="grid-column:1/-1;letter-spacing:1px"><label>' + sd.label + '</label><select data-s="' + sd.k + '" style="font-size:11px;padding:2px 5px;letter-spacing:1px;width:100%">' + body + '</select></div>';
  }
  function cleanParams(type, src){
    var out = {}; src = (src && typeof src === 'object') ? src : {};
    (DYN[type].selects || []).forEach(function(sd){ var ok = sd.opts.some(function(o){ return o[0] === src[sd.k]; }); out[sd.k] = ok ? src[sd.k] : sd.def; });
    DYN[type].sliders.forEach(function(d){ var v = +src[d.k]; if(!isFinite(v)) v = d.def; out[d.k] = Math.max(d.min, Math.min(d.max, v)); });
    return out;
  }
  function liveApply(id){ try{ if(typeof fxgApplyDyn === 'function') fxgApplyDyn(id); }catch(e){ console.error(e); } }
  function createDyn(id, type, st){
    var def = DYN[type]; if(!def) return null;
    st = st || {};
    var d = dynState()[id] = { type: type, bypass: !!st.bypass, params: cleanParams(type, st.params) };
    var el = document.createElement('div'); el.className = 'fxn'; el.dataset.fxn = id; el.dataset.cat = def.cat;
    var num = id.slice(type.length);
    el.innerHTML = '<div class="fxn-head"><span class="fxn-chev" title="Collapse / expand"><svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg></span><span class="fxn-title">' + def.title.toUpperCase() + (num ? ' ' + num : '') + '</span>' +
      '<span class="fxn-byp" data-dyn="' + id + '" title="' + def.tip + '">BYPASS</span><span class="fxn-del" title="Remove this card"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span></div>' +
      sockHtml(type) +
      '<div class="fxn-body">' + (def.sliders.length ? '<div class="entry-grid" style="gap:5px">' + (def.selects || []).map(function(sd){ return selectHtml(sd, d.params[sd.k]); }).join('') + (def.convolver ? '<div class="entry" data-grp="conv" style="grid-column:1/-1;letter-spacing:1px"><label>Impulse Response File</label><div style="display:flex;align-items:center;gap:6px"><label class="vbtn btn-gray xr-fbtn" style="cursor:pointer;padding:3px 9px;font-size:11px;letter-spacing:1px;white-space:nowrap">LOAD IR FILE<input type="file" class="xr-file" accept=".wav,.aiff,.aif,.mp3,.ogg,.flac" style="display:none"></label><span class="xr-name" style="font-size:11px;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">No file loaded</span></div><div class="xr-status" style="font-size:11px;color:var(--muted);margin-top:4px;display:none"></div></div>' : '') + def.sliders.map(function(sd){ return sliderHtml(sd, d.params[sd.k]); }).join('') + '</div>'
        : '') + '</div>';
    inner.appendChild(el);
    cards[id] = el; ids.push(id); setup(id); if(ro) ro.observe(el);
    el.querySelector('.fxn-byp').addEventListener('click', function(ev){ ev.stopPropagation(); d.bypass = !d.bypass; syncPills(); save(); liveApply(id); });
    el.querySelector('.fxn-del').addEventListener('click', function(ev){ ev.stopPropagation(); removeDyn(id); commit(); });
    Array.prototype.forEach.call(el.querySelectorAll('input[type=range]'), function(r){
      r.addEventListener('input', function(){
        var k = r.dataset.p, sd = def.sliders.filter(function(x){ return x.k === k; })[0], v = parseFloat(r.value);
        if(sd && sd.log) v = logVal(sd, v);
        d.params[k] = v;
        var sp = el.querySelector('[data-v="' + k + '"]'); if(sp && sd) sp.textContent = sd.fmt(v);
        save(); liveApply(id);
      });
    });
    Array.prototype.forEach.call(el.querySelectorAll('select[data-s]'), function(sel){
      sel.addEventListener('change', function(){ d.params[sel.dataset.s] = sel.value; if(sel.dataset.s === 'preset' && window.FXGM_IR) delete window.FXGM_IR[id]; syncXr(); save(); liveApply(id); });
      sel.addEventListener('pointerdown', function(ev){ ev.stopPropagation(); });
    });
    function syncXr(){
      if(!def.convolver) return;
      var conv = d.params.mode !== 'reverb';
      Array.prototype.forEach.call(el.querySelectorAll('[data-grp]'), function(n){ n.style.display = ((n.getAttribute('data-grp') === 'conv') === conv) ? '' : 'none'; });
    }
    syncXr();
    if(def.convolver){
      var fi = el.querySelector('.xr-file'), fb = el.querySelector('.xr-fbtn');
      ['pointerdown'].forEach(function(t){ fb.addEventListener(t, function(ev){ ev.stopPropagation(); }); });
      fi.addEventListener('change', function(){
        var f = fi.files && fi.files[0]; if(!f) return;
        if(typeof audioCtx === 'undefined' || !audioCtx){ fxgIRStatus(id, f.name, 'Start audio first', 'var(--warn)'); return; }
        fxgIRStatus(id, f.name, 'Decoding...');
        var rd = new FileReader();
        rd.onload = function(e){
          audioCtx.decodeAudioData(e.target.result.slice(0), function(buf){
            try{ window._wavReg(buf, e.target.result); }catch(x){}
            window.FXGM_IR[id] = buf; d.params.preset = '';
            var ps = el.querySelector('select[data-s="preset"]'); if(ps) ps.value = '';
            fxgIRStatus(id, null, 'Loaded \u2014 ' + buf.duration.toFixed(2) + 's', 'var(--accent)');
            save(); liveApply(id);
          }, function(){ fxgIRStatus(id, null, 'Decode failed', 'var(--red)'); });
        };
        rd.readAsArrayBuffer(f);
      });
    }
    return el;
  }
  function removeDyn(id){
    if(window.FXGM_IR) delete window.FXGM_IR[id];
    var el = cards[id]; if(el && el.parentNode) el.parentNode.removeChild(el);
    if(ro && el){ try{ ro.unobserve(el); }catch(e){} }
    delete cards[id]; delete pos[id]; delete dynState()[id];
    var k = ids.indexOf(id); if(k >= 0) ids.splice(k, 1);
    window.FXGM.edges = E().filter(function(e){ return e[0] !== id && e[1] !== id; });
  }
  function removeAllDyn(){ Object.keys(dynState()).forEach(removeDyn); }
  function addCard(type){
    if(type.indexOf('static:') === 0){ addStaticCard(type.slice(7)); return; }
    if(type === 'blower'){ addBlowerCard(); return; }
    if(!DYN[type]) return;
    var id = newId(type); createDyn(id, type, {});
    var a = pos.add || { x: PAD, y: PAD };
    pos[id] = { x: a.x, y: a.y }; applyPos(id);
    pos.add = { x: a.x, y: a.y + cards[id].offsetHeight + GY }; applyPos('add');
    zTop++; cards[id].style.zIndex = zTop;
    commit();
  }
  function placeBelow(id){
    var my = PAD; ids.forEach(function(o){ if(o !== id && pos[o] && cards[o]) my = Math.max(my, pos[o].y + cards[o].offsetHeight + GY); });
    pos[id] = { x: PAD, y: my }; applyPos(id);
  }

  function serialize(){
    var p = {}, c = {};
    ids.forEach(function(id){ if(pos[id]) p[id] = { x: Math.round(pos[id].x), y: Math.round(pos[id].y) }; c[id] = cards[id].classList.contains('collapsed') ? 1 : 0; });
    return { v: 2, pos: p, collapsed: c, edges: E().map(function(e){ return e.slice(); }), filterBypass: !!window.FXGM.filterBypass, dyn: JSON.parse(JSON.stringify(dynState())), blower: hasBlower() ? 1 : 0, removed: STATIC.filter(function(id){ return !cards[id]; }) };
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(serialize())); }catch(e){} }
  function dropDopplerEdges(edges){
    var ins = edges.filter(function(e){ return Array.isArray(e) && e[1] === 'doppler'; });
    var outs = edges.filter(function(e){ return Array.isArray(e) && e[0] === 'doppler'; });
    var rest = edges.filter(function(e){ return !Array.isArray(e) || (e[0] !== 'doppler' && e[1] !== 'doppler'); });
    ins.forEach(function(i){ outs.forEach(function(o){
      var n = [i[0], o[1], i[2] == null ? '' : i[2], o[3] == null ? '' : o[3]]; while(n.length > 2 && (n[n.length - 1] === '' || n[n.length - 1] == null)) n.pop(); rest.push(n); }); });
    return rest;
  }
  function load(o, quiet){
    removeAllDyn();
    if(!o || o.v !== 2 || !Array.isArray(o.edges)){
      attachBlower();
      STATIC.forEach(attachStatic);
      window.FXGM.edges = null; window.FXGM.filterBypass = false;
      ids.forEach(function(id){ cards[id].classList.remove('collapsed'); });
      fxgEdges(); syncPills(); autoLayout(); refresh(); if(!quiet) rebuildAudio(); return;
    }
    if(o.blower === undefined ? o.edges.some(function(e){ return Array.isArray(e) && (e[0] === 'blower' || e[1] === 'blower'); }) : !!o.blower) attachBlower(); else detachBlower(true);
    var rmv = Array.isArray(o.removed) ? o.removed : [];
    STATIC.forEach(function(id){ if(rmv.indexOf(id) >= 0) detachStatic(id, true); else attachStatic(id); });
    if(o.dyn && typeof o.dyn === 'object') Object.keys(o.dyn).slice(0, 32).forEach(function(id){
      var d = o.dyn[id];
      if(d && DYN[d.type] && /^[a-z]+\d+$/.test(id) && id.indexOf(d.type) === 0 && !cards[id]) createDyn(id, d.type, d);
    });
    window.FXGM.edges = dropDopplerEdges(o.edges).filter(function(e){ return Array.isArray(e) && cards[e[0]] && cards[e[1]] && e[0] !== 'out' && e[1] !== 'in'; }).map(function(e){
      var a = e.slice(0, 4); while(a.length > 2 && a[a.length - 1] == null) a.pop();
      return a.map(function(x){ return x == null ? '' : x; });
    });
    if(!(o.pos && o.pos.sos) && cards.sos){
      var di = -1; window.FXGM.edges.forEach(function(e, i){ if(di < 0 && e[0] === 'direction') di = i; });
      if(di >= 0){ var old = window.FXGM.edges[di], tail = old.slice(1);
        window.FXGM.edges.splice(di, 1, ['direction', 'sos'], ['sos'].concat(tail)); }
    }
    window.FXGM.filterBypass = !!o.filterBypass;
    ids.forEach(function(id){
      cards[id].classList.toggle('collapsed', !!(o.collapsed && o.collapsed[id]));
      if(o.pos && o.pos[id]){ pos[id] = { x: +o.pos[id].x || 0, y: +o.pos[id].y || 0 }; applyPos(id); }
    });
    var missing = ids.filter(function(id){ return !pos[id]; });
    if(missing.some(function(id){ return id !== 'add' && id !== 'sos' && id !== 'blower' && !isDyn(id); })) autoLayout();
    else missing.forEach(placeBelow);
    syncPills(); redraw(); refresh(); if(!quiet) rebuildAudio();
  }
  function commit(){ refresh(); redraw(); save(); rebuildAudio(); }

  var bAuto = document.getElementById('btnFxAutoLayout'), bReset = document.getElementById('btnFxResetChain');
  if(bAuto) bAuto.addEventListener('click', autoLayout);
  if(bReset) bReset.addEventListener('click', function(){ removeAllDyn(); STATIC.forEach(function(id){ if(attachStatic(id)) placeBelow(id); }); if(attachBlower() && !pos.blower) placeBelow('blower'); window.FXGM.edges = null; fxgEdges(); syncPills(); commit(); });
  var bAdd = document.getElementById('fxAddBtn'), selAdd = document.getElementById('fxAddType');
  if(bAdd && selAdd) bAdd.addEventListener('click', function(){ addCard(selAdd.value); });

  var ro = null;
  if(window.ResizeObserver){
    ro = new ResizeObserver(function(){ if(!laidOut && host.clientWidth > 0){ autoLayout(); } else redraw(); });
    ids.forEach(function(id){ ro.observe(cards[id]); }); ro.observe(host);
  }
  window.FXG = { hasBlower: hasBlower, fit: function(){ fitView(); }, resetView: function(){ resetView(); }, serialize: serialize, load: function(o){ load(o, false); }, autoLayout: autoLayout, redraw: redraw };
  var saved = null; try{ saved = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  if(saved && saved.v === 2) load(saved, true); else { fxgEdges(); syncPills(); autoLayout(); refresh(); }
  syncBlowerUI(); syncStaticUI(); homeBlowerSec();
  window.addEventListener('load', function(){ if(!saved) autoLayout(); else redraw(); });
})();
