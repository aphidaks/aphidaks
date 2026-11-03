
(function(){
  var ML=window._mobileLayout; if(!ML) return;
  var items=document.querySelectorAll('.menu-ml-item');
  items.forEach(function(it){
    it.addEventListener('click',function(e){
      e.stopPropagation();
      ML.apply(it.getAttribute('data-ml'));
      try{ window.dispatchEvent(new Event('resize')); }catch(_){}
      document.querySelectorAll('.menu-item').forEach(function(m){ m.classList.remove('open'); });
    });
  });
  document.querySelectorAll('.menu-has-sub').forEach(function(ent){
    ent.addEventListener('click',function(e){
      if(!ML.active()) return;
      if(e.target.closest && e.target.closest('.menu-sub')) return;
      var was=ent.classList.contains('sub-open');
      ent.parentNode.querySelectorAll(':scope > .menu-has-sub.sub-open').forEach(function(x){ x.classList.remove('sub-open'); });
      if(!was) ent.classList.add('sub-open');
    });
  });
  document.querySelectorAll('.menu-item > .menu-btn').forEach(function(b){
    b.addEventListener('click',function(){ document.querySelectorAll('.menu-has-sub.sub-open').forEach(function(x){ x.classList.remove('sub-open'); }); });
  });
  ML.apply(null,true);
})();
