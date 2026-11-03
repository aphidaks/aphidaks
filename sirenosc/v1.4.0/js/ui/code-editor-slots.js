
(function(){
  if(window.CSS&&CSS.supports&&CSS.supports('field-sizing','content')) return;
  var raf=0, probe=null;
  function fit(el){
    if(!el.isConnected) return;
    if(el.tagName==='SELECT'){
      if(!probe){ probe=document.createElement('select'); probe.style.cssText='position:absolute;visibility:hidden;width:auto;left:-9999px;top:0'; probe.appendChild(document.createElement('option')); }
      var cs=getComputedStyle(el); probe.style.font=cs.font; probe.style.letterSpacing=cs.letterSpacing; probe.style.padding=cs.padding; probe.style.border=cs.border; probe.style.textTransform=cs.textTransform;
      probe.firstChild.textContent=(el.options[el.selectedIndex]||{}).text||'';
      el.parentNode.appendChild(probe); var w=probe.getBoundingClientRect().width; el.parentNode.removeChild(probe);
      var z=window._uiZoom||1; if(w) el.style.width=Math.ceil(w/z)+'px';
    } else if(el.tagName==='INPUT'){ el.size=Math.max(2,Math.min(30,el.value.length+1)); }
  }
  function all(){ raf=0; document.querySelectorAll('#feWork .fs-slot select,#fePalette .fs-slot select,#feWork .fs-slot input,#fePalette .fs-slot input').forEach(fit); }
  function soon(){ if(!raf) raf=requestAnimationFrame(all); }
  document.addEventListener('DOMContentLoaded',function(){
    ['feWork','fePalette'].forEach(function(id){ var e=document.getElementById(id); if(e) new MutationObserver(soon).observe(e,{childList:true,subtree:true}); });
    document.addEventListener('change',function(e){ var t=e.target; if(t&&t.closest&&t.closest('.fs-slot')) fit(t); },true);
    document.addEventListener('input',function(e){ var t=e.target; if(t&&t.closest&&t.closest('.fs-slot')) fit(t); },true);
    soon();
  });
})();
