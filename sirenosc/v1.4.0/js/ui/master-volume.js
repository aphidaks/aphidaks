
(function(){
  function init(){
    var m=document.getElementById('sMasterVol'), b=document.getElementById('sMasterVolBar'), t=document.getElementById('svMasterVolBar');
    if(!m||!b||!t) return;
    function fromMain(){ if(b.value!==m.value) b.value=m.value; t.textContent=m.value+'%'; }
    b.addEventListener('input',function(){ m.value=b.value; t.textContent=b.value+'%'; m.dispatchEvent(new Event('input',{bubbles:true})); });
    b.addEventListener('dblclick',function(){ b.value=100; b.dispatchEvent(new Event('input')); });
    m.addEventListener('input',fromMain);
    setInterval(fromMain,300);
    fromMain();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
