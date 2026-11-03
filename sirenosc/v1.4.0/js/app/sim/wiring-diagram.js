(function(){
  var canvas=get('wiringCanvas');
  var ctx=canvas.getContext('2d');
  var DPR=(typeof hiResK==='function'?hiResK():(window.devicePixelRatio||1));
  var CSS_W=140,CSS_H=160;
  function sizeCanvas(){
    DPR=(typeof hiResK==='function'?hiResK():(window.devicePixelRatio||1));
    var col=get('forwardDirSelect').closest('.entry').parentNode;
    var colH=col.offsetHeight;
    var labelH=canvas.offsetTop;
    var fwd=get('forwardDirSelect');
    var bottom=fwd.getBoundingClientRect().bottom-canvas.getBoundingClientRect().top;
    var h=Math.round(bottom-2);
    if(!(h>=160)) h=160;
    CSS_H=h;
    canvas.style.height=CSS_H+'px';
    canvas.width=Math.round(CSS_W*DPR);
    canvas.height=Math.round(CSS_H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  sizeCanvas();

  var WIRE_DEFS={
    dc:  {bottom:['#ef4444','#555555'],top:['#ef4444','#555555']},
    ac1: {bottom:['#3b82f6','#3b82f6'],top:['#3b82f6','#3b82f6']},
    ac3: {bottom:['#9ca3af','#b45309','#555555'],top:['#9ca3af','#b45309','#555555']}
  };

  var topPerm=null;
  var selectedTop=null;

  function getType(){ return get('currentTypeSelect').value; }
  function getForward(){ return get('forwardDirSelect').value; }

  function initPerm(){
    var def=WIRE_DEFS[getType()];
    topPerm=def.top.map(function(_,i){return i;});
    selectedTop=null;
  }

  function permParity(perm){
    var n=perm.length,visited=new Array(n).fill(false),par=0;
    for(var i=0;i<n;i++){
      if(!visited[i]){
        var cycleLen=0,j=i;
        while(!visited[j]){visited[j]=true;j=perm[j];cycleLen++;}
        if(cycleLen%2===0) par^=1;
      }
    }
    return par;
  }

  function getActualDir(){
    var type=getType();
    var fwd=getForward();
    var flipped=false;
    if(type==='dc'){
      flipped=permParity(topPerm)===1;
    } else if(type==='ac3'){
      flipped=permParity(topPerm)===1;
    }
    if(flipped) return fwd==='cw'?'ccw':'cw';
    return fwd;
  }

  function draw(){
    var W=CSS_W,H=CSS_H;
    ctx.clearRect(0,0,W,H);
    if(!document.documentElement.classList.contains('glossy')){ ctx.fillStyle='#0b0c0d';
    ctx.fillRect(0,0,W,H); }

    var type=getType();
    var def=WIRE_DEFS[type];
    var n=def.bottom.length;

    var padX=20;
    var usableW=W-padX*2;
    var spacing=n===1?0:usableW/(n-1);
    var topY=18;
    var botY=H-18;
    var termR=5;
    var arrowY=topY+14;

    var botX=[];
    var topX=[];
    for(var i=0;i<n;i++){
      var x=n===1?W/2:padX+i*spacing;
      botX.push(x);
      topX.push(x);
    }

    for(var slot=0;slot<n;slot++){
      var srcIdx=topPerm[slot];
      var color=def.bottom[srcIdx];
      var x1=botX[srcIdx];
      var x2=topX[slot];
      var isSelected=(selectedTop===slot);

      ctx.save();
      ctx.strokeStyle=color;
      ctx.lineWidth=isSelected?3:2;
      ctx.setLineDash(isSelected?[4,3]:[]);
      ctx.globalAlpha=isSelected?1:0.85;
      ctx.beginPath();
      ctx.moveTo(x1,botY-termR);
      ctx.bezierCurveTo(x1,(botY+topY)/2,x2,(botY+topY)/2,x2,topY+termR);
      ctx.stroke();
      ctx.restore();
    }

    for(var i=0;i<n;i++){
      var ax=topX[i];
      ctx.save();
      ctx.strokeStyle='#d0d8f0';
      ctx.fillStyle='#d0d8f0';
      ctx.lineWidth=1.5;
      ctx.globalAlpha=0.7;
      ctx.beginPath();
      ctx.moveTo(ax,arrowY+8);
      ctx.lineTo(ax,arrowY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax,arrowY-1);
      ctx.lineTo(ax-4,arrowY+5);
      ctx.lineTo(ax+4,arrowY+5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for(var i=0;i<n;i++){
      ctx.save();
      ctx.fillStyle=def.bottom[i];
      ctx.strokeStyle='#2a2f3f';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(botX[i],botY,termR,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      ctx.restore();
    }

    for(var slot=0;slot<n;slot++){
      var srcIdx=topPerm[slot];
      var color=def.bottom[srcIdx];
      var isSelected=(selectedTop===slot);
      ctx.save();
      ctx.fillStyle=color;
      ctx.strokeStyle=isSelected?'#ffffff':'#2a2f3f';
      ctx.lineWidth=isSelected?2:1;
      ctx.beginPath();
      ctx.arc(topX[slot],topY,termR,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      ctx.restore();
    }

    var dir=getActualDir();
    ctx.save();
    ctx.font='bold 11px monospace';
    ctx.textAlign='center';
    ctx.fillStyle=dir==='cw'?'#00e5a0':'#ff6b35';
    ctx.fillText(dir.toUpperCase(),W/2,H-4);
    ctx.restore();
  }

  function hitTopTerminal(mx,my){
    var type=getType();
    var def=WIRE_DEFS[type];
    var n=def.bottom.length;
    var W=CSS_W,H=CSS_H;
    var padX=20;
    var spacing=n<=1?0:(W-padX*2)/(n-1);
    var topY=18;
    var termR=10;
    for(var slot=0;slot<n;slot++){
      var x=n===1?W/2:padX+slot*spacing;
      var dx=mx-x,dy=my-topY;
      if(dx*dx+dy*dy<=termR*termR) return slot;
    }
    return -1;
  }

  canvas.addEventListener('click',function(e){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(CSS_W/rect.width);
    var my=(e.clientY-rect.top)*(CSS_H/rect.height);
    var slot=hitTopTerminal(mx,my);
    if(slot===-1){selectedTop=null;draw();return;}
    if(selectedTop===null){
      selectedTop=slot;
    } else {
      if(selectedTop!==slot){
        var tmp=topPerm[selectedTop];
        topPerm[selectedTop]=topPerm[slot];
        topPerm[slot]=tmp;
      }
      selectedTop=null;
    }
    draw();
    checkDir();
  });

  window.getWiringDir=getActualDir;
  function checkDir(){ if(window.onWiringDirChange) window.onWiringDirChange(getActualDir()); }
  function reset(){initPerm();draw();checkDir();}

  get('currentTypeSelect').addEventListener('change',reset);
  get('forwardDirSelect').addEventListener('change',function(){draw();checkDir();});

  initPerm();
  draw();
  if(window.ResizeObserver){
    var ro=new ResizeObserver(function(){
      var prev=CSS_H;
      sizeCanvas();
      if(CSS_H!==prev||true) draw();
    });
    ro.observe(get('forwardDirSelect').closest('.entry').parentNode);
  }
  window.addEventListener('load',function(){sizeCanvas();draw();});
  window._wiringRefresh=function(){ sizeCanvas(); draw(); };
})();

function simPhaseTorque(dir){
  var s=document.getElementById('motorSimTypeSelect'); if(!s) return false;
  if(s.value==='torque') return true;
  if(s.value!=='hybrid') return false;
  var el=document.getElementById((dir==='up'||dir==='steady')?'selHybridUp':'selHybridDown');
  return !!el && el.value==='torque';
}

