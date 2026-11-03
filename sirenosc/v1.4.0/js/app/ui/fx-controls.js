function _setEnableBtn(id, bodyId, on){
  const b = get(id); if (b) { b.textContent = on ? 'ENABLED' : 'ENABLE'; b.className = on ? 'vbtn btn-accent active' : 'vbtn btn-accent'; }
  const bd = get(bodyId); if (bd) bd.classList.toggle('disabled-overlay', !on);
}
get('btnSosEnable').addEventListener('click', () => {
  sosEnabled = !sosEnabled; _setEnableBtn('btnSosEnable', 'sosBody', sosEnabled);
  if (audioCtx) rebuildFxChain();
});
get('sSosSpeed').addEventListener('input', () => { get('svSosSpeed').textContent = get('sSosSpeed').value + ' m/s'; });

get('btnDirectionEnable').addEventListener('click', () => {
  directionEnabled = !directionEnabled;
  const btn = get('btnDirectionEnable');
  btn.textContent = directionEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = directionEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('directionBody').classList.toggle('disabled-overlay', !directionEnabled);
  if (audioCtx) rebuildFxChain();
});
get('sDirectionRate').addEventListener('input', () => {
  get('svDirectionRate').textContent = get('sDirectionRate').value + 's';
  updateDistDirParams('Direction');
});
get('sDirectionMix').addEventListener('input', () => { updateDistDirParams('Direction'); });
get('sDirPanStrength').addEventListener('input', () => {
  get('svDirPanStrength').textContent = get('sDirPanStrength').value + '%';
  if (typeof applyRotMix === 'function') applyRotMix();
});

get('btnSlpfEnable').addEventListener('click', () => {
  slpfEnabled = !slpfEnabled;
  const btn = get('btnSlpfEnable');
  btn.textContent = slpfEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = slpfEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('slpfBody').classList.toggle('disabled-overlay', !slpfEnabled);
  if (audioCtx) rebuildFxChain();
});
['nSlpfCutoff','nSlpfQ'].forEach(id => { get(id).addEventListener('input', updateSlpfParams); });
get('sSlpfMix').addEventListener('input', () => {
  get('svSlpfMix').textContent = get('sSlpfMix').value + '%';
  updateSlpfParams();
});

get('btnHpfEnable').addEventListener('click', () => {
  hpfEnabled = !hpfEnabled;
  const btn = get('btnHpfEnable');
  btn.textContent = hpfEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = hpfEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('hpfBody').classList.toggle('disabled-overlay', !hpfEnabled);
  if (audioCtx) rebuildFxChain();
});
['nHpfCutoff','nHpfQ'].forEach(id => { get(id).addEventListener('input', updateHpfParams); });
get('sHpfMix').addEventListener('input', () => {
  get('svHpfMix').textContent = get('sHpfMix').value + '%';
  updateHpfParams();
});

get('btnDistEnable').addEventListener('click', () => {
  distEnabled = !distEnabled;
  const btn = get('btnDistEnable');
  btn.textContent = distEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = distEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('distBody').classList.toggle('disabled-overlay', !distEnabled);
  if (audioCtx) rebuildFxChain();
});
['sDistDrive','sDistOutput','sDistMix'].forEach(id => {
  get(id).addEventListener('input', () => {
    get(id.replace('sDist','svDist')).textContent = get(id).value + '%';
    updateDistParams();
  });
});
['nDistTone','dDistChar'].forEach(id => { get(id).addEventListener('input', updateDistParams); get(id).addEventListener('change', updateDistParams); });

get('btnNormEnable').addEventListener('click', () => {
  normEnabled = !normEnabled;
  const btn = get('btnNormEnable');
  btn.textContent = normEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = normEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('normBody').classList.toggle('disabled-overlay', !normEnabled);
  updateNormalizerParams();
});
['sNormPreGain','sNormPostGain'].forEach(id => {
  get(id).addEventListener('input', () => {
    get(id.replace('sNorm','svNorm')).textContent = get(id).value + '%';
    updateNormalizerParams();
  });
});
get('nNormCeiling').addEventListener('input', updateNormalizerParams);
get('nNormCeiling').addEventListener('change', updateNormalizerParams);

