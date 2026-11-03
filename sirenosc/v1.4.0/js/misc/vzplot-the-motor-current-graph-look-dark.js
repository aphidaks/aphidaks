
window.vzPlot=function(cv,o){
  if(!cv) return null;
  if(cv.classList) cv.classList.add('vz-plot');
  var w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return null;
  var ctx=cv.getContext('2d');
  if(!o.prepared){
    var dpr=(typeof hiResK==='function'?hiResK():(window.devicePixelRatio||1)), bw=Math.round(w*dpr), bh=Math.round(h*dpr);
    if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  var scEl=cv.closest&&cv.closest('[data-vz-sc]'), s=scEl?(parseFloat(scEl.getAttribute('data-vz-sc'))||1):1;
  var gs=o.fixed?1:Math.max(0.35,Math.min(3,Math.max(0.7,Math.min(1.4,Math.min(w/480,h/200)))*s));
  var W=w/gs, H=h/gs, i, v;
  ctx.save(); ctx.scale(gs,gs);
  ctx.clearRect(0,0,W,H);
  if(!document.documentElement.classList.contains('glossy')){ ctx.fillStyle='#0b0c0d'; ctx.fillRect(0,0,W,H); }
  var xmin=o.xmin||0, xmax=o.xmax, ymin=o.ymin, ymax=o.ymax;
  if(!(xmax-xmin>1e-12)) xmax=xmin+1;
  if(!(ymax-ymin>1e-12)) ymax=ymin+1;
  function niceTicks(lo,hi,n){
    var span=hi-lo, raw=span/Math.max(1,n), mag=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/mag;
    var step=(f<1.5?1:f<3.5?2:f<7.5?5:10)*mag, out=[];
    for(var t=Math.ceil(lo/step-1e-9)*step; t<=hi+1e-9*span; t+=step) out.push(Math.round(t/step)*step);
    return {ticks:out,step:step};
  }
  function lab(t,step){ return String(+t.toFixed(step>=1?0:step>=0.1?1:2)); }
  var FS=o.fs||12; ctx.font=FS+'px "Open Sans", sans-serif'; ctx.lineWidth=1;
  var Tm=(o.T!==undefined?o.T:12), Bm=(o.B!==undefined?o.B:(o.xlabel?34:20)), Rm=(o.R!==undefined?o.R:12);
  var yt, ystep=0;
  if(o.yticks){ yt=o.yticks; } else { var nt=niceTicks(ymin,ymax,Math.max(2,Math.min(4,Math.floor((H-Tm-Bm)/24)))); yt=nt.ticks; ystep=nt.step; }
  var yfmt=o.yfmt||function(t){ return o.yticks?String(+t.toFixed(3)):lab(t,ystep||1); }, ylabs=yt.map(yfmt), mw=0;
  ylabs.forEach(function(t){ mw=Math.max(mw,ctx.measureText(t).width); });
  var Lm=(o.L!==undefined?o.L:Math.ceil(mw)+(o.ylabel?32:14));
  var pw=W-Lm-Rm, ph=H-Tm-Bm;
  function X(x){ return Lm+(x-xmin)/(xmax-xmin)*pw; }
  function Y(y){ return Tm+ph-(y-ymin)/(ymax-ymin)*ph; }
  var xt, xstep=0;
  if(o.xticks){ xt=o.xticks; } else { var nx=niceTicks(xmin,xmax,Math.max(1,Math.min(6,Math.floor(pw/60)))); xt=nx.ticks; xstep=nx.step; }
  var xfmt=o.xfmt||function(t){ return o.xticks?String(+t.toFixed(3)):lab(t,xstep||1); }, lastR=-1e9, px, py;
  for(i=0;i<xt.length;i++){
    px=Math.round(X(xt[i]))+0.5;
    ctx.strokeStyle='#1c2029'; ctx.beginPath(); ctx.moveTo(px,Tm); ctx.lineTo(px,Tm+ph); ctx.stroke();
    var xl=xfmt(xt[i]), lw=ctx.measureText(xl).width;
    if(px-lw/2>=lastR+6){ ctx.fillStyle='#8a8f9c'; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText(xl,px,Tm+ph+FS+3); lastR=px+lw/2; }
  }
  for(i=0;i<yt.length;i++){
    py=Math.round(Y(yt[i]))+0.5;
    ctx.strokeStyle=(yt[i]===0&&ymin<0?'#3a3f4d':'#1c2029'); ctx.beginPath(); ctx.moveTo(Lm,py); ctx.lineTo(Lm+pw,py); ctx.stroke();
    ctx.fillStyle='#8a8f9c'; ctx.textAlign='right'; ctx.textBaseline='alphabetic'; ctx.fillText(ylabs[i],Lm-6,py+4);
  }
  ctx.strokeStyle='#3a3f4d'; ctx.strokeRect(Lm+0.5,Tm+0.5,pw,ph);
  ctx.fillStyle='#8a8f9c'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  if(o.xlabel) ctx.fillText(o.xlabel,Lm+pw/2,H-4);
  if(o.ylabel){
    ctx.save(); ctx.translate(Math.round(FS*1.1),Tm+ph/2); ctx.rotate(-Math.PI/2);
    var yw=ctx.measureText(o.ylabel).width; if(yw>ph) ctx.font=Math.max(6,Math.floor(FS*ph/yw))+'px "Open Sans", sans-serif';
    ctx.textBaseline='middle'; ctx.fillText(o.ylabel,0,0); ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(Lm,Tm-2,pw,ph+4); ctx.clip();
  (o.series||[]).forEach(function(sr){
    ctx.strokeStyle=sr.color||'#4dd6a0'; ctx.lineWidth=sr.w||2; ctx.lineJoin='round'; ctx.beginPath();
    var pen=false, k, x, y, pts=sr.pts, N=sr.n||200, x0=sr.x0!==undefined?sr.x0:xmin, x1=sr.x1!==undefined?sr.x1:xmax, M=pts?pts.length:N+1;
    for(k=0;k<M;k++){
      if(pts){ x=pts[k][0]; y=pts[k][1]; } else { x=x0+(x1-x0)*k/N; y=sr.f(x); }
      if(!isFinite(y)){ pen=false; continue; }
      if(!pen){ ctx.moveTo(X(x),Y(y)); pen=true; } else ctx.lineTo(X(x),Y(y));
    }
    ctx.stroke();
  });
  var m=o.marker;
  if(m&&isFinite(m.x)&&isFinite(m.y)){
    ctx.lineWidth=1; ctx.setLineDash([4,4]); ctx.strokeStyle=m.line||'rgba(255,122,26,0.7)';
    ctx.beginPath(); ctx.moveTo(Math.round(X(m.x))+0.5,Tm); ctx.lineTo(Math.round(X(m.x))+0.5,Tm+ph); ctx.moveTo(Lm,Math.round(Y(m.y))+0.5); ctx.lineTo(Lm+pw,Math.round(Y(m.y))+0.5); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  if(m&&isFinite(m.x)&&isFinite(m.y)){
    ctx.beginPath(); ctx.arc(X(m.x),Y(m.y),5,0,Math.PI*2); ctx.lineWidth=2; ctx.strokeStyle=m.color||'#ff7a1a'; ctx.stroke();
  }
  if(o.readout){ ctx.fillStyle='#8a8f9c'; ctx.textAlign='right'; ctx.textBaseline='alphabetic'; ctx.font=FS+'px "Open Sans", sans-serif'; ctx.fillText(o.readout,Lm+pw-4,Tm+14); }
  ctx.restore();
  return {ctx:ctx,W:W,H:H,L:Lm,T:Tm,pw:pw,ph:ph,X:X,Y:Y};
};
(function(){
  var orig=window.vzPlot, RO=window.ResizeObserver&&new ResizeObserver(function(es){ es.forEach(function(e){
    var cv=e.target, a=cv._vzPend; if(!a||!cv.clientWidth||!cv.clientHeight) return;
    cv._vzPend=null; RO.unobserve(cv); try{ window.vzPlot(cv,a); }catch(x){}
  }); });
  window.vzPlot=function(cv,o){
    var r=orig(cv,o);
    if(cv&&RO){ if(r) cv._vzPend=null; else if(!(cv.clientWidth&&cv.clientHeight)){ cv._vzPend=o; RO.observe(cv); } }
    return r;
  };
})();
