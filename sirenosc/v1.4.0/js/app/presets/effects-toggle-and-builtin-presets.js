const _FX_SNAP_KEY = 'sirenosc_fx_snapshot';
let _fxDisabled = false;

function _saveFxSnapshot() {
  const snap = {
    reverb: reverbEnabled,
    reverb2: reverb2Enabled,
    reverb3: reverb3Enabled,
    slpf: slpfEnabled,
    hpf: hpfEnabled,
    dist: distEnabled,
    blower: blowerEnabled
  };
  try { localStorage.setItem(_FX_SNAP_KEY, JSON.stringify(snap)); } catch(e) {}
  return snap;
}

function _loadFxSnapshot() {
  try {
    const raw = localStorage.getItem(_FX_SNAP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function disableAllEffects() {
  _saveFxSnapshot();
  _fxDisabled = true;
  if (reverbEnabled)    { reverbEnabled    = false; const b=get('btnReverbEnable');    b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('reverbBody').classList.add('disabled-overlay'); }
  if (reverb2Enabled)   { reverb2Enabled   = false; const b=get('btnReverb2Enable');   b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('reverb2Body').classList.add('disabled-overlay'); }
  if (reverb3Enabled)   { reverb3Enabled   = false; const b=get('btnReverb3Enable');   b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('reverb3Body').classList.add('disabled-overlay'); }
  if (slpfEnabled)      { slpfEnabled      = false; const b=get('btnSlpfEnable');      b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('slpfBody').classList.add('disabled-overlay'); }
  if (hpfEnabled)       { hpfEnabled       = false; const b=get('btnHpfEnable');       b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('hpfBody').classList.add('disabled-overlay'); }
  if (distEnabled)      { distEnabled      = false; const b=get('btnDistEnable');      b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('distBody').classList.add('disabled-overlay'); }
  if (blowerEnabled)    { blowerEnabled    = false; const b=get('btnBlowerEnable');    b.textContent='ENABLE'; b.className='vbtn btn-accent';        get('blowerBody').classList.add('disabled-overlay'); blowerCurrentGain=1; }
  if (audioCtx) { rebuildFxChain(); }
  const btn = get('btnDisableAllFx');
  btn.textContent = 'Restore effects';
  btn.className   = 'vbtn btn-accent';
}

function restoreAllEffects() {
  let s = _loadFxSnapshot();
  if (!s) {
    try {
      const raw = localStorage.getItem('sirenosc_fx_startup');
      s = raw ? JSON.parse(raw) : null;
    } catch(e) { s = null; }
  }
  if (!s) return;
  _fxDisabled = false;
  if (s.reverb    && !reverbEnabled)    { reverbEnabled    = true; const b=get('btnReverbEnable');    b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('reverbBody').classList.remove('disabled-overlay'); }
  if (s.reverb2   && !reverb2Enabled)   { reverb2Enabled   = true; const b=get('btnReverb2Enable');   b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('reverb2Body').classList.remove('disabled-overlay'); }
  if (s.reverb3   && !reverb3Enabled)   { reverb3Enabled   = true; const b=get('btnReverb3Enable');   b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('reverb3Body').classList.remove('disabled-overlay'); }
  if (s.slpf      && !slpfEnabled)      { slpfEnabled      = true; const b=get('btnSlpfEnable');      b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('slpfBody').classList.remove('disabled-overlay'); }
  if (s.hpf       && !hpfEnabled)       { hpfEnabled       = true; const b=get('btnHpfEnable');       b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('hpfBody').classList.remove('disabled-overlay'); }
  if (s.dist      && !distEnabled)      { distEnabled      = true; const b=get('btnDistEnable');      b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('distBody').classList.remove('disabled-overlay'); }
  if (s.blower    && !blowerEnabled)    { blowerEnabled    = true; const b=get('btnBlowerEnable');    b.textContent='ENABLED'; b.className='vbtn btn-accent active'; get('blowerBody').classList.remove('disabled-overlay'); }
  if (audioCtx) { rebuildFxChain(); }
  try { localStorage.removeItem(_FX_SNAP_KEY); } catch(e) {}
  const btn = get('btnDisableAllFx');
  btn.textContent = 'Disable all effects';
  btn.className   = 'vbtn btn-gray';
}

get('btnDisableAllFx').addEventListener('click', () => {
  if (_fxDisabled) { restoreAllEffects(); } else { disableAllEffects(); }
});

get('btnSavePreset').addEventListener('click', savePreset);
get('btnLoadPreset').addEventListener('click', () => get('fileLoadInput').click());
get('btnDownloadPreset').addEventListener('click', downloadPreset);
get('fileLoadInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    loadPreset(file);
    e.target.value = '';
  }
});

const BUILTIN_PRESETS = SIRENOSC_ASSETS["preset.*"] || {};
function getBuiltinPreset(name) {
  if (!name || typeof BUILTIN_PRESETS === 'undefined') return null;
  if (BUILTIN_PRESETS[name]) return { file: name, b64: BUILTIN_PRESETS[name] };
  var lc = String(name).toLowerCase(), ks = Object.keys(BUILTIN_PRESETS);
  for (var i = 0; i < ks.length; i++) if (ks[i].toLowerCase() === lc && BUILTIN_PRESETS[ks[i]]) return { file: ks[i], b64: BUILTIN_PRESETS[ks[i]] };
  return null;
}
(function(){
  var btn = get('btnBuiltinPresets');
  var dd  = get('builtinDropdown');

  btn.addEventListener('click', function(e){
    e.stopPropagation();
    var open = dd.style.display !== 'none';
    dd.style.display = open ? 'none' : 'block';
    btn.classList.toggle('active', !open);
  });

  document.addEventListener('click', function(){ dd.style.display='none'; btn.classList.remove('active'); });
  dd.addEventListener('click', function(e){ e.stopPropagation(); });

  dd.querySelectorAll('.bi-item').forEach(function(item){
    item.addEventListener('click', function(){
      var path = item.getAttribute('data-file');
      if (!path) return;
      dd.style.display = 'none';
      btn.classList.remove('active');
      get('statusTxt').textContent = 'LOADING…';
      var filename = path.split('/').pop();
          var b64 = BUILTIN_PRESETS[filename];
          if (!b64) {
            get('statusTxt').textContent = 'NOT FOUND';
            setTimeout(function(){ get('statusTxt').textContent = 'IDLE'; }, 3000);
            alert('Built-in preset "' + filename + '" not found.');
            return;
          }
          try {
            var binary = safeAtob(b64);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            var blob = new Blob([bytes], {type:'application/octet-stream'});
            var file = new File([blob], filename, {type:'application/octet-stream'});
            loadPreset(file);
          } catch(err) {
            console.error('Built-in preset decode failed:', err);
            get('statusTxt').textContent = 'LOAD ERROR';
            setTimeout(function(){ get('statusTxt').textContent = 'IDLE'; }, 3000);
          }
    });
  });
})();

const trackedInputs = [
  'dChopper','nWindUp','dWindUpFn','dWindUpEasing','nWindDown','dWindDownFn','dWindDownEasing','nTailSpeed',
  'tTorque','nTorqueRPM','nTorqueOffset','dTorqueFn','dTorqueEasing',
  'sHVane','sLVane',
  'eRPM','dWaveform',
  'tPulseHiLo','tUndulate',
  'nDampRPMRaise','nDampAirOffset','nDampRaiseTime','nDampReturnTime','nDampRate','nDampRateOffset',
  'nContactorWindUp','dContactorWindUpFn','dContactorWindUpEasing','nContactorWindDown','dContactorWindDownFn','dContactorWindDownEasing',
  'eHigherPort','eLowerPort','eHigherVanes','eLowerVanes','eUndertone','nBrakeOffset','dBrakeFn','dBrakeEasing',
  'nPitchDeclineRPM','nPitchDeclineTime','dPitchDeclineFn'
];

trackedInputs.forEach(id => {
  const el = get(id);
  if (el) {
    el.addEventListener('input', checkForModifications);
    el.addEventListener('change', checkForModifications);
  }
});

