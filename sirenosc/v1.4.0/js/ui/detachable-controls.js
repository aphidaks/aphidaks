
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var section      = document.getElementById('controlsSection');
    var titleBar     = document.getElementById('controlsSecTitle');
    var detachBtn    = document.getElementById('btnDetachControls');
    var layoutSelect = document.getElementById('controlsLayoutSelect');
    if(!section || !titleBar || !detachBtn || !layoutSelect) return;

    var LS_KEY = 'sirenosc_controls_detach';

    function applyLayout(mode){
      section.classList.toggle('controls-compact', mode === 'compact');
    }

    function clampToViewport(){
      var rect = section.getBoundingClientRect();
      var maxX = Math.max(0, window.innerWidth/(window._uiZoom||1) - rect.width);
      var maxY = Math.max(0, window.innerHeight/(window._uiZoom||1) - rect.height);
      var x = Math.min(Math.max(rect.left, 0), maxX);
      var y = Math.min(Math.max(rect.top, 0), maxY);
      section.style.left = x + 'px';
      section.style.top  = y + 'px';
    }

    function setDetached(on, x, y){
      section.classList.toggle('controls-detached', on);
      layoutSelect.style.display = on ? '' : 'none';
      detachBtn.classList.toggle('active', on);
      if(on){
        var rect = section.getBoundingClientRect();
        section.style.left = (x != null ? x : rect.left) + 'px';
        section.style.top  = (y != null ? y : rect.top)  + 'px';
        section.style.right = 'auto';
        clampToViewport();
      } else {
        section.style.left = '';
        section.style.top  = '';
        section.style.right = '';
        layoutSelect.value = 'wide';
        applyLayout('wide');
      }
      save();
    }

    function save(){
      try {
        var rect = section.getBoundingClientRect();
        localStorage.setItem(LS_KEY, JSON.stringify({
          detached: section.classList.contains('controls-detached'),
          compact:  section.classList.contains('controls-compact'),
          x: parseFloat(section.style.left) || rect.left,
          y: parseFloat(section.style.top)  || rect.top
        }));
      } catch(e){}
    }

    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if(saved.compact){ layoutSelect.value = 'compact'; applyLayout('compact'); }
      if(saved.detached){ setDetached(true, saved.x, saved.y); }
    } catch(e){}

    detachBtn.addEventListener('click', function(){
      setDetached(!section.classList.contains('controls-detached'));
    });

    layoutSelect.addEventListener('change', function(){
      applyLayout(this.value);
      save();
    });

    var dragging = false, offX = 0, offY = 0;
    function dragStart(clientX, clientY, target){
      if(!section.classList.contains('controls-detached')) return false;
      if(target.closest('select') || target.closest('button')) return false;
      var rect = section.getBoundingClientRect();
      offX = clientX - rect.left;
      offY = clientY - rect.top;
      dragging = true;
      return true;
    }
    function dragMove(clientX, clientY){
      if(!dragging) return;
      var rect = section.getBoundingClientRect();
      var maxX = Math.max(0, window.innerWidth/(window._uiZoom||1) - rect.width);
      var maxY = Math.max(0, window.innerHeight/(window._uiZoom||1) - rect.height);
      var x = Math.min(Math.max(clientX - offX, 0), maxX);
      var y = Math.min(Math.max(clientY - offY, 0), maxY);
      section.style.left = x + 'px';
      section.style.top  = y + 'px';
    }
    function dragEnd(){
      if(dragging){ dragging = false; save(); }
    }

    titleBar.addEventListener('mousedown', function(e){
      if(dragStart(e.clientX, e.clientY, e.target)) e.preventDefault();
    });
    document.addEventListener('mousemove', function(e){ dragMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', dragEnd);

    titleBar.addEventListener('touchstart', function(e){
      var t = e.touches[0];
      dragStart(t.clientX, t.clientY, e.target);
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
      if(!dragging) return;
      var t = e.touches[0];
      dragMove(t.clientX, t.clientY);
    }, {passive:true});
    document.addEventListener('touchend', dragEnd);

    window.addEventListener('resize', function(){
      if(section.classList.contains('controls-detached')) clampToViewport();
    });
  });
})();
