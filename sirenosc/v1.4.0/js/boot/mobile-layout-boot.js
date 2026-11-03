
(function(){
  var KEY='sirenosc_ui_settings', mql=null;
  function settings(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function mode(){ var m=settings().mobileLayout; return (m==='on'||m==='off')?m:'auto'; }
  function phoneLike(){
    var coarse=false; try{ coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches); }catch(e){}
    var ua=/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var narrow=Math.min(window.screen&&screen.width||9999, window.innerWidth||9999)<=820;
    return (coarse||ua) && narrow;
  }
  function isActive(m){ m=m||mode(); return m==='on' || (m==='auto' && phoneLike()); }
  function setViewport(on){
    var head=document.head||document.documentElement, mv=document.getElementById('mlViewport');
    if(on){
      if(!mv){ mv=document.createElement('meta'); mv.id='mlViewport'; mv.name='viewport'; head.appendChild(mv); }
      mv.setAttribute('content','width=device-width, initial-scale=1, viewport-fit=cover');
    } else if(mv){ mv.parentNode.removeChild(mv); }
  }
  function apply(m,noSave){
    if(m && !noSave){ var s=settings(); s.mobileLayout=m; try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} }
    var on=isActive(m);
    window._mobileOn=on;
    document.documentElement.classList.toggle('mobile-layout',on);
    setViewport(on);
    if(document.body){ document.body.classList.toggle('mobile-layout',on); }
    try{ document.querySelectorAll('.menu-ml-item').forEach(function(it){ it.classList.toggle('active-ml',it.getAttribute('data-ml')===mode()); }); }catch(e){}
    var b=document.getElementById('menuMobileBadge'); if(b) b.textContent=mode().toUpperCase();
    if(window._applyUiZoom) window._applyUiZoom();
    if(window._topHRefresh) window._topHRefresh();
    return on;
  }
  window._mobileLayout={mode:mode,active:function(){ return !!window._mobileOn; },apply:apply};
  window._mobileOn=isActive();
  document.documentElement.classList.toggle('mobile-layout',window._mobileOn);
  setViewport(window._mobileOn);
  document.addEventListener('DOMContentLoaded',function(){ apply(null,true); });
  var t=0; function again(){ clearTimeout(t); t=setTimeout(function(){ if(mode()==='auto' && isActive()!==!!window._mobileOn) apply(null,true); },200); }
  window.addEventListener('orientationchange',again);
})();
