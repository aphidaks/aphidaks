
window._ucSet=function(el){ if(!el) return; var t=(el.tagName||'').toUpperCase(); if(t==='TEXTAREA'||(t==='INPUT'&&/^(text|search|email|url|password|tel|)$/i.test(el.getAttribute('type')||'text'))) return; el.style.setProperty('text-transform','uppercase','important'); };
