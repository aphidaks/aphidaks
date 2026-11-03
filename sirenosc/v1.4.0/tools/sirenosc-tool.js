#!/usr/bin/env node
/* SirenOsc structure tool (CLI) - same engine as SirenOsc-Compiler.html
   usage:  node tools/sirenosc-tool.js decompile <single.html> <project-dir> [--clean]
           node tools/sirenosc-tool.js compile   <project-dir> <single.html> [--refresh]
           node tools/sirenosc-tool.js verify    <single.html | project-dir> */
'use strict';
const fs = require('fs'), path = require('path');
const E = (() => { const module = { exports: {} };
/* =====================================================================
   SirenOsc structure engine  -  single HTML  <->  structured project
   Pure functions, no DOM, no fs.  Runs in the browser (compiler app) and in Node (CLI).
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SirenEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FORMAT = 'sirenosc-structure/2';
  const ENGINE_VERSION = '2.2.0';
  const BIG = 20000;                     // string literals longer than this become asset files
  const HDR_B = '<!--@@sirenosc:header@@-->';
  const HDR_E = '<!--@@/sirenosc:header@@-->';
  const MANIFEST_ID = 'sirenosc-structure';

  /* Known layout of the V1.4.0 project (first 100 chars of every file) - used ONLY to name parts of
     an UNMARKED single file. Marked single files carry their own structure and never use this. */
  const LAYOUT = [{"p":"js/boot/text-case.js","k":"js","s":"// text boxes keep whatever case is typed; the text-scale pass uses this instead of forcing uppercas"},{"p":"js/boot/mp3-virtual-time-shim.js","k":"js","s":"// EXPORT MP3 renderer. Does NOTHING in a normal page. Inside the hidden copy of the app that EXPORT"},{"p":"js/boot/no-tooltips.js","k":"js","s":"// No hover tooltips anywhere: block title attributes / properties and SVG <title> children, now and"},{"p":"js/boot/background-keepalive.js","k":"js","s":"// BACKGROUND KEEP-ALIVE. Hidden/embedded tabs lose animation frames and get page timers throttled t"},{"p":"js/boot/audioparam-guard.js","k":"js","s":"// Guard: AudioParam automation throws on NaN/Infinity (e.g. a slider/preset value that parsed to Na"},{"p":"js/boot/simulation-clock.js","k":"js","s":"// ---- Simulation clock: PAUSE freezes every animation frame, the page clock, script timers and the"},{"p":"js/boot/auto-ui-scale.js","k":"js","s":"// ---- Auto UI scale: zoom follows the window size so the interface looks the same on any display -"},{"p":"js/boot/title-and-favicon.js","k":"js","s":"document.title = 'SirenOsc V1.4.0 - Open Siren Synthesizer';\n(function(){\n  var link = document.quer"},{"p":"js/boot/visual-style-and-logos.js","k":"js","s":"// Visual style (Flat / Glossy): applied before first paint so there is no flash\n(function(){ try{\n "},{"p":"css/01-main.css","k":"css","s":"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Open+Sans:ital,wght@0,4"},{"p":"css/02-icons.css","k":"css","s":".si{display:inline-block;width:1em;height:1em;vertical-align:-.14em;flex-shrink:0;pointer-events:non"},{"p":"js/ui/icons.js","k":"js","s":"window.SI=function(n){return '<svg class=\"si\" aria-hidden=\"true\"><use href=\"#si-'+n+'\"/></svg>';};"},{"p":"css/03-please-wait.css","k":"css","s":"@keyframes pleaseWaitSpin { to { transform: rotate(360deg); } }\n/* the Square / Old Classic themes z"},{"p":"js/ui/please-wait-overlay.js","k":"js","s":"(function(){\n  function hidePleaseWait(){\n    var el = document.getElementById('pleaseWaitOverlay');"},{"p":"css/04-intro-popup.css","k":"css","s":"#introPopup .popup-box {\n  overflow: visible;\n}\n#introContent { }\n/* Override btn-accent hover to in"},{"p":"js/ui/popup-backdrop.js","k":"js","s":"(function(){\n  function updateBackdrop() {\n    var bd = document.getElementById('popupBackdrop');\n  "},{"p":"js/ui/startup-popups.js","k":"js","s":"(function(){\n  var isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(n"},{"p":"js/ui/dont-show-again.js","k":"js","s":"// \"Don't show this again\" — checkbox state carries forward across popups, unchecking cancels it.\n//"},{"p":"js/ui/update-and-reset-popups.js","k":"js","s":"(function(){\n  // Version-specific \"seen\" keys. A key that has never been written means the user has"},{"p":"css/05-layout-and-doc-tabs.css","k":"css","s":"#docTabBar{position:relative;flex:0 0 auto;width:100%;height:34px;z-index:9000;display:flex;align-it"},{"p":"css/06-server-cost-banner.css","k":"css","s":"  #serverCostBannerBody{transition:max-height 0.35s ease, opacity 0.3s ease, transform 0.35s ease}\n "},{"p":"js/ui/server-cost-banner.js","k":"js","s":"(function(){\n  try{\n    var header = document.getElementById('serverCostBannerHeader');\n    var body"},{"p":"css/07-mp3-export-block.css","k":"css","s":"  #mp3Block{position:fixed;inset:0;z-index:10015;display:none;background:rgba(0,0,0,.45);cursor:wait"},{"p":"css/08-mp3-export-popup.css","k":"css","s":"  #exportMp3Popup .mfile-popup-box{max-height:90vh;overflow-y:auto}\n  #exportMp3Popup input[type=\"te"},{"p":"css/09-community-and-popups.css","k":"css","s":"  .community-tab-btn {\n    background: transparent;\n    border: none;\n    border-bottom: 2px solid t"},{"p":"css/10-rotor-config.css","k":"css","s":"#rotorConfigSec{--accent:#9a9a9a;--accent2:#9a9a9a}\n#rotorConfigSec .sec-title{color:#fff !important"},{"p":"css/11-controller-canvas.css","k":"css","s":"/* ---- Controller canvas text is not clickable/selectable in Test mode and in the main-tab Controll"},{"p":"css/12-detached-controls.css","k":"css","s":"#controlsSection.controls-detached{\n  position:fixed;\n  z-index:5000;\n  width:260px;\n  max-height:85"},{"p":"css/13-fx-section.css","k":"css","s":"#fxSection{font-size:11px !important;letter-spacing:1px !important}\n#blowerSection{font-size:11px !i"},{"p":"js/app/core/helpers.js","k":"js","s":"const APP_VERSION = 'V1.4.0';\n\nconst get=id=>document.getElementById(id);\n// Tolerant base64 decoder","g":"app"},{"p":"js/app/editor/manage-functions.js","k":"js","s":"// ============================================================\n// MANAGE FUNCTIONS SYSTEM\n// ======","g":"app"},{"p":"js/app/audio/core-state.js","k":"js","s":"// ============================================================\n// END MANAGE FUNCTIONS\n// =========","g":"app"},{"p":"js/app/audio/motors-and-rpm.js","k":"js","s":"// ---- MULTI MOTOR (up to 8) ----\n// Motor 1 = main motor. Motors 2..8 are geared to Motor 1 (as if","g":"app"},{"p":"js/app/audio/rasp-and-rpm-filter.js","k":"js","s":"// ---- Sub-V (Coarse Rasp): per-cycle pitch pattern for an oscillator ----\n// The oscillator's wave","g":"app"},{"p":"js/app/fx/engine-and-speed-of-sound.js","k":"js","s":"// ---- FX ENGINE ----\nlet fxChainOut = null;\n\n// Damper audio entry point — injected before slpf so","g":"app"},{"p":"js/app/fx/8d-audio-and-reverb-link.js","k":"js","s":"// ---- 8D AUDIO ENGINE (Distance + Direction) ----\n// Both stages are a StereoPannerNode whose .pan","g":"app"},{"p":"js/app/fx/constant-blower-link.js","k":"js","s":"// ---- CONSTANT BLOWER LINK — ticks every frame via updateBlowerFade ----\nfunction tickConstBlowerL","g":"app"},{"p":"js/app/audio/audio-context-and-filters.js","k":"js","s":"\n\n\nfunction getFilterCutoff(){\n  const peakRPM=parseFloat(get('eRPM').value)||3600;   // Peak RPM fi","g":"app"},{"p":"js/app/control/voltage-decline.js","k":"js","s":"// ---- VOLTAGE DECLINE STATE ----\nlet _vdVolts = null; // null = not active; else the declining sup","g":"app"},{"p":"js/app/control/dampers-and-vibrato.js","k":"js","s":"// ---- DAMPERS ----\n\nfunction ensureDampers(){\n  if(!damperEnabled||!audioCtx) return;\n  if(seqMode","g":"app"},{"p":"js/app/control/sequence-mode.js","k":"js","s":"// ---- SEQUENCE MODE ENGINE ----\nfunction buildSeqUI(){\n  const count=seqStepCount;\n  // Ensure eac","g":"app"},{"p":"js/app/control/contactor-motor.js","k":"js","s":"// ---- CONTACTOR MOTOR ----\nlet contactorRPM = 0;\nlet contactorAnimId = null;\nlet contactorStartTim","g":"app"},{"p":"js/app/oscillators/extra-oscillators.js","k":"js","s":"// ============================================================\n// EXTRA ROTORS / EXTRA OSCILLATORS ","g":"app"},{"p":"js/app/oscillators/reorder-and-mixer-sync.js","k":"js","s":"// ---- Drag-to-reorder for extra oscillators (rotors, vanes, harmonics, stators) ----\n// A \"root\" i","g":"app"},{"p":"js/app/oscillators/freq-monitor-pages.js","k":"js","s":"// ============================================================\n// FREQ MONITOR MULTI-PAGE SYSTEM\n//","g":"app"},{"p":"js/app/oscillators/chopper-diagram-pagination.js","k":"js","s":"// ============================================================\n// CHOPPER DIAGRAM PAGINATION\n// Bui","g":"app"},{"p":"js/app/oscillators/apply-config.js","k":"js","s":"// ============================================================\n// END EXTRA ROTORS SYSTEM\n// ======","g":"app"},{"p":"js/app/sim/wiring-diagram.js","k":"js","s":"// ---- WIRING DIAGRAM ----\n(function(){\n  var canvas=get('wiringCanvas');\n  var ctx=canvas.getConte","g":"app"},{"p":"js/app/sim/motor-type-selector.js","k":"js","s":"// ---- MOTOR SIMULATION TYPE / MOTOR TYPE ----\n(function(){\n  var MOTOR_TYPES={\n    dc:  [['series'","g":"app"},{"p":"js/app/sim/torque-simulation.js","k":"js","s":"// ============================================================\n// TORQUE-BASED MOTOR SIMULATION (Se","g":"app"},{"p":"js/app/control/brake-and-easing.js","k":"js","s":"// ============================================================\n// END TORQUE-BASED MOTOR SIMULATION","g":"app"},{"p":"js/app/ui/dual-motor-and-reverb-controls.js","k":"js","s":"// ---- DUAL MOTOR CONTROLS ----\n(function(){\n  function syncDualMotorUI(enabled) {\n    dualMotorEna","g":"app"},{"p":"js/app/fx/spatial-fx-pattern.js","k":"js","s":"// ---- DISTANCE CONTROLS ----\nget('btnDistanceEnable').addEventListener('click', () => {\n  distance","g":"app"},{"p":"js/app/fx/position-map.js","k":"js","s":"// ---- POSITION MAP (Siren fixed at center, Listener draggable) ----\n(function() {\n  const M_PER_MI","g":"app"},{"p":"js/app/ui/fx-controls.js","k":"js","s":"// ---- SPEED OF SOUND CONTROLS ----\nfunction _setEnableBtn(id, bodyId, on){\n  const b = get(id); if","g":"app"},{"p":"js/app/editor/mode-switch-and-layout.js","k":"js","s":"// ---- Controller Editor: mode switch (Graphical / Functional). Content of each mode is added later","g":"app"},{"p":"js/app/editor/panel-layout.js","k":"js","s":"// ---- Controller Editor: panel layout (resize, drag to rearrange, collapse / expand, reset) ----\n(","g":"app"},{"p":"js/app/editor/graphical-editor.js","k":"js","s":"// ---- Controller Editor: Graphical Editor workspace ----\n(function(){\n  var svg=document.getElemen","g":"app"},{"p":"js/app/editor/functional-editor.js","k":"js","s":"// ============================================================\n// Controller Editor: FUNCTIONAL EDI","g":"app"},{"p":"js/app/ui/top-stack-and-editor-overlay.js","k":"js","s":"// ---- Top stack: SirenOsc header, file ribbon (menu bar) and document tabs, fixed full-width at th","g":"app"},{"p":"js/app/ui/f2-debug-overlay.js","k":"js","s":"// ============================================================\n// F2 DEBUG OVERLAY — simulation, pe","g":"app"},{"p":"js/app/control/steady-control-and-motor-state.js","k":"js","s":"// ============================================================\n// STEADY-BASED CONTROL SYSTEM\n// ST","g":"app"},{"p":"js/app/oscillators/permanent-oscillators.js","k":"js","s":"// ============================================================\n// PERMANENT OSCILLATORS (High Rotor","g":"app"},{"p":"js/app/ui/color-picker.js","k":"js","s":"// ============================================================\n// CUSTOM COLOR PICKER\n// Replaces n","g":"app"},{"p":"js/app/core/init-after-config.js","k":"js","s":"// ============================================================\n// END COLOR QUICK-SELECT\n// =======","g":"app"},{"p":"js/app/control/state-override.js","k":"js","s":"// ============================================================\n// STATE OVERRIDE LOGIC\n// =========","g":"app"},{"p":"js/app/oscillators/chopper-visualizer.js","k":"js","s":"// ============================================================\n// END STATE OVERRIDE LOGIC\n// =====","g":"app"},{"p":"js/app/presets/preset-state-tracking.js","k":"js","s":"// ============================================================\n// PRESET SAVE/LOAD SYSTEM (.oscp fo","g":"app"},{"p":"js/app/presets/settings-and-controller-data.js","k":"js","s":"// ---- Controller (.oscct / controller.json) ----\n// ---- App settings (settings.json): popups, the","g":"app"},{"p":"js/app/presets/damper-states.js","k":"js","s":"// ============================================================\n// DAMPER STATES: save every paramet","g":"app"},{"p":"js/app/presets/position-fx-and-preset-io.js","k":"js","s":"// ---- POSITION EFFECTS (Distance, Direction, Position Map) — saved to posfx.json ----\nfunction gat","g":"app"},{"p":"js/app/presets/effects-toggle-and-builtin-presets.js","k":"js","s":"// ---- ALL-EFFECTS TOGGLE ----\n// Snapshot stored in localStorage so it survives page reloads but n","g":"app"},{"p":"js/app/control/rotation-and-bidir-filters.js","k":"js","s":"// ---- ROTATION ----\n// No separate \"Rotation Reverb\" stage — rotational mode instead drives the\n//","g":"app"},{"p":"js/app/control/shut-dampers-and-collector-ring.js","k":"js","s":"// ---- SHUT-DAMPERS FUNCTION ----\n(function() {\n  // Returns true when both dampers are currently i","g":"app"},{"p":"js/app/oscillators/constants.js","k":"js","s":"// ---- CONSTANTS — dynamic (A, B, + user-added) ----\n// Colors cycle through these for C, D, E...\nc","g":"app"},{"p":"js/app/ui/audio-tip-popup.js","k":"js","s":"// ---- AUDIO TIP POPUP ----\n(function(){\n  var audioTipTimer = null;\n  var audioTipShown = false;\n ","g":"app"},{"p":"js/app/settings/settings-persistence.js","k":"js","s":"// ---- SETTINGS PERSISTENCE (localStorage) ----\n(function(){\n  const LS_KEY = 'sirenosc_settings';\n","g":"app"},{"p":"js/app/settings/settings-panel.js","k":"js","s":"// ============================================================\n// SETTINGS PANEL (floating button)\n","g":"app"},{"p":"js/app/audio/damper-audio-engine.js","k":"js","s":"// ============================================================\n// =================================","g":"app"},{"p":"css/14-record-overlay.css","k":"css","s":"#recordOverlay {\n  display: none;\n  position: fixed;\n  inset: 0;\n  background: var(--bg);\n  z-index:"},{"p":"js/app/record/record-mode.js","k":"js","s":"// ============================================================\n// RECORD MODE\n// =================="},{"p":"css/15-debug-typography.css","k":"css","s":"/* ---- DEBUG TYPOGRAPHY PANEL ---- */\n#dbgTypoPanel {\n  position: fixed;\n  top: 14px;\n  right: 14px"},{"p":"js/ui/label-size-normalizer.js","k":"js","s":"// ---- POST-RENDER LABEL SIZE NORMALIZER ----\n// Sets inline-styled UI labels to 9px and uppercase."},{"p":"js/ui/text-size-selector.js","k":"js","s":"(function() {\n  var SIZES = [\n    { label: 'Very Small',   px: 7  },\n    { label: 'Small',        px"},{"p":"js/ui/menu-bar.js","k":"js","s":"(function() {\n  'use strict';\n\n  // ---- Menu open/close ----\n  function closeAllMenus() {\n    docum"},{"p":"css/16-code-editor.css","k":"css","s":"/* ---- Code editor: dropdown/input colours, size-to-content slots ---- */\n.fb .fs-slot select,.fe-f"},{"p":"js/ui/code-editor-slots.js","k":"js","s":"(function(){\n  if(window.CSS&&CSS.supports&&CSS.supports('field-sizing','content')) return;\n  var ra"},{"p":"js/ui/master-control-bar.js","k":"js","s":"(function(){\n  document.addEventListener('DOMContentLoaded', function(){\n    var bar=document.getEle"},{"p":"js/ui/master-volume.js","k":"js","s":"(function(){\n  function init(){\n    var m=document.getElementById('sMasterVol'), b=document.getEleme"},{"p":"js/ui/detachable-controls.js","k":"js","s":"(function(){\n  document.addEventListener('DOMContentLoaded', function(){\n    var section      = docu"},{"p":"js/app/documents/document-tabs.js","k":"js","s":"// ============================================================\n// DOCUMENT TABS: one tab group per "},{"p":"js/theme/old-classic-colours.js","k":"js","s":"// Old Classic colour hook: while that theme is active every colour drawn to a canvas is remapped to"},{"p":"js/theme/old-classic-sweeper.js","k":"js","s":"// Old Classic sweeper: any element still showing a saturated colour (inline styles set by JS, per-o"},{"p":"css/17-glossy-style.css","k":"css","s":"/* ===== GLOSSY STYLE (Preferences > Style). Flat = none of this applies. ===== */\nhtml.glossy{\n  --"},{"p":"css/18-old-classic-cursors.css","k":"css","s":"/* Old Classic: Windows 95 mouse cursors (arrow everywhere, I-beam in text fields, hourglass, crossh"},{"p":"js/theme/old-classic-cursors.js","k":"js","s":"(function(){\n  var MAP={'pointer':'arrow','default':'arrow','help':'arrow','context-menu':'arrow','c"},{"p":"css/19-popup-unify.css","k":"css","s":"/* Popups restyled to match the New Variable dialog (start-up warning, update notice, audio tip, res"},{"p":"js/theme/glossy-slider-colours.js","k":"js","s":"// Glossy sliders keep their own colour: copy each slider's accent-color into --sl so the custom thu"},{"p":"js/control/start-stop-pause.js","k":"js","s":"// ---- Controller section: STOP / START and PAUSE / PLAY ----\n(function(){\n  var stopped=false, use"},{"p":"js/ui/graphs-collapse.js","k":"js","s":"// Collapse / expand: all simulation graphs at once, plus Voltage Decline, Vibrato and Dual Motor\n(f"},{"p":"js/control/controller-dot.js","k":"js","s":"// ---- CONTROLLER DOT: lets each Constant follow the Position Effects or emanate from its own omnid"},{"p":"js/ui/position-map-sound-waves.js","k":"js","s":"// ---- SOUND WAVES on the Position Map: a blue ring every second and a red ring on every state chan"},{"p":"js/ui/siren-direction-outline.js","k":"js","s":"// ---- GENERAL SIREN DIRECTION: yellow outline only (no fill) of the siren's pattern on the Positio"},{"p":"js/ui/dispersion-curve-graph.js","k":"js","s":"// ---- DISPERSION CURVE GRAPH: Max / Mid (auto off) / Min dots, optional Bezier handle per dot ----"},{"p":"js/control/buzzer-bridge.js","k":"js","s":"// ---- BUZZER BRIDGE: the Controller Editor's Piezo Buzzer plays through the siren's own audio chai"},{"p":"js/fx/effects-graph-editor.js","k":"js","s":"/* ===== EFFECTS GRAPH EDITOR =====\n   Cards are draggable, every card has an input dot (left) and o"},{"p":"js/fx/effect-chains.js","k":"js","s":"/* ===== EFFECT CHAINS: named snapshots of the whole Effects section (parameters + enabled states + "},{"p":"css/20-visuals.css","k":"css","s":"/* 'own' visuals: the wrapper is invisible, the section inside keeps its normal card look */\nhtml bo"},{"p":"css/21-no-forced-caps.css","k":"css","s":"/* text fields keep whatever case is typed */\ninput[type=text]:not(#_nc), input:not([type]):not(#_nc"},{"p":"css/22-checkbox-switches.css","k":"css","s":"/* every checkbox is drawn as a button switch (behaviour, ids and events are unchanged) */\ninput[typ"},{"p":"css/23-dont-show-checkbox.css","k":"css","s":"/* \"Don't show this again\" in pop-ups: a real checkbox instead of the button switch */\n.dont-show-ag"},{"p":"js/midi/midi-sequencer.js","k":"js","s":"// ---- MIDI Sequencer: piano-roll editor + player for MIDI Controller Boards (notes drive Damper gr"},{"p":"js/ui/rotor-config-sync.js","k":"js","s":"/* Rotor Configuration: UI only. Cards are built from the Oscillators list; fields do nothing yet.\n "}];

  /* ---------------------------------------------------------------- helpers */
  const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
  function crc32(s) { let c = -1; for (let i = 0; i < s.length; i++) { let ch = s.charCodeAt(i); if (ch < 128) c = CRC_T[(c ^ ch) & 255] ^ (c >>> 8); else { c = CRC_T[(c ^ (ch & 255)) & 255] ^ (c >>> 8); c = CRC_T[(c ^ (ch >> 8)) & 255] ^ (c >>> 8); } } return ((c ^ -1) >>> 0).toString(16).padStart(8, '0'); }
  const utf8len = s => { let n = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c < 128 ? 1 : c < 2048 ? 2 : (c >= 0xD800 && c < 0xDC00) ? (i++, 4) : 3; } return n; };
  const normVer = s => s.replace(/V\d+(?:\.\d+)+/g, 'V#');
  const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const J = JSON.stringify;
  const jsonSafe = o => J(o).replace(/</g, '\\u003c');     // never lets "<\/script" / "<!--" leak out of a JSON block
  const isUrl = p => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(p) || /^(?:data|blob|javascript):/i.test(p);

  // Binary project files: a project file is a string (text) or a Uint8Array (a real .oscp preset in presets/).
  // In the single HTML a preset is a base64 string literal wrapped in an asset marker with "enc":"base64".
  const isBin = v => typeof v !== 'string';
  function b64enc(u8) { if (typeof Buffer !== 'undefined') return Buffer.from(u8.buffer, u8.byteOffset, u8.length).toString('base64'); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function b64dec(str) { if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64')); const s = atob(str), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  const B64_LIT = /^"([A-Za-z0-9+\/]*={0,2})"$/;
  const isPresetPath = p => /^presets\/[\w.\-]+\.oscp$/i.test(p);
  // Config files: plain JSON in the project, embedded as a JSON object literal in the single HTML (asset marker with "enc":"json").
  //   settings.json         -> SIRENOSC_ASSETS["settings.json"]          (announcement on/off + text)
  //   presets/presets.json  -> SIRENOSC_ASSETS["presets/presets.json"]   (the PRESETS menu list + the default preset)
  const JSON_FILES = ['settings.json', 'presets/presets.json'];
  const isJsonFile = p => JSON_FILES.includes(p);
  const PRESET_GLOB = 'preset.*';                      // SIRENOSC_ASSETS["preset.*"] = every presets/*.oscp as {"file.oscp":"base64",...}
  const stripNl = s => s.replace(/\r?\n$/, '');
  const safeJsonRaw = s => s.replace(/<(?=\/script|!--)/gi, '\\u003c');   // never lets "</script" / "<!--" leak out of a JSON block
  /* true only when the literal survives bytes -> base64 again unchanged, so the rebuilt file stays byte-exact */
  function presetBin(raw) { const m = B64_LIT.exec(raw); if (!m || !m[1]) return false; try { return b64enc(b64dec(m[1])) === m[1]; } catch (e) { return false; } }

  // ------------------------------------------------------ marker formats
  //  HTML level :  <!--@@part {"p":"js/x.js"}@@-->  followed by the <script>/<style> it describes
  //                <!--@@group {"n":"app"}@@-->     followed by a <script> whose body is several files, each started by a file marker
  //  JS level   :  file marker  /*@@file {"p":"..."}@@*/   and   asset marker  /*@@asset {"f":"assets/a.js","k":"key"}@@*/ RAW /*@@/asset@@*/
  //  Header     :  <!--@@sirenosc:header@@--> developer note + JSON manifest <!--@@/sirenosc:header@@-->
  const ASSET_RX = /SIRENOSC_ASSETS\[("(?:[^"\\]|\\.)*")\]/g;

  function splitHeader(html) {
    const i = html.indexOf(HDR_B); if (i < 0) return { html, header: null };
    const j = html.indexOf(HDR_E, i); if (j < 0) return { html, header: null };
    let end = j + HDR_E.length; if (html[end] === '\n') end++;
    return { html: html.slice(0, i) + html.slice(end), header: html.slice(i, end) };
  }
  function readEmbeddedManifest(header) {
    if (!header) return null;
    const m = header.match(/<script type="application\/json" id="sirenosc-structure">([\s\S]*?)<\/script>/);
    if (!m) return null; try { return JSON.parse(m[1]); } catch (e) { return null; }
  }

  /* Remove everything the compiler adds, so a marked file can be compared with a plain one. */
  function stripMarkers(html) {
    html = splitHeader(html).html;
    html = html.replace(/<!--@@(?:part|group) \{[^\n]*?\}@@-->/g, '');
    html = html.replace(/\/\*@@file \{[^\n]*?\}@@\*\//g, '');
    html = html.replace(/\/\*@@asset \{[^\n]*?\}@@\*\//g, '').split('/*@@/asset@@*/').join('');
    return html;
  }

  /* ----------------------------------------------------------- tokenizer */
  function tokenize(html) {
    const RX = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/g; const out = []; let pos = 0, m;
    while ((m = RX.exec(html))) {
      let gap = html.slice(pos, m.index), meta = null, kind = null;
      const tail = gap.slice(-1500), mm = tail.match(/<!--@@(part|group) (\{[^\n]*?\})@@-->$/);
      if (mm) { try { meta = JSON.parse(mm[2]); kind = mm[1]; gap = gap.slice(0, gap.length - mm[0].length); } catch (e) { meta = null; } }
      const attrs = m[2], srcM = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/);
      if (srcM && !m[3].trim()) { out.push({ t: 'html', text: gap + m[0] }); pos = RX.lastIndex; continue; }   // external <script src=...>: leave in the markup
      if (gap) out.push({ t: 'html', text: gap });
      out.push({ t: 'part', tag: m[1], attrs, content: m[3], meta, mkind: kind });
      pos = RX.lastIndex;
    }
    if (pos < html.length) out.push({ t: 'html', text: html.slice(pos) });
    return out;
  }

  /* ---------------------------------------------------------- asset scan */
  function keyBefore(text, at) {
    const pre = text.slice(Math.max(0, at - 160), at);
    const m = pre.match(/(?:(["'])([^"'\n]+)\1|([\w$]+(?:\.[\w$]+)*))\s*[:=]\s*$/);
    if (!m) return 'value';
    let k = m[2] != null ? m[2] : m[3];
    if (m[3] && k.includes('.')) k = k.split('.').pop();
    return k;
  }
  const ASSET_PATH_RULES = [
    { rx: /title-and-favicon/, ns: 'favicon', file: 'assets/favicon.js', fixed: 'favicon' },
    { rx: /visual-style-and-logos/, ns: 'logo', file: 'assets/logos.js' },
    { rx: /record-mode/, ns: 'ir', file: 'assets/impulse-responses.js' }
  ];
  function assetTarget(partPath, key, taken) {
    let ns, file, k = key;
    const r = ASSET_PATH_RULES.find(x => x.rx.test(partPath || ''));
    if (r) { ns = r.ns; file = r.file; if (r.fixed) k = r.fixed; }
    else if (/\.oscp$/i.test(key)) { ns = 'preset'; file = null; }
    else if (/^_DA_|_B64$/.test(key)) { ns = 'damper'; file = 'assets/damper-sounds.js'; k = key.replace(/^_DA_|_B64$/g, '').toLowerCase(); }
    else { ns = 'data'; file = 'assets/data.js'; }
    let full = ns === 'favicon' ? 'favicon' : ns + '.' + k;
    let n = 2; const base = full; while (taken.has(full)) full = base + '_' + (n++);
    if (ns === 'preset') file = 'assets/presets/' + (full.slice(7).replace(/[^\w.\-]+/g, '_') || 'preset') + '.js';   // presets live in assets/presets/
    return { key: full, file };
  }
  /* unmarked text -> replaces long string literals with SIRENOSC_ASSETS["key"] */
  function externalizeLiterals(text, partPath, takenKeys, sink) {
    const RX = /(["'])([A-Za-z0-9+\/=:;,._\-]{20000,})\1/g; let out = '', cur = 0, m;
    while ((m = RX.exec(text))) {
      const raw = m[0], t = assetTarget(partPath, keyBefore(text, m.index), takenKeys);
      if (t.key.startsWith('preset.') && isPresetPath('presets/' + t.key.slice(7)) && presetBin(raw)) { t.file = 'presets/' + t.key.slice(7); t.enc = 'base64'; }   // real .oscp file
      takenKeys.add(t.key); sink.push({ key: t.key, file: t.file, raw, enc: t.enc });
      out += text.slice(cur, m.index) + 'SIRENOSC_ASSETS[' + J(t.key) + ']'; cur = m.index + raw.length;
    }
    return out + text.slice(cur);
  }
  /* marked text -> same thing but driven by the markers (works for any literal size) */
  function externalizeMarked(text, takenKeys, sink) {
    let out = '', cur = 0, i;
    while ((i = text.indexOf('/*@@asset ', cur)) >= 0) {
      const mEnd = text.indexOf('@@*/', i); if (mEnd < 0) break;
      let meta; try { meta = JSON.parse(text.slice(i + 10, mEnd)); } catch (e) { break; }
      const rawStart = mEnd + 4, rawEnd = text.indexOf('/*@@/asset@@*/', rawStart); if (rawEnd < 0) break;
      const raw = text.slice(rawStart, rawEnd);
      out += text.slice(cur, i) + 'SIRENOSC_ASSETS[' + J(meta.k) + ']'; cur = rawEnd + 14;
      if (meta.enc === 'presets' && !meta.x) {                                               // every preset in one literal -> one binary file each
        let obj = null; try { obj = JSON.parse(raw); } catch (e) { }
        if (obj && typeof obj === 'object') for (const n of Object.keys(obj)) { const lit = '"' + obj[n] + '"', pth = 'presets/' + n; if (isPresetPath(pth) && presetBin(lit)) { takenKeys.add('preset.' + n); sink.push({ key: 'preset.' + n, file: pth, raw: lit, enc: 'base64' }); } }
        continue;
      }
      if (!meta.x) {
        let f = meta.f, enc;
        if (meta.enc === 'json') enc = 'json';
        else if (meta.enc === 'base64') {
          if (meta.k.startsWith('preset.') && f === 'presets/' + meta.k.slice(7) && isPresetPath(f) && presetBin(raw)) enc = 'base64';
          else f = 'assets/presets/' + (meta.k.replace(/^preset\./, '').replace(/[^\w.\-]+/g, '_') || 'preset') + '.js';   // cannot be stored as a binary file byte-exactly: keep it as a JS asset
        }
        takenKeys.add(meta.k); sink.push({ key: meta.k, file: f, raw, enc });
      }
    }
    return out + text.slice(cur);
  }
  const usedKeys = text => { const s = []; let m; ASSET_RX.lastIndex = 0; while ((m = ASSET_RX.exec(text))) { const k = JSON.parse(m[1]); if (!s.includes(k)) s.push(k); } return s; };

  /* --------------------------------------------------- unmarked naming */
  function matchLayout(parts, layout) {
    const used = new Set();
    for (const p of parts) {
      if (p.path || p.group) continue;
      const head = normVer(p.content.replace(/\r/g, '').replace(/^\n/, '').slice(0, 130));
      for (let i = 0; i < layout.length; i++) {
        const L = layout[i]; if (used.has(i) || L.g || L.k !== p.kind) continue;
        if (head.startsWith(normVer(L.s).slice(0, 100))) { p.path = L.p; used.add(i); break; }
      }
    }
  }
  function findGroup(text, layout) {
    const chunks = layout.filter(L => L.g === 'app'); if (!chunks.length) return null;
    const pos = [{ L: chunks[0], at: 0 }]; let last = 0;
    for (let i = 1; i < chunks.length; i++) {
      const sig = chunks[i].s; let at = text.indexOf(sig, last + 1);
      while (at > 0 && text[at - 1] !== '\n') at = text.indexOf(sig, at + 1);
      if (at > last) { pos.push({ L: chunks[i], at }); last = at; }
    }
    return pos.length >= 10 && normVer(text.replace(/^\n/, '').slice(0, 60)).startsWith(normVer(chunks[0].s).slice(0, 40)) ? { pos, expected: chunks.length } : null;
  }
  function autoName(p, taken, cssNo) {
    const idm = p.attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
    const first = (p.content.match(/^\s*(?:\/\/|\/\*+|\*)?\s*[-=\s]*([A-Za-z][^\n]{2,70})/) || [])[1];
    let s = slug((idm && idm[1]) || (first || '').split(/\s+/).slice(0, 6).join(' ')) || 'part';
    let path = p.kind === 'css' ? 'css/' + String(cssNo).padStart(2, '0') + '-' + s + '.css' : 'js/misc/' + s + '.js';
    let n = 2; const b = path; while (taken.has(path)) path = b.replace(/(\.\w+)$/, '-' + (n++) + '$1');
    return path;
  }

  /* =========================================================== DECOMPILE */
  function decompile(htmlIn, opts) {
    opts = opts || {};
    const report = { marked: 0, named: 0, auto: [], notes: [], assets: 0, groups: [] };
    const hs = splitHeader(htmlIn); const html = hs.html;
    const prev = readEmbeddedManifest(hs.header);
    const toks = tokenize(html);
    const taken = new Set(), takenKeys = new Set(), sink = [];
    const textMetas = {};
    const order = [];           // resolved ordered list of {type:'html'|'part'|'group'|'text', ...}

    // 1) names
    const plain = toks.filter(t => t.t === 'part' && !t.meta && !(/type\s*=\s*["']text\/plain/i.test(t.attrs)));
    toks.forEach(t => { if (t.t === 'part' && t.meta && t.meta.p) { taken.add(t.meta.p); report.marked++; } });
    matchLayout(plain.filter(p => p.tag === 'style' ? (p.kind = 'css', true) : (p.kind = 'js', true)), LAYOUT);
    plain.forEach(p => { if (p.path) { taken.add(p.path); report.named++; } });

    // 2) walk
    let cssNo = 0; toks.forEach(t => { if (t.t === 'part' && t.tag === 'style') cssNo++; }); cssNo += 1;
    let seq = 0;
    for (const t of toks) {
      if (t.t === 'html') { order.push({ type: 'html', text: t.text }); continue; }
      const isText = (t.meta && t.meta.t === 'text') || (!t.meta && /type\s*=\s*["']text\/plain/i.test(t.attrs));
      if (isText) {
        const id = (t.attrs.match(/\bid\s*=\s*["']([^"']+)["']/) || [])[1] || 'text' + (++seq);
        const meta = t.meta || { p: id === 'mp3LameSrc' ? 'assets/lamejs-source.js' : 'assets/text-' + slug(id) + '.js', k: id === 'mp3LameSrc' ? 'vendor.lamejs' : 'text.' + slug(id), e: "$('" + id + "').textContent" };
        meta.id = id; textMetas[meta.k] = meta; taken.add(meta.p);
        order.push({ type: 'text', meta, attrs: t.attrs, text: t.content }); continue;
      }
      const kind = t.tag === 'style' ? 'css' : 'js';
      if (t.mkind === 'group') {
        const chunks = []; const c = t.content, RX = /\/\*@@file (\{[^\n]*?\})@@\*\//g; let m, last = null;
        while ((m = RX.exec(c))) { if (last) last.text = c.slice(last.from, m.index); last = { meta: JSON.parse(m[1]), from: RX.lastIndex }; chunks.push(last); }
        if (last) last.text = c.slice(last.from);
        order.push({ type: 'group', name: t.meta.n || 'group', attrs: t.attrs, chunks: chunks.map(k => ({ path: k.meta.p, text: k.text })), marked: true }); continue;
      }
      if (!t.meta && kind === 'js') {
        const g = findGroup(t.content, LAYOUT);
        if (g) {
          const chunks = g.pos.map((x, i) => ({ path: x.L.p, text: t.content.slice(x.at, i + 1 < g.pos.length ? g.pos[i + 1].at : undefined) }));
          chunks.forEach(c => taken.add(c.path));
          report.groups.push({ name: 'app', chunks: chunks.length, expected: g.expected });
          if (chunks.length < g.expected) report.notes.push('Monolith script: ' + chunks.length + ' of ' + g.expected + ' known sections found; the rest stayed inside the previous section.');
          order.push({ type: 'group', name: 'app', attrs: t.attrs, chunks, marked: false }); continue;
        }
      }
      let path = t.meta && t.meta.p || t.path;
      if (!path) { path = autoName({ kind, attrs: t.attrs, content: t.content }, taken, cssNo); taken.add(path); if (kind === 'css') cssNo++; report.auto.push(path); }
      order.push({ type: 'part', kind, path, attrs: t.attrs, text: t.content, marked: !!t.meta });
    }

    // 3) assets + text-block references
    const exprs = Object.values(textMetas);
    function transform(text, path, marked) {
      text = marked ? externalizeMarked(text, takenKeys, sink) : externalizeLiterals(text, path, takenKeys, sink);
      for (const tm of exprs) {                         // $('mp3LameSrc').textContent  ->  SIRENOSC_ASSETS["vendor.lamejs"]
        const forms = new Set([tm.e, "$('" + tm.id + "').textContent", '$("' + tm.id + '").textContent', "document.getElementById('" + tm.id + "').textContent", 'document.getElementById("' + tm.id + '").textContent']);
        for (const f of forms) if (text.includes(f)) text = text.split(f).join('SIRENOSC_ASSETS[' + J(tm.k) + ']');
      }
      return text;
    }
    for (const o of order) {
      if (o.type === 'part') o.text = transform(o.text, o.path, o.marked);
      if (o.type === 'group') o.chunks.forEach(c => c.text = transform(c.text, c.path, o.marked));
    }
    // pre-existing SIRENOSC_ASSETS refs for marked text (x) are handled by externalizeMarked

    // 4) build files + template
    const files = new Map(), assetFiles = new Map();
    const assetFileOf = new Map(); sink.forEach(a => { (assetFiles.get(a.file) || assetFiles.set(a.file, []).get(a.file)).push(a); assetFileOf.set(a.key, a.file); });
    for (const tm of exprs) assetFileOf.set(tm.k, tm.p);
    const encFiles = new Set(); sink.forEach(a => a.enc && encFiles.add(a.file));     // binary presets are not loaded through <script src>
    const asset_head = '/* Auto-extracted base64 data (moved out of the single-file build). Loaded before the scripts that use it. */\nwindow.SIRENOSC_ASSETS = window.SIRENOSC_ASSETS || {};\n';
    for (const [f, list] of assetFiles) files.set(f, list[0].enc === 'json' ? list[0].raw + '\n' : list[0].enc ? b64dec(B64_LIT.exec(list[0].raw)[1]) : asset_head + list.map(a => 'SIRENOSC_ASSETS[' + J(a.key) + '] = ' + a.raw + ';\n').join(''));
    for (const o of order) if (o.type === 'text') files.set(o.meta.p, '/* Text block kept as a string (it was a <script type="text/plain" id="' + o.meta.id + '"> in the single file). The app reads it through SIRENOSC_ASSETS["' + o.meta.k + '"]. */\nwindow.SIRENOSC_ASSETS = window.SIRENOSC_ASSETS || {};\nSIRENOSC_ASSETS[' + J(o.meta.k) + '] = ' + J(o.text) + ';\n');

    const assetRegion = keys => {
      const fs_ = []; keys.forEach(k => { const f = assetFileOf.get(k); if (f && !fs_.includes(f) && !(textMetas[k]) && !encFiles.has(f)) fs_.push(f); });
      return fs_.length ? '<!--sirenosc:assets-->' + fs_.map(f => '<script src="' + f + '"><\/script>').join('\n') + '<!--/sirenosc:assets-->' : '';
    };
    let tpl = ''; const parts = [];
    for (const o of order) {
      if (o.type === 'html') tpl += o.text;
      else if (o.type === 'text') tpl += '<!--sirenosc:text ' + J({ id: o.meta.id, k: o.meta.k, e: o.meta.e, f: o.meta.p, a: o.attrs }) + '--><script src="' + o.meta.p + '"><\/script><!--/sirenosc:text-->';
      else if (o.type === 'part') {
        files.set(o.path, o.text);
        const keys = usedKeys(o.text);
        tpl += o.kind === 'css' ? '<link rel="stylesheet" href="' + o.path + '"' + o.attrs + '>' : assetRegion(keys) + '<script src="' + o.path + '"' + o.attrs + '><\/script>';
        parts.push({ path: o.path, kind: o.kind, id: (o.attrs.match(/\bid\s*=\s*["']([^"']+)["']/) || [])[1] || null, group: null, text: o.text });
      } else {
        const keys = []; o.chunks.forEach(c => usedKeys(c.text).forEach(k => keys.includes(k) || keys.push(k)));
        tpl += assetRegion(keys) + '<!--sirenosc:group ' + J({ n: o.name, a: o.attrs }) + '-->' + o.chunks.map(c => '<script src="' + c.path + '"><\/script>').join('\n') + '<!--/sirenosc:group-->';
        o.chunks.forEach(c => { files.set(c.path, c.text); parts.push({ path: c.path, kind: 'js', id: null, group: o.name, text: c.text }); });
      }
    }
    files.set('index.html', tpl);
    report.assets = sink.length;
    const textOrder = order.filter(o => o.type === 'text');
    return finishProject(files, parts, assetFiles, textOrder, report, prev);
  }

  /* ----- manifest, load-order, STRUCTURE.md, developer note */
  function describe(parts, assetFiles, textOrder, appInfo) {
    const man = {
      format: FORMAT, engine: ENGINE_VERSION, app: appInfo,
      rules: [
        'Load order is top to bottom and is load-bearing. Never reorder parts.',
        'Every part is stored byte-exact; compile(decompile(x)) reproduces x.',
        'Long string literals live in assets/ as SIRENOSC_ASSETS["key"]; presets live in presets/ as .oscp files.',
        'settings.json (announcement) and presets/presets.json (PRESETS menu list + default preset) are plain JSON config files.',
        'Files in the same group are joined into ONE <script> in the single file (shared top-level scope).'
      ],
      parts: parts.map((p, i) => ({ n: i + 1, path: p.path, kind: p.kind, group: p.group || undefined, id: p.id || undefined, bytes: utf8len(p.text), crc: crc32(p.text) })),
      assets: [...assetFiles].map(([f, list]) => list[0].enc === 'json' ? ({ file: f, keys: list.map(a => a.key), kind: 'json', enc: 'json', bytes: utf8len(list[0].raw) }) : list[0].enc ? ({ file: f, keys: list.map(a => a.key), kind: 'preset', enc: 'base64', bytes: b64dec(B64_LIT.exec(list[0].raw)[1]).length }) : ({ file: f, keys: list.map(a => a.key), bytes: list.reduce((n, a) => n + utf8len(a.raw), 0) }))
        .concat(textOrder.map(o => ({ file: o.meta.p, keys: [o.meta.k], bytes: utf8len(o.text), textBlock: o.meta.id })))
    };
    return man;
  }
  function treeText(man, pre) {
    const lines = []; const dirs = {};
    man.parts.forEach(p => { const d = p.path.split('/').slice(0, -1).join('/'); (dirs[d] = dirs[d] || []).push(p); });
    lines.push(pre + 'LOAD ORDER (top = loaded first):');
    man.parts.forEach(p => lines.push(pre + ' ' + String(p.n).padStart(3, '0') + '  ' + p.path + (p.group ? '   [group ' + p.group + ']' : '') + (p.id ? '   #' + p.id : '')));
    lines.push(pre + ''); lines.push(pre + 'ASSET FILES (long data strings, referenced as SIRENOSC_ASSETS["key"]):');
    man.assets.forEach(a => lines.push(pre + ' ' + a.file + '   ' + a.keys.join(', ') + (a.enc === 'base64' ? '   (a real .oscp file, embedded as base64)' : a.enc === 'json' ? '   (config JSON, edit it directly; embedded as a JSON object)' : '')));
    return lines.join('\n');
  }
  function noteText(man) {
    const v = man.app.version || '?';
    const t = [
      'SIRENOSC  -  DEVELOPER NOTE      (app version ' + v + ', structure format ' + man.format + ')',
      '',
      'This one HTML file is the COMPILED form of a structured project. Nothing here is minified or changed:',
      'every script, stylesheet and data string sits exactly where the project file says. The block below',
      '(script#sirenosc-structure) is the machine-readable structure; the list at the end of this note is the same thing for humans.',
      '',
      'HOW TO EDIT',
      ' 1. Open SirenOsc-Compiler.html and DECOMPILE this file. You get the structured project (index.html, css/, js/, assets/).',
      ' 2. Edit the small files in the project, never the big single file.',
      ' 3. COMPILE the project folder (or zip) back into one HTML file. Every compile refreshes this note and the structure block.',
      ' 4. Every decompile refreshes the project structure: new parts are named and registered, removed parts disappear.',
      '',
      'MARKERS (written by the compiler, read by the decompiler - keep them if you want the structure kept)',
      ' @@part {"p":"js/x.js"}@@           an HTML comment in front of every <script>/<style> that comes from a project file',
      ' @@group {"n":"app"}@@              an HTML comment in front of a <script> made of several files joined together (the main application script)',
      ' @@file {"p":"js/app/..."}@@        a JS block comment at the start of each file inside a group. To add a file to the group, put such a',
      '                                    comment at a line start, between two top-level statements, and decompile again.',
      ' @@asset {"f":"assets/..","k":"key"}@@ ... @@/asset@@    JS block comments wrapping one long data string that lives in assets/',
      ' A <script>/<style> block with NO marker is fine too: the decompiler names it automatically (js/misc/... or css/NN-...).',
      '',
      'RULES',
      ' - LOAD ORDER IS LOAD-BEARING. Parts run top to bottom; later parts use globals made by earlier ones. Do not reorder.',
      ' - The files of the group "app" share one scope (top-level const/let). Keep them in the listed order.',
      ' - Presets belong in presets/ as real .oscp files (one per preset; every file there is embedded as base64 in BUILTIN_PRESETS). Long strings (>' + BIG + ' chars) are moved to assets/ by the decompiler.',
      ' - presets/presets.json controls the PRESETS menu: {"default":{presetname,presetfile,available}, "presets":[{presetname,presetfile,available}, ...]}.',
      '   "default" is the preset used by RESET and first start; "available":false greys the entry out with a small "coming soon".',
      ' - settings.json controls the announcement bar: {"announcement":{"show":true|false,"text":"...","ps":"...","button":{...}}}.',
      ' - The structured copy loads the same code via <script src>; it needs a local web server or a browser that allows file:// scripts.',
      ' - Behaviour of this single file is identical to the structured project. If they ever differ, the compiler has a bug: report it.',
      '',
      treeText(man, ' ')
    ].join('\n');
    return t.replace(/--/g, '- -').replace(/\*\//g, '* /');
  }
  function headerBlock(man) {
    const lines = ['<!--@@sirenosc:header@@-->', '<!--', noteText(man), '-->'];
    const mj = '{\n"format":' + J(man.format) + ',"engine":' + J(man.engine) + ',"app":' + J(man.app) + ',\n"rules":' + jsonSafe(man.rules) + ',\n"parts":[\n' + man.parts.map(p => jsonSafe(p)).join(',\n') + '\n],\n"assets":[\n' + man.assets.map(a => jsonSafe(a)).join(',\n') + '\n]}';
    lines.push('<script type="application/json" id="' + MANIFEST_ID + '">' + mj.replace(/<\/script/gi, '<\\/script') + '<\/script>');
    lines.push(HDR_E);
    return lines.join('\n') + '\n';
  }
  function structureMd(man) {
    const L = ['# SirenOsc project structure', '', 'App version: **' + (man.app.version || '?') + '**  ·  format `' + man.format + '`', '',
      'This folder is the structured form of the single-file SirenOsc build. Open `SirenOsc-Compiler.html` to compile it back into one HTML file,', 'or to decompile a new single file into this structure again.', '',
      '## Rules', ''].concat(man.rules.map(r => '- ' + r)).concat(['', '## Load order', '', '| # | file | kind | group | bytes |', '|---|------|------|-------|-------|']);
    man.parts.forEach(p => L.push('| ' + p.n + ' | `' + p.path + '` | ' + p.kind + ' | ' + (p.group || '') + ' | ' + p.bytes + ' |'));
    L.push('', '## Asset files', '', '| file | keys | bytes |', '|------|------|-------|');
    man.assets.forEach(a => L.push('| `' + a.file + '` | ' + a.keys.map(k => '`' + k + '`').join(', ') + ' | ' + a.bytes + ' |'));
    return L.join('\n') + '\n';
  }
  function appInfoOf(parts, html) {
    const all = parts.slice(0, 80).map(p => p.text).join('\n');
    const v = (all.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1] || null;
    const title = (all.match(/document\.title\s*=\s*['"]([^'"]+)['"]/) || [])[1] || null;
    return { name: 'SirenOsc', version: v, title };
  }
  function finishProject(files, parts, assetFiles, textOrder, report, prev) {
    const man = describe(parts, assetFiles, textOrder, appInfoOf(parts));
    files.set('sirenosc.structure.json', J(man, null, 1) + '\n');
    files.set('js/load-order.json', J(parts.map(p => p.path), null, 1) + '\n');
    files.set('STRUCTURE.md', structureMd(man));
    report.parts = parts.length; report.manifest = man;
    report.diff = prev ? diffManifests(prev, man) : null;
    return { files, manifest: man, report };
  }
  function diffManifests(a, b) {
    const pa = new Map((a.parts || []).map(p => [p.path, p])), pb = new Map(b.parts.map(p => [p.path, p]));
    const d = { added: [], removed: [], changed: [], moved: [] };
    const ca = [...pa.keys()].filter(p => pb.has(p)), cb = [...pb.keys()].filter(p => pa.has(p));
    for (const [p, v] of pb) { if (!pa.has(p)) d.added.push(p); else if (pa.get(p).crc !== v.crc) d.changed.push(p); else { const i = cb.indexOf(p); if (ca[i] !== p) d.moved.push(p); } }
    for (const p of pa.keys()) if (!pb.has(p)) d.removed.push(p);
    const aa = new Set((a.assets || []).map(x => x.file)), ab = new Set((b.assets || []).map(x => x.file));
    d.assetsAdded = [...ab].filter(x => !aa.has(x)); d.assetsRemoved = [...aa].filter(x => !ab.has(x));
    return d;
  }

  /* ============================================================= COMPILE */
  function parseAssets(files) {
    const map = new Map();
    for (const [path, text] of files) {
      if (isJsonFile(path)) {                                                                   // config JSON: embedded verbatim (validated)
        if (isBin(text)) continue; let raw = stripNl(text), bad = null;
        try { JSON.parse(raw); raw = safeJsonRaw(raw); } catch (e) { bad = e.message; raw = 'null'; }
        map.set(path, { file: path, raw, enc: 'json', bad }); continue;
      }
      if (isPresetPath(path)) { if (isBin(text)) map.set('preset.' + path.slice(8), { file: path, raw: '"' + b64enc(text) + '"', enc: 'base64' }); continue; }
      if (!path.startsWith('assets/') || !path.endsWith('.js') || isBin(text)) continue;
      let at = 0;
      while (at < text.length) {
        let nl = text.indexOf('\n', at); if (nl < 0) nl = text.length;
        if (text.startsWith('SIRENOSC_ASSETS[', at)) {
          const m = text.slice(at, at + 400).match(/^SIRENOSC_ASSETS\[("(?:[^"\\]|\\.)*")\] = /);
          if (m) { let end = nl; if (text[end - 1] === ';') end--; map.set(JSON.parse(m[1]), { file: path, raw: text.slice(at + m[0].length, end) }); }
        }
        at = nl + 1;
      }
    }
    return map;
  }
  /* V1.4.0-style folders (no region comments in index.html) are upgraded in memory. */
  function upgradeLegacyTemplate(tpl) {
    const MONO = p => p.startsWith('js/app/') && p !== 'js/app/record/record-mode.js' && p !== 'js/app/documents/document-tabs.js';
    tpl = tpl.replace('<script src="assets/lamejs-source.js"><\/script>', '<!--sirenosc:text ' + J({ id: 'mp3LameSrc', k: 'vendor.lamejs', e: "$('mp3LameSrc').textContent", f: 'assets/lamejs-source.js', a: ' type="text/plain" id="mp3LameSrc"' }) + '--><script src="assets/lamejs-source.js"><\/script><!--/sirenosc:text-->');
    const TAG = /<script src="(js\/app\/[^"]+)"([^>]*)><\/script>/g;
    let out = '', last = 0, run = [], m;
    const flush = () => { if (run.length) { out += '<!--sirenosc:group {"n":"app","a":""}-->' + run.map(x => x.tag).join('\n') + '<!--/sirenosc:group-->'; run = []; } };
    // collapse "asset tags + chunk tags" clusters that the old splitter joined with \n
    tpl = tpl.replace(/(<script src="assets\/[^"]+"><\/script>)\n(?=<script src="(?:assets\/|js\/app\/))/g, '$1');
    while ((m = TAG.exec(tpl))) {
      if (!MONO(m[1])) continue;
      const gap = tpl.slice(last, m.index);
      if (run.length && gap.trim() === '') { run.push({ tag: m[0] }); last = TAG.lastIndex; continue; }
      flush(); out += gap; run.push({ tag: m[0] }); last = TAG.lastIndex;
    }
    flush(); out += tpl.slice(last);
    return out;
  }
  function compile(files, opts) {
    opts = opts || {};
    const report = { warnings: [], errors: [], parts: 0, assets: 0 };
    let tpl = files.get('index.html'); if (tpl == null) throw new Error('index.html not found in the project');
    const legacy = !tpl.includes('<!--sirenosc:');
    if (legacy) { tpl = upgradeLegacyTemplate(tpl); report.warnings.push('Old-style project (V1.4.0 layout) detected: upgraded in memory. Decompiling the result gives the new structure.'); }
    const assets = parseAssets(files);
    for (const p of JSON_FILES) { const a = assets.get(p); if (a && a.bad) report.errors.push(p + ' is not valid JSON (' + a.bad + ') - it was replaced by null in the output, so the app falls back to its built-in defaults. Fix the file and compile again.'); }
    const textMeta = {};
    tpl.replace(/<!--sirenosc:text (\{[^\n]*?\})-->/g, (_, j) => { const m = JSON.parse(j); textMeta[m.k] = m; return ''; });
    const referenced = new Set(), fileOrder = [];
    const sub = text => text.replace(ASSET_RX, (all, kq) => {
      const k = JSON.parse(kq);
      if (k === PRESET_GLOB) {                                                              // all presets/*.oscp as one object literal
        const names = [...files.keys()].filter(p => isPresetPath(p) && isBin(files.get(p))).map(p => p.slice(8)).sort();
        names.forEach(n => { const f = 'presets/' + n; referenced.add(f); if (!fileOrder.includes(f)) fileOrder.push(f); });
        report.assets++;
        return '/*@@asset ' + J({ f: 'presets/', k, enc: 'presets' }) + '@@*/{' + names.map(n => J(n) + ':"' + b64enc(files.get('presets/' + n)) + '"').join(',\n') + '}/*@@/asset@@*/';
      }
      if (textMeta[k]) return '/*@@asset ' + J({ f: textMeta[k].f, k, x: 1 }) + '@@*/' + textMeta[k].e + '/*@@/asset@@*/';
      const a = assets.get(k); if (!a) { report.errors.push('asset key not found: ' + k + (k.startsWith('preset.') ? '  (expected the binary file presets/' + k.slice(7) + ' in the project)' : '')); return all; }
      referenced.add(a.file); if (!fileOrder.includes(a.file)) fileOrder.push(a.file); report.assets++;
      return '/*@@asset ' + J(a.enc ? { f: a.file, k, enc: a.enc } : { f: a.file, k }) + '@@*/' + a.raw + '/*@@/asset@@*/';
    });
    const get = p => { if (!files.has(p)) { report.errors.push('missing file: ' + p); return ''; } return files.get(p); };
    const used = new Set(); const parts = []; const textOrder = [];
    const TRX = /<!--sirenosc:assets-->[\s\S]*?<!--\/sirenosc:assets-->|<!--sirenosc:text (\{[^\n]*?\})-->[\s\S]*?<!--\/sirenosc:text-->|<!--sirenosc:group (\{[^\n]*?\})-->([\s\S]*?)<!--\/sirenosc:group-->|<link rel="stylesheet" href="([^"]+)"([^>]*)>|<script src="([^"]+)"([^>]*)><\/script>/g;
    let out = '', last = 0, m;
    while ((m = TRX.exec(tpl))) {
      out += tpl.slice(last, m.index); last = TRX.lastIndex; const whole = m[0];
      if (whole.startsWith('<!--sirenosc:assets-->')) continue;
      if (m[1]) {                                                                           // text block
        const meta = JSON.parse(m[1]); used.add(meta.f);
        let raw = assets.get(meta.k); let text = '';
        if (!raw) report.errors.push('text asset not found: ' + meta.k); else text = JSON.parse(raw.raw);
        textOrder.push({ meta: { p: meta.f, k: meta.k, id: meta.id, e: meta.e }, text });
        out += '<!--@@part ' + J({ p: meta.f, t: 'text', k: meta.k, e: meta.e }) + '@@--><script' + (meta.a || '') + '>' + text + '<\/script>'; continue;
      }
      if (m[2]) {                                                                           // group
        const g = JSON.parse(m[2]); const paths = []; m[3].replace(/<script src="([^"]+)"[^>]*><\/script>/g, (_, p) => { paths.push(p); return ''; });
        let body = ''; paths.forEach(p => { used.add(p); const t = get(p); parts.push({ path: p, kind: 'js', group: g.n, id: null, text: t }); body += '/*@@file ' + J({ p }) + '@@*/' + sub(t); });
        out += '<!--@@group ' + J({ n: g.n }) + '@@--><script' + (g.a || '') + '>' + body + '<\/script>'; continue;
      }
      const isCss = m[4] != null, p = isCss ? m[4] : m[6], attrs = (isCss ? m[5] : m[7]) || '';
      if (isUrl(p)) { out += whole; continue; }
      if (p.startsWith('assets/')) continue;                                                // stray asset loader tag
      used.add(p); let t = get(p);
      if (legacy && isCss && !/^\.si\{/.test(t)) t = '\n' + t;                               // V1.4.0 css files had their leading newline stripped
      parts.push({ path: p, kind: isCss ? 'css' : 'js', group: null, id: (attrs.match(/\bid\s*=\s*["']([^"']+)["']/) || [])[1] || null, text: t });
      out += '<!--@@part ' + J({ p }) + '@@-->' + (isCss ? '<style' + attrs + '>' + t + '</style>' : '<script' + attrs + '>' + sub(t) + '<\/script>');
    }
    out += tpl.slice(last);
    // asset files for the manifest (same data the decompiler would produce)
    const byFile = new Map(); for (const [k, a] of assets) { if (textMeta[k]) continue; (byFile.get(a.file) || byFile.set(a.file, []).get(a.file)).push({ key: k, raw: a.raw, enc: a.enc }); }
    const aMap = new Map(); fileOrder.forEach(f => byFile.has(f) && aMap.set(f, byFile.get(f))); [...byFile.keys()].sort().forEach(f => aMap.has(f) || aMap.set(f, byFile.get(f)));
    const man = describe(parts, aMap, textOrder, appInfoOf(parts));
    // header goes right after the first line (<meta charset>) so the charset is still inside the first 1024 bytes
    const nl = out.indexOf('\n'), at = out.slice(0, nl).includes('charset') ? nl + 1 : 0;
    const html = out.slice(0, at) + headerBlock(man) + out.slice(at);
    // orphans
    for (const p of files.keys()) if (/^(?:js|css)\/.+\.(?:js|css)$/.test(p) && !used.has(p) && p !== 'js/load-order.json') report.warnings.push('not referenced by index.html (ignored): ' + p);
    report.parts = parts.length; report.manifest = man;
    return { html, manifest: man, report };
  }

  /* ======================================== round-trip proof (used by the app) */
  function verifyRoundTrip(origHtml) {
    const t0 = Date.now(); const d = decompile(origHtml); const c = compile(d.files);
    const a = stripMarkers(origHtml), b = stripMarkers(c.html); const ok = a === b;
    const res = { ok, origBytes: utf8len(origHtml), strippedBytes: a.length, rebuiltBytes: b.length, ms: Date.now() - t0, errors: c.report.errors };
    if (!ok) { let i = 0; while (i < a.length && a[i] === b[i]) i++; res.firstDiff = i; res.a = a.slice(Math.max(0, i - 60), i + 60); res.b = b.slice(Math.max(0, i - 60), i + 60); }
    // marked files must reproduce themselves exactly
    if (ok && origHtml.includes(HDR_B)) { res.exact = origHtml === c.html; }
    return res;
  }

  /* convenience: "give me the updated single file" = compile(decompile(x)) */
  function normalizeSingle(html) { const d = decompile(html); const c = compile(d.files); return { html: c.html, files: d.files, manifest: c.manifest, decompileReport: d.report, compileReport: c.report }; }

  return { FORMAT, ENGINE_VERSION, BIG, LAYOUT, decompile, compile, verifyRoundTrip, normalizeSingle, stripMarkers, splitHeader, readEmbeddedManifest, diffManifests, crc32, utf8len, parseAssets };
});

return module.exports; })();
const TEXT = /\.(html?|js|css|json|md|txt|py)$/i, BIN = /\.oscp$/i;
const sameData = (a, b) => typeof a === 'string' || typeof b === 'string' ? a === b : !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
function readDir(root) { const m = new Map(); (function w(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name === '.git') continue; const p = path.join(d, f.name); if (f.isDirectory()) w(p); else if (BIN.test(f.name)) m.set(path.relative(root, p).split(path.sep).join('/'), new Uint8Array(fs.readFileSync(p))); else if (TEXT.test(f.name)) m.set(path.relative(root, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')); } })(root); return m; }
function write(root, rel, txt) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); }
const [, , cmd, a, b, ...flags] = process.argv;
if (cmd === 'decompile' && a && b) {
  const html = fs.readFileSync(a, 'utf8'), d = E.decompile(html), c = E.compile(d.files);
  if (E.stripMarkers(c.html) !== E.stripMarkers(html)) { console.error('VERIFY FAILED - nothing written'); process.exit(1); }
  const old = fs.existsSync(b) ? readDir(b) : new Map(); let w = 0, s = 0;
  for (const [p, t] of d.files) { if (sameData(old.get(p), t)) { s++; continue; } if (/(^|\/)note\.txt$/.test(p) && old.has(p)) continue; write(b, p, t); w++; }
  if (flags.includes('--clean')) for (const p of old.keys()) if ((/^(assets|css|js)\/.+\.(js|css)$/.test(p) || /^presets\/.+\.oscp$/i.test(p)) && !d.files.has(p)) { fs.unlinkSync(path.join(b, p)); console.log('removed stale', p); }
  d.report.auto.forEach(p => console.log('NEW part auto-named:', p));
  console.log('decompiled:', d.report.parts, 'parts,', d.report.assets, 'assets;', w, 'files written,', s, 'unchanged. VERIFIED.');
} else if (cmd === 'compile' && a && b) {
  const files = readDir(a), c = E.compile(files);
  c.report.warnings.forEach(x => console.log('warn:', x)); if (c.report.errors.length) { c.report.errors.forEach(x => console.error('error:', x)); process.exit(1); }
  const c2 = E.compile(E.decompile(c.html).files); if (c2.html !== c.html) { console.error('VERIFY FAILED'); process.exit(1); }
  fs.writeFileSync(b, c.html);
  if (flags.includes('--refresh')) { const d = E.decompile(c.html); for (const p of ['sirenosc.structure.json', 'js/load-order.json', 'STRUCTURE.md']) write(a, p, d.files.get(p)); }
  console.log('compiled:', c.report.parts, 'parts ->', b, '(' + (c.html.length / 1048576).toFixed(2) + ' MB). VERIFIED.');
} else if (cmd === 'verify' && a) {
  let html; if (fs.statSync(a).isDirectory()) html = E.compile(readDir(a)).html; else html = fs.readFileSync(a, 'utf8');
  const r = E.verifyRoundTrip(html); console.log(r.ok ? 'OK - round trip identical' + (r.exact === undefined ? '' : r.exact ? ' (byte-exact)' : ' (markers differ)') : 'FAILED at char ' + r.firstDiff); process.exit(r.ok ? 0 : 1);
} else { console.log('usage:\n  decompile <single.html> <project-dir> [--clean]\n  compile   <project-dir> <single.html> [--refresh]\n  verify    <single.html | project-dir>'); process.exit(cmd ? 1 : 0); }
