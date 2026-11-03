
(function(){
  var cache={}, pats={}, busy=false, sc=null;
  function clamp(v){ return v<0?0:v>255?255:v; }
  function invHue(r,g,b){
    r=255-r; g=255-g; b=255-b;
    return [clamp(-0.574*r+1.43*g+0.144*b), clamp(0.426*r+0.43*g+0.144*b), clamp(0.426*r+1.43*g-0.856*b)];
  }
  function kindOf(cv){
    if(!cv) return 'other';
    if(cv._ocK) return cv._ocK;
    var k='other', id=cv.id||'';
    if(id==='chopperCanvasA'||id==='chopperCanvasB'||id.indexOf('extraChopperCanvas')===0||id.indexOf('recChopperCanv')===0||(cv.width===196&&cv.height===120)||(cv.closest&&cv.closest('.chopper-canvas-wrap'))) k='skip';
    else if(cv.closest && cv.closest('.simgraph')) k='mono';
    else if(id==='recLineCanvas'||id==='recOscCanvas') k='mono';
    else if(cv.className&&String(cv.className).indexOf('mfn-curve-canvas')>=0) k='mono';
    else if(id==='wiringCanvas') k='wire';
    cv._ocK=k; return k;
  }
  var TILES={
    sparse:function(x,y){return x%4===0&&y%4===0;}, dots:function(x,y){return x%2===0&&y%2===0;}, checker:function(x,y){return (x+y)%2===0;},
    up:function(x,y){return (x+y)%4===0;},  upD:function(x,y){return (x+y)%4<2;},
    down:function(x,y){return ((x-y)&3)===0;}, downD:function(x,y){return ((x-y)&3)<2;},
    horiz:function(x,y){return y%4===0;}, horizD:function(x,y){return y%2===0;},
    vert:function(x,y){return x%4===0;},  vertD:function(x,y){return x%2===0;},
    cross:function(x,y){return x%4===0||y%4===0;}, crossD:function(x,y){return x%2===0||y%2===0;}
  };
  function pattern(name){
    if(pats[name]) return pats[name];
    var t=document.createElement('canvas'); t.width=4; t.height=4;
    var c=t.getContext('2d'); c.fillStyle='#000';
    for(var y=0;y<4;y++)for(var x=0;x<4;x++) if(TILES[name](x,y)) c.fillRect(x,y,1,1);
    return (pats[name]=sc.createPattern(t,'repeat'));
  }
  function rgbOf(str){
    busy=true; sc.fillStyle='#010203'; sc.fillStyle=str; var n=sc.fillStyle; busy=false;
    if(n==='#010203') return null;
    var m;
    if(n.charAt(0)==='#') return [parseInt(n.substr(1,2),16),parseInt(n.substr(3,2),16),parseInt(n.substr(5,2),16),1];
    if((m=/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(n))) return [+m[1],+m[2],+m[3],m[4]!==undefined?+m[4]:1];
    return null;
  }
  function patName(r,g,b){
    var mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=.2126*r+.7152*g+.0722*b, d=l<120;
    if(mx-mn<38) return l<85?'checker':l<150?'dots':'sparse';
    var h; var dl=mx-mn;
    if(mx===r) h=((g-b)/dl+6)%6; else if(mx===g) h=(b-r)/dl+2; else h=(r-g)/dl+4;
    var f=Math.floor(h+.5)%6;
    return [d?'upD':'up', d?'horizD':'horiz', d?'vertD':'vert', d?'downD':'down', d?'crossD':'cross', d?'checker':'dots'][f];
  }
  function map(str,kind,fill){
    var key=kind+(fill?'F':'S')+'|'+str, hit=cache[key]; if(hit!==undefined) return hit;
    var out=str;
    try{
      if(!sc) sc=document.createElement('canvas').getContext('2d');
      var c=rgbOf(str);
      if(c){
        var r=c[0],g=c[1],b=c[2],a=c[3];
        if(kind==='mono'||kind==='wire'){ var t=invHue(r,g,b); r=t[0]; g=t[1]; b=t[2]; }
        var l=.2126*r+.7152*g+.0722*b;
        if(l>=225) out=a<1?'rgba(255,255,255,'+a+')':'#ffffff';
        else if(fill && kind!=='mono' && l>40 && a>=.5) out=pattern(patName(r,g,b));
        else out=a<1?'rgba(0,0,0,'+a+')':'#000000';
      }
    }catch(e){ busy=false; }
    cache[key]=out; return out;
  }
  var P=window.CanvasRenderingContext2D&&CanvasRenderingContext2D.prototype; if(!P) return;
  ['fillStyle','strokeStyle','shadowColor'].forEach(function(prop){
    var d=Object.getOwnPropertyDescriptor(P,prop); if(!d||!d.set) return;
    Object.defineProperty(P,prop,{configurable:true,enumerable:d.enumerable,
      get:d.get,
      set:function(v){ if(window._ocOn && !busy && typeof v==='string'){ var k=kindOf(this.canvas); if(k!=='skip') v=map(v,k,prop==='fillStyle'); } d.set.call(this,v); }});
  });
  ['createLinearGradient','createRadialGradient'].forEach(function(fn){
    var o=P[fn]; if(!o) return;
    P[fn]=function(){ var g=o.apply(this,arguments); try{ g._ocK=kindOf(this.canvas); }catch(e){} return g; };
  });
  var G=window.CanvasGradient&&CanvasGradient.prototype;
  if(G&&G.addColorStop){ var oa=G.addColorStop; G.addColorStop=function(o,c){ if(window._ocOn&&typeof c==='string'&&this._ocK!=='skip') c=map(c,this._ocK||'other',false); return oa.call(this,o,c); }; }
  var oi=P.drawImage; if(oi) P.drawImage=function(){ if(window._ocOn&&kindOf(this.canvas)!=='skip') this.imageSmoothingEnabled=false; return oi.apply(this,arguments); };
})();
