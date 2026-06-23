/* V1.0.3 Planning Flow Seed Fix Adapter Split
   Extracted from farm_management_V0_7_8_project_flow_adapter_split.html.
   Keeps material-plan seeded state wrapper outside the HTML while leaving core data/storage inline. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function safe(fn){ try{ return fn(); }catch(e){ console.warn(VERSION, e); } }
  function markMaterialSeeded(){
    safe(function(){
      if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {};
      if(Array.isArray(farmInputPlans) && farmInputPlans.length) farmSettings.materialPlanSeeded = true;
    });
  }
  const oldDelete = window.deleteFarmInputPlan;
  if(typeof oldDelete === 'function' && !oldDelete.__v0644SeedFix){
    const wrappedDelete = function(){
      const result = oldDelete.apply(this, arguments);
      safe(function(){
        if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {};
        farmSettings.materialPlanSeeded = true;
        if(typeof saveData === 'function') saveData();
      });
      return result;
    };
    wrappedDelete.__v0644SeedFix = true;
    window.deleteFarmInputPlan = wrappedDelete;
  }
  const oldRender = window.renderFarmInputPlans;
  if(typeof oldRender === 'function' && !oldRender.__v0644SeedFix){
    const wrappedRender = function(){
      markMaterialSeeded();
      return oldRender.apply(this, arguments);
    };
    wrappedRender.__v0644SeedFix = true;
    window.renderFarmInputPlans = wrappedRender;
  }
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      markMaterialSeeded();
      safe(function(){ document.title = document.title.replace(/V0\.6\.\d+/, VERSION); });
      safe(function(){ document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; }); });
      safe(function(){ document.querySelectorAll('.badge-text span:last-child').forEach(function(el){ if(/V0\.6\./.test(el.textContent || '')) el.textContent = VERSION; }); });
      console.log('✅ ' + VERSION + ' Planning flow seed fix ready');
    }, 2300);
  });
})();
