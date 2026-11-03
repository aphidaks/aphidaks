
(function(){
  var vst = document.querySelector('.vst'); if(!vst) return;
  Array.prototype.slice.call(vst.children).forEach(function(el){
    if(el.classList && el.classList.contains('popup-overlay')) document.body.appendChild(el);
  });
})();
