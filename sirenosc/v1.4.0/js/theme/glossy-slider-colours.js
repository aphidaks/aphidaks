
(function(){
  var raf=0;
  function sync(){
    raf=0; if(!document.documentElement.classList.contains('glossy')) return;
    document.querySelectorAll('input[type=range]').forEach(function(el){
      var c=''; try{ c=getComputedStyle(el).accentColor; }catch(e){}
      if(!c||c==='auto'){ if(el.style.getPropertyValue('--sl')) el.style.removeProperty('--sl'); return; }
      if(el.style.getPropertyValue('--sl')!==c) el.style.setProperty('--sl',c);
    });
  }
  function soon(){ if(!raf) raf=requestAnimationFrame(sync); }
  window._syncSliderColors=soon;
  function start(){
    soon();
    try{ new MutationObserver(soon).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']}); }catch(e){}
    new MutationObserver(soon).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
