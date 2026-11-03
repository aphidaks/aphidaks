(function () {
  window.SIRENOSC_ASSETS = window.SIRENOSC_ASSETS || {};
  function load(inline, path) {
    if (inline && typeof inline === 'object') return inline;
    try {
      var x = new XMLHttpRequest(); x.open('GET', path, false); x.send(null);
      if (x.responseText && (x.status === 200 || x.status === 0)) return JSON.parse(x.responseText);
    } catch (e) {  }
    return null;
  }
  window.SIRENOSC_SETTINGS = load(SIRENOSC_ASSETS["settings.json"], 'settings.json');

  var raw = load(SIRENOSC_ASSETS["presets/presets.json"], 'presets/presets.json');
  function norm(e) {
    if (!e || typeof e !== 'object' || typeof e.presetfile !== 'string' || !e.presetfile.trim()) return null;
    var file = e.presetfile.trim().replace(/^.*[\\\/]/, '');
    return {
      name: String(e.presetname == null || e.presetname === '' ? file.replace(/\.oscp$/i, '') : e.presetname),
      file: file,
      available: !(e.available === false || e.available === 'false' || e.available === 0)
    };
  }
  var def = (raw && norm(raw['default'])) || { name: 'DEFAULT PRESET (THUNDERBOLT 1003)', file: 'default.oscp', available: true };
  var list = (raw && Array.isArray(raw.presets) ? raw.presets : []).map(norm).filter(Boolean);
  window.SIRENOSC_PRESETS = { 'default': def, list: list, fromJson: !!(raw && typeof raw === 'object') };
})();
