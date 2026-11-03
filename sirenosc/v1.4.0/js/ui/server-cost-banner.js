
(function(){
  try{
    var header = document.getElementById('serverCostBannerHeader');
    var body   = document.getElementById('serverCostBannerBody');
    var arrow  = document.getElementById('serverCostBannerArrow');
    var isMinimized = true;
    var banner = document.getElementById('serverCostBanner');
    var closeBtn = document.getElementById('serverCostBannerClose');
    var cfg = window.SIRENOSC_SETTINGS && window.SIRENOSC_SETTINGS.announcement;
    if (cfg && typeof cfg === 'object') {
      if (cfg.show === false || cfg.show === 'false') { banner.style.display = 'none'; return; }
      var tEl = document.getElementById('serverCostBannerText'), psEl = document.getElementById('serverCostBannerPs'), kfBtn = document.getElementById('serverCostBannerKofiBtn');
      if (tEl && typeof cfg.text === 'string') tEl.textContent = cfg.text;
      if (psEl && typeof cfg.ps === 'string') {
        if (!cfg.ps.trim()) { psEl.style.display = 'none'; var br = psEl.previousElementSibling; if (br && br.tagName === 'BR') br.style.display = 'none'; }
        else psEl.textContent = cfg.ps;
      }
      var bc = cfg.button;
      if (kfBtn && bc && typeof bc === 'object') {
        if (bc.show === false || bc.show === 'false') kfBtn.style.display = 'none';
        else { if (typeof bc.label === 'string' && bc.label) kfBtn.textContent = bc.label; if (typeof bc.url === 'string' && /^https?:\/\//i.test(bc.url)) kfBtn.href = bc.url; }
      }
    }
    try { if (sessionStorage.getItem('serverCostBannerClosed') === '1') { banner.style.display = 'none'; return; } } catch(e){}
    closeBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      try { sessionStorage.setItem('serverCostBannerClosed', '1'); } catch(e){}
      banner.style.overflow = 'hidden';
      banner.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
      banner.style.maxHeight = banner.offsetHeight + 'px';
      void banner.offsetHeight;
      banner.style.maxHeight = '0px';
      banner.style.opacity = '0';
      setTimeout(function(){ banner.style.display = 'none'; }, 260);
    });

    function applyState(skipAnim){
      if (skipAnim) body.classList.add('scb-noanim');
      if (isMinimized){
        body.style.maxHeight = body.scrollHeight + 'px';
        void body.offsetHeight;
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        body.style.transform = 'translateY(-6px)';
        arrow.innerHTML = '<svg class="si" aria-hidden="true"><use href="#si-tri-u"/></svg>';
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        body.style.transform = 'translateY(0)';
        arrow.innerHTML = '<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>';
      }
      if (skipAnim) { void body.offsetHeight; body.classList.remove('scb-noanim'); }
    }
    function setMinimized(isMin, skipAnim){
      isMinimized = isMin;
      applyState(skipAnim);
      try { localStorage.setItem('serverCostBannerMinimized', isMin ? '1' : '0'); } catch(e){}
    }

    setMinimized(localStorage.getItem('serverCostBannerMinimized') !== '0', true);

    header.addEventListener('click', function(){
      setMinimized(!isMinimized);
    });
    window.addEventListener('resize', function(){
      if (!isMinimized) body.style.maxHeight = body.scrollHeight + 'px';
    });
  }catch(e){}
})();
