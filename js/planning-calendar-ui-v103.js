// V1.0.3 JS split: Planning + Calendar UI Consistency.
// Preserves the stable farmPlanningCalendarUiV0664 global API.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function stamp(){
    safe(() => {
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function normalizeMaterialToolbar(){
    const toolbar = document.getElementById('farm-material-toolbar');
    if(!toolbar || toolbar.__v0664Normalized) return;
    toolbar.__v0664Normalized = true;
    toolbar.querySelectorAll('.form-control').forEach(el => el.setAttribute('autocomplete', 'off'));
  }
  function markDangerButtons(root){
    (root || document).querySelectorAll('#page-planning .farm-material-actions .btn, #page-planning .fp-row-actions .btn, #page-planning .fp-plan-actions-compact .btn').forEach(btn => {
      const text = (btn.textContent || '').trim();
      if(/ลบ|ยืนยันลบ/.test(text)) btn.classList.add('ui-danger-v0664');
      if(/แก้ไข|ดู/.test(text)) btn.classList.add('ui-primary-soft-v0664');
    });
  }
  function refreshUI(){
    normalizeMaterialToolbar();
    markDangerButtons(document);
  }
  function wrapRender(name){
    const oldFn = window[name];
    if(typeof oldFn !== 'function' || oldFn.__v0664UiConsistency) return;
    const wrapped = function(){
      const result = oldFn.apply(this, arguments);
      safe(refreshUI);
      return result;
    };
    wrapped.__v0664UiConsistency = true;
    window[name] = wrapped;
    safe(() => {
      if(name === 'renderFarmInputPlans') renderFarmInputPlans = wrapped;
      if(name === 'renderCalendar') renderCalendar = wrapped;
      if(name === 'renderFarmPlanning') renderFarmPlanning = wrapped;
    });
  }
  function install(){
    ['renderFarmInputPlans','renderCalendar','renderFarmPlanning'].forEach(wrapRender);
    refreshUI();
    stamp();
  }
  window.farmPlanningCalendarUiV0664 = {install, refreshUI};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      install();
      safe(() => { if(typeof renderFarmInputPlans === 'function') renderFarmInputPlans(); });
      safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
      console.log('Planning + calendar UI consistency ready', VERSION);
    }, 4300);
  });
})();
