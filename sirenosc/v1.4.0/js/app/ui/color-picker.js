(function(){
  const PRESET_COLORS = ['#757575','#be3c40','#80c090','#e5a61f'];
  const PRESET_LABELS = ['Rotor','Vane','Harmonic'];
  const MAX_RECENT = 10;
  const LS_KEY = 'sirenosc_recent_colors';

  function loadRecent(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; } }
  function saveRecent(arr){ try{ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }catch(e){} }
  function pushRecent(hex){
    hex = hex.toLowerCase();
    if(PRESET_COLORS.map(c=>c.toLowerCase()).includes(hex)) return;
    let arr = loadRecent().filter(c=>c.toLowerCase()!==hex);
    arr.unshift(hex);
    if(arr.length > MAX_RECENT) arr = arr.slice(0, MAX_RECENT);
    saveRecent(arr);
  }

  function hexToHsl(hex){
    hex = hex.replace('#','');
    if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    let r=parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if(max===min){ h=s=0; }
    else{
      const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){ case r: h=(g-b)/d+(g<b?6:0); break; case g: h=(b-r)/d+2; break; case b: h=(r-g)/d+4; break; }
      h/=6;
    }
    return [h*360, s*100, l*100];
  }
  function hslToHex(h,s,l){
    h/=360; s/=100; l/=100;
    let r,g,b;
    if(s===0){ r=g=b=l; }
    else{
      const hue2rgb=(p,q,t)=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
      const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
      r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
    }
    return '#'+[r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
  }
  function hexToRgb(hex){
    hex=hex.replace('#','');
    if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
  }
  function luminance(hex){ const [r,g,b]=hexToRgb(hex); return 0.299*r+0.587*g+0.114*b; }
  function isValidHex(h){ return /^#[0-9a-fA-F]{6}$/.test(h); }

  let _activeInput = null;
  let _hsl = [0, 100, 50];
  let _draggingSV = false, _draggingH = false, _draggingL = false;

  const picker = document.createElement('div');
  picker.id = '_customColorPicker';
  picker.style.cssText = 'position:fixed;z-index:99999;background:var(--panel);border:1px solid var(--border);border-radius:2px;padding:11px 12px;box-shadow:0 6px 32px rgba(0,0,0,.75);display:none;flex-direction:column;gap:9px;font-family:Share Tech Mono,monospace;width:220px;user-select:none';
  document.body.appendChild(picker);

  const header = document.createElement('div');
  header.style.cssText = 'font-size:8px;letter-spacing:2px;color:#5a6280;text-transform:uppercase;margin-bottom:1px';
  header.textContent = 'Color';
  picker.appendChild(header);

  const svCanvas = document.createElement('canvas');
  svCanvas.width = 196; svCanvas.height = 120;
  svCanvas.style.cssText = 'width:196px;height:120px;border-radius:2px;cursor:crosshair;display:block;border:1px solid var(--border)';
  picker.appendChild(svCanvas);

  const hueWrap = document.createElement('div');
  hueWrap.style.cssText = 'position:relative;height:12px';
  const hueTrack = document.createElement('div');
  hueTrack.style.cssText = 'position:absolute;inset:0;border-radius:2px;cursor:pointer;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);border:1px solid var(--border)';
  const hueThumb = document.createElement('div');
  hueThumb.style.cssText = 'position:absolute;top:-3px;width:6px;height:18px;border-radius:2px;background:#fff;border:2px solid #0b0c0d;box-shadow:0 0 4px rgba(0,0,0,.6);transform:translateX(-50%);pointer-events:none';
  hueWrap.appendChild(hueTrack); hueWrap.appendChild(hueThumb);
  picker.appendChild(hueWrap);

  const lightWrap = document.createElement('div');
  lightWrap.style.cssText = 'position:relative;height:12px';
  const lightTrack = document.createElement('div');
  lightTrack.style.cssText = 'position:absolute;inset:0;border-radius:2px;cursor:pointer;border:1px solid var(--border)';
  const lightThumb = document.createElement('div');
  lightThumb.style.cssText = 'position:absolute;top:-3px;width:6px;height:18px;border-radius:2px;background:#fff;border:2px solid #0b0c0d;box-shadow:0 0 4px rgba(0,0,0,.6);transform:translateX(-50%);pointer-events:none';
  lightWrap.appendChild(lightTrack); lightWrap.appendChild(lightThumb);
  picker.appendChild(lightWrap);

  const hexRow = document.createElement('div');
  hexRow.style.cssText = 'display:flex;align-items:center;gap:7px';
  const preview = document.createElement('div');
  preview.style.cssText = 'width:26px;height:26px;border-radius:2px;border:1px solid var(--border);flex-shrink:0';
  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.maxLength = 7;
  hexInput.style.cssText = 'flex:1;background:var(--inset);border:1px solid var(--border);border-radius:2px;color:var(--x-00e5a0,#00e5a0);font-family:Share Tech Mono,monospace;font-size:11px;padding:3px 6px;outline:none;letter-spacing:1px';
  hexInput.placeholder = '#000000';
  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'OK';
  applyBtn.style.cssText = 'background:transparent;border:1px solid #00e5a0;border-radius:2px;color:var(--x-00e5a0,#00e5a0);font-family:Share Tech Mono,monospace;font-size:10px;padding:3px 8px;cursor:pointer;letter-spacing:1px;flex-shrink:0';
  applyBtn.addEventListener('mouseenter',function(){ this.style.background='#00e5a0'; this.style.color='#0b0c0d'; });
  applyBtn.addEventListener('mouseleave',function(){ this.style.background='transparent'; this.style.color='#00e5a0'; });
  hexRow.appendChild(preview); hexRow.appendChild(hexInput); hexRow.appendChild(applyBtn);
  picker.appendChild(hexRow);

  const div1 = document.createElement('hr');
  div1.style.cssText = 'border:none;border-top:1px solid var(--border);margin:0';
  picker.appendChild(div1);

  const presetLabel = document.createElement('div');
  presetLabel.textContent = 'PRESETS';
  presetLabel.style.cssText = 'font-size:8px;letter-spacing:1.5px;color:#5a6280';
  picker.appendChild(presetLabel);
  const presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap';
  picker.appendChild(presetRow);

  const recentLabel = document.createElement('div');
  recentLabel.textContent = 'RECENT';
  recentLabel.style.cssText = 'font-size:8px;letter-spacing:1.5px;color:#5a6280;display:none';
  picker.appendChild(recentLabel);
  const recentRow = document.createElement('div');
  recentRow.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap';
  picker.appendChild(recentRow);

  function drawSV(){
    const ctx = svCanvas.getContext('2d');
    const W = svCanvas.width, H = svCanvas.height;
    const h = _hsl[0];
    const baseColor = hslToHex(h, 100, 50);
    ctx.fillStyle = baseColor;
    ctx.fillRect(0,0,W,H);
    const wg = ctx.createLinearGradient(0,0,W,0);
    wg.addColorStop(0,'rgba(255,255,255,1)'); wg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = wg; ctx.fillRect(0,0,W,H);
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'rgba(0,0,0,0)'); bg.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const s = _hsl[1]/100, l = _hsl[2]/100;
    const lv = l + (s*(1-Math.abs(2*l-1))/2);
    const sv = lv === 0 ? 0 : s*(1-Math.abs(2*l-1))/lv;
    const cx = sv * W, cy = (1-lv) * H;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
    ctx.strokeStyle = lv > 0.5 ? '#1a1b1e' : '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function updateLightGradient(){
    const h = _hsl[0], s = _hsl[1];
    const c0 = hslToHex(h, s, 0), c50 = hslToHex(h, s, 50), c100 = hslToHex(h, s, 100);
    lightTrack.style.background = `linear-gradient(to right,${c0},${c50},${c100})`;
  }

  function updateThumbs(){
    const hPct = _hsl[0]/360*100;
    hueThumb.style.left = hPct + '%';
    lightThumb.style.left = _hsl[2] + '%';
  }

  function updatePreview(){
    const hex = hslToHex(..._hsl);
    preview.style.background = hex;
    hexInput.value = hex;
  }

  function fullRedraw(){
    drawSV();
    updateLightGradient();
    updateThumbs();
    updatePreview();
  }

  function makeSwatch(hex, label){
    const s = document.createElement('div');
    s.title = label || hex;
    s.style.cssText = 'width:20px;height:20px;border-radius:2px;background:'+hex+';cursor:pointer;border:1px solid rgba(255,255,255,.12);flex-shrink:0;transition:transform .1s,box-shadow .1s';
    s.addEventListener('mouseenter',function(){ this.style.transform='scale(1.2)'; this.style.boxShadow='0 0 0 2px #00e5a0'; });
    s.addEventListener('mouseleave',function(){ this.style.transform=''; this.style.boxShadow=''; });
    s.addEventListener('mousedown',function(e){ e.preventDefault(); e.stopPropagation(); setFromHex(hex); commitColor(); });
    return s;
  }

  function rebuildSwatches(){
    presetRow.innerHTML = '';
    PRESET_COLORS.forEach((hex,i)=>{ presetRow.appendChild(makeSwatch(hex, PRESET_LABELS[i])); });
    const recent = loadRecent();
    recentRow.innerHTML = '';
    recentLabel.style.display = recent.length ? '' : 'none';
    recent.forEach(hex=>{ recentRow.appendChild(makeSwatch(hex, hex)); });
  }

  function setFromHex(hex){
    if(!isValidHex(hex)) return;
    _hsl = hexToHsl(hex);
    fullRedraw();
  }

  function commitColor(){
    if(!_activeInput) return;
    const hex = hslToHex(..._hsl);
    _activeInput.value = hex;
    _activeInput.dispatchEvent(new Event('input', {bubbles:true}));
    pushRecent(hex);
    rebuildSwatches();
  }

  function svFromEvent(e){
    const rect = svCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const sv = x, vv = 1 - y;
    const l = vv * (1 - sv/2);
    const s = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1-l);
    _hsl[1] = s * 100;
    _hsl[2] = l * 100;
    fullRedraw();
  }
  svCanvas.addEventListener('mousedown', function(e){ e.preventDefault(); _draggingSV=true; svFromEvent(e); });

  function hueFromEvent(e){
    const rect = hueTrack.getBoundingClientRect();
    _hsl[0] = Math.max(0, Math.min(360, (e.clientX - rect.left) / rect.width * 360));
    fullRedraw();
  }
  hueTrack.addEventListener('mousedown', function(e){ e.preventDefault(); _draggingH=true; hueFromEvent(e); });

  function lightFromEvent(e){
    const rect = lightTrack.getBoundingClientRect();
    _hsl[2] = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
    fullRedraw();
  }
  lightTrack.addEventListener('mousedown', function(e){ e.preventDefault(); _draggingL=true; lightFromEvent(e); });

  document.addEventListener('mousemove', function(e){
    if(_draggingSV) svFromEvent(e);
    else if(_draggingH) hueFromEvent(e);
    else if(_draggingL) lightFromEvent(e);
  });
  document.addEventListener('mouseup', function(){
    if(_draggingSV||_draggingH||_draggingL){ commitColor(); }
    _draggingSV=false; _draggingH=false; _draggingL=false;
  });

  hexInput.addEventListener('input', function(){
    const v = this.value.startsWith('#') ? this.value : '#'+this.value;
    if(isValidHex(v)){ _hsl = hexToHsl(v); drawSV(); updateLightGradient(); updateThumbs(); preview.style.background=v; }
  });
  hexInput.addEventListener('keydown', function(e){ if(e.key==='Enter'){ const v=this.value.startsWith('#')?this.value:'#'+this.value; if(isValidHex(v)){ setFromHex(v); commitColor(); hidePicker(); } } });

  applyBtn.addEventListener('mousedown', function(e){ e.preventDefault(); commitColor(); hidePicker(); });

  function showPicker(input){
    _activeInput = input;
    setFromHex(input.value || '#00e5a0');
    rebuildSwatches();

    picker.style.display = 'flex';
    const rect = input.getBoundingClientRect();
    const pw0 = picker.offsetWidth || 1, ph0 = picker.offsetHeight || 1, pr0 = picker.getBoundingClientRect();
    const z = (pr0.width / pw0) || 1;
    const pw = pw0 * z, ph = ph0 * z, VW = window.innerWidth, VH = window.innerHeight;
    const GAP = 8;
    let left = rect.right + GAP;
    let top  = rect.top + rect.height/2 - ph/2;
    if(left + pw > VW - GAP) left = rect.left - pw - GAP;
    if(left < GAP){ left = rect.left; top = rect.top - ph - GAP; }
    if(top + ph > VH - GAP) top = VH - ph - GAP;
    if(top < GAP) top = GAP;
    if(left + pw > VW - GAP) left = VW - pw - GAP;
    if(left < GAP) left = GAP;
    left /= z; top /= z;
    picker.style.left = left+'px';
    picker.style.top  = top+'px';
  }

  function hidePicker(){
    picker.style.display = 'none';
    _activeInput = null;
  }

  function upgradeColorInput(input){
    if(input._cpUpgraded) return;
    input._cpUpgraded = true;
    input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;border:none;padding:0';
    const btn = document.createElement('div');
    btn.style.cssText = 'width:22px;height:22px;border-radius:2px;cursor:pointer;border:1px solid var(--border);flex-shrink:0;transition:box-shadow .15s;background:'+( input.value||'#3f455f');
    btn.title = 'Pick color';
    btn.addEventListener('mouseenter',function(){ this.style.boxShadow='0 0 0 2px #00e5a0'; });
    btn.addEventListener('mouseleave',function(){ this.style.boxShadow=''; });
    btn.addEventListener('mousedown',function(e){
      e.preventDefault(); e.stopPropagation();
      if(picker.style.display!=='none' && _activeInput===input){ hidePicker(); return; }
      showPicker(input);
    });
    const origDispatch = input.dispatchEvent.bind(input);
    const syncBtn = ()=>{ btn.style.background = input.value || '#3f455f'; };
    input.addEventListener('input', syncBtn);
    input.parentNode.insertBefore(btn, input);
    input._cpBtn = btn;
  }

  document.querySelectorAll('input[type=color]').forEach(upgradeColorInput);
  const _obs = new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1) return;
        n.querySelectorAll('input[type=color]').forEach(upgradeColorInput);
        if(n.matches && n.matches('input[type=color]')) upgradeColorInput(n);
      });
    });
  });
  _obs.observe(document.body, {childList:true, subtree:true});

  document.addEventListener('mousedown', function(e){
    if(picker.style.display==='none') return;
    if(picker.contains(e.target)) return;
    if(_activeInput && _activeInput._cpBtn && _activeInput._cpBtn.contains(e.target)) return;
    hidePicker();
  }, true);

})();
