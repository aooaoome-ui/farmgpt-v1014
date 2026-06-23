(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function balancePlanActions(){
    const root = q('#page-planning') || document;
    qa('.fp-plan-actions-compact .btn, .fp-plan-actions-compact .fp-linked-crop-note', root).forEach(el => {
      const text = (el.textContent || '').trim();
      if(text === 'แก้') el.textContent = 'แก้ไข';
      if(text === 'ส่ง') el.textContent = 'ส่งปฏิทิน';
      if(text === 'ส่งซ้ำ') el.textContent = 'ส่งซ้ำ';
      if(text === 'พืช') el.textContent = 'พืชผล';
      if(text === 'พืชแล้ว') el.textContent = 'มีพืชผล';
      if(text === 'ดู') el.textContent = 'ดู';
      if(text === 'ลบ') el.textContent = 'ลบ';
    });
  }

  const prevRender = window.renderPlantingPlans;
  if(typeof prevRender === 'function' && !prevRender.__v0655BalancedActions){
    const wrappedRender = function(){
      const result = prevRender.apply(this, arguments);
      setTimeout(balancePlanActions, 0);
      setTimeout(balancePlanActions, 120);
      return result;
    };
    wrappedRender.__v0655BalancedActions = true;
    window.renderPlantingPlans = wrappedRender;
    safe(() => { renderPlantingPlans = wrappedRender; });
  }

  const prevSyncRow = window.syncPlantingPlanRowToCalendar;
  if(typeof prevSyncRow === 'function' && !prevSyncRow.__v0655BalancedActions){
    const wrappedSync = function(){
      const result = prevSyncRow.apply(this, arguments);
      setTimeout(balancePlanActions, 0);
      return result;
    };
    wrappedSync.__v0655BalancedActions = true;
    window.syncPlantingPlanRowToCalendar = wrappedSync;
    safe(() => { syncPlantingPlanRowToCalendar = wrappedSync; });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      balancePlanActions();
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 1400);
  });
})();
