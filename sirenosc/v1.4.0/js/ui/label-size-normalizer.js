
(function normalizeLabelSizes() {
  function run() {
    var skip = new Set(['INPUT','SELECT','TEXTAREA','BUTTON']);
    var all = document.querySelectorAll('[style*="font-size:11px"],[style*="font-size: 11px"]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (skip.has(el.tagName)) continue;
      var st = el.style;
      var cs = window.getComputedStyle(el);
      if (cs.textTransform === 'uppercase' || st.textTransform === 'uppercase') {
        st.fontSize = '9px';
        st.textTransform = 'uppercase';
      }
    }
    var portLabels = document.querySelectorAll('label[style*="font-size:11px"]');
    for (var j = 0; j < portLabels.length; j++) {
      portLabels[j].style.fontSize = '9px';
      portLabels[j].style.textTransform = 'uppercase';
    }
    var dampHeader = document.querySelector('#damperAudioSection');
    if (dampHeader) {
      var spans = dampHeader.querySelectorAll('span[style]');
      for (var k = 0; k < spans.length; k++) {
        if (spans[k].style.fontSize) {
          spans[k].style.fontSize = '9px';
          spans[k].style.textTransform = 'uppercase';
        }
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  setTimeout(run, 800);
  setTimeout(run, 2500);
  window.normalizeLabelSizes = run;
})();
