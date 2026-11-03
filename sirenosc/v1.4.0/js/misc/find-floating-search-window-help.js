
(function(){
  var LS='sirenosc.findpos', LSP='sirenosc.findpins', pinMode=false, pins=[], win=null, inp=null, list=null, results=[], sel=0;
  var st=document.createElement('style');
  st.textContent=
  '#findWin{position:fixed;z-index:9500;width:340px;max-width:calc(100vw - 16px);background:var(--panel2);border:1px solid var(--border);border-radius:2px;box-shadow:0 8px 30px rgba(0,0,0,.45);display:none;flex-direction:column;letter-spacing:1px;color:var(--text)}'+
  '#findWin #fwTitle{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border);cursor:grab;user-select:none;touch-action:none}'+
  '#findWin #fwTitle:active{cursor:grabbing}'+
  '#findWin .fw-ttl{color:var(--x-ddd,#ddd) !important;font-family:sans-serif !important;font-size:13px !important;font-weight:600 !important;letter-spacing:1px !important;text-transform:uppercase !important}'+
  'body.font-open-sans #findWin .fw-ttl{letter-spacing:normal !important}'+
  '#findWin #fwClose{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:13px;line-height:1;padding:0 2px}'+
  '#findWin #fwClose:hover{color:var(--accent)}'+
  '#findWin .fw-box{position:relative;margin:7px 8px}'+
  '#findWin .fw-box svg{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:13px;height:13px;color:var(--muted);pointer-events:none}'+
  '#findWin #fwIn{display:block;width:100%;box-sizing:border-box;margin:0;padding:5px 7px 5px 28px;font-size:11px;background:var(--inset,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:2px;outline:none;letter-spacing:1px;text-transform:none}'+
  '#findWin #fwIn:focus{border-color:var(--accent)}'+
  '#findWin #fwList{max-height:130px;overflow-y:auto;border-top:1px solid var(--border)}'+
  '#findWin .fw-row{height:26px;box-sizing:border-box;padding:0 8px;display:flex;align-items:center;font-size:10px;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border-bottom:1px solid var(--border)}'+
  '#findWin .fw-row:last-child{border-bottom:0}'+
  '#findWin .fw-row.sel,#findWin .fw-row:hover{background:var(--accent);color:#000}'+
  '#findWin #fwPinned{background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--muted);font-size:9px;letter-spacing:1.5px;padding:1px 6px;margin-right:6px;cursor:pointer;font-family:inherit}'+
  '#findWin #fwPinned:hover,#findWin #fwPinned.on{border-color:var(--accent);color:var(--accent)}'+
  '#findWin .fw-txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}'+
  '#findWin .fw-pin{flex:0 0 auto;background:transparent;border:0;color:inherit;cursor:pointer;padding:2px 0 2px 8px;display:inline-flex;opacity:.7}'+
  '#findWin .fw-pin:hover,#findWin .fw-pin.on{opacity:1}'+
  '#findWin .fw-pin svg{width:12px;height:12px}'+
  '#findWin .fw-empty{padding:8px;font-size:10px;color:var(--muted);text-transform:uppercase}'+
  '.find-hit{outline:2px solid var(--accent2,#0af) !important;outline-offset:2px;animation:findPulse .6s ease-in-out 3}'+
  '@keyframes findPulse{50%{outline-color:transparent}}';
  document.head.appendChild(st);

  try{ pins=JSON.parse(localStorage.getItem(LSP)||'[]')||[]; }catch(_){ pins=[]; }
  function pkey(r){ return (r.name+'|'+r.sec+'|'+r.tab).toLowerCase(); }
  function isPinned(r){ var k=pkey(r); return pins.some(function(p){ return pkey(p)===k; }); }
  function togglePin(r){
    var k=pkey(r), n=pins.filter(function(p){ return pkey(p)!==k; });
    if(n.length===pins.length) n.push({name:r.name,sec:r.sec,tab:r.tab,act:r.act});
    pins=n; try{ localStorage.setItem(LSP,JSON.stringify(pins)); }catch(_){}
  }
  function pinnedList(q){
    var toks=q.toLowerCase().split(/\s+/).filter(Boolean);
    return pins.map(function(p){ return {name:p.name,sec:p.sec,tab:p.tab,act:p.act,el:null}; }).filter(function(r){
      for(var k=0;k<toks.length;k++) if(!tokScore(toks[k],r)) return false; return true; });
  }
  function refresh(){ results=pinMode?pinnedList(inp.value):search(inp.value); sel=0; draw(); }
  function clean(el){
    var c=el.cloneNode(true);
    [].forEach.call(c.querySelectorAll('select,input,textarea,svg,script,style,.menu-arrow'),function(n){ n.remove(); });
    var own=[].filter.call(c.childNodes,function(n){ return n.nodeType===3; }).map(function(n){ return n.textContent; }).join(' ').replace(/\s+/g,' ').trim();
    if(own.length>=2&&/^(LABEL|H[1-6])$|^DIV$/.test(c.tagName)) return own;
    return (c.textContent||'').replace(/\s+/g,' ').trim();
  }
  function secOf(el,rootName){
    var s=el.closest('.sec'); if(s){ var t=s.querySelector('.sec-title'); if(t&&t!==el){ var x=clean(t); if(x) return x; } }
    if(el.closest('#masterCtlBar')) return 'Master Control';
    if(el.closest('#legacyPanel')) return 'Legacy Controls';
    return rootName;
  }
  function tabExists(act){ return !!document.querySelector('#docTabBar [data-act="'+act+'"]'); }
  function build(){
    var out=[], seen={};
    var roots=[
      {tab:'Siren Editor', act:'editor', el:document.body, skip:'#ctrlEditorOverlay,#recordOverlay,#docTabBar,#topStack,#findWin,.popup-overlay,#settingsPanel,script,style'},
      {tab:'Controller Editor', act:'ceditor', el:document.getElementById('ctrlEditorOverlay'), skip:'#findWin,.popup-overlay'},
      {tab:'Record Mode', act:'record', el:document.getElementById('recordOverlay'), skip:'#findWin,.popup-overlay', need:true}
    ];
    roots.forEach(function(r){
      if(!r.el) return; if(r.need && !tabExists(r.act)) return;
      [].forEach.call(r.el.querySelectorAll('label,.sec-title,button,summary'),function(el){
        if(el.closest(r.skip)) { return; }
        var n=clean(el); if(!n||n.length<2) n=(el.getAttribute('title')||el.getAttribute('aria-label')||'').trim();
        if(!n||n.length>48||!/[A-Za-z]/.test(n)) return;
        var sec=secOf(el,r.tab), key=(n+'|'+sec+'|'+r.tab).toLowerCase(); if(seen[key]) return; seen[key]=1;
        out.push({name:n,sec:sec,tab:r.tab,act:r.act,el:el});
      });
    });
    return out;
  }
  function lev1(a,b){
    if(Math.abs(a.length-b.length)>1) return false; var i=0,j=0,e=0;
    while(i<a.length&&j<b.length){ if(a[i]===b[j]){i++;j++;continue;} if(++e>1) return false;
      if(a.length>b.length) i++; else if(a.length<b.length) j++; else {i++;j++;} }
    return e+(a.length-i)+(b.length-j)<=1;
  }
  function subseq(q,s){ var i=0; for(var k=0;k<s.length&&i<q.length;k++) if(s[k]===q[i]) i++; return i===q.length; }
  function tokScore(t,r){
    var n=r.name.toLowerCase(), words=n.split(/[^a-z0-9]+/).filter(Boolean);
    if(n===t) return 120; if(n.indexOf(t)===0) return 100;
    for(var i=0;i<words.length;i++) if(words[i].indexOf(t)===0) return 80;
    if(n.indexOf(t)>-1) return 60;
    if((r.sec+' '+r.tab).toLowerCase().indexOf(t)>-1) return 30;
    if(t.length>=4) for(i=0;i<words.length;i++) if(lev1(t,words[i])||(words[i].length>=t.length&&lev1(t,words[i].slice(0,t.length)))) return 25;
    if(t.length>=3&&subseq(t,n.replace(/\s/g,''))) return 15;
    return 0;
  }
  function search(q){
    var toks=q.toLowerCase().split(/\s+/).filter(Boolean); if(!toks.length) return [];
    var idx=build(), res=[];
    idx.forEach(function(r,i){ var tot=0; for(var k=0;k<toks.length;k++){ var s=tokScore(toks[k],r); if(!s){ tot=0; break; } tot+=s; } if(tot) res.push({r:r,s:tot,i:i}); });
    res.sort(function(a,b){ return b.s-a.s||a.i-b.i; });
    return res.slice(0,100).map(function(x){ return x.r; });
  }
  function draw(){
    list.innerHTML='';
    var sy=list.scrollTop; if(!pinMode&&!inp.value.trim()){ return; }
    if(!results.length){ var d=document.createElement('div'); d.className='fw-empty'; d.textContent=pinMode?'No pinned entries':'No matches'; list.appendChild(d); return; }
    results.forEach(function(r,i){
      var d=document.createElement('div'); d.className='fw-row'+(i===sel?' sel':''); d.title=r.name+' - '+r.sec+' | '+r.tab;
      var tx=document.createElement('span'); tx.className='fw-txt'; tx.textContent=r.name+' - '+r.sec+' | '+r.tab; d.appendChild(tx);
      var pbn=document.createElement('button'), on=isPinned(r); pbn.type='button'; pbn.className='fw-pin'+(on?' on':''); pbn.title=on?'Unpin':'Pin';
      pbn.innerHTML='<svg viewBox="0 0 24 24" fill="'+(on?'currentColor':'none')+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 3h6l-1 7 3 3v2H7v-2l3-3z"/></svg>';
      pbn.addEventListener('click',function(ev){ ev.stopPropagation(); togglePin(r); if(pinMode){ results=results.filter(function(x){ return x!==r; }); if(sel>=results.length) sel=Math.max(0,results.length-1); } draw(); });
      d.appendChild(pbn);
      d.addEventListener('click',function(){ go(r); });
      list.appendChild(d);
    });
    list.scrollTop=sy;
  }
  function setSel(i){ if(!results.length) return; sel=(i+results.length)%results.length; draw(); var e=list.children[sel]; if(e&&e.scrollIntoView) e.scrollIntoView({block:'nearest'}); }
  function go(r){
    if(!r.el){ var m=build().filter(function(x){ return pkey(x)===pkey(r); })[0]; if(m) r.el=m.el; }
    var act=document.querySelector('#docTabBar .dt-tab.active'), g=act?act.closest('.dt-group'):document.querySelector('#docTabBar .dt-group');
    var te=g&&g.querySelector('[data-act="'+r.act+'"]'), isAct=te&&te.classList.contains('active'), delay=0;
    if(!isAct){
      if(te) te.click(); else if(r.act==='ceditor'){ var b=document.getElementById('btnCtrlOpenEditor'); if(b) b.click(); }
      delay=300;
    }
    setTimeout(function(){
      var el=r.el; if(!el||!document.contains(el)) return;
      try{ el.scrollIntoView({block:'center',behavior:'smooth'}); }catch(_){ el.scrollIntoView(); }
      el.classList.remove('find-hit'); void el.offsetWidth; el.classList.add('find-hit');
      setTimeout(function(){ el.classList.remove('find-hit'); },2200);
    },delay);
  }
  function place(x,y){
    var w=win.offsetWidth||340,h=win.offsetHeight||120;
    x=Math.max(0,Math.min(x,window.innerWidth-w)); y=Math.max(0,Math.min(y,window.innerHeight-h));
    win.style.left=x+'px'; win.style.top=y+'px';
  }
  function save(){ try{ var q=win.getBoundingClientRect(); localStorage.setItem(LS,JSON.stringify({x:q.left,y:q.top})); }catch(_){} }
  function make(){
    win=document.createElement('div'); win.id='findWin';
    win.innerHTML='<div id="fwTitle"><span class="fw-ttl">FIND</span><span style="display:inline-flex;align-items:center"><button type="button" id="fwPinned" title="Show pinned entries">PINNED</button><button type="button" id="fwClose" title="Close">&times;</button></span></div><div class="fw-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><input id="fwIn" type="text" placeholder="Search..." autocomplete="off" spellcheck="false"></div><div id="fwList"></div>';
    document.body.appendChild(win);
    inp=win.querySelector('#fwIn'); list=win.querySelector('#fwList');
    var t=null; inp.addEventListener('input',function(){ clearTimeout(t); t=setTimeout(refresh,80); });
    inp.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){ e.preventDefault(); setSel(sel+1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); setSel(sel-1); }
      else if(e.key==='Enter'){ if(results[sel]) go(results[sel]); }
      else if(e.key==='Escape'){ win.style.display='none'; }
      e.stopPropagation();
    });
    ['keyup','keypress'].forEach(function(k){ inp.addEventListener(k,function(e){ e.stopPropagation(); }); });
    win.querySelector('#fwClose').addEventListener('click',function(){ win.style.display='none'; });
    var pb=win.querySelector('#fwPinned');
    pb.addEventListener('click',function(){ pinMode=!pinMode; pb.classList.toggle('on',pinMode); refresh(); inp.focus(); });
    var drag=null, title=win.querySelector('#fwTitle');
    title.addEventListener('pointerdown',function(e){ if(e.target.id==='fwClose'||e.target.id==='fwPinned'||e.button>0) return; var q=win.getBoundingClientRect(); drag={dx:e.clientX-q.left,dy:e.clientY-q.top}; try{ title.setPointerCapture(e.pointerId); }catch(_){} });
    title.addEventListener('pointermove',function(e){ if(drag) place(e.clientX-drag.dx,e.clientY-drag.dy); });
    function end(){ if(drag){ drag=null; save(); } }
    title.addEventListener('pointerup',end); title.addEventListener('pointercancel',end);
    window.addEventListener('resize',function(){ if(win.style.display!=='none'){ var q=win.getBoundingClientRect(); place(q.left,q.top); } });
  }
  function open(){
    if(!win) make();
    win.style.display='flex';
    var p=null; try{ p=JSON.parse(localStorage.getItem(LS)||'null'); }catch(_){}
    if(p&&isFinite(p.x)&&isFinite(p.y)) place(p.x,p.y); else place(window.innerWidth-win.offsetWidth-24,90);
    inp.focus(); inp.select();
    if(inp.value.trim()||pinMode) refresh();
  }
  var host=document.getElementById('menuHelpDropdown');
  if(host){
    var e=document.createElement('div'); e.className='menu-entry'; e.id='menuFind'; e.textContent='FIND';
    e.addEventListener('click',function(ev){
      ev.stopPropagation();
      [].forEach.call(document.querySelectorAll('.menu-item.open'),function(m){ m.classList.remove('open'); });
      open();
    });
    host.insertBefore(e,host.firstChild);
  }
})();
