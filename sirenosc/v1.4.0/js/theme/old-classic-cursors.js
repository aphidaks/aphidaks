
(function(){
  var MAP={'pointer':'arrow','default':'arrow','help':'arrow','context-menu':'arrow','copy':'arrow','alias':'arrow','text':'ibeam','vertical-text':'ibeam','wait':'wait','progress':'wait','crosshair':'cross','cell':'cross','zoom-in':'cross','zoom-out':'cross','not-allowed':'no','no-drop':'no','grab':'move','grabbing':'move','move':'move','all-scroll':'move','col-resize':'ew','ew-resize':'ew','e-resize':'ew','w-resize':'ew','row-resize':'ns','ns-resize':'ns','n-resize':'ns','s-resize':'ns','nwse-resize':'nwse','nesw-resize':'nesw'};
  function build(){
    var sh=document.getElementById('ocCurGen'); if(!sh){ sh=document.createElement('style'); sh.id='ocCurGen'; document.head.appendChild(sh); }
    var out=[];
    function walk(rules){
      for(var i=0;i<rules.length;i++){ var r=rules[i];
        if(r.cssRules&&!r.selectorText){ walk(r.cssRules); continue; }
        if(!r.style||!r.selectorText) continue;
        var c=(r.style.cursor||'').trim().toLowerCase(); if(!c||c.indexOf('url(')>=0) continue;
        var m=MAP[c.split(/[\s,]+/)[0]]; if(m) out.push('body.theme-old-classic :is('+r.selectorText+'){cursor:var(--oc-'+m+') !important}');
      } }
    for(var s=0;s<document.styleSheets.length;s++){ var ss=document.styleSheets[s]; if(ss.ownerNode===sh||ss.ownerNode.id==='ocCursors') continue; try{ walk(ss.cssRules); }catch(e){} }
    Object.keys(MAP).forEach(function(k){ var S='[style*="cursor:'+k+'"],[style*="cursor: '+k+'"]', m=MAP[k], d=(k==='grabbing'||k==='wait'||k==='progress');
      out.push('body.theme-old-classic:is('+S+'),body.theme-old-classic :is('+S+'){cursor:var(--oc-'+m+') !important}');
      if(d) out.push('body.theme-old-classic:is('+S+') *,body.theme-old-classic :is('+S+') *{cursor:var(--oc-'+m+') !important}'); });
    sh.textContent=out.join('\n');
  }
  function go(){ try{ build(); }catch(e){} }
  if(document.readyState==='complete') go(); else window.addEventListener('load',go);
  setTimeout(go,1500);
  var tm=0; try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++) for(var j=0;j<ms[i].addedNodes.length;j++){ var n=ms[i].addedNodes[j]; if(n.id!=='ocCurGen'&&(n.nodeName==='STYLE'||n.nodeName==='LINK')){ clearTimeout(tm); tm=setTimeout(go,300); return; } } }).observe(document.head,{childList:true}); }catch(e){}
})();
