(function() {
  window._bothDampersShut = function() {
    if (!damperEnabled) return false;
    if (typeof _stateOverrideApplied !== 'undefined' && _stateOverrideApplied === 'off') return true;
    if (typeof _stateOverrideConfig !== 'undefined' && windDirection === 'down') {
      var cfg = _stateOverrideConfig['down'];
      if (cfg && cfg.override && !cfg.defaultOn) return true;
    }
    return false;
  };

  function _sdAutoFill() {
    if (!document.getElementById('tSdAutoFill') || !document.getElementById('tSdAutoFill').checked) return;
    var upOff  = parseFloat(document.getElementById('nWindUp')  && document.getElementById('nWindUp').value)  || 8;
    var dnOff  = parseFloat(document.getElementById('nWindDown') && document.getElementById('nWindDown').value) || 20;
    var upFn   = document.getElementById('dWindUpFn')   ? document.getElementById('dWindUpFn').value   : 'sine';
    var dnFn   = document.getElementById('dWindDownFn') ? document.getElementById('dWindDownFn').value : 'exponential';
    var upEase = document.getElementById('dWindUpEasing')   ? document.getElementById('dWindUpEasing').value   : 'easeout';
    var dnEase = document.getElementById('dWindDownEasing') ? document.getElementById('dWindDownEasing').value : 'easeout';

    var sdUp  = document.getElementById('nSdWindUp');
    var sdDn  = document.getElementById('nSdWindDown');
    var sdUpFn  = document.getElementById('dSdWindUpFn');
    var sdDnFn  = document.getElementById('dSdWindDownFn');

    if (sdUp)  sdUp.value  = Math.min(80,  +(upOff * 1.5).toFixed(1));
    if (sdDn)  sdDn.value  = Math.min(300, +(dnOff * 1.5).toFixed(1));
    if (sdUpFn)  { sdUpFn.value  = upFn; }
    if (sdDnFn)  { sdDnFn.value  = dnFn; }
    if (typeof setEasingGroup === 'function') {
      setEasingGroup('egSdWindUp',   'dSdWindUpEasing',   upEase);
      setEasingGroup('egSdWindDown', 'dSdWindDownEasing', dnEase);
    }
    _sdSyncFieldsDisabled();
  }

  function _sdSyncFieldsDisabled() {
    var autoFill = document.getElementById('tSdAutoFill') && document.getElementById('tSdAutoFill').checked;
    var upFields = document.getElementById('sdWindUpFields');
    var dnFields = document.getElementById('sdWindDownFields');
    if (upFields) { upFields.style.opacity = autoFill ? '0.45' : ''; upFields.style.pointerEvents = autoFill ? 'none' : ''; }
    if (dnFields) { dnFields.style.opacity = autoFill ? '0.45' : ''; dnFields.style.pointerEvents = autoFill ? 'none' : ''; }
  }

  var tAF = document.getElementById('tSdAutoFill');
  if (tAF) {
    tAF.addEventListener('change', function() {
      if (this.checked) _sdAutoFill();
      _sdSyncFieldsDisabled();
    });
  }

  ['nWindUp','nWindDown','dWindUpFn','dWindDownFn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', _sdAutoFill);
    el.addEventListener('input',  _sdAutoFill);
  });

  ['egWindUp','egWindDown'].forEach(function(gid) {
    var g = document.getElementById(gid);
    if (!g) return;
    g.querySelectorAll('.ease-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { setTimeout(_sdAutoFill, 0); });
    });
  });

  var _sdLabelInterval = null;
  function _sdUpdateLabel() {
    var lbl = document.getElementById('sdActiveLabel');
    if (!lbl) return;
    var shut = window._bothDampersShut && window._bothDampersShut();
    lbl.style.display = (shut && (windDirection === 'up' || windDirection === 'down')) ? '' : 'none';
  }
  _sdLabelInterval = setInterval(_sdUpdateLabel, 200);

  _sdAutoFill();
  _sdSyncFieldsDisabled();
})();

