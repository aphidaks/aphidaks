
(function() {
  'use strict';

  function closeAllMenus() {
    document.querySelectorAll('.menu-item').forEach(function(item) {
      item.classList.remove('open');
    });
  }

  document.querySelectorAll('.menu-item').forEach(function(item) {
    var btn = item.querySelector('.menu-btn');
    if (!btn || btn.tagName === 'A') return;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var wasOpen = item.classList.contains('open');
      closeAllMenus();
      if (!wasOpen) item.classList.add('open');
    });
  });

  document.addEventListener('click', function() { closeAllMenus(); });
  document.querySelectorAll('.menu-dropdown, .menu-sub').forEach(function(d) {
    d.addEventListener('click', function(e) { e.stopPropagation(); });
  });

  function _updateBackdrop() {
    var bd = document.getElementById('popupBackdrop');
    if (!bd) return;
    var anyVisible = Array.prototype.slice.call(document.querySelectorAll('.popup-overlay')).some(function(el) {
      return window.getComputedStyle(el).display !== 'none';
    });
    bd.style.display = anyVisible ? 'block' : 'none';
  }
  function openPopup(id) {
    closeAllMenus();
    var el = document.getElementById(id);
    if (el) { el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; }
    _updateBackdrop();
  }
  function closePopup(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
    _updateBackdrop();
  }

  function _setDerivedFromCell(elId, sirenId) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = sirenId ? sirenId : '\u2014';
  }
  function _syncPresetInfoPanel() {
    var verEl = document.getElementById('piVersion');
    if (verEl) {
      var v = (typeof _loadedPresetVersion !== 'undefined' && _loadedPresetVersion) ? _loadedPresetVersion : (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '\u2014');
      verEl.textContent = v;
    }
    var fileVerEl = document.getElementById('piFileVersion');
    if (fileVerEl) {
      fileVerEl.textContent = (typeof _loadedPresetFileVersion !== 'undefined' && _loadedPresetFileVersion) ? _loadedPresetFileVersion : '\u2014';
    }
    var dfEl = document.getElementById('ePresetDerivedFrom');
    _setDerivedFromCell('piDerivedFrom', dfEl ? dfEl.value : '');
    var badgeEl = document.getElementById('presetInfoStateBadge');
    if (badgeEl) badgeEl.style.display = 'none';
  }
  window._syncPresetInfoPanel = _syncPresetInfoPanel;

  var presetInfoResetBtn = document.getElementById('presetInfoResetBtn');
  if (presetInfoResetBtn) {
    presetInfoResetBtn.addEventListener('click', function() {
      var resetPopup = document.getElementById('resetConfirmPopup');
      if (resetPopup) resetPopup.style.display = 'flex';
    });
  }
  _syncPresetInfoPanel();

  document.getElementById('saveOscpMfgSelect').addEventListener('change', function() {
    var otherInput = document.getElementById('saveOscpMfgOther');
    if (this.value === '__other__') {
      otherInput.style.display = '';
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  });

  function _setSaveOscpMfgValue(val) {
    var select = document.getElementById('saveOscpMfgSelect');
    var otherInput = document.getElementById('saveOscpMfgOther');
    var isKnownMfg = Array.prototype.some.call(select.options, function(o) { return o.value === val; });
    if (val && isKnownMfg) {
      select.value = val;
      otherInput.style.display = 'none';
      otherInput.value = '';
    } else if (val) {
      select.value = '__other__';
      otherInput.style.display = '';
      otherInput.value = val;
    } else {
      select.value = '';
      otherInput.style.display = 'none';
      otherInput.value = '';
    }
  }

  function _saveOscpMfgValue() {
    var select = document.getElementById('saveOscpMfgSelect');
    if (select.value === '__other__') return document.getElementById('saveOscpMfgOther').value.trim();
    return select.value;
  }


  var _wirePresetItem, _presetItemsList;
  (function() {
    var _activePresetItem = null;
    var menuPresetList = document.getElementById('menuPresetList');
    _presetItemsList = menuPresetList;

    _wirePresetItem = function(item) {
      item.addEventListener('click', function() {
        if (_activePresetItem) _activePresetItem.classList.remove('active-preset');
        _activePresetItem = item;
        item.classList.add('active-preset');
        closeAllMenus();

        var filePath = item.getAttribute('data-file');
        var filename = item.getAttribute('data-filename') || (filePath ? filePath.split('/').pop() : null);

        var _bp = (typeof getBuiltinPreset === 'function') ? getBuiltinPreset(filename) : null;
        if (_bp) {
          try {
            var binary = safeAtob(_bp.b64);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            var blob = new Blob([bytes], {type:'application/octet-stream'});
            var file = new File([blob], _bp.file, {type:'application/octet-stream'});
            _showOscpMetaFromFile(file, function() {
              if (typeof loadPreset === 'function') loadPreset(file);
            });
          } catch(e) { console.error('Preset load error:', e); }
          return;
        }

        var gi = document.getElementById('statusTxt');
        if (gi) gi.textContent = 'LOADING...';

        var downloadPromise = fetch(filePath).then(function(r) { return r.blob(); }).then(function(blob) { return new File([blob], filename, {type:'application/octet-stream'}); });

        downloadPromise.then(function(file) {
          _showOscpMetaFromFile(file, function() {
            if (typeof loadPreset === 'function') loadPreset(file);
          });
        }).catch(function(){ alert('Could not load preset: ' + filename); });
      });
    };

    var _PL = window.SIRENOSC_PRESETS;
    if (menuPresetList && _PL && _PL.fromJson) {
      try {
        menuPresetList.innerHTML = '';
        var _seen = {};
        [_PL.default].concat(_PL.list).forEach(function(p) {
          var key = p.file.toLowerCase(); if (_seen[key]) return; _seen[key] = 1;
          var it = document.createElement('div');
          it.className = 'menu-preset-item';
          it.setAttribute('data-file', 'presets/' + p.file);
          it.setAttribute('data-filename', p.file);
          it.appendChild(document.createTextNode(p.name));
          if (!p.available) {
            it.classList.add('preset-unavailable');
            it.setAttribute('aria-disabled', 'true');
            var soon = document.createElement('span');
            soon.className = 'preset-soon';
            soon.textContent = 'coming soon';
            it.appendChild(soon);
          }
          menuPresetList.appendChild(it);
        });
      } catch (e) { console.warn('Preset list build failed:', e); }
    } else {
      try {
        if (menuPresetList && typeof BUILTIN_PRESETS !== 'undefined') {
          Object.keys(BUILTIN_PRESETS).sort(function(a, b) { return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}); }).forEach(function(fn) {
            if (!BUILTIN_PRESETS[fn] || menuPresetList.querySelector('.menu-preset-item[data-filename="' + fn.replace(/"/g, '') + '"]')) return;
            var it = document.createElement('div');
            it.className = 'menu-preset-item';
            it.setAttribute('data-file', 'presets/' + fn);
            it.setAttribute('data-filename', fn);
            it.textContent = fn.replace(/\.oscp$/i, '').replace(/[_-]+/g, ' ').trim();
            menuPresetList.appendChild(it);
          });
        }
      } catch (e) { console.warn('Preset list build failed:', e); }
    }
    document.querySelectorAll('.menu-preset-item').forEach(function(it) { if (!it.classList.contains('preset-unavailable')) _wirePresetItem(it); });
  })();


  (function() {
    var DEFAULT_FILENAME = (window.SIRENOSC_PRESETS && window.SIRENOSC_PRESETS.default.file) || 'default.oscp';
    var _pwDone = window._pwBegin ? window._pwBegin() : function(){};
    try {
      if (localStorage.getItem('sirenosc_settings')) {
        _pwDone(); return;
      }
    } catch (e) {  }
    function _tryAutoLoad(attemptsLeft) {
      if (typeof JSZip === 'undefined' || typeof BUILTIN_PRESETS === 'undefined') {
        if (attemptsLeft <= 0) { _pwDone(); return; }
        setTimeout(function() { _tryAutoLoad(attemptsLeft - 1); }, 100);
        return;
      }
      var _dp = (typeof getBuiltinPreset === 'function') ? getBuiltinPreset(DEFAULT_FILENAME) : null;
      var b64 = _dp && _dp.b64;
      if (!b64) { _pwDone(); return; }
      try {
        var binary = safeAtob(b64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], {type:'application/octet-stream'});
        var file = new File([blob], _dp.file, {type:'application/octet-stream'});
        if (typeof loadPreset === 'function') {
          loadPreset(file).then(function() {
            var item = document.querySelector('.menu-preset-item[data-file="presets/' + DEFAULT_FILENAME + '"]');
            if (item) item.classList.add('active-preset');
          }).catch(function(){}).then(_pwDone);
        } else { _pwDone(); }
      } catch (e) { console.error('Default preset auto-load failed:', e); _pwDone(); }
    }
    _tryAutoLoad(100);
  })();

  var _importPendingFile = null;

  function _populateOscpMeta(file) {
    if (typeof JSZip === 'undefined') return;
    JSZip.loadAsync(file).then(function(zip) {
      var mf = zip.file('main.json');
      if (!mf) return;
      return mf.async('string').then(function(text) {
        try {
          var d = JSON.parse(text);
          var set = function(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = val || '—';
          };
          set('importMetaModel',   d.presetModel);
          set('importMetaSeries',  d.presetSeries);
          set('importMetaMfg',     d.presetManufacturer);
          set('importMetaCreator', d.presetCreator);
          set('importMetaDesc',    d.presetDescription);
          set('importMetaVersion', d.version);
          _setDerivedFromCell('importMetaDerivedFrom', d.presetDerivedFrom);
          var panel = document.getElementById('importOscpMeta');
          if (panel) panel.classList.add('show');
        } catch(e) {}
      });
    }).catch(function(){});
  }

  function _showOscpMetaFromFile(file, cb) {
    ['importMetaModel','importMetaSeries','importMetaMfg','importMetaCreator','importMetaDesc','importMetaDerivedFrom','importMetaVersion'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.textContent = '—';
    });
    var panel = document.getElementById('importOscpMeta');
    if (panel) panel.classList.remove('show');
    var fnEl = document.getElementById('importOscpFileName');
    if (fnEl) fnEl.textContent = ''; fnEl.insertAdjacentHTML('beforeend','<svg class="si" aria-hidden="true"><use href="#si-check"/></svg> '); fnEl.appendChild(document.createTextNode(file.name));
    _populateOscpMeta(file);
    _importPendingFile = file;
    _importPresetMode = true;
    _importPresetCallback = cb;
    openPopup('importOscpPopup');
    _syncImportPopupMode();
  }

  var _importPresetMode = false;
  var _importPresetCallback = null;

  function _syncImportPopupMode() {
    var list = document.getElementById('importOscpList');
    var cbActions = document.querySelector('#importOscpPopup .mfile-cb-actions');
    var confirmBtn = document.getElementById('importOscpConfirm');
    if (_importPresetMode) {
      if (list) list.style.display = '';
      if (cbActions) cbActions.style.display = '';
      if (confirmBtn) confirmBtn.textContent = 'LOAD';
    } else {
      if (list) list.style.display = '';
      if (cbActions) cbActions.style.display = '';
      if (confirmBtn) confirmBtn.textContent = 'IMPORT';
    }
  }

  document.getElementById('menuImportOSCP').addEventListener('click', function() {
    _importPendingFile = null;
    _importPresetMode = false;
    _importPresetCallback = null;
    document.getElementById('importOscpFileName').textContent = '';
    ['importMetaModel','importMetaSeries','importMetaMfg','importMetaCreator','importMetaDesc','importMetaDerivedFrom','importMetaVersion'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.textContent = '—';
    });
    var panel = document.getElementById('importOscpMeta');
    if (panel) panel.classList.remove('show');
    openPopup('importOscpPopup');
    _syncImportPopupMode();
  });
  document.getElementById('importSelectAll').addEventListener('click', function() {
    document.querySelectorAll('.import-json-cb').forEach(function(cb) { cb.checked = true; });
  });
  document.getElementById('importUnselectAll').addEventListener('click', function() {
    document.querySelectorAll('.import-json-cb').forEach(function(cb) { cb.checked = false; });
  });
  document.getElementById('importOscpChooseFile').addEventListener('click', function() {
    document.getElementById('importOscpFileInput').click();
  });
  document.getElementById('importOscpFileInput').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    _importPendingFile = file;
    _importPresetMode = false;
    (function(el){ el.textContent=''; el.insertAdjacentHTML('beforeend','<svg class="si" aria-hidden="true"><use href="#si-check"/></svg> '); el.appendChild(document.createTextNode(file.name)); })(document.getElementById('importOscpFileName'));
    ['importMetaModel','importMetaSeries','importMetaMfg','importMetaCreator','importMetaDesc','importMetaDerivedFrom','importMetaVersion'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.textContent = '—';
    });
    var panel = document.getElementById('importOscpMeta');
    if (panel) panel.classList.remove('show');
    _populateOscpMeta(file);
    e.target.value = '';
    _syncImportPopupMode();
  });
  document.getElementById('importOscpCancel').addEventListener('click', function() {
    _importPendingFile = null;
    _importPresetMode = false;
    _importPresetCallback = null;
    closePopup('importOscpPopup');
  });
  document.getElementById('importOscpConfirm').addEventListener('click', function() {
    if (_importPresetMode && typeof _importPresetCallback === 'function') {
      var cb = _importPresetCallback;
      _importPresetMode = false;
      _importPresetCallback = null;
      _importPendingFile = null;
      closePopup('importOscpPopup');
      cb();
      return;
    }
    if (!_importPendingFile) {
      alert('Please choose an .oscp file first.');
      return;
    }
    var selectedJsons = [];
    document.querySelectorAll('.import-json-cb:checked').forEach(function(cb) {
      selectedJsons.push(cb.getAttribute('data-json'));
    });
    if (selectedJsons.length === 0) {
      alert('Select at least one section to import.');
      return;
    }
    closePopup('importOscpPopup');
    if (typeof JSZip === 'undefined') {
      alert('JSZip still loading. Please wait and try again.');
      return;
    }
    var file = _importPendingFile;
    _importPendingFile = null;
    if (window._docTabs && typeof window._docTabs.importFile === 'function') {
      var _st = document.getElementById('statusTxt');
      if (_st) _st.textContent = 'IMPORTING…';
      window._docTabs.importFile(file, selectedJsons).then(function() {
        if (_st) { _st.textContent = 'IMPORTED'; setTimeout(function(){ _st.textContent = 'IDLE'; }, 2000); }
      }).catch(function(e) {
        console.error('[Import OSCP]', e);
        if (_st) _st.textContent = 'IDLE';
        alert('Failed to import .oscp file: ' + (e && e.message || e));
      });
      return;
    }
    JSZip.loadAsync(file).then(function(zip) {
      var statusEl = document.getElementById('statusTxt');
      if (statusEl) statusEl.textContent = 'IMPORTING…';

      var applyMap = {
        'main.json':        typeof applyMainData       === 'function' ? applyMainData       : null,
        'functions.json':   typeof applyFunctionsData  === 'function' ? applyFunctionsData  : null,
        'controls.json':    typeof applyControlsData   === 'function' ? applyControlsData   : null,
        'controller.json':  typeof applyControllerData === 'function' ? applyControllerData : null,
        'settings.json':    typeof applySettingsData   === 'function' ? applySettingsData   : null,
        'timbre.json':      typeof applyTimbreData     === 'function' ? applyTimbreData     : null,
        'oscillators.json': typeof applyOscillatorsData=== 'function' ? applyOscillatorsData: null,
        'diagram.json':     typeof applyDiagramData    === 'function' ? applyDiagramData    : null,
        'effects.json':     typeof applyEffectsData    === 'function' ? applyEffectsData    : null,
        'blower.json':      typeof applyBlowerData     === 'function' ? applyBlowerData     : null,
        'rotation.json':    typeof applyRotationData   === 'function' ? applyRotationData   : null,
        'constants.json':   typeof applyConstantsData  === 'function' ? applyConstantsData  : null,
        'posfx.json':       typeof applyPosFxData      === 'function' ? applyPosFxData      : null,
        'rotorconfig.json': applyRotorConfigData,
        'customfns.json':   function(data) {
          if (typeof window._oscpApplyCustomFnsData === 'function') window._oscpApplyCustomFnsData(data);
        },
      };

      var orderedJsons = selectedJsons.slice().sort(function(a, b) {
        if (a === 'customfns.json') return -1;
        if (b === 'customfns.json') return 1;
        return 0;
      });
      var chain = Promise.resolve();
      orderedJsons.forEach(function(name) {
        chain = chain.then(function() {
          var zf = zip.file(name);
          if (!zf) return;
          var fn = applyMap[name];
          if (!fn) return;
          return zf.async('string').then(function(text) {
            try { fn(JSON.parse(text)); } catch(e) { console.warn('[Import] Failed applying', name, e); }
          });
        });
      });
      return chain;
    }).then(function() {
      var statusEl = document.getElementById('statusTxt');
      if (statusEl) { statusEl.textContent = 'IMPORTED'; setTimeout(function(){ statusEl.textContent = 'IDLE'; }, 2000); }
    }).catch(function(e) {
      console.error('[Import OSCP]', e);
      alert('Failed to read .oscp file: ' + e.message);
    });
  });

  var oldFLI = document.getElementById('fileLoadInput');
  if (oldFLI) {
    oldFLI.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (file && typeof loadPreset === 'function') loadPreset(file);
      e.target.value = '';
    });
  }

  document.getElementById('menuSaveOSCP').addEventListener('click', function() {
    var m = document.getElementById('ePresetModel');
    var mfg = document.getElementById('ePresetMfg');
    var sr = document.getElementById('ePresetSeries');
    var cr = document.getElementById('ePresetCreator');
    var ds = document.getElementById('ePresetDesc');
    if (m) document.getElementById('saveOscpModel').value = m.value;
    if (mfg) _setSaveOscpMfgValue(mfg.value);
    if (sr) document.getElementById('saveOscpSeries').value = sr.value;
    if (cr) document.getElementById('saveOscpAuthor').value = cr.value;
    if (ds) document.getElementById('saveOscpDesc').value = ds.value;
    openPopup('saveOscpPopup');
  });

  document.getElementById('saveSelectAll').addEventListener('click', function() {
    document.querySelectorAll('.save-json-cb:not([disabled])').forEach(function(cb) { cb.checked = true; });
  });
  document.getElementById('saveUnselectAll').addEventListener('click', function() {
    document.querySelectorAll('.save-json-cb:not([disabled])').forEach(function(cb) { cb.checked = false; });
  });
  document.getElementById('saveOscpCancel').addEventListener('click', function() {
    closePopup('saveOscpPopup');
  });
  document.getElementById('saveOscpConfirm').addEventListener('click', function() {
    closePopup('saveOscpPopup');
    _buildOscpZip(true).then(function(result) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(result.blob);
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      var statusEl = document.getElementById('statusTxt');
      if (statusEl) { statusEl.textContent = 'DOWNLOADING'; setTimeout(function(){ statusEl.textContent = 'IDLE'; }, 2000); }
    }).catch(function(err) {
      if (err && err.message !== '__jszip_loading__') alert('Could not build preset: ' + err.message);
    });
  });

  (function() {
    var $ = function(id) { return document.getElementById(id); };
    var macros = [];
    var picked = null;
    var MAX_LEN = 600;
    var KINDS = {
      switch:'latch', toggle:'latch', slideswitch:'latch', breaker:'latch',
      circle:'button', squarebtn:'button', square:'button', artimer:'button',
      selector:'selector', pot:'pot'
    };
    var TYPE_NAMES = {
      switch:'Switch', toggle:'Toggle', slideswitch:'Slide Switch', breaker:'Breaker',
      circle:'Round Button', squarebtn:'Square Button', square:'PCB Button', artimer:'AR Timer Button',
      selector:'Selector', pot:'Potentiometer'
    };

    function lenSeconds() {
      var m = Math.max(0, parseInt($('mp3LenMin').value, 10) || 0);
      var s = Math.max(0, parseInt($('mp3LenSec').value, 10) || 0);
      return Math.min(MAX_LEN, Math.max(1, m * 60 + s));
    }
    function fmt(t) { return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
    function setLen(t) {
      t = Math.min(MAX_LEN, Math.max(1, t));
      $('mp3LenMin').value = Math.floor(t / 60);
      $('mp3LenSec').value = t % 60;
      $('mp3LenTotal').textContent = fmt(t);
    }
    function syncLen() { $('mp3LenTotal').textContent = fmt(lenSeconds()); }

    function elements() {
      var d = (typeof window._getControllerEditorData === 'function') ? window._getControllerEditorData() : null;
      var comps = (d && d.comps) || [];
      return comps.filter(function(c) { return KINDS[c.type]; }).map(function(c) {
        var cd = c.d || {};
        return { id: c.id, type: c.type, kind: KINDS[c.type],
                 label: (c.label && String(c.label).trim()) || (TYPE_NAMES[c.type] + ' #' + c.id),
                 n: Math.max(2, parseInt(cd.n, 10) || 2),
                 min: isFinite(+cd.min) ? +cd.min : 0, max: isFinite(+cd.max) ? +cd.max : 100 };
      });
    }
    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

    function renderMacros() {
      var box = $('mp3MacroList');
      if (!macros.length) { box.innerHTML = '<div class="mp3-macro-empty">NO MACROS.</div>'; return; }
      box.innerHTML = macros.map(function(m, i) {
        return '<div class="mp3-macro-row"><span class="mp3-macro-name">' + esc(m.label) + '</span>' +
               '<span class="mp3-macro-type">' + esc(TYPE_NAMES[m.type]) + '</span>' +
               '<span class="mp3-macro-state">' + esc(m.text) + '</span>' +
               '<button type="button" class="mp3-macro-x" data-i="' + i + '" title="Remove"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></button></div>';
      }).join('');
    }

    function renderPicker() {
      var els = elements(), list = $('mp3PickerList');
      if (!els.length) {
        list.innerHTML = '<div class="mp3-macro-empty">NO CONTROLLER ELEMENTS FOUND. ADD SWITCHES, BUTTONS, SELECTORS OR POTS IN THE CONTROLLER SECTION FIRST.</div>';
        return;
      }
      list.innerHTML = els.map(function(e) {
        return '<div class="mp3-pick-row' + (picked && picked.id === e.id ? ' sel' : '') + '" data-id="' + e.id + '">' +
               '<span>' + esc(e.label) + '</span><span class="t">' + esc(TYPE_NAMES[e.type]) + '</span></div>';
      }).join('');
      list.querySelectorAll('.mp3-pick-row').forEach(function(row) {
        row.addEventListener('click', function() {
          var id = +row.getAttribute('data-id');
          picked = els.filter(function(e) { return e.id === id; })[0] || null;
          renderPicker(); renderStateBox();
        });
      });
    }

    function renderStateBox() {
      var box = $('mp3StateBox'), add = $('mp3PickerAdd');
      if (!picked) { box.className = ''; box.innerHTML = ''; add.disabled = true; return; }
      var h = '<span style="color:var(--muted);letter-spacing:1.5px">2. Hold it at</span>';
      if (picked.kind === 'latch') {
        h += '<select id="mp3StateVal"><option value="1">ON</option><option value="0">OFF</option></select>';
      } else if (picked.kind === 'button') {
        h += '<select id="mp3StateVal"><option value="1">PRESSED (HELD)</option><option value="0">RELEASED</option></select>';
      } else if (picked.kind === 'selector') {
        var o = ''; for (var i = 1; i <= picked.n; i++) o += '<option value="' + i + '">POSITION ' + i + '</option>';
        h += '<select id="mp3StateVal">' + o + '</select>';
      } else {
        h += '<input type="range" id="mp3StateVal" min="0" max="100" step="1" value="50"><span id="mp3StateOut" style="min-width:34px;text-align:right">50%</span>';
      }
      box.innerHTML = h; box.className = 'show'; add.disabled = false;
      if (picked.kind === 'pot') {
        $('mp3StateVal').addEventListener('input', function() { $('mp3StateOut').textContent = this.value + '%'; });
      }
    }

    function openPicker() { picked = null; $('mp3Picker').className = 'show'; renderPicker(); renderStateBox(); $('mp3Picker').scrollIntoView({block:'nearest'}); }
    function closePicker() { picked = null; $('mp3Picker').className = ''; }

    function addMacro() {
      if (!picked) return;
      var v = $('mp3StateVal').value, text, state;
      if (picked.kind === 'latch') { state = v === '1'; text = state ? 'ON' : 'OFF'; }
      else if (picked.kind === 'button') { state = v === '1'; text = state ? 'PRESSED' : 'RELEASED'; }
      else if (picked.kind === 'selector') { state = +v; text = 'POS ' + v; }
      else { state = +v; text = v + '%'; }
      var entry = { id: picked.id, type: picked.type, kind: picked.kind, label: picked.label, state: state, text: text };
      var idx = macros.map(function(m) { return m.id; }).indexOf(picked.id);
      if (idx >= 0) macros[idx] = entry; else macros.push(entry);
      renderMacros(); closePicker();
    }

    function fillMfg() {
      var src = $('saveOscpMfgSelect'), sel = $('mp3MfgSelect');
      if (src && !sel.options.length) sel.innerHTML = src.innerHTML;
    }
    function setMfg(val) {
      var sel = $('mp3MfgSelect'), other = $('mp3MfgOther');
      var known = Array.prototype.some.call(sel.options, function(o) { return o.value === val; });
      if (val && known) { sel.value = val; other.style.display = 'none'; other.value = ''; }
      else if (val) { sel.value = '__other__'; other.style.display = ''; other.value = val; }
      else { sel.value = ''; other.style.display = 'none'; other.value = ''; }
    }
    function getMfg() { return $('mp3MfgSelect').value === '__other__' ? $('mp3MfgOther').value.trim() : $('mp3MfgSelect').value; }

    function fillChains() {
      var sel = $('mp3FxChain'), src = $('fcSelect'), keep = sel.value;
      var h = '<option value="">CURRENT EFFECTS (AS IS)</option>';
      if (src) Array.prototype.forEach.call(src.options, function(o) {
        if (o.value) h += '<option value="' + esc(o.value) + '">' + esc(o.textContent) + '</option>';
      });
      sel.innerHTML = h;
      sel.value = keep; if (sel.value !== keep) sel.value = '';
    }

    function setStatus(t) { $('mp3Status').textContent = t || ''; }

    $('mp3MfgSelect').addEventListener('change', function() {
      var other = $('mp3MfgOther');
      if (this.value === '__other__') other.style.display = ''; else { other.style.display = 'none'; other.value = ''; }
    });
    $('mp3LenMin').addEventListener('input', syncLen);
    $('mp3LenSec').addEventListener('input', syncLen);
    $('mp3LenMin').addEventListener('change', function() { setLen(lenSeconds()); });
    $('mp3LenSec').addEventListener('change', function() { setLen(lenSeconds()); });
    document.querySelectorAll('#exportMp3Popup [data-mp3len]').forEach(function(b) {
      b.addEventListener('click', function() { setLen(+b.getAttribute('data-mp3len')); });
    });
    $('mp3AddMacro').addEventListener('click', openPicker);
    $('mp3PickerAdd').addEventListener('click', addMacro);
    $('mp3PickerCancel').addEventListener('click', closePicker);
    $('mp3ClearMacros').addEventListener('click', function() { macros = []; renderMacros(); });
    $('mp3MacroList').addEventListener('click', function(e) {
      var x = e.target.closest ? e.target.closest('.mp3-macro-x') : null;
      if (!x) return;
      macros.splice(+x.getAttribute('data-i'), 1); renderMacros();
    });

    $('menuExportMP3').addEventListener('click', function() {
      var g = function(id) { var e = $(id); return e ? e.value : ''; };
      fillMfg(); fillChains(); closePicker(); setStatus('');
      $('mp3Model').value = g('ePresetModel');
      $('mp3Series').value = g('ePresetSeries');
      setMfg(g('ePresetMfg'));
      $('mp3Author').value = g('ePresetCreator');
      $('mp3Desc').value = g('ePresetDesc');
      var ids = elements().map(function(e) { return e.id; });
      macros = macros.filter(function(m) { return ids.indexOf(m.id) >= 0; });
      renderMacros(); syncLen();
      openPopup('exportMp3Popup');
    });
    $('exportMp3Cancel').addEventListener('click', function() { closePopup('exportMp3Popup'); });

    $('exportMp3Confirm').addEventListener('click', function() {
      var cfg = window._mp3ExportConfig = {
        meta: { model: $('mp3Model').value.trim(), series: $('mp3Series').value.trim(), manufacturer: getMfg(),
                author: $('mp3Author').value.trim(), description: $('mp3Desc').value.trim() },
        lengthSeconds: lenSeconds(),
        kbps: parseInt($('mp3Bitrate').value, 10) || 192,
        fxChain: $('mp3FxChain').value,
        macros: macros.map(function(m) { return { id: m.id, type: m.type, kind: m.kind, state: m.state }; })
      };
      if (typeof window._mp3Run !== 'function') { setStatus('EXPORT ENGINE NOT LOADED.'); return; }
      if (window._mp3Busy) { setStatus('AN EXPORT IS ALREADY RUNNING.'); return; }
      window._mp3Run(cfg);
    });

    renderMacros();
  })();

  (function() {
    var $ = function(id) { return document.getElementById(id); };
    window._mp3Busy = false;

    function id3Tag(meta) {
      function u16(str) { var a = [0xFF, 0xFE]; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); a.push(c & 255, c >> 8); } return a; }
      function frame(id, body) { var n = body.length; return [id.charCodeAt(0), id.charCodeAt(1), id.charCodeAt(2), id.charCodeAt(3), (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, 0, 0].concat(body); }
      function text(id, v) { return v ? frame(id, [1].concat(u16(v))) : []; }
      var f = [].concat(text('TIT2', meta.title), text('TPE1', meta.artist), text('TALB', meta.album), text('TPUB', meta.publisher), text('TENC', 'SirenOsc'),
        meta.comment ? frame('COMM', [1, 101, 110, 103, 0xFF, 0xFE, 0, 0].concat(u16(meta.comment))) : []);
      var n = f.length;
      return new Uint8Array([73, 68, 51, 3, 0, 0, (n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127].concat(f));
    }

    function workerMain() {
      var enc = null, parts = [], total = 0;
      function toI16(f) { var o = new Int16Array(f.length); for (var i = 0; i < f.length; i++) { var v = f[i]; if (v !== v) v = 0; v = v < -1 ? -1 : (v > 1 ? 1 : v); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; }
      function keep(b) { if (b && b.length) { var c = new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); parts.push(c); total += c.length; } }
      self.onmessage = function(e) {
        var m = e.data;
        try {
          if (m.cmd === 'init') { enc = new lamejs.Mp3Encoder(2, m.sr, m.kbps); parts = []; total = 0; }
          else if (m.cmd === 'chunk') {
            var l = toI16(m.l), r = toI16(m.r);
            for (var i = 0; i < l.length; i += 1152) keep(enc.encodeBuffer(l.subarray(i, i + 1152), r.subarray(i, i + 1152)));
            self.postMessage({ cmd: 'prog', n: l.length });
          } else if (m.cmd === 'finish') {
            keep(enc.flush());
            var out = new Uint8Array(total), p = 0;
            parts.forEach(function(a) { out.set(a, p); p += a.length; });
            self.postMessage({ cmd: 'done', data: out.buffer }, [out.buffer]);
          }
        } catch (err) { self.postMessage({ cmd: 'error', msg: String((err && err.message) || err) }); }
      };
    }

    function makeWorker() {
      var src = SIRENOSC_ASSETS["vendor.lamejs"] + '\n;(' + workerMain.toString() + ')();';
      var url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
      var w = new Worker(url); URL.revokeObjectURL(url); return w;
    }
    function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
    function real(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
    var _mc = new MessageChannel(), _mcq = [];
    _mc.port1.onmessage = function() { var f = _mcq.shift(); if (f) f(); };
    function nativeTimeout(ms, fn) {
      var tw = null, done = false;
      try {
        var u = URL.createObjectURL(new Blob(['onmessage=function(e){setTimeout(function(){postMessage(1)},e.data)}'], { type: 'application/javascript' }));
        tw = new Worker(u); URL.revokeObjectURL(u);
        tw.onmessage = function() { if (!done) { done = true; tw.terminate(); fn(); } };
        tw.postMessage(ms);
      } catch (e) {}
      return { cancel: function() { done = true; try { if (tw) tw.terminate(); } catch (e) {} } };
    }
    function yieldUI() { return new Promise(function(r) { _mcq.push(r); _mc.port2.postMessage(0); }); }
    function bar(txt, frac) {
      $('mp3ExpTxt').textContent = txt;
      $('mp3ExpFill').style.width = Math.round(Math.max(0, Math.min(1, frac || 0)) * 100) + '%';
    }
    var _pop = function() { return $('exportMp3Popup'); }, _box = function() { return _pop().querySelector('.mfile-popup-box'); };
    function showProgress() {
      var b = _box(); b.classList.remove('finished'); b.classList.add('exporting');
      _box().querySelector('.mfile-popup-title').textContent = 'EXPORTING';
      _pop().style.zIndex = '10020';
      if (typeof openPopup === 'function') openPopup('exportMp3Popup');
      bar('PREPARING', 0);
    }
    function showForm(msg) {
      var b = _box(); b.classList.remove('exporting', 'finished');
      b.querySelector('.mfile-popup-title').textContent = 'EXPORT MP3';
      _pop().style.zIndex = '10010';
      $('mp3Status').textContent = msg || '';
    }
    function showFinished(txt) {
      _box().classList.add('finished');
      _box().querySelector('.mfile-popup-title').textContent = 'EXPORT FINISHED';
      bar(txt, 1);
    }
    $('mp3ExpClose').addEventListener('click', function() { showForm(''); if (typeof closePopup === 'function') closePopup('exportMp3Popup'); });

    async function currentStateBlob() {
      var cbs = Array.prototype.slice.call(document.querySelectorAll('.save-json-cb:not([disabled])')), was = cbs.map(function(c) { return c.checked; });
      cbs.forEach(function(c) { c.checked = true; });
      try { return (await _buildOscpZip(false)).blob; }
      finally { cbs.forEach(function(c, i) { c.checked = was[i]; }); }
    }

    window._mp3Run = async function(cfg) {
      if (window._mp3Busy) return;
      window._mp3Busy = true;
      var cancelled = false, iframe = null, w = null, CANCEL = { cancelled: true }, rejectRun = null, onMsg = null, helloT = null;
      var frozeLive = false, finishedOk = false;
      $('mp3Block').style.display = 'block';
      showProgress();
      $('mp3ExpCancel').onclick = function() { cancelled = true; if (rejectRun) rejectRun(CANCEL); };
      function chk() { if (cancelled) throw CANCEL; }
      function dropCopy() {
        if (helloT) { helloT.cancel(); helloT = null; }
        if (onMsg) { window.removeEventListener('message', onMsg); onMsg = null; }
        try { if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (e) {}
        iframe = null;
      }

      try {
        bar('PREPARING', 0);
        var sr = (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.sampleRate >= 8000 && audioCtx.sampleRate <= 48000) ? audioCtx.sampleRate : 48000;
        var frames = Math.round(cfg.lengthSeconds * sr);

        if (typeof window._simSetPaused === 'function' && !window._simPaused) { window._simSetPaused(true, true); frozeLive = true; }
        await yieldUI(); chk();

        var preset = await (await currentStateBlob()).arrayBuffer(); chk();

        iframe = document.createElement('iframe');
        iframe.name = 'sirenosc-mp3-vt:' + encodeURIComponent(JSON.stringify({ sr: sr, frames: frames }));
        iframe.setAttribute('aria-hidden', 'true'); iframe.tabIndex = -1;
        iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;border:0;visibility:hidden;pointer-events:none';
        var res = await new Promise(function(resolve, reject) {
          rejectRun = reject;
          helloT = nativeTimeout(60000, function() { reject(new Error('The hidden renderer did not start. If this page is embedded in another site or served with frame-blocking headers, it cannot load a copy of itself.')); });
          onMsg = function(e) {
            if (!iframe || e.source !== iframe.contentWindow) return;
            var m = e.data || {};
            if (m.t === 'hello') {
              if (helloT) { helloT.cancel(); helloT = null; }
              iframe.contentWindow.postMessage({ t: 'job', job: {
                preset: preset, fxChain: cfg.fxChain || '', macros: cfg.macros || [],
                fxDisabled: (typeof _fxDisabled !== 'undefined') && !!_fxDisabled } }, '*', [preset]);
            }
            else if (m.t === 'prog') bar(m.txt, m.frac);
            else if (m.t === 'done') resolve(m);
            else if (m.t === 'error') reject(new Error(m.msg));
          };
          window.addEventListener('message', onMsg);
          iframe.src = location.href.split('#')[0].split('?')[0];
          document.body.appendChild(iframe);
        });
        dropCopy();
        console.info('[Export MP3] rendered ' + (frames / sr).toFixed(1) + ' s of audio in ' + res.secs.toFixed(1) + ' s');

        var L = res.l, R = res.r, n = L.length;
        var encoded = new Promise(function(rs, rj) {
          w = makeWorker();
          var got = 0;
          w.onmessage = function(e) {
            var m = e.data;
            if (m.cmd === 'prog') { got += m.n; bar('ENCODING ' + Math.round(got / n * 100) + '%', got / n); }
            else if (m.cmd === 'done') rs(new Uint8Array(m.data));
            else if (m.cmd === 'error') rj(new Error(m.msg));
          };
          w.onerror = function(e) { rj(new Error('Encoder failed: ' + (e && e.message || 'unknown'))); };
        });
        encoded.catch(function() {});
        bar('ENCODING 0%', 0);
        w.postMessage({ cmd: 'init', sr: sr, kbps: cfg.kbps || 192 });
        for (var off = 0; off < n; off += 65536) {
          chk();
          var a = L.slice(off, off + 65536), b = R.slice(off, off + 65536);
          w.postMessage({ cmd: 'chunk', l: a, r: b }, [a.buffer, b.buffer]);
          if ((off / 65536) % 8 === 7) await yieldUI();
        }
        res = L = R = null;
        w.postMessage({ cmd: 'finish' });
        var mp3 = await encoded; w.terminate(); w = null;
        var m = cfg.meta || {};
        var tag = id3Tag({ title: m.model || 'SirenOsc Recording', artist: m.author, album: m.series, publisher: m.manufacturer, comment: m.description });
        var out = new Blob([tag, mp3], { type: 'audio/mpeg' });
        var nameBase = [m.model, m.series].filter(Boolean).join(' ').replace(/[^\w\- .]+/g, '_').trim() || 'SirenOsc';
        var a2 = document.createElement('a');
        a2.href = URL.createObjectURL(out); a2.download = nameBase + '.mp3';
        document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
        setTimeout(function() { URL.revokeObjectURL(a2.href); }, 10000);
        showFinished('FINISHED. MP3 SAVED (' + (out.size / 1048576).toFixed(1) + ' MB)');
        finishedOk = true;
      } catch (err) {
        if (err !== CANCEL) { console.error('[Export MP3]', err); showForm('EXPORT FAILED: ' + (err && err.message || err)); }
        else showForm('EXPORT CANCELLED.');
      } finally {
        dropCopy();
        try { if (w) w.terminate(); } catch (e) {}
        $('mp3Block').style.display = 'none';
        if (frozeLive) { try { window._simSetPaused(false); } catch (e) {} }
        window._mp3Busy = false;
      }
    };
  })();

  function _buildOscpZip(fromSaveDialog) {
    return new Promise(function(resolve, reject) {
      if (typeof JSZip === 'undefined') {
        alert('JSZip still loading. Please wait and try again.');
        reject(new Error('__jszip_loading__'));
        return;
      }

      var selectedJsons = ['main.json'];
      document.querySelectorAll('.save-json-cb:checked:not([disabled])').forEach(function(cb) {
        var name = cb.getAttribute('data-json');
        if (name !== 'main.json') selectedJsons.push(name);
      });

      var m = document.getElementById('ePresetModel');
      var mfg = document.getElementById('ePresetMfg');
      var sr = document.getElementById('ePresetSeries');
      var cr = document.getElementById('ePresetCreator');
      var ds = document.getElementById('ePresetDesc');

      if (fromSaveDialog) {
        var savedModelVal = document.getElementById('saveOscpModel').value || 'preset';
        var savedAuthorVal = document.getElementById('saveOscpAuthor').value || '';
        if (m) m.value = savedModelVal;
        if (mfg) mfg.value = _saveOscpMfgValue();
        if (sr) sr.value = document.getElementById('saveOscpSeries').value;
        if (cr) cr.value = savedAuthorVal;
        if (ds) ds.value = document.getElementById('saveOscpDesc').value;
      }

      var modelVal = (m && m.value) || 'preset';
      var authorVal = (cr && cr.value) || '';

      var gatherMap = {
        'main.json':        typeof gatherMainData        === 'function' ? gatherMainData        : null,
        'functions.json':   typeof gatherFunctionsData   === 'function' ? gatherFunctionsData   : null,
        'controls.json':    typeof gatherControlsData    === 'function' ? gatherControlsDataNoCtl : null,
        'controller.json':  typeof gatherControllerData  === 'function' ? gatherControllerData  : null,
        'settings.json':    typeof gatherSettingsData    === 'function' ? gatherSettingsData    : null,
        'timbre.json':      typeof gatherTimbreData      === 'function' ? gatherTimbreData      : null,
        'oscillators.json': typeof gatherOscillatorsData === 'function' ? gatherOscillatorsData : null,
        'diagram.json':     typeof gatherDiagramData     === 'function' ? gatherDiagramData     : null,
        'effects.json':     typeof gatherEffectsData     === 'function' ? gatherEffectsData     : null,
        'blower.json':      typeof gatherBlowerData      === 'function' ? gatherBlowerData      : null,
        'rotation.json':    typeof gatherRotationData    === 'function' ? gatherRotationData    : null,
        'constants.json':   typeof gatherConstantsData   === 'function' ? gatherConstantsData   : null,
        'posfx.json':       typeof gatherPosFxData       === 'function' ? gatherPosFxData       : null,
        'rotorconfig.json': gatherRotorConfigData,
        'customfns.json':   function() {
          return (typeof window._oscpGetCustomFnsData === 'function')
            ? window._oscpGetCustomFnsData()
            : { customFns: [], nameOverrides: {} };
        },
      };

      var zip = new JSZip();
      var userFolder = zip.folder('user');
      selectedJsons.forEach(function(name) {
        var fn = gatherMap[name];
        if (fn) zip.file(name, JSON.stringify(fn(), null, 2));
      });

      var includeEffects = selectedJsons.indexOf('effects.json') !== -1;
      var includeBlower  = selectedJsons.indexOf('blower.json')  !== -1;
      function tryWav(buf, name) {
        if (!buf) return;
        try { userFolder.file(name, (typeof _audioBufferToWav === 'function') ? _audioBufferToWav(buf) : buf); }
        catch(e) { console.warn('[Save] Could not encode', name, e); }
      }
      if (includeEffects) {
        tryWav((typeof reverb1IRBuffer !== 'undefined') ? reverb1IRBuffer : null, 'reverb1_ir.wav');
        tryWav((typeof reverb2IRBuffer !== 'undefined') ? reverb2IRBuffer : null, 'reverb2_ir.wav');
        tryWav((typeof reverb3IRBuffer !== 'undefined') ? reverb3IRBuffer : null, 'reverb3_ir.wav');
      }
      if (includeBlower) {
        tryWav(window._daBufHum   || null, 'damper_hum.wav');
        tryWav(window._daBufOpen  || null, 'damper_open.wav');
        tryWav(window._daBufClose || null, 'damper_close.wav');
      }

      var filename = modelVal.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.oscp';
      var dfEl = document.getElementById('ePresetDerivedFrom');
      zip.generateAsync({ type: 'blob' }).then(function(blob) {
        resolve({ blob: blob, filename: filename, model: modelVal, author: authorVal, series: sr ? sr.value : '', derivedFrom: dfEl ? dfEl.value : '' });
      }).catch(reject);
    });
  }

  document.getElementById('menuReset').addEventListener('click', function() {
    closeAllMenus();
    var resetBtn = document.getElementById('btnResetSettings');
    if (resetBtn) resetBtn.click();
  });

  var effectsOn = true;
  var menuEffectsEl = document.getElementById('menuEffectsToggle');
  var menuEffectsBadge = document.getElementById('menuEffectsBadge');
  menuEffectsEl.addEventListener('click', function() {
    effectsOn = !effectsOn;
    if (menuEffectsBadge) menuEffectsBadge.textContent = effectsOn ? 'ON' : 'OFF';
    if (effectsOn) {
      if (typeof restoreAllEffects === 'function') restoreAllEffects();
    } else {
      if (typeof disableAllEffects === 'function') disableAllEffects();
    }
    try {
      var SP_KEY = 'sirenosc_ui_settings';
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      s.effectsEnabled = effectsOn;
      localStorage.setItem(SP_KEY, JSON.stringify(s));
    } catch(e) {}
    closeAllMenus();
  });
  (function syncFxMenu() {
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      if (s.effectsEnabled === false) {
        effectsOn = false;
        if (menuEffectsBadge) menuEffectsBadge.textContent = 'OFF';
      }
    } catch(e) {}
  })();

  var fastModeOn = false;
  var menuFastEl = document.getElementById('menuFastMode');
  var menuFastBadge = document.getElementById('menuFastBadge');

  function _fastModeApply() {
    if (typeof chopperAnimEnabled !== 'undefined' && chopperAnimEnabled) {
      if (typeof toggleChopperAnim === 'function') toggleChopperAnim();
    }
    if (typeof stopContactorAnim === 'function') stopContactorAnim();

    if (menuFastBadge) menuFastBadge.textContent = 'ON';
    menuFastEl.classList.add('menu-fast');
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.fastMode = true;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
  }

  function _fastModeRestore() {
    if (typeof chopperAnimEnabled !== 'undefined' && !chopperAnimEnabled) {
      if (typeof toggleChopperAnim === 'function') toggleChopperAnim();
    }
    if (typeof startContactorAnim === 'function' && typeof damperEnabled !== 'undefined' && damperEnabled) {
      var tUnd = document.getElementById('tUndulate');
      if (tUnd && tUnd.checked) startContactorAnim();
    }

    if (menuFastBadge) menuFastBadge.textContent = 'OFF';
    menuFastEl.classList.remove('menu-fast');
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.fastMode = false;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
  }

  if (menuFastEl) {
    menuFastEl.addEventListener('click', function() {
      fastModeOn = !fastModeOn;
      if (fastModeOn) {
        _fastModeApply();
      } else {
        _fastModeRestore();
      }
      closeAllMenus();
    });

    (function syncFastModeMenu() {
      try {
        var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
        if (s.fastMode === true) {
          setTimeout(function() {
            fastModeOn = true;
            _fastModeApply();
          }, 300);
        }
      } catch(e) {}
    })();
  }

  var POPUP_MAP = {
    'mpopStartup':       { key: 'startupPopups',    lsKey: 'sirenosc_intro_seen', invert: true },
    'mpopAudioTip':      { key: 'audioTipPopup',    lsKey: 'sirenosc_audio_tip_enabled', val: function(v){ return v ? '1' : '0'; } },
    'mpopUpdateNotice':  { key: 'updateNotice140',  lsKey: 'sirenosc_update_140_seen', invert: true },
    'mpopResetSuggestion':{ key: 'resetSuggestion140', lsKey: 'sirenosc_reset_sug_140_seen', invert: true },
  };
  function syncPopupMenuToggles() {
    try {
      var SP_KEY = 'sirenosc_ui_settings';
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      Object.keys(POPUP_MAP).forEach(function(id) {
        var cfg = POPUP_MAP[id];
        var el = document.getElementById(id);
        if (!el) return;
        var val = s[cfg.key];
        if (val === undefined) {
          if (cfg.invert && localStorage.getItem(cfg.lsKey)) {
            val = false;
          } else {
            val = true;
          }
        }
        el.checked = val;
      });
    } catch(e) {}
  }
  syncPopupMenuToggles();

  Object.keys(POPUP_MAP).forEach(function(id) {
    var cfg = POPUP_MAP[id];
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() {
      try {
        var SP_KEY = 'sirenosc_ui_settings';
        var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
        s[cfg.key] = el.checked;
        localStorage.setItem(SP_KEY, JSON.stringify(s));
        if (cfg.invert) {
          if (!el.checked) { localStorage.setItem(cfg.lsKey, '1'); }
          else { localStorage.removeItem(cfg.lsKey); }
        } else if (cfg.val) {
          localStorage.setItem(cfg.lsKey, cfg.val(el.checked));
        }
      } catch(e) {}
    });
  });

  document.getElementById('menuTextDebug').addEventListener('click', function() {
    closeAllMenus();
    var src = document.getElementById('dbgTypoBody');
    var dest = document.getElementById('textDebugContent');
    if (src && dest) {
      dest.innerHTML = '';
      var clone = src.cloneNode(true);
      clone.style.maxHeight = '60vh';
      clone.style.overflowY = 'auto';
      clone.style.padding = '8px 0';
      dest.appendChild(clone);
      var origSels = src.querySelectorAll('.dbg-sel');
      var cloneSels = dest.querySelectorAll('.dbg-sel');
      cloneSels.forEach(function(cloneSel, i) {
        var orig = origSels[i];
        if (!orig) return;
        cloneSel.value = orig.value;
        cloneSel.addEventListener('change', function() {
          orig.value = cloneSel.value;
          orig.dispatchEvent(new Event('change'));
        });
      });
      var cloneResetBtn = dest.querySelector('#dbgResetBtn');
      if (cloneResetBtn) {
        cloneResetBtn.id = 'dbgResetBtnClone';
        cloneResetBtn.addEventListener('click', function() {
          if (typeof window._dbgResetAll === 'function') window._dbgResetAll();
          cloneSels.forEach(function(cloneSel, i) {
            var orig = origSels[i];
            if (orig) cloneSel.value = orig.value;
          });
        });
      }
    }
    openPopup('textDebugPopup');
  });
  document.getElementById('textDebugClose').addEventListener('click', function() {
    closePopup('textDebugPopup');
  });

  document.getElementById('menuAbout').addEventListener('click', function() {
    closeAllMenus();
    openPopup('aboutPopup');
  });
  document.getElementById('btnAboutClose').addEventListener('click', function() {
    closePopup('aboutPopup');
  });
  document.getElementById('aboutPopup').addEventListener('click', function(e) {
    if (e.target === this) closePopup('aboutPopup');
  });

  document.getElementById('menuRecordMode').addEventListener('click', function() {
    closeAllMenus();
    var btn = document.getElementById('btnRecordMode');
    if (btn) btn.click();
  });

  var SCALE_STEPS = [70, 80, 90, 100, 110, 120, 130, 140, 150];
  var DEFAULT_SCALE_IDX = 3;
  var currentScaleIdx = DEFAULT_SCALE_IDX;
  var scaleValEl = document.getElementById('menuScaleVal');
  var scaleDecBtn = document.getElementById('menuScaleDec');
  var scaleIncBtn = document.getElementById('menuScaleInc');

  function applyMenuScale(idx) {
    currentScaleIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, idx));
    var pct = SCALE_STEPS[currentScaleIdx];
    if (window._applyUiZoom) window._applyUiZoom(pct); else document.body.style.zoom = (pct / 100).toFixed(2);
    if (scaleValEl) scaleValEl.textContent = pct + '%';
    if (scaleDecBtn) scaleDecBtn.disabled = (currentScaleIdx === 0);
    if (scaleIncBtn) scaleIncBtn.disabled = (currentScaleIdx === SCALE_STEPS.length - 1);
  }
  (function() {
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      if (typeof s.uiScaleIdx === 'number') {
        applyMenuScale(s.uiScaleIdx);
      } else {
        applyMenuScale(DEFAULT_SCALE_IDX);
      }
    } catch(e) { applyMenuScale(DEFAULT_SCALE_IDX); }
  })();

  if (scaleDecBtn) scaleDecBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.uiScaleIdx = currentScaleIdx - 1;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
    applyMenuScale(currentScaleIdx - 1);
  });
  if (scaleIncBtn) scaleIncBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.uiScaleIdx = currentScaleIdx + 1;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
    applyMenuScale(currentScaleIdx + 1);
  });

  var THEMES = ['classic','default','pale','army','navy','citrus','old-classic','luna','winamp','aero','metro','mica'];
  var THEME_CLASSES = THEMES.map(function(t){ return 'theme-'+t; });
  var LIGHT_THEMES = ['old-classic','luna','aero'];
  var THEME_STYLE = {luna:'glossy',winamp:'glossy',aero:'glossy',mica:'glossy','metro':'flat','old-classic':'flat'};
  var LEGACY_THEMES = {'dark-orange':'citrus','dark-gray':'pale','dark-blue':'navy','light-purple':'default','light-black':'default','light-red':'default'};
  function applyThemeClass(theme, fromUser, styleOverride) {
    if (LEGACY_THEMES[theme]) theme = LEGACY_THEMES[theme];
    if (THEMES.indexOf(theme) < 0) theme = 'default';
    document.body.classList.remove.apply(document.body.classList, THEME_CLASSES.concat(['light-mode']));
    document.body.classList.add('theme-' + theme);
    document.body.classList.toggle('is-light', LIGHT_THEMES.indexOf(theme) >= 0);
    window._ocOn = (theme === 'old-classic');
    try { if (window._hiResRefresh) window._hiResRefresh(); } catch(e) {}
    if (window._ocSweepSet) window._ocSweepSet(window._ocOn);
    window._tvCache = {};
    if (window._updateLogo) window._updateLogo();
    try { window.dispatchEvent(new Event('resize')); } catch(e) {}
    var _st = styleOverride || THEME_STYLE[theme];
    if (fromUser && _st && window._setUiStyle) window._setUiStyle(_st === 'glossy');
    document.querySelectorAll('.menu-theme-item').forEach(function(item) {
      item.classList.toggle('active-theme', item.getAttribute('data-theme') === theme);
    });
    if (window._refreshThemeStyleChecks) window._refreshThemeStyleChecks();
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.theme = theme;
      delete s.lightMode;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
  }

  window._refreshThemeStyleChecks = function() {
    var cur = '';
    THEMES.forEach(function(t) { if (document.body.classList.contains('theme-' + t)) cur = t; });
    var gl = document.documentElement.classList.contains('glossy');
    document.querySelectorAll('.menu-theme-style-item').forEach(function(it) {
      it.classList.toggle('active-style-opt', it.getAttribute('data-theme') === cur && (it.getAttribute('data-style') === 'glossy') === gl);
    });
  };
  (function() {
    var origSet = window._setUiStyle;
    window._setUiStyle = function() { var r = origSet.apply(this, arguments); window._refreshThemeStyleChecks(); return r; };
  })();

  document.querySelectorAll('.menu-style-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      window._setUiStyle(item.getAttribute('data-style')==='glossy');
      closeAllMenus();
    });
  });
  window._setUiStyle(document.documentElement.classList.contains('glossy'),true);

  function clearSubOpen() { document.querySelectorAll('.menu-theme-item.sub-open').forEach(function(x) { x.classList.remove('sub-open'); }); }
  document.querySelectorAll('.menu-theme-item').forEach(function(item) {
    var th = item.getAttribute('data-theme');
    if (!THEME_STYLE[th]) {
      var label = item.textContent;
      item.textContent = '';
      item.classList.add('has-style-sub');
      var lbl = document.createElement('span'); lbl.textContent = label;
      var arr = document.createElement('span'); arr.className = 'menu-arrow'; arr.innerHTML = '<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>';
      var sub = document.createElement('div'); sub.className = 'menu-sub menu-sub-sm';
      var ttl = document.createElement('div'); ttl.className = 'menu-sub-title'; ttl.textContent = 'STYLE';
      sub.appendChild(ttl);
      [['flat','Flat'],['glossy','Glossy']].forEach(function(o) {
        var opt = document.createElement('div');
        opt.className = 'menu-theme-style-item';
        opt.setAttribute('data-theme', th);
        opt.setAttribute('data-style', o[0]);
        opt.textContent = o[1];
        opt.addEventListener('click', function(e) {
          e.stopPropagation();
          applyThemeClass(th, true, o[0]);
          closeAllMenus(); clearSubOpen();
        });
        sub.appendChild(opt);
      });
      item.appendChild(lbl); item.appendChild(arr); item.appendChild(sub);
    }
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      if (item.classList.contains('has-style-sub')) {
        var was = item.classList.contains('sub-open');
        clearSubOpen();
        if (!was) item.classList.add('sub-open');
        return;
      }
      applyThemeClass(th, true);
      closeAllMenus(); clearSubOpen();
    });
  });

  (function() {
    var t = 'default';
    try { var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}'); if (s.theme) t = s.theme; } catch(e) {}
    applyThemeClass(t, false);
  })();

  function applyFontClass(font) {
    document.body.classList.toggle('font-open-sans', font === 'open-sans');
    document.querySelectorAll('.menu-font-item').forEach(function(item) {
      item.classList.toggle('active-font', item.getAttribute('data-font') === font);
    });
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      s.font = font;
      localStorage.setItem('sirenosc_ui_settings', JSON.stringify(s));
    } catch(e) {}
  }

  document.querySelectorAll('.menu-font-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      applyFontClass(item.getAttribute('data-font'));
      closeAllMenus();
    });
  });

  (function() {
    try {
      var s = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
      applyFontClass(s.font || 'open-sans');
    } catch(e) {
      applyFontClass('open-sans');
    }
  })();

})();
