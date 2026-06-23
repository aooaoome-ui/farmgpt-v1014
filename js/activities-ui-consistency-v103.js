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
  function applyActivitiesUi(){
    safe(function(){
      document.body.classList.add('activities-ui-v0674-active');
      const page = document.getElementById('page-activities');
      if(page) page.classList.add('activities-ui-v0674');
      document.querySelectorAll('#page-activities .btn,#page-activities .activity-detail-toggle,#modal-activity .btn,#modal-activity .activity-quick-chip').forEach(function(el){
        if(!el.getAttribute('type') && el.tagName === 'BUTTON') el.setAttribute('type','button');
      });
      stamp();
    });
  }
  function wrapRenderActivities(){
    const oldRender = window.renderActivities;
    if(typeof oldRender !== 'function' || oldRender.__v0674ActivitiesUi) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      applyActivitiesUi();
      return result;
    };
    wrapped.__v0674ActivitiesUi = true;
    window.renderActivities = wrapped;
    try{ renderActivities = wrapped; }catch(e){}
  }
  function boot(){
    wrapRenderActivities();
    applyActivitiesUi();
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 120);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(stamp, 0);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    window.setTimeout(applyActivitiesUi, 800);
    window.setTimeout(applyActivitiesUi, 2200);
  }
  window.farmActivitiesUiConsistencyV0674 = { boot, applyActivitiesUi, stamp };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 9600);
  });
})();
