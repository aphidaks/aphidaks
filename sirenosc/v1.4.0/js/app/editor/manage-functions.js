(function() {
  var BUILTIN_FNS = [
    { value: 'linear',      name: 'Linear',             eq: 't' },
    { value: 'exponential', name: 'Exponential',        eq: '1 - Exp(-5 * Input)' },
    { value: 'sine',        name: 'Sine',               eq: 'Sin(Input * Pi() / 2)' },
    { value: 'tanh',        name: 'Hyperbolic Tangent', eq: '(Exp(4*Input) - 1) / (Exp(4*Input) + 1)' },
    { value: 'quadratic',   name: 'Quadratic',          eq: '1 - Exp(-5 * Input ^ 2)' },
    { value: 'logarithmic', name: 'Logarithmic',        eq: 'IfG(Input, 0, Log10(1 + Input * 9) / Log10(10), 0)' },
  ];

  var STORAGE_KEY = 'sirenosc_custom_fns';

  function loadCustomFns() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveCustomFns(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch(e) {}
  }

  function ffcToJs(expr) {
    if (!expr) return expr;
    var s = expr;

    function ri(pattern, replacement) {
      s = s.replace(new RegExp(pattern, 'gi'), replacement);
    }

    ri('\\bInput\\b', '__t__');

    ri('\\bPi\\s*\\(\\s*\\)', String(Math.PI));
    ri('\\bPi\\b', String(Math.PI));

    ri('\\bMin\\s*\\(', 'Math.min(');
    ri('\\bMax\\s*\\(', 'Math.max(');
    ri('\\bSum\\s*\\(', '(function(_a,_b){return _a+_b;})(');

    ri('\\bIfE\\s*\\(', '__ife__(');
    ri('\\bIfL\\s*\\(', '__ifl__(');
    ri('\\bIfG\\s*\\(', '__ifg__(');
    ri('\\bIfLE\\s*\\(', '__ifle__(');
    ri('\\bIfGE\\s*\\(', '__ifge__(');
    ri('\\bCase\\s*\\(', '__case__(');

    ri('\\bSin\\s*\\(',   'Math.sin(');
    ri('\\bCos\\s*\\(',   'Math.cos(');
    ri('\\bTg\\s*\\(',    'Math.tan(');
    ri('\\bCtg\\s*\\(',   '(1/Math.tan)(');
    ri('\\bSec\\s*\\(',   '(1/Math.cos)(');
    ri('\\bCoSec\\s*\\(', '(1/Math.sin)(');
    ri('\\bArcSin\\s*\\(','Math.asin(');
    ri('\\bArcCos\\s*\\(','Math.acos(');
    ri('\\bArcTg\\s*\\(', 'Math.atan(');
    ri('\\bExp\\s*\\(',   'Math.exp(');
    ri('\\bSqrt\\s*\\(',  'Math.sqrt(');
    ri('\\bLn\\s*\\(',    'Math.log(');
    ri('\\bLog10\\s*\\(', 'Math.log10(');
    ri('\\bLog2\\s*\\(',  'Math.log2(');
    ri('\\bAbs\\s*\\(',   'Math.abs(');
    ri('\\bNeg\\s*\\(',   '(-(');
    ri('\\bRound\\s*\\(', 'Math.round(');
    ri('\\bInt\\s*\\(',   'Math.trunc(');
    ri('\\bFrac\\s*\\(',  '(function(_x){return _x-Math.trunc(_x);})(');

    s = s.replace(/([^<>!])(\^)/g, function(m, pre) { return pre + '**'; });

    ri('__t__', 't');

    var helpers = '(function(){'
      + 'function __ife__(a,b,tb,fb){return a===b?(tb!==undefined?tb:1):(fb!==undefined?fb:0);}'
      + 'function __ifl__(a,b,tb,fb){return a<b?(tb!==undefined?tb:1):(fb!==undefined?fb:0);}'
      + 'function __ifg__(a,b,tb,fb){return a>b?(tb!==undefined?tb:1):(fb!==undefined?fb:0);}'
      + 'function __ifle__(a,b,tb,fb){return a<=b?(tb!==undefined?tb:1):(fb!==undefined?fb:0);}'
      + 'function __ifge__(a,b,tb,fb){return a>=b?(tb!==undefined?tb:1):(fb!==undefined?fb:0);}'
      + 'function __case__(a,b,c){return a===1?b:c;}'
      + 'return (' + s + ');})()';

    return helpers;
  }

  function refreshAllSelects() {
    var customFns = loadCustomFns();
    var selects = document.querySelectorAll('select[id$="Fn"]');
    selects.forEach(function(sel) {
      var currentVal = sel.value;
      Array.from(sel.options).forEach(function(opt) {
        if (opt.getAttribute('data-custom')) sel.removeChild(opt);
      });
      var allFns = getAllFns();
      BUILTIN_FNS.forEach(function(bf) {
        var matchingFn = allFns.find(function(f) { return f.value === bf.value; });
        var opt = sel.querySelector('option[value="' + bf.value + '"]');
        if (opt && matchingFn) opt.textContent = matchingFn.name;
      });
      customFns.forEach(function(cf) {
        var opt = document.createElement('option');
        opt.value = cf.value;
        opt.textContent = cf.name;
        opt.setAttribute('data-custom', '1');
        sel.appendChild(opt);
      });
      sel.value = currentVal;
    });
  }

  function evalFfc(eq, t, te) {
    var jsExpr = ffcToJs(eq);
    return (new Function('t', 'te', 'return ' + jsExpr))(t, te);
  }

  var _origApplyFn = window.applyFn;
  window.applyFn = function(fn, t, easing) {
    var builtinKeys = BUILTIN_FNS.map(function(b){ return b.value; });
    if (builtinKeys.indexOf(fn) === -1) {
      var customFns = loadCustomFns();
      var cf = customFns.find(function(c){ return c.value === fn; });
      if (cf) {
        t = Math.max(0, Math.min(1, t));
        var te = typeof applyEasing === 'function'
          ? (easing ? applyEasing(easing, t) : applyEasing('easeout', t))
          : t;
        try { return evalFfc(cf.eq, t, te); } catch(e) { return te; }
      }
    }
    return _origApplyFn(fn, t, easing);
  };

  function getAllFns() {
    var custom = loadCustomFns();
    return BUILTIN_FNS.concat(custom);
  }

  function validateEq(eq) {
    try {
      var result = evalFfc(eq, 0.5, 0.5);
      if (typeof result !== 'number' || isNaN(result)) return false;
      return true;
    } catch(e) { return false; }
  }

  function nameToValue(name) {
    return 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  function renderFnList() {
    var container = document.getElementById('mfnFnList');
    if (!container) return;
    container.innerHTML = '';
    var customFns = loadCustomFns();
    var allFns = BUILTIN_FNS.map(function(b) { return { builtin: true, value: b.value, name: b.name, eq: b.eq }; })
      .concat(customFns.map(function(c) { return { builtin: false, value: c.value, name: c.name, eq: c.eq }; }));

    allFns.forEach(function(fn) {
      var item = document.createElement('div');
      item.className = 'mfn-fn-item' + (fn.builtin ? ' mfn-builtin' : '');

      var nameRow = document.createElement('div');
      nameRow.className = 'mfn-fn-item-row';
      var nameLabel = document.createElement('span');
      nameLabel.className = 'mfn-fn-label';
      nameLabel.textContent = 'Name';
      var nameInput = document.createElement('input');
      nameInput.className = 'mfn-fn-input name-input';
      nameInput.type = 'text';
      nameInput.value = fn.name;
      nameRow.appendChild(nameLabel);
      nameRow.appendChild(nameInput);
      if (fn.builtin) {
        var tag = document.createElement('span');
        tag.className = 'mfn-builtin-tag';
        tag.textContent = 'built-in';
        nameRow.appendChild(tag);
      }

      var eqRow = document.createElement('div');
      eqRow.className = 'mfn-fn-item-row';
      var eqLabel = document.createElement('span');
      eqLabel.className = 'mfn-fn-label';
      eqLabel.textContent = 'Equation';
      var eqInput = document.createElement('input');
      eqInput.className = 'mfn-fn-input eq-input';
      eqInput.type = 'text';
      eqInput.value = fn.eq;
      eqInput.title = 'Modified FL Studio FFC Syntax. Input = t (0–1).';
      eqRow.appendChild(eqLabel);
      eqRow.appendChild(eqInput);

      var actRow = document.createElement('div');
      actRow.className = 'mfn-fn-item-actions';
      var statusSpan = document.createElement('span');
      statusSpan.className = 'mfn-status';
      statusSpan.style.flex = '1';
      statusSpan.style.textAlign = 'left';

      var saveBtn = document.createElement('button');
      saveBtn.className = 'mfn-save-btn';
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function() {
        var newName = nameInput.value.trim();
        var newEq   = eqInput.value.trim();
        if (!newName) { statusSpan.className = 'mfn-status err'; statusSpan.textContent = 'Name required'; return; }
        if (!validateEq(newEq)) { statusSpan.className = 'mfn-status err'; statusSpan.textContent = 'Invalid equation'; return; }
        if (fn.builtin) {
          var nameOverrides = {};
          try { nameOverrides = JSON.parse(localStorage.getItem('sirenosc_fn_name_overrides') || '{}'); } catch(e) {}
          nameOverrides[fn.value] = newName;
          localStorage.setItem('sirenosc_fn_name_overrides', JSON.stringify(nameOverrides));
          var bf = BUILTIN_FNS.find(function(b){ return b.value === fn.value; });
          if (bf) bf.name = newName;
        } else {
          var customs = loadCustomFns();
          var idx = customs.findIndex(function(c){ return c.value === fn.value; });
          if (idx >= 0) { customs[idx].name = newName; customs[idx].eq = newEq; }
          saveCustomFns(customs);
          fn.eq = newEq;
          fn.name = newName;
        }
        statusSpan.className = 'mfn-status ok';
        statusSpan.textContent = 'Saved';
        refreshAllSelects();
        setTimeout(function(){ statusSpan.textContent = ''; }, 1800);
      });

      actRow.appendChild(statusSpan);
      actRow.appendChild(saveBtn);

      if (!fn.builtin) {
        var delBtn = document.createElement('button');
        delBtn.className = 'mfn-del-btn';
        delBtn.type = 'button';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', function() {
          _dsDialog({title:'Delete function',msg:'Delete function "' + fn.name + '"?',ok:'DELETE'}).then(function(yes){ if(!yes) return;
          var customs = loadCustomFns();
          saveCustomFns(customs.filter(function(c){ return c.value !== fn.value; }));
          refreshAllSelects();
          renderFnList();
          });
        });
        actRow.appendChild(delBtn);
      }

      item.appendChild(nameRow);
      item.appendChild(eqRow);
      item.appendChild(actRow);
      attachItemGraph(item, eqInput, 'easeout');
      container.appendChild(item);
    });
  }

  function drawCurve(canvas, eq, easingVal) {
    var N = 200, pts = [], errored = false;
    for (var i = 0; i <= N; i++) {
      var t = i / N, te, y_val;
      try {
        te = typeof applyEasing === 'function' ? applyEasing(easingVal || 'easeout', t) : t;
        y_val = evalFfc(eq, t, te);
        if (typeof y_val !== 'number' || !isFinite(y_val)) { errored = true; break; }
        pts.push([t, Math.max(-0.1, Math.min(1.1, y_val))]);
      } catch(e) { errored = true; break; }
    }
    var ok = !errored && pts.length >= 2;
    var g = window.vzPlot(canvas, {
      xmin: 0, xmax: 1, ymin: 0, ymax: 1, xticks: [0, 0.5, 1], yticks: [0, 0.5, 1],
      xlabel: 'Input', ylabel: 'Output',
      series: ok ? [{ pts: pts, color: '#4dd6a0' }] : []
    });
    var errEl = canvas.parentNode.querySelector('.mfn-curve-err');
    if (errEl) errEl.style.display = ok ? 'none' : 'flex';
  }

  function attachItemGraph(item, eqInput, easingVal) {
    var wrap = document.createElement('div');
    wrap.className = 'mfn-curve-wrap';
    var canvas = document.createElement('canvas');
    canvas.className = 'mfn-curve-canvas';
    var label = document.createElement('span');
    label.className = 'mfn-curve-label';
    label.innerHTML = 'Input <svg class="si" aria-hidden="true"><use href="#si-arrow-r"/></svg>';
    var errDiv = document.createElement('div');
    errDiv.className = 'mfn-curve-err';
    errDiv.textContent = 'invalid equation';
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    wrap.appendChild(errDiv);
    item.appendChild(wrap);

    function redraw() {
      requestAnimationFrame(function() {
        drawCurve(canvas, eqInput.value.trim(), easingVal || 'easeout');
      });
    }
    eqInput.addEventListener('input', redraw);
    setTimeout(redraw, 30);
    return redraw;
  }

  function wireManageFn() {
    var panel = document.getElementById('mfnFnList');
    if (!panel) { setTimeout(wireManageFn, 200); return; }

    renderFnList();

    var addBtn    = document.getElementById('mfnAddBtn');
    var addName   = document.getElementById('mfnNewName');
    var addEq     = document.getElementById('mfnNewEq');
    var addStatus = document.getElementById('mfnAddStatus');

    var addCanvas = document.getElementById('mfnAddCurveCanvas');
    if (addCanvas) {
      function redrawAddCanvas() {
        requestAnimationFrame(function() {
          drawCurve(addCanvas, addEq.value.trim(), 'easeout');
        });
      }
      addEq.addEventListener('input', redrawAddCanvas);
      setTimeout(redrawAddCanvas, 80);
    }
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        var name = (addName.value || '').trim();
        var eq   = (addEq.value || '').trim();
        if (!name) { addStatus.className = 'mfn-status err'; addStatus.textContent = 'Name is required'; return; }
        if (!eq)   { addStatus.className = 'mfn-status err'; addStatus.textContent = 'Equation is required'; return; }
        if (!validateEq(eq)) { addStatus.className = 'mfn-status err'; addStatus.textContent = 'Invalid equation — check FFC syntax'; return; }
        var customs = loadCustomFns();
        var value = nameToValue(name);
        var all = BUILTIN_FNS.map(function(b){return b.value;}).concat(customs.map(function(c){return c.value;}));
        if (all.indexOf(value) !== -1) value = value + '_' + Date.now();
        customs.push({ value: value, name: name, eq: eq });
        saveCustomFns(customs);
        addName.value = '';
        addEq.value = '';
        if (addCanvas) setTimeout(function(){ drawCurve(addCanvas, '', 'easeout'); }, 30);
        addStatus.className = 'mfn-status ok';
        addStatus.textContent = 'Function added!';
        setTimeout(function(){ addStatus.textContent = ''; }, 1800);
        refreshAllSelects();
        renderFnList();
      });
    }

    try {
      var nameOverrides = JSON.parse(localStorage.getItem('sirenosc_fn_name_overrides') || '{}');
      Object.keys(nameOverrides).forEach(function(k) {
        var bf = BUILTIN_FNS.find(function(b){ return b.value === k; });
        if (bf) bf.name = nameOverrides[k];
      });
    } catch(e) {}

    refreshAllSelects();
  }
  wireManageFn();

  window._oscpGetCustomFnsData = function() {
    var overrides = {};
    try { overrides = JSON.parse(localStorage.getItem('sirenosc_fn_name_overrides') || '{}'); } catch(e) {}
    return { customFns: loadCustomFns(), nameOverrides: overrides };
  };
  window._oscpApplyCustomFnsData = function(data) {
    if (!data) return;
    try {
      var customs = [];
      (data.customFns || []).forEach(function(cf) {
        if (cf && cf.value) customs.push({ value: cf.value, name: cf.name, eq: cf.eq });
      });
      saveCustomFns(customs);
    } catch(e) {}
    try {
      var overrides = {};
      Object.keys(data.nameOverrides || {}).forEach(function(k) {
        overrides[k] = data.nameOverrides[k];
      });
      localStorage.setItem('sirenosc_fn_name_overrides', JSON.stringify(overrides));
      Object.keys(overrides).forEach(function(k) {
        var bf = BUILTIN_FNS.find(function(b){ return b.value === k; });
        if (bf) bf.name = overrides[k];
      });
    } catch(e) {}
    refreshAllSelects();
    if (typeof renderFnList === 'function') renderFnList();
  };
})();
