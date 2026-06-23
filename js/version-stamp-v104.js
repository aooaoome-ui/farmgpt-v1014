/* V1.0.3 Version Stamp UI Layer
   Extracted from farm_management_V0_6_83_css_split.html for V1.0.3 UI JS split.
   Original script line: 23040. Keep global API names stable for inline handlers. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || ((document.title || '').match(/V\d+\.\d+\.\d+/) || ['V1.0.4'])[0];
  let stampTimer = 0;
  function safe(fn, fallback){ try{ return fn(); }catch(e){ return fallback; } }
  function stampNodeText(el){
    if(!el) return;
    Array.from(el.childNodes || []).forEach(function(node){
      if(node.nodeType === Node.TEXT_NODE && /V\d+\.\d+\.\d+/.test(node.nodeValue || '')){
        node.nodeValue = node.nodeValue.replace(/V\d+\.\d+\.\d+/g, VERSION);
      }
    });
    if(el.children.length === 0 && /V\d+\.\d+\.\d+/.test(el.textContent || '')){
      el.textContent = el.textContent.replace(/V\d+\.\d+\.\d+/g, VERSION);
    }
  }
  function stamp(){
    safe(function(){ document.documentElement.classList.add('full-ui-qa-v0681'); });
    safe(function(){ document.title = (document.title || '').replace(/V\d+\.\d+\.\d+/g, VERSION); });
    safe(function(){
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){
        el.textContent = VERSION;
        el.setAttribute('data-app-version', VERSION);
      });
      document.querySelectorAll('.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.sidebar-logo,.logo-sub,.farm-badge *').forEach(function(el){
        stampNodeText(el);
        if(/V\d+\.\d+\.\d+/.test(el.innerHTML || '')) el.innerHTML = el.innerHTML.replace(/V\d+\.\d+\.\d+/g, VERSION);
      });
      document.querySelectorAll('#page-settings .settings-hero-badge').forEach(function(el){
        el.textContent = '☁️ Online Sync · ' + VERSION;
      });
    });
    safe(function(){
      const api = window.farmPlanningPerformanceV0680;
      if(api && typeof api.metrics === 'function'){
        const page = document.getElementById('page-planning');
        const modal = document.getElementById('modal-planting-plan');
        if(page) page.classList.add('planning-perf-v0680');
        if(modal) modal.classList.add('planning-perf-v0680');
      }
    });
  }
  function boot(){
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 1400);
  }
  window.farmFullUiQaV0681 = { boot, stamp, version: VERSION };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 1200);
    window.setTimeout(boot, 11000);
  });
})();
