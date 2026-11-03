
(function(){
  var LS='sirenosc_collapse_secs', KEYS=['torque','counter','omega','alpha','voltage','current'];
  function load(){ try{ return JSON.parse(localStorage.getItem(LS)||'{}')||{}; }catch(e){ return {}; } }
  function store(o){ try{ localStorage.setItem(LS,JSON.stringify(o)); }catch(e){} }
  document.addEventListener('DOMContentLoaded',function(){
    var ab=document.getElementById('btnSimGraphsCollapseAll');
    function allCollapsed(){ var c=(window._getSimGraphCollapsed&&window._getSimGraphCollapsed())||{}; return KEYS.every(function(k){ return c[k]; }); }
    function label(){ if(ab) ab.textContent=allCollapsed()?'EXPAND ALL':'COLLAPSE ALL'; }
    if(ab){
      ab.addEventListener('click',function(){
        if(!window._setSimGraphCollapsed) return;
        var to=!allCollapsed(), o={}; KEYS.forEach(function(k){ o[k]=to; });
        window._setSimGraphCollapsed(o);
        var h=document.querySelector('#simGraphGrid .simgraph-head'); if(h) h.dispatchEvent(new Event('change',{bubbles:true}));
        label();
      });
      document.getElementById('simGraphGrid').addEventListener('click',function(){ setTimeout(label,0); });
      label();
    }
    var st=load();
    function make(key, titleEl, stopFn){
      if(!titleEl) return;
      var body=document.createElement('div'); body.className='sx-collbody';
      var n=titleEl.nextElementSibling, moved=[];
      while(n && !stopFn(n)){ moved.push(n); n=n.nextElementSibling; }
      if(!moved.length) return;
      titleEl.parentNode.insertBefore(body, moved[0]); moved.forEach(function(m){ body.appendChild(m); });
      var btn=document.createElement('button'); btn.type='button'; btn.className='vbtn btn-gray'; btn.title='Collapse / expand';
      btn.style.cssText='font-size:11px;padding:1px 7px;margin-left:auto;letter-spacing:1px';
      titleEl.style.display='flex'; titleEl.style.alignItems='center'; titleEl.style.gap='6px'; titleEl.appendChild(btn);
      function apply(){ body.style.display=st[key]?'none':''; btn.innerHTML=st[key]?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>':'<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>'; }
      btn.addEventListener('click',function(){ st[key]=!st[key]; store(st); apply(); });
      titleEl.style.cursor='pointer'; titleEl.addEventListener('click',function(e){ if(e.target.closest('button,input,label,select')&&e.target!==btn) return; if(e.target!==btn) btn.click(); });
      apply();
    }
    var pd=document.getElementById('tPitchDecline'), vb=document.getElementById('tVibrato'), dm=document.getElementById('tDualMotor');
    function titleBefore(el){ var p=el&&el.closest('.toggle-row'); return p&&p.previousElementSibling; }
    if(pd) make('pitch', titleBefore(pd), function(n){ return n.classList.contains('entry-grid'); });
    if(vb) make('vibrato', titleBefore(vb), function(n){ return n.tagName==='HR'; });
  });
})();
