
(function(){ try{
  var st=JSON.parse(localStorage.getItem('sirenosc_ui_settings')||'{}');
  if(localStorage.getItem('updstylegl')!=='1'){ st.uiStyle='glossy'; localStorage.setItem('sirenosc_ui_settings',JSON.stringify(st)); localStorage.setItem('updstylegl','1'); }
  if(st.uiStyle==='glossy') document.documentElement.classList.add('glossy');
}catch(e){} })();
window._tvCache={};
window._LOGOS={'glossy_wb':SIRENOSC_ASSETS["logo.glossy_wb"],'glossy_w':SIRENOSC_ASSETS["logo.glossy_w"],'glossy_b':SIRENOSC_ASSETS["logo.glossy_b"],'flat_wb':SIRENOSC_ASSETS["logo.flat_wb"],'flat_w':SIRENOSC_ASSETS["logo.flat_w"],'flat_b':SIRENOSC_ASSETS["logo.flat_b"]};
window._updateLogo=function(){
  var img=document.getElementById('logoImg'); if(!img) return;
  var glossy=document.documentElement.classList.contains('glossy');
  var map={luna:'w',aero:'b','old-classic':'b'}, v='wb', cl=document.body?document.body.classList:null;
  if(cl) for(var k in map){ if(cl.contains('theme-'+k)){ v=map[k]; break; } }
  var src=window._LOGOS[(glossy?'glossy_':'flat_')+v]; if(src && img.getAttribute('src')!==src) img.setAttribute('src',src);
};
document.addEventListener('DOMContentLoaded',function(){ window._updateLogo(); });
window._tv=function(n,fb){ var c=window._tvCache; if(c[n]===undefined){ try{ c[n]=getComputedStyle(document.body).getPropertyValue(n).trim()||fb; }catch(e){ c[n]=fb; } } return c[n]; };
window._setUiStyle=function(g,noSave){
  document.documentElement.classList.toggle('glossy',g);
  if(window._updateLogo) window._updateLogo();
  if(!noSave){ try{ var s=JSON.parse(localStorage.getItem('sirenosc_ui_settings')||'{}'); s.uiStyle=g?'glossy':'flat'; localStorage.setItem('sirenosc_ui_settings',JSON.stringify(s)); }catch(e){} }
  document.querySelectorAll('.menu-style-item').forEach(function(it){ it.classList.toggle('active-style',(it.getAttribute('data-style')==='glossy')===g); });
  if(!noSave){ try{ window.dispatchEvent(new Event('resize')); }catch(e){} }
  var bF=document.getElementById('spStyleFlat'), bG=document.getElementById('spStyleGlossy');
  if(bF) bF.className='vbtn '+(g?'btn-gray':'btn-accent'); if(bG) bG.className='vbtn '+(g?'btn-accent':'btn-gray');
};
