(function() {

  var _DA_HUM_B64   = SIRENOSC_ASSETS["damper.hum"];
  var _DA_OPEN_B64  = SIRENOSC_ASSETS["damper.open"];
  var _DA_CLOSE_B64 = SIRENOSC_ASSETS["damper.close"];

  var _daBufHum   = null;
  var _daBufOpen  = null;
  var _daBufClose = null;

  Object.defineProperty(window, '_daBufHum',   { get: function() { return _daBufHum;   }, set: function(v) { _daBufHum   = v; } });
  Object.defineProperty(window, '_daBufOpen',  { get: function() { return _daBufOpen;  }, set: function(v) { _daBufOpen  = v; } });
  Object.defineProperty(window, '_daBufClose', { get: function() { return _daBufClose; }, set: function(v) { _daBufClose = v; } });

  var _daHumSrcs  = [];
  var _daHumGains = [];
  var _daGrpGains = [];

  var _daGrpState = [];

  var _daOneShotSrcs  = [];
  var _daOneShotGains = [];
  var _daCloseSrcs    = [];
  var _daCloseGains   = [];

  var _daUpdateTimer = null;

  var HUM_FADE_IN  = 0.5;
  var CLOSE_FADE   = 0.15;

  function _b64ToArrayBuffer(b64) {
    var bin = safeAtob(b64);
    var buf = new ArrayBuffer(bin.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
    return buf;
  }

  function _ensureBuffers() {
    if (!audioCtx) return;
    if (!_daBufHum) {
      var _abHUM = _b64ToArrayBuffer(_DA_HUM_B64); audioCtx.decodeAudioData(_abHUM.slice(0), function(b){ window._wavReg(b, _abHUM); _daBufHum = b; }, function(e){ console.error('[DA] hum decode error', e); });
    }
    if (!_daBufOpen) {
      var _abOPEN = _b64ToArrayBuffer(_DA_OPEN_B64); audioCtx.decodeAudioData(_abOPEN.slice(0), function(b){ window._wavReg(b, _abOPEN); _daBufOpen = b; }, function(e){ console.error('[DA] open decode error', e); });
    }
    if (!_daBufClose) {
      var _abCLOSE = _b64ToArrayBuffer(_DA_CLOSE_B64); audioCtx.decodeAudioData(_abCLOSE.slice(0), function(b){ window._wavReg(b, _abCLOSE); _daBufClose = b; }, function(e){ console.error('[DA] close decode error', e); });
    }
  }

  function _daGetGrpGain(gi) {
    if (!_daGrpGains[gi]) {
      var g = audioCtx.createGain();
      g.gain.value = _daGetGrpVol(gi);
      g.connect(window._dampFxIn || masterGain);
      _daGrpGains[gi] = g;
    }
    return _daGrpGains[gi];
  }

  window._daReconnectGrpGains = function() {
    for (var gi = 0; gi < _daGrpGains.length; gi++) {
      var g = _daGrpGains[gi];
      if (!g) continue;
      try { g.disconnect(); } catch(e) {}
      g.connect(window._dampFxIn || masterGain);
    }
  };

  function _daGetGrpVol(gi) {
    var s = document.getElementById('daDamperVol' + gi);
    return s ? parseFloat(s.value) / 100 : 0.8;
  }
  function _daHumEnabled()   { var e=document.getElementById('daHumEnabled');   return !e || e.checked; }
  function _daOpenEnabled()  { var e=document.getElementById('daOpenEnabled');  return !e || e.checked; }
  function _daCloseEnabled() { var e=document.getElementById('daCloseEnabled'); return !e || e.checked; }
  function _daHumVol()   { var s=document.getElementById('daHumVol');   return s ? (parseFloat(s.value)/100) * 0.02 : 0.016; }
  function _daOpenVol()  { var s=document.getElementById('daOpenVol');  return s ? (parseFloat(s.value)/100) * 0.02 : 0.016; }
  function _daCloseVol() { var s=document.getElementById('daCloseVol'); return s ? (parseFloat(s.value)/100) * 0.02 : 0.016; }

  window._daUpdateGroupGain = function(gi) {
    if (_daGrpGains[gi] && audioCtx) {
      _daGrpGains[gi].gain.setTargetAtTime(_daGetGrpVol(gi), audioCtx.currentTime, 0.03);
    }
  };

  function _daSineFade(param, from, to, t0, dur) {
    var N = 48, up = to >= from;
    for (var i = 1; i <= N; i++) {
      var th = (i / N) * Math.PI / 2;
      var v = up ? from + (to - from) * Math.sin(th) : to + (from - to) * Math.cos(th);
      param.linearRampToValueAtTime(v, t0 + dur * i / N);
    }
  }
  function _daFadeKill(src, g, dur) {
    var t = dur || 0.03, n = audioCtx.currentTime;
    try { g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); _daSineFade(g.gain, g.gain.value, 0, n, t); src.stop(n + t + 0.005); } catch(e) {}
    setTimeout(function(){ try { g.disconnect(); } catch(e) {} }, 80);
  }
  function _daEnv(g, vol, buf, t0) {
    var A = 0.012, T = 0.025, d = buf.duration;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t0);
    _daSineFade(g.gain, 0, vol, t0, A);
    g.gain.setValueAtTime(vol, t0 + Math.max(A, d - T));
    _daSineFade(g.gain, vol, 0, t0 + Math.max(A, d - T), Math.min(T, d - A > 0 ? T : d));
  }
  function _daPlayOneShot(buf, vol, gi) {
    if (!buf || !audioCtx) return;
    if (_daOneShotSrcs[gi] && _daOneShotGains[gi]) _daFadeKill(_daOneShotSrcs[gi], _daOneShotGains[gi]);
    _daOneShotSrcs[gi] = null; _daOneShotGains[gi] = null;
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    var g = audioCtx.createGain();
    _daEnv(g, vol, buf, audioCtx.currentTime);
    src.connect(g);
    g.connect(_daGetGrpGain(gi));
    src.onended = function() {
      if (_daOneShotSrcs[gi] === src) { _daOneShotSrcs[gi] = null; }
      if (_daOneShotGains[gi] === g)  { try { g.disconnect(); } catch(e) {} _daOneShotGains[gi] = null; }
    };
    _daOneShotSrcs[gi]  = src;
    _daOneShotGains[gi] = g;
    src.start();
  }

  function _daBestLoopEnd(buf, a, b) {
    try {
      var d = buf.getChannelData(0), n = d.length;
      if (b + 300 >= n) return b;
      var v0 = d[a], s0 = d[a + 1] - d[a], best = b, bc = 1e9;
      for (var i = b - 300; i <= b + 300; i++) {
        var c = Math.abs(d[i] - v0) + 2 * Math.abs((d[i] - d[i - 1]) - s0);
        if (c < bc) { bc = c; best = i; }
      }
      return best;
    } catch (e) { return b; }
  }
  function _daStartHum(gi) {
    _daStopHum(gi);
    if (!_daBufHum || !audioCtx) return;
    if (!_daHumEnabled()) return;
    var src = audioCtx.createBufferSource();
    src.buffer = _daBufHum;
    src.loop = true;
    src.loopStart = 912 / (_daBufHum.sampleRate || 44100);
    src.loopEnd = _daBestLoopEnd(_daBufHum, 912, 5318) / (_daBufHum.sampleRate || 44100);
    var g = audioCtx.createGain();
    g.gain.value = 0;
    var now = audioCtx.currentTime;
    g.gain.setValueAtTime(0, now);
    _daSineFade(g.gain, 0, _daHumVol(), now, HUM_FADE_IN);
    src.connect(g);
    g.connect(_daGetGrpGain(gi));
    src.start();
    _daHumSrcs[gi]  = src;
    _daHumGains[gi] = g;
  }

  function _daStopHum(gi) {
    var src  = _daHumSrcs[gi];
    var gain = _daHumGains[gi];
    if (!src) return;
    if (gain && audioCtx) {
      var now = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      var _gv = gain.gain.value;
      gain.gain.setValueAtTime(_gv, now);
      _daSineFade(gain.gain, _gv, 0, now, CLOSE_FADE);
    }
    var _src = src;
    setTimeout(function() { try { _src.stop(); } catch(e) {} }, (CLOSE_FADE + 0.05) * 1000);
    _daHumSrcs[gi]  = null;
    _daHumGains[gi] = null;
  }

  function _daOpen(gi) {
    if (_daOpenEnabled()) _daPlayOneShot(_daBufOpen, _daOpenVol(), gi);
    _daStartHum(gi);
  }

  function _daClose(gi) {
    _daStopHum(gi);
    if (_daCloseSrcs[gi] && _daCloseGains[gi]) _daFadeKill(_daCloseSrcs[gi], _daCloseGains[gi]);
    _daCloseSrcs[gi] = null; _daCloseGains[gi] = null;
    if (_daCloseEnabled() && _daBufClose && audioCtx) {
      var src = audioCtx.createBufferSource();
      src.buffer = _daBufClose;
      var g = audioCtx.createGain();
      _daEnv(g, _daCloseVol(), _daBufClose, audioCtx.currentTime + CLOSE_FADE * 0.5);
      src.connect(g);
      g.connect(_daGetGrpGain(gi));
      src.onended = function() {
        if (_daCloseSrcs[gi] === src)  { _daCloseSrcs[gi] = null; }
        if (_daCloseGains[gi] === g)   { try { g.disconnect(); } catch(e) {} _daCloseGains[gi] = null; }
      };
      _daCloseSrcs[gi]  = src;
      _daCloseGains[gi] = g;
      src.start(audioCtx.currentTime + CLOSE_FADE * 0.5);
    }
  }

  function _daGroupIsOn(gi) {
    if (_stateOverrideApplied !== null) {
      return _stateOverrideApplied === 'on';
    }
    if (!seqGroups || gi >= seqNumGroups) return false;
    return _grpOnNow(gi);
  }

  function _daUpdateImmediate() {
    if (!damperEnabled || !audioCtx) return;
    _ensureBuffers();
    var n = seqNumGroups;
    while (_daGrpState.length < n) _daGrpState.push(null);

    for (var gi = 0; gi < n; gi++) {
      var shouldBeOn = _daGroupIsOn(gi);
      var cur = _daGrpState[gi];
      if (!shouldBeOn && cur !== 'open') {
        _daGrpState[gi] = 'open';
        _daOpen(gi);
      } else if (shouldBeOn && cur !== 'close') {
        _daGrpState[gi] = 'close';
        _daClose(gi);
      }
      if (_daGrpGains[gi] && audioCtx) {
        _daGrpGains[gi].gain.setTargetAtTime(_daGetGrpVol(gi), audioCtx.currentTime, 0.05);
      }
    }
    for (var gi2 = n; gi2 < _daGrpState.length; gi2++) {
      if (_daGrpState[gi2] !== null) {
        _daStopHum(gi2);
        _daGrpState[gi2] = null;
      }
    }
  }

  window._daUpdate = function() {
    if (_daUpdateTimer) { clearTimeout(_daUpdateTimer); _daUpdateTimer = null; }
    _daUpdateTimer = setTimeout(function() { _daUpdateTimer = null; _daUpdateImmediate(); }, 30);
  };

  window._daStopAll = function() {
    if (_daUpdateTimer) { clearTimeout(_daUpdateTimer); _daUpdateTimer = null; }
    for (var gi = 0; gi < _daGrpState.length; gi++) {
      _daStopHum(gi);
      if (_daOneShotSrcs[gi] && _daOneShotGains[gi]) _daFadeKill(_daOneShotSrcs[gi], _daOneShotGains[gi], 0.03);
      _daOneShotSrcs[gi] = null; _daOneShotGains[gi] = null;
      if (_daCloseSrcs[gi] && _daCloseGains[gi]) _daFadeKill(_daCloseSrcs[gi], _daCloseGains[gi], 0.03);
      _daCloseSrcs[gi] = null; _daCloseGains[gi] = null;
      _daGrpState[gi] = null;
    }
  };

  window._daUpdateHumVols = function() {
    var vol = _daHumEnabled() ? _daHumVol() : 0;
    for (var gi = 0; gi < _daHumGains.length; gi++) {
      var g = _daHumGains[gi];
      if (g && audioCtx) g.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    var humSlider   = document.getElementById('daHumVol');
    var openSlider  = document.getElementById('daOpenVol');
    var closeSlider = document.getElementById('daCloseVol');
    if (humSlider)   humSlider.addEventListener('input',   function() { document.getElementById('daHumVolVal').textContent   = this.value+'%'; window._daUpdateHumVols(); });
    if (openSlider)  openSlider.addEventListener('input',  function() { document.getElementById('daOpenVolVal').textContent  = this.value+'%'; });
    if (closeSlider) closeSlider.addEventListener('input', function() { document.getElementById('daCloseVolVal').textContent = this.value+'%'; });

    ['daHumEnabled','daOpenEnabled','daCloseEnabled'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function() {
        if (id === 'daHumEnabled') window._daUpdateHumVols();
      });
    });

    function wireImport(btnId, fileId, which) {
      var btn  = document.getElementById(btnId);
      var file = document.getElementById(fileId);
      if (!btn || !file) return;
      btn.addEventListener('click', function() { file.click(); });
      file.addEventListener('change', function() {
        var f = file.files[0];
        if (!f || !audioCtx) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          audioCtx.decodeAudioData(e.target.result.slice(0), function(buf) {
            window._wavReg(buf, e.target.result);
            if (which === 'hum')   _daBufHum   = buf;
            if (which === 'open')  _daBufOpen  = buf;
            if (which === 'close') _daBufClose = buf;
            if (which === 'hum') {
              for (var gi = 0; gi < _daGrpState.length; gi++) {
                if (_daGrpState[gi] === 'open') {
                  _daGrpState[gi] = null;
                }
              }
              window._daUpdate();
            }
          }, function(err) { console.error('[DA] decode error', err); });
        };
        reader.readAsArrayBuffer(f);
        file.value = '';
      });
    }
    wireImport('daHumImport',   'daHumFile',   'hum');
    wireImport('daOpenImport',  'daOpenFile',  'open');
    wireImport('daCloseImport', 'daCloseFile', 'close');
  });

})();


