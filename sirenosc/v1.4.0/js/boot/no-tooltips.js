
(function(){
  try{
    Object.defineProperty(HTMLElement.prototype, 'title', { get: function(){ return ''; }, set: function(){}, configurable: true });
    var sa = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(n, v){ if(String(n).toLowerCase() === 'title') return; return sa.apply(this, arguments); };
  }catch(e){}
  function strip(root){
    try{
      if(!root || root.nodeType !== 1) return;
      if(root.hasAttribute && root.hasAttribute('title')) root.removeAttribute('title');
      var a = root.querySelectorAll ? root.querySelectorAll('[title], svg title') : [];
      for(var i = 0; i < a.length; i++){ if(a[i].tagName && a[i].tagName.toLowerCase() === 'title') a[i].remove(); else a[i].removeAttribute('title'); }
      if(root.tagName && root.tagName.toLowerCase() === 'title' && root.namespaceURI === 'http://www.w3.org/2000/svg') root.remove();
    }catch(e){}
  }
  var mo = new MutationObserver(function(ms){
    for(var i = 0; i < ms.length; i++){
      var m = ms[i];
      if(m.type === 'attributes'){ if(m.target.hasAttribute('title')) m.target.removeAttribute('title'); }
      else for(var j = 0; j < m.addedNodes.length; j++) strip(m.addedNodes[j]);
    }
  });
  function start(){ strip(document.documentElement); mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] }); }
  if(document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
})();
