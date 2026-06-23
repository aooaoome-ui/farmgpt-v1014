/* V1.0.3 Dashboard/Activities split
   Extracted from farm_management_V0_6_86_inventory_split.html. Keep original global API names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let stampTimer = 0;
  let versionObserver = null;
  function safe(fn){ try{ return fn(); }catch(err){ console.warn(VERSION, err); } }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.sidebar-logo').forEach(function(el){
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V0\.6\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V0\.6\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V0\.6\.\d+/g, VERSION);
      });
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.farm-badge,.sidebar-logo').forEach(function(el){
        if(/V0\.6\.\d+/.test(el.innerHTML || '')) el.innerHTML = el.innerHTML.replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function applyDashboardUi(){
    safe(function(){
      document.body.classList.add('dashboard-ui-v0673-active');
      const page = document.getElementById('page-dashboard');
      if(page) page.classList.add('dashboard-ui-v0673');
      document.querySelectorAll('#page-dashboard .mock-panel,#page-dashboard .mock-kpi-card,#page-dashboard .mock-task-row').forEach(function(el){
        el.classList.add('dashboard-surface-v0673');
      });
      document.querySelectorAll('#page-dashboard .mock-date-filter,#page-dashboard .mock-quick-btn,#page-dashboard .mock-text-link,#page-dashboard .mock-bottom-link').forEach(function(btn){
        if(!btn.getAttribute('type')) btn.setAttribute('type','button');
      });
      stamp();
    });
  }
  function wrapRenderDashboard(){
    const oldRender = window.renderDashboard;
    if(typeof oldRender !== 'function' || oldRender.__v0673DashboardUi) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      applyDashboardUi();
      return result;
    };
    wrapped.__v0673DashboardUi = true;
    window.renderDashboard = wrapped;
    try{ renderDashboard = wrapped; }catch(e){}
  }
  function boot(){
    wrapRenderDashboard();
    applyDashboardUi();
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 50);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(stamp, 0);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    window.setTimeout(applyDashboardUi, 800);
    window.setTimeout(applyDashboardUi, 2200);
  }
  window.farmDashboardUiConsistencyV0673 = { boot, applyDashboardUi, stamp };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 9400);
  });
})();
