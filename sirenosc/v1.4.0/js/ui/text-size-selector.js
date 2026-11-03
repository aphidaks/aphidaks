
(function() {
  var SIZES = [
    { label: 'Very Small',   px: 7  },
    { label: 'Small',        px: 9  },
    { label: 'Small-Medium', px: 11 },
    { label: 'Medium',       px: 13 },
    { label: 'Medium-Large', px: 15 },
    { label: 'Large',        px: 18 },
    { label: 'Very Large',   px: 22 },
    { label: 'Super Large',  px: 28 },
  ];

  var dbgSheet = document.createElement('style');
  dbgSheet.id = 'dbgTypoSheet';
  document.head.appendChild(dbgSheet);
  var ruleMap = {};

  function setRule(selector, value) {
    ruleMap[selector] = value;
    rebuildSheet();
  }
  function rebuildSheet() {
    var css = '';
    var noUppercase = ['.logo', '.popup-title'];
    Object.keys(ruleMap).forEach(function(sel) {
      if (noUppercase.indexOf(sel) !== -1) {
        css += sel + '{font-size:' + ruleMap[sel] + 'px !important}\n';
      } else {
        css += sel + '{font-size:' + ruleMap[sel] + 'px !important;text-transform:uppercase !important}\n';
      }
    });
    dbgSheet.textContent = css;
  }

  function applyInlineUppercase(px, scopeSel) {
    var scope = scopeSel ? document.querySelector(scopeSel) : document;
    if (!scope) return;
    var skip = new Set(['INPUT','SELECT','TEXTAREA','BUTTON']);
    var all = (scope.querySelectorAll || document.querySelectorAll).call(scope, '[style]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (skip.has(el.tagName)) continue;
      if (!el.style.fontSize) continue;
      var cs = window.getComputedStyle(el);
      if (cs.textTransform === 'uppercase' || el.style.textTransform === 'uppercase') {
        el.style.setProperty('font-size', px + 'px', 'important');
      }
    }
  }

  var TARGETS = {
    logo: {
      di: 5,
      apply: function(px) { setRule('.logo', px); setRule('.popup-title', px); }
    },
    rpm: {
      di: 4,
      apply: function(px) {
        setRule('.rpm-display', px);
        setRule('.contactor-rpm', px);
      }
    },
    oscIndicator: {
      di: 1,
      apply: function(px) {
        setRule('.freq-val', px); setRule('.freq-name', px); setRule('.freq-unit', px);
      }
    },
    sectionHeader: {
      di: 1,
      apply: function(px) {
        setRule('.sec-title', px); setRule('.seq-title', px);
        setRule('.sp-section-label', px);
        setRule('.chopper-label', px); setRule('.header-sub', px);
        var mrEl = document.getElementById('contactorMaxRpmLabel');
        if (mrEl && mrEl.parentElement) mrEl.parentElement.style.setProperty('font-size', px + 'px', 'important');
      }
    },
    bigBtn: {
      di: 1,
      apply: function(px) {
        ['btnSteady',
         'btnDamperHardDisable',
         'recBtnSteady',
         'btnResetSettings','btnRecordMode'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) { el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el); }
        });
      }
    },
    popupText: {
      di: 1,
      apply: function(px) {
        setRule('.popup-msg', px);
        setRule('.popup-msg-body', px);
        setRule('.popup-disable-note', px);
        setRule('.popup-box *:not(.popup-title):not(.popup-title *)', px);
        document.querySelectorAll('.popup-box *').forEach(function(el) {
          if (el.classList.contains('popup-title') || el.closest('.popup-title')) return;
          el.style.setProperty('font-size', px + 'px', 'important');
          window._ucSet(el);
        });
      }
    },
    smallSectionLabel: {
      di: 1,
      apply: function(px) {
        setRule('.badge', px); setRule('.badge-accent', px); setRule('.badge-warn', px);
        setRule('.side-ind', px); setRule('.seq-count-label', px);
        setRule('.sp-note', px); setRule('.cw-section-label', px); setRule('.mfn-add-title', px);
        setRule('.mfn-builtin-tag', px); setRule('.mfn-warn-notice', px);
        applyInlineUppercase(px);
        var skip = new Set(['INPUT','SELECT','TEXTAREA','BUTTON']);
        document.querySelectorAll('[style*="font-size:11px"],[style*="font-size: 11px"]').forEach(function(el) {
          if (skip.has(el.tagName)) return;
          var cs = window.getComputedStyle(el);
          if (cs.textTransform === 'uppercase' || el.style.textTransform === 'uppercase') return;
          if ((el.tagName === 'DIV' || el.tagName === 'P') && (el.style.lineHeight || el.textContent.length > 30)) {
            el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
          }
        });
        document.querySelectorAll('[style*="font-size"]').forEach(function(el) {
          if (el.textContent.trim().indexOf('NO SECTIONS') === 0) {
            el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
          }
        });
        window._dbgSmallSectionPx = px;
      }
    },
    smallBtn: {
      di: 1,
      apply: function(px) {
        setRule('.vbtn', px);
        setRule('.ease-btn', px); setRule('.seq-count-btn', px);
        setRule('.mfn-save-btn', px); setRule('.mfn-del-btn', px); setRule('.mfn-add-btn', px);
        var diag = document.getElementById('btnChopperViewMode');
        if (diag) diag.style.setProperty('font-size', px + 'px', 'important');
      }
    },
    inputText: {
      di: 1,
      apply: function(px) {
        setRule('input[type=number]', px); setRule('input[type=text]', px);
        setRule('.mfn-fn-input', px); setRule('.mfn-fn-input.eq-input', px);
        setRule('.slider-val', px); setRule('.knob-val', px); setRule('.seq-count-val', px);
        setRule('.extra-osc-item input[type=number]', px);
        setRule('.extra-osc-item input[type=text]', px);
        ['daHumVolVal','daOpenVolVal','daCloseVolVal','filterCutoffTxt',
         'svBlowerVolDrop'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) { el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el); }
        });
        ['dualMotor1RPMDisplay','dualMotor2RPMDisplay'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) { el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el); }
        });
      }
    },
    indicatorLabel: {
      di: 1,
      apply: function(px) {
        setRule('.ind-label', px); setRule('.ind-val', px);
        setRule('.knob-label', px); setRule('.status-bar', px);
      }
    },
    buttonLabel: {
      di: 1,
      apply: function(px) {
        applyInlineUppercase(px, '#stateOverrideSection');
        var dh = document.querySelector('#damperAudioSection');
        if (dh) {
          dh.querySelectorAll('div[style*="font-size"]').forEach(function(el) {
            el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
          });
          dh.querySelectorAll('span[style]').forEach(function(el) {
            if (el.style.fontSize && !el.className) el.style.setProperty('font-size', px + 'px', 'important');
          });
        }
      }
    },
    inputLabel: {
      di: 1,
      apply: function(px) {
        setRule('.entry label', px); setRule('.field-label', px);
        setRule('.cw-field-label', px); setRule('.mfn-fn-label', px);
        setRule('.seq-row-label', px);
        setRule('.extra-osc-title', px);
        document.querySelectorAll('.extra-osc-header input[type=text]').forEach(function(el) {
          el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
        });
        document.querySelectorAll('label[style*="font-size"]').forEach(function(el) {
          el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
        });
        ['reverbIRName','reverb2IRName','reverb3IRName'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) { el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el); }
        });
        ['reverbIRStatus','reverb2IRStatus','reverb3IRStatus'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) { el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el); }
        });
        window._dbgInputLabelPx = px;
      }
    },
    sliderLabel: {
      di: 1,
      apply: function(px) {
        setRule('.slider-label', px); setRule('.toggle-label', px);
        setRule('.damp-audio-label', px);
        document.querySelectorAll('span[style*="font-size:11px"],span[style*="font-size: 11px"]').forEach(function(el) {
          var t = el.textContent.trim();
          if (['NONE','FULL','DRY','WET'].indexOf(t) !== -1) {
            el.style.setProperty('font-size', px + 'px', 'important'); window._ucSet(el);
          }
        });
      }
    },
    dropdownLabel: {
      di: 1,
      apply: function(px) {
        setRule('select', px);
        setRule('.extra-osc-item select', px);
      }
    },
  };

  function buildSelects() {
    document.querySelectorAll('.dbg-sel').forEach(function(sel) {
      var key = sel.dataset.dbg;
      var cfg = TARGETS[key];
      if (!cfg) return;
      SIZES.forEach(function(s, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = s.label + ' (' + s.px + 'px)';
        if (i === cfg.di) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function() {
        cfg.apply(SIZES[parseInt(this.value)].px);
      });
      cfg.apply(SIZES[cfg.di].px);
    });

    var moTimer = null;
    var mo = new MutationObserver(function() {
      clearTimeout(moTimer);
      moTimer = setTimeout(function() {
        ['sectionHeader','smallSectionLabel','inputLabel','sliderLabel','smallBtn'].forEach(function(key) {
          var sel = document.querySelector('[data-dbg="' + key + '"]');
          if (sel) TARGETS[key].apply(SIZES[parseInt(sel.value)].px);
        });
        if (window._dbgSmallSectionPx) TARGETS.smallSectionLabel.apply(window._dbgSmallSectionPx);
        if (window._dbgInputLabelPx) TARGETS.inputLabel.apply(window._dbgInputLabelPx);
      }, 120);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  var panel = document.getElementById('dbgTypoPanel');
  var handle = document.getElementById('dbgTypoHandle');
  var startX = 0, startY = 0, dragging = false;
  handle.addEventListener('mousedown', function(e) {
    if (e.target.closest('#dbgTypoCollapse')) return;
    dragging = true;
    panel.style.right = 'auto';
    panel.style.top = panel.getBoundingClientRect().top + 'px';
    panel.style.left = panel.getBoundingClientRect().left + 'px';
    startX = e.clientX - parseInt(panel.style.left);
    startY = e.clientY - parseInt(panel.style.top);
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    panel.style.left = (e.clientX - startX) + 'px';
    panel.style.top  = (e.clientY - startY) + 'px';
  });
  document.addEventListener('mouseup', function() { dragging = false; });

  document.getElementById('dbgTypoCollapse').addEventListener('click', function() {
    panel.classList.toggle('dbg-collapsed');
    this.textContent = panel.classList.contains('dbg-collapsed') ? 'SHOW' : 'HIDE';
  });

  window._dbgResetAll = function() {
    document.querySelectorAll('.dbg-sel').forEach(function(sel) {
      var key = sel.dataset.dbg;
      var cfg = TARGETS[key];
      if (!cfg) return;
      sel.value = cfg.di;
      cfg.apply(SIZES[cfg.di].px);
    });
  };
  document.getElementById('dbgResetBtn').addEventListener('click', window._dbgResetAll);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSelects);
  } else {
    buildSelects();
  }
})();