(function() {
  let _cwPoints    = [];
  let _cwEnabled   = false;
  let _cwCutTimers = {};
  let _cwCutActive = false;
  window._cwIsCutting = function(){ return _cwCutActive; };
  let _cwIdCtr     = 0;
  let _cwPrevAngle = null;

  const DOT_R  = 33;
  const SVG_CX = 44, SVG_CY = 44;

  function _degToSvg(deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return {
      x: SVG_CX + DOT_R * Math.cos(rad),
      y: SVG_CY + DOT_R * Math.sin(rad)
    };
  }

  function _redrawDots() {
    const g = document.getElementById('rotContactDots');
    if (!g) return;
    g.innerHTML = '';
    if (!_cwEnabled) return;
    _cwPoints.forEach(pt => {
      const pos = _degToSvg(pt.deg);
      const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulse.setAttribute('cx', pos.x.toFixed(2));
      pulse.setAttribute('cy', pos.y.toFixed(2));
      pulse.setAttribute('r', '5.5');
      pulse.setAttribute('fill', 'none');
      pulse.setAttribute('stroke', 'rgba(239,68,68,0)');
      pulse.setAttribute('stroke-width', '1.5');
      pulse.setAttribute('id', 'cwPulse_' + pt.id);
      g.appendChild(pulse);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pos.x.toFixed(2));
      c.setAttribute('cy', pos.y.toFixed(2));
      c.setAttribute('r', '3');
      c.setAttribute('fill', 'var(--red)');
      c.setAttribute('stroke', '#0b0c0d');
      c.setAttribute('stroke-width', '1');
      c.setAttribute('id', 'cwDot_' + pt.id);
      g.appendChild(c);
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const lblPos = _degToSvg(pt.deg);
      const offR = DOT_R + 8;
      const offRad = (pt.deg - 90) * Math.PI / 180;
      lbl.setAttribute('x', (SVG_CX + offR * Math.cos(offRad)).toFixed(1));
      lbl.setAttribute('y', (SVG_CY + offR * Math.sin(offRad) + 3).toFixed(1));
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-family', 'Share Tech Mono, monospace');
      lbl.setAttribute('font-size', '5.5');
      lbl.setAttribute('fill', 'rgba(239,68,68,0.65)');
      lbl.textContent = pt.deg + '°';
      g.appendChild(lbl);
    });
  }

  function _renderList() {
    const list = document.getElementById('collectorWearList');
    if (!list) return;
    list.innerHTML = '';

    if (_cwPoints.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:9px;color:var(--muted);letter-spacing:1px;text-align:center;padding:6px 0;opacity:.5';
      empty.textContent = 'NO SECTIONS';
      list.appendChild(empty);
      return;
    }

    _cwPoints.forEach((pt, idx) => {
      const sec = document.createElement('div');
      sec.className = 'cw-section';
      sec.innerHTML =
        '<div class="cw-section-header">' +
          '<div style="display:flex;align-items:center;gap:5px">' +
            '<div class="cw-active-dot" id="cwActiveDot_' + pt.id + '"></div>' +
            '<span class="cw-section-label">Section ' + (idx + 1) + '</span>' +
          '</div>' +
          '<button class="cw-rm-btn" data-cw-rm="' + pt.id + '" title="Remove section"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button>' +
        '</div>' +
        '<div class="cw-fields-row">' +
          '<div class="cw-field-group">' +
            '<span class="cw-field-label">Degree °</span>' +
            '<input type="number" value="' + pt.deg + '" min="0" max="359" step="1" ' +
              'data-cw-id="' + pt.id + '" data-cw-field="deg" ' +
              'style="background:var(--inset);border:1px solid rgba(239,68,68,.3);border-radius:2px;color:var(--red);font-family:\'Share Tech Mono\',monospace;font-size:11px;padding:3px 6px;outline:none;width:100%">' +
          '</div>' +
          '<div class="cw-field-group">' +
            '<span class="cw-field-label">Cancel (ms)</span>' +
            '<input type="number" value="' + pt.cutMs + '" min="1" max="60000" step="1" ' +
              'data-cw-id="' + pt.id + '" data-cw-field="cutMs" ' +
              'style="background:var(--inset);border:1px solid rgba(255,107,53,.3);border-radius:2px;color:var(--warn);font-family:\'Share Tech Mono\',monospace;font-size:11px;padding:3px 6px;outline:none;width:100%">' +
          '</div>' +
          '<div></div>' +
        '</div>';
      list.appendChild(sec);
    });

    list.querySelectorAll('input[data-cw-id]').forEach(inp => {
      inp.addEventListener('input', function() {
        const id    = parseInt(this.dataset.cwId);
        const field = this.dataset.cwField;
        const pt    = _cwPoints.find(p => p.id === id);
        if (!pt) return;
        const v = parseFloat(this.value);
        if (field === 'deg')   pt.deg   = Math.max(0, Math.min(359, isNaN(v) ? 0 : Math.round(v)));
        if (field === 'cutMs') pt.cutMs = Math.max(1, isNaN(v) ? 100 : Math.round(v));
        _redrawDots();
      });
      inp.addEventListener('change', function() {
        const id    = parseInt(this.dataset.cwId);
        const field = this.dataset.cwField;
        const pt    = _cwPoints.find(p => p.id === id);
        if (!pt) return;
        this.value = pt[field];
        _redrawDots();
      });
      const iDeg = inp.dataset.cwField === 'deg';
      inp.addEventListener('focus', function() {
        this.style.borderColor = iDeg ? 'var(--red)' : 'var(--warn)';
      });
      inp.addEventListener('blur', function() {
        this.style.borderColor = inp.dataset.cwField === 'deg'
          ? 'rgba(239,68,68,.3)' : 'rgba(255,107,53,.3)';
      });
    });

    list.querySelectorAll('button[data-cw-rm]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.dataset.cwRm);
        if (_cwCutTimers[id]) { clearTimeout(_cwCutTimers[id]); delete _cwCutTimers[id]; }
        _cwPoints = _cwPoints.filter(p => p.id !== id);
        if (Object.keys(_cwCutTimers).length === 0) {
          _cwCutActive = false;
          if (typeof audioCtx !== 'undefined' && audioCtx && typeof masterGain !== 'undefined' && masterGain) {
            masterGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.02);
          }
        }
        _renderList();
        _redrawDots();
      });
    });
  }

  function _addPoint() {
    _cwPoints.push({ id: ++_cwIdCtr, deg: 0, cutMs: 500 });
    _renderList();
    _redrawDots();
  }

  window._cwCheckCrossing = function(curAngle) {
    if (!_cwEnabled || _cwPoints.length === 0) return;
    if (_cwPrevAngle === null) { _cwPrevAngle = curAngle; return; }
    const prev = ((_cwPrevAngle % 360) + 360) % 360;
    const cur  = ((curAngle    % 360) + 360) % 360;
    _cwPrevAngle = curAngle;

    for (const pt of _cwPoints) {
      if (_cwCutTimers[pt.id]) continue;
      const deg = ((pt.deg % 360) + 360) % 360;
      let crossed = false;
      if (prev <= cur) {
        crossed = deg > prev && deg <= cur;
      } else {
        crossed = deg > prev || deg <= cur;
      }
      if (crossed) {
        _cwTriggerPoint(pt);
      }
    }
  };

  function _cwTriggerPoint(pt) {
    _cwCutActive = true;
    var wasActive = typeof active !== 'undefined' ? active : false;
    if (wasActive && typeof setActive === 'function') setActive(false);

    const dot   = document.getElementById('cwDot_'    + pt.id);
    const pulse = document.getElementById('cwPulse_'  + pt.id);
    const adot  = document.getElementById('cwActiveDot_' + pt.id);
    const flash = document.getElementById('cwActiveFlash');
    if (dot)   dot.setAttribute('fill', '#ff5555');
    if (pulse) pulse.setAttribute('stroke', 'rgba(239,68,68,0.7)');
    if (adot)  adot.classList.add('firing');
    if (flash) flash.style.display = '';

    _cwCutTimers[pt.id] = setTimeout(() => {
      delete _cwCutTimers[pt.id];
      var shouldResume = (typeof steadyActive !== 'undefined' && steadyActive) && getVoltageRatio() > 0;
      if (wasActive && shouldResume && typeof setActive === 'function' && !active) {
        setActive(true);
      }
      if (Object.keys(_cwCutTimers).length === 0) {
        _cwCutActive = false;
      }
      if (dot)   dot.setAttribute('fill', 'var(--red)');
      if (pulse) pulse.setAttribute('stroke', 'rgba(239,68,68,0)');
      if (adot)  adot.classList.remove('firing');
      if (flash) flash.style.display = 'none';
    }, Math.max(1, pt.cutMs));
  }

  document.getElementById('tCollectorWear').addEventListener('change', function() {
    const fields = document.getElementById('collectorWearFields');
    if (fields) {
      fields.classList.toggle('disabled-overlay', !this.checked);
      fields.style.pointerEvents = this.checked ? '' : 'none';
    }
    _cwEnabled = this.checked;
    _cwPrevAngle = null;
    if (!_cwEnabled) {
      var hadCuts = Object.keys(_cwCutTimers).length > 0;
      Object.keys(_cwCutTimers).forEach(id => clearTimeout(_cwCutTimers[id]));
      _cwCutTimers = {};
      _cwCutActive = false;
      if (hadCuts) {
        var shouldResume = (typeof steadyActive !== 'undefined' && steadyActive) && getVoltageRatio() > 0;
        if (shouldResume && typeof setActive === 'function' && !active) setActive(true);
      }
      const flash = document.getElementById('cwActiveFlash');
      if (flash) flash.style.display = 'none';
    }
    _redrawDots();
  });

  document.getElementById('btnCollectorAdd').addEventListener('click', _addPoint);

  _renderList();

  window._cwGetData = () => ({ enabled: _cwEnabled, points: _cwPoints.map(p => ({ deg: p.deg, cutMs: p.cutMs })) });
  window._cwSetData = (data) => {
    if (!data) return;
    _cwPoints = [];
    _cwIdCtr  = 0;
    _cwPrevAngle = null;
    (data.points || []).forEach(p => _cwPoints.push({ id: ++_cwIdCtr, deg: p.deg || 0, cutMs: p.cutMs || 500 }));
    _renderList();
    const tog = document.getElementById('tCollectorWear');
    if (tog && !!data.enabled !== tog.checked) {
      tog.checked = !!data.enabled;
      tog.dispatchEvent(new Event('change'));
    } else {
      _redrawDots();
    }
  };
})();



