
(function(){
  var host=null, list=null, sec=null, lastSig='';
  var VANE=[['length','Vane Length',{min:10,max:100,step:1,value:100}],['innerOffset','Vane Inner Offset',{min:0,max:100,step:1,value:50}],['outerOffset','Vane Outer Offset',{min:0,max:100,step:1,value:50}],['angle','Vane Angle',{min:0,max:100,step:1,value:50}],['initialHeight','Vane Initial Height',{min:0,max:100,step:1,value:100}],['finalHeight','Vane Final Height',{min:0,max:100,step:1,value:100}]];
  var ROT_ST=[['centerDiameter','Center Diameter',{min:0,max:100,step:1,value:0}],['markSpace','Mark-Space Ratio',{min:5,max:95,step:1,value:50}],['tolerance','Rotor Tolerance',{min:0,max:100,step:1,value:0}],['rotorWall','Rotor Wall Thickness',{min:1,max:22,step:0.5,value:4.5},1],['statorWall','Stator Wall Thickness',{min:1,max:14,step:0.5,value:4.5},1]];
  var ROT_MT=[['layerDiameterOffset','Layer Diameter Offset',{min:10,max:95,step:1,value:55}]];
  var AUTOLBL={innerOffset:'Dispersion',outerOffset:'HPF',angle:'Dispersion',length:'Vane Mixer',centerDiameter:'Vane Mixer',markSpace:'HPF',tolerance:'Sound Output'};

  function el(tag, cls, text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
  function val(id, fb){ var e=document.getElementById(id); var v=e&&typeof e.value==='string'?e.value.trim():''; return v||fb; }
  function color(id){ var e=document.getElementById(id); return (e&&/^#[0-9a-f]{6}$/i.test(e.value))?e.value:'#757575'; }

  function autoRow(field){
    var r=el('div','rc-auto');
    r.appendChild(el('span','rc-auto-lbl','Modifies: '+AUTOLBL[field]));
    var l=el('label','toggle'), c=document.createElement('input'); c.type='checkbox'; c.dataset.rcAuto=field;
    l.appendChild(c); l.appendChild(el('span','toggle-slider'));
    r.appendChild(l); r.appendChild(el('span','rc-auto-lbl','AUTO'));
    return r;
  }
  function grid(fields, withAuto){
    var g=el('div','rc-grid');
    fields.forEach(function(f){
      var w=el('div','entry'+(f[3]?' rc-wide':'')); w.appendChild(el('label',null,f[1]));
      var i=document.createElement('input'); i.type='range'; i.dataset.rcField=f[0];
      var at=f[2]||{min:0,max:100,step:1,value:0};
      for(var k in at) i.setAttribute(k,at[k]);
      var row=el('div','rc-slider'), rv=el('span','rc-val',i.value+'%');
      i.addEventListener('input',function(){ rv.textContent=this.value+'%'; });
      row.appendChild(i); row.appendChild(rv); w.appendChild(row);
      if(withAuto && AUTOLBL[f[0]]) w.appendChild(autoRow(f[0]));
      g.appendChild(w);
    });
    return g;
  }
  var cache={}, ver=0;
  window.rcVer=function(){ return ver; };
  function numOf(inp,def){ var v=inp?parseFloat(inp.value):NaN; return isNaN(v)?def:v; }
  function cardOf(kind,key){ return host&&host.querySelector('[data-rc-kind="'+kind+'"][data-rc-key="'+key+'"]'); }
  window.rcParam=function(kind,key,field,def){
    var ck=kind+'|'+key+'|'+field; if(ck in cache) return cache[ck];
    var c=cardOf(kind,key), v=def;
    if(c){ var src=(c.dataset.rcMode==='global'||field==='centerDiameter')?document.getElementById('rcCardGlobal'):c; v=numOf(src.querySelector('[data-rc-field="'+field+'"]'),def); }
    if(c) cache[ck]=v;
    return v;
  };
  var MAXTILT=28*Math.PI/180;
  window.rcTilt=function(key){ var p=Math.max(0,Math.min(100,window.rcParam('vane',key,'innerOffset',50))); return (p-50)/50*MAXTILT; };
  window.rcInnerEnd=function(key,R,endR){ var t=window.rcTilt(key), k=Math.min(1,Math.abs(t)/MAXTILT*5); return [t, Math.max(endR, R*0.07*k)]; };
  function hexRgb(h){ var m=/^#([0-9a-f]{6})$/i.exec(h||''); if(!m) return '117,117,117'; var n=parseInt(m[1],16); return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255); }
  function R_(k,f,d){ return window.rcParam('rotor',k,f,d); }
  function V_(k,f,d){ return window.rcParam('vane',k,f,d); }
  function sg(){ return window._spinDir==='ccw'?-1:1; }
  function effTol(t){ return t<=2?t*7:14+(t-2)*86/98; }
  function autoOn(kind,key,field){ var g=document.getElementById('rcCardGlobal'), a=g&&g.querySelector('[data-rc-auto="'+field+'"]'); return !!(a&&a.checked); }
  function parentOf(vk){ var c=cardOf('vane',vk); return c?c.dataset.rcParent:''; }
  window.rcParentOf=parentOf;
  window.rcPortsOf=function(rk){ function n(id,d){ var e=document.getElementById(id), v=e?parseFloat(e.value):NaN; return v>0?v:d; } if(rk==='hp') return n('eHigherPort',12); if(rk==='lp') return n('eLowerPort',10); try{ var eo=extraOscs.filter(function(e){return String(e.id)===String(rk);})[0]; return eo?(parseFloat(eo.value)||12):12; }catch(e){ return 12; } };
  window.rcMark=function(rk){ return Math.max(5,Math.min(95,R_(rk,'markSpace',50))); };
  window.rcRotorScale=function(rk){ return 1-effTol(Math.max(0,Math.min(100,R_(rk,'tolerance',0))))/100*0.14; };
  window.rcFlip=function(rk){ return R_(rk,'flip',0)>0.5; };
  window.rcLayering=function(){ var s=document.querySelector('#rcGlobalLayering select'); return s?s.value:''; };
  window.rcLayer=function(){ if(window.rcLayering()==='pass') return 1; var g=document.getElementById('rcCardGlobal'), v=numOf(g&&g.querySelector('[data-rc-field="layerDiameterOffset"]'),55); return Math.max(10,Math.min(95,v))/100; };
  window.rcVane=function(vk,rk,ports,n,R,endR){
    var inner=V_(vk,'innerOffset',50), outer=V_(vk,'outerOffset',50), len=V_(vk,'length',100), ang=V_(vk,'angle',50);
    var span=2*Math.PI/Math.max(1,ports), M=span*window.rcMark(rk)/100/2*0.95, maxOut=Math.min(18*Math.PI/180,M);
    var inS=(Math.max(0,Math.min(100,inner))-50)/50*MAXTILT, outS=(Math.max(0,Math.min(100,outer))-50)/50*maxOut;
    var centerR=Math.max(0,Math.min(100,R_(rk,'centerDiameter',0)))/100*R*0.85, hub=R*0.065;
    var r0=Math.max(endR,centerR,hub); var lenF=Math.max(10,Math.min(100,len))/100;
    var step=2*Math.PI/Math.max(1,n), angS=(Math.max(0,Math.min(100,ang))-50)/50, sk=angS*step*0.9*sg();
    sk=Math.max(-M-outS,Math.min(M-outS,sk));
    return {a0:inS,a1:outS,r0:r0,lenF:lenF,h0:Math.max(0,Math.min(100,V_(vk,'initialHeight',100)))/100,h1:Math.max(0,Math.min(100,V_(vk,'finalHeight',100)))/100,sk:sk,ang:Math.abs(angS),centerR:centerR};
  };
  window.rcDrawVanes=function(ctx,vk,rk,ports,n,R,endR,color){
    var g=window.rcVane(vk,rk,ports,n,R,endR), rgb=hexRgb(color), spanP=2*Math.PI/Math.max(1,ports), Mk=spanP*window.rcMark(rk)/100/2*0.95;
    ctx.save(); ctx.lineWidth=2.5; if(window._vaneLvl!==undefined) ctx.globalAlpha=window._vaneLvl;
    if(window.rcFlip(rk)) ctx.scale(1,-1);
    for(var i=0;i<n;i++){
      var a=i/n*Math.PI*2, a0=a+g.a0, a1=a+g.a1;
      var pc=Math.round(a/spanP)*spanP, lo=Math.min(a1,a1+g.sk), hi=Math.max(a1,a1+g.sk), sh=0;
      if(lo<pc-Mk) sh=pc-Mk-lo; else if(hi>pc+Mk) sh=pc+Mk-hi;
      a1+=sh;
      var x1=Math.cos(a1)*R, y1=Math.sin(a1)*R, x0=x1+(Math.cos(a0)*g.r0-x1)*g.lenF, y0=y1+(Math.sin(a0)*g.r0-y1)*g.lenF;
      if(g.ang>0){ var a2=a1+g.sk; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); var x2=Math.cos(a2)*R, y2=Math.sin(a2)*R; ctx.arc(0,0,R,a1,a2,a2<a1); ctx.closePath(); var gg=ctx.createLinearGradient(x0,y0,(x1+x2)/2,(y1+y2)/2); gg.addColorStop(0,'#222'); gg.addColorStop(.35,'#3a3a3a'); gg.addColorStop(1,'#f2f2f2'); ctx.fillStyle=gg; ctx.fill(); }
      var st=color;
      if(g.h0<1||g.h1<1){ var gr=ctx.createLinearGradient(x0,y0,x1,y1); gr.addColorStop(0,'rgba('+rgb+','+g.h0+')'); gr.addColorStop(1,'rgba('+rgb+','+g.h1+')'); st=gr; }
      ctx.strokeStyle=st; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    }
    if(g.centerR>1){ ctx.beginPath(); ctx.arc(0,0,g.centerR,0,Math.PI*2); ctx.fillStyle='rgba(21,22,24,.92)'; ctx.fill();
      var cg=ctx.createRadialGradient(0,0,0,0,0,g.centerR); cg.addColorStop(0,'rgba('+rgb+',.10)'); cg.addColorStop(1,'rgba('+rgb+',.34)'); ctx.fillStyle=cg; ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0,0,R*0.05,0,Math.PI*2); ctx.fillStyle='#0e0f11'; ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
    ctx.restore();
  };
  window.rcDispersionAdd=function(){
    if(!host) return 0; var sum=0;
    Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="vane"]'),function(c){
      var k=c.dataset.rcKey;
      if(autoOn('vane',k,'innerOffset')) sum+=(Math.max(0,Math.min(100,V_(k,'innerOffset',50)))-50)/50*10*sg();
      if(autoOn('vane',k,'angle')) sum+=(Math.max(0,Math.min(100,V_(k,'angle',50)))-50)/50*25*sg();
    });
    return sum;
  };
  window.rcHpfAdd=function(){
    if(!host) return 0; var sum=0;
    Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="vane"]'),function(c){
      var k=c.dataset.rcKey; if(autoOn('vane',k,'outerOffset')) sum-=Math.abs(V_(k,'outerOffset',50)-50)/50*500;
    });
    Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="rotor"]'),function(c){
      var k=c.dataset.rcKey; if(autoOn('rotor',k,'markSpace')) sum+=Math.abs(R_(k,'markSpace',50)-50)/50*3000;
    });
    return sum;
  };
  window.rcGainMul=function(key){
    if(!host) return 1;
    if(key==='hv'||key==='lv'){
      var rk=key==='hv'?'hp':'lp', mix=100, on=false;
      if(autoOn('rotor',rk,'centerDiameter')){ mix-=Math.min(60,R_(rk,'centerDiameter',0)*0.6); on=true; }
      if(autoOn('vane',key,'length')){ mix-=V_(key,'length',100)/100*50; on=true; }
      return on?Math.max(0,mix)/100:1;
    }
    if(key==='hp'||key==='lp'){
      var m=1;
      if(autoOn('rotor',key,'tolerance')) m*=(100-Math.max(0,Math.min(75,(effTol(R_(key,'tolerance',0))-13)/87*75)))/100;
      if(key==='lp'){
        var ch=document.getElementById('dChopper'), ls=document.querySelector('#rcGlobalLayering select');
        if(ch&&ch.value==='double'&&ls&&ls.value==='solid') m*=0.9;
      }
      return m;
    }
    return 1;
  };
  function resetCard(card){
    card.querySelectorAll('[data-rc-field]').forEach(function(x){
      if(x.tagName==='SELECT') x.selectedIndex=0; else x.value=x.defaultValue;
      var rv=x.parentNode&&x.parentNode.querySelector('.rc-val'); if(rv) rv.textContent=x.value+'%';
    });
    if(card.id==='rcCardGlobal'){ card.querySelectorAll('[data-rc-auto]').forEach(function(c){ c.checked=false; }); }
    changed();
  }
  function changed(){
    cache={}; ver++;
    drawPreviews();
    try{
      if(typeof posRecalc==='function') posRecalc();
      if(typeof updateHpfParams==='function') updateHpfParams();
      if(typeof pushGains==='function') pushGains(0.05);
      if(typeof updateEffectiveDispersion==='function') updateEffectiveDispersion();
      if(typeof redrawChoppers==='function' && typeof chopperAnimEnabled!=='undefined' && !chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
    }catch(e){}
  }
  function layering(){
    var w=el('div','entry rc-wide'); w.appendChild(el('label',null,'Layering Type'));
    var s=document.createElement('select'); s.dataset.rcField='layeringType';
    [['','Not set'],['solid','Solid'],['pass','Passthrough']].forEach(function(x){ var o=document.createElement('option'); o.value=x[0]; o.textContent=x[1]; s.appendChild(o); });
    w.appendChild(s); return w;
  }
  function preview(){
    var p=el('div','rc-preview'); var c=document.createElement('canvas'); c.width=120; c.height=120; c.dataset.rcPreview='1';
    p.appendChild(c); p.appendChild(el('div','rc-sub','Rotor Preview')); p.lastChild.style.margin='0'; return p;
  }
  function flipSel(){
    var w=el('div','entry rc-wide'); w.appendChild(el('label',null,'Flip Rotor'));
    var s=document.createElement('select'); s.dataset.rcField='flip';
    [['0','Normal'],['1','Flipped']].forEach(function(x){ var o=document.createElement('option'); o.value=x[0]; o.textContent=x[1]; s.appendChild(o); });
    w.appendChild(s); return w;
  }
  function rotorFields(withPreview, withLayering){
    var f=el('div','rc-fields');
    var st=el('div','rc-st'); st.appendChild(grid(ROT_ST.filter(function(x){ return x[0]!=='centerDiameter'; })));
    st.appendChild(flipSel());
    f.appendChild(st);
    if(withPreview) f.appendChild(preview());
    return f;
  }

  function setMode(card, mode){
    card.dataset.rcMode=mode;
    var b=card.querySelector('.rc-mode'); if(b){ b.textContent=mode==='global'?'GLOBAL':'LOCAL'; b.title=mode==='global'?'Using the Global card. Click to use local parameters':'Using local parameters. Click to use the Global card'; }
    card.querySelectorAll('.rc-fields input:not([data-rc-auto]), .rc-fields select').forEach(function(x){ x.disabled = mode==='global'; });
  }

  function makeCard(kind, key, parent){
    var d=el('div','rc-card'+(kind==='vane'?' rc-vane':''));
    d.dataset.rcKind=kind; d.dataset.rcKey=key; if(parent) d.dataset.rcParent=parent;
    var head=el('div','rc-card-head');
    head.appendChild(el('span','rc-dot')); head.appendChild(el('span','rc-title'));
    var b=el('button','vbtn btn-gray rc-mode'); b.type='button';
    b.addEventListener('click', function(){ setMode(d, d.dataset.rcMode==='global'?'local':'global'); changed(); });
    var rb=el('button','vbtn btn-gray rc-reset','RESET'); rb.type='button'; rb.title='Reset this card to its defaults';
    rb.addEventListener('click', function(){ resetCard(d); });
    head.appendChild(rb); head.appendChild(b);
    var body=el('div','rc-body');
    if(kind==='vane'){ var f=el('div','rc-fields'); f.appendChild(grid(VANE)); body.appendChild(f); }
    else body.appendChild(rotorFields(true,false));
    d.appendChild(head); d.appendChild(body);
    setMode(d,'global');
    return d;
  }
  function paint(d, title, col){
    var t=d.querySelector('.rc-title'); t.textContent=title; t.title=title;
    d.style.setProperty('--rc-color', col);
    if(d.dataset.rcKind==='vane'){
      d.style.setProperty('border-left-color', col+'66','important');
      ['top','right','bottom'].forEach(function(s){ d.style.setProperty('border-'+s+'-color', col+'1F','important'); });
    }
  }

  function collect(){
    var rotors=[], byKey={}, vanes=[];
    Array.prototype.forEach.call(list.children, function(e){
      var id=e.id||'', m;
      if(id==='permOscHp'||id==='permOscLp'){
        var p=id.slice(7), r={key:p.toLowerCase(), name:val('permName'+p,p==='Hp'?'High Rotor':'Low Rotor'), color:color('permColor'+p), vanes:[]};
        rotors.push(r); byKey[r.key]=r;
      } else if(id==='permOscHv'||id==='permOscLv'){
        var v=id.slice(7);
        vanes.push({key:v.toLowerCase(), parent:v==='Hv'?'hp':'lp', name:val('permName'+v,v==='Hv'?'High Vanes':'Low Vanes'), color:color('permColor'+v)});
      } else if((m=/^eoItem(\d+)$/.exec(id))){
        var n=m[1], t=document.getElementById('eoType'+n), type=t?t.value:'rotor';
        if(type==='rotor' && !e.dataset.parentRotor){
          var rr={key:n, name:val('eoName'+n,'Rotor '+n), color:color('eoColor'+n), vanes:[]}; rotors.push(rr); byKey[n]=rr;
        } else if(type==='vane' && e.dataset.parentRotor){
          vanes.push({key:n, parent:String(e.dataset.parentRotor), name:val('eoName'+n,'Vane '+n), color:color('eoColor'+n)});
        }
      }
    });
    vanes.forEach(function(v){ if(byKey[v.parent]) byKey[v.parent].vanes.push(v); });
    return rotors;
  }

  function render(){
    if(!host||!list) return;
    var rotors=collect(), dc=document.getElementById('dChopper'), multi=!!dc&&dc.value==='double', sig=JSON.stringify([rotors,multi]);
    if(sig===lastSig) return; lastSig=sig;
    var existing={};
    Array.prototype.forEach.call(host.children, function(c){ existing[c.dataset.rcKind+':'+c.dataset.rcKey]=c; });
    var keep={};
    function place(kind,key,parent,title,col,hide){
      var k=kind+':'+key, c=existing[k]||makeCard(kind,key,parent);
      c.dataset.rcParent=parent||''; paint(c,title,col); c.style.display=hide?'none':''; host.appendChild(c); keep[k]=1;
    }
    var hpR=null, lpR=null;
    if(multi) rotors.forEach(function(r){ if(r.key==='hp') hpR=r; else if(r.key==='lp') lpR=r; });
    var merge=!!(hpR&&lpR);
    rotors.forEach(function(r){
      if(merge&&r===lpR){ place('rotor',r.key,'',r.name,r.color,true); return; }
      var rn=(merge&&r===hpR)?'Rotor':r.name;
      place('rotor',r.key,'',rn,r.color);
      r.vanes.forEach(function(v){ place('vane',v.key,r.key,rn+' - '+v.name,v.color); });
      if(merge&&r===hpR) lpR.vanes.forEach(function(v){ place('vane',v.key,lpR.key,rn+' - '+v.name,v.color); });
    });
    Object.keys(existing).forEach(function(k){ if(!keep[k]) host.removeChild(existing[k]); });
    cache={};
  }

  function drawPreview(card){
    var cv=card.querySelector('canvas[data-rc-preview]'); if(!cv) return;
    var key=card.dataset.rcKey, rcol=card.style.getPropertyValue('--rc-color')||'#757575', ports=12;
    function ex(k){ try{ return extraOscs.filter(function(e){ return String(e.id)===String(k); })[0]||null; }catch(e){ return null; } }
    function numz(id,d){ var e=document.getElementById(id), v=e?parseFloat(e.value):NaN; return isNaN(v)?d:v; }
    function num(id,d){ var v=numz(id,d); return v<=0?d:v; }
    if(key==='hp') ports=num('eHigherPort',12);
    else if(key==='lp') ports=num('eLowerPort',10);
    else { var eo=ex(key); ports=eo?(parseFloat(eo.value)||1):12; }
    var sets=[], dcm0=document.getElementById('dChopper'), multi0=!!dcm0&&dcm0.value==='double'&&key==='hp'&&!!cardOf('rotor','lp');
    function live(vk){
      try{
        if(vk==='hv') return typeof isVaneVisible==='function'?isVaneVisible('hv'):true;
        if(vk==='lv') return typeof isVaneVisible==='function'?isVaneVisible('lv'):true;
        var ve=ex(vk); return !ve || (ve.visible!==false && ve.enabled!==false);
      }catch(e){ return true; }
    }
    var innSets=[];
    Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="vane"]'),function(vc){
      var par=vc.dataset.rcParent, isInnerXtra=multi0&&par==='lp'&&vc.dataset.rcKey!=='lv';
      if(par!==key&&!isInnerXtra) return;
      var vk=vc.dataset.rcKey; if(!live(vk)) return;
      if(multi0&&vk==='lv') return;
      var col=vc.style.getPropertyValue('--rc-color')||'#757575', n, len;
      if(vk==='hv'){ n=num('eHigherVanes',5); len=numz('sHVane',50)/100; }
      else if(vk==='lv'){ n=num('eLowerVanes',4); len=numz('sLVane',50)/100; }
      else { var ve=ex(vk); n=ve?(parseFloat(ve.value)||1):1; len=ve?((ve.mixerVal ?? 50)/100):0.5; if(ve&&ve.customColor) col=ve.customColor; }
      (isInnerXtra?innSets:sets).push({n:Math.max(1,Math.round(n)), len:len, col:col, key:vk, tilt:window.rcTilt(vk)});
    });
    var multi=multi0, inn=null;
    if(multi){
      var lvc=host.querySelector('[data-rc-kind="vane"][data-rc-key="lv"]');
      inn={ports:num('eLowerPort',10), n:Math.max(1,Math.round(num('eLowerVanes',4))), len:numz('sLVane',50)/100, show:!!lvc&&live('lv'), col:(lvc&&lvc.style.getPropertyValue('--rc-color'))||'#757575', rcol:(cardOf('rotor','lp')&&cardOf('rotor','lp').style.getPropertyValue('--rc-color'))||'#757575', layer:window.rcLayer(), lt:window.rcLayering()};
    }
    var sig=JSON.stringify([ports,rcol,sets,innSets,ver,window._spinDir,window.rcRotorScale(key),inn]); if(cv._sig===sig) return; cv._sig=sig;
    var ctx=cv.getContext('2d'), W=cv.width, H=cv.height, R=W*0.42;
    ctx.clearRect(0,0,W,H);
    ctx.save(); ctx.translate(W/2,H/2);
    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fillStyle='#151618'; ctx.fill();
    window._rcNoTicks=true; window._rcKeyRotor=key; var f0=sets[0]; if(f0) window._rcKeyOuter=f0.key; var rest=sets.slice(1);
    if(typeof _drawChopperStrokes==='function'){
      if(inn) _drawChopperStrokes(ctx,R,ports,f0?f0.n:1,!!f0,f0?f0.len:0,true,R*inn.layer,inn.ports,inn.n,inn.show,inn.len,rcol,f0?f0.col:'#757575',inn.rcol,inn.col);
      else _drawChopperStrokes(ctx,R,ports,f0?f0.n:1,!!f0,f0?f0.len:0,false,0,0,0,false,0,rcol,f0?f0.col:'#757575','#757575','#757575');
    }
    window._rcNoTicks=false;
    var Rs=R*window.rcRotorScale(key);
    var pass0=window.rcLayering()==='pass', flo=(multi&&!pass0)?R*inn.layer*window.rcRotorScale('lp'):0;
    rest.forEach(function(st){
      var t=1, tk=Rs*0.22, endR=Rs-(tk+t*(Math.max(tk,Rs-flo)-tk));
      window.rcDrawVanes(ctx,st.key,key,ports,st.n,Rs,endR,st.col);
    });
    if(multi){ var Ri=R*inn.layer*window.rcRotorScale('lp');
      innSets.forEach(function(st){
        var t=1, tk=Ri*0.22, endR=Ri-(tk+t*(Ri-tk));
        window.rcDrawVanes(ctx,st.key,'lp',inn.ports,st.n,Ri,endR,st.col);
      }); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fillStyle='#444860'; ctx.fill();
  }
  function bestTxt(t){ return Math.abs(t)<0.02 ? 'ANY' : (t>0 ? 'CCW' : 'CW'); }
  function setBest(card, t){
    var b=card.querySelector('.rc-best');
    if(!b){ b=el('div','rc-best'); var body=card.querySelector('.rc-body'); (body||card).insertBefore(b,(body||card).firstChild); }
    var v='DIRECTION: '+bestTxt(t); if(b.textContent!==v) b.textContent=v;
  }
  function updateBest(){
    if(!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="rotor"]'),function(c){
      var key=c.dataset.rcKey, fl=window.rcFlip(key)?-1:1, t=0, n=0;
      Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="vane"]'),function(vc){
        var par=vc.dataset.rcParent; if(par===key || (key==='hp'&&par==='lp'&&c.style.display!=='none')){ t+=window.rcTilt(vc.dataset.rcKey)*fl; n++; }
      });
      if(!n){ var iv=Math.max(0,Math.min(100,window.rcParam('vane','hv','innerOffset',50))); t=(iv-50)/50*MAXTILT*fl; }
      setBest(c,t);
    });
    var g=document.getElementById('rcCardGlobal'); if(g){
      var gi=g.querySelector('[data-rc-field="innerOffset"]'), gf=g.querySelector('[data-rc-field="flip"]');
      var iv2=Math.max(0,Math.min(100,numOf(gi,50))); setBest(g,(iv2-50)/50*MAXTILT*(numOf(gf,0)>0.5?-1:1));
    }
  }
  function drawPreviews(){
    if(!host) return;
    try{ Array.prototype.forEach.call(host.querySelectorAll('[data-rc-kind="rotor"]'),drawPreview); }catch(e){}
    try{ updateBest(); }catch(e){}
  }
  setInterval(function(){ if(!document.hidden) drawPreviews(); },400);

  function syncMode(){
    var c=document.getElementById('dChopper');
    sec.classList.toggle('rc-multitone', !!c && c.value==='double');
    var g=document.getElementById('rcGlobalLayering'); if(g) g.style.display = sec.classList.contains('rc-multitone')?'':'none';
    var ld=sec.querySelector('#rcCardGlobal [data-rc-field="layerDiameterOffset"]'); if(ld&&ld.closest('.entry')) ld.closest('.entry').style.display = window.rcLayering()==='pass'?'none':'';
  }

  var queued=false;
  function schedule(){ if(queued) return; queued=true; requestAnimationFrame(function(){ queued=false; render(); syncMode(); drawPreviews(); }); }

  function buildGlobal(){
    var b=document.getElementById('rcBodyGlobal');
    var gc=document.getElementById('rcCardGlobal'), gr=el('button','vbtn btn-gray rc-reset','RESET'); gr.type='button'; gr.title='Reset the Global card to its defaults';
    gr.addEventListener('click', function(){ resetCard(gc); }); gc.querySelector('.rc-card-head').appendChild(gr);
    b.appendChild(el('div','rc-sub','Vane')); b.appendChild(grid(VANE));
    b.appendChild(el('div','rc-sub','Rotor'));
    var st=el('div','rc-st'); st.appendChild(grid(ROT_ST)); st.appendChild(flipSel());
    var mt=el('div','rc-mt'); var g=grid(ROT_MT); mt.appendChild(g);
    var lay=layering(); lay.id='rcGlobalLayering'; g.appendChild(lay);
    b.appendChild(st); b.appendChild(mt);
    b.appendChild(el('div','rc-sub','Auto'));
    var al=el('div','rc-autolist');
    [['innerOffset','Vane Inner Offset'],['outerOffset','Vane Outer Offset'],['angle','Vane Angle'],['length','Vane Length'],['centerDiameter','Center Diameter',1],['markSpace','Mark-Space Ratio',1],['tolerance','Rotor Tolerance',1]].forEach(function(x){
      var r=el('div','rc-autorow'+(x[2]?' rc-st':''));
      var t=el('div','rc-autotxt'); t.appendChild(el('span','rc-autoname',x[1])); t.appendChild(el('span','rc-auto-lbl','Modifies: '+AUTOLBL[x[0]]));
      var l=el('label','toggle'), c=document.createElement('input'); c.type='checkbox'; c.dataset.rcAuto=x[0];
      l.appendChild(c); l.appendChild(el('span','toggle-slider'));
      r.appendChild(t); r.appendChild(l); al.appendChild(r);
    });
    b.appendChild(al);
  }

  function readFields(root){
    var o={}; Array.prototype.forEach.call(root.querySelectorAll('[data-rc-field]'),function(x){ o[x.dataset.rcField]=x.value; }); return o;
  }
  window.rcGather=function(){
    if(!host||!sec) return null;
    var g=document.getElementById('rcCardGlobal'), autos={};
    if(g) Array.prototype.forEach.call(g.querySelectorAll('[data-rc-auto]'),function(c){ autos[c.dataset.rcAuto]=!!c.checked; });
    var cards=[];
    Array.prototype.forEach.call(host.children,function(c){
      if(!c.dataset.rcKind) return;
      cards.push({kind:c.dataset.rcKind,key:c.dataset.rcKey,mode:c.dataset.rcMode==='local'?'local':'global',fields:readFields(c)});
    });
    return {v:1,global:{fields:g?readFields(g):{},autos:autos},cards:cards};
  };
  var rcPending=null, rcPendingT=0;
  function writeFields(root,fields){
    if(!root||!fields) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-rc-field]'),function(x){
      var k=x.dataset.rcField; if(!(k in fields)) return;
      x.value=String(fields[k]);
      var rv=x.parentNode&&x.parentNode.querySelector('.rc-val'); if(rv&&x.tagName!=='SELECT') rv.textContent=x.value+'%';
    });
  }
  function applyPending(){
    var d=rcPending; if(!d||!host) return;
    var g=document.getElementById('rcCardGlobal');
    if(g){
      writeFields(g,d.global&&d.global.fields);
      Array.prototype.forEach.call(g.querySelectorAll('[data-rc-auto]'),function(c){ c.checked=!!(d.global&&d.global.autos&&d.global.autos[c.dataset.rcAuto]); });
    }
    var missing=0;
    (d.cards||[]).forEach(function(cd){
      var c=cardOf(cd.kind,cd.key); if(!c){ missing++; return; }
      writeFields(c,cd.fields); setMode(c,cd.mode==='local'?'local':'global');
    });
    syncMode(); changed();
    if(!missing||Date.now()-rcPendingT>15000) rcPending=null;
  }
  window.rcApply=function(d){
    if(!host||!sec) return;
    lastSig=''; render();
    if(!d){
      Array.prototype.forEach.call(host.children,function(c){ if(c.dataset.rcKind){ resetCard(c); setMode(c,'global'); } });
      var g=document.getElementById('rcCardGlobal'); if(g) resetCard(g);
      syncMode(); rcPending=null; return;
    }
    var m=window._eoIdMap;
    if(m&&d.cards) d={v:d.v,global:d.global,cards:d.cards.map(function(cd){
      var k=m[cd.key]; return (k!==undefined&&cd.key!=='hp'&&cd.key!=='lp'&&cd.key!=='hv'&&cd.key!=='lv')?Object.assign({},cd,{key:String(k)}):cd;
    })};
    rcPending=d; rcPendingT=Date.now(); applyPending();
  };
  function init(){
    host=document.getElementById('rotorConfigDynamic'); list=document.getElementById('extraOscList'); sec=document.getElementById('rotorConfigSec');
    if(!host||!list||!sec) return;
    buildGlobal(); render(); syncMode(); drawPreviews();
    sec.addEventListener('input',changed); sec.addEventListener('change',changed);
    new MutationObserver(schedule).observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:['data-parent-rotor','class']});
    ['input','change'].forEach(function(ev){
      document.addEventListener(ev,function(e){ var id=(e.target&&e.target.id)||''; if(/^(permName|permColor|eoName|eoColor|eoType|dChopper|eHigher|eLower|sHVane|sLVane|eo)/.test(id)) schedule(); },true);
    });
    setInterval(function(){ render(); if(rcPending) applyPending(); syncMode(); drawPreviews(); },1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