get('sFilterSteep').addEventListener('input', () => {
  const v = get('sFilterSteep').value;
  get('svFilterSteep').textContent = v > 0 ? '+'+v : v;
  updateFilterCutoff();
});
get('sFilterOffset').addEventListener('input', () => {
  const v = get('sFilterOffset').value;
  get('svFilterOffset').textContent = v > 0 ? '+'+v : v;
  updateFilterCutoff();
});

get('btnBlowerEnable').addEventListener('click', () => {
  blowerEnabled = !blowerEnabled;
  const btn = get('btnBlowerEnable');
  btn.textContent = blowerEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = blowerEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('blowerBody').classList.toggle('disabled-overlay', !blowerEnabled);
  if (!blowerEnabled) {
    get('blowerStateDot').className = 'ind-dot';
    get('blowerStateTxt').textContent = 'IDLE';
    blowerCurrentGain = 1;
  } else {
    if (reverbEnabled) {
      reverbEnabled = false;
      const rb = get('btnReverbEnable');
      rb.textContent = 'ENABLE';
      rb.className = 'vbtn btn-accent';
      get('reverbBody').classList.add('disabled-overlay');
    }
    get('sFilterOffset').value = 17;
    get('svFilterOffset').textContent = '+17';
    if (audioCtx) buildFilterChain();
    get('sReverb2Size').value = 75;      get('svReverb2Size').textContent = '75%';
    get('sReverb2Diffusion').value = 35; get('svReverb2Diffusion').textContent = '35%';
    get('sReverb2Decay').value = 42;     get('svReverb2Decay').textContent = '42%';
    if (audioCtx) updateReverbParams(2);
    get('nSlpfCutoff').value = 2750;
    if (audioCtx) updateSlpfParams();
    get('sDistOutput').value = 60;
    get('svDistOutput').textContent = '60%';
    if (distOutputGain && audioCtx) {
      distOutputGain.gain.setTargetAtTime(0.6, audioCtx.currentTime, 0.05);
    }
  }
  if (audioCtx) rebuildFxChain();
});

get('sBlowerAmplitude').addEventListener('input', () => {
  get('svBlowerAmplitude').textContent = get('sBlowerAmplitude').value + '%';
  if (!blowerEnabled || !blowerNode || !audioCtx) return;
  const amplitude = parseFloat(get('sBlowerAmplitude').value) / 100;
  const smoothing = parseFloat(get('sBlowerSmoothing').value) / 100;
  blowerNode.curve = makeBlowerCurve(amplitude, smoothing);
  if (blowerPreGain) blowerPreGain.gain.setTargetAtTime(1 + amplitude * 10, audioCtx.currentTime, 0.05);
});

get('sBlowerSmoothing').addEventListener('input', () => {
  get('svBlowerSmoothing').textContent = get('sBlowerSmoothing').value + '%';
  if (!blowerEnabled || !blowerNode) return;
  const amplitude = parseFloat(get('sBlowerAmplitude').value) / 100;
  const smoothing = parseFloat(get('sBlowerSmoothing').value) / 100;
  blowerNode.curve = makeBlowerCurve(amplitude, smoothing);
});

get('sBlowerOutput').addEventListener('input', () => {
  get('svBlowerOutput').textContent = get('sBlowerOutput').value + '%';
  if (!blowerEnabled || !blowerOutputGain || !audioCtx) return;
  const output = parseFloat(get('sBlowerOutput').value) / 100;
  blowerOutputGain.gain.setTargetAtTime(output * blowerCurrentGain, audioCtx.currentTime, 0.05);
});

get('sBlowerMix').addEventListener('input', () => {
  get('svBlowerMix').textContent = get('sBlowerMix').value + '%';
  if (blowerEnabled && blowerWetGain && audioCtx) {
    const mix = parseFloat(get('sBlowerMix').value) / 100;
    const now = audioCtx.currentTime;
    blowerWetGain.gain.setTargetAtTime(mix, now, 0.05);
    blowerDryGain.gain.setTargetAtTime(1 - mix, now, 0.05);
  }
});

get('sBlowerVolDrop').addEventListener('input', () => {
  get('svBlowerVolDrop').textContent = get('sBlowerVolDrop').value + '%';
  if (blowerEnabled) updateBlowerFade();
});
['nBlowerFadeTime','nBlowerFadeInTime'].forEach(id => {
  get(id).addEventListener('input',  () => { if (blowerEnabled) updateBlowerFade(); });
  get(id).addEventListener('change', () => { if (blowerEnabled) updateBlowerFade(); });
});

