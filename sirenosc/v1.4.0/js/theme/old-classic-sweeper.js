
(function(){
  var EX='#rpmDisplay,#dualMotor2RPMDisplay,.side-ind,#controllerSection,#ctrlEditorOverlay,.chopper-canvas-wrap,[id^="recChopperWrap"],#contactorRotorSvg,#rotDiagramSvg,#recRotSvg,#recContactorSvg,#posRangeCirclesSvg,#recMiniRangeCirclesSvg';
  var SKIP={SCRIPT:1,STYLE:1,CANVAS:1,OPTION:1,OPTGROUP:1,HEAD:1,LINK:1,META:1,TITLE:1,NOSCRIPT:1};
  var touched=[], on=false, dirty=true, mo=null, timer=0;
  function parse(c){ var m=/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(c||''); return m?[+m[1],+m[2],+m[3],m[4]!==undefined?+m[4]:1]:null; }
  function isCol(c){ var p=parse(c); return !!p && p[3]>0.05 && (Math.max(p[0],p[1],p[2])-Math.min(p[0],p[1],p[2]))>36; }
  function hasText(el){ for(var n=el.firstChild;n;n=n.nextSibling) if(n.nodeType===3&&n.nodeValue.trim()) return true; return false; }
  function setI(el,prop,val){
    var rec=el._ocRec||(el._ocRec={});
    if(!(prop in rec)) rec[prop]=[el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop),null];
    el.style.setProperty(prop,val,'important'); rec[prop][2]=el.style.getPropertyValue(prop);
    if(touched.indexOf(el)<0) touched.push(el);
  }
  function clearAll(){
    for(var i=0;i<touched.length;i++){ var el=touched[i], rec=el._ocRec; if(!rec) continue;
      for(var p in rec){ var r=rec[p];
        if(el.style.getPropertyValue(p)===r[2]&&el.style.getPropertyPriority(p)==='important'){ if(r[0]) el.style.setProperty(p,r[0],r[1]); else el.style.removeProperty(p); } }
      el._ocRec=null; }
    touched=[];
  }
  function sweep(){
    if(!on||!document.body) return;
    if(mo) mo.disconnect();
    try{
      clearAll();
      var skip=new Set();
      document.querySelectorAll(EX).forEach(function(r){ skip.add(r); r.querySelectorAll('*').forEach(function(d){ skip.add(d); }); });
      var els=document.body.querySelectorAll('*');
      for(var i=0;i<els.length;i++){
        var el=els[i];
        if(SKIP[el.tagName]||skip.has(el)||el instanceof SVGElement) continue;
        var cs=getComputedStyle(el), bg=cs.backgroundColor, p;
        if(isCol(bg)){
          p=parse(bg);
          if(p[3]>=.6&&el.children.length===0){ setI(el,'background-color','#000000'); if(hasText(el)) setI(el,'color','#ffffff'); }
          else setI(el,'background-color','transparent');
        }
        if(isCol(cs.color)&&!(el._ocRec&&el._ocRec.color)) setI(el,'color','#000000');
        ['Top','Right','Bottom','Left'].forEach(function(sd){ if(parseFloat(cs['border'+sd+'Width'])>0&&cs['border'+sd+'Style']!=='none'&&isCol(cs['border'+sd+'Color'])) setI(el,'border-'+sd.toLowerCase()+'-color','#000000'); });
        if(cs.accentColor&&cs.accentColor!=='auto'&&isCol(cs.accentColor)) setI(el,'accent-color','#000000');
        if(cs.boxShadow&&cs.boxShadow!=='none'&&isCol(cs.boxShadow)) setI(el,'box-shadow','none');
        if(cs.textShadow&&cs.textShadow!=='none'&&isCol(cs.textShadow)) setI(el,'text-shadow','none');
      }
    }catch(e){}
    dirty=false;
    if(mo&&on) mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','checked','value','hidden']});
  }
  window._ocSweepSet=function(v){
    on=!!v;
    if(on){
      if(!mo&&window.MutationObserver) mo=new MutationObserver(function(){ dirty=true; });
      if(!timer) timer=setInterval(function(){ if(on&&dirty&&!document.hidden) sweep(); },700);
      dirty=true; setTimeout(sweep,60);
    } else {
      if(mo) mo.disconnect();
      if(timer){ clearInterval(timer); timer=0; }
      clearAll();
    }
  };
})();
