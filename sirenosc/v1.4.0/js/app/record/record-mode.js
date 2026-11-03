
(function() {
  function get(id) { return document.getElementById(id); }

  function syncIndicators() {

    const damperEnabled = get('btnDamperHardDisable') &&
      (get('btnDamperHardDisable').textContent.trim() === 'DISABLE' || get('btnDamperHardDisable').classList.contains('active'));

    var recCont = get('recGroupIndicators');
    var srcCont = get('seqGroupIndicators');
    var totalGroups = (typeof seqNumGroups !== 'undefined' ? seqNumGroups : 3);
    var MAX_IND = 9;
    if (recCont) {
      var srcDots = srcCont ? srcCont.querySelectorAll('.ind-dot') : [];
      if (recCont.dataset.builtFor !== 'fixed9') {
        recCont.dataset.builtFor = 'fixed9';
        recCont.innerHTML = '';

        function makeCell(row, col, content) {
          var cell = document.createElement('div');
          cell.style.cssText = 'grid-row:' + row + ';grid-column:' + col + ';display:flex;align-items:center;gap:7px';
          cell.appendChild(content);
          recCont.appendChild(cell);
          return cell;
        }
        function makeDot(id, extraClass) {
          var d = document.createElement('div');
          d.className = 'rec-ind-dot' + (extraClass ? ' ' + extraClass : '');
          d.style.cssText = 'width:11px;height:11px;flex-shrink:0';
          if (id) d.id = id;
          return d;
        }
        function makeLabel(txt) {
          var s = document.createElement('span');
          s.className = 'rec-ind-label';
          s.style.cssText = 'font-size:10px';
          s.textContent = txt;
          return s;
        }

        var pwrWrap = document.createDocumentFragment();
        pwrWrap.appendChild(makeDot(null, 'on-yellow'));
        pwrWrap.appendChild(makeLabel('Power'));
        makeCell(1, 1, (function(){ var d=document.createElement('div');d.style.cssText='display:flex;align-items:center;gap:7px';d.appendChild(makeDot(null,'on-yellow'));d.appendChild(makeLabel('Power'));return d; })());
        makeCell(2, 1, (function(){ var d=document.createElement('div');d.style.cssText='display:flex;align-items:center;gap:7px';d.appendChild(makeDot('recIndActive',''));d.appendChild(makeLabel('Active'));return d; })());
        var statusCell = document.createElement('div');
        statusCell.style.cssText = 'grid-row:3;grid-column:1';
        var statusSpan = document.createElement('span');
        statusSpan.id = 'recStatusTxt';
        statusSpan.style.cssText = 'font-size:9px;letter-spacing:1px;color:var(--muted);font-family:\'Share Tech Mono\',monospace';
        statusSpan.textContent = 'IDLE';
        statusCell.appendChild(statusSpan);
        recCont.appendChild(statusCell);

        for (var i = 0; i < MAX_IND; i++) {
          var grpRow = (i % 3) + 1;
          var grpCol = Math.floor(i / 3) + 2;
          var grpWrap = document.createElement('div');
          grpWrap.style.cssText = 'grid-row:' + grpRow + ';grid-column:' + grpCol + ';display:flex;align-items:center;gap:7px';
          var dot = makeDot('recIndGrp' + i, '');
          var lbl = makeLabel('Group ' + (i + 1));
          lbl.id = 'recIndGrpLbl' + i;
          grpWrap.appendChild(dot);
          grpWrap.appendChild(lbl);
          recCont.appendChild(grpWrap);
        }
      }

      var activeSrc = get('indActive');
      var activeDst = get('recIndActive');
      if (activeSrc && activeDst) activeDst.className = activeSrc.className.replace('ind-dot','rec-ind-dot');

      for (var i = 0; i < MAX_IND; i++) {
        var recDot = get('recIndGrp' + i);
        var recLbl = get('recIndGrpLbl' + i);
        if (!recDot) continue;
        var isActive = i < totalGroups;
        if (srcDots[i] && isActive) {
          recDot.className = srcDots[i].className.replace('ind-dot','rec-ind-dot');
        } else {
          recDot.className = 'rec-ind-dot';
        }
        recDot.style.opacity = isActive ? '' : '0.25';
        if (recLbl) recLbl.style.opacity = isActive ? '' : '0.25';
      }
    }

    var recStatusEl = get('recStatusTxt');
    var mainStatusEl = get('statusTxt');
    if (recStatusEl && mainStatusEl) {
      var txt = mainStatusEl.textContent || 'IDLE';
      if (txt.indexOf('WINDING UP') !== -1) txt = 'WIND-UP';
      else if (txt.indexOf('WINDING DOWN') !== -1) txt = 'WIND-DOWN';
      else if (txt === 'STEADY') txt = 'STEADY';
      else txt = 'IDLE';
      recStatusEl.textContent = txt;
    }

    const recBtnDamper = get('recBtnDamper');
    if (recBtnDamper) {
      recBtnDamper.textContent = damperEnabled ? 'DISABLE' : 'ENABLE';
      recBtnDamper.className = damperEnabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
    }

    const constAOn = get('btnConstAEnable') && (get('btnConstAEnable').textContent.trim()==='DISABLE'||get('constABody')&&!get('constABody').classList.contains('disabled-overlay'));
    const constBOn = get('btnConstBEnable') && (get('btnConstBEnable').textContent.trim()==='DISABLE'||get('constBBody')&&!get('constBBody').classList.contains('disabled-overlay'));
    const constInds = get('recConstInds');
    const constAInd = get('recConstAInd');
    const constBInd = get('recConstBInd');
    if (constInds) constInds.style.visibility = (constAOn||constBOn) ? 'visible' : 'hidden';
    if (constAInd) constAInd.style.display = constAOn ? '' : 'none';
    if (constBInd) constBInd.style.display = constBOn ? '' : 'none';
    if (constAOn) { const hz = get('nConstAFreq'); if (hz && get('recConstAHz')) get('recConstAHz').textContent = hz.value; }
    if (constBOn) { const hz = get('nConstBFreq'); if (hz && get('recConstBHz')) get('recConstBHz').textContent = hz.value; }

    const rotEnabled = (typeof rotationEnabled !== 'undefined') && rotationEnabled;
    const rotWrap = get('recRotWrap');
    if (rotWrap) {
      rotWrap.style.opacity = rotEnabled ? '1' : '0.3';
      rotWrap.style.pointerEvents = rotEnabled ? '' : 'none';
    }
    const rotBadge = get('recRotDisabledBadge');
    if (rotBadge) rotBadge.style.display = rotEnabled ? 'none' : '';

    const undulateOn = get('tUndulate') && get('tUndulate').checked && damperEnabled;
    const cWrap = get('recContactorWrap');
    if (cWrap) {
      cWrap.style.opacity = undulateOn ? '1' : '0.3';
      cWrap.style.pointerEvents = undulateOn ? '' : 'none';
    }
    const undBadge = get('recUndDisabledBadge');
    if (undBadge) undBadge.style.display = undulateOn ? 'none' : '';

    var mainSteadyBtn = get('btnSteady');
    var recSteadyBtn  = get('recBtnSteady');
    if (mainSteadyBtn && recSteadyBtn) {
      recSteadyBtn.className = 'vbtn btn-blue active';
    }
  }

  var REC_FREQ_PER_PAGE = 10;
  var recFreqPage = 1;

  function getRecFreqCards() {
    var cards = [
      { id:'recFcHP' },
      { id:'recFcLP' },
      { id:'recFcHV' },
      { id:'recFcLV' },
      { id:'recFcUT' },
      { id:'recFcOT' },
    ];
    if (typeof extraOscs !== 'undefined') {
      extraOscs.forEach(function(eo) {
        cards.push({ eoId: eo.id, isExtra: true });
      });
    }
    return cards;
  }

  function getTotalRecFreqPages() {
    return Math.max(1, Math.ceil(getRecFreqCards().length / REC_FREQ_PER_PAGE));
  }

  function ensureRecExtraOscCard(eo) {
    var col = (typeof getEoColor === 'function') ? getEoColor(eo) : '#00e5a0';
    var name = (typeof getEoDisplayName === 'function') ? getEoDisplayName(eo) : ((eo.customName && eo.customName.length > 0) ? eo.customName : ((eo.type==='harmonic'?'Harmonic':eo.type==='vane'?'Vane':'Rotor') + ' ' + (eo.label || eo.id)));
    var existing = get('recFcEO' + eo.id);
    var card = existing || document.createElement('div');
    card.className = 'rec-freq-card';
    card.id = 'recFcEO' + eo.id;
    if (!existing) card.style.display = 'none';
    card.innerHTML =
      '<div class="rec-freq-name" id="recFcEOName' + eo.id + '" style="color:' + col + '">' + name + '</div>' +
      '<div class="rec-freq-count-big" id="recFcEOCount' + eo.id + '">--</div>' +
      '<div><span class="rec-freq-val" id="recFvEO' + eo.id + '" style="color:' + col + '">0</span><span class="rec-freq-unit"> Hz</span></div>' +
      '<div class="rec-vis-bar"><div class="rec-vis-fill" id="recVbEO' + eo.id + '" style="background:' + col + ';width:0%"></div></div>';
    if (!existing) get('recFreqDisplay').appendChild(card);
    return card;
  }

  function cleanRecExtraOscCards() {
    var display = get('recFreqDisplay');
    if (!display) return;
    display.querySelectorAll('[id^="recFcEO"]').forEach(function(el) {
      var eoId = parseInt(el.id.replace('recFcEO',''), 10);
      var exists = typeof extraOscs !== 'undefined' && extraOscs.some(function(e){ return e.id === eoId; });
      if (!exists) el.remove();
    });
  }

  function renderRecFreqPage() {
    var cards = getRecFreqCards();
    var totalPages = Math.max(1, Math.ceil(cards.length / REC_FREQ_PER_PAGE));
    if (recFreqPage > totalPages) recFreqPage = 1;
    var start = (recFreqPage - 1) * REC_FREQ_PER_PAGE;
    var end   = start + REC_FREQ_PER_PAGE;


    var coreIds = ['recFcHP','recFcLP','recFcHV','recFcLV','recFcUT','recFcOT'];
    coreIds.forEach(function(id) {
      var el = get(id);
      if (!el) return;
      var idx = cards.findIndex(function(c){ return c.id === id; });
      el.style.display = (idx >= start && idx < end) ? '' : 'none';
    });

    if (typeof extraOscs !== 'undefined') {
      extraOscs.forEach(function(eo) {
        var card = get('recFcEO' + eo.id) || ensureRecExtraOscCard(eo);
        var idx = cards.findIndex(function(c){ return c.isExtra && c.eoId === eo.id; });
        if (card) card.style.display = (idx >= start && idx < end) ? '' : 'none';
      });
    }

    var nav = get('recFreqPageNav');
    var ind = get('recFreqPageIndicator');
    var prevBtn = get('recBtnFreqPrev');
    var nextBtn = get('recBtnFreqNext');
    if (nav) nav.className = totalPages > 1 ? 'visible' : '';
    if (ind) ind.textContent = 'PAGE ' + recFreqPage + ' / ' + totalPages;
    if (prevBtn) { prevBtn.disabled = recFreqPage <= 1; prevBtn.style.opacity = recFreqPage <= 1 ? '0.35' : '1'; }
    if (nextBtn) { nextBtn.disabled = recFreqPage >= totalPages; nextBtn.style.opacity = recFreqPage >= totalPages ? '0.35' : '1'; }
  }

  (function wireRecFreqNav() {
    var prev = get('recBtnFreqPrev'), next = get('recBtnFreqNext');
    if (!prev || !next) { setTimeout(wireRecFreqNav, 200); return; }
    prev.addEventListener('click', function() { if (recFreqPage > 1) { recFreqPage--; renderRecFreqPage(); } });
    next.addEventListener('click', function() { if (recFreqPage < getTotalRecFreqPages()) { recFreqPage++; renderRecFreqPage(); } });
  })();

  function syncFreqCards() {
    cleanRecExtraOscCards();
    if (typeof extraOscs !== 'undefined') {
      extraOscs.forEach(function(eo) { ensureRecExtraOscCard(eo); });
    }
    renderRecFreqPage();

    var pairs = [
      ['fvHP','recFvHP','vbHP','recVbHP','eHigherPort','recFcHPCount'],
      ['fvLP','recFvLP','vbLP','recVbLP','eLowerPort','recFcLPCount'],
      ['fvHV','recFvHV','vbHV','recVbHV','eHigherVanes','recFcHVCount'],
      ['fvLV','recFvLV','vbLV','recVbLV','eLowerVanes','recFcLVCount'],
      ['fvUT','recFvUT','vbUT','recVbUT','eUndertone','recFcUTCount'],
      ['fvOT','recFvOT','vbOT','recVbOT','eOvertone','recFcOTCount'],
    ];
    pairs.forEach(function(p) {
      var src = get(p[0]);
      if (src && get(p[1])) get(p[1]).textContent = src.textContent;
      var origFill = get(p[2]);
      var recFill  = get(p[3]);
      if (origFill && recFill) recFill.style.width = origFill.style.width;
      var countEl = get(p[5]);
      if (countEl) {
        var inp = get(p[4]);
        var val = inp ? inp.value : '';
        countEl.textContent = (val && val !== '' && val !== '0') ? val : '--';
        if (val && val !== '' && val !== '0') {
          countEl.classList.add('active');
        } else {
          countEl.classList.remove('active');
        }
      }
    });
    var nameMap = [
      ['permNameHp','recFcHPName'],['permNameHv','recFcHVName'],
      ['permNameLp','recFcLPName'],['permNameLv','recFcLVName'],
      ['permNameUt','recFcUTName'],['permNameOt','recFcOTName'],
    ];
    nameMap.forEach(function(nm) {
      var inp = document.getElementById(nm[0]);
      var lbl = document.getElementById(nm[1]);
      if (inp && lbl) lbl.textContent = inp.value || lbl.textContent;
    });
    var isSingle = get('dChopper') && get('dChopper').value === 'single';
    ['recFcLP','recFcLV','recFcUT','recFcOT'].forEach(function(id) {
      var el = get(id); if (el) el.classList.toggle('disabled', isSingle);
    });

    if (typeof extraOscs !== 'undefined') {
      extraOscs.forEach(function(eo) {
        var srcVal  = get('fvEO'  + eo.id);
        var srcFill = get('vbEO'  + eo.id);
        var recVal  = get('recFvEO' + eo.id);
        var recFill = get('recVbEO' + eo.id);
        var recName = get('recFcEOName' + eo.id);
        var recCount = get('recFcEOCount' + eo.id);
        if (srcVal  && recVal)  recVal.textContent  = srcVal.textContent;
        if (srcFill && recFill) recFill.style.width = srcFill.style.width;
        if (recName) {
          var n = (typeof getEoDisplayName === 'function') ? getEoDisplayName(eo) : ((eo.customName && eo.customName.length > 0) ? eo.customName : ((eo.type==='harmonic'?'Harmonic':eo.type==='vane'?'Vane':'Rotor') + ' ' + (eo.label || eo.id)));
          recName.textContent = n;
        }
        if (recCount) {
          var val = eo.value;
          var hasVal = val != null && val !== '' && parseFloat(val) !== 0;
          recCount.textContent = hasVal ? parseFloat(val) : '--';
          recCount.classList.toggle('active', hasVal);
          recCount.style.color = '';
        }
      });
    }

    var rpmSrc = get('rpmDisplay');
    var recRpm = get('recRpmBig');
    if (rpmSrc && recRpm) {
      var rpmNum = parseInt(rpmSrc.textContent.replace('RPM','').trim(), 10) || 0;
      recRpm.textContent = String(rpmNum).padStart(5, '0');
    }

    var constAEnabled = get('btnConstAEnable') && (get('btnConstAEnable').textContent.trim() === 'DISABLE' || (get('constABody') && !get('constABody').classList.contains('disabled-overlay')));
    var constBEnabled = get('btnConstBEnable') && (get('btnConstBEnable').textContent.trim() === 'DISABLE' || (get('constBBody') && !get('constBBody').classList.contains('disabled-overlay')));
    var fcConstA = get('recFcConstA'), fvConstA = get('recFvConstA'), vbConstA = get('recVbConstA');
    var fcConstB = get('recFcConstB'), fvConstB = get('recFvConstB'), vbConstB = get('recVbConstB');
    if (fcConstA) fcConstA.style.opacity = constAEnabled ? '1' : '0.3';
    if (fcConstB) fcConstB.style.opacity = constBEnabled ? '1' : '0.3';
    var aHz = get('nConstAFreq'), bHz = get('nConstBFreq');
    if (fvConstA) fvConstA.textContent = (aHz && constAEnabled) ? aHz.value : '--';
    if (fvConstB) fvConstB.textContent = (bHz && constBEnabled) ? bHz.value : '--';
    if (vbConstA && aHz && constAEnabled) vbConstA.style.width = Math.min(100, parseFloat(aHz.value) / 200) + '%';
    else if (vbConstA) vbConstA.style.width = '0%';
    if (vbConstB && bHz && constBEnabled) vbConstB.style.width = Math.min(100, parseFloat(bHz.value) / 200) + '%';
    else if (vbConstB) vbConstB.style.width = '0%';
  }

  function syncRotDiagram() {
    var srcG = get('rotDiagramG');
    var dstG = get('recRotG');
    if (srcG && dstG) dstG.setAttribute('transform', srcG.getAttribute('transform'));

    var srcTxt = get('rotRpmTxt');
    var dstTxt = get('recRotRpmTxt');
    if (srcTxt && dstTxt) dstTxt.textContent = srcTxt.textContent;

    if (srcG) {
      var tf = srcG.getAttribute('transform') || '';
      var m = tf.match(/rotate\(([\d.]+)/);
      var deg = m ? parseFloat(m[1]) : 0;
      var degEl = get('recRotDeg');
      if (degEl) degEl.textContent = Math.round(deg);
    }

    var rpmLbl = get('recRotRpmLabel');
    if (rpmLbl && srcTxt) rpmLbl.textContent = srcTxt.textContent;

    var maxRpmEl = get('recRotMaxRpmVal');
    if (maxRpmEl) {
      var nRotMax = get('nRotMaxRPM');
      maxRpmEl.textContent = nRotMax ? nRotMax.value + ' RPM' : '-- RPM';
    }

    var linkedEl = get('recRotLinkedVal');
    if (linkedEl) {
      var modeStr = typeof rotMode !== 'undefined' ? rotMode : (rotLinkedToChopper ? 'linked' : 'unlinked');
      var modeLabel = modeStr === 'linked' ? 'Linked' : modeStr === 'unlinked' ? 'Unlinked' : 'Manual';
      var modeColor = modeStr === 'linked' ? 'var(--accent)' : modeStr === 'unlinked' ? 'var(--yellow)' : 'var(--accent2)';
      linkedEl.textContent = modeLabel;
      linkedEl.style.color = modeColor;
    }

    var rotEnabled = (typeof rotationEnabled !== 'undefined') && rotationEnabled;
    var recRotBtn = get('recBtnRotEnable');
    if (recRotBtn) {
      recRotBtn.textContent = rotEnabled ? 'DISABLE' : 'ENABLE';
      recRotBtn.className = rotEnabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
      recRotBtn.style.cssText = 'font-size:10px;padding:2px 9px;letter-spacing:1px';
    }
  }

  function syncContactorDiagram() {
    var srcG = get('contactorRotorG');
    var dstG = get('recContactorG');
    if (srcG && dstG) dstG.setAttribute('transform', srcG.getAttribute('transform'));
    var srcDot = get('contactorContactDot');
    var dstDot = get('recContactorDot');
    if (srcDot && dstDot) dstDot.style.fill = srcDot.style.fill || window.getComputedStyle(srcDot).fill;
    for (var i = 0; i < 4; i++) {
      var src = get('sideInd'+i), dst = get('recSideInd'+i);
      if (src && dst) { dst.className = src.className; dst.textContent = src.textContent; }
    }
    var ctrCurrent = get('recCtrRpmCurrent');
    if (ctrCurrent) {
      var ctrSrc = get('contactorRpmDisplay');
      var val = ctrSrc ? ctrSrc.textContent.replace('CTR:','').trim() : '0';
      ctrCurrent.textContent = val + ' RPM';
    }
    var ctrMax = get('recCtrRpmMax');
    if (ctrMax) {
      var rate = get('nDampRate');
      if (rate) {
        var maxVal = Math.round(60000 / (4 * (parseFloat(rate.value) || 800)));
        ctrMax.textContent = maxVal + ' RPM';
      }
    }
  }

  var REC_CHOP_PER_PAGE = 8;
  var recChopPage = 1;

  function wireRecChopNav() {
    var prev = get('recBtnChopPrev'), next = get('recBtnChopNext');
    if (!prev || !next) { setTimeout(wireRecChopNav, 200); return; }
    prev.addEventListener('click', function() { if (recChopPage > 1) { recChopPage--; syncChopperCanvas(); } });
    next.addEventListener('click', function() { recChopPage++; syncChopperCanvas(); });
  }
  wireRecChopNav();

  function syncChopperCanvas() {
    var inner = get('recChopperInner');
    if (!inner) return;

    var canvA = get('chopperCanvasA');
    var canvB = get('chopperCanvasB');

    function ensureMirror(key, srcCanvas, labelText) {
      var recC = document.getElementById('recChopperCanv_'+key);
      var w = srcCanvas ? srcCanvas.width : 160;
      var h = srcCanvas ? srcCanvas.height : 160;
      if (!recC) {
        var wrap = document.createElement('div');
        wrap.id = 'recChopperWrap_'+key;
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px';
        recC = document.createElement('canvas');
        recC.id = 'recChopperCanv_'+key;
        recC.width = w; recC.height = h;
        recC.style.cssText = 'border-radius:50%;border:1px solid var(--border);flex:0 0 auto';
        hiResCanvas(recC, w, h, 120, 120);
        var lbl = document.createElement('div');
        lbl.id = 'recChopperLbl_'+key;
        lbl.style.cssText = 'font-size:8px;letter-spacing:2px;color:var(--muted);text-transform:uppercase';
        lbl.textContent = labelText;
        wrap.appendChild(recC); wrap.appendChild(lbl);
        inner.appendChild(wrap);
      }
      return recC;
    }

    var allEntries = [];

    allEntries.push({ key:'A', srcCanvas: canvA, label: get('chopperLabelA') ? get('chopperLabelA').textContent : 'HIGH ROTOR' });

    var chopMode = (get('dChopper') || {}).value;
    var showB = chopMode === 'dblchopper' && canvB;
    if (showB) {
      allEntries.push({ key:'B', srcCanvas: canvB, label: get('permNameLp') ? (get('permNameLp').value||'LOW ROTOR') : 'LOW ROTOR' });
    }

    if (typeof extraOscs !== 'undefined') {
      extraOscs.filter(function(eo){return eo.type==='rotor';}).forEach(function(eo) {
        var srcCanvas = document.getElementById('extraChopperCanvas_eo'+eo.id);
        if (!srcCanvas) return;
        allEntries.push({
          key: 'eo'+eo.id,
          srcCanvas: srcCanvas,
          label: (typeof getEoDisplayName === 'function' ? getEoDisplayName(eo) : (eo.customName||'Oscillator'))
        });
      });
      inner.querySelectorAll('[id^="recChopperWrap_eo"]').forEach(function(el) {
        var eoId = parseInt(el.id.replace('recChopperWrap_eo',''),10);
        if (!extraOscs.some(function(e){return e.id===eoId && e.type==='rotor';})) {
          el.remove();
        }
      });
    }

    if (!showB) {
      var oldB = document.getElementById('recChopperWrap_B');
      if (oldB) oldB.remove();
    }

    var totalEntries = allEntries.length;
    var totalPages   = Math.max(1, Math.ceil(totalEntries / REC_CHOP_PER_PAGE));
    if (recChopPage > totalPages) recChopPage = 1;
    var start = (recChopPage - 1) * REC_CHOP_PER_PAGE;
    var end   = start + REC_CHOP_PER_PAGE;

    var nav  = get('recChopperPageNav');
    var ind  = get('recChopPageIndicator');
    var prev = get('recBtnChopPrev');
    var next = get('recBtnChopNext');
    if (nav)  nav.style.display  = totalPages > 1 ? 'flex' : 'none';
    if (ind)  ind.textContent    = recChopPage + ' / ' + totalPages;
    if (prev) { prev.disabled = recChopPage <= 1;           prev.style.opacity = recChopPage <= 1           ? '0.35' : '1'; }
    if (next) { next.disabled = recChopPage >= totalPages;  next.style.opacity = recChopPage >= totalPages  ? '0.35' : '1'; }

    allEntries.forEach(function(entry, idx) {
      var recC = ensureMirror(entry.key, entry.srcCanvas, entry.label);
      var wrap = document.getElementById('recChopperWrap_' + entry.key);
      var onPage = (idx >= start && idx < end);

      var lbl = document.getElementById('recChopperLbl_' + entry.key);
      if (lbl) lbl.textContent = entry.label;

      if (!onPage) {
        if (wrap) wrap.style.display = 'none';
        return;
      }
      if (wrap) wrap.style.display = '';

      var src = entry.srcCanvas;
      if (src && recC) {
        if (recC._hr) hiResCanvas(recC);
        if (recC.width  !== src.width)  recC.width  = src.width;
        if (recC.height !== src.height) recC.height = src.height;
        var ctx = recC.getContext('2d');
        ctx.clearRect(0, 0, recC.width, recC.height);
        ctx.drawImage(src, 0, 0, src.width, src.height);
      }
    });
  }

  var _recLineHistory = [];
  var _recLineLastTs = null;
  var _REC_LINE_S = 8;

  function drawRecLineGraph(ts) {
    var canvas = get('recLineCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;

    var now = ts / 1000;
    if (_recLineLastTs === null || now - _recLineLastTs >= 0.033) {
      _recLineLastTs = now;
      var rpm = (typeof currentRPM !== 'undefined' ? currentRPM : 0) + (typeof damperExtraRPM !== 'undefined' ? damperExtraRPM : 0);
      _recLineHistory.push({ t: now, rpm: rpm });
      var cutoff = now - _REC_LINE_S - 0.5;
      while (_recLineHistory.length > 1 && _recLineHistory[0].t < cutoff) _recLineHistory.shift();
    }

    ctx.clearRect(0,0,W,H);

    var peakRPM = (typeof getEffectivePeakRPM === 'function') ? getEffectivePeakRPM() : (parseFloat((get('eRPM')||{}).value) || 3600);
    var maxY = peakRPM / 0.9;
    var graphTop = H*0.08, graphBot = H*0.92, graphH = graphBot-graphTop;

    var gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#23252b';
    var mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#5a6280';
    ctx.strokeStyle=gridColor; ctx.lineWidth=1;
    for (var i=0; i<=4; i++) {
      var gy = graphTop+(i/4)*graphH;
      ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      ctx.fillStyle=mutedColor; ctx.font='9px Share Tech Mono,monospace';
      ctx.fillText(Math.round(maxY*(1-i/4)), 3, gy-2);
    }
    var peakY = graphTop+graphH*0.1;
    ctx.strokeStyle='rgba(0,229,160,0.18)'; ctx.setLineDash([4,4]); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,peakY); ctx.lineTo(W,peakY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(0,229,160,0.5)'; ctx.font='8px Share Tech Mono,monospace';
    ctx.fillText('PEAK', W-34, peakY-2);

    var startT = now - _REC_LINE_S;
    var visible = _recLineHistory.filter(function(p){ return p.t >= startT; });
    if (visible.length < 2) return;

    ctx.beginPath();
    var first = true;
    for (var j=0; j<visible.length; j++) {
      var pt = visible[j];
      var px = W*(pt.t-startT)/_REC_LINE_S;
      var py = graphTop+graphH*(1-Math.min(1,pt.rpm/maxY));
      if(first){ ctx.moveTo(px,py); first=false; } else { ctx.lineTo(px,py); }
    }
    ctx.strokeStyle='var(--accent)'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();

    var grad = ctx.createLinearGradient(0,graphTop,0,graphBot);
    grad.addColorStop(0,'rgba(0,229,160,0.18)'); grad.addColorStop(1,'rgba(0,229,160,0)');
    var last=visible[visible.length-1], vfirst=visible[0];
    ctx.lineTo(W*(last.t-startT)/_REC_LINE_S, graphBot);
    ctx.lineTo(W*(vfirst.t-startT)/_REC_LINE_S, graphBot);
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

    var lp=visible[visible.length-1];
    var dx=W*(lp.t-startT)/_REC_LINE_S, dy=graphTop+graphH*(1-Math.min(1,lp.rpm/maxY));
    ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fillStyle='var(--accent)'; ctx.fill();
  }

  var _recOscPhase = 0;
  var _recOscLastTs = null;
  function drawRecOscilloscope(ts) {
    var canvas = get('recOscCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    var dt = (_recOscLastTs === null) ? 0 : Math.min((ts - _recOscLastTs)/1000, 0.1);
    _recOscLastTs = ts;
    var rpm = (typeof currentRPM !== 'undefined' ? currentRPM : 0) + (typeof damperExtraRPM !== 'undefined' ? damperExtraRPM : 0);
    var hp = parseFloat((get('eHigherPort')||{}).value) || 12;
    var hv = parseFloat((get('eHigherVanes')||{}).value) || 5;
    var freq = rpm / 60 * hp * hv;
    _recOscPhase = (_recOscPhase + 2*Math.PI*freq*dt*0.5) % (2*Math.PI);

    var cy = H/2, amp = H*0.38;
    var _oscGrid = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#23252b';
    var _oscMid = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#5a6280';
    ctx.strokeStyle=_oscGrid; ctx.lineWidth=1;
    for(var gi=0;gi<=4;gi++){ var gy=H*gi/4; ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke(); }
    for(var gx=0;gx<=8;gx++){ var gxx=W*gx/8; ctx.beginPath();ctx.moveTo(gxx,0);ctx.lineTo(gxx,H);ctx.stroke(); }
    ctx.strokeStyle=_oscMid; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();

    if(freq < 0.1){
      ctx.strokeStyle='rgba(255,107,53,0.5)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
      var lbl = get('recOscFreqLabel'); if(lbl) lbl.textContent='0 Hz';
      return;
    }

    var waveform = (get('dWaveform')||{}).value || 'sawtooth';
    var cyclesShown = Math.max(1,Math.min(8,Math.round(freq*0.04)));
    var omega = 2*Math.PI*cyclesShown;

    ctx.shadowColor='var(--warn)'; ctx.shadowBlur=6;
    ctx.beginPath();
    for(var px=0;px<=W;px++){
      var t=px/W, phase=_recOscPhase+t*omega, y;
      if(waveform==='sine'){ y=Math.sin(phase); }
      else if(waveform==='triangle'){ var tp=((phase/(Math.PI*2))%1+1)%1; y=tp<0.5?(4*tp-1):(3-4*tp); }
      else if(waveform==='square'){ y=Math.sin(phase)>=0?1:-1; }
      else if(waveform==='sawtooth'){ var tp=((phase/(Math.PI*2))%1+1)%1; y=2*tp-1; }
      else { var tp=((phase/(Math.PI*2))%1+1)%1; y=4*tp*(1-tp)*2-1; }
      var sy=cy-y*amp;
      if(px===0) ctx.moveTo(px,sy); else ctx.lineTo(px,sy);
    }
    ctx.strokeStyle='var(--warn)'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    ctx.shadowBlur=0;

    var fDisp = freq>=1000?(freq/1000).toFixed(2)+' kHz':freq.toFixed(1)+' Hz';
    var lbl2 = get('recOscFreqLabel'); if(lbl2) lbl2.textContent=fDisp;
  }

  var _recSyncId = null;

  function syncRecSeqDisplay() {
    var seqDisp = get('recSeqDisplay');
    var seqRowsEl = get('recSeqRows');
    if (!seqDisp || !seqRowsEl) return;
    var isDamperEnabled = (typeof damperEnabled !== 'undefined') && damperEnabled;
    var isSeqActive = (typeof seqModeActive !== 'undefined') && seqModeActive;
    seqDisp.style.display = (isDamperEnabled && isSeqActive) ? '' : 'none';
    if (!isDamperEnabled || !isSeqActive) return;

    var curStep = (typeof seqCurrentStep !== 'undefined') ? seqCurrentStep : -1;
    var numSteps = (typeof seqStepCount !== 'undefined') ? seqStepCount : 4;
    var numGroups = (typeof seqNumGroups !== 'undefined') ? seqNumGroups : 1;
    var groups = (typeof seqGroups !== 'undefined') ? seqGroups : [];

    var groupColors = [
      ['rgba(0,229,160,.25)','#00e5a0'],
      ['rgba(0,184,217,.25)','#00b8d9'],
      ['rgba(167,139,250,.25)','#a78bfa'],
      ['rgba(245,158,11,.25)','#f59e0b'],
      ['rgba(239,68,68,.25)','#ef4444'],
      ['rgba(128,192,144,.25)','#80c090'],
      ['rgba(59,130,246,.25)','#3b82f6'],
      ['rgba(251,146,60,.25)','#fb923c']
    ];

    var html = '';
    for (var g = 0; g < numGroups; g++) {
      var grpArr = groups[g] || [];
      var gc = groupColors[g] || groupColors[0];
      html += '<div style="display:flex;align-items:center;gap:2px">';
      html += '<span style="font-size:7px;color:var(--muted);letter-spacing:0.5px;text-transform:uppercase;min-width:24px;flex-shrink:0">G'+(g+1)+'</span>';
      for (var s = 0; s < numSteps; s++) {
        var on = grpArr[s] ? 1 : 0;
        var isActive = (s === curStep);
        var bg = on ? gc[0] : 'var(--bg)';
        var border = on ? gc[1] : 'var(--border)';
        var color = on ? gc[1] : 'var(--muted)';
        var ring = isActive ? 'box-shadow:0 0 0 1.5px var(--yellow);' : '';
        html += '<div style="width:14px;height:14px;border-radius:2px;border:1px solid '+border+';background:'+bg+';display:flex;align-items:center;justify-content:center;font-size:6px;color:'+color+';flex-shrink:0;'+ring+'">'+(s+1)+'</div>';
      }
      html += '</div>';
    }
    seqRowsEl.innerHTML = html;

    var markerEl = get('recSeqActiveMarker');
    if (markerEl) markerEl.innerHTML = (curStep >= 0) ? ('<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg> '+(curStep+1)) : '';
  }

  function syncRecMiniPosMap() {
    var mapWrap = get('recMiniPosMapWrap');
    var userDot = get('recMiniUserDot');
    var sirenDot = get('recMiniSirenDot');
    var svg = get('recMiniRangeCirclesSvg');
    var label = get('recMiniPosLabel');
    if (!mapWrap || !userDot) return;

    var pxStr = (get('posUserDot') || {}).style;
    if (pxStr) {
      userDot.style.left = get('posUserDot').style.left;
      userDot.style.top = get('posUserDot').style.top;
      userDot.style.transform = 'translate(-50%,-50%) rotate(' + (get('posUserDot').getAttribute('data-rot') || 0) + 'deg)';
    }
    var srcSvg = get('posRangeCirclesSvg');
    if (srcSvg && svg) svg.innerHTML = srcSvg.innerHTML;
    var distEl = get('posDistanceReadout');
    if (distEl && label) label.textContent = distEl.textContent || '—';
  }

  function startSync() {
    if (_recSyncId) return;
    _recOscLastTs = null;
    function tick(ts) {
      syncFreqCards();
      syncIndicators();
      syncChopperCanvas();
      drawRecLineGraph(ts);
      drawRecOscilloscope(ts);
      syncRotDiagram();
      syncContactorDiagram();
      syncRecSeqDisplay();
      syncRecMiniPosMap();
      _recSyncId = requestAnimationFrame(tick);
    }
    _recSyncId = requestAnimationFrame(tick);
  }
  function stopSync() {
    if (_recSyncId) { cancelAnimationFrame(_recSyncId); _recSyncId = null; }
  }


  function syncPresetInfo() {
    var fields=[['ePresetModel','recPresetModel'],['ePresetMfg','recPresetMfg'],['ePresetSeries','recPresetSeries'],['ePresetDesc','recPresetDesc'],['ePresetCreator','recPresetCreator']];
    fields.forEach(function(p){var s=get(p[0]),d=get(p[1]);if(s&&d)d.textContent=s.value||'—';});
    var verEl=get('recPresetVersion');
    if(verEl){var v=(typeof _loadedPresetVersion!=='undefined'&&_loadedPresetVersion)?_loadedPresetVersion:(typeof APP_VERSION!=='undefined'?APP_VERSION:'—');verEl.textContent=v;}
  }

  function enterRecordMode() {
    syncIndicators();
    syncPresetInfo();
    var overlay = get('recordOverlay');
    if (overlay) overlay.classList.add('active');
    var sfb = get('settingsFloatBtn');
    if (sfb) sfb.style.display = 'none';
    var sp = get('settingsPanel');
    if (sp) sp.classList.remove('open');
    _recLineHistory = [];
    _recLineLastTs = null;
    _recOscLastTs = null;
    _recOscPhase = 0;
    startSync();
  }

  function exitRecordMode() {
    stopSync();
    var overlay = get('recordOverlay');
    if (overlay) overlay.classList.remove('active');
    var sfb = get('settingsFloatBtn');
    if (sfb) sfb.style.display = '';
  }

  function wire() {
    var btnRM   = get('btnRecordMode');
    var btnNorm = get('btnNormalMode');
    if (!btnRM || !btnNorm) { setTimeout(wire, 200); return; }
    btnRM.addEventListener('click', enterRecordMode);
    btnNorm.addEventListener('click', exitRecordMode);
  }
  wire();

  (function() {
    var layoutBtn = get('recLayoutBtn');
    var overlay   = get('recordOverlay');
    if (!layoutBtn || !overlay) return;
    var isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && !/Windows NT/i.test(navigator.userAgent));
    if (isMobile) {
      overlay.classList.add('layout-916');
      layoutBtn.classList.add('active');
    }
    layoutBtn.addEventListener('click', function() {
      var on = overlay.classList.toggle('layout-916');
      layoutBtn.classList.toggle('active', on);
    });
  })();

  (function wireRecControls() {
    var pairs = [
      ['recBtnSteady', 'btnSteady'],
    ];
    function tryWireRec() {
      var allReady = pairs.every(function(p){ return get(p[0]) && get(p[1]); });
      if (!allReady) { setTimeout(tryWireRec, 300); return; }
      pairs.forEach(function(p) {
        get(p[0]).addEventListener('click', function() {
          var target = get(p[1]);
          if (target) target.click();
          setTimeout(function() { syncIndicators(); }, 100);
        });
      });
      var recDamp = get('recBtnDamper');
      var mainDamp = get('btnDamperHardDisable');
      if (recDamp && mainDamp) {
        recDamp.addEventListener('click', function() {
          mainDamp.click();
          setTimeout(function() { syncIndicators(); }, 100);
        });
      }


      (function syncRecSeqBadge(){
        var badge = get('recSeqBadge');
        if(badge) badge.style.display = '';
      })();

      var recUnd = get('recTUndulate');
      var mainUnd = get('tUndulate');
      if (recUnd && mainUnd) {
        recUnd.addEventListener('change', function() {
          mainUnd.checked = recUnd.checked;
          mainUnd.dispatchEvent(new Event('change'));
        });
        mainUnd.addEventListener('change', function() {
          recUnd.checked = mainUnd.checked;
        });
        recUnd.checked = mainUnd.checked;
      }

      var recRotBtn = get('recBtnRotEnable');
      var patternSel = get('dSpatialFxMode');
      if (recRotBtn && patternSel) {
        recRotBtn.addEventListener('click', function() {
          patternSel.value = (patternSel.value === 'rotational') ? 'omni' : 'rotational';
          patternSel.dispatchEvent(new Event('change'));
          setTimeout(function() { syncIndicators(); syncRotDiagram(); }, 100);
        });
      }

      var verEl = get('recVersionBig');
      var appVerEl = get('headerVersion');
      if (verEl) verEl.textContent = appVerEl ? appVerEl.textContent : (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '');
    }
    tryWireRec();
  })();
})();

const IR_PRESETS = {
  '3T22_IR':  SIRENOSC_ASSETS["ir.3T22_IR"],
  'P50_IR':   SIRENOSC_ASSETS["ir.P50_IR"],
  '20FT':     SIRENOSC_ASSETS["ir.20FT"],
  '20FT_BS':  SIRENOSC_ASSETS["ir.20FT_BS"],
  '50FT_BS':  SIRENOSC_ASSETS["ir.50FT_BS"],
  '80FT':     SIRENOSC_ASSETS["ir.80FT"],
  '100FT_IN': SIRENOSC_ASSETS["ir.100FT_IN"],
  'WORKSHOP': SIRENOSC_ASSETS["ir.WORKSHOP"],
  'DRY_CLR':  SIRENOSC_ASSETS["ir.DRY_CLR"],
  'WET_OET':  SIRENOSC_ASSETS["ir.WET_OET"],
};

function _loadPresetIR(presetKey, nameElId, statusElId, onDecoded) {
  const dataUrl = IR_PRESETS[presetKey];
  if (!dataUrl) return;
  const nameEl   = get(nameElId);
  const statusEl = get(statusElId);
  const label    = presetKey.replace('_IR','').replace('_',' ');
  if (nameEl)   nameEl.textContent = label + '.wav';
  if (statusEl) { statusEl.textContent = 'Decoding...'; statusEl.style.color = 'var(--muted)'; statusEl.style.display = ''; }

  const base64 = dataUrl.split(',')[1];
  const raw    = safeAtob(base64);
  const buf    = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);

  if (!audioCtx) {
    if (statusEl) { statusEl.textContent = 'Start audio first'; statusEl.style.color = 'var(--warn)'; }
    return;
  }
  audioCtx.decodeAudioData(buf.buffer, function(decoded) {
    if (statusEl) { statusEl.textContent = 'Loaded \u2014 ' + decoded.duration.toFixed(2) + 's'; statusEl.style.color = 'var(--accent)'; }
    onDecoded(decoded);
  }, function() {
    if (statusEl) { statusEl.textContent = 'Decode failed'; statusEl.style.color = 'var(--red)'; }
  });
}

(function() {
  var sel = get('revPreset1');
  if (!sel) return;
  sel.addEventListener('change', function() {
    var key = this.value;
    if (!key) return;
    _loadPresetIR(key, 'reverbIRName', 'reverbIRStatus', function(buf) {
      reverb1IRBuffer = buf;
      if (reverbNode) reverbNode.buffer = buf;
      if (audioCtx && reverbEnabled) rebuildFxChain();
    });
  });
})();

(function() {
  var sel = get('revPreset2');
  if (!sel) return;
  sel.addEventListener('change', function() {
    var key = this.value;
    if (!key) return;
    _loadPresetIR(key, 'reverb2IRName', 'reverb2IRStatus', function(buf) {
      reverb2IRBuffer = buf;
      if (reverb2Node) reverb2Node.buffer = buf;
      if (audioCtx && reverb2Enabled) rebuildFxChain();
    });
  });
})();

(function() {
  var sel = get('revPreset3');
  if (!sel) return;
  sel.addEventListener('change', function() {
    var key = this.value;
    if (!key) return;
    _loadPresetIR(key, 'reverb3IRName', 'reverb3IRStatus', function(buf) {
      reverb3IRBuffer = buf;
      if (reverb3Node) reverb3Node.buffer = buf;
      if (audioCtx && reverb3Enabled) rebuildFxChain();
    });
  });
})();

(function applyReverbDefaults() {
  function tryInit() {
    var sel1 = get('dReverb1Mode');
    var sel2 = get('dReverb2Mode');
    var sel3 = get('dReverb3Mode');
    if (!sel1 || !sel2 || !sel3) { setTimeout(tryInit, 100); return; }
    sel1.value = 'convolver';
    applyReverb1Mode('convolver');
    sel2.value = 'convolver';
    applyReverb2Mode('convolver');
    sel3.value = 'convolver';
    applyReverb3Mode('convolver');
    var p1 = get('revPreset1');
    if (p1) p1.value = '3T22_IR';
    var p2 = get('revPreset2');
    if (p2) p2.value = '50FT_BS';
    var p3 = get('revPreset3');
    if (p3) p3.value = '100FT_IN';
    if (typeof setSpatialFxMode === 'function') setSpatialFxMode(spatialFxMode);
  }
  tryInit();
  (function waitForAudio() {
    if (typeof audioCtx === 'undefined' || !audioCtx) { setTimeout(waitForAudio, 250); return; }
    _loadPresetIR('3T22_IR', 'reverbIRName', 'reverbIRStatus', function(buf) {
      reverb1IRBuffer = buf;
      if (reverb1Mode === 'convolver' && reverbNode) reverbNode.buffer = buf;
      if (reverb1Mode === 'convolver' && audioCtx && reverbEnabled) rebuildFxChain();
    });
    _loadPresetIR('50FT_BS', 'reverb2IRName', 'reverb2IRStatus', function(buf) {
      reverb2IRBuffer = buf;
      if (reverb2Mode === 'convolver' && reverb2Node) reverb2Node.buffer = buf;
      if (reverb2Mode === 'convolver' && audioCtx && reverb2Enabled) rebuildFxChain();
    });
    _loadPresetIR('100FT_IN', 'reverb3IRName', 'reverb3IRStatus', function(buf) {
      reverb3IRBuffer = buf;
      if (reverb3Mode === 'convolver' && reverb3Node) reverb3Node.buffer = buf;
      if (reverb3Mode === 'convolver' && audioCtx && reverb3Enabled) rebuildFxChain();
    });
  })();
})();

