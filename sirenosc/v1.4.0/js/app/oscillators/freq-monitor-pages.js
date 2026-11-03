const FREQ_EXTRA_PER_PAGE = 10;
let freqMonitorPage = 1;

function getTotalFreqPages(){
  const extraCount = extraOscs.length;
  if(extraCount === 0) return 1;
  return 1 + Math.ceil(extraCount / FREQ_EXTRA_PER_PAGE);
}

function rebuildFreqPages(){  }
function renderFreqMonitorPage(){  }
function updateFreqPageButton(){  }

function addExtraOscMixerSlider(eo){
  const col = getEoColor(eo);
  const shortName = getEoDisplayName(eo);
  const row = document.createElement('div');
  row.className = 'slider-row';
  row.id = 'mixerRowEO'+eo.id;
  const maxVal = 100;
  const initVal = eo.mixerVal ?? 40;
  row.innerHTML = `<span class="slider-label" style="color:${col}">${shortName}</span><input type="range" id="sEO${eo.id}" min="0" max="${maxVal}" step="1" value="${initVal}" style="accent-color:${col}"><span class="slider-val" id="svEO${eo.id}" style="color:${col}">${initVal}%</span>`;
  get('extraOscMixerRows').appendChild(row);
  document.getElementById('sEO'+eo.id).addEventListener('input', function(){
    eo.mixerVal = parseFloat(this.value);
    document.getElementById('svEO'+eo.id).textContent = this.value+'%';
    pushGains(0.04);
    if(eo.type==='vane' && !chopperAnimEnabled) redrawChoppers(chopperAngleA, chopperAngleB);
  });
}

get('btnAddExtraOscRotor').addEventListener('click', function(){
  if(!canAddExtraOsc('rotor')) return;
  addExtraOsc('rotor');
});
get('btnAddExtraOscHarmonic').addEventListener('click', function(){
  if(!canAddExtraOsc('harmonic')) return;
  addExtraOsc('harmonic');
});

