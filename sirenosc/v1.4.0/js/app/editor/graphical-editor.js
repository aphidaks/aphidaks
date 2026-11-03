(function(){
  var svg=document.getElementById('ceCanvas'); if(!svg) return;
  var layer=document.getElementById('ceLayer'), palette=document.getElementById('cePalette'), propsBox=document.getElementById('ceProps'), hint=document.getElementById('ceEmptyHint');
  var W=600, H=360, GRID=10, mode='edit', comps=[], nextId=1, selId=null, drag=null, held=null;
  var view={cx:W/2,cy:H/2};

  function shade(hex,f){ var m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex; var n=parseInt(m[1],16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    function c(v){ return Math.max(0,Math.min(255,Math.round(v*f))); } return '#'+((1<<24)|(c(r)<<16)|(c(g)<<8)|c(b)).toString(16).slice(1); }
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
  var ED='#14161a', EB='#3a3f4d', GRAY='#9aa0ad';

  var arGid=0;
  var TYPES={
    'switch': {name:'Switch',          hw:20,hh:32,color:GRAY,label:'SWITCH',  kind:'latch',
      draw:function(c){ var ky=c.on?-22:-4, rd='';
        for(var i=0;i<4;i++) rd+='<line x1="-7" y1="'+(ky+7+i*4)+'" x2="7" y2="'+(ky+7+i*4)+'" stroke="#000" stroke-opacity=".55"/><line x1="-7" y1="'+(ky+8+i*4)+'" x2="7" y2="'+(ky+8+i*4)+'" stroke="#fff" stroke-opacity=".15"/>';
        return '<rect x="-20" y="-32" width="40" height="64" rx="3" fill="url(#tcMetal)" stroke="#5b606a"/>'+
          '<circle cx="-16" cy="-28" r="1.6" fill="#5b606a"/><circle cx="16" cy="-28" r="1.6" fill="#5b606a"/><circle cx="-16" cy="28" r="1.6" fill="#5b606a"/><circle cx="16" cy="28" r="1.6" fill="#5b606a"/>'+
          '<rect x="-12" y="-24" width="24" height="48" rx="2" fill="#0b0c0d" stroke="#000"/>'+
          '<rect x="-10" y="'+ky+'" width="20" height="26" rx="2" fill="url(#tcBody)" stroke="#000"/>'+rd+
          '<rect x="-10" y="'+ky+'" width="20" height="26" rx="2" fill="none" stroke="#fff" stroke-opacity=".18"/>'+
          '<rect x="-6" y="'+(ky+1.5)+'" width="12" height="2.5" rx="1" fill="'+(c.on?c.color:"#2a2d35")+'"/>'+
          '<text x="0" y="-26" text-anchor="middle" font-size="6" fill="#3a3f4d" font-weight="bold">I</text><text x="0" y="31" text-anchor="middle" font-size="6" fill="#3a3f4d" font-weight="bold">O</text>'; }},
    'toggle': {name:'Toggle',          hw:16,hh:32,color:GRAY,label:'TOGGLE',  kind:'latch',
      draw:function(c){ var y=c.on?-26:26;
        return '<polygon points="16,0 8,13.9 -8,13.9 -16,0 -8,-13.9 8,-13.9" fill="url(#tcMetal)" stroke="#5b606a"/>'+
          '<circle r="10.5" fill="url(#tcMetalV)" stroke="#6b707a"/><circle r="6.5" fill="#23262b" stroke="#0b0c0d"/>'+
          '<line x1="0" y1="0" x2="0" y2="'+y+'" stroke="#5b606a" stroke-width="7.5" stroke-linecap="round"/>'+
          '<line x1="0" y1="0" x2="0" y2="'+y+'" stroke="#dfe2e7" stroke-width="5" stroke-linecap="round"/>'+
          '<line x1="-1" y1="'+(y>0?3:-3)+'" x2="-1" y2="'+(y>0?y-3:y+3)+'" stroke="#fff" stroke-width="1.4" stroke-opacity=".8" stroke-linecap="round"/>'+
          '<circle cx="0" cy="'+y+'" r="6.5" fill="'+c.color+'" stroke="#0b0c0d"/><circle cx="0" cy="'+y+'" r="6.5" fill="url(#tcShine)"/>'; }},
    'slideswitch':{name:'Slide Switch', hw:28,hh:16,color:GRAY,label:'SLIDE SW', kind:'latch',
      draw:function(c){ var kx=c.on?2:-22, rd='';
        for(var i=0;i<3;i++) rd+='<line x1="'+(kx+6+i*4)+'" y1="-8" x2="'+(kx+6+i*4)+'" y2="2" stroke="#000" stroke-opacity=".55"/><line x1="'+(kx+7+i*4)+'" y1="-8" x2="'+(kx+7+i*4)+'" y2="2" stroke="#fff" stroke-opacity=".15"/>';
        return '<rect x="-28" y="-13" width="56" height="20" rx="2" fill="url(#tcMetal)" stroke="#5b606a"/>'+
          '<circle cx="-25" cy="-3" r="1.6" fill="#5b606a"/><circle cx="25" cy="-3" r="1.6" fill="#5b606a"/>'+
          '<rect x="-22" y="-8" width="44" height="10" rx="2" fill="#0b0c0d" stroke="#000"/>'+
          '<rect x="'+kx+'" y="-10" width="20" height="14" rx="2" fill="url(#tcBody)" stroke="#000"/>'+rd+
          '<rect x="'+kx+'" y="-10" width="20" height="14" rx="2" fill="none" stroke="#fff" stroke-opacity=".18"/>'+
          '<rect x="'+(kx+3)+'" y="-9" width="14" height="2" rx="1" fill="'+(c.on?c.color:"#2a2d35")+'"/>'; }},
    'breaker':{name:'Circuit Breaker', hw:22,hh:40,color:GRAY,label:'BREAKER', kind:'latch',
      draw:function(c){
        var screw=function(y){ return '<circle cx="0" cy="'+y+'" r="3.4" fill="url(#tcMetalV)" stroke="#5b606a"/><line x1="-2.3" y1="'+y+'" x2="2.3" y2="'+y+'" stroke="#4a4f5c" stroke-width="1.1"/>'; };
        var ridge=function(y){ return '<line x1="-5" y1="'+y+'" x2="5" y2="'+y+'" stroke="#000" stroke-opacity=".4"/><line x1="-5" y1="'+(y+1)+'" x2="5" y2="'+(y+1)+'" stroke="#fff" stroke-opacity=".22"/>'; };
        var hy=c.on?-26:-12, hc=c.on?c.color:shade(c.color,0.6),
            handle='<rect x="-8" y="'+hy+'" width="16" height="22" rx="2" fill="'+hc+'" stroke="#0b0c0d"/><rect x="-8" y="'+hy+'" width="16" height="22" rx="2" fill="url(#tcShine)" opacity="'+(c.on?0.7:0.4)+'"/>'+ridge(hy+6)+ridge(hy+11)+ridge(hy+16);
        return '<rect x="-22" y="-40" width="44" height="80" rx="3" fill="url(#tcHouse)" stroke="#5b606a"/>'+
          '<rect x="-20.5" y="-38.5" width="41" height="77" rx="2" fill="none" stroke="#fff" stroke-opacity=".55"/>'+
          '<rect x="-17" y="-40" width="34" height="8" fill="url(#tcMetal)" stroke="#5b606a"/>'+screw(-36)+
          '<rect x="-17" y="32" width="34" height="8" fill="url(#tcMetal)" stroke="#5b606a"/>'+screw(36)+
          '<rect x="-10" y="-28" width="20" height="40" rx="2" fill="#15171a" stroke="#4a4f5c"/><rect x="-10" y="-28" width="20" height="5" rx="2" fill="#000" opacity=".5"/>'+handle+
          '<text x="-16" y="-20" text-anchor="middle" font-size="7" fill="#2a2d35" font-weight="bold">I</text><text x="-16" y="8" text-anchor="middle" font-size="7" fill="#2a2d35" font-weight="bold">O</text>'+
          '<rect x="-8" y="16" width="16" height="6" rx="1" fill="'+(c.on?c.color:"#1b1d22")+'" stroke="#4a4f5c"/>'+(c.on?'<rect x="-8" y="16" width="16" height="3" rx="1" fill="#fff" opacity=".3"/>':'')+
          '<text x="0" y="29.5" text-anchor="middle" font-size="7" fill="#2a2d35" font-weight="bold">C16</text>'; }},
    'circle': {name:'Round Button',    hw:26,hh:26,color:GRAY,label:'BUTTON',  kind:'button',
      draw:function(c){ var r=c.on?17:19, cy=c.on?1:0, cap=c.on?c.color:shade(c.color,0.7);
        return '<circle r="26" fill="url(#tcMetalV)" stroke="#5b606a"/><circle r="22" fill="#1d1f23" stroke="#0b0c0d"/>'+
          (c.on?'':'<circle cx="0" cy="2" r="'+r+'" fill="#000" opacity=".45"/>')+
          '<circle r="'+r+'" cy="'+cy+'" fill="'+cap+'" stroke="'+shade(c.color,0.4)+'" stroke-width="1.5"/><circle r="'+r+'" cy="'+cy+'" fill="url(#tcShine)" opacity="'+(c.on?0.45:1)+'"/>'; }},
    'squarebtn':{name:'Square Button', hw:26,hh:26,color:GRAY,label:'BUTTON',  kind:'button',
      draw:function(c){ var h=c.on?17:19, cy=c.on?1:0, cap=c.on?c.color:shade(c.color,0.7);
        return '<rect x="-26" y="-26" width="52" height="52" rx="6" fill="url(#tcMetalV)" stroke="#5b606a"/><rect x="-22" y="-22" width="44" height="44" rx="4" fill="#1d1f23" stroke="#0b0c0d"/>'+
          (c.on?'':'<rect x="'+-h+'" y="'+(-h+2)+'" width="'+2*h+'" height="'+2*h+'" rx="5" fill="#000" opacity=".45"/>')+
          '<rect x="'+-h+'" y="'+(-h+cy)+'" width="'+2*h+'" height="'+2*h+'" rx="5" fill="'+cap+'" stroke="'+shade(c.color,0.4)+'" stroke-width="1.5"/>'+
          '<rect x="'+-h+'" y="'+(-h+cy)+'" width="'+2*h+'" height="'+2*h+'" rx="5" fill="url(#tcShine)" opacity="'+(c.on?0.45:1)+'"/>'; }},
    'square': {name:'PCB Button',      hw:26,hh:26,color:GRAY,label:'BUTTON',  kind:'button',
      draw:function(c){ var r=c.on?12:14, cy=c.on?1:0, cap=c.on?c.color:shade(c.color,0.7), pin='', pts=[[-24,-24],[18,-24],[-24,18],[18,18]];
        pts.forEach(function(q){ pin+='<rect x="'+q[0]+'" y="'+q[1]+'" width="6" height="6" rx="1" fill="url(#tcMetal)" stroke="#5b606a" stroke-width=".8"/>'; });
        return '<rect x="-26" y="-26" width="52" height="52" rx="5" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="-24.5" y="-24.5" width="49" height="49" rx="4" fill="none" stroke="#fff" stroke-opacity=".14"/>'+pin+
          '<circle r="18" fill="#0b0c0d" stroke="#2f3238"/>'+(c.on?'':'<circle cx="0" cy="2" r="'+r+'" fill="#000" opacity=".5"/>')+
          '<circle r="'+r+'" cy="'+cy+'" fill="'+cap+'" stroke="'+shade(c.color,0.4)+'" stroke-width="1.5"/><circle r="'+r+'" cy="'+cy+'" fill="url(#tcShine)" opacity="'+(c.on?0.45:1)+'"/>'; }},
    'artimer':{name:'AR Timer Button', hw:26,hh:26,color:GRAY,label:'AR TIMER', kind:'button',
      draw:function(c){ var id='tcAr'+(++arGid), on=c.on, r=on?8:9, cy=on?1:0;
        return '<defs><radialGradient id="'+id+'" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="'+shade(c.color,on?1.1:1)+'"/><stop offset=".55" stop-color="'+c.color+'"/><stop offset="1" stop-color="'+shade(c.color,0.4)+'"/></radialGradient></defs>'+
          '<circle r="26" fill="url(#'+id+')" stroke="'+shade(c.color,0.3)+'" stroke-width="2"/>'+
          '<circle r="'+r+'" cy="'+cy+'" fill="#0b0c0d" stroke="#2a2d35" stroke-width="1"/>'+
          '<circle r="'+(r-3)+'" cy="'+(cy-1)+'" fill="#fff" opacity="'+(on?0.04:0.1)+'"/>'; }},
    'light':  {name:'Light Indicator', hw:20,hh:20,color:GRAY,label:'LIGHT',   kind:'light',
      draw:function(c){ var on=c.on;
        return (on?'<circle r="20" fill="'+c.color+'" opacity="0.7" filter="url(#ceGlow)"/>':'')+
          '<circle r="20" fill="'+shade(c.color,on?0.8:0.3)+'" stroke="'+shade(c.color,0.4)+'"/>'+
          '<circle r="15.5" fill="'+(on?c.color:shade(c.color,0.42))+'" stroke="'+shade(c.color,0.5)+'"/>'+
          '<circle r="15.5" fill="url(#tcShine)" opacity="'+(on?0.9:0.55)+'"/>'; }}
  };
  var IMG_RE=/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  function F(k,label,type,def,o){ var f={k:k,label:label,type:type,def:def}; if(o) for(var x in o) f[x]=o[x]; return f; }
  function ln(t,n){ return Array.from(String(t==null?'':t)).slice(0,n); }
  var KS=30, KG=6, KP=8;
  function kpDim(c){ var d=c.d; return {hw:(d.cols*KS+(d.cols-1)*KG)/2+KP, hh:(d.rows*KS+(d.rows-1)*KG)/2+KP}; }
  function kpLabels(c){ return String(c.d.labels).split(',').map(function(x){return x.trim();}); }
  TYPES.keypad={name:'Keypad',color:'#35b9f0',label:'KEYPAD',kind:'keypad',
    fields:[F('rows','Rows','number',4,{min:1,max:6,step:1}),F('cols','Columns','number',3,{min:1,max:6,step:1}),
            F('labels','Key labels (comma separated, left to right, top to bottom)','text','1,2,3,4,5,6,7,8,9,*,0,#',{wide:true,maxlen:120})],
    dim:kpDim,
    hit:function(c,lx,ly){ var m=kpDim(c), d=c.d;
      for(var i=0;i<d.rows*d.cols;i++){ var x0=-m.hw+KP+(i%d.cols)*(KS+KG), y0=-m.hh+KP+Math.floor(i/d.cols)*(KS+KG);
        if(lx>=x0&&lx<=x0+KS&&ly>=y0&&ly<=y0+KS) return i; } return -1; },
    draw:function(c){ var m=kpDim(c), d=c.d, lb=kpLabels(c), o='<rect x="'+-m.hw+'" y="'+-m.hh+'" width="'+2*m.hw+'" height="'+2*m.hh+'" rx="5" fill="url(#tcBody)" stroke="#0b0c0d"/>';
      for(var i=0;i<d.rows*d.cols;i++){
        var x0=-m.hw+KP+(i%d.cols)*(KS+KG), y0=-m.hh+KP+Math.floor(i/d.cols)*(KS+KG), dn=(d.down===i), t=lb[i]||'';
        o+=(dn?'':'<rect x="'+x0+'" y="'+(y0+2)+'" width="'+KS+'" height="'+KS+'" rx="4" fill="#000" opacity=".55"/>')+
           '<rect x="'+x0+'" y="'+(y0+(dn?1:0))+'" width="'+KS+'" height="'+KS+'" rx="4" fill="'+(dn?c.color:'url(#tcKey)')+'" stroke="'+(dn?shade(c.color,0.5):'#6b707a')+'"/>'+
           '<text x="'+(x0+KS/2)+'" y="'+(y0+KS/2+(dn?1:0)+(t.length>2?3:5))+'" text-anchor="middle" font-size="'+(t.length>2?9:14)+'" fill="#1b1d22" font-family="monospace" font-weight="bold">'+esc(t)+'</text>'; }
      return o; }};
  var LCW=11, LCH=22;
  var LCD_FONT='000000000000005F00000007000700147F147F14242A7F2A12231308646236495620500008070300001C2241000041221C002A1C7F1C2A08083E080800807030000808080808000060600020100804023E5149453E00427F400072494949462141494D331814127F1027454545393C4A49493141211109073649494936464949291E0000140000004034000000081422411414141414004122140802015909063E415D594E7C1211127C7F494949363E414141227F4141413E7F494949417F090909013E414151737F0808087F00417F41002040413F017F081422417F404040407F021C027F7F0408107F3E4141413E7F090909063E4151215E7F09192946264949493203017F01033F4040403F1F2040201F3F4038403F631408146303047804036159494D43007F4141410204081020004141417F04020102044040404040000307080020545478407F284444383844444428384444287F385454541800087E090218A4A49C787F0804047800447D40002040403D007F1028440000417F40007C047804787C080404783844444438FC1824241818242418FC7C08040408485454542404043F44243C4040207C1C2040201C3C4030403C44281028444C9090907C4464544C440008364100000077000000413608000201020402';
  function lcdGlyph(ch){ var code=ch?ch.codePointAt(0):32; if(code<32||code>126) code=63; var o=(code-32)*10, g=[]; for(var i=0;i<5;i++) g.push(parseInt(LCD_FONT.substr(o+i*2,2),16)); return g; }
  function lcdCols(c){ return Math.max(8,Math.min(40,Math.round(+c.d.cols)||16)); }
  function lcdRows(c){ return Math.max(1,Math.min(4,Math.round(+c.d.rows)||2)); }
  function lcdDim(c){ return {hw:lcdCols(c)*5.5+12, hh:lcdRows(c)*11+14}; }
  function lcdBoard(hw,hh){ var o='', n=Math.max(4,Math.min(16,Math.floor((2*hw-30)/8)+1));
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){ o+='<circle cx="'+q[0]*(hw-4)+'" cy="'+q[1]*(hh-4)+'" r="2.4" fill="#0b0c0d" stroke="#d4b24a" stroke-width="1"/>'; });
    for(var i=0;i<n;i++) o+='<circle cx="'+(-(n-1)*4+8*i)+'" cy="'+(-hh+4)+'" r="1.4" fill="#d4b24a"/>';
    return o; }
  TYPES.lcd={name:'LCD',color:'#9fd45a',label:'LCD',kind:'lcd',
    fields:[F('cols','Columns (characters per row)','number',16,{min:8,max:40,step:1}),F('rows','Rows','select','2',{opts:[['1','1 row'],['2','2 rows'],['3','3 rows'],['4','4 rows']]}),
            F('l1','Line 1','text','SIREN READY',{wide:true,maxlen:40}),F('l2','Line 2','text','',{wide:true,maxlen:40}),F('l3','Line 3','text','',{wide:true,maxlen:40}),F('l4','Line 4','text','',{wide:true,maxlen:40}),
            F('bl','Backlight','checkbox',true),F('tc','Text color','color','#16240e')],
    dim:lcdDim,
    draw:function(c){ var on=c.d.bl, cols=lcdCols(c), rows=lcdRows(c), m=lcdDim(c), sw=cols*LCW+6, sh=rows*LCH+6,
        bg=on?c.color:shade(c.color,0.16), tc=/^#[0-9a-f]{6}$/i.test(c.tcolor)?c.tcolor:(/^#[0-9a-f]{6}$/i.test(c.d.tc)?c.d.tc:'#16240e'), fg=on?tc:(tc==='#16240e'?shade(c.color,0.3):shade(tc,0.5)),
        o='<rect x="'+-m.hw+'" y="'+-m.hh+'" width="'+2*m.hw+'" height="'+2*m.hh+'" rx="4" fill="url(#tcPcb)" stroke="#0f3d22"/>'+lcdBoard(m.hw,m.hh)+
        '<rect x="'+-(sw+6)/2+'" y="'+-(sh+6)/2+'" width="'+(sw+6)+'" height="'+(sh+6)+'" rx="2" fill="#15171a" stroke="#000"/>'+
        '<rect x="'+-sw/2+'" y="'+-sh/2+'" width="'+sw+'" height="'+sh+'" rx="2" fill="'+bg+'" stroke="#0b0c0d"/>'+(on?'<rect x="'+-sw/2+'" y="'+-sh/2+'" width="'+sw+'" height="'+sh+'" rx="2" fill="#fff" opacity="0.06"/>':''),
        PW=1.88, PH=2.1, DW=1.62, DH=1.82;
      [c.d.l1,c.d.l2,c.d.l3,c.d.l4].slice(0,rows).forEach(function(line,r){ var ch=ln(line,cols);
        for(var i=0;i<cols;i++){ var x=-cols*LCW/2+i*LCW+0.5*(LCW-9.4), y=-rows*LCH/2+r*LCH+2.5;
          o+='<rect x="'+x+'" y="'+y+'" width="9.4" height="17" fill="'+shade(c.color,on?0.82:0.1)+'" opacity="0.55"/>';
          if(ch[i]&&ch[i]!==' '){ var g=lcdGlyph(ch[i]), d='';
            for(var cx=0;cx<5;cx++) for(var cy=0;cy<8;cy++) if((g[cx]>>cy)&1) d+='M'+(x+cx*PW).toFixed(2)+' '+(y+cy*PH).toFixed(2)+'h'+DW+'v'+DH+'h-'+DW+'z';
            if(d) o+='<path d="'+d+'" fill="'+fg+'"'+(c.hideText?' opacity="'+(mode==='edit'?0.25:0)+'"':'')+'/>'; } } });
      return o; }};
  var tones={}, AC=null;
  function audioCtx(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ return null; } } if(AC.state==='suspended'){ try{ AC.resume(); }catch(_){} } return AC; }
  function toneStop(c){ var t=tones[c.id]; if(!t) return; delete tones[c.id];
    try{ if(t.h){ window._buzzBridge.stop(t.h); } else { var now=AC.currentTime; t.gain.gain.cancelScheduledValues(now); t.gain.gain.setTargetAtTime(0,now,0.01); t.osc.stop(now+0.08); } }catch(_){}
    render(); }
  function toneStopAll(){ comps.forEach(function(c){ if(tones[c.id]) toneStop(c); }); }
  function toneStart(c,hz){ hz=+hz; if(hz!==hz) hz=+(c.d&&c.d.freq); if(!(hz>=20)){ toneStop(c); return; } hz=Math.min(20000,hz);
    var B=window._buzzBridge;
    if(B){ var bt=tones[c.id];
      if(bt&&bt.h){ B.setFreq(bt.h,hz); return; }
      var bh=B.start(function(){ return c.d; },hz,function(){ if(tones[c.id]&&tones[c.id].h===bh){ delete tones[c.id]; render(); } });
      if(bh){ tones[c.id]={h:bh}; render(); } return; }
    var ac=audioCtx(); if(!ac) return; var t=tones[c.id];
    if(t){ try{ t.osc.frequency.setValueAtTime(hz,ac.currentTime); }catch(_){} return; }
    var osc=ac.createOscillator(), gain=ac.createGain(), vol=Math.max(0,Math.min(100,+c.d.vol))/100*0.3;
    osc.type=({square:1,sine:1,triangle:1,sawtooth:1})[c.d.wave]?c.d.wave:'square'; osc.frequency.value=hz; gain.gain.value=0; gain.gain.setTargetAtTime(vol,ac.currentTime,0.005);
    osc.connect(gain); gain.connect(ac.destination); osc.start(); tones[c.id]={osc:osc,gain:gain}; render(); }
  TYPES.buzzer={name:'Piezo Buzzer',color:'#35b9f0',label:'BUZZER',kind:'buzzer',hw:20,hh:20,
    fields:[F('freq','Frequency (Hz)','number',440,{min:20,max:20000,step:1}),F('wave','Waveform','select','square',{opts:[['sine','Sine'],['triangle','Triangle'],['sawtooth','Sawtooth'],['square','Square'],['noise','White Noise']]}),F('vol','Volume (%)','number',50,{min:0,max:100,step:1}),F('blowerLink','Blower Link','checkbox',false),F('pos','Position','select','follow',{opts:[['follow','Follow Position Effects'],['dot','Controller Dot']]}),F('db10','DB @ 10FT (Controller Dot)','number',126,{min:0,max:220,step:1}),F('off','Curve Offset (Controller Dot)','number',0,{min:-100,max:100,step:1}),F('steep','Steepness (Controller Dot)','number',0,{min:-100,max:100,step:1}),F('hide','Hide in TEST mode','checkbox',false)],
    draw:function(c){ var snd=!!tones[c.id], o='';
      if(snd) o+='<circle r="25" fill="none" stroke="'+c.color+'" stroke-width="1.6" opacity=".75"/><circle r="30" fill="none" stroke="'+c.color+'" stroke-width="1.4" opacity=".45"/><circle r="35" fill="none" stroke="'+c.color+'" stroke-width="1.2" opacity=".2"/>';
      return o+'<circle r="20" fill="url(#tcBody)" stroke="#0b0c0d"/><circle r="17" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.5"/><circle r="12" fill="#17181c" stroke="#2f3238"/><circle r="3.2" fill="#000" stroke="#3a3d45" stroke-width=".8"/>'+
        '<path d="M-14.5 -11 h5 M-12 -13.5 v5" stroke="#d9dce2" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle r="20" fill="url(#tcShine)" opacity=".35"/>'; }};
  function potVal(c){ var mn=+c.d.min, mx=+c.d.max, v=Math.max(0,Math.min(100,+c.d.v||0)); return Math.round((mn+(mx-mn)*v/100)*1000)/1000; }
  function potSet(c,pct){ pct=Math.max(0,Math.min(100,Math.round(pct*10)/10)); if(pct===+c.d.v) return; c.d.v=pct; if(apiR) renderSoon(c); else render(); emit('pot',c,potVal(c)); try{ if(selId===c.id&&mode==='edit') buildProps(); }catch(_){} }
  TYPES.pot={name:'Potentiometer',color:'#35b9f0',label:'POT',kind:'pot',hw:26,hh:26,
    fields:[F('v','Position (%)','number',50,{min:0,max:100,step:1}),F('min','Value at 0%','number',0,{min:-1000000,max:1000000,step:1}),F('max','Value at 100%','number',100,{min:-1000000,max:1000000,step:1})],
    draw:function(c){ var v=Math.max(0,Math.min(100,+c.d.v||0)), ang=-135+270*v/100, pol=function(a,r){ a=a*Math.PI/180; return (Math.sin(a)*r).toFixed(2)+' '+(-Math.cos(a)*r).toFixed(2); },
        o='<circle r="26" fill="url(#tcBody)" stroke="#0b0c0d"/><circle r="24.5" fill="none" stroke="#fff" stroke-opacity=".12"/>';
      for(var i=0;i<=10;i++){ var a=-135+27*i, on=(-135+27*i)<=ang+0.01; o+='<line x1="'+pol(a,21).split(' ')[0]+'" y1="'+pol(a,21).split(' ')[1]+'" x2="'+pol(a,24).split(' ')[0]+'" y2="'+pol(a,24).split(' ')[1]+'" stroke="'+(on?c.color:'#4a4f5c')+'" stroke-width="1.6" stroke-linecap="round"/>'; }
      o+='<path d="M'+pol(-135,17.5)+' A17.5 17.5 0 1 1 '+pol(135,17.5)+'" fill="none" stroke="#23262b" stroke-width="3" stroke-linecap="round"/>';
      if(ang>-134.5) o+='<path d="M'+pol(-135,17.5)+' A17.5 17.5 0 '+((ang+135)>180?1:0)+' 1 '+pol(ang,17.5)+'" fill="none" stroke="'+c.color+'" stroke-width="3" stroke-linecap="round"/>';
      return o+'<g transform="rotate('+ang.toFixed(1)+')"><circle r="12.5" cy="1.5" fill="#000" opacity=".45"/><circle r="12.5" fill="url(#tcMetal)" stroke="#5b606a"/><circle r="11.2" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2.4" stroke-dasharray="1.4 2.1"/><circle r="8" fill="url(#tcMetalV)" stroke="#6b707a" stroke-width=".8"/><line x1="0" y1="-2" x2="0" y2="-11" stroke="'+c.color+'" stroke-width="2.6" stroke-linecap="round"/></g><circle r="12.5" fill="url(#tcShine)" opacity=".45"/>'; }};
  function selN(c){ return (+c.d.n===2)?2:3; }
  function selPos(c){ return Math.max(0,Math.min(selN(c)-1,parseInt(c.d.pos,10)||0)); }
  TYPES.selector={name:'Selector',color:GRAY,label:'SELECTOR',kind:'selector',hw:26,hh:26,
    fields:[F('n','Positions','select','3',{opts:[['2','2 positions'],['3','3 positions']]}),
            F('pos','Position','select','0',{opts:[['0','Position 1 (left)'],['1','Position 2'],['2','Position 3 (right)']]})],
    draw:function(c){ var n=selN(c), pos=selPos(c), angs=n===2?[-45,45]:[-50,0,50], R=19.5, o='<circle r="26" fill="url(#tcMetalV)" stroke="#5b606a"/><circle r="23" fill="#1d1f23" stroke="#0b0c0d"/>';
      angs.forEach(function(a,i){ var r=a*Math.PI/180; o+='<circle cx="'+(Math.sin(r)*R).toFixed(2)+'" cy="'+(-Math.cos(r)*R).toFixed(2)+'" r="'+(i===pos?2.6:2)+'" fill="'+(i===pos?c.color:'#5b606a')+'"/>'; });
      return o+'<g transform="rotate('+angs[pos]+')"><circle r="13.5" cy="1.5" fill="#000" opacity=".45"/><circle r="13.5" fill="url(#tcBody)" stroke="#000"/><circle r="13.5" fill="url(#tcShine)" opacity=".6"/>'+
        '<rect x="-2" y="-12" width="4" height="11" rx="2" fill="'+c.color+'" stroke="#0b0c0d" stroke-width=".8"/></g>'; }};
  var TEXT_FONTS=[['monospace','Monospace'],['Share Tech Mono','Share Tech Mono'],['Open Sans','Open Sans'],['sans-serif','Sans-serif'],['serif','Serif'],['Arial','Arial'],['Verdana','Verdana'],['Georgia','Georgia'],['Times New Roman','Times New Roman'],['Courier New','Courier New'],['Impact','Impact']];
  function textFam(f){ return f==='monospace'||f==='sans-serif'||f==='serif'?f:"'"+f+"',monospace"; }
  TYPES.text={name:'Text',color:'#d0d8f0',label:'',kind:'static',
    fields:[F('text','Text','textarea','TEXT',{wide:true,maxlen:200}),F('size','Font size','number',16,{min:6,max:72,step:1}),
            F('font','Font','select','monospace',{opts:TEXT_FONTS}),
            F('bold','Bold','checkbox',false),F('align','Align','select','center',{opts:[['left','Left'],['center','Center'],['right','Right']]})],
    dim:function(c){ var L=String(c.d.text).split('\n').slice(0,6), fs=c.d.size, mx=Math.max(1,L.reduce(function(m,x){return Math.max(m,Array.from(x).length);},0));
      return {hw:Math.max(10,mx*fs*0.62/2+4), hh:Math.max(8,L.length*fs*1.25/2+2)}; },
    draw:function(c){ var m=TYPES.text.dim(c), L=String(c.d.text).split('\n').slice(0,6), fs=c.d.size, a=c.d.align, x=a==='left'?-m.hw+4:a==='right'?m.hw-4:0;
      return L.map(function(t,i){ return '<text x="'+x+'" y="'+(-m.hh+fs*1.25*(i+0.5)+fs*0.35+2)+'" text-anchor="'+(a==='left'?'start':a==='right'?'end':'middle')+'" font-size="'+fs+'" font-family="'+esc(textFam(c.d.font||'monospace'))+'"'+((c.d.font&&c.d.font!=='monospace')?' style="font-family:'+esc(textFam(c.d.font))+' !important"':'')+' font-weight="'+(c.d.bold?'bold':'normal')+'" fill="'+c.color+'" xml:space="preserve">'+esc(t)+'</text>'; }).join(''); }};
  function shDim(c){ var d=c.d, w=d.w, h=d.h; if(d.shape==='circle') w=h=Math.min(w,h); if(d.shape==='line') h=Math.max(8,d.border*2+4); return {hw:w/2,hh:h/2}; }
  TYPES.shape={name:'Basic Shapes',color:'#ff7a1a',label:'',kind:'static',
    fields:[F('shape','Shape','select','rect',{opts:[['rect','Rectangle'],['rounded','Rounded rectangle'],['ellipse','Ellipse'],['circle','Circle'],['triangle','Triangle'],['diamond','Diamond'],['line','Line']]}),
            F('w','Width','number',80,{min:4,max:560,step:5}),F('h','Height','number',60,{min:4,max:320,step:5}),
            F('filled','Filled','checkbox',true),F('border','Border width','number',2,{min:0,max:12,step:1}),
            F('bauto','Auto border color','checkbox',true),F('bcolor','Border color','color','#ffffff')],
    dim:shDim,
    draw:function(c,kx,ky){ kx=kx||1; ky=ky||1; var d=c.d, m=shDim(c), w=2*m.hw*kx, h=2*m.hh*ky, sw=d.border>0?d.border:(d.filled?0:1), fill=d.filled?c.color:'none', bc=(d.bauto===false&&/^#[0-9a-f]{6}$/i.test(d.bcolor||''))?d.bcolor:null, st=sw?(bc||(d.filled?shade(c.color,0.6):c.color)):'none',
        at=' fill="'+fill+'" stroke="'+st+'" stroke-width="'+sw+'" stroke-linejoin="round"';
      switch(d.shape){
        case 'rounded': return '<rect x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" rx="'+Math.min(w,h)*0.2+'"'+at+'/>';
        case 'ellipse': return '<ellipse rx="'+w/2+'" ry="'+h/2+'"'+at+'/>';
        case 'circle':  return kx===ky?'<circle r="'+w/2+'"'+at+'/>':'<ellipse rx="'+w/2+'" ry="'+h/2+'"'+at+'/>';
        case 'triangle':return '<polygon points="0,'+-h/2+' '+w/2+','+h/2+' '+-w/2+','+h/2+'"'+at+'/>';
        case 'diamond': return '<polygon points="0,'+-h/2+' '+w/2+',0 0,'+h/2+' '+-w/2+',0"'+at+'/>';
        case 'line':    return '<line x1="'+-w/2+'" y1="0" x2="'+w/2+'" y2="0" stroke="'+(bc||c.color)+'" stroke-width="'+Math.max(1,d.border)+'" stroke-linecap="round"/>';
        default:        return '<rect x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'"'+at+'/>'; } }};
  function imDim(c){ var w=c.d.w; return {hw:w/2, hh:Math.min(w*c.d.ar,600)/2}; }
  TYPES.image={name:'Image',color:'#9aa0ad',label:'',kind:'static',
    fields:[F('src','Image','image',''),F('w','Width','number',120,{min:20,max:560,step:5}),F('ar','','hidden',0.75,{min:0.05,max:20})],
    dim:imDim,
    draw:function(c){ var m=imDim(c), w=2*m.hw, h=2*m.hh;
      if(c.d.src && IMG_RE.test(c.d.src)) return '<image href="'+c.d.src+'" x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/>';
      return '<rect x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" fill="#14161a" stroke="'+EB+'" stroke-dasharray="5 4"/>'+
        '<path d="M'+-w*0.28+','+h*0.22+' L'+-w*0.08+','+-h*0.1+' L'+w*0.06+','+h*0.1+' L'+w*0.16+','+-h*0.02+' L'+w*0.3+','+h*0.22+' Z" fill="#2a2d35" stroke="#4a4f5c"/>'+
        '<circle cx="'+w*0.2+'" cy="'+-h*0.2+'" r="'+Math.max(3,h*0.07)+'" fill="#4a4f5c"/>'; }};
  function boxLight(h){ var m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h||''); return !!m&&(0.299*parseInt(m[1],16)+0.587*parseInt(m[2],16)+0.114*parseInt(m[3],16))>150; }
  function pinN(c,k){ return Math.max(0,Math.min(32,Math.round(+c.d[k])||0)); }
  function pinCfgOf(d,i){ var p=String(d.pinCfg||'').split(';')[i-1]||'', hv=parseFloat(p.slice(1)); return {m:p.charAt(0)==='a'?'a':'d',hv:isFinite(hv)?hv:3}; }
  function setPinCfg(d,i,g){ var a=[],k; for(k=1;k<=32;k++) a.push(pinCfgOf(d,k)); a[i-1]=g; d.pinCfg=a.map(function(x){ return (x.m==='a'?'a':'d')+(Math.round(x.hv*1000)/1000); }).join(';'); }
  function boxPorts(b){ var p=b.d.dampOut?['in','data','dout']:['in','data'], i, n=pinN(b,'inPins'), m=pinN(b,'outPins'); for(i=1;i<=n;i++) p.push('pi'+i); for(i=1;i<=m;i++) p.push('po'+i); return p; }
  function boxDim(c){ var np=Math.max(pinN(c,'inPins'),pinN(c,'outPins')), w=Math.max(c.d.w,np?np*14+40:0); return {hw:w/2,hh:c.d.h/2}; }
  TYPES.box={name:'Controller Box',color:'#f2c200',label:'',kind:'box',
    fields:[F('name','Controller name (ID)','text','Controller 1',{wide:true,maxlen:24}),F('w','Width','number',240,{min:60,max:4000,step:10}),F('h','Height','number',160,{min:40,max:3000,step:10}),
            F('bg','Background','select','solid',{opts:[['tint','Translucent'],['solid','Solid color'],['none','None']]}),F('border','Outline width','number',1.5,{min:0,max:12,step:0.5}),F('round','Corner rounding','number',1,{min:0,max:40,step:1}),F('antenna','Antenna (wireless)','checkbox',false),F('dampOut','Damper output (to Siren Damper)','checkbox',false),
            F('vmin','Rated input voltage - min (V)','number',1,{min:0,max:100000,step:0.1}),F('vmax','Rated input voltage - max (V)','number',250,{min:0,max:100000,step:0.1}),
            F('showRated','Show rated voltage text','checkbox',true),
            F('inPins','Input pins','number',0,{min:0,max:32,step:1}),F('outPins','Output pins','number',0,{min:0,max:32,step:1}),F('pinCfg','','hiddentext','',{maxlen:700})],
    dim:boxDim,
    draw:function(c){ var m=boxDim(c), w=2*m.hw, h=2*m.hh, col=c.color, nm=esc(String(c.d.name||'').slice(0,24)), rr=(c.d.round==null?6:Math.max(0,Math.min(40,+c.d.round||0))), r='x="'+-m.hw+'" y="'+-m.hh+'" width="'+w+'" height="'+h+'" rx="'+rr+'"',
        solid=c.d.bg==='solid', bw=c.d.border, ol=solid?shade(col,0.6):col, tc=solid?(boxLight(col)?'#1a1a1a':'#fff'):col,
        bgR=c.d.bg==='none'?'':'<rect '+r+' fill="'+col+'" fill-opacity="'+(solid?1:0.06)+'" stroke="none" pointer-events="none"/>',
        olR=bw>0?'<rect '+r+' fill="none" stroke="'+ol+'" stroke-width="'+bw+'"'+(solid?' stroke-linejoin="round"':' stroke-dasharray="7 4"')+' pointer-events="none"/>':'';
      return bgR+olR+
        '<rect '+r+' fill="none" stroke="transparent" stroke-width="12" pointer-events="stroke"/>'+
        '<rect x="'+-m.hw+'" y="'+-m.hh+'" width="'+w+'" height="20" rx="'+Math.min(rr,10)+'" fill="'+(solid?'#000':col)+'" fill-opacity="'+(solid?0.3:0.22)+'"/>'+
        '<rect x="'+(-m.hw+8)+'" y="'+(-m.hh+7)+'" width="7" height="7" rx="1" fill="none" stroke="'+tc+'" stroke-width="1.2"/><rect x="'+(-m.hw+10)+'" y="'+(-m.hh+9)+'" width="3" height="3" fill="'+tc+'"/><text x="'+(-m.hw+20)+'" y="'+(-m.hh+14)+'" font-size="9" font-weight="normal" letter-spacing="1" fill="'+tc+'">'+nm+'</text>'+
        (c.d.showRated===false?'':'<text x="'+(-m.hw+8)+'" y="'+(m.hh-7)+'" font-size="8" letter-spacing="1" fill="'+tc+'" opacity="0.6" pointer-events="none">RATED '+ratedTxt(c)+'</text>')+
        (c.d.antenna?'<g transform="translate('+(m.hw-34)+','+(-m.hh+3)+')" fill="none" stroke="'+tc+'" stroke-width="1.2" stroke-linecap="round" opacity="0.9" pointer-events="none"><title>Antenna</title><path d="M0 14V5M0 14l-3 0M0 14l3 0"/><circle cx="0" cy="4" r="1.2" fill="'+tc+'" stroke="none"/><path d="M-3.5 1.5a5 5 0 0 1 0 5M3.5 1.5a5 5 0 0 0 0 5M-6 -0.5a8 8 0 0 1 0 9M6 -0.5a8 8 0 0 0 0 9"/></g>':'')+
        (c.id==null?'':'<text x="'+(m.hw-8)+'" y="'+(-m.hh+14)+'" text-anchor="end" font-size="9" fill="'+tc+'" opacity="0.85">C'+c.id+'</text>'); }};
  TYPES.midi={name:'MIDI Board',color:'#ff7ac8',label:'',kind:'midi',hw:64,hh:40,
    fields:[F('name','Board name','text','MIDI Board 1',{wide:true,maxlen:24}),
            F('low','','hidden',48,{min:0,max:127}),F('nmap','','hiddentext','',{maxlen:200}),
            F('vmin','','hidden',1,{min:0,max:100000}),F('vmax','','hidden',250,{min:0,max:100000})],
    draw:function(c){ var col=c.color, nm=esc(String(c.d.name||'').slice(0,24)), pl=!!c.playing, o='', i;
      o+='<rect x="-64" y="-40" width="128" height="80" rx="6" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="-63" y="-39" width="126" height="78" rx="5" fill="none" stroke="#fff" stroke-opacity=".14"/>';
      o+='<rect x="-58" y="-35" width="116" height="14" rx="3" fill="#0b0c0d" fill-opacity=".55"/><path d="M-50.4 -22V-30.5l4 1" fill="none" stroke="'+col+'" stroke-width="1.1" stroke-linecap="round"/><circle cx="-52" cy="-22" r="1.7" fill="'+col+'"/><text x="-43" y="-25" font-size="8" letter-spacing="1" fill="'+col+'">'+nm+'</text><circle cx="52" cy="-28" r="3.2" fill="'+(pl?'#45e07a':'#2c3a30')+'" stroke="#0b0c0d" stroke-width=".8"/>';
      o+='<rect x="-58" y="-17" width="116" height="35" rx="2" fill="#0b0c0d" fill-opacity=".7"/>';
      for(i=1;i<4;i++) o+='<line x1="-58" y1="'+(-17+i*8.75)+'" x2="58" y2="'+(-17+i*8.75)+'" stroke="#2a2f38" stroke-width=".6"/>';
      [[-54,-13,14],[-38,-4,10],[-26,4,18],[-6,-13,12],[8,-4,16],[26,-8,10],[38,4,14]].forEach(function(q){ o+='<rect x="'+q[0]+'" y="'+q[1]+'" width="'+q[2]+'" height="5" rx="1" fill="'+col+'" opacity=".85"/>'; });
      for(i=0;i<14;i++) o+='<rect x="'+(-58+i*8.28).toFixed(2)+'" y="21" width="8.28" height="15" fill="#e8eaee" stroke="#0b0c0d" stroke-width=".6"/>';
      [0,1,3,4,5,7,8,10,11,12].forEach(function(k){ o+='<rect x="'+(-58+(k+1)*8.28-2.6).toFixed(2)+'" y="21" width="5.2" height="9" fill="#15171a"/>'; });
      return o; }};
  var MIDI_SNAPS=['1/1','1/2','1/4','1/8','1/16','1/32','1/4T','1/8T','1/16T','off','none','1/6s','1/4s','1/3s','1/2s','step','1/6b','1/4b','1/3b','1/2b','beat','bar'];
  function cleanSeq(r){ r=(r&&typeof r==='object')?r:{}; function cl(v,lo,hi,df){ v=+v; return isFinite(v)?Math.max(lo,Math.min(hi,v)):df; }
    var d={tempo:Math.round(cl(r.tempo,20,400,120)*10)/10,num:Math.round(cl(r.num,1,32,4)),den:[1,2,4,8,16,32].indexOf(+r.den)>=0?+r.den:4,bars:Math.round(cl(r.bars,1,256,8)),
      snap:MIDI_SNAPS.indexOf(r.snap)>=0?r.snap:'step',snapm:r.snapm==='line'?'line':'cell',loop:!!r.loop,zx:cl(r.zx,12,320,48),zy:cl(r.zy,8,32,16),name:String(r.name==null?'':r.name).slice(0,32),notes:[]};
    if(Array.isArray(r.notes)) r.notes.slice(0,8000).forEach(function(a){ if(!Array.isArray(a)) return; var n=Math.round(+a[0]),t=Math.round(+a[1]),l=Math.round(+a[2]),v=Math.round(+a[3]);
      if(!(n>=0&&n<=127&&t>=0&&t<=30000000&&l>=1&&l<=30000000)) return; d.notes.push([n,t,l,(v>=1&&v<=127)?v:100]); });
    return d; }
  window._midiCleanSeq=cleanSeq;
  var MAX_SEQS=32;
  function ensureSeqs(c){ if(!Array.isArray(c.seqs)||!c.seqs.length){ c.seqs=[c.seq?c.seq:cleanSeq(null)]; c.sq=0; }
    if(c.seqs.length>MAX_SEQS) c.seqs.length=MAX_SEQS;
    c.seqs.forEach(function(q,i){ if(!q.name) q.name='Sequence '+(i+1); });
    c.sq=Math.max(0,Math.min(c.seqs.length-1,Math.round(+c.sq)||0)); c.seq=c.seqs[c.sq]; return c.seq; }
  window._midiEnsureSeqs=ensureSeqs;
  var customDefs=[], nextDef=1, CU_ACC='#35b9f0';
  function defById(id){ id=+id; for(var i=0;i<customDefs.length;i++) if(customDefs[i].id===id) return customDefs[i]; return null; }
  function cdef(c){ return (c&&c.d)?defById(c.d.def):null; }
  function cuDim(c){ var df=cdef(c); if(!df) return {hw:30,hh:30}; return {hw:df.w/2,hh:Math.min(df.w*df.ar,600)/2}; }
  function cuPorts(df){ var p=[]; if(df){ if(df.nodes.in) p.push('in'); if(df.nodes.out) p.push('out'); if(df.nodes.data) p.push('data'); if(df.nodes.damp) p.push('dout'); } return p; }
  function cuOut(df){ return {id:df.id,name:df.name,art:df.art,ar:df.ar,w:df.w,nodes:{in:!!df.nodes.in,out:!!df.nodes.out,data:!!df.nodes.data,damp:!!df.nodes.damp},vmin:df.vmin,vmax:df.vmax,parts:JSON.parse(JSON.stringify(df.parts||[])),nextPid:df.nextPid||1}; }
  function cleanDef(r){
    if(!r||typeof r!=='object') return null; var id=Math.round(+r.id); if(!(id>0)) return null;
    function cl(v,lo,hi,df){ v=+v; return isFinite(v)?Math.max(lo,Math.min(hi,v)):df; }
    var d={id:id,name:String(r.name==null?'':r.name).trim().slice(0,24)||'Custom',art:'',ar:cl(r.ar,0.05,20,1),w:cl(r.w,20,560,80),
      nodes:{in:!!(r.nodes&&r.nodes.in),out:!!(r.nodes&&r.nodes.out),data:!!(r.nodes&&r.nodes.data),damp:!!(r.nodes&&r.nodes.damp)},vmin:cl(r.vmin,0,100000,1),vmax:cl(r.vmax,0,100000,250)};
    if(typeof r.art==='string'&&r.art.length<3000000&&IMG_RE.test(r.art)) d.art=r.art;
    d.parts=cleanParts(r.parts); d.nextPid=Math.max(Math.round(+r.nextPid)||1,d.parts.reduce(function(m,q){ return Math.max(m,q.pid+1); },1));
    return d; }
  function cleanParts(raw){ var o=[];
    if(Array.isArray(raw)) raw.slice(0,40).forEach(function(q){
      if(!q||typeof q!=='object'||!TYPES[q.type]||q.type==='box'||q.type==='custom'||q.type==='midi') return; var pid=Math.round(+q.pid); if(!(pid>0)||o.some(function(x){ return x.pid===pid; })) return;
      var t=TYPES[q.type]; function cl(v,lo,hi,df){ v=+v; return isFinite(v)?Math.max(lo,Math.min(hi,v)):df; }
      o.push({pid:pid,type:q.type,ox:cl(q.ox,-3000,3000,0),oy:cl(q.oy,-3000,3000,0),scale:cl(q.scale,10,1000,100),label:String(q.label==null?'':q.label).slice(0,40),
        color:(typeof q.color==='string'&&HEXRE.test(q.color))?q.color:t.color,latch:!!q.latch&&t.kind==='button',d:t.init?cleanD(t,q.d):null,img:cleanImg(q.img)}); });
    return o; }
  function partsOf(h){ return comps.filter(function(c){ return c.in===h.id; }); }
  function partComp(h,q){ var t=TYPES[q.type];
    return {id:nextId++,type:q.type,x:h.x,y:h.y,scale:q.scale,label:q.label,lfont:'',lsize:10,lbold:false,hideLabel:false,hideText:false,lcolor:'',tcolor:'',color:q.color,on:false,latch:!!q.latch,
      d:t.init?cleanD(t,q.d):null,img:q.img?JSON.parse(JSON.stringify(q.img)):null,in:h.id,pid:q.pid,ox:q.ox,oy:q.oy,bs:q.scale}; }
  function cuMakeParts(h,df){ (df.parts||[]).forEach(function(q){ comps.push(partComp(h,q)); }); }
  function cuSyncParts(df){
    comps.filter(function(c){ return isCu(c)&&+c.d.def===df.id; }).forEach(function(h){
      var keep={}; df.parts.forEach(function(q){ keep[q.pid]=q; });
      comps=comps.filter(function(c){ return c.in!==h.id||(keep[c.pid]&&keep[c.pid].type===c.type); });
      df.parts.forEach(function(q){ var ex=null; comps.forEach(function(c){ if(c.in===h.id&&c.pid===q.pid) ex=c; });
        if(ex){ ex.ox=q.ox; ex.oy=q.oy; ex.bs=q.scale; } else comps.push(partComp(h,q)); }); }); }
  function placeParts(){
    for(var i=comps.length-1;i>=0;i--){ var c=comps[i]; if(!c.in) continue; var h=byId(c.in);
      if(!h||!isCu(h)){ comps.splice(i,1); continue; }
      c.x=h.x+(c.ox||0)*SX(h); c.y=h.y+(c.oy||0)*SY(h); c.scale=Math.max(10,Math.min(2000,(c.bs||100)*Math.min(SX(h),SY(h)))); c.sx=undefined; c.sy=undefined; } }
  function cuPlaceholder(w,h,name){ return '<rect x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" rx="5" fill="#14161a" stroke="'+CU_ACC+'" stroke-dasharray="5 4"/>'+
    '<text x="0" y="3" text-anchor="middle" font-size="9" letter-spacing="1" fill="'+CU_ACC+'">'+esc(String(name).slice(0,24))+'</text>'; }
  TYPES.custom={name:'Custom Component',color:CU_ACC,label:'',kind:'custom',
    fields:[F('def','','hidden',0,{min:0,max:1000000000}),F('name','Name (ID)','text','Custom',{wide:true,maxlen:24})],
    dim:cuDim,
    draw:function(c){ var df=cdef(c), m=cuDim(c), w=2*m.hw, h=2*m.hh;
      if(df&&df.art&&IMG_RE.test(df.art)) return '<image href="'+df.art+'" x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/>';
      return cuPlaceholder(w,h,df?df.name:'MISSING'); }};
  Object.keys(TYPES).forEach(function(k){ var t=TYPES[k]; if(t.fields) t.init=function(){ var d={}; t.fields.forEach(function(f){ d[f.k]=f.def; }); return d; }; });
  function cleanImg(r){
    if(!r||typeof r!=='object') return null;
    var o={off:'',on:'',w:60,ar:1};
    ['off','on'].forEach(function(k){ if(typeof r[k]==='string'&&r[k].length<3000000&&IMG_RE.test(r[k])) o[k]=r[k]; });
    if(isFinite(+r.w)) o.w=Math.max(10,Math.min(560,+r.w)); if(isFinite(+r.ar)) o.ar=Math.max(0.05,Math.min(20,+r.ar));
    return (o.off||o.on)?o:null; }
  function cleanD(t,raw){ var d=t.init(); if(!raw||typeof raw!=='object') return d;
    if(t===TYPES.box&&raw.round===undefined) d.round=6;
    t.fields.forEach(function(f){ var v=raw[f.k]; if(v===undefined||v===null) return;
      if(f.type==='number'||f.type==='hidden'){ v=+v; if(isFinite(v)) d[f.k]=Math.max(f.min,Math.min(f.max,v)); }
      else if(f.type==='checkbox') d[f.k]=!!v;
      else if(f.type==='color'){ if(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)) d[f.k]=v.toLowerCase(); }
      else if(f.type==='select'){ if(f.opts.some(function(o){return o[0]===v;})) d[f.k]=v; }
      else if(f.type==='image'){ if(typeof v==='string'&&(v===''||(v.length<3000000&&IMG_RE.test(v)))) d[f.k]=v; }
      else d[f.k]=String(v).slice(0,f.maxlen||200); });
    return d; }
  var ORDER=['switch','slideswitch','toggle','breaker','circle','squarebtn','square','artimer','selector','pot','buzzer','light','keypad','lcd','text','shape','image','box','midi'];

  function isBox(c){ return TYPES[c.type].kind==='box'; }
  function boxes(){ return comps.filter(isBox); }
  function isCu(c){ return c.type==='custom'; }
  function isMidi(c){ return TYPES[c.type].kind==='midi'; }
  function midis(){ return comps.filter(isMidi); }
  function isCtl(c){ return isBox(c)||isCu(c); }
  function ctls(){ return comps.filter(isCtl); }
  function selfPowered(c){ var df=cdef(c); return !!df&&!df.nodes.in; }
  function ratedLo(c){ var a=+c.d.vmin, b=+c.d.vmax; return Math.min(isFinite(a)?a:0,isFinite(b)?b:0); }
  function ratedHi(c){ var a=+c.d.vmin, b=+c.d.vmax; return Math.max(isFinite(a)?a:0,isFinite(b)?b:0); }
  function ratedTxt(c){ var f=function(x){ return String(Math.round(x*100)/100); }; return f(ratedLo(c))+'\u2013'+f(ratedHi(c))+' V'; }
  function boxKey(c){ return 'b'+c.id; }
  function ownerKey(c){
    if(c.in) return 'b'+c.in;
    if(isBox(c)) return boxKey(c);
    var best=null, ba=1e12;
    comps.forEach(function(b){ if(!isBox(b)) return; var e=ext(b);
      if(Math.abs(c.x-b.x)<=e.hw&&Math.abs(c.y-b.y)<=e.hh){ var a=e.hw*e.hh; if(a<ba){ ba=a; best=b; } } });
    return best?boxKey(best):'main';
  }
  function members(c){ if(!isBox(c)) return []; var e=ext(c);
    return comps.filter(function(m){ if(m===c||m.in) return false;
      if(isBox(m)){ var me=ext(m); return me.hw*me.hh<e.hw*e.hh&&Math.abs(m.x-c.x)+me.hw<=e.hw&&Math.abs(m.y-c.y)+me.hh<=e.hh; }
      return Math.abs(m.x-c.x)<=e.hw&&Math.abs(m.y-c.y)<=e.hh; }); }
  function uniqueName(want,self){
    var base=String(want==null?'':want).trim().slice(0,24)||'Controller', n=base, i=2;
    function taken(x){ x=x.toLowerCase(); return x==='main'||ctls().some(function(b){ return b!==self&&String(b.d.name).toLowerCase()===x; }); }
    while(taken(n)){ var suf=' '+(i++); n=base.slice(0,24-suf.length)+suf; }
    return n;
  }
  var snapOn=true;
  try{ var _ss=JSON.parse(localStorage.getItem('ceSnap')||'null'); if(_ss&&isFinite(_ss.size)&&_ss.size>=0&&_ss.size<=200) GRID=_ss.size; }catch(_){}
  snapOn=GRID>0;
  function snap(v){ return snapOn?Math.round(v/GRID)*GRID:Math.round(v*10)/10; }
  (function(){ var sz=document.getElementById('ceSnapSize'); if(!sz) return; sz.value=GRID;
    sz.addEventListener('input',function(){ var v=parseFloat(sz.value); if(isFinite(v)&&v>=0&&v<=200){ GRID=v; snapOn=v>0; try{ localStorage.setItem('ceSnap',JSON.stringify({size:GRID})); }catch(_){} } });
    sz.addEventListener('change',function(){ sz.value=GRID; }); })();
  function wsnap(p,anchors,off){ var x=off?r1(p.x):snap(p.x), y=off?r1(p.y):snap(p.y); if(!off) (anchors||[]).forEach(function(a){ if(!a) return; if(Math.abs(p.x-a.x)<=6) x=a.x; if(Math.abs(p.y-a.y)<=6) y=a.y; }); return {x:x,y:y}; }
  function byId(id){ if(idC){ var h=idC.get(id); return h===undefined?null:h; } for(var i=0;i<comps.length;i++) if(comps[i].id===id) return comps[i]; return null; }
  function selSet(c,np){ np=Math.max(0,Math.min(selN(c)-1,np|0)); var old=selPos(c), was=!!c.on; if(np===old) return; c.d.pos=String(np); c.on=np>0; if(apiR) renderSoon(c); else render(); if(c.on!==was) emit(c.on?'on':'off',c); emit('sel',c,np+1); try{ if(selId===c.id) buildProps(); }catch(_){} }
  function emit(kind,c,info){ try{ if(window._feEvent) window._feEvent(kind,c.id,info); }catch(_){} }
  function hasImg(c){ return !!(c.img && (c.img.off||c.img.on) && !TYPES[c.type].dim && TYPES[c.type].kind!=='keypad'); }
  var HEXRE=/^#[0-9a-f]{6}$/i;
  function tintText(str,col){ return str.replace(/<text\b([^>]*)>/g,function(m,a){ return '<text'+a.replace(/\sfill="[^"]*"/,'')+' fill="'+col+'">'; }); }
  function SX(c){ return (c.sx||c.scale)/100; }
  function SY(c){ return (c.sy||c.scale)/100; }
  function ext(c){ var t=TYPES[c.type], d=t.dim?t.dim(c):t;
    if(hasImg(c)) d={hw:c.img.w/2,hh:Math.min(c.img.w*c.img.ar,600)/2}; return {hw:d.hw*SX(c), hh:d.hh*SY(c)}; }
  var LIM=100000;
  function clampPos(c){ c.x=isFinite(c.x)?Math.max(-LIM,Math.min(LIM,c.x)):W/2; c.y=isFinite(c.y)?Math.max(-LIM,Math.min(LIM,c.y)):H/2; }

  function imgDraw(c){
    var src=c.on?(c.img.on||c.img.off):(c.img.off||c.img.on), w=c.img.w, h=Math.min(w*c.img.ar,600);
    return IMG_RE.test(src)?'<image href="'+src+'" x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>':''; }
  function compSVG(c){
    var t=TYPES[c.type], e=ext(c), sel=(c.id===selId && mode==='edit'), hid=!!(c.type==='buzzer'&&c.d&&c.d.hide);
    if(hid&&mode!=='edit') return '';
    var isTxt=(c.type==='text'), out='<g class="ce-comp'+(isTxt?' ce-textc':'')+'" data-id="'+c.id+'" transform="translate('+c.x+','+c.y+')">';
    if(!isBox(c)) out+='<rect x="'+(-e.hw-8)+'" y="'+(-e.hh-8)+'" width="'+(2*e.hw+16)+'" height="'+(2*e.hh+(isTxt&&!c.label?16:34))+'" fill="transparent"/>';
    if(sel) out+='<rect x="'+(-e.hw-6)+'" y="'+(-e.hh-6)+'" width="'+(2*e.hw+12)+'" height="'+(2*e.hh+30)+'" fill="none" stroke="#35b9f0" stroke-width="1" stroke-dasharray="4 3"/>';
    var geo=(c.type==='shape'&&!hasImg(c)), inner=hasImg(c)?imgDraw(c):(geo?t.draw(c,SX(c),SY(c)):t.draw(c)); if(c.tcolor&&HEXRE.test(c.tcolor)) inner=tintText(inner,c.tcolor);
    var hvis=mode==='edit'?0.25:0;
    if(c.hideText) inner=inner.replace(/<text\b/g,'<text opacity="'+hvis+'"');
    var tcf=(!geo&&!hasImg(c)&&t.kind!=='static'&&t.kind!=='box'&&t.kind!=='lcd');
    out+='<g transform="scale('+(geo?1:SX(c))+','+(geo?1:SY(c))+')"'+(hid?' opacity="0.4"':'')+'>'+(tcf?'<g filter="url(#tcFx)">'+inner+'</g>':inner)+'</g>';
    if(c.label){ var ls=c.lsize||10; out+='<text x="0"'+(c.hideLabel?' opacity="'+hvis+'"':'')+' y="'+(e.hh+5+ls)+'" text-anchor="middle" font-size="'+ls+'"'+(c.lfont?' font-family="'+esc(textFam(c.lfont))+'" style="font-family:'+esc(textFam(c.lfont))+' !important"':'')+(c.lbold?' font-weight="bold"':' font-weight="normal"')+' fill="'+(c.lcolor&&HEXRE.test(c.lcolor)?c.lcolor:'#8a8f9c')+'" letter-spacing="1">'+esc(c.label)+'</text>'; }
    if(sel) out+=handlesSVG(e.hw,e.hh,'',isBox(c)?['w','e','s']:null);
    return out+'</g>';
  }
  var HCUR={nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'};
  function handlesSVG(hw,hh,nk,mv){
    var rw=svg.getBoundingClientRect().width, ppu=(rw&&zoom)?rw/(W/zoom):1, hs=7/ppu, P={nw:[-hw,-hh],n:[0,-hh],ne:[hw,-hh],e:[hw,0],se:[hw,hh],s:[0,hh],sw:[-hw,hh],w:[-hw,0]}, o='';
    (mv||[]).forEach(function(k){ if(k==='s') P.s=[hw/2,hh]; else P[k]=[P[k][0],hh/2]; });
    Object.keys(P).forEach(function(k){ o+='<rect class="ce-handle" data-h="'+k+'"'+(nk?' data-n="'+nk+'"':'')+' x="'+(P[k][0]-hs/2)+'" y="'+(P[k][1]-hs/2)+'" width="'+hs+'" height="'+hs+'" fill="#0b0c0d" stroke="#35b9f0" stroke-width="'+(1.5/ppu)+'" style="cursor:'+HCUR[k]+'"/>'; });
    return o; }
  function render(){
    placeParts(); var bx=[], cu=[], ot=[]; comps.forEach(function(c){ (isBox(c)?bx:isCu(c)?cu:ot).push(c); });
    layer.innerHTML=bx.concat(cu,ot).map(compSVG).join('');
    if(hint) hint.style.display=comps.length?'none':'';
    renderWires();
    try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){}
    if(window._ceHistSoon) window._ceHistSoon();
  }
  var rcQ={}, rcAll=false, rcT=0, rcDirty=false, apiR=false;
  function renderSoon(c){ if(c) rcQ[c.id]=c; else rcAll=true; if(rcT) return; rcT=1;
    var f=function(){ if(!rcT) return; rcT=0; rcFlush(); };
    if(document.hidden) setTimeout(f,100); else { requestAnimationFrame(f); setTimeout(f,120); } }
  function rcFlush(){ var q=rcQ, all=rcAll; rcQ={}; rcAll=false;
    if(!wiresVisible()){ rcDirty=true; return; }
    var jobs=[];
    if(!all){ var ids=Object.keys(q); for(var i=0;i<ids.length;i++){ var c=q[ids[i]]; if(!byId(c.id)){ all=true; break; }
        var el=layer.querySelector('[data-id="'+c.id+'"]'), h=compSVG(c); if(!el||!h){ all=true; break; } jobs.push([el,h]); } }
    if(all){ rcDirty=false; render(); return; }
    jobs.forEach(function(j){ if(j[0].parentNode) j[0].outerHTML=j[1]; });
    window._ceWiresRefresh();
  }

  var links=[], selLink=-1, linkDrag=null, srcPos={x:62,y:40}, sirenPos={x:538,y:40}, blowerPos={x:538,y:110}, damperPos={x:538,y:180}, rotatorPos={x:538,y:250}, selNode=null, NODE_HW=46, NODE_HH=20, VCOL='#ffb020', DCOL='#35b9f0', KCOL='#3ddc97', WGRAY='#7d828d', flashT={}, cut=null, rrDrag=null;
  var SIDE_NAMES={l:'Left',r:'Right',t:'Top',b:'Bottom'};
  function cleanSides(o){ if(!o||typeof o!=='object') return undefined; var r={}, n=0; Object.keys(o).forEach(function(p){ if(n<200&&/^[a-z]{1,5}\d{0,3}$/.test(p)&&SIDE_NAMES[o[p]]){ r[p]=o[p]; n++; } }); return n?r:undefined; }
  function isFixedKey(k){ return k==='source'||k==='siren'||k==='blower'||k==='damper'||k==='rotator'; }
  function isItemArt(k){ return k==='blower'||k==='damper'||k==='rotator'; }
  function itemKey(k){ return k==='blower'||k==='damper'||k==='rotator'; }
  function nodePos(k){ return k==='source'?srcPos:k==='blower'?blowerPos:k==='damper'?damperPos:k==='rotator'?rotatorPos:sirenPos; }
  function damperPinCount(){ try{ return (window._damperMode&&window._damperMode()==='controller'&&window._damperGroupCount)?window._damperGroupCount():0; }catch(_){ return 0; } }
  function rotatorV(){ var v=0; links.forEach(function(x){ if(x.t==='p'&&x.to==='rotator'&&x.tp==='bin') v=linkV(x); }); return v; }
  function blowerV(){ var v=0; links.forEach(function(x){ if(x.t==='p'&&x.to==='blower'&&x.tp==='bin') v=linkV(x); }); return v; }
  function sideHolder(key){ if(isFixedKey(key)) return nodeSt[key]; var c=byId(parseInt(String(key).slice(1),10)); return c||null; }
  function portSide(key,p){ var h=sideHolder(key); return (h&&h.sides&&SIDE_NAMES[h.sides[p]])?h.sides[p]:''; }
  function setPortSide(key,p,s){ var h=sideHolder(key); if(!h) return; if(!SIDE_NAMES[s]){ if(h.sides){ delete h.sides[p]; if(!Object.keys(h.sides).length&&!isFixedKey(key)) delete h.sides; } return; } if(!h.sides) h.sides={}; h.sides[p]=s; }
  function sidePos(n,p,sd){ var same=n.ports.filter(function(q){ return portSide(n.key,q)===sd; }), m=same.length, k=Math.max(0,same.indexOf(p)), f=(k+1)/(m+1);
    return sd==='l'?{x:n.x-n.hw,y:n.y-n.hh+2*n.hh*f}:sd==='r'?{x:n.x+n.hw,y:n.y-n.hh+2*n.hh*f}:sd==='t'?{x:n.x-n.hw+2*n.hw*f,y:n.y-n.hh}:{x:n.x-n.hw+2*n.hw*f,y:n.y+n.hh}; }
  function portName(n,p){ var m=/^p([io])(\d+)$/.exec(p);
    if(m){ var c=byId(parseInt(String(n.key).slice(1),10)); return m[1]==='i'?('Input pin '+m[2]+(c&&pinCfgOf(c.d,+m[2]).m==='a'?' (A)':' (D)')):('Output pin '+m[2]); }
    var dgm=/^dg(\d+)$/.exec(p); if(dgm) return 'Damper group '+dgm[1]; if(p==='bin') return n.key==='rotator'?'Rotator in':'Blower in'; if(p==='din') return 'Damper in'; if(p==='dout') return 'Damper out'; if(p==='data') return 'Data';
    if(p==='in') return n.key==='siren'?'Motor in':'Input'; if(p==='out') return 'Output'; return p; }
  function sideLab(n,p,pp,pcol){ var m=/^p([io])(\d+)$/.exec(p), t;
    if(m){ var c=byId(parseInt(String(n.key).slice(1),10)); t=m[1]==='i'?((c&&pinCfgOf(c.d,+m[2]).m==='a'?'A':'D')+m[2]):('O'+m[2]); }
    else t=/^dg\d+$/.test(p)?'G'+p.slice(2):p==='bin'?(n.key==='rotator'?'ROTATOR':'BLOWER'):p==='din'?'DAMPER':p==='dout'?'DAMPER':p==='data'?'DATA':p==='in'?(n.key==='siren'?'MOTOR':'IN'):(p==='out'&&n.key!=='source')?'OUT':''; if(!t) return '';
    var sd=portSide(n.key,p), x=pp.x, y=pp.y+2.5, a='middle'; if(sd==='l'){ x+=8; a='start'; } else if(sd==='r'){ x-=8; a='end'; } else if(sd==='t') y=pp.y+10; else y=pp.y-6;
    return '<text x="'+x+'" y="'+y+'" text-anchor="'+a+'" font-size="6" fill="'+pcol+'" pointer-events="none" class="ce-plab">'+t+'</text>'; }
  function sidesUI(key){ var n=nodeOf(key); if(!n||!n.ports.length) return '';
    var so=Object.keys(SIDE_NAMES);
    var rows=n.ports.map(function(p){ var sd=portSide(key,p); return '<tr><td>'+esc(portName(n,p))+'</td><td><select id="cePS_'+p+'"><option value="">Auto</option>'+so.map(function(k){ return '<option value="'+k+'"'+(sd===k?' selected':'')+'>'+SIDE_NAMES[k]+'</option>'; }).join('')+'</select></td></tr>'; }).join('');
    return grp('sides','Pin Sides ('+n.ports.length+')','<div id="cePSbox" class="ce-tw"><table class="ce-tbl"><thead><tr><th>Pin</th><th>Side</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<button type="button" class="vbtn btn-gray" id="cePSReset" style="grid-column:1/-1;font-size:10px;letter-spacing:1px">RESET SIDES</button>',false); }
  function sideKeyNow(){ return selNode||((mode==='edit'||true)&&selId!=null&&byId(selId)?boxKey(byId(selId)):null); }
  function sideProp(e){ var id=e.target.id||''; if(id.indexOf('cePS_')!==0) return false; var key=sideKeyNow(); if(!key) return true; setPortSide(key,id.slice(5),e.target.value); renderWires(); try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){} return true; }
  function nodeDef(k){ var it=k==='blower'||k==='damper'; return {name:({source:'SOURCE',siren:'SIREN',blower:'BLOWER',damper:'DAMPER',rotator:'ROTATOR'})[k]||'SIREN',color:({source:'#ffb020',siren:'#c78bff',blower:'#ff5d5d',damper:'#3ddc97',rotator:'#4da3ff'})[k]||'#c78bff',tcolor:'',vcolor:'',w:k==='source'?120:92,h:k==='source'?56:40,font:'',size:9,bold:false,showV:true,showName:k!=='source',looks:{dc:'battery',ac1:'outlet',ac3:'converter'},drain:false,drainMin:10,cutoff:0,blower:false,bMin:1,bMax:250,vOn:3,on:false,sides:{}}; }
  var nodeSt={source:nodeDef('source'),siren:nodeDef('siren'),blower:nodeDef('blower'),damper:nodeDef('damper'),rotator:nodeDef('rotator')};
  function cleanNodeSt(k,o){ var d=nodeDef(k); if(!o||typeof o!=='object') return d;
    if(typeof o.name==='string') d.name=o.name.slice(0,16);
    if(/^#[0-9a-f]{6}$/i.test(o.color)) d.color=o.color.toLowerCase();
    if(/^#[0-9a-f]{6}$/i.test(o.tcolor)) d.tcolor=o.tcolor.toLowerCase(); if(/^#[0-9a-f]{6}$/i.test(o.vcolor)) d.vcolor=o.vcolor.toLowerCase();
    if(isFinite(+o.w)) d.w=Math.max(40,Math.min(600,+o.w)); if(isFinite(+o.h)) d.h=Math.max(24,Math.min(300,+o.h));
    if(TEXT_FONTS.some(function(x){return x[0]===o.font;})) d.font=o.font;
    if(isFinite(+o.size)) d.size=Math.max(6,Math.min(40,+o.size)); d.bold=!!o.bold; d.showV=o.showV!==false; d.showName=o.showName===true;
    if(o.looks&&typeof o.looks==='object') ['dc','ac1','ac3'].forEach(function(t){ if(SRC_LOOKS[t].some(function(x){ return x[0]===o.looks[t]; })) d.looks[t]=o.looks[t]; });
    d.drain=!!o.drain; if(isFinite(+o.drainMin)) d.drainMin=Math.max(0.1,Math.min(100000,+o.drainMin)); if(isFinite(+o.cutoff)) d.cutoff=Math.max(0,Math.min(100000,+o.cutoff));
    d.sides=cleanSides(o.sides)||{};
    if(k==='siren'||k==='blower'||k==='rotator'){ d.blower=o.blower===true; if(isFinite(+o.bMin)) d.bMin=Math.max(0,Math.min(100000,+o.bMin)); if(isFinite(+o.bMax)) d.bMax=Math.max(0,Math.min(100000,+o.bMax)); } if(k==='blower'||k==='damper'||k==='rotator') d.on=o.on===true; if(k==='damper'&&isFinite(+o.vOn)) d.vOn=Math.max(0,Math.min(100000,+o.vOn)); return d; }
  var wl=document.createElementNS('http://www.w3.org/2000/svg','g'); wl.setAttribute('id','ceWires'); layer.parentNode.insertBefore(wl,layer.nextSibling);
  var anC=null, idC=null;
  function allNodes(){ return anC||allNodesRaw(); }
  function allNodesRaw(){ var a=[{key:'source',x:srcPos.x,y:srcPos.y,hw:nodeSt.source.w/2,hh:nodeSt.source.h/2,fixed:true,ports:['out']},{key:'siren',x:sirenPos.x,y:sirenPos.y,hw:nodeSt.siren.w/2,hh:nodeSt.siren.h/2,fixed:true,ports:['in']}];
    if(nodeSt.blower.on) a.push({key:'blower',x:blowerPos.x,y:blowerPos.y,hw:nodeSt.blower.w/2,hh:nodeSt.blower.h/2,fixed:true,ports:['bin']});
    if(nodeSt.rotator.on) a.push({key:'rotator',x:rotatorPos.x,y:rotatorPos.y,hw:nodeSt.rotator.w/2,hh:nodeSt.rotator.h/2,fixed:true,ports:['bin']});
    if(nodeSt.damper.on){ var dN=damperPinCount(), dp=['din'], di; for(di=1;di<=dN;di++) dp.push('dg'+di); a.push({key:'damper',x:damperPos.x,y:damperPos.y,hw:Math.max(nodeSt.damper.w,dN?dN*16+24:0)/2,hh:nodeSt.damper.h/2,fixed:true,ports:dp}); }
    ctls().forEach(function(b){ var e=ext(b), pt=isBox(b)?boxPorts(b):cuPorts(cdef(b)); if(pt.length) a.push({key:boxKey(b),x:b.x,y:b.y,hw:e.hw,hh:e.hh,ports:pt}); });
    comps.forEach(function(m){ if(isMidi(m)){ var e2=ext(m); a.push({key:boxKey(m),x:m.x,y:m.y,hw:e2.hw,hh:e2.hh,ports:['in','data','dout'],mid:true}); } });
    return a; }
  function nodeOf(key){ var n=allNodes(); for(var i=0;i<n.length;i++) if(n[i].key===key) return n[i]; return null; }
  function portPos(key,p){ var n=nodeOf(key); if(!n) return null;
    var sdo=portSide(key,p); if(sdo) return sidePos(n,p,sdo);
    var pm=/^p([io])(\d+)$/.exec(p); if(pm){ var pc=byId(parseInt(String(key).slice(1),10)), cnt=pc?pinN(pc,pm[1]==='i'?'inPins':'outPins'):1, k=+pm[2], px;
      if(pm[1]==='i') px=n.x-n.hw+2*n.hw*k/(cnt+1);
      else { var L=Math.floor(cnt/2), step=Math.min(16,(n.hw-8)/(Math.ceil(cnt/2)+0.5)); px=k<=L?n.x-step*(L-k+1):n.x+step*(k-L); }
      return {x:px,y:n.y+(pm[1]==='i'?-n.hh:n.hh)}; }
    var dgm2=/^dg(\d+)$/.exec(p); if(dgm2&&key==='damper'){ var dc=Math.max(1,damperPinCount()), dk=+dgm2[1]; return {x:n.x-n.hw+2*n.hw*dk/(dc+1),y:n.y-n.hh}; }
    if(p==='bin'||p==='din') return {x:n.x-n.hw,y:n.y};
    if(p==='dout') return {x:n.x+n.hw,y:n.y+(n.mid?0:Math.max(12,n.hh*0.5))};
    return p==='in'?{x:n.x-n.hw,y:n.y}:p==='out'?{x:n.x+n.hw,y:n.y}:{x:n.x,y:n.y+n.hh}; }
  function pcls(p){ return (p==='out'||/^po\d+$/.test(p))?'o':(p==='in'||p==='bin'||/^pi\d+$/.test(p)||/^dg\d+$/.test(p))?'i':p; }
  function compat(a,b){ var ca=pcls(a.p), cb=pcls(b.p); return a.k!==b.k&&((ca==='o'&&cb==='i')||(ca==='i'&&cb==='o')||(a.p==='data'&&b.p==='data')||(a.p==='dout'&&b.p==='din')||(a.p==='din'&&b.p==='dout')); }
  function lkPorts(l){ return l.t==='p'?[l.fp,l.tp]:l.t==='v'?['out','in']:l.t==='k'?['dout','din']:['data','data']; }
  function isConn(key,p){ if(/^dg\d+$/.test(p)) return links.some(function(l){ return l.t==='p'&&l.to===key&&l.tp===p; }); if(/^p[io]\d+$/.test(p)||p==='in'||p==='out'){ if(links.some(function(l){ return l.t==='p'&&((l.f===key&&l.fp===p)||(l.to===key&&l.tp===p)); })) return true; if(/^p[io]\d+$/.test(p)) return false; }
    return links.some(function(l){ return p==='bin'?(l.t==='p'&&l.to===key&&l.tp==='bin'):p==='data'?(l.t==='d'&&(l.f===key||l.to===key)):p==='dout'?(l.t==='k'&&l.f===key):p==='din'?(l.t==='k'&&l.to===key):p==='out'?(l.t==='v'&&l.f===key):(l.t==='v'&&l.to===key); }); }
  var SRC_LOOKS={dc:[['battery','Battery'],['supply','Power supply']],ac1:[['outlet','Outlet'],['pole','Transformer']],ac3:[['converter','Phase converter'],['tapped','Tapped wire']]};
  var SRC_TYPE_NAMES={dc:'DC',ac1:'AC 1ph',ac3:'AC 3ph'};
  function curType(){ var el=document.getElementById('currentTypeSelect'); return (el&&SRC_LOOKS[el.value])?el.value:'ac3'; }
  function srcLook(){ var st=nodeSt.source, t=curType(); return (st.looks&&st.looks[t])||SRC_LOOKS[t][0][0]; }
  var batt={t0:Date.now()};
  function battActive(){ return !!nodeSt.source.drain&&curType()==='dc'&&srcLook()==='battery'; }
  function battFrac(){ return Math.max(0,Math.min(1,(Date.now()-batt.t0)/60000/Math.max(0.01,nodeSt.source.drainMin))); }
  function srcArt(st,hw,hh,col){
    var look=srcLook(), sc=srcSc(hw,hh), cx=-hw+4+20*sc, o='';
    if(look==='battery'){ var chg=battActive()?1-battFrac():1, lc=chg>0.5?'#45b36b':chg>0.2?'#ffb020':'#d9534f', lw=26*chg;
      o='<rect x="-13" y="-12" width="7" height="4.5" rx="1" fill="#2a2d35" stroke="#5b606a" stroke-width=".7"/><rect x="6" y="-12" width="7" height="4.5" rx="1" fill="#d9534f" stroke="#5b606a" stroke-width=".7"/>'+
        '<rect x="-17" y="-8" width="34" height="21" rx="2.5" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="-16.4" y="-7.4" width="32.8" height="5" rx="2" fill="#3a3f48"/>'+
        '<path d="M-11.5 -5h5M9 -7.4v4.8M6.6 -5h4.8" stroke="#e8eaee" stroke-width=".9" stroke-linecap="round" fill="none"/>'+
        '<rect x="-14" y="0" width="28" height="10.5" rx="1.5" fill="#0b0c0d" stroke="#2a2d35" stroke-width=".7"/>'+(lw>0.3?'<rect x="-13" y="1" width="'+lw.toFixed(2)+'" height="8.5" rx="1" fill="'+lc+'"/>':'')+
        '<path d="M-6.5 1v8.5M0 1v8.5M6.5 1v8.5" stroke="#000" stroke-opacity=".4" stroke-width=".6"/><rect x="-17" y="-8" width="34" height="21" rx="2.5" fill="url(#tcShine)" opacity=".3"/>'; }
    else if(look==='supply'){
      o='<rect x="-18" y="-13" width="36" height="26" rx="2.5" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="-17" y="-12" width="34" height="24" rx="2" fill="none" stroke="#fff" stroke-opacity=".14"/>'+
        '<rect x="-14" y="-9" width="17" height="9" rx="1" fill="#0b0c0d" stroke="#2a2d35"/><rect x="-12.5" y="-7.5" width="14" height="6" fill="'+col+'" opacity=".3"/><path d="M-11.5 -4.5h3M-6.5 -4.5h3M-1.5 -4.5h3" stroke="'+col+'" stroke-width="2.2"/>'+
        '<circle cx="9" cy="-4.5" r="4.4" fill="url(#tcMetal)" stroke="#5b606a" stroke-width=".8"/><line x1="9" y1="-4.5" x2="11.2" y2="-7.6" stroke="#2a2d35" stroke-width="1.2" stroke-linecap="round"/>'+
        '<rect x="-14" y="4" width="6" height="6" rx="1" fill="#d9534f" stroke="#0b0c0d" stroke-width=".8"/><rect x="-6" y="4" width="6" height="6" rx="1" fill="#15171a" stroke="#8a8f9c" stroke-width=".8"/><path d="M8 5h8M8 8h8M8 11h8" stroke="#000" stroke-opacity=".5" stroke-width=".8"/>'; }
    else if(look==='outlet'){
      o='<rect x="-12" y="-16" width="24" height="32" rx="3" fill="#e8eaee" stroke="#8a8f9c"/><circle cx="0" cy="0" r="1.5" fill="#8a8f9c"/>';
      [-8,8].forEach(function(cy){ o+='<rect x="-8.5" y="'+(cy-6)+'" width="17" height="12" rx="2.5" fill="#d3d6dc" stroke="#aab0ba" stroke-width=".7"/><rect x="-5" y="'+(cy-3.8)+'" width="1.8" height="5" rx=".6" fill="#2a2d35"/><rect x="3.2" y="'+(cy-3.8)+'" width="1.8" height="5" rx=".6" fill="#2a2d35"/><circle cx="0" cy="'+(cy+3)+'" r="1.5" fill="#2a2d35"/>'; }); }
    else if(look==='pole'){
      o='<rect x="-2" y="-18" width="4" height="36" fill="#7a5a3a" stroke="#4a3623" stroke-width=".7"/><rect x="-15" y="-14" width="30" height="3.5" rx=".8" fill="#8a6a46" stroke="#4a3623" stroke-width=".6"/>'+
        '<rect x="-14" y="-19" width="4" height="5" rx="1" fill="#c9ccd3" stroke="#6b707a" stroke-width=".6"/><rect x="10" y="-19" width="4" height="5" rx="1" fill="#c9ccd3" stroke="#6b707a" stroke-width=".6"/><path d="M-19 -13L-12 -16.5M12 -16.5L19 -13" stroke="#8a8f9c" stroke-width=".9" fill="none" stroke-linecap="round"/>'+
        '<rect x="3" y="-8" width="12" height="17" rx="3" fill="url(#tcMetal)" stroke="#5b606a" stroke-width=".8"/><ellipse cx="9" cy="-8" rx="6" ry="2.2" fill="#aeb3bc" stroke="#5b606a" stroke-width=".6"/><rect x="8" y="-12" width="2" height="4" fill="#c9ccd3" stroke="#6b707a" stroke-width=".5"/><rect x="3" y="3" width="12" height="2.5" fill="'+col+'" opacity=".85"/>'; }
    else if(look==='converter'){
      o='<rect x="-17" y="-10" width="34" height="26" rx="2.5" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="-16" y="-9" width="32" height="24" rx="2" fill="none" stroke="#fff" stroke-opacity=".14"/>';
      [[-9,'#ffb020'],[0,'#35b9f0'],[9,'#c78bff']].forEach(function(t){ o+='<rect x="'+(t[0]-1.2)+'" y="-12.5" width="2.4" height="3" fill="url(#tcMetalV)"/><rect x="'+(t[0]-2.6)+'" y="-16" width="5.2" height="4" rx="1" fill="'+t[1]+'" stroke="#0b0c0d" stroke-width=".7"/>'; });
      o+='<path d="M-13 -2h12M-13 1h12M-13 4h12M-13 7h12" stroke="#000" stroke-opacity=".55" stroke-width=".9"/><circle cx="9" cy="4" r="6" fill="#17181c" stroke="#2f3238"/>';
      [0,120,240].forEach(function(a){ var r=a*Math.PI/180; o+='<line x1="9" y1="4" x2="'+(9+4.6*Math.cos(r)).toFixed(2)+'" y2="'+(4+4.6*Math.sin(r)).toFixed(2)+'" stroke="'+col+'" stroke-width="1.5" stroke-linecap="round"/>'; });
      o+='<rect x="-14.5" y="11.5" width="3" height="2" rx=".6" fill="'+col+'"/>'; }
    else {
      o='<g transform="translate(0,3)">';
      [[-8,'#e0a020'],[-3,'#35b9f0'],[2,'#c78bff']].forEach(function(w){ var d='M-19 '+w[0]+'H11L25 -3'; o+='<path d="'+d+'" stroke="#0b0c0d" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" stroke="'+w[1]+'" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; });
      o+='<circle cx="25" cy="-3" r="2.4" fill="'+col+'" stroke="#0b0c0d" stroke-width=".8"/><rect x="-4.5" y="-12" width="9" height="18" rx="2" fill="url(#tcMetal)" stroke="#5b606a" stroke-width=".8"/><circle cx="0" cy="-5" r="1.4" fill="#6b707a"/></g>'; }
    return '<g transform="translate('+cx.toFixed(2)+',0) scale('+sc.toFixed(3)+')" pointer-events="none">'+o+'</g>'; }
  function sirenArt(st,hw,hh,col){
    var W=2*hw, H=2*hh;
    return '<g pointer-events="none"><rect x="'+-hw+'" y="'+-hh+'" width="'+W+'" height="'+H+'" rx="4" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="'+(-hw+1)+'" y="'+(-hh+1)+'" width="'+(W-2)+'" height="'+(H-2)+'" rx="3" fill="none" stroke="#fff" stroke-opacity=".14"/><text x="0" y="'+(-hh+9)+'" text-anchor="middle" font-size="7" letter-spacing="1.5" font-weight="bold" fill="#ffd23c">MOTOR</text></g>'; }
  function srcSc(hw,hh){ return Math.max(0.3,Math.min((2*hh-4)/40,(2*hw*0.5)/40)); }
  function srcEdge(look){ return ({battery:17,supply:18,outlet:12,pole:15,converter:17,tapped:25})[look]||19; }
  function srcTx(st,hw,hh){ var sc=srcSc(hw,hh), e=srcLook()==='tapped'?28:20; return ((-hw+4+(20+e)*sc)+hw)/2; }
  function srcLead(hw,hh,col){ var sc=srcSc(hw,hh), x0=-hw+4+(20+srcEdge(srcLook()))*sc; if(x0>=hw-0.5) return ''; return '<line x1="'+x0.toFixed(2)+'" y1="0" x2="'+hw+'" y2="0" stroke="'+col+'" stroke-width="2" stroke-linecap="round" pointer-events="none"/>'; }
  setInterval(function(){ if(battActive()){ if(wiresVisible()) renderWires(); else wrDirty=true; try{ if(window._feVinTick) window._feVinTick(); }catch(_){} } },500);
  function srcVal(){ var el=document.getElementById('liveVoltageInput'), v=el?parseFloat(el.value):NaN; if(!(isFinite(v)&&v>0)) return 0;
    if(battActive()){ var cut=Math.min(v,nodeSt.source.cutoff); v=cut+(v-cut)*(1-battFrac()); } return v>0.005?v:0; }
  function volt(key){ if(key==='source') return srcVal(); try{ return window._feVolt?+window._feVolt(key)||0:0; }catch(_){ return 0; } }
  function pinOutV(key,n){ try{ return window._fePinOut?+window._fePinOut(key,n)||0:0; }catch(_){ return 0; } }
  function linkV(l){ if(l.t==='p'&&/^po\d+$/.test(l.fp)) return pinOutV(l.f,+l.fp.slice(2)); return volt(l.f); }
  function damperV(){ var m=0; links.forEach(function(x){ if(x.t==='p'&&x.to==='damper'&&/^dg\d+$/.test(x.tp)){ var v=linkV(x); if(v>m) m=v; } }); return m; }
  function isInLink(l,key){ return l.to===key&&(l.t==='v'||(l.t==='p'&&l.tp==='in')); }
  function linksChanged(){ renderWires(); try{ if(window._feLinksChanged) window._feLinksChanged(); }catch(_){} }
  function r1(v){ return Math.round(v*10)/10; }
  var jCount=0;
  function tryLink(a,b,pts){
    if(!compat(a,b)||links.length>=2000) return null;
    var L, cs=(pts||[]).map(function(q){ return {x:q.x,y:q.y}; });
    if(a.p==='data'){ if(links.some(function(l){ return l.t==='d'&&((l.f===a.k&&l.to===b.k)||(l.f===b.k&&l.to===a.k)); })) return null; L={t:'d',f:a.k,to:b.k}; }
    else if(a.p==='dout'||a.p==='din'){ var ko=a.p==='dout'?a:b, ki=a.p==='dout'?b:a; if(a.p==='din') cs.reverse();
      links=links.filter(function(l){ return !(l.t==='k'&&l.f===ko.k&&l.to===ki.k); }); L={t:'k',f:ko.k,to:ki.k}; }
    else { var o=pcls(a.p)==='o'?a:b, i=pcls(a.p)==='o'?b:a; if(pcls(a.p)==='i') cs.reverse();
      if(o.p!=='out'||i.p!=='in'){
        links=links.filter(function(l){ return !((l.t==='p'&&l.to===i.k&&l.tp===i.p)||(i.p==='in'&&l.t==='v'&&l.to===i.k)); });
        L={t:'p',f:o.k,to:i.k,fp:o.p,tp:i.p}; }
      else { links=links.filter(function(l){ return !((l.t==='v'||(l.t==='p'&&l.tp==='in'))&&l.to===i.k); });
        L={t:'v',f:o.k,to:i.k}; } }
    if(cs.length) L.rr=cs;
    links.push(L); linksChanged(); return L;
  }
  function wireChain(l,a,b){ return [a].concat((l.rr||[]).map(function(r){ return {x:r.x,y:r.y}; }),[b]); }
  function roundPath(P,rad){ var d='M'+P[0].x+' '+P[0].y, i, A, B, C, l1, l2, r, sx, sy, ex, ey;
    for(i=1;i<P.length-1;i++){ A=P[i-1]; B=P[i]; C=P[i+1]; l1=Math.hypot(B.x-A.x,B.y-A.y); l2=Math.hypot(C.x-B.x,C.y-B.y); if(l1<1e-6||l2<1e-6) continue;
      r=Math.min(rad,l1/2,l2/2); sx=B.x+(A.x-B.x)/l1*r; sy=B.y+(A.y-B.y)/l1*r; ex=B.x+(C.x-B.x)/l2*r; ey=B.y+(C.y-B.y)/l2*r;
      d+=' L'+sx.toFixed(2)+' '+sy.toFixed(2)+' Q'+B.x+' '+B.y+' '+ex.toFixed(2)+' '+ey.toFixed(2); }
    var L=P[P.length-1]; return d+' L'+L.x+' '+L.y; }
  function polyMid(P){ var tot=0, i, seg; for(i=0;i<P.length-1;i++) tot+=Math.hypot(P[i+1].x-P[i].x,P[i+1].y-P[i].y);
    var half=tot/2; for(i=0;i<P.length-1;i++){ seg=Math.hypot(P[i+1].x-P[i].x,P[i+1].y-P[i].y); if(half<=seg||i===P.length-2){ var t=seg?Math.min(1,half/seg):0; return {x:P[i].x+(P[i+1].x-P[i].x)*t,y:P[i].y+(P[i+1].y-P[i].y)*t}; } half-=seg; }
    return P[0]; }
  function linkHidden(l){ if(l.t!=='p'||!/^dg\d+$/.test(l.tp)) return false; var n=nodeOf(l.to); return !n||n.ports.indexOf(l.tp)<0; }
  function linkChain(l){ if(linkHidden(l)) return null; var pr=lkPorts(l), a=portPos(l.f,pr[0]), b=portPos(l.to,pr[1]); return (a&&b)?wireChain(l,a,b):null; }
  function segHit(x0,y0,x1,y1,p,q){ var rx=x1-x0, ry=y1-y0, sx=q.x-p.x, sy=q.y-p.y, den=rx*sy-ry*sx; if(Math.abs(den)<1e-9) return null;
    var t=((p.x-x0)*sy-(p.y-y0)*sx)/den, u=((p.x-x0)*ry-(p.y-y0)*rx)/den; if(t<0||t>1||u<0||u>1) return null; return {t:t,x:x0+t*rx,y:y0+t*ry}; }
  function cutHit(l,x0,y0,x1,y1){
    var P=linkChain(l); if(!P) return null; var best=null, i, h;
    for(i=0;i<P.length-1;i++){ h=segHit(x0,y0,x1,y1,P[i],P[i+1]); if(h&&(!best||h.t<best.t)) best={t:h.t,x:h.x,y:h.y,s:i}; }
    return best; }
  function nearestOnWire(l,pt){ var P=linkChain(l); if(!P) return null; var best=null, i, dx, dy, L2, t, x, y, d;
    for(i=0;i<P.length-1;i++){ dx=P[i+1].x-P[i].x; dy=P[i+1].y-P[i].y; L2=dx*dx+dy*dy; t=L2?Math.max(0,Math.min(1,((pt.x-P[i].x)*dx+(pt.y-P[i].y)*dy)/L2)):0;
      x=P[i].x+dx*t; y=P[i].y+dy*t; d=Math.hypot(pt.x-x,pt.y-y); if(!best||d<best.d) best={x:x,y:y,s:i,d:d}; }
    return best; }
  function finishCut(){
    var c=cut; cut=null; if(!c) return; if(Math.hypot(c.x1-c.x0,c.y1-c.y0)<4){ renderWires(); return; }
    var hits=[]; links.forEach(function(l,i){ var h=cutHit(l,c.x0,c.y0,c.x1,c.y1); if(h) hits.push({i:i,h:h}); });
    if(c.m==='del'){ if(hits.length){ var del={}; hits.forEach(function(x){ del[x.i]=1; }); links=links.filter(function(_,i){ return !del[i]; }); selLink=-1; linksChanged(); buildProps(); return; } }
    else if(hits.length>=2){
      hits.sort(function(a,b){ return a.h.t-b.h.t; }); var n=hits.length, tm=n%2?hits[(n-1)/2].h.t:(hits[n/2-1].h.t+hits[n/2].h.t)/2, jx=r1(c.x0+tm*(c.x1-c.x0)), jy=r1(c.y0+tm*(c.y1-c.y0)), jid=Date.now()*1000+(++jCount%1000);
      hits.forEach(function(x){ var l=links[x.i]; l.rr=l.rr||[]; l.rr.splice(x.h.s,0,{x:jx,y:jy,j:jid}); }); linksChanged(); return; }
    renderWires(); }
  function finishWire(tp){
    var from=linkDrag, to={k:tp.getAttribute('data-k'),p:tp.getAttribute('data-p')};
    if(!from) return;
    if(to.k===from.k&&to.p===from.p){ linkDrag=null; renderWires(); return; }
    if(!compat(from,to)) return;
    var pts=from.pts; linkDrag=null; selLink=-1; if(!tryLink(from,to,pts)) renderWires(); }
  function dropLinksOf(key){ links=links.filter(function(l){ return l.f!==key&&l.to!==key; }); }
  function bez(a,b,data){ if(data){ var k2=Math.max(40,Math.abs(b.y-a.y)/2+30); return 'M'+a.x+' '+a.y+' C'+a.x+' '+(a.y+k2)+','+b.x+' '+(b.y+k2)+','+b.x+' '+b.y; }
    var k=Math.max(30,Math.abs(b.x-a.x)/2); return 'M'+a.x+' '+a.y+' C'+(a.x+k)+' '+a.y+','+(b.x-k)+' '+b.y+','+b.x+' '+b.y; }
  (function(){ var f=document.getElementById('liveVoltageInput'); if(f){ ['input','change'].forEach(function(n){ f.addEventListener(n,function(){ batt.t0=Date.now(); renderWires(); }); }); } })();
  window._ceSirenVoltage=function(){ var l=null; links.forEach(function(x){ if(isInLink(x,'siren')) l=x; }); return l?linkV(l):0; };
  function renderWires(){
    if(!wl) return;
    anC=allNodesRaw(); idC=new Map(); comps.forEach(function(c){ if(!idC.has(c.id)) idC.set(c.id,c); });
    try{ renderWires0(); }finally{ anC=null; idC=null; } }
  function renderWires0(){
    if(!wl) return;
    if(mode==='use'){ if(wl._lastH!==''){ wl._lastH=''; wl.innerHTML=''; } syncItemSections(); return; }
    var nodes=allNodes(), h='', now=Date.now(), sv=null;
    links.forEach(function(l){ if(isInLink(l,'siren')) sv=linkV(l); });
    nodes.forEach(function(n){ if(!n.fixed) return; var src=n.key==='source', st=nodeSt[n.key], col=st.color, txt=src?(Math.round(srcVal()*100)/100)+' V':n.key==='blower'?(Math.round(blowerV()*100)/100)+' V':n.key==='rotator'?(Math.round(rotatorV()*100)/100)+' V':n.key==='damper'?(Math.round(damperV()*100)/100)+' V':(Math.round((sv===null?0:sv)*100)/100)+' V';
      var fam=st.font?' font-family="'+esc(textFam(st.font))+'"':'', fw=st.bold?' font-weight="bold"':' font-weight="normal"';
      h+='<g class="ce-main" data-n="'+n.key+'" transform="translate('+n.x+','+n.y+')"><rect x="'+-n.hw+'" y="'+-n.hh+'" width="'+2*n.hw+'" height="'+2*n.hh+'" rx="5" fill="transparent" stroke="'+(!(selNode===n.key&&mode==='edit')?'none':col)+'" stroke-width="1.5"'+(selNode===n.key&&mode==='edit'?' stroke-dasharray="4 3"':'')+'/>'+(src?srcLead(n.hw,n.hh,col):'')+
         '<g filter="url(#tcFx)">'+(src?srcArt(st,n.hw,n.hh,col):n.key==='blower'?blowerArt(st,n.hw,n.hh,col):n.key==='rotator'?rotatorArt(st,n.hw,n.hh,col):n.key==='damper'?damperArt(st,n.hw,n.hh,col):sirenArt(st,n.hw,n.hh,col))+'</g>'+
         (!st.showName||isItemArt(n.key)?'':'<text x="0" y="'+(st.showV?-2:st.size*0.35)+'" text-anchor="middle" font-size="'+st.size+'"'+(src?'':' stroke="#0b0c0d" stroke-width="3" paint-order="stroke"')+fam+fw+' letter-spacing="1" fill="'+(st.tcolor||col)+'">'+esc(st.name)+'</text>')+
         ((st.showV||n.key==='damper')?'<text x="'+(src?srcTx(st,n.hw,n.hh):0)+'" y="'+(src?-5:((isItemArt(n.key))?(!nodeSt.siren.showName?Math.max(5,Math.round(nodeSt.siren.size*0.78))*0.35:nodeSt.siren.size*0.35+8):(!st.showName?Math.max(5,Math.round(st.size*0.78))*0.35:st.size*0.35+8)))+'"'+' stroke="#0b0c0d" stroke-width="3" paint-order="stroke"'+' text-anchor="middle" font-size="'+Math.max(5,Math.round(((isItemArt(n.key))?nodeSt.siren.size:st.size)*0.78))+'"'+fam+' font-weight="normal" fill="'+(st.vcolor||'#d0d8f0')+'">'+txt+'</text>':'')+
         (selNode===n.key&&mode==='edit'?(src?handlesSVG(n.hw,n.hh,n.key,['e']):handlesSVG(n.hw,n.hh,n.key,[]).replace(/<rect class="ce-handle" data-h="w"[^>]*\/>/,'')):'')+'</g>'; });
    links.forEach(function(l,i){
      if(linkHidden(l)) return; var pr=lkPorts(l), isV=(l.t==='v'||l.t==='p'), isK=l.t==='k', a=portPos(l.f,pr[0]), b=portPos(l.to,pr[1]); if(!a||!b) return;
      var P=wireChain(l,a,b), d=roundPath(P,3), mid=polyMid(P), sel=(i===selLink), col, w=2.5, extra='', v=0, own=HEXRE.test(l.color)?l.color:'';
      if(isV){ v=linkV(l); col=own||(l.tp==='bin'?(l.to==='rotator'?(v?'#4da3ff':'#2f4f7a'):(v?'#ff3b3b':'#7a3a3a')):(v?VCOL:'#7a6a3a')); }
      else if(isK){ col=own||WGRAY; }
      else { var fl=flashT[l.f+'>'+l.to]||flashT[l.to+'>'+l.f]; col=own||WGRAY; if(fl&&now-fl<450){ col='#d8f3ff'; w=3.5; } }
      if(isV&&v) extra+='<text x="'+mid.x+'" y="'+(mid.y-4)+'" text-anchor="middle" font-size="9" font-weight="bold" fill="'+VCOL+'" stroke="#0b0c0d" stroke-width="3" paint-order="stroke" pointer-events="none">'+(Math.round(v*100)/100)+' V</text>';
      if(l.showLabel&&l.label) extra+='<text x="'+mid.x+'" y="'+(mid.y+(isV&&v?12:-5))+'" text-anchor="middle" font-size="9" font-weight="bold" fill="'+col+'" stroke="#0b0c0d" stroke-width="3" paint-order="stroke" pointer-events="none">'+esc(l.label)+'</text>';
      var dots=''; (l.rr||[]).forEach(function(r,j){ dots+='<circle class="ce-rr'+(r.j?' jn':'')+'" data-i="'+i+'" data-j="'+j+'" cx="'+r.x+'" cy="'+r.y+'" r="'+(r.j?4.5:3.5)+'" fill="'+col+'" stroke="#0b0c0d" stroke-width="1.2" pointer-events="all"/>'; });
      h+='<g class="ce-wg" data-i="'+i+'">'+(sel?'<path d="'+d+'" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="'+(w+4)+'" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>':'')+
         '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+' stroke-linecap="round" pointer-events="none"/>'+extra+
         '<path class="ce-wire" data-i="'+i+'" d="'+d+'" fill="none" stroke="transparent" stroke-width="12" pointer-events="stroke"/>'+dots+'</g>';
    });
    svg.classList.toggle('ce-linking',!!linkDrag);
    if(cut) h+='<line x1="'+cut.x0+'" y1="'+cut.y0+'" x2="'+cut.x1+'" y2="'+cut.y1+'" stroke="'+(cut.m==='del'?'#ff4d4d':'#35f0c8')+'" stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>';
    if(linkDrag){ var p0=portPos(linkDrag.k,linkDrag.p), cur={x:linkDrag.x,y:linkDrag.y};
      if(p0){ var lc=linkDrag.p==='bin'?(linkDrag.k==='rotator'?'#4da3ff':'#ff3b3b'):(linkDrag.p==='data'||linkDrag.p==='dout'||linkDrag.p==='din')?WGRAY:VCOL; h+='<path d="'+roundPath([p0].concat(linkDrag.pts,[cur]),3)+'" fill="none" stroke="'+lc+'" stroke-width="2" pointer-events="none"/>';
        linkDrag.pts.forEach(function(q){ h+='<circle cx="'+q.x+'" cy="'+q.y+'" r="3.5" fill="'+lc+'" stroke="#0b0c0d" stroke-width="1.2" pointer-events="none"/>'; }); } }
    nodes.forEach(function(n){ n.ports.forEach(function(p){
      var pp=portPos(n.key,p), col=p==='bin'?(n.key==='rotator'?'#4da3ff':'#ff3b3b'):p==='data'?DCOL:(p==='dout'||p==='din')?KCOL:VCOL, conn=isConn(n.key,p), ok=linkDrag&&compat(linkDrag,{k:n.key,p:p}),
          pcol=(function(){ var bc=n.fixed?null:byId(parseInt(String(n.key).slice(1),10)); return (bc&&bc.tcolor&&HEXRE.test(bc.tcolor))?bc.tcolor:'#8a8f9c'; })(),
          lab=portSide(n.key,p)?sideLab(n,p,pp,pcol):pinLab(n,p,pp,pcol)?pinLab(n,p,pp,pcol):/^dg\d+$/.test(p)?'<text x="'+pp.x+'" y="'+(pp.y+10)+'" text-anchor="middle" font-size="5.5" fill="'+pcol+'" pointer-events="none" class="ce-plab">G'+p.slice(2)+'</text>':(p==='in'||p==='din'||p==='bin')?'<text x="'+(pp.x+8)+'" y="'+(pp.y+2.5)+'" font-size="6" fill="'+pcol+'" pointer-events="none" class="ce-plab">'+(n.key==='siren'?'MOTOR':(n.key==='blower'||n.key==='rotator')?'POWER':n.key==='damper'?'CTRL':'IN')+'</text>':
              p==='dout'?'<text x="'+(pp.x-8)+'" y="'+(pp.y+2.5)+'" text-anchor="end" font-size="6" fill="'+pcol+'" pointer-events="none" class="ce-plab">DAMPER</text>':
              p==='out'?(n.key==='source'?'':'<text x="'+(pp.x-8)+'" y="'+(pp.y+2.5)+'" text-anchor="end" font-size="6" fill="'+pcol+'" pointer-events="none" class="ce-plab">OUT</text>'):
              '<text x="'+pp.x+'" y="'+(pp.y-7)+'" text-anchor="middle" font-size="6" fill="'+pcol+'" pointer-events="none" class="ce-plab">DATA</text>';
      h+='<g class="ce-port" data-k="'+n.key+'" data-p="'+p+'"><title>'+(pinTitle(n,p)||(/^dg\d+$/.test(p)?'Damper group '+p.slice(2)+' - output-pin voltage at or above the ON threshold turns the group on':p==='bin'?(n.key==='rotator'?'Rotator power input (voltage) - the rotator runs while the voltage is inside the operating range set on the Rotator item (Unlinked mode only)':'Blower power input (voltage) - ON/OFF follows the operating voltages set on the Blower item'):n.key==='siren'&&p==='in'?'Siren Motor input (voltage)':p==='din'?'Damper item input (damper control)':p==='dout'?'Damper output (connect to the Damper item dot)':p==='in'?'Input (voltage)':p==='out'?'Output (voltage)':'Data (messages)'))+'</title>'+lab+
         '<circle cx="'+pp.x+'" cy="'+pp.y+'" r="10" fill="transparent"/>'+
         '<circle cx="'+pp.x+'" cy="'+pp.y+'" r="'+(ok?5:3)+'" fill="'+col+'" stroke="none"/></g>'; }); });
    if(h!==wl._lastH){ wl._lastH=h; wl.innerHTML=h; }
    syncItemSections();
  }
  function pinLab(n,p,pp,pcol){ var m=/^p([io])(\d+)$/.exec(p); if(!m) return ''; var c=byId(parseInt(String(n.key).slice(1),10)), i=+m[2]; if(!c) return '';
    var t=m[1]==='i'?((pinCfgOf(c.d,i).m==='a'?'A':'D')+i):('O'+i);
    return '<text x="'+pp.x+'" y="'+(m[1]==='i'?pp.y-6:pp.y+10)+'" text-anchor="middle" font-size="5.5" fill="'+pcol+'" pointer-events="none" class="ce-plab">'+t+'</text>'; }
  function pinTitle(n,p){ var m=/^p([io])(\d+)$/.exec(p); if(!m) return ''; var c=byId(parseInt(String(n.key).slice(1),10)), i=+m[2]; if(!c) return '';
    if(m[1]==='o') return 'Output pin '+i+' (analog voltage, set by code)';
    var g=pinCfgOf(c.d,i); return 'Input pin '+i+(g.m==='a'?' (analog - reads voltage)':' (digital - HIGH at '+g.hv+' V or more)')+' - read only'; }
  window._ceFlash=function(a,b){ flashT[a+'>'+b]=Date.now(); renderWires(); setTimeout(renderWires,480); };
  var wrT=null, wrDirty=false;
  var _wvT=0,_wvV=true; function wiresVisible(){ var n=performance.now(); if(n-_wvT>150){ _wvT=n; _wvV=svg.getClientRects().length>0; } return _wvV; }
  window._ceWiresRefresh=function(){ if(wrT) return; wrT=setTimeout(function(){ wrT=null; if(wiresVisible()) renderWires(); else wrDirty=true; },60); };

  function stdPalette(){ return ORDER.map(function(k){
    var t=TYPES[k], pc={color:t.color,on:true,scale:100,d:t.init?t.init():null}, prev=t.draw(pc), vb='-36 -38 72 76';
    if(t.dim){ var dm=t.dim(pc), hf=Math.max(dm.hw,dm.hh)+4; vb=(-hf)+' '+(-hf)+' '+(2*hf)+' '+(2*hf); }
    return '<button type="button" class="ce-pal" data-type="'+k+'" title="Add '+t.name+'"><svg viewBox="'+vb+'" width="36" height="38">'+((t.kind==='static'||t.kind==='box'||t.kind==='lcd')?prev:'<g filter="url(#tcFx)">'+prev+'</g>')+'</svg><span>'+t.name+'</span></button>';
  }).join(''); }
  function buildPalette(){ palette.innerHTML=stdPalette()+itemPalette()+customPalette(); }
  buildPalette();
  function addComp(k,px,py,defId){
    if(k==='blower'||k==='damper'||k==='rotator'){ addItem(k,px,py); return; }
    setMode('edit');
    var t=TYPES[k], n=comps.length, at=(px!=null&&py!=null);
    var c={id:nextId++,type:k,x:at?snap(px):snap(view.cx-80+(n%9)*20),y:at?snap(py):snap(view.cy-70+(n%9)*20),scale:100,label:t.label,color:t.color,on:false,latch:false,d:t.init?t.init():null};
    if(k==='box'){ if(boxes().length>=12){ window.alert('Maximum 12 Controller Boxes.'); return; }
      c.d.name=uniqueName('Controller '+(boxes().length+1),null); if(!at){ c.x=snap(view.cx); c.y=snap(view.cy-10); } }
    if(k==='midi'){ if(midis().length>=8){ window.alert('Maximum 8 MIDI boards.'); return; } c.d.name='MIDI Board '+(midis().length+1); c.seq=cleanSeq(null); ensureSeqs(c); }
    var cuDf=null;
    if(k==='custom'){ cuDf=defById(defId); if(!cuDf){ window.alert('Pick a custom component from the list.'); return; }
      if(comps.filter(isCu).length>=30){ window.alert('Maximum 30 custom components on the canvas.'); return; }
      c.d.def=cuDf.id; c.d.name=uniqueName(cuDf.name,null); c.label=c.d.name; }
    clampPos(c); comps.push(c); if(cuDf) cuMakeParts(c,cuDf); select(c.id); if(cuDf&&window._feCopyCtl) window._feCopyCtl('d'+cuDf.id,boxKey(c)); try{ svg.focus({preventScroll:true}); }catch(_){}
  }
  var ccOv=null, cc=null;
  function pcThumb(df){ var w=df.w, h=Math.min(df.w*df.ar,600), hf=Math.max(w,h)/2+2, body;
    if(df.art&&IMG_RE.test(df.art)) body='<image href="'+df.art+'" x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/>';
    else body='<rect x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" rx="5" fill="#14161a" stroke="'+CU_ACC+'" stroke-width="'+Math.max(1,hf/18)+'" stroke-dasharray="5 4"/>';
    return '<svg viewBox="'+(-hf)+' '+(-hf)+' '+(2*hf)+' '+(2*hf)+'" width="36" height="38">'+body+'</svg>'; }
  function customPalette(){
    var h='<div style="display:flex;align-items:center;justify-content:space-between;margin:8px 2px 0;font-size:9px;letter-spacing:1px;color:var(--muted)"><span>CUSTOM</span><span style="display:flex;gap:4px"><button type="button" class="vbtn btn-gray" data-cc="exportall" title="Export all custom components as .osccu" style="font-size:9px;padding:2px 6px;letter-spacing:1px">EXPORT .OSCCU</button><button type="button" class="vbtn btn-accent" data-cc="new" style="font-size:9px;padding:2px 6px;letter-spacing:1px">+ NEW</button></span></div>';
    if(!customDefs.length) h+='';
    customDefs.forEach(function(df){
      h+='<div style="display:flex;gap:3px;align-items:stretch"><button type="button" class="ce-pal" data-type="custom" data-def="'+df.id+'" style="flex:1 1 auto;min-width:0">'+pcThumb(df)+'<span>'+esc(df.name)+'</span></button>'+
        '<button type="button" class="vbtn btn-gray" data-cc="export" data-def="'+df.id+'" title="Export as .osccu" style="padding:0 7px;font-size:12px"><svg class="si" aria-hidden="true"><use href="#si-download"/></svg></button>'+
        '<button type="button" class="vbtn btn-gray" data-cc="edit" data-def="'+df.id+'" style="padding:0 7px;font-size:12px"><svg class="si" aria-hidden="true"><use href="#si-edit"/></svg></button>'+
        '<button type="button" class="vbtn btn-red" data-cc="del" data-def="'+df.id+'" style="padding:0 7px;font-size:12px"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button></div>'; });
    return h; }
  function hasPort(key,p){ var n=nodeOf(key); if(/^dg\d+$/.test(p)) return !!n&&key==='damper'; return !!n&&n.ports.indexOf(p)>=0; }
  function pruneLinks(){ var n=links.length; links=links.filter(function(l){ var pr=lkPorts(l); return hasPort(l.f,pr[0])&&hasPort(l.to,pr[1]); }); if(links.length!==n) selLink=-1; }
  var cuPend=[];
  function cuFlushCopies(){ var p=cuPend; cuPend=[]; p.forEach(function(x){ if(window._feCopyCtl) window._feCopyCtl('b'+x[0],'b'+x[1]); }); }
  function cuProps(c){ var df=cdef(c);
    return '<div style="grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px"><label style="grid-column:1/-1;margin:0">Custom component'+(df?' - '+esc(df.name):'')+'</label>'+
      '<button type="button" class="vbtn btn-accent" id="ceCuCode" style="font-size:10px;letter-spacing:1px">EDIT CODE</button>'+
      '<button type="button" class="vbtn btn-gray" id="ceCuDef" style="font-size:10px;letter-spacing:1px">EDIT DEFINITION</button>'+
      '<button type="button" class="vbtn btn-gray" id="ceCuReset" style="grid-column:1/-1;font-size:10px;letter-spacing:1px">RESET CODE FROM TEMPLATE</button></div>'; }
  function midiProps(c){ ensureSeqs(c); var n=c.seq.notes.length, ns=c.seqs.length;
    return '<div style="grid-column:1/-1;display:grid;grid-template-columns:1fr;gap:6px"><label style="margin:0">MIDI Sequencer - '+ns+' sequence'+(ns===1?'':'s')+', active has '+n+' note'+(n===1?'':'s')+'</label>'+
      '<button type="button" class="vbtn btn-accent" id="ceMidiEdit" style="font-size:10px;letter-spacing:1px">EDIT</button></div>'; }
  function midiClick(bid){ var c=byId(selId); if(!c||!isMidi(c)) return false;
    if(bid==='ceMidiEdit'){ ensureSeqs(c); if(window._midiOpen) window._midiOpen(c.id); return true; } return false; }
  function cuClick(bid){ var c=byId(selId); if(!c||!isCu(c)) return false;
    if(bid==='ceCuCode'){ if(window._feOpenCtl) window._feOpenCtl(boxKey(c)); return true; }
    if(bid==='ceCuDef'){ openCC(c.d.def); return true; }
    if(bid==='ceCuReset'){ askYes('Reset code','Replace this copy\'s scripts with the template code from its definition?','RESET').then(function(y){ if(y&&window._feCopyCtl) window._feCopyCtl('d'+c.d.def,boxKey(c)); }); return true; }
    return false; }
  function delDef(id){ var df=defById(id); if(!df) return;
    var inst=comps.filter(function(c){ return isCu(c)&&+c.d.def===df.id; }), ns=0;
    inst.forEach(function(c){ var i=window._feCtlInfo?window._feCtlInfo(boxKey(c)):null; if(i) ns+=i.scripts; });
    askYes('Delete custom component','Delete "'+df.name+'"?'+(inst.length?' Its '+inst.length+' placed cop'+(inst.length>1?'ies':'y')+' will be removed too.':'')+' Its template code'+(ns?' and '+ns+' script'+(ns>1?'s':'')+' in the copies':'')+' will be lost.','DELETE').then(function(yes){ if(!yes) return;
      inst.forEach(function(c){ dropLinksOf(boxKey(c)); });
      comps=comps.filter(function(c){ return !(isCu(c)&&+c.d.def===df.id); });
      customDefs=customDefs.filter(function(o){ return o!==df; });
      selId=null; selLink=-1; buildPalette(); render(); buildProps(); linksChanged(); if(window._ceHistNow) window._ceHistNow(); }); }
  palette.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-cc]'); if(!b) return;
    var a=b.getAttribute('data-cc'), id=+b.getAttribute('data-def')||0;
    if(a==='new') openCC(0); else if(a==='edit') openCC(id); else if(a==='del') delDef(id);
    else if(a==='export') exportDefs([id]); else if(a==='exportall') exportDefs(customDefs.map(function(d){ return d.id; })); });
  function exportDefs(ids){
    var defs=ids.map(defById).filter(Boolean);
    if(!defs.length){ alert('No custom components to export.'); return; }
    var fn=null; try{ fn=window._getFnData&&window._getFnData(); }catch(_){}
    var boxes=(fn&&fn.boxes)||{}, templates={};
    defs.forEach(function(df){ if(boxes['d'+df.id]) templates[df.id]=boxes['d'+df.id]; });
    var out={format:'osccu',v:1,customDefs:defs.map(cuOut),templates:templates};
    var nm=defs.length===1?String(defs[0].name||'custom'):((document.getElementById('ePresetModel')||{}).value||'custom_components');
    nm=nm.replace(/[^a-z0-9]/gi,'_').toLowerCase()||'custom_components';
    var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})); a.download=nm+'.osccu';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); },2000);
  }

  var CC_CSS='#ccOverlay{position:fixed;top:calc(var(--topH,34px) - 2px);left:0;right:0;bottom:0;z-index:8600;background:var(--bg);overflow:auto;padding:12px 14px;box-sizing:border-box;font-family:inherit;letter-spacing:1px}'+
    '#ccOverlay .cc-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}'+
    '#ccOverlay .cc-title{color:var(--accent2);font-size:12px;letter-spacing:2px}'+
    '#ccOverlay .cc-body{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap}'+
    '#ccOverlay .cc-side{flex:0 0 280px;display:flex;flex-direction:column;gap:7px;background:var(--inset2);border:1px solid var(--border);border-radius:2px;padding:10px;box-sizing:border-box}'+
    '#ccOverlay .cc-side label{font-size:10px;color:var(--muted);letter-spacing:1px;margin:0}'+
    '#ccOverlay .cc-side input[type=text],#ccOverlay .cc-side input[type=number]{width:100%;box-sizing:border-box}'+
    '#ccOverlay .cc-row{display:flex;gap:6px}'+
    '#ccOverlay .cc-chk{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--x-c8ccd8,#c8ccd8);cursor:pointer}'+
    '#ccOverlay .cc-note{font-size:9px;color:var(--muted);line-height:1.5}'+
    '#ccOverlay .cc-prev{flex:1 1 360px;min-height:340px;background:var(--inset);border:1px solid var(--border);border-radius:2px;display:flex;align-items:center;justify-content:center;overflow:hidden}'+
    '#ccOverlay .cc-prev svg{width:100%;height:100%;max-height:70vh;touch-action:none}'+
    '#ccOverlay .cc-tabs{display:flex;gap:4px;margin-bottom:10px}'+
    '#ccOverlay .cc-add{display:flex;flex-wrap:wrap;gap:3px}'+
    '#ccOverlay .cc-prow{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 7px;border:1px solid var(--border);border-radius:2px;font-size:10px;color:var(--x-c8ccd8,#c8ccd8);cursor:pointer}'+
    '#ccOverlay .cc-prow.on{border-color:var(--accent2);color:var(--accent2)}'+
    '#ccOverlay .cc-side textarea{width:100%;box-sizing:border-box;min-height:46px}'+
    '#ccOverlay #ccCodeHost #ctrlPanelFunctional .fe-main{height:calc(100vh - 235px);min-height:300px}';
  function ccPartDraw(q){ var t=TYPES[q.type], pc={color:q.color,on:false,scale:100,latch:!!q.latch,label:q.label,d:t.init?cleanD(t,q.d):null,img:q.img}, hw=t.hw||30, hh=t.hh||30;
    if(t.dim){ var dm=t.dim(pc); hw=dm.hw; hh=dm.hh; }
    var sc=q.scale/100, body=(q.img&&(q.img.off||q.img.on)&&!t.dim&&t.kind!=='keypad')?imgDraw(pc.on?pc:{on:false,img:q.img}):t.draw(pc);
    return {svg:'<g data-pid="'+q.pid+'" transform="translate('+q.ox+','+q.oy+') scale('+sc+')">'+body+'</g>',hw:hw*sc,hh:hh*sc}; }
  function ccPreview(){ var sv=document.getElementById('ccPrev'); if(!sv||!cc) return;
    var d=cc.d, w=d.w, h=Math.min(d.w*d.ar,600), pad=64, o='', pr=(d.parts||[]).map(function(q){ var g=ccPartDraw(q); g.q=q; return g; }), mx=w/2, my=h/2;
    pr.forEach(function(g){ mx=Math.max(mx,Math.abs(g.q.ox)+g.hw); my=Math.max(my,Math.abs(g.q.oy)+g.hh); });
    var vw=mx*2+pad*2, vh=my*2+pad*2;
    sv.setAttribute('viewBox',(-vw/2)+' '+(-vh/2)+' '+vw+' '+vh);
    o+='<line x1="'+-vw/2+'" y1="0" x2="'+vw/2+'" y2="0" stroke="#1c2029"/><line x1="0" y1="'+-vh/2+'" x2="0" y2="'+vh/2+'" stroke="#1c2029"/>';
    o+=(d.art&&IMG_RE.test(d.art))?'<image href="'+d.art+'" x="'+-w/2+'" y="'+-h/2+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/>':cuPlaceholder(w,h,d.name||'Custom');
    function dot(x,y,col,lab,lx,ly,anc){ return '<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="'+col+'"/><text x="'+lx+'" y="'+ly+'" text-anchor="'+anc+'" font-size="7" fill="#8a8f9c">'+lab+'</text>'; }
    if(d.nodes.in) o+=dot(-w/2,0,VCOL,'IN',-w/2+8,2.5,'start');
    if(d.nodes.out) o+=dot(w/2,0,VCOL,'OUT',w/2-8,2.5,'end');
    if(d.nodes.data) o+=dot(0,h/2,DCOL,'DATA',0,h/2-7,'middle');
    if(d.nodes.damp) o+=dot(w/2,Math.max(12,h/4),KCOL,'DAMPER',w/2-8,Math.max(12,h/4)+2.5,'end');
    pr.forEach(function(g){ o+=g.svg; if(cc.tab==='parts'&&cc.sel===g.q.pid) o+='<rect x="'+(g.q.ox-g.hw-3)+'" y="'+(g.q.oy-g.hh-3)+'" width="'+(2*g.hw+6)+'" height="'+(2*g.hh+6)+'" fill="none" stroke="#35b9f0" stroke-dasharray="4 3" pointer-events="none"/>'; });
    sv.innerHTML=o; }
  function ccPartById(pid){ var l=cc&&cc.d.parts||[]; for(var i=0;i<l.length;i++) if(l[i].pid===pid) return l[i]; return null; }
  function ccPartForm(q){ var t=TYPES[q.type], h='<div class="cc-note" style="color:var(--accent2)">'+esc(t.name)+' #'+q.pid+'</div>'+
      '<div><label>Label</label><input type="text" id="ccP_label" maxlength="40" value="'+esc(q.label)+'"></div>'+
      '<div class="cc-row"><div style="flex:1"><label>X</label><input type="number" id="ccP_ox" step="1" value="'+Math.round(q.ox*10)/10+'"></div><div style="flex:1"><label>Y</label><input type="number" id="ccP_oy" step="1" value="'+Math.round(q.oy*10)/10+'"></div><div style="flex:1"><label>Size %</label><input type="number" id="ccP_scale" min="10" max="1000" step="5" value="'+Math.round(q.scale)+'"></div></div>'+
      '<div><label>Color</label><input type="color" id="ccP_color" value="'+esc(q.color)+'"></div>'+
      (t.kind==='button'?'<label class="cc-chk"><input type="checkbox" id="ccP_latch"'+(q.latch?' checked':'')+'> Latching</label>':'');
    (t.fields||[]).forEach(function(f){ var v=q.d?q.d[f.k]:'', id='ccPf_'+f.k;
      if(f.type==='number') h+='<div><label>'+esc(f.label)+'</label><input type="number" id="'+id+'" min="'+f.min+'" max="'+f.max+'" step="'+(f.step||1)+'" value="'+esc(v)+'"></div>';
      else if(f.type==='checkbox') h+='<label class="cc-chk"><input type="checkbox" id="'+id+'"'+(v?' checked':'')+'> '+esc(f.label)+'</label>';
      else if(f.type==='select') h+='<div><label>'+esc(f.label)+'</label><select id="'+id+'">'+f.opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>';
      else if(f.type==='color') h+='<div><label>'+esc(f.label)+'</label><input type="color" id="'+id+'" value="'+esc(v)+'"></div>';
      else if(f.type==='textarea') h+='<div><label>'+esc(f.label)+'</label><textarea id="'+id+'" maxlength="'+(f.maxlen||200)+'">'+esc(v)+'</textarea></div>';
      else if(f.type==='text') h+='<div><label>'+esc(f.label)+'</label><input type="text" id="'+id+'" maxlength="'+(f.maxlen||200)+'" value="'+esc(v)+'"></div>'; });
    return h; }
  function ccPartInput(e){ if(!cc||cc.tab!=='parts'||!e.target||!e.target.id) return false; var id=e.target.id, q=ccPartById(cc.sel), el=e.target;
    if(!q||id.indexOf('ccP')!==0) return false;
    var num=parseFloat(el.value);
    if(id==='ccP_label') q.label=el.value.slice(0,40);
    else if(id==='ccP_ox'){ if(isFinite(num)) q.ox=Math.max(-3000,Math.min(3000,num)); }
    else if(id==='ccP_oy'){ if(isFinite(num)) q.oy=Math.max(-3000,Math.min(3000,num)); }
    else if(id==='ccP_scale'){ if(isFinite(num)) q.scale=Math.max(10,Math.min(1000,num)); }
    else if(id==='ccP_color'){ if(HEXRE.test(el.value)) q.color=el.value.toLowerCase(); }
    else if(id==='ccP_latch') q.latch=!!el.checked;
    else if(id.indexOf('ccPf_')===0){ var f=null, k=id.slice(5); (TYPES[q.type].fields||[]).forEach(function(x){ if(x.k===k) f=x; }); if(!f||!q.d) return true;
      if(f.type==='number'){ if(isFinite(num)) q.d[k]=Math.max(f.min,Math.min(f.max,num)); else return true; }
      else if(f.type==='checkbox') q.d[k]=!!el.checked;
      else if(f.type==='select'){ if(f.opts.some(function(o){ return o[0]===el.value; })) q.d[k]=el.value; }
      else if(f.type==='color'){ if(HEXRE.test(el.value)) q.d[k]=el.value.toLowerCase(); }
      else q.d[k]=el.value.slice(0,f.maxlen||200); }
    else return false;
    ccPreview(); return true; }
  function ccTab(t){ if(!cc||cc.tab===t) return;
    if(t==='code'){ ccSave(false,'code'); return; }
    cc.tab=t; ccBuild(); }
  function ccBuild(){ ccUnembed(); var d=cc.d, tab=cc.tab||'look', side='';
    if(tab==='look') side=
        '<div><label>Name</label><input type="text" id="ccName" maxlength="24" value="'+esc(d.name)+'"></div>'+
        '<div><label>Picture or SVG</label><div class="cc-row" style="margin-top:3px"><button type="button" class="vbtn btn-gray" data-a="img" style="flex:1;font-size:10px">CHOOSE FILE</button><button type="button" class="vbtn btn-gray" data-a="imgclr" style="font-size:10px">CLEAR</button></div>'+
          '<input type="file" id="ccFile" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg" style="display:none"></div>'+
        '<div><label>Width</label><input type="number" id="ccW" min="20" max="560" step="5" value="'+Math.round(d.w)+'"></div>'+
        '<div><label>Nodes</label>'+
          '<label class="cc-chk"><input type="checkbox" id="ccIn"'+(d.nodes.in?' checked':'')+'> IN (voltage input, left)</label>'+
          '<label class="cc-chk"><input type="checkbox" id="ccOut"'+(d.nodes.out?' checked':'')+'> OUT (voltage output, right)</label>'+
          '<label class="cc-chk"><input type="checkbox" id="ccData"'+(d.nodes.data?' checked':'')+'> DATA (messages, bottom)</label>'+
          '<label class="cc-chk"><input type="checkbox" id="ccDamp"'+(d.nodes.damp?' checked':'')+'> DAMPER OUT (to Siren Damper, right)</label></div>'+
        '<div id="ccRate" style="display:'+(d.nodes.in?'':'none')+'"><label>Rated input voltage (V)</label><div class="cc-row" style="margin-top:3px"><input type="number" id="ccVmin" min="0" max="100000" step="0.1" value="'+d.vmin+'"><input type="number" id="ccVmax" min="0" max="100000" step="0.1" value="'+d.vmax+'"></div></div>'+
        '';
    else if(tab==='parts'){ var sel=ccPartById(cc.sel);
      side='<div><label>Add a component</label><div class="cc-add" style="margin-top:3px">'+ORDER.filter(function(k){ return k!=='box'&&k!=='midi'; }).map(function(k){ return '<button type="button" class="vbtn btn-gray" data-a="addp" data-t="'+k+'" style="font-size:9px;padding:3px 5px;letter-spacing:0">'+esc(TYPES[k].name)+'</button>'; }).join('')+'</div></div>'+
        '<div><label>Components in this custom component</label><div style="display:flex;flex-direction:column;gap:3px;margin-top:3px">'+
          ((d.parts||[]).length?d.parts.map(function(q){ return '<div class="cc-prow'+(q.pid===cc.sel?' on':'')+'" data-a="selp" data-pid="'+q.pid+'"><span>'+esc(q.label||TYPES[q.type].name)+' #'+q.pid+'</span><span data-a="delp" data-pid="'+q.pid+'" style="color:var(--red);padding:0 4px"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span></div>'; }).join(''):'')+'</div></div>'+
        (sel?ccPartForm(sel):''); }
    ccOv.innerHTML='<div class="cc-bar"><div class="cc-title">CUSTOM COMPONENT EDITOR'+(d.id?'':' - NEW')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+
      '<button type="button" class="vbtn btn-accent" data-a="save">SAVE &amp; CLOSE</button>'+
      '<button type="button" class="vbtn btn-gray" data-a="cancel">CANCEL</button></div></div>'+
      '<div class="cc-tabs">'+[['look','APPEARANCE'],['parts','COMPONENTS'],['code','CODE']].map(function(t){ return '<button type="button" class="vbtn '+(t[0]===tab?'btn-accent':'btn-gray')+'" data-a="tab" data-t="'+t[0]+'" style="font-size:10px;letter-spacing:1px"'+'>'+t[1]+'</button>'; }).join('')+'</div>'+
      (tab==='code'?'<div id="ccCodeHost"></div>':'<div class="cc-body"><div class="cc-side">'+side+'</div><div class="cc-prev"><svg id="ccPrev" xmlns="http://www.w3.org/2000/svg"></svg></div></div>');
    if(tab==='code') ccEmbed('d'+d.id); else ccPreview(); }
  var feHome=null;
  function ccEmbed(key){ var pn=document.getElementById('ctrlPanelFunctional'), h=document.getElementById('ccCodeHost'); if(!pn||!h) return;
    if(!feHome) feHome={parent:pn.parentNode,next:pn.nextSibling};
    h.appendChild(pn); pn.style.display='flex'; window._ccOpen=true; var sl=document.getElementById('feCtlSel'); if(sl) sl.disabled=true;
    if(window._feSelect) window._feSelect(key); if(window._feShow) window._feShow(); }
  function ccUnembed(){ if(!feHome) return; var pn=document.getElementById('ctrlPanelFunctional');
    if(pn){ feHome.parent.insertBefore(pn,(feHome.next&&feHome.next.parentNode===feHome.parent)?feHome.next:null);
      pn.style.display=(window._getControllerEditorMode&&window._getControllerEditorMode()==='functional')?'flex':'none'; }
    var sl=document.getElementById('feCtlSel'); if(sl) sl.disabled=false; feHome=null; window._ccOpen=false; }
  window._ccRestore=function(){ if(cc&&cc.hidden&&cc.d.id&&!defById(cc.d.id)){ cc=null; return; }
    if(cc&&cc.hidden&&ccOv){ cc.hidden=false; ccOv.style.display='block'; ccBuild(); } };
  window._ccSuspend=function(on){ if(ccOv&&cc) ccOv.style.display=on?'none':'block'; };
  function ccClose(){ ccUnembed(); if(ccOv) ccOv.style.display='none'; cc=null; }
  function ccSave(thenCode,stayTab){
    var d=cc.d, keepSel=cc.sel; d.name=String(d.name||'').trim().slice(0,24)||'Custom';
    var base=d.name, n=base, i=2; function taken(x){ x=x.toLowerCase(); return customDefs.some(function(o){ return o.id!==d.id&&o.name.toLowerCase()===x; }); }
    while(taken(n)){ var suf=' '+(i++); n=base.slice(0,24-suf.length)+suf; } d.name=n;
    if(+d.vmin>+d.vmax){ var t=d.vmin; d.vmin=d.vmax; d.vmax=t; }
    var isNew=!(d.id&&defById(d.id)); if(isNew) d.id=nextDef++;
    var clean=cleanDef(d), df;
    if(isNew){ customDefs.push(clean); df=clean; }
    else { df=defById(d.id); for(var k in clean) df[k]=clean[k]; }
    cuSyncParts(df); comps.forEach(function(c){ if(isCu(c)&&+c.d.def===df.id) clampPos(c); });
    pruneLinks(); buildPalette(); render(); buildProps(); linksChanged(); if(window._ceHistNow) window._ceHistNow();
    var id=df.id;
    if(stayTab){ cc={d:JSON.parse(JSON.stringify(cuOut(df))),tab:stayTab,sel:keepSel}; ccBuild(); return; }
    ccClose();
    if(thenCode&&window._feOpenCtl) window._feOpenCtl('d'+id); }
  function openCC(id){
    var df=id?defById(id):null; if(id&&!df) return;
    cc={tab:'look',sel:0,d:df?JSON.parse(JSON.stringify(cuOut(df))):{id:0,name:'Custom '+(customDefs.length+1),art:'',ar:1,w:80,nodes:{in:false,out:false,data:false,damp:false},vmin:1,vmax:250,parts:[],nextPid:1}};
    if(!ccOv){
      var st=document.createElement('style'); st.id='ccStyle'; st.textContent=CC_CSS; document.head.appendChild(st);
      ccOv=document.createElement('div'); ccOv.id='ccOverlay'; document.body.appendChild(ccOv);
      ccOv.addEventListener('input',function(e){ if(!cc) return; if(ccPartInput(e)) return; var id=e.target.id, v=parseFloat(e.target.value);
        if(id==='ccName') cc.d.name=e.target.value;
        else if(id==='ccW'){ if(isFinite(v)) cc.d.w=Math.max(20,Math.min(560,v)); }
        else if(id==='ccVmin'){ if(isFinite(v)) cc.d.vmin=Math.max(0,Math.min(100000,v)); }
        else if(id==='ccVmax'){ if(isFinite(v)) cc.d.vmax=Math.max(0,Math.min(100000,v)); }
        else return; ccPreview(); });
      ccOv.addEventListener('change',function(e){ if(!cc) return; if(ccPartInput(e)) return; var id=e.target.id;
        if(id==='ccFile'){ readImg(e.target.files&&e.target.files[0],function(url,ar){ cc.d.art=url; cc.d.ar=ar; ccPreview(); }); e.target.value=''; return; }
        if(id==='ccIn'||id==='ccOut'||id==='ccData'||id==='ccDamp'){ cc.d.nodes[id==='ccIn'?'in':id==='ccOut'?'out':id==='ccDamp'?'damp':'data']=!!e.target.checked;
          var r=document.getElementById('ccRate'); if(r) r.style.display=cc.d.nodes.in?'':'none'; ccPreview(); } });
      ccOv.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-a]'); if(!b||!cc) return; var a=b.getAttribute('data-a');
        if(a==='save') ccSave(false); else if(a==='cancel') ccClose();
        else if(a==='tab') ccTab(b.getAttribute('data-t'));
        else if(a==='addp'){ var ty=b.getAttribute('data-t'), tt=TYPES[ty]; if(!tt||(cc.d.parts||[]).length>=40) return; var n0=cc.d.parts.length;
          var q={pid:cc.d.nextPid++,type:ty,ox:(n0%6)*14,oy:(n0%6)*14,scale:100,label:tt.label||'',color:tt.color,latch:false,d:tt.init?tt.init():null,img:null}; cc.d.parts.push(q); cc.sel=q.pid; ccBuild(); }
        else if(a==='selp'){ cc.sel=+b.getAttribute('data-pid'); ccBuild(); }
        else if(a==='delp'){ var dp=+b.getAttribute('data-pid'); cc.d.parts=cc.d.parts.filter(function(x){ return x.pid!==dp; }); if(cc.sel===dp) cc.sel=0; ccBuild(); }
        else if(a==='img'){ var f=document.getElementById('ccFile'); if(f) f.click(); }
        else if(a==='imgclr'){ cc.d.art=''; cc.d.ar=1; ccPreview(); } });
      ccOv.addEventListener('pointerdown',function(e){ if(!cc||cc.tab!=='parts') return; var sv=document.getElementById('ccPrev'); if(!sv||!sv.contains(e.target)) return;
        var g=e.target.closest&&e.target.closest('[data-pid]'); if(!g) return; var q=ccPartById(+g.getAttribute('data-pid')); if(!q) return;
        var pt=sv.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; var p0=pt.matrixTransform(sv.getScreenCTM().inverse());
        cc.drag={q:q,dx:q.ox-p0.x,dy:q.oy-p0.y,moved:false}; cc.sel=q.pid; try{ sv.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); ccPreview(); });
      ccOv.addEventListener('pointermove',function(e){ if(!cc||!cc.drag) return; var sv=document.getElementById('ccPrev'); if(!sv) return;
        var pt=sv.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; var p1=pt.matrixTransform(sv.getScreenCTM().inverse()), q=cc.drag.q;
        q.ox=Math.round(Math.max(-3000,Math.min(3000,p1.x+cc.drag.dx))); q.oy=Math.round(Math.max(-3000,Math.min(3000,p1.y+cc.drag.dy))); cc.drag.moved=true; ccPreview(); });
      function ccDragEnd(){ if(!cc||!cc.drag) return; cc.drag=null; ccBuild(); }
      ccOv.addEventListener('pointerup',ccDragEnd); ccOv.addEventListener('pointercancel',ccDragEnd);
      document.addEventListener('click',function(e){ if(cc&&ccOv&&ccOv.style.display!=='none'&&e.target.closest&&e.target.closest('#docTabBar')) setTimeout(function(){ if(cc&&!(window._ceIsOpen&&window._ceIsOpen())){ cc.hidden=true; ccUnembed(); ccOv.style.display='none'; } },60); },true);
      document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&ccOv&&ccOv.style.display!=='none'&&cc){ e.stopPropagation(); ccClose(); } },true);
    }
    ccBuild(); ccOv.style.display='block'; ccOv.scrollTop=0; }
  var palDragged=false;
  palette.addEventListener('click',function(e){
    var b=e.target.closest('.ce-pal'); if(!b) return;
    if(palDragged){ palDragged=false; return; }
    addComp(b.getAttribute('data-type'),null,null,+b.getAttribute('data-def')||0);
  });
  (function(){
    var st=null, ghost=null;
    palette.addEventListener('pointerdown',function(e){
      var b=e.target.closest('.ce-pal'); if(!b||(e.pointerType==='mouse'&&e.button!==0)) return;
      st={b:b,x:e.clientX,y:e.clientY,id:e.pointerId,on:false};
    });
    document.addEventListener('pointermove',function(e){
      if(!st||e.pointerId!==st.id) return;
      if(!st.on){ if(Math.hypot(e.clientX-st.x,e.clientY-st.y)<6) return; st.on=true;
        ghost=document.createElement('div'); ghost.id='ceDragGhost'; var sv=st.b.querySelector('svg'); if(sv) ghost.appendChild(sv.cloneNode(true)); document.body.appendChild(ghost);
        try{ palette.setPointerCapture(e.pointerId); }catch(_){} }
      if(ghost){ ghost.style.left=(e.clientX-20)+'px'; ghost.style.top=(e.clientY-22)+'px'; }
      var r=svg.getBoundingClientRect(), inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
      svg.style.outline=inside?'2px dashed #35b9f0':'';
    });
    function end(e){
      if(!st||e.pointerId!==st.id) return;
      var s0=st; st=null; svg.style.outline='';
      if(ghost){ ghost.remove(); ghost=null; }
      try{ palette.releasePointerCapture(e.pointerId); }catch(_){}
      if(!s0.on) return;
      palDragged=true; setTimeout(function(){ palDragged=false; },0);
      if(e.type!=='pointerup') return;
      var r=svg.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){ var p=svgPoint(e); addComp(s0.b.getAttribute('data-type'),p.x,p.y,+s0.b.getAttribute('data-def')||0); }
    }
    document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
  })();

  var clip=null, pasteN=0;
  function copySel(){ var c=byId(selId); if(!c) return false;
    var base=[c].concat(members(c)), extra=[]; base.forEach(function(x){ if(isCu(x)) extra=extra.concat(partsOf(x)); });
    clip={items:JSON.parse(JSON.stringify(base.concat(extra)))}; pasteN=0; window._ceClipboard=clip; syncTb(); return true; }
  function pasteClip(){
    clip=clip||window._ceClipboard; if(!clip||!clip.items.length) return;
    var nb=clip.items.filter(function(i){ return TYPES[i.type]&&TYPES[i.type].kind==='box'; }).length;
    if(boxes().length+nb>12){ window.alert('Maximum 12 Controller Boxes.'); return; }
    setMode('edit'); pasteN++;
    var items=JSON.parse(JSON.stringify(clip.items)), head=items[0], dx=GRID*2*pasteN, dy=GRID*2*pasteN, vw=W/zoom, vh=H/zoom;
    if(Math.abs(head.x+dx-view.cx)>vw/2||Math.abs(head.y+dy-view.cy)>vh/2){ dx=snap(view.cx-head.x)+GRID*2*(pasteN-1); dy=snap(view.cy-head.y)+GRID*2*(pasteN-1); }
    var oldNew={}; items.forEach(function(it){ var oldId=it.id; it.id=nextId++; oldNew[oldId]=it.id; if(it.in) it.in=oldNew[it.in]||it.in; if(it.type==='custom') cuPend.push([oldId,it.id]); it.x+=dx; it.y+=dy; it.on=false; if(it.d) it.d.down=-1; if(TYPES[it.type].kind==='box'||it.type==='custom') it.d.name=uniqueName(it.d.name,null); clampPos(it); comps.push(it); });
    select(items[0].id); cuFlushCopies(); try{ svg.focus({preventScroll:true}); }catch(_){}
  }

  function select(id){ selId=id; selLink=-1; selNode=null; render(); buildProps(); }
  function imgSection(c,t){
    var lbl=(t.kind==='button'&&!c.latch)?['Released','Pressed']:['Off','On'], im=c.img||{off:'',on:'',w:60};
    function slot(k,txt){ return '<button type="button" class="vbtn '+(im[k]?'btn-accent':'btn-gray')+'" id="cePImgBtn_'+k+'" style="font-size:10px;letter-spacing:1px">'+txt.toUpperCase()+' IMAGE'+(im[k]?' <svg class="si" aria-hidden="true"><use href="#si-check"/></svg>':'')+'</button><input type="file" id="cePImgFile_'+k+'" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg" style="display:none">'; }
    return '<div style="grid-column:1/-1"><label>Custom images</label>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px">'+slot('off',lbl[0])+slot('on',lbl[1])+'<button type="button" class="vbtn btn-gray" id="cePImgClr" style="font-size:10px;letter-spacing:1px">CLEAR</button></div></div>'+
      (c.img&&(c.img.off||c.img.on)?'<div><label>Image width</label><input type="number" id="cePImgW" min="10" max="560" step="5" value="'+im.w+'"></div>':'');
  }
  function fieldHTML(f,v){
    var id='cePD_'+f.k, w=f.wide?' style="grid-column:1/-1"':'';
    if(f.type==='hidden'||f.type==='hiddentext') return '';
    if(f.type==='image') return '<div style="grid-column:1/-1"><label>'+f.label+'</label><div style="display:flex;gap:6px"><button type="button" class="vbtn btn-gray" id="cePDImgBtn" style="font-size:11px;letter-spacing:1px">CHOOSE IMAGE</button><button type="button" class="vbtn btn-gray" id="cePDImgClear" style="font-size:11px;letter-spacing:1px">REMOVE</button></div><input type="file" id="cePDImgFile" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg" style="display:none"></div>';
    var lab='<label>'+esc(f.label)+'</label>';
    if(f.type==='checkbox') return '<div'+w+'>'+lab+'<select id="'+id+'"><option value="0"'+(v?'':' selected')+'>Off</option><option value="1"'+(v?' selected':'')+'>On</option></select></div>';
    if(f.type==='select') return '<div'+w+'>'+lab+'<select id="'+id+'">'+f.opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>';
    if(f.type==='color') return '<div'+w+'>'+lab+'<input type="color" id="'+id+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(v)?v:f.def)+'"></div>';
    if(f.type==='textarea') return '<div'+w+'>'+lab+'<textarea id="'+id+'" rows="2" maxlength="'+(f.maxlen||200)+'">'+esc(v)+'</textarea></div>';
    if(f.type==='number') return '<div'+w+'>'+lab+'<input type="number" id="'+id+'" min="'+f.min+'" max="'+f.max+'" step="'+(f.step||1)+'" value="'+v+'"></div>';
    return '<div'+w+'>'+lab+'<input type="text" id="'+id+'" maxlength="'+(f.maxlen||200)+'" value="'+esc(v)+'"></div>';
  }
  function onField(e,c){
    var k=e.target.id.slice(5), t=TYPES[c.type], f=t.fields&&t.fields.filter(function(x){return x.k===k;})[0]; if(!f||!c.d) return;
    var v;
    if(f.type==='number'){ v=parseFloat(e.target.value); if(!isFinite(v)) return; v=Math.max(f.min,Math.min(f.max,v)); }
    else if(f.type==='checkbox') v=e.target.value==='1';
    else if(f.type==='color'){ v=e.target.value; if(!/^#[0-9a-f]{6}$/i.test(v)) return; }
    else v=e.target.value;
    if(c.type==='box'&&(k==='inPins'||k==='outPins')) v=Math.round(v); c.d[k]=v; if(c.type==='box'&&(k==='dampOut'||k==='inPins'||k==='outPins')){ pruneLinks(); linksChanged(); if(k!=='dampOut'){ var pbx=document.getElementById('cePPbox'), pg=pbx&&pbx.closest('details.ce-grp'); if(pg) pg.outerHTML=grp('pins','Input Pins ('+pinN(c,'inPins')+')','<div id="cePPbox" style="grid-column:1/-1">'+pinRows(c)+'</div>',true); else if(pbx) pbx.innerHTML=pinRows(c); var psx=document.getElementById('cePSbox'), sg=psx&&psx.closest('details.ce-grp'); if(sg) sg.outerHTML=sidesUI(boxKey(c)); } } if(c.type==='selector'){ c.d.pos=String(selPos(c)); c.on=selPos(c)>0; if(k==='n') buildProps(); } if(c.type==='lcd'&&k==='cols'){ c.d.cols=Math.round(v); } if(c.type==='lcd'&&k==='rows') buildProps(); clampPos(c); render();
  }
  function readImg(file,cb){
    if(!file) return;
    var isSvg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name||'');
    if(!isSvg&&!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return;
    function finish(src,isVec){
      var im=new Image(); im.onload=function(){
        var nw=im.naturalWidth||im.width||300, nh=im.naturalHeight||im.height||300;
        var mx=isVec?1024:480, sc=isVec?mx/Math.max(nw,nh):Math.min(1,mx/Math.max(nw,nh)), cw=Math.max(1,Math.round(nw*sc)), ch=Math.max(1,Math.round(nh*sc));
        var cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; var cx=cv.getContext('2d'); cx.clearRect(0,0,cw,ch); cx.drawImage(im,0,0,cw,ch);
        var out=cv.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',0.88);
        if(IMG_RE.test(out)) cb(out,Math.max(0.05,Math.min(20,ch/cw))); };
      im.onerror=function(){ window.alert('That image could not be loaded.'); };
      im.src=src; }
    var fr=new FileReader();
    if(isSvg){
      fr.onload=function(){
        try{
          var doc=new DOMParser().parseFromString(String(fr.result),'image/svg+xml'), r=doc.documentElement;
          if(!r||r.nodeName.toLowerCase()!=='svg'||doc.getElementsByTagName('parsererror').length) throw 0;
          Array.prototype.slice.call(doc.getElementsByTagName('script')).forEach(function(n){ n.parentNode.removeChild(n); });
          var vb=(r.getAttribute('viewBox')||'').split(/[\s,]+/).map(parseFloat), w=parseFloat(r.getAttribute('width')), h=parseFloat(r.getAttribute('height'));
          if(!(w>0)||!(h>0)||/%/.test(r.getAttribute('width')||'')||/%/.test(r.getAttribute('height')||'')){
            if(vb.length===4&&vb[2]>0&&vb[3]>0){ w=vb[2]; h=vb[3]; } else { w=300; h=300; }
            r.setAttribute('width',w); r.setAttribute('height',h); }
          if(!r.getAttribute('xmlns')) r.setAttribute('xmlns','http://www.w3.org/2000/svg');
          finish('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(r)),true);
        }catch(_){ window.alert('That SVG could not be read.'); } };
      fr.readAsText(file);
    } else { fr.onload=function(){ finish(fr.result,false); }; fr.readAsDataURL(file); }
  }
  function loadImage(file,c){ readImg(file,function(url,ar){ c.d.src=url; c.d.ar=ar; clampPos(c); render(); buildProps(); }); }
  function loadStateImage(file,c,slot){ readImg(file,function(url,ar){
    if(!c.img) c.img={off:'',on:'',w:60,ar:ar};
    if(slot==='off'||!c.img.off) c.img.ar=ar;
    c.img[slot]=url; clampPos(c); render(); buildProps(); }); }
  function moveLayer(op){
    var i=comps.indexOf(byId(selId)); if(i<0) return; var c=comps.splice(i,1)[0];
    comps.splice(op==='front'?comps.length:op==='back'?0:op==='up'?Math.min(comps.length,i+1):Math.max(0,i-1),0,c); render();
  }
  function syncTb(){ var on=!!(mode==='edit'&&byId(selId)); ['ceTbDup','ceTbDel','ceTbCopy'].forEach(function(id){ var b=document.getElementById(id); if(b) b.disabled=!on; }); var pb=document.getElementById('ceTbPaste'); if(pb) pb.disabled=!(mode==='edit'&&clip&&clip.items.length); }
  function hasInnerText(c,t){ if(c.type==='lcd') return true; if(c.type==='image'||hasImg(c)) return false; try{ return /<text\b/.test(t.draw(c)); }catch(_){ return false; } }
  var grpOpen;
  function grp(id,title,html,def){ if(!html) return ''; if(!grpOpen) grpOpen={}; var o=Object.prototype.hasOwnProperty.call(grpOpen,id)?grpOpen[id]:!!def;
    return '<details class="ce-grp" data-g="'+id+'"'+(o?' open':'')+'><summary>'+title+'</summary><div class="ce-gb">'+html+'</div></details>'; }
  propsBox.addEventListener('toggle',function(e){ var d=e.target; if(d&&d.classList&&d.classList.contains('ce-grp')){ if(!grpOpen) grpOpen={}; grpOpen[d.getAttribute('data-g')]=d.open; } },true);
  function pinRows(c){ var n=pinN(c,'inPins'), i, g, h; if(!n) return '<div style="grid-column:1/-1;font-size:9px;color:var(--muted);letter-spacing:1px">NO INPUT PINS</div>';
    h='<div class="ce-tw"><table class="ce-tbl"><thead><tr><th>Input pin</th><th>Mode</th><th>HIGH at (V)</th></tr></thead><tbody>';
    for(i=1;i<=n;i++){ g=pinCfgOf(c.d,i);
      h+='<tr><td>PIN '+i+'</td><td><select id="cePPm_'+i+'"><option value="d"'+(g.m==='d'?' selected':'')+'>Digital</option><option value="a"'+(g.m==='a'?' selected':'')+'>Analog</option></select></td>'+
         '<td>'+(g.m==='d'?'<input type="number" id="cePPv_'+i+'" min="0" max="100000" step="0.1" value="'+g.hv+'" title="Voltage (V) at or above which this pin reads HIGH">':'<span style="color:var(--muted)">-</span>')+'</td></tr>'; }
    return h+'</tbody></table></div>'; }
  function pinProp(e,c){ var m=/^cePP([mv])_(\d+)$/.exec(e.target.id); if(!m||!isBox(c)) return; var i=+m[2], g=pinCfgOf(c.d,i);
    if(m[1]==='m') g.m=e.target.value==='a'?'a':'d'; else { var v=parseFloat(e.target.value); if(!isFinite(v)) return; g.hv=Math.max(0,Math.min(100000,v)); }
    setPinCfg(c.d,i,g); if(m[1]==='m'){ var bx=document.getElementById('cePPbox'); if(bx) bx.innerHTML=pinRows(c); } render(); }
  function buildProps(){
    syncTb();
    var c=byId(selId);
    if(mode==='edit'&&selNode){ propsBox.style.display=''; propsBox.style.minHeight='';
      (function(){ var st=nodeSt[selNode], src=selNode==='source';
        var nm=({source:'Source',siren:'Siren',blower:'Blower',damper:'Damper',rotator:'Rotator'})[selNode], tg='<div><label>', yn=function(id,v){ return '<select id="'+id+'"><option value="0"'+(v?'':' selected')+'>Off</option><option value="1"'+(v?' selected':'')+'>On</option></select>'; };
        var gText=tg+'Name</label><input type="text" id="cePN_name" maxlength="16" value="'+esc(st.name)+'"></div>'+
          tg+'Show Label</label>'+yn('cePN_showName',st.showName)+'</div>'+
          tg+'Name Color</label><div style="display:flex;gap:4px"><input type="color" id="cePN_tcolor" value="'+esc(st.tcolor||st.color)+'" style="flex:1"><button type="button" class="vbtn btn-gray" id="cePNRstT" style="font-size:10px;padding:2px 6px;letter-spacing:1px">AUTO</button></div></div>'+
          tg+'Font</label><select id="cePN_font"><option value="">Default</option>'+TEXT_FONTS.map(function(o){ return '<option value="'+esc(o[0])+'"'+(st.font===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>'+
          tg+'Font Size</label><input type="number" id="cePN_size" min="6" max="40" step="1" value="'+st.size+'"></div>'+
          tg+'Bold</label>'+yn('cePN_bold',st.bold)+'</div>'+
          tg+'Show Voltage</label><select id="cePN_showV"><option value="1"'+(st.showV?' selected':'')+'>On</option><option value="0"'+(st.showV?'':' selected')+'>Off</option></select></div>'+
          tg+'Voltage Text Color</label><div style="display:flex;gap:4px"><input type="color" id="cePN_vcolor" value="'+esc(st.vcolor||'#d0d8f0')+'" style="flex:1"><button type="button" class="vbtn btn-gray" id="cePNRstV" style="font-size:10px;padding:2px 6px;letter-spacing:1px">AUTO</button></div></div>';
        var gLook=tg+'Color</label><input type="color" id="cePN_color" value="'+esc(st.color)+'"></div>'+
          tg+'Width</label><input type="number" id="cePN_w" min="40" max="600" step="2" value="'+Math.round(st.w)+'"></div>'+
          tg+'Height</label><input type="number" id="cePN_h" min="24" max="300" step="2" value="'+Math.round(st.h)+'"></div>';
        var gPos=tg+'X</label><input type="number" id="cePN_x" step="1" value="'+Math.round(nodePos(selNode).x*10)/10+'"></div>'+
          tg+'Y</label><input type="number" id="cePN_y" step="1" value="'+Math.round(nodePos(selNode).y*10)/10+'"></div>';
        propsBox.innerHTML='<div style="grid-column:1/-1;color:var(--accent2);font-size:10px;letter-spacing:1px;text-transform:uppercase">'+nm+'</div>'+
          (src?srcOpts(st):grp('set',nm+' Settings',(selNode==='blower'?blowerOpts(st):selNode==='rotator'?rotatorOpts(st):selNode==='damper'?damperOpts(st):''),true))+
          grp('ntext','Text',gText,false)+grp('nlook','Appearance &amp; Size',gLook,false)+grp('npos','Position',gPos,false)+sidesUI(selNode)+
          '<button type="button" class="vbtn btn-gray" id="cePNReset" style="font-size:11px;letter-spacing:1px">RESET LOOK</button>'+
          (itemKey(selNode)?'<button type="button" class="vbtn btn-red" id="cePNRemove" style="font-size:11px;letter-spacing:1px">REMOVE ITEM</button>':''); })();
      syncTb(); return; }
    if(mode==='edit'&&selLink>=0&&links[selLink]){ var wl_=links[selLink]; propsBox.style.display=''; propsBox.style.minHeight='';
      propsBox.innerHTML='<div style="grid-column:1/-1;color:var(--accent2);font-size:10px;letter-spacing:1px;text-transform:uppercase">Wire ('+((wl_.t==='v'||wl_.t==='p')?'Voltage':wl_.t==='k'?'Damper':'Data')+')</div>'+
        '<div><label>Color</label><div style="display:flex;gap:4px"><input type="color" id="cePW_color" value="'+(HEXRE.test(wl_.color)?wl_.color:((wl_.t==='v'||wl_.t==='p')?VCOL:wl_.t==='k'?KCOL:DCOL))+'" style="flex:1"><button type="button" class="vbtn btn-gray" id="cePWRst" style="font-size:10px;letter-spacing:1px">RESET</button></div></div>'+
        '<div><label>Show Label</label><select id="cePW_show"><option value="0"'+(wl_.showLabel?'':' selected')+'>Off</option><option value="1"'+(wl_.showLabel?' selected':'')+'>On</option></select></div>'+
        '<div style="grid-column:1/-1"><label>Label</label><input type="text" id="cePW_label" maxlength="24" value="'+esc(wl_.label||'')+'"></div>'+
        '<button type="button" class="vbtn btn-red" id="cePWDel" style="font-size:11px;letter-spacing:1px">DELETE WIRE</button>';
      syncTb(); return; }
    if(mode!=='edit'){ propsBox.style.display='none'; propsBox.innerHTML=''; propsBox.style.minHeight=''; return; }
    if(!c){ propsBox.style.display=''; propsBox.innerHTML=''; propsBox.style.minHeight='120px'; return; }
    propsBox.style.minHeight='';
    var t=TYPES[c.type], isBtn=(t.kind==='button'), stateLbl=(isBtn&&!c.latch)?['Released','Pressed']:['Off','On'], noState=(t.kind==='static'||t.kind==='keypad'||t.kind==='lcd'||t.kind==='box'||t.kind==='custom'||t.kind==='midi'||t.kind==='selector'||t.kind==='pot'||t.kind==='buzzer');
    propsBox.style.display='';
    var tg='<div><label>', gLabel='', gLook='', gPos='', gSet='';
    if(t.kind!=='box'){
      gLabel=tg+'Label</label><input type="text" id="cePLabel" maxlength="24" value="'+esc(c.label)+'"></div>'+
        tg+'Label Font</label><select id="cePLFont"><option value="">Default</option>'+TEXT_FONTS.map(function(o){ return '<option value="'+esc(o[0])+'"'+(c.lfont===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>'+
        tg+'Label Size</label><input type="number" id="cePLSize" min="6" max="48" step="1" value="'+(c.lsize||10)+'"></div>'+
        tg+'Label Color</label><div style="display:flex;gap:4px"><input type="color" id="cePLColor" value="'+(c.lcolor&&HEXRE.test(c.lcolor)?c.lcolor:'#8a8f9c')+'" style="flex:1"><button type="button" class="vbtn btn-gray" id="cePLReset" title="Back to the default label color" style="font-size:10px;padding:2px 6px;letter-spacing:1px">AUTO</button></div></div>'+
        tg+'Label Bold</label><input type="checkbox" id="cePLBold"'+(c.lbold?' checked':'')+'></div>'+
        tg+'Hide Label</label><input type="checkbox" id="cePLHide"'+(c.hideLabel?' checked':'')+'></div>'+
        (hasInnerText(c,t)?tg+'Hide Text</label><input type="checkbox" id="cePTHide"'+(c.hideText?' checked':'')+'></div>':''); }
    gLook=tg+'Color</label><input type="color" id="cePColor" value="'+esc(c.color)+'"></div>'+
      (c.type==='image'?'':tg+'Text Color</label><div style="display:flex;gap:4px"><input type="color" id="cePTColor" value="'+(c.tcolor&&HEXRE.test(c.tcolor)?c.tcolor:'#d0d8f0')+'" style="flex:1"><button type="button" class="vbtn btn-gray" id="cePTReset" title="Back to the default text colors" style="font-size:10px;padding:2px 6px;letter-spacing:1px">AUTO</button></div></div>')+
      ((t.kind==='latch'||t.kind==='button'||t.kind==='light')?imgSection(c,t):'');
    gPos=tg+'X</label><input type="number" id="cePX" step="1" value="'+Math.round(c.x*10)/10+'"></div>'+tg+'Y</label><input type="number" id="cePY" step="1" value="'+Math.round(c.y*10)/10+'"></div>'+
      tg+'Size (%)</label><input type="number" id="cePSize" min="10" max="1000" step="10" value="'+Math.round(SX(c)*100)+'"></div>';
    gSet=(t.kind==='box'?tg+'Controller ID</label><div style="padding:6px 0;color:var(--accent2);letter-spacing:1px">C'+c.id+'</div></div>':'')+
      (noState?'':tg+'State</label><select id="cePState"><option value="0"'+(c.on?'':' selected')+'>'+stateLbl[0]+'</option><option value="1"'+(c.on?' selected':'')+'>'+stateLbl[1]+'</option></select></div>')+
      (isBtn?'<div style="grid-column:1/-1"><label>Button Action</label><select id="cePAction"><option value="0"'+(c.latch?'':' selected')+'>Momentary</option><option value="1"'+(c.latch?' selected':'')+'>Latching</option></select></div>':'')+
      (t.fields?t.fields.filter(function(f){ return !(c.type==='lcd'&&/^l[1-4]$/.test(f.k)&&+f.k.slice(1)>lcdRows(c)); }).map(function(f){ return fieldHTML(f,c.d[f.k]); }).join(''):'')+
      (t.kind==='custom'?cuProps(c):'')+(t.kind==='midi'?midiProps(c):'');
    propsBox.innerHTML=
      '<div style="grid-column:1/-1;color:var(--accent2);font-size:10px;letter-spacing:1px;text-transform:uppercase">'+t.name+'</div>'+
      grp('set',esc(t.name)+' Settings',gSet,true)+
      (t.kind==='box'?grp('pins','Input Pins ('+pinN(c,'inPins')+')','<div id="cePPbox" style="grid-column:1/-1">'+pinRows(c)+'</div>',true):'')+
      grp('label','Label',gLabel,false)+grp('look','Appearance',gLook,false)+grp('pos','Position &amp; Size',gPos,false)+
      sidesUI(boxKey(c))+
      grp('layer','Layer','<div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">'+
        '<button type="button" class="vbtn btn-gray" id="ceLyBack" style="font-size:10px;letter-spacing:1px">SEND TO BACK</button>'+
        '<button type="button" class="vbtn btn-gray" id="ceLyDown" style="font-size:10px;letter-spacing:1px">MOVE DOWN</button>'+
        '<button type="button" class="vbtn btn-gray" id="ceLyUp" style="font-size:10px;letter-spacing:1px">MOVE UP</button>'+
        '<button type="button" class="vbtn btn-gray" id="ceLyFront" style="font-size:10px;letter-spacing:1px">BRING TO FRONT</button></div>',false)+
      '<button type="button" class="vbtn btn-gray" id="ceDup" style="font-size:11px;letter-spacing:1px">DUPLICATE</button>'+
      '<button type="button" class="vbtn btn-red" id="ceDel" style="font-size:11px;letter-spacing:1px">DELETE</button>';
  }
  function rotatorState(){ var st=nodeSt.rotator; if(!st.on) return null; var l=null; links.forEach(function(x){ if(x.t==='p'&&x.to==='rotator'&&x.tp==='bin') l=x; });
    var v=l?linkV(l):0, lo=st.bMin, hi=Math.max(st.bMin,st.bMax); return {on:!!l&&v>0&&v>=lo&&v<=hi,volts:v,wired:!!l}; }
  window._ceRotatorState=rotatorState;
  function sirenBlowerOn(){ var st=nodeSt.blower; if(!st.on) return null; var l=null; links.forEach(function(x){ if(x.t==='p'&&x.to==='blower'&&x.tp==='bin') l=x; });
    var v=l?linkV(l):0, lo=st.bMin, hi=Math.max(st.bMin,st.bMax); return {on:!!l&&v>0&&v>=lo&&v<=hi,volts:v,wired:!!l}; }
  window._ceBlowerState=sirenBlowerOn;
  function rotatorOpts(st){ return '<div><label>Rotator min operating voltage (V)</label><input type="number" id="cePN_bMin" min="0" max="100000" step="0.1" value="'+st.bMin+'"></div>'+
      '<div><label>Rotator max operating voltage (V)</label><input type="number" id="cePN_bMax" min="0" max="100000" step="0.1" value="'+st.bMax+'"></div>'+
      '<div style="grid-column:1/-1;font-size:9px;color:var(--muted);letter-spacing:1px">UNLINKED MODE ONLY: while this item is on the layout, the rotator runs only when voltage inside this range reaches its POWER dot (the Start / Stop RPM gate is bypassed). In Linked or Manual mode the item has no effect.</div>'; }
  function blowerOpts(st){ return '<div><label>Blower min operating voltage (V)</label><input type="number" id="cePN_bMin" min="0" max="100000" step="0.1" value="'+st.bMin+'"></div>'+
      '<div><label>Blower max operating voltage (V)</label><input type="number" id="cePN_bMax" min="0" max="100000" step="0.1" value="'+st.bMax+'"></div>'; }
  function damperOpts(st){ return '<div><label>Group ON at (V)</label><input type="number" id="cePN_vOn" min="0" max="100000" step="0.1" value="'+st.vOn+'"></div>'+
      '<div style="grid-column:1/-1;font-size:9px;color:var(--muted);letter-spacing:1px">CONTROLLER MODE: one input pin per damper group (G1, G2...). Wire controller OUTPUT pins to them.</div>'; }
  function syncItemSections(){ var b=document.getElementById('blowerSection'), d=document.getElementById('dampersSection'); if(b) b.classList.toggle('lo-off',!nodeSt.blower.on); if(d) d.classList.toggle('lo-off',!nodeSt.damper.on); }
  window._ceDamperItem=function(){ return !!nodeSt.damper.on; };
  window._ceDamperPin=function(g){ if(!nodeSt.damper.on) return false; var l=null, key='dg'+(g+1); links.forEach(function(x){ if(x.t==='p'&&x.to==='damper'&&x.tp===key) l=x; }); return !!l&&linkV(l)>=nodeSt.damper.vOn; };
  window._ceMidiPresent=function(){ return midis().length>0; };
  (function(){ var sig='', gs=''; setInterval(function(){
    var mode=window._damperMode?window._damperMode():'', gn=window._damperGroupCount?window._damperGroupCount():0, ms=midis().length>0;
    if(wrDirty&&wiresVisible()){ wrDirty=false; renderWires(); }
    if(rcDirty&&wiresVisible()){ rcDirty=false; render(); }
    var s2=mode+'|'+gn+'|'+(ms?1:0)+'|'+(nodeSt.damper.on?1:0);
    if(s2!==sig){ sig=s2; try{ if(window._dmLock) window._dmLock(ms); }catch(_){} renderWires(); }
    var g2=''; if(mode==='controller'){ for(var i=0;i<gn;i++) g2+=window._ceDamperPin(i)?'1':'0'; }
    if(g2!==gs){ gs=g2; try{ if(window._dmPinsChanged) window._dmPinsChanged(); }catch(_){} } },80); })();
  function addItem(k,px,py){ setMode('edit'); nodeSt[k].on=true; var p=nodePos(k); if(px!=null&&py!=null){ p.x=snap(px); p.y=snap(py); } else { p.x=sirenPos.x; p.y=sirenPos.y+(k==='blower'?70:k==='rotator'?210:140); }
    select(null); selNode=k; buildProps(); linksChanged(); try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){} if(window._ceHistNow) window._ceHistNow(); }
  function removeItem(k){ nodeSt[k].on=false; dropLinksOf(k); selNode=null; selLink=-1; buildProps(); linksChanged(); try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){} if(window._ceHistNow) window._ceHistNow(); }
  function blowerArt(st,hw,hh,col){
    var W=2*hw, H=2*hh;
    return '<g pointer-events="none"><rect x="'+-hw+'" y="'+-hh+'" width="'+W+'" height="'+H+'" rx="6" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="'+(-hw+1)+'" y="'+(-hh+1)+'" width="'+(W-2)+'" height="'+(H-2)+'" rx="5" fill="none" stroke="#fff" stroke-opacity=".14"/><text x="0" y="'+(-hh+9)+'" text-anchor="middle" font-size="7" letter-spacing="1.5" font-weight="bold" fill="#ff5d5d">BLOWER</text></g>'; }
  function rotatorArt(st,hw,hh,col){
    var W=2*hw, H=2*hh;
    return '<g pointer-events="none"><rect x="'+-hw+'" y="'+-hh+'" width="'+W+'" height="'+H+'" rx="5" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="'+(-hw+1)+'" y="'+(-hh+1)+'" width="'+(W-2)+'" height="'+(H-2)+'" rx="4" fill="none" stroke="#fff" stroke-opacity=".14"/><text x="0" y="'+(-hh+9)+'" text-anchor="middle" font-size="7" letter-spacing="1.5" font-weight="bold" fill="#4da3ff">ROTATOR</text></g>'; }
  function damperArt(st,hw,hh,col){
    var W=2*hw, H=2*hh;
    return '<g pointer-events="none"><rect x="'+-hw+'" y="'+-hh+'" width="'+W+'" height="'+H+'" rx="4" fill="url(#tcBody)" stroke="#0b0c0d"/><rect x="'+(-hw+1)+'" y="'+(-hh+1)+'" width="'+(W-2)+'" height="'+(H-2)+'" rx="3" fill="none" stroke="#fff" stroke-opacity=".14"/><text x="0" y="'+(-hh+9)+'" text-anchor="middle" font-size="7" letter-spacing="1.5" font-weight="bold" fill="#3ddc97">DAMPER</text></g>'; }
  function itemPalette(){ function sv(inner){ return '<svg viewBox="-24 -24 48 48" width="36" height="38"><g filter="url(#tcFx)">'+inner+'</g></svg>'; }
    return '<button type="button" class="ce-pal" data-type="blower" title="Add the Blower item (the Blower section appears in the Siren editor only while it is on the layout)">'+sv(blowerArt(nodeDef('blower'),22,18,'#ff5d5d'))+'<span>Blower</span></button>'+
      '<button type="button" class="ce-pal" data-type="damper" title="Add the Damper item (the Dampers section appears in the Siren editor only while it is on the layout)">'+sv(damperArt(nodeDef('damper'),22,18,'#3ddc97'))+'<span>Damper</span></button>'+
      '<button type="button" class="ce-pal" data-type="rotator" title="Add the Rotator item (controls the rotator while Rotator Mode is Unlinked)">'+sv(rotatorArt(nodeDef('rotator'),22,18,'#4da3ff'))+'<span>Rotator</span></button>'; }
  function srcOpts(st){ var t=curType(), look=srcLook(), o='<div><label>Type</label><select id="cePN_look">'+SRC_LOOKS[t].map(function(x){ return '<option value="'+x[0]+'"'+(look===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>', b='';
    if(t==='dc'&&look==='battery') b='<div><label>Discharge over time</label><select id="cePN_drain"><option value="0"'+(st.drain?'':' selected')+'>Off</option><option value="1"'+(st.drain?' selected':'')+'>On</option></select></div>'+
      '<div><label>Full discharge time (min)</label><input type="number" id="cePN_drainMin" min="0.1" max="100000" step="0.5" value="'+st.drainMin+'"></div>'+
      '<div><label>Cutoff voltage (V)</label><input type="number" id="cePN_cutoff" min="0" max="100000" step="0.5" value="'+st.cutoff+'"></div>'+
      '<button type="button" class="vbtn btn-gray" id="cePNRecharge" style="font-size:11px;letter-spacing:1px">RECHARGE</button>';
    return grp('set','Source Settings',o,true)+grp('batt','Battery',b,true); }
  (function(){ var ct=document.getElementById('currentTypeSelect'); if(ct) ct.addEventListener('change',function(){ batt.t0=Date.now(); renderWires(); if(selNode==='source') buildProps(); }); })();
  function nodeProp(e){
    var id=e.target.id; if(!selNode||id.indexOf('cePN_')!==0) return false;
    var st=nodeSt[selNode], k=id.slice(5), v=e.target.value;
    if(k==='name') st.name=String(v).slice(0,16);
    else if(k==='color'){ if(/^#[0-9a-f]{6}$/i.test(v)) st.color=v; }
    else if(k==='tcolor'||k==='vcolor'){ if(/^#[0-9a-f]{6}$/i.test(v)) st[k]=v; }
    else if(k==='w'||k==='h'||k==='size'){ var n=parseFloat(v); if(!isFinite(n)) return true; var lim={w:[40,600],h:[24,300],size:[6,40]}[k]; st[k]=Math.max(lim[0],Math.min(lim[1],n)); }
    else if(k==='x'||k==='y'){ var pv=parseFloat(v); if(!isFinite(pv)) return true; nodePos(selNode)[k]=Math.max(-LIM,Math.min(LIM,pv)); }
    else if(k==='font') st.font=v;
    else if(k==='bold') st.bold=v==='1';
    else if(k==='showName') st.showName=v==='1';
    else if(k==='showV') st.showV=v==='1';
    else if(k==='look'){ if(SRC_LOOKS[curType()].some(function(x){ return x[0]===v; })) st.looks[curType()]=v; if(selNode==='source') buildProps(); }
    else if(k==='vOn'){ var vo=parseFloat(v); if(!isFinite(vo)) return true; st.vOn=Math.max(0,Math.min(100000,vo)); }
    else if(k==='bMin'||k==='bMax'){ var bn=parseFloat(v); if(!isFinite(bn)) return true; st[k]=Math.max(0,Math.min(100000,bn)); }
    else if(k==='drain'){ st.drain=v==='1'; batt.t0=Date.now(); }
    else if(k==='drainMin'||k==='cutoff'){ var nn=parseFloat(v); if(!isFinite(nn)) return true; if(k==='drainMin'){ st.drainMin=Math.max(0.1,Math.min(100000,nn)); } else st.cutoff=Math.max(0,Math.min(100000,nn)); batt.t0=Date.now(); }
    renderWires(); try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){}
    return true; }
  function wireProp(e){ var id=e.target.id; if(id.indexOf('cePW_')!==0) return false; var l=links[selLink]; if(!l) return true; var k=id.slice(5), v=e.target.value;
    if(k==='color'){ if(HEXRE.test(v)) l.color=v; } else if(k==='show') l.showLabel=(v==='1'); else if(k==='label') l.label=String(v).slice(0,24);
    renderWires(); return true; }
  propsBox.addEventListener('input',function(e){
    if(wireProp(e)) return;
    if(sideProp(e)) return;
    if(nodeProp(e)) return;
    var c=byId(selId); if(!c) return;
    if(e.target.id.indexOf('cePD_')===0){ onField(e,c); return; }
    if(/^cePP[mv]_/.test(e.target.id)){ pinProp(e,c); return; }
    if(e.target.id==='cePImgW'){ var iw=parseFloat(e.target.value); if(isFinite(iw)&&c.img){ c.img.w=Math.max(10,Math.min(560,iw)); clampPos(c); render(); } return; }
    if(e.target.id==='cePLabel') c.label=e.target.value;
    else if(e.target.id==='cePLFont') c.lfont=e.target.value;
    else if(e.target.id==='cePLSize'){ var ls=parseFloat(e.target.value); if(!isFinite(ls)) return; c.lsize=Math.max(6,Math.min(48,ls)); }
    else if(e.target.id==='cePLBold') c.lbold=!!e.target.checked;
    else if(e.target.id==='cePLHide') c.hideLabel=!!e.target.checked;
    else if(e.target.id==='cePTHide') c.hideText=!!e.target.checked;
    else if(e.target.id==='cePLColor'){ if(HEXRE.test(e.target.value)) c.lcolor=e.target.value; }
    else if(e.target.id==='cePTColor'){ if(HEXRE.test(e.target.value)) c.tcolor=e.target.value; }
    else if(e.target.id==='cePColor') c.color=e.target.value;
    else if(e.target.id==='cePX'||e.target.id==='cePY'){ var cv=parseFloat(e.target.value); if(!isFinite(cv)) return; var ax=e.target.id==='cePX'?'x':'y', dl=cv-c[ax]; members(c).forEach(function(m){ m[ax]+=dl; clampPos(m); }); c[ax]=cv; clampPos(c); if(isCu(c)) placeParts(); }
    else if(e.target.id==='cePSize'){ var v=parseFloat(e.target.value); if(!isFinite(v)) return; c.scale=Math.max(10,Math.min(1000,v)); delete c.sx; delete c.sy; clampPos(c); }
    else if(e.target.id==='cePState') c.on=e.target.value==='1';
    else if(e.target.id==='cePAction'){ c.latch=e.target.value==='1'; c.on=false; render(); buildProps(); return; }
    render();
  });
  propsBox.addEventListener('change',function(e){
    var c0=byId(selId);
    if(c0 && e.target.id.indexOf('cePImgFile_')===0){ loadStateImage(e.target.files&&e.target.files[0],c0,e.target.id.slice(11)); e.target.value=''; return; }
    if(c0 && e.target.id==='cePDImgFile'){ loadImage(e.target.files&&e.target.files[0],c0); e.target.value=''; return; }
    if(c0 && isCtl(c0) && e.target.id==='cePD_name'){ var nn=uniqueName(e.target.value,c0); c0.d.name=nn; e.target.value=nn; render(); return; }
    if(c0 && e.target.id.indexOf('cePD_')===0){ onField(e,c0); return; }
    if(e.target.id==='cePSize'){ var c=byId(selId); if(c){ e.target.value=Math.round(SX(c)*100); } } });
  propsBox.addEventListener('click',function(e){
    var bid=e.target.id;
    if(midiClick(bid)) return;
    if(cuClick(bid)) return;
    if((bid==='cePLReset'||bid==='cePTReset')&&byId(selId)){ var rc=byId(selId); if(bid==='cePLReset') delete rc.lcolor; else delete rc.tcolor; render(); buildProps(); return; }
    if(bid==='cePWRst'&&links[selLink]){ delete links[selLink].color; buildProps(); renderWires(); return; }
    if(bid==='cePWDel'&&links[selLink]){ links.splice(selLink,1); selLink=-1; linksChanged(); buildProps(); return; }
    if((bid==='cePNRstT'||bid==='cePNRstV')&&selNode){ nodeSt[selNode][bid==='cePNRstT'?'tcolor':'vcolor']=''; buildProps(); renderWires(); return; }
    if(bid==='cePSReset'){ var rk=sideKeyNow(); if(rk){ var rh=sideHolder(rk); if(rh){ if(isFixedKey(rk)) rh.sides={}; else delete rh.sides; } buildProps(); renderWires(); try{ if(window._feCtlChanged) window._feCtlChanged(); }catch(_){} } return; }
    if(bid==='cePNRemove'&&itemKey(selNode)){ removeItem(selNode); return; }
    if(bid==='cePNReset'&&selNode){ var _ob=nodeSt[selNode]; nodeSt[selNode]=nodeDef(selNode); nodeSt[selNode].sides=_ob.sides||{}; if(itemKey(selNode)){ nodeSt[selNode].on=_ob.on; nodeSt[selNode].bMin=_ob.bMin; nodeSt[selNode].bMax=_ob.bMax; nodeSt[selNode].vOn=_ob.vOn; } batt.t0=Date.now(); buildProps(); renderWires(); return; }
    if(bid==='cePNRecharge'){ batt.t0=Date.now(); renderWires(); try{ if(window._feVinTick) window._feVinTick(); }catch(_){} return; }
    if(bid.indexOf('cePImgBtn_')===0){ var fi2=document.getElementById('cePImgFile_'+bid.slice(10)); if(fi2) fi2.click(); }
    else if(bid==='cePImgClr'){ var cc=byId(selId); if(cc){ cc.img=null; clampPos(cc); render(); buildProps(); } }
    else if(bid==='ceLyBack') moveLayer('back'); else if(bid==='ceLyDown') moveLayer('down'); else if(bid==='ceLyUp') moveLayer('up'); else if(bid==='ceLyFront') moveLayer('front');
    else if(e.target.id==='cePDImgBtn'){ var fi=document.getElementById('cePDImgFile'); if(fi) fi.click(); }
    else if(e.target.id==='cePDImgClear'){ var ci=byId(selId); if(ci&&ci.d){ ci.d.src=''; render(); } }
    else if(e.target.id==='ceDel') removeSel();
    else if(e.target.id==='ceDup') dupSel();
  });
  function askYes(title,msg,ok){
    if(typeof _dsDialog==='function') return _dsDialog({title:title,msg:msg,ok:ok||'OK'}).then(function(v){ return !!v; });
    return Promise.resolve(window.confirm(msg)); }
  function removeSel(){ if(selId===null) return;
    var bc=byId(selId), id=selId;
    if(bc&&isCu(bc)){ var inf2=window._feCtlInfo?window._feCtlInfo(boxKey(bc)):null, ns2=inf2?inf2.scripts:0;
      if(ns2){ askYes('Delete custom component','Delete "'+bc.d.name+'"? Its '+ns2+' script'+(ns2>1?'s':'')+' will be removed.','DELETE').then(function(yes){ if(yes) doRemove(id); }); return; } }
    if(bc&&isBox(bc)){ var inf=window._feCtlInfo?window._feCtlInfo(boxKey(bc)):null, ns=inf?inf.scripts:0, inside=members(bc).length;
      if(ns||inside){
        askYes('Delete controller','Delete controller "'+bc.d.name+'"?'+(ns?' Its '+ns+' script'+(ns>1?'s':'')+' will be removed.':'')+(inside?' The '+inside+' item'+(inside>1?'s':'')+' inside stay on the canvas and fall back to the surrounding controller (Main if none).':''),'DELETE').then(function(yes){ if(yes) doRemove(id); });
        return; } }
    doRemove(id); }
  function doRemove(id){
    var bc=byId(id); if(!bc) return;
    if(isCtl(bc)||isMidi(bc)){ dropLinksOf(boxKey(bc)); try{ if(window._feLinksChanged) window._feLinksChanged(); }catch(_){} }
    comps=comps.filter(function(c){return c.id!==id;}); if(selId===id) select(null); else render(); }
  function dupSel(){ var c=byId(selId); if(!c) return; var d=JSON.parse(JSON.stringify(c)); delete d.playing; d.id=nextId++; d.x+=20; d.y+=20; if(isBox(d)){ if(boxes().length>=12){ window.alert('Maximum 12 Controller Boxes.'); return; } d.d.name=uniqueName(d.d.name,null); } if(isCu(d)) d.d.name=uniqueName(d.d.name,null); clampPos(d); comps.push(d); if(isCu(d)) partsOf(c).forEach(function(q){ var q2=JSON.parse(JSON.stringify(q)); q2.id=nextId++; q2.in=d.id; comps.push(q2); }); select(d.id); if(isCu(d)&&window._feCopyCtl) window._feCopyCtl(boxKey(c),boxKey(d)); }

  var pan=null, pts={}, pinch=null;
  function uiRaf(cb){ if(window._simPaused) return -setTimeout(function(){ cb(performance.now()); },16); return requestAnimationFrame(cb); }
  function uiCaf(id){ if(id<0) clearTimeout(-id); else cancelAnimationFrame(id); }
  function startPan(e){
    pan={x:e.clientX,y:e.clientY,cx:view.cx,cy:view.cy}; svg.style.cursor='grabbing'; try{ svg.setPointerCapture(e.pointerId); }catch(_){} }
  svg.addEventListener('mousedown',function(e){ if(e.button===1) e.preventDefault(); });
  function svgPoint(e){ var pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
  svg.addEventListener('pointerdown',function(e){
    var g=e.target.closest('.ce-comp'), c=g?byId(parseInt(g.getAttribute('data-id'),10)):null;
    if(mode==='edit'&&c&&c.in) c=byId(c.in)||c;
    svg.focus({preventScroll:true});
    if(e.pointerType!=='mouse') pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(Object.keys(pts).length===2){ endPointer(); var pk=Object.keys(pts), pa=pts[pk[0]], pb=pts[pk[1]]; pinch={d:Math.hypot(pa.x-pb.x,pa.y-pb.y),z:zoom}; return; }
    if(e.button===1){ e.preventDefault(); startPan(e); return; }
    if(e.button===2&&mode==='edit'&&(e.ctrlKey||e.shiftKey)){ e.preventDefault(); var cq=svgPoint(e); cut={m:e.ctrlKey?'del':'rr',x0:cq.x,y0:cq.y,x1:cq.x,y1:cq.y}; selLink=-1; try{ svg.setPointerCapture(e.pointerId); }catch(_){} renderWires(); return; }
    if(mode==='edit'){
      if(linkDrag&&e.button===0){ var tp0=e.target.closest&&e.target.closest('.ce-port'); e.preventDefault();
        if(tp0) finishWire(tp0); else { var wq=svgPoint(e); var p0s=portPos(linkDrag.k,linkDrag.p), wsn=wsnap(wq,[p0s].concat(linkDrag.pts),e.altKey); linkDrag.pts.push({x:wsn.x,y:wsn.y}); renderWires(); } return; }
      var trr=e.button===0&&e.target.closest&&e.target.closest('.ce-rr'); if(trr){ e.preventDefault(); rrDrag={i:parseInt(trr.getAttribute('data-i'),10),j:parseInt(trr.getAttribute('data-j'),10)}; selLink=rrDrag.i; buildProps(); try{ svg.setPointerCapture(e.pointerId); }catch(_){} renderWires(); return; }
      var th=(document.elementsFromPoint?document.elementsFromPoint(e.clientX,e.clientY).filter(function(x){ return x.classList&&x.classList.contains('ce-handle'); })[0]:null)||(e.target.closest&&e.target.closest('.ce-handle')); if(th){ e.preventDefault(); startResize(th,e); return; }
      var tp=e.target.closest&&e.target.closest('.ce-port');
      if(tp){ var q=svgPoint(e); linkDrag={k:tp.getAttribute('data-k'),p:tp.getAttribute('data-p'),x:q.x,y:q.y,pts:[],cx:e.clientX,cy:e.clientY,fresh:true}; selLink=-1; buildProps(); renderWires(); return; }
      var tw=e.target.closest&&e.target.closest('.ce-wire');
      if(tw){ var wi=parseInt(tw.getAttribute('data-i'),10); select(null); selLink=wi; buildProps(); renderWires(); return; }
      var tm=e.target.closest&&e.target.closest('.ce-main');
      if(tm){ var nk=tm.getAttribute('data-n'), np=nodePos(nk), q2=svgPoint(e); select(null); selNode=nk; buildProps(); renderWires(); drag={main:true,np:np,dx:np.x-q2.x,dy:np.y-q2.y}; try{ svg.setPointerCapture(e.pointerId); }catch(_){} return; }
    }
    if(mode==='edit'){
      if(!c){ select(null); startPan(e); return; }
      var pt=svgPoint(e); drag={id:c.id,dx:c.x-pt.x,dy:c.y-pt.y,moved:false};
      var mm=members(c); if(mm.length) drag.mem=mm.map(function(m){ return {c:m,ox:m.x-c.x,oy:m.y-c.y}; });
      try{ svg.setPointerCapture(e.pointerId); }catch(_){}
      if(selId!==c.id) select(c.id);
    } else if(!c){ startPan(e);
    } else if(c){
      var k=TYPES[c.type].kind;
      if(k==='keypad'){ var pt2=svgPoint(e), ki=TYPES.keypad.hit(c,(pt2.x-c.x)/SX(c),(pt2.y-c.y)/SY(c)); if(ki>=0){ c.d.down=ki; held=c.id; try{ svg.setPointerCapture(e.pointerId); }catch(_){} emit('key',c,kpLabels(c)[ki]||String(ki+1)); } }
      else if(k==='selector'){ var ps=svgPoint(e); selSet(c,selPos(c)+(((ps.x-c.x)/SX(c))>=0?1:-1)); }
      else if(k==='pot'){ potDrag=c.id; try{ svg.setPointerCapture(e.pointerId); }catch(_){} potFromPointer(c,e); return; }
      else if(k==='static'||k==='lcd'||k==='box'||k==='custom'||k==='midi'){ startPan(e); return; }
      else if(k==='button' && !c.latch){ c.on=true; held=c.id; try{ svg.setPointerCapture(e.pointerId); }catch(_){} emit('on',c); }
      else if(k==='light'){ startPan(e); return; }
      else { c.on=!c.on; emit(c.on?'on':'off',c); }
      render();
    }
  });
  var potDrag=null;
  function potFromPointer(c,e){ var q=svgPoint(e), dx=(q.x-c.x)/SX(c), dy=(q.y-c.y)/SY(c), a=Math.atan2(dx,-dy)*180/Math.PI; potSet(c,a>135?100:a<-135?0:(a+135)/270*100); }
  var resize=null;
  function startResize(th,e){
    var hn=th.getAttribute('data-h'), nk=th.getAttribute('data-n'), R={hx:/e/.test(hn)?1:/w/.test(hn)?-1:0, hy:/s/.test(hn)?1:/n/.test(hn)?-1:0};
    if(nk){ var st=nodeSt[nk], np=nodePos(nk); R.node=nk; R.pos=np; R.x0=np.x; R.y0=np.y; R.hw0=st.w/2; R.hh0=st.h/2; R.lox=40/st.w; R.hix=600/st.w; R.loy=24/st.h; R.hiy=300/st.h; R.w0=st.w; R.h0=st.h; }
    else { var c=byId(selId); if(!c) return; var ee=ext(c); R.c=c; R.x0=c.x; R.y0=c.y; R.hw0=ee.hw; R.hh0=ee.hh;
      if(isBox(c)){ R.w0=c.d.w; R.h0=c.d.h; R.lox=60/R.w0; R.hix=4000/R.w0; R.loy=40/R.h0; R.hiy=3000/R.h0; }
      else { R.sx0=c.sx||c.scale; R.sy0=c.sy||c.scale; R.lox=10/R.sx0; R.hix=1000/R.sx0; R.loy=10/R.sy0; R.hiy=1000/R.sy0; } }
    if(R.hw0<1) R.hw0=1; if(R.hh0<1) R.hh0=1;
    resize=R; try{ svg.setPointerCapture(e.pointerId); }catch(_){} }
  function doResize(e){
    var R=resize, pt=svgPoint(e), ax=R.x0-R.hx*R.hw0, ay=R.y0-R.hy*R.hh0, fx=1, fy=1;
    if(R.hx) fx=R.hx*(pt.x-ax)/(2*R.hw0);
    if(R.hy) fy=R.hy*(pt.y-ay)/(2*R.hh0);
    if(e.shiftKey){ var f=(R.hx&&R.hy)?Math.max(fx,fy):(R.hx?fx:fy); fx=fy=f; }
    var lox=R.lox, hix=R.hix, loy=R.loy, hiy=R.hiy;
    if(e.shiftKey){ lox=loy=Math.max(lox,loy); hix=hiy=Math.min(hix,hiy); }
    fx=Math.max(lox,Math.min(hix,fx)); fy=Math.max(loy,Math.min(hiy,fy));
    var hw=R.hw0*fx, hh=R.hh0*fy, nx=R.hx?ax+R.hx*hw:R.x0, ny=R.hy?ay+R.hy*hh:R.y0;
    if(R.node){ var st=nodeSt[R.node]; st.w=Math.round(R.w0*fx); st.h=Math.round(R.h0*fy); R.pos.x=nx; R.pos.y=ny; renderWires(); return; }
    var c=R.c;
    if(isBox(c)){ c.d.w=Math.round(R.w0*fx/10)*10||60; c.d.h=Math.round(R.h0*fy/10)*10||40; c.x=nx; c.y=ny; }
    else { c.sx=R.sx0*fx; c.sy=R.sy0*fy; c.scale=Math.max(10,Math.min(1000,Math.round(c.sx))); c.x=nx; c.y=ny; }
    clampPos(c); render(); }
  svg.addEventListener('pointermove',function(e){
    if(cut){ var cm=svgPoint(e); cut.x1=cm.x; cut.y1=cm.y; renderWiresSoon(); return; }
    if(rrDrag){ var rl=links[rrDrag.i], rp=svgPoint(e); if(rl&&rl.rr&&rl.rr[rrDrag.j]){ var rq=rl.rr[rrDrag.j], rch=rq.j?null:linkChain(rl), rsn=wsnap(rp,rch?[rch[rrDrag.j],rch[rrDrag.j+2]]:[],e.altKey), nx=rsn.x, ny=rsn.y;
      if(rq.j){ links.forEach(function(l2){ (l2.rr||[]).forEach(function(r2){ if(r2.j===rq.j){ r2.x=nx; r2.y=ny; } }); }); } else { rq.x=nx; rq.y=ny; } renderWiresSoon(); } return; }
    if(resize){ doResize(e); return; }
    if(potDrag!==null){ var pc=byId(potDrag); if(pc) potFromPointer(pc,e); return; }
    if(pts[e.pointerId]) pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(pinch){ var pk=Object.keys(pts); if(pk.length>=2){ var pa=pts[pk[0]], pb=pts[pk[1]], dd=Math.hypot(pa.x-pb.x,pa.y-pb.y); if(pinch.d>0) setZoom(pinch.z*dd/pinch.d,(pa.x+pb.x)/2,(pa.y+pb.y)/2,true); } return; }
    if(pan){ pan.ex=e.clientX; pan.ey=e.clientY; if(!pan.q){ pan.q=1; var pn=pan; uiRaf(function(){ pn.q=0; if(pan!==pn) return;
        if(pn.k===undefined){ var pr=svg.getBoundingClientRect(); pn.k=pr.width?(W/zoom)/pr.width:1; }
        view.cx=pn.cx-(pn.ex-pn.x)*pn.k; view.cy=pn.cy-(pn.ey-pn.y)*pn.k; applyView(); }); } return; }
    if(linkDrag){ var lp=svgPoint(e); linkDrag.x=lp.x; linkDrag.y=lp.y; renderWiresSoon(); return; }
    if(drag){ dragLast={clientX:e.clientX,clientY:e.clientY}; if(!dragQ) dragQ=uiRaf(function(){ dragQ=0; if(drag&&dragLast) dragMove(dragLast); }); }
  });
  var dragLast=null, dragQ=0;
  function dragMove(e){
    if(drag&&drag.main){ var mp=svgPoint(e); drag.np.x=Math.max(-LIM,Math.min(LIM,snap(mp.x+drag.dx))); drag.np.y=Math.max(-LIM,Math.min(LIM,snap(mp.y+drag.dy))); renderWires(); return; }
    if(!drag) return;
    var c=byId(drag.id); if(!c) return; var pt=svgPoint(e);
    c.x=snap(pt.x+drag.dx); c.y=snap(pt.y+drag.dy); clampPos(c); drag.moved=true;
    if(drag.mem) drag.mem.forEach(function(m){ m.c.x=c.x+m.ox; m.c.y=c.y+m.oy; clampPos(m.c); var gg=layer.querySelector('.ce-comp[data-id="'+m.c.id+'"]'); if(gg) gg.setAttribute('transform','translate('+m.c.x+','+m.c.y+')'); });
    var g=layer.querySelector('.ce-comp[data-id="'+c.id+'"]'); if(g) g.setAttribute('transform','translate('+c.x+','+c.y+')');
    if(isCu(c)){ placeParts(); comps.forEach(function(q){ if(q.in===c.id){ var gp=layer.querySelector('.ce-comp[data-id="'+q.id+'"]'); if(gp) gp.setAttribute('transform','translate('+q.x+','+q.y+')'); } }); }
    renderWires();
  }
  var rwQ=0; function renderWiresSoon(){ if(rwQ) return; rwQ=uiRaf(function(){ rwQ=0; renderWires(); }); }
  function endPointer(){
    resize=null; potDrag=null; setTimeout(function(){ if(window._ceHistSoon) window._ceHistSoon(); },0);
    if(pan){ pan=null; svg.style.cursor=''; }
    if(drag&&dragQ){ uiCaf(dragQ); dragQ=0; if(dragLast) dragMove(dragLast); }
    drag=null;
    if(held!==null){ var c=byId(held); held=null; if(c){ var kd=TYPES[c.type].kind; c.on=false; if(c.d) c.d.down=-1; render(); emit(kd==='keypad'?'keyup':'off',c); } }
  }
  function upPointer(e){
    if(cut){ if(e.type==='pointerup') finishCut(); else { cut=null; renderWires(); } }
    if(rrDrag){ rrDrag=null; linksChanged(); }
    if(linkDrag&&linkDrag.fresh){ linkDrag.fresh=false;
      if(e.type==='pointerup'&&Math.hypot(e.clientX-linkDrag.cx,e.clientY-linkDrag.cy)>8){ var el=document.elementFromPoint(e.clientX,e.clientY), tp=el&&el.closest&&el.closest('.ce-port'); if(tp) finishWire(tp); } }
    delete pts[e.pointerId]; if(Object.keys(pts).length<2) pinch=null; endPointer(); }
  function syncXY(){ var o=null; if(mode!=='edit') return; if(selNode) o=nodePos(selNode); else { var c=byId(selId); if(c) o=c; } if(!o) return;
    [['x',selNode?'cePN_x':'cePX'],['y',selNode?'cePN_y':'cePY']].forEach(function(a){ var f=document.getElementById(a[1]); if(f&&document.activeElement!==f) f.value=Math.round(o[a[0]]*10)/10; }); }
  svg.addEventListener('pointermove',function(){ if(drag||resize) syncXY(); });
  svg.addEventListener('pointerup',syncXY);
  svg.addEventListener('keyup',syncXY);
  svg.addEventListener('pointerup',upPointer);
  svg.addEventListener('pointercancel',upPointer);

  var wMenu=null;
  function hideWMenu(){ if(wMenu) wMenu.style.display='none'; }
  function showWMenu(e,items){
    if(!wMenu){ wMenu=document.createElement('div'); wMenu.className='sx-ctx'; wMenu.setAttribute('role','menu'); wMenu.style.display='none';
      document.body.appendChild(wMenu);
      document.addEventListener('pointerdown',function(ev){ if(wMenu&&!wMenu.contains(ev.target)) hideWMenu(); },true);
      window.addEventListener('blur',hideWMenu); document.addEventListener('keydown',function(ev){ if(ev.key==='Escape') hideWMenu(); },true); }
    wMenu.innerHTML='';
    items.forEach(function(it){ var d=document.createElement('div'); d.textContent=it.t; d.className='sx-ctx-item'; d.setAttribute('role','menuitem');
      d.addEventListener('click',function(){ hideWMenu(); it.fn(); }); wMenu.appendChild(d); });
    wMenu.style.display='block'; wMenu.style.left='0px'; wMenu.style.top='0px';
    var r=wMenu.getBoundingClientRect(), z=(r.width/(wMenu.offsetWidth||1))||1;
    wMenu.style.left=Math.max(4,Math.min(e.clientX,window.innerWidth-r.width-8))/z+'px'; wMenu.style.top=Math.max(4,Math.min(e.clientY,window.innerHeight-r.height-8))/z+'px'; }
  svg.addEventListener('contextmenu',function(e){
    if(mode!=='edit') return;
    if(linkDrag){ e.preventDefault(); linkDrag=null; renderWires(); return; }
    if(e.ctrlKey||e.shiftKey||cut){ e.preventDefault(); return; }
    var td=e.target.closest&&e.target.closest('.ce-rr'), tw=e.target.closest&&e.target.closest('.ce-wire'), el=td||tw; if(!el) return;
    e.preventDefault();
    var wi=parseInt(el.getAttribute('data-i'),10), l=links[wi]; if(!l) return;
    var pt=svgPoint(e), items=[];
    selLink=wi; select(null); selLink=wi; buildProps(); renderWires();
    if(td){ var cj=parseInt(td.getAttribute('data-j'),10); items.push({t:'Remove Corner',fn:function(){ if(l.rr){ l.rr.splice(cj,1); if(!l.rr.length) delete l.rr; linksChanged(); } }}); }
    else { var nr=nearestOnWire(l,pt); if(nr) items.push({t:'Add Corner',fn:function(){ l.rr=l.rr||[]; l.rr.splice(nr.s,0,{x:r1(nr.x),y:r1(nr.y)}); linksChanged(); }}); }
    items.push({t:'Delete Wire',fn:function(){ var k=links.indexOf(l); if(k>=0) links.splice(k,1); selLink=-1; linksChanged(); buildProps(); }});
    showWMenu(e,items); });
  svg.addEventListener('dblclick',function(e){ if(mode!=='edit'||linkDrag) return; var trd=e.target.closest&&e.target.closest('.ce-rr'); if(trd){ var rl=links[parseInt(trd.getAttribute('data-i'),10)]; if(rl&&rl.rr){ rl.rr.splice(parseInt(trd.getAttribute('data-j'),10),1); if(!rl.rr.length) delete rl.rr; linksChanged(); } return; } var tw=e.target.closest&&e.target.closest('.ce-wire'); if(!tw) return; links.splice(parseInt(tw.getAttribute('data-i'),10),1); selLink=-1; linksChanged(); buildProps(); });
  svg.addEventListener('keydown',function(e){
    if(linkDrag){ if(e.key==='Escape'){ e.preventDefault(); linkDrag=null; renderWires(); return; }
      if(e.key==='Backspace'||e.key==='Delete'){ e.preventDefault(); if(linkDrag.pts.length) linkDrag.pts.pop(); renderWires(); return; } }
    if((e.ctrlKey||e.metaKey)&&mode==='edit'){ var kk=String(e.key).toLowerCase();
      if(kk==='c'){ if(copySel()) e.preventDefault(); return; }
      if(kk==='v'){ e.preventDefault(); pasteClip(); return; }
      if(kk==='x'){ if(copySel()){ e.preventDefault(); removeSel(); } return; }
      if(kk==='d'){ e.preventDefault(); dupSel(); return; } }
    if(mode==='edit'&&selLink>=0&&(e.key==='Delete'||e.key==='Backspace')){ e.preventDefault(); links.splice(selLink,1); selLink=-1; linksChanged(); buildProps(); return; }
    if(mode==='edit'&&itemKey(selNode)&&(e.key==='Delete'||e.key==='Backspace')){ e.preventDefault(); removeItem(selNode); return; }
    if(mode!=='edit' || selId===null) return;
    var c=byId(selId); if(!c) return;
    if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); removeSel(); return; }
    var st=e.shiftKey?20:(snapOn?GRID:1), mv={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
    if(mv){ e.preventDefault(); var mem=members(c), ox=c.x, oy=c.y; c.x+=mv[0]; c.y+=mv[1]; clampPos(c);
      var ddx=c.x-ox, ddy=c.y-oy; mem.forEach(function(m){ m.x+=ddx; m.y+=ddy; clampPos(m); }); render(); }
  });

  var bEdit=document.getElementById('ceModeEdit'), bTest=document.getElementById('ceModeTest'), bUse=document.getElementById('ceModeUse');
  var viewMode='test';
  var useBg={color:'#14161a',img:''};
  var USE_IMG_RE=/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  function cleanUseBg(o){ var r={color:'#14161a',img:''}; if(o&&typeof o==='object'){ if(/^#[0-9a-f]{6}$/i.test(o.color)) r.color=o.color.toLowerCase(); if(typeof o.img==='string'&&USE_IMG_RE.test(o.img)) r.img=o.img; } return r; }
  var bgCI=document.getElementById('ceUseBgColor');
  if(bgCI){ bgCI.addEventListener('input',function(){ if(/^#[0-9a-f]{6}$/i.test(bgCI.value)){ useBg.color=bgCI.value.toLowerCase(); applyUseBg(); } }); bgCI.addEventListener('change',function(){ try{ if(window._ceHistNow) window._ceHistNow(); }catch(_){} }); }
  function applyUseBg(){
    if(bgCI){ bgCI.style.display=(mode==='use')?'':'none'; if(bgCI.value!==useBg.color) bgCI.value=useBg.color; }
    var bg=document.getElementById('ceBg'), im=document.getElementById('ceBgImg');
    if(mode==='use'){
      if(bg) bg.setAttribute('fill',useBg.color);
      svg.style.background=useBg.color;
      if(!im&&bg){ im=document.createElementNS('http://www.w3.org/2000/svg','image'); im.setAttribute('id','ceBgImg'); im.setAttribute('preserveAspectRatio','xMidYMid slice'); im.setAttribute('pointer-events','none'); bg.parentNode.insertBefore(im,bg.nextSibling); }
      if(im){ if(useBg.img){ if(im.getAttribute('href')!==useBg.img) im.setAttribute('href',useBg.img); im.style.display=''; } else { im.removeAttribute('href'); im.style.display='none'; } }
    } else {
      if(bg) bg.setAttribute('fill','url(#ceGrid)');
      svg.style.background='';
      if(im){ im.removeAttribute('href'); im.style.display='none'; }
    }
    applyView();
  }
  var bViewSel=document.getElementById('ceViewSel');
  function syncViewSel(){ if(!bViewSel) return; var ed=(mode==='edit'); bViewSel.disabled=ed; bViewSel.checked=!ed&&mode===viewMode; var l=document.getElementById('ceViewLbl'); if(l){ l.style.opacity=ed?'0.4':''; l.style.cursor=ed?'default':'pointer'; } }
  if(bViewSel) bViewSel.addEventListener('change',function(){ if(mode==='edit'){ syncViewSel(); return; } viewMode=bViewSel.checked?mode:(mode==='use'?'test':'use'); syncViewSel(); try{ if(window._ceHistNow) window._ceHistNow(); }catch(_){} });
  function setMode(m){
    mode=(m==='test')?'test':(m==='use')?'use':'edit';
    syncViewSel();
    bEdit.className='vbtn '+(mode==='edit'?'btn-accent':'btn-gray'); bTest.className='vbtn '+(mode==='test'?'btn-accent':'btn-gray'); if(bUse) bUse.className='vbtn '+(mode==='use'?'btn-accent':'btn-gray');
    svg.classList.toggle('ce-test',mode!=='edit'); svg.classList.toggle('ce-use',mode==='use');
    palette.style.opacity=mode==='edit'?'':'0.4'; palette.style.pointerEvents=mode==='edit'?'':'none';
    if(mode==='edit') closeUsePop();
    if(mode==='edit') toneStopAll();
    drag=null; held=null; linkDrag=null; cut=null; rrDrag=null; selLink=-1; selNode=null; applyUseBg(); render(); renderWires(); buildProps();
  }
  var usePop=null, useDown=null;
  function closeUsePop(){ if(usePop){ if(usePop.parentNode) usePop.parentNode.removeChild(usePop); usePop=null; document.removeEventListener('pointerdown',popOutside,true); } }
  function popOutside(e){ if(usePop&&!usePop.contains(e.target)) closeUsePop(); }
  function loadBgImage(file){
    if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){ if(file) window.alert('Use a PNG, JPEG, WebP or GIF image.'); return; }
    var fr=new FileReader(); fr.onload=function(){ var im=new Image(); im.onload=function(){
      var nw=im.naturalWidth||im.width, nh=im.naturalHeight||im.height, sc=Math.min(1,1600/Math.max(nw,nh)), cw=Math.max(1,Math.round(nw*sc)), ch=Math.max(1,Math.round(nh*sc));
      var cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; cv.getContext('2d').drawImage(im,0,0,cw,ch);
      var out=cv.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',0.86);
      if(USE_IMG_RE.test(out)){ useBg.img=out; applyUseBg(); try{ if(window._ceHistNow) window._ceHistNow(); }catch(_){} } };
      im.onerror=function(){ window.alert('That image could not be loaded.'); }; im.src=String(fr.result); };
    fr.readAsDataURL(file); }
  function openUsePop(cx,cy){
    closeUsePop();
    var p=document.createElement('div'); p.id='ceUseBgPop';
    p.innerHTML='<div class="ubr"><button type="button" class="vbtn btn-gray" id="ceUseBgImgBtn" style="font-size:10px;padding:3px 8px;letter-spacing:1px">IMAGE...</button><button type="button" class="vbtn btn-gray" id="ceUseBgImgClr" style="font-size:10px;padding:3px 8px;letter-spacing:1px"'+(useBg.img?'':' disabled')+'>REMOVE</button></div>'+
      '<input type="file" id="ceUseBgFile" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none">';
    document.body.appendChild(p); usePop=p;
    var r=p.getBoundingClientRect(); p.style.left=Math.max(6,Math.min(cx,window.innerWidth-r.width-6))+'px'; p.style.top=Math.max(6,Math.min(cy,window.innerHeight-r.height-6))+'px';
    var fb=p.querySelector('#ceUseBgImgBtn'), cb=p.querySelector('#ceUseBgImgClr'), fi=p.querySelector('#ceUseBgFile');
    fb.addEventListener('click',function(){ fi.click(); });
    fi.addEventListener('change',function(){ loadBgImage(fi.files&&fi.files[0]); closeUsePop(); });
    cb.addEventListener('click',function(){ useBg.img=''; applyUseBg(); try{ if(window._ceHistNow) window._ceHistNow(); }catch(_){} closeUsePop(); });
    setTimeout(function(){ document.addEventListener('pointerdown',popOutside,true); },0);
  }
  svg.addEventListener('pointerdown',function(e){ useDown=(mode==='use'&&e.button===0)?{x:e.clientX,y:e.clientY,bg:!(e.target.closest&&e.target.closest('.ce-comp'))}:null; },true);
  svg.addEventListener('click',function(e){ if(mode!=='use'||!useDown) return; var d=useDown; useDown=null; if(!d.bg||Math.hypot(e.clientX-d.x,e.clientY-d.y)>4) return; openUsePop(e.clientX+8,e.clientY+8); });
  window._ceViewMode=function(){ return viewMode; };
  bEdit.addEventListener('click',function(){ setMode('edit'); });
  bTest.addEventListener('click',function(){ setMode('test'); });
  if(bUse) bUse.addEventListener('click',function(){ setMode('use'); });
  function ceConfirmClear(onYes){
    var n=comps.length, nb=boxes().length, ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
    ov.innerHTML='<div class="ds-pop" style="background:var(--card);border:1px solid #555;border-radius:8px;padding:16px 18px;width:min(340px,90vw);color:var(--x-ddd,#ddd);font:13px/1.45 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)">'+
      '<div style="color:var(--x-ddd,#ddd);font-weight:600;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);text-transform:uppercase">Clear all controls?</div>'+
      '<div style="margin-bottom:14px">This will remove all '+n+' component'+(n===1?'':'s')+(nb?' (including '+nb+' controller box'+(nb===1?'':'es')+' and their scripts)':'')+' and every wire. This cannot be undone.</div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="vbtn btn-gray" data-a="no">CANCEL</button><button type="button" class="vbtn btn-red" data-a="yes">CLEAR ALL</button></div></div>';
    function close(){ document.removeEventListener('keydown',onKey,true); if(ov.parentNode) ov.parentNode.removeChild(ov); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
    ov.addEventListener('click',function(e){ var a=e.target.getAttribute&&e.target.getAttribute('data-a'); if(a==='yes'){ close(); onYes(); } else if(a==='no'||e.target===ov) close(); });
    document.addEventListener('keydown',onKey,true);
    document.body.appendChild(ov);
  }
  function clearAllComps(){
    drag=null; held=null; linkDrag=null; selId=null; selLink=-1; selNode=null; comps=[]; links=[];
    try{ render(); }catch(err){ console.error(err); }
    try{ renderWires(); }catch(err){ console.error(err); }
    try{ buildProps(); }catch(err){ console.error(err); }
    try{ layer.innerHTML=''; if(hint) hint.style.display=''; }catch(_){}
    try{ if(window._feLinksChanged) window._feLinksChanged(); }catch(_){}
    try{ if(window._feShow && window._getControllerEditorMode && window._getControllerEditorMode()==='functional') window._feShow(); }catch(_){}
  }
  document.getElementById('ceClear').addEventListener('click',function(){
    if(!comps.length) return;
    ceConfirmClear(clearAllComps);
  });

  window._getControllerEditorData=function(skipFn){
    return {v:1,nextId:nextId,customDefs:customDefs.map(cuOut),nextDef:nextDef,links:links.map(function(l){ var o={t:l.t,f:l.f,to:l.to}; if(l.t==='p'){ o.fp=l.fp; o.tp=l.tp; } if(l.rr&&l.rr.length) o.rr=l.rr.map(function(r){ return r.j?{x:r.x,y:r.y,j:r.j}:{x:r.x,y:r.y}; }); if(HEXRE.test(l.color)) o.color=l.color; if(l.label) o.label=String(l.label); if(l.showLabel) o.showLabel=true; return o; }),src:{x:srcPos.x,y:srcPos.y},siren:{x:sirenPos.x,y:sirenPos.y},srcStyle:JSON.parse(JSON.stringify(nodeSt.source)),sirenStyle:JSON.parse(JSON.stringify(nodeSt.siren)),blower:{x:blowerPos.x,y:blowerPos.y},damper:{x:damperPos.x,y:damperPos.y},rotator:{x:rotatorPos.x,y:rotatorPos.y},rotatorStyle:JSON.parse(JSON.stringify(nodeSt.rotator)),blowerStyle:JSON.parse(JSON.stringify(nodeSt.blower)),damperStyle:JSON.parse(JSON.stringify(nodeSt.damper)),useBg:{color:useBg.color,img:useBg.img},viewUse:(viewMode==='use'),fn:((!skipFn&&typeof window._getFnData==='function')?window._getFnData():undefined),comps:comps.map(function(c){ return {id:c.id,type:c.type,x:c.x,y:c.y,scale:c.scale,sx:c.sx,sy:c.sy,label:c.label,lfont:c.lfont||'',lsize:c.lsize||10,lbold:!!c.lbold,hideLabel:!!c.hideLabel,hideText:!!c.hideText,lcolor:c.lcolor||'',tcolor:c.tcolor||'',color:c.color,on:!!c.on,latch:!!c.latch,in:c.in||undefined,pid:c.in?c.pid:undefined,ox:c.in?c.ox:undefined,oy:c.in?c.oy:undefined,bs:c.in?c.bs:undefined,img:c.img?JSON.parse(JSON.stringify(c.img)):undefined,d:c.d?(function(o){ var q=JSON.parse(JSON.stringify(o)); delete q.down; return q; })(c.d):undefined,seqs:(c.type==='midi')?(ensureSeqs(c),JSON.parse(JSON.stringify(c.seqs))):undefined,sq:(c.type==='midi')?c.sq:undefined,sides:cleanSides(c.sides)}; })};
  };
  window._setControllerEditorData=function(d,opts){
    opts=opts||{};
    if(!d || !Array.isArray(d.comps)) return;
    customDefs=[]; (Array.isArray(d.customDefs)?d.customDefs.slice(0,50):[]).forEach(function(r){ var x=cleanDef(r); if(x&&!defById(x.id)) customDefs.push(x); });
    nextDef=Math.max(+d.nextDef||1,customDefs.reduce(function(m,x){ return Math.max(m,x.id+1); },1)); buildPalette();
    comps=d.comps.filter(function(c){ return c && TYPES[c.type] && (c.type!=='custom'||(c.d&&defById(c.d.def))); }).map(function(c,i){
      return {id:isFinite(c.id)?c.id:i+1,type:c.type,x:+c.x||0,y:+c.y||0,scale:Math.max(10,Math.min(2000,+c.scale||100)),sx:c.sx?Math.max(10,Math.min(2000,+c.sx)):undefined,sy:c.sy?Math.max(10,Math.min(2000,+c.sy)):undefined,label:String(c.label==null?'':c.label),lfont:TEXT_FONTS.some(function(o){return o[0]===c.lfont;})?c.lfont:'',lsize:Math.max(6,Math.min(48,+c.lsize||10)),lbold:!!c.lbold,hideLabel:!!c.hideLabel,hideText:!!c.hideText,lcolor:HEXRE.test(c.lcolor)?c.lcolor:'',tcolor:HEXRE.test(c.tcolor)?c.tcolor:'',color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:TYPES[c.type].color,on:(function(){ var _k=TYPES[c.type].kind;   
        if(_k==='selector') return (parseInt(c.d&&c.d.pos,10)||0)>0;
        if(opts.noHist) return false;
        if(_k==='latch') return !!c.on;
        if(_k==='button') return !!c.latch&&!!c.on;
        return false; })(),latch:!!c.latch&&TYPES[c.type].kind==='button',d:TYPES[c.type].init?cleanD(TYPES[c.type],c.d):null,img:cleanImg(c.img),in:(c.in>0&&c.type!=='box'&&c.type!=='custom')?Math.round(+c.in):undefined,pid:Math.round(+c.pid)||undefined,ox:+c.ox||0,oy:+c.oy||0,bs:Math.max(10,Math.min(1000,+c.bs||100)),seqs:(c.type==='midi')?((Array.isArray(c.seqs)&&c.seqs.length)?c.seqs.slice(0,MAX_SEQS).map(cleanSeq):[cleanSeq(c.seq)]):undefined,sq:(c.type==='midi')?(Math.round(+c.sq)||0):undefined,sides:cleanSides(c.sides)};
    });
    comps.forEach(function(c){ if(c.type==='midi') ensureSeqs(c); });
    comps.forEach(clampPos);
    (function(){ var seen={main:1}; ctls().forEach(function(b){ var base=(String(b.d.name||'').trim()||'Controller').slice(0,24), n=base, i=2; while(seen[n.toLowerCase()]){ var suf=' '+(i++); n=base.slice(0,24-suf.length); n+=suf; } seen[n.toLowerCase()]=1; b.d.name=n; }); })();
    nextId=Math.max(+d.nextId||1,comps.reduce(function(m,c){return Math.max(m,c.id+1);},1));
    (function(){ nodeSt.siren=cleanNodeSt('siren',d.sirenStyle); var ss=d.sirenStyle||{};
      nodeSt.blower=cleanNodeSt('blower',d.blowerStyle||(ss.blower===true?{on:true,bMin:ss.bMin,bMax:ss.bMax}:null)); nodeSt.damper=cleanNodeSt('damper',d.damperStyle); nodeSt.rotator=cleanNodeSt('rotator',d.rotatorStyle);
      var rawL=Array.isArray(d.links)?d.links.map(function(l){ if(!l) return l;
        if(l.t==='p'&&l.to==='siren'&&l.tp==='bin'){ nodeSt.blower.on=true; return Object.assign({},l,{to:'blower'}); }
        if(l.t==='k'&&l.to==='siren'){ if(!d.damperStyle) nodeSt.damper.on=true; return Object.assign({},l,{to:'damper'}); } return l; }):null;
      var ok={source:1,siren:1,blower:1,damper:1,rotator:1}; ctls().forEach(function(b){ ok[boxKey(b)]=1; }); comps.forEach(function(m){ if(isMidi(m)) ok[boxKey(m)]=1; }); links=[];
      if(rawL) rawL.slice(0,2000).forEach(function(l){ if(!l||(l.t!=='v'&&l.t!=='d'&&l.t!=='k'&&l.t!=='p')||(l.t==='p'&&!(/^(out|po\d+)$/.test(l.fp)&&/^(in|bin|pi\d+|dg\d+)$/.test(l.tp)))||!ok[l.f]||!ok[l.to]||l.f===l.to||!hasPort(l.f,lkPorts(l)[0])||!hasPort(l.to,lkPorts(l)[1])) return;
        if(l.t==='v') links=links.filter(function(x){ return !(x.t==='v'&&x.to===l.to); });
        else if(l.t==='p') links=links.filter(function(x){ return !(x.t==='p'&&x.to===l.to&&x.tp===l.tp); });
        else if(l.t==='k'){ if(links.some(function(x){ return x.t==='k'&&x.f===l.f&&x.to===l.to; })) return; }
        else if(links.some(function(x){ return x.t==='d'&&((x.f===l.f&&x.to===l.to)||(x.f===l.to&&x.to===l.f)); })) return;
        var nl={t:l.t,f:l.f,to:l.to}; if(l.t==='p'){ nl.fp=l.fp; nl.tp=l.tp; } if(Array.isArray(l.rr)) nl.rr=l.rr.slice(0,40).filter(function(r){ return r&&isFinite(r.x)&&isFinite(r.y); }).map(function(r){ return isFinite(r.j)&&r.j?{x:+r.x,y:+r.y,j:+r.j}:{x:+r.x,y:+r.y}; }); if(HEXRE.test(l.color)) nl.color=l.color; if(typeof l.label==='string'&&l.label) nl.label=l.label.slice(0,24); if(l.showLabel) nl.showLabel=true; links.push(nl); });
      function cp(o,df){ return (o&&isFinite(+o.x)&&isFinite(+o.y))?{x:Math.max(-LIM,Math.min(LIM,+o.x)),y:Math.max(-LIM,Math.min(LIM,+o.y))}:df; }
      srcPos=cp(d.src,{x:62,y:40}); sirenPos=cp(d.siren,{x:538,y:40}); blowerPos=cp(d.blower,{x:538,y:110}); damperPos=cp(d.damper,{x:538,y:180}); rotatorPos=cp(d.rotator,{x:538,y:250}); nodeSt.source=cleanNodeSt('source',d.srcStyle); nodeSt.siren=cleanNodeSt('siren',d.sirenStyle); syncItemSections();})();
    useBg=cleanUseBg(d.useBg); var _lv=(!opts.undoable&&!opts.noHist); if(!opts.undoable&&!opts.noHist){ viewMode=d.viewUse?'use':'test'; if(mode!=='edit'&&mode!==viewMode){ setMode(viewMode); } syncViewSel(); }
    applyUseBg();
    selId=null; render(); buildProps(); if(!opts.noFit){ try{ fitView(); }catch(_){} }
    if(_lv){ try{ liveApply(); }catch(_){} }
    if(!opts.noFn&&typeof window._setFnData==='function') window._setFnData(d.fn);
    if(!opts.noHist){ var _onIds=comps.filter(function(c){ var k=TYPES[c.type].kind; return c.on&&(k==='latch'||(k==='button'&&c.latch)); }).map(function(c){ return c.id; });
      if(_onIds.length) setTimeout(function(){ _onIds.forEach(function(id){ var c=byId(id); if(c&&c.on) emit('on',c); }); },0); }
    if(opts.undoable){ if(window._ceHistNow) window._ceHistNow(); } else if(!opts.noHist&&window._ceHistReset) window._ceHistReset();
  };
  render();
  var zoom=1;
  function applyView(){
    var vw=W/zoom, vh=H/zoom, x=view.cx-vw/2, y=view.cy-vh/2;
    svg.setAttribute('viewBox',x+' '+y+' '+vw+' '+vh);
    var bg=document.getElementById('ceBg'); if(bg){ bg.setAttribute('x',x); bg.setAttribute('y',y); bg.setAttribute('width',vw); bg.setAttribute('height',vh); }
    var bgi=document.getElementById('ceBgImg'); if(bgi){ bgi.setAttribute('x',x); bgi.setAttribute('y',y); bgi.setAttribute('width',vw); bgi.setAttribute('height',vh); }
    if(hint){ hint.setAttribute('x',view.cx); hint.setAttribute('y',view.cy+4); hint.setAttribute('font-size',13/zoom); }
    var t=Math.round(zoom*100)+'%', nw=performance.now(); if(t!==applyView._t||nw-(applyView._n||0)>1000){ applyView._t=t; applyView._n=nw; Array.prototype.forEach.call(document.querySelectorAll('[data-ce-zoom-label]'),function(el){ el.textContent=t; }); }
  }
  function setZoom(z,cx,cy,raw){
    var r0=svg.getBoundingClientRect();
    if(cx==null){ cx=r0.left+r0.width/2; cy=r0.top+r0.height/2; }
    var p=svgPoint({clientX:cx,clientY:cy});
    zoom=Math.max(0.1,Math.min(4,z));
    applyView();
    var q=svgPoint({clientX:cx,clientY:cy}); view.cx+=p.x-q.x; view.cy+=p.y-q.y; applyView();
    if(mode==='edit'&&(selId!==null||selNode)) render();
  }
  function fitView(){
    var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    function add(x,y,hw,hh){ x0=Math.min(x0,x-hw); x1=Math.max(x1,x+hw); y0=Math.min(y0,y-hh); y1=Math.max(y1,y+hh+16); }
    comps.forEach(function(c){ var e=ext(c); add(c.x,c.y,e.hw,e.hh); });
    if(mode!=='use'){ add(srcPos.x,srcPos.y,nodeSt.source.w/2,nodeSt.source.h/2); add(sirenPos.x,sirenPos.y,nodeSt.siren.w/2,nodeSt.siren.h/2); } if(mode!=='use'&&nodeSt.blower.on) add(blowerPos.x,blowerPos.y,nodeSt.blower.w/2,nodeSt.blower.h/2); if(mode!=='use'&&nodeSt.damper.on) add(damperPos.x,damperPos.y,nodeSt.damper.w/2,nodeSt.damper.h/2); if(mode!=='use'&&nodeSt.rotator.on) add(rotatorPos.x,rotatorPos.y,nodeSt.rotator.w/2,nodeSt.rotator.h/2);
    if(x0>=1e8){ view.cx=W/2; view.cy=H/2; zoom=1; applyView(); return; }
    if(x0>=0&&y0>=0&&x1<=W&&y1<=H){ view.cx=W/2; view.cy=H/2; zoom=1; applyView(); return; }
    var bw=Math.max(40,x1-x0)+40, bh=Math.max(40,y1-y0)+40;
    zoom=Math.max(0.1,Math.min(1,W/bw,H/bh)); view.cx=(x0+x1)/2; view.cy=(y0+y1)/2; applyView();
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest?e.target:null; if(!t) return;
    if(t.closest('#ceTbDup')){ dupSel(); return; }
    if(t.closest('#ceTbCopy')){ copySel(); return; }
    if(t.closest('#ceTbPaste')){ pasteClip(); return; }
    if(t.closest('#ceTbDel')){ removeSel(); return; }
    var b=e.target.closest&&e.target.closest('[data-ce-zoom]'); if(!b) return;
    var a=b.getAttribute('data-ce-zoom'); if(a==='in') setZoom(zoom*1.25); else if(a==='out') setZoom(zoom/1.25); else fitView();
  });
  svg.addEventListener('wheel',function(e){
    if(e.ctrlKey||e.metaKey){ e.preventDefault(); var d=Math.max(-30,Math.min(30,e.deltaY)); setZoom(zoom*Math.exp(-d*0.01),e.clientX,e.clientY,true); return; }
    if(!svg.closest('#ctrlEditorOverlay')) return;
    e.preventDefault(); var r=svg.getBoundingClientRect(), k=r.width?(W/zoom)/r.width:1;
    view.cx+=(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*k; view.cy+=(e.shiftKey&&!e.deltaX?0:e.deltaY)*k; applyView();
  },{passive:false});
  applyView();
  window._ceSetZoom=setZoom;

  var hist={u:[],r:[],cur:null,t:null,busy:false};
  function hSnap(){ var d=window._getControllerEditorData(false); d.comps.forEach(function(c){ c.on=false; }); return JSON.stringify(d); }
  function hSync(){ var u=document.getElementById('btnCtlUndo'), r=document.getElementById('btnCtlRedo'); if(u) u.disabled=!hist.u.length; if(r) r.disabled=!hist.r.length; }
  function hReset(){ clearTimeout(hist.t); hist.u=[]; hist.r=[]; try{ hist.cur=hSnap(); }catch(_){ hist.cur=null; } hSync(); }
  function hCommit(){
    clearTimeout(hist.t); if(hist.busy) return;
    if(drag||resize||pan||linkDrag||held!==null){ hist.t=setTimeout(hCommit,250); return; }
    var s; try{ s=hSnap(); }catch(_){ return; }
    if(hist.cur===null){ hist.cur=s; return; }
    if(s===hist.cur) return;
    hist.u.push(hist.cur); if(hist.u.length>80) hist.u.shift();
    var tot=0, i; for(i=hist.u.length-1;i>=0;i--){ tot+=hist.u[i].length; if(tot>40e6){ hist.u=hist.u.slice(i+1); break; } }
    hist.r=[]; hist.cur=s; hSync(); }
  function hSoon(){ if(hist.busy) return; clearTimeout(hist.t); hist.t=setTimeout(hCommit,350); }
  function hRestore(snap){
    hist.busy=true;
    try{ var d=JSON.parse(snap), curFn=''; try{ curFn=JSON.stringify(window._getFnData()); }catch(_){}
      var needFn=JSON.stringify(d.fn)!==curFn;
      window._setControllerEditorData(d,{noFn:!needFn,noFit:true,noHist:true}); }
    finally{ hist.busy=false; }
    try{ hist.cur=hSnap(); }catch(_){}
    hSync(); }
  function hUndo(){ hCommit(); if(!hist.u.length) return; hist.r.push(hist.cur); hRestore(hist.u.pop()); hSync(); }
  function hRedo(){ hCommit(); if(!hist.r.length) return; hist.u.push(hist.cur); hRestore(hist.r.pop()); hSync(); }
  (function(){ var ov0=document.getElementById('ctrlEditorOverlay'); if(!ov0) return;
    ['pointerup','change','input','keyup'].forEach(function(ev){ ov0.addEventListener(ev,function(e){ if(e.target&&e.target.closest&&e.target.closest('#btnCtlUndo,#btnCtlRedo')) return; hSoon(); },true); }); })();
  window._ceHistSoon=hSoon; window._ceHistNow=hCommit; window._ceHistReset=hReset; window._ceUndo=hUndo; window._ceRedo=hRedo;
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#btnCtlUndo,#btnCtlRedo'); if(!b||b.disabled) return; if(b.id==='btnCtlUndo') hUndo(); else hRedo(); });
  document.addEventListener('keydown',function(e){
    var ov=document.getElementById('ctrlEditorOverlay'); if(!ov||ov.style.display==='none') return;
    if(!(e.ctrlKey||e.metaKey)) return;
    var t=e.target, tag=t&&t.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
    var k=String(e.key).toLowerCase();
    if(k==='z'&&!e.shiftKey){ e.preventDefault(); hUndo(); }
    else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); hRedo(); }
  },true);
  setTimeout(hReset,0);
  window._ceApi={
    list:function(key){ if(typeof key==='string'&&key.charAt(0)==='d'){ var tdf=defById(+key.slice(1)); if(tdf) return tdf.parts.map(function(q){ return {id:q.pid,type:q.type,tname:TYPES[q.type].name,kind:TYPES[q.type].kind,label:q.label||TYPES[q.type].name,owner:key}; }); }
      return comps.filter(function(c){ return key===undefined||ownerKey(c)===key; }).map(function(c){ return {id:c.id,type:c.type,tname:TYPES[c.type].name,kind:TYPES[c.type].kind,label:isBox(c)?String(c.d.name||''):(c.label||TYPES[c.type].name),owner:ownerKey(c)}; }); },
    owner:function(id){ var c=byId(+id); return c?ownerKey(c):null; },
    outDot:function(key){ key=String(key); if(key.charAt(0)==='d'){ var tdf=defById(+key.slice(1)); return !!(tdf&&tdf.nodes.out); } var c=byId(parseInt(key.slice(1),10)); if(!c||isBox(c)||!isCu(c)) return false; var df=cdef(c); return !!(df&&df.nodes.out); },
    sourceV:function(){ return srcVal(); },
    links:function(){ return links.map(function(l){ return l.t==='p'?{t:l.t,f:l.f,to:l.to,fp:l.fp,tp:l.tp}:{t:l.t,f:l.f,to:l.to}; }); },
    pinCounts:function(key){ var c=byId(parseInt(String(key).slice(1),10)); return (c&&isBox(c))?{i:pinN(c,'inPins'),o:pinN(c,'outPins')}:null; },
    pinIn:function(key,n){ var c=byId(parseInt(String(key).slice(1),10)); n=Math.round(+n); if(!c||!isBox(c)||!(n>=1&&n<=pinN(c,'inPins'))) return null; var g=pinCfgOf(c.d,n), v=0;
      links.forEach(function(l){ if(l.t==='p'&&l.to===key&&l.tp==='pi'+n) v=linkV(l); }); return {v:v,m:g.m,hv:g.hv}; },
    midiName:function(key){ key=String(key); if(key.charAt(0)!=='b') return ''; var c=byId(+key.slice(1)); return (c&&isMidi(c))?(String(c.d.name||'').trim()||'MIDI'):''; },
    midi:{ list:function(){ return midis().map(function(c){ return {id:c.id,name:String(c.d.name||'').trim()||('MIDI '+c.id)}; }); },
      get:function(id){ var c=byId(+id); return (c&&isMidi(c))?c:null; },
      ensure:function(id){ var c=byId(+id); if(!c||!isMidi(c)) return null; return ensureSeqs(c); },
      vin:function(id){ var k='b'+id, v=0; links.forEach(function(l){ if(isInLink(l,k)) v=linkV(l); }); return v; },
      wired:function(id){ var k='b'+id; return links.some(function(l){ return l.t==='k'&&l.f===k&&l.to==='damper'; }); },
      playing:function(id,on){ var c=byId(+id); if(c&&isMidi(c)&&!!c.playing!==!!on){ c.playing=!!on; renderSoon(c); } },
      changed:function(){ if(window._ceHistSoon) window._ceHistSoon(); } },
    damperGate:function(key){ var c=null; ctls().forEach(function(b){ if(boxKey(b)===key) c=b; }); if(!c) return true;
      var df=isBox(c)?null:cdef(c), has=isBox(c)?!!c.d.dampOut:!!(df&&df.nodes.damp); if(!has) return true;
      return links.some(function(l){ return l.t==='k'&&l.f===key&&l.to==='damper'; }); },
    flash:function(a,b){ window._ceFlash(a,b); },
    refresh:function(){ window._ceWiresRefresh(); },
    boxes:function(){ var o=ctls().map(function(b){ var bx=isBox(b), df=bx?null:cdef(b); return {key:boxKey(b),id:b.id,name:String(b.d.name||''),ant:bx&&!!b.d.antenna,vmin:bx?ratedLo(b):(df?Math.min(+df.vmin,+df.vmax):0),vmax:bx?ratedHi(b):(df?Math.max(+df.vmin,+df.vmax):0),sp:!bx&&selfPowered(b),cu:!bx,own:bx?'':ownerKey(b)}; });
      customDefs.forEach(function(df){ o.push({key:'d'+df.id,id:df.id,name:df.name+' (template)',ant:false,vmin:0,vmax:0,tpl:true,cu:true}); }); return o; },
    mapIds:function(f,t){ var th=byId(+String(t).slice(1)); if(!th||!isCu(th)) return null;
      function find(pid){ for(var i=0;i<comps.length;i++) if(comps[i].in===th.id&&comps[i].pid===pid) return comps[i]; return null; }
      if(String(f).charAt(0)==='d') return function(v){ var q=find(+v); return q?q.id:''; };
      var fh=+String(f).slice(1); return function(v){ var sc=byId(+v); if(!sc||sc.in!==fh) return ''; var q=find(sc.pid); return q?q.id:''; }; },
    cuList:function(key){ return comps.filter(function(c){ return isCu(c)&&ownerKey(c)===key; }).map(function(c){ return {key:boxKey(c),id:c.id,name:String(c.d.name||''),def:+c.d.def}; }); },
    get:function(id){ var c=byId(id); return c?{on:!!c.on,type:c.type,pos:(c.type==='selector'?selPos(c)+1:0),val:(c.type==='pot'?potVal(c):0)}:null; },
    tone:function(id,hz){ var c=byId(id); if(c&&c.type==='buzzer') toneStart(c,hz); },
    toneOff:function(id){ var c=byId(id); if(c&&c.type==='buzzer') toneStop(c); },
    silence:function(key){ comps.forEach(function(c){ if(c.type==='buzzer'&&ownerKey(c)===key) toneStop(c); }); },
    setPct:function(id,p){ var c=byId(id); if(c&&c.type==='pot'){ apiR=true; try{ potSet(c,+p||0); }finally{ apiR=false; } } },
    setPos:function(id,p){ var c=byId(id); if(c&&c.type==='selector'){ apiR=true; try{ selSet(c,Math.round(+p)-1); }finally{ apiR=false; } } },
    setOnEmit:function(id,v){ var c=byId(id); if(!c) return; var k=TYPES[c.type].kind; if(k!=='latch'&&k!=='button') return; var was=!!c.on; c.on=!!v; if(c.on!==was) renderSoon(c); if(c.on!==was) emit(c.on?'on':'off',c); },
    snap:function(id){ var c=byId(id); return c?{on:!!c.on,pos:(c.type==='selector'?selPos(c)+1:0),pct:(c.type==='pot'?(+c.d.v||0):0)}:null; },
    setOn:function(id,v){ var c=byId(id); if(c&&(TYPES[c.type].kind==='latch'||TYPES[c.type].kind==='button'||TYPES[c.type].kind==='light')){ if(!!c.on===!!v) return; c.on=!!v; renderSoon(c); } },
    setD:function(id,k,v){ var c=byId(id); if(c&&c.d&&Object.prototype.hasOwnProperty.call(c.d,k)&&typeof c.d[k]===typeof v){ if(c.d[k]===v) return; c.d[k]=v; clampPos(c); renderSoon((isBox(c)||isCu(c))?null:c); } },
    setColor:function(id,h){ var c=byId(id); if(c&&/^#[0-9a-f]{6}$/i.test(h)){ if(c.color===h) return; c.color=h; renderSoon(c); } }
  };
  var LIVE_KEY='sirenosc_ce_live', liveApplied=false, liveUser=false, liveLast='';
  function liveSig(){ return comps.map(function(c){ return c.id+':'+c.type; }).join('|'); }
  function liveSave(force){
    try{
      if(!comps.length) return;
      if(!(liveApplied||liveUser||performance.now()>45000||force)) return;
      var o={sig:liveSig(),view:{cx:view.cx,cy:view.cy,zoom:zoom},items:comps.map(function(c){ var q=c.d?JSON.parse(JSON.stringify(c.d)):null; if(q) delete q.down; return {id:c.id,on:!!c.on,d:q}; })};
      var j=JSON.stringify(o); if(j===liveLast) return; liveLast=j; localStorage.setItem(LIVE_KEY,j);
    }catch(_){}
  }
  function liveApply(){
    if(liveApplied) return;
    if(performance.now()>60000){ liveApplied=true; return; }
    var o=null; try{ o=JSON.parse(localStorage.getItem(LIVE_KEY)||'null'); }catch(_){ o=null; }
    if(!o||o.sig!==liveSig()) return;
    liveApplied=true;
    var byid={}; (o.items||[]).forEach(function(it){ if(it) byid[it.id]=it; });
    comps.forEach(function(c){ var it=byid[c.id]; if(!it) return; var T=TYPES[c.type], k=T&&T.kind;
      if(k==='latch'||k==='light'||(k==='button'&&c.latch)) c.on=!!it.on;
      if(T&&T.init&&it.d) c.d=cleanD(T,it.d); });
    var v=o.view; if(v&&isFinite(v.cx)&&isFinite(v.cy)&&isFinite(v.zoom)){ view.cx=+v.cx; view.cy=+v.cy; zoom=Math.max(0.1,Math.min(4,+v.zoom)); }
    render(); applyView(); try{ renderWires(); }catch(_){}
  }
  window._ceLiveApply=liveApply;
  svg.addEventListener('pointerdown',function(){ liveUser=true; },true);
  setInterval(liveSave,3000);
  window.addEventListener('pagehide',function(){ liveSave(); });
  window.addEventListener('beforeunload',function(){ liveSave(); });
  document.addEventListener('visibilitychange',function(){ if(document.hidden) liveSave(); });
  window._ceCapUI=function(){ return {mode:mode,viewMode:viewMode,selId:selId,selNode:selNode,cx:view.cx,cy:view.cy,zoom:zoom}; };
  window._ceApplyUI=function(u){
    if(!u) return;
    if(u.viewMode==='test'||u.viewMode==='use') viewMode=u.viewMode;
    setMode((u.mode==='test'||u.mode==='use')?u.mode:'edit');
    if(isFinite(u.cx)&&isFinite(u.cy)&&isFinite(u.zoom)){ view.cx=+u.cx; view.cy=+u.cy; zoom=Math.max(0.1,Math.min(4,+u.zoom)); applyView(); }
    if(u.selId!=null&&byId(u.selId)){ selId=u.selId; selNode=null; }
    else if(typeof u.selNode==='string'&&nodeSt[u.selNode]){ selNode=u.selNode; selId=null; }
    render(); try{ renderWires(); }catch(_){} buildProps(); syncViewSel();
  };
  window._ceSetMode=setMode;
  setMode('test');
})();

