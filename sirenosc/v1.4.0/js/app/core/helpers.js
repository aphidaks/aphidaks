
const APP_VERSION = 'V1.4.0';

const get=id=>document.getElementById(id);
function safeAtob(str){
  str = String(str == null ? '' : str);
  try{ return atob(str); }catch(e){}
  let c = str.replace(/-/g,'+').replace(/_/g,'/').replace(/[^A-Za-z0-9+\/]/g,'');
  if(c.length % 4 === 1) c = c.slice(0,-1);
  while(c.length % 4) c += '=';
  return atob(c);
}
const gcd=(a,b)=>{a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){let t=b;b=a%b;a=t;}return a;};
const calcHz=(n,rpm)=>(rpm*n)/60;
const centsToRatio=c=>Math.pow(2,c/1200);
function applyEasing(easing, t) {
  if(easing==='easein')    return t*t;
  if(easing==='easeinout') return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  return 1-Math.pow(1-t,2);
}
function applyFn(fn, t, easing){
  t=Math.max(0,Math.min(1,t));
  const te = easing ? applyEasing(easing, t) : applyEasing('easeout', t);
  if(fn==='linear')      return te;
  if(fn==='exponential'){ const v=1-Math.exp(-5*te); return v/(1-Math.exp(-5)); }
  if(fn==='sine')        return Math.sin(te*Math.PI/2);
  if(fn==='tanh')        { const v=Math.tanh(4*te); return v/Math.tanh(4); }
  if(fn==='quadratic')   { const v=1-Math.exp(-5*te*te); return v/(1-Math.exp(-5)); }
  if(fn==='logarithmic') return te>0?Math.log(1+te*9)/Math.log(10):0;
  return te;
}

