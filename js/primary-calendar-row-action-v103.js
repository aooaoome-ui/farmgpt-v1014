(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function markCalendarAction(){
    const root = document.querySelector('#page-planning') || document;
    qa('.fp-plan-actions-compact .btn', root).forEach(btn => {
      const text = (btn.textContent || '').trim();
      const onclick = btn.getAttribute('onclick') || '';
      const isCalendar = /syncPlantingPlanRowToCalendar/.test(onclick) || text === 'ส่งปฏิทิน' || text === 'ส่งซ้ำ';
      btn.classList.toggle('fp-calendar-row-action', isCalendar);
      btn.classList.toggle('is-synced', isCalendar && text === 'ส่งซ้ำ');
    });
  }

  const prevRender = window.renderPlantingPlans;
  if(typeof prevRender === 'function' && !prevRender.__v0656PrimaryCalendarAction){
    const wrappedRender = function(){
      const result = prevRender.apply(this, arguments);
      setTimeout(markCalendarAction, 0);
      setTimeout(markCalendarAction, 140);
      return result;
    };
    wrappedRender.__v0656PrimaryCalendarAction = true;
    window.renderPlantingPlans = wrappedRender;
    safe(() => { renderPlantingPlans = wrappedRender; });
  }

  const prevSyncRow = window.syncPlantingPlanRowToCalendar;
  if(typeof prevSyncRow === 'function' && !prevSyncRow.__v0656PrimaryCalendarAction){
    const wrappedSync = function(){
      const result = prevSyncRow.apply(this, arguments);
      setTimeout(markCalendarAction, 0);
      setTimeout(markCalendarAction, 140);
      return result;
    };
    wrappedSync.__v0656PrimaryCalendarAction = true;
    window.syncPlantingPlanRowToCalendar = wrappedSync;
    safe(() => { syncPlantingPlanRowToCalendar = wrappedSync; });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      markCalendarAction();
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 1500);
  });
})();
