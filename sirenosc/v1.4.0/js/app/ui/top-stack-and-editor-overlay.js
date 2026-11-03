(function(){
  var hd=document.querySelector('.vst>.header'), mb=document.querySelector('.vst>.menu-bar-row'), tb=document.getElementById('docTabBar');
  if(!hd||!mb||!tb||document.getElementById('topStack')) return;
  var st=document.createElement('div'); st.id='topStack'; document.body.insertBefore(st,document.body.firstChild);
  st.appendChild(hd); st.appendChild(mb); st.appendChild(tb); document.body.classList.add('has-top');
  function m(){ var z=window._uiZoom||1; document.documentElement.style.setProperty('--topH',(st.getBoundingClientRect().height/z).toFixed(2)+'px'); }
  window._topHRefresh=m;
  if(window.ResizeObserver) new ResizeObserver(m).observe(st); window.addEventListener('resize',m); m(); setTimeout(m,300);
})();

(function(){
  var ov=document.getElementById('ctrlEditorOverlay'), svg=document.getElementById('ceCanvas');
  var inl=document.getElementById('ceInlineHost'), edh=document.getElementById('ceEditorHost'), btn=document.getElementById('btnCtrlOpenEditor');
  if(!ov||!svg||!inl||!edh) return;
  function isOpen(){ return ov.style.display!=='none'; }
  function fit(){ var m=document.querySelector('.menu-bar-row'); if(!m||!isOpen()) return; var r=m.getBoundingClientRect(); document.documentElement.style.setProperty('--cetop',Math.max(34,Math.ceil(r.bottom))+'px'); }
  window.addEventListener('resize',fit);
  function open(){ if(isOpen()) return; window.scrollTo(0,0); ov.style.display='block'; setTimeout(fit,0); setTimeout(fit,150); edh.appendChild(svg); if(window._getControllerEditorMode&&window._getControllerEditorMode()==='functional'&&window._feShow) window._feShow(); document.body.classList.add('dt-ce'); fit(); window._ceSetMode('edit'); if(window._ccRestore) window._ccRestore(); }
  function close(){ if(!isOpen()) return; window._ceSetMode(window._ceViewMode?window._ceViewMode():'test'); inl.appendChild(svg); ov.style.display='none'; document.body.classList.remove('dt-ce'); }
  window._ceCapAll=function(){ var o={};
    try{ o.m=window._getControllerEditorMode&&window._getControllerEditorMode(); }catch(_){}
    try{ o.key=window._feCurKey&&window._feCurKey(); }catch(_){}
    try{ o.midi=window._midiGetId&&window._midiGetId(); }catch(_){}
    try{ o.g=window._ceCapUI&&window._ceCapUI(); }catch(_){}
    return o; };
  window._ceApplyAll=function(u){ if(!u) return;
    try{ if(u.midi&&window._midiSetId) window._midiSetId(u.midi); }catch(_){}
    try{ if(u.key&&window._feSelect) window._feSelect(u.key); }catch(_){}
    try{ var mb=document.getElementById('btnCtrlMidi');
      if((u.m==='graphical'||u.m==='functional'||(u.m==='midi'&&mb&&mb.style.display!=='none'))&&window._setControllerEditorMode) window._setControllerEditorMode(u.m); }catch(_){}
    try{ if(u.g&&window._ceApplyUI) window._ceApplyUI(u.g); }catch(_){}
    try{ if(u.m==='functional'&&window._feShow) window._feShow(); }catch(_){}
  };
  window._ceOpen=open; window._ceClose=close; window._ceIsOpen=isOpen;
  if(btn) btn.addEventListener('click',function(){
    if(window._docTabs && window._docTabs.openControllerEditor) window._docTabs.openControllerEditor(); else open();
  });
})();

