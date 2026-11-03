
document.title = 'SirenOsc V1.4.0 - Open Siren Synthesizer';
(function(){
  var link = document.querySelector("link[rel~='icon']") || document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = SIRENOSC_ASSETS["favicon"];
  document.head ? document.head.appendChild(link) : document.documentElement.appendChild(link);
})();
