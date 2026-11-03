
(function(){ if(typeof AudioParam==='undefined') return;
  ['setTargetAtTime','setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime'].forEach(function(n){
    var o=AudioParam.prototype[n]; if(!o) return;
    AudioParam.prototype[n]=function(){ for(var k=0;k<arguments.length;k++){ if(typeof arguments[k]==='number' && !isFinite(arguments[k])){ console.warn('[AudioParam] skipped non-finite '+n+'('+Array.prototype.join.call(arguments,', ')+')\n'+new Error().stack); return this; } } return o.apply(this,arguments); };
  });
})();
