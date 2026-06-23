/* V1.0.3 JS split: Planting New Plan Save Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let createMode = false;

  function safe(fn, fallback){
    try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; }
  }
  function plans(){
    return safe(function(){
      if(!Array.isArray(plantingPlans)) plantingPlans = [];
      return plantingPlans;
    }, []);
  }
  function planExists(id){
    return !!id && plans().some(function(p){ return p && String(p.id) === String(id); });
  }
  function nextPlanId(){
    const y = new Date().getFullYear() + 543;
    let max = 0;
    plans().forEach(function(p){
      const m = String((p && p.id) || '').match(new RegExp('^PL-' + y + '-(\\d+)$'));
      if(m) max = Math.max(max, Number(m[1]) || 0);
    });
    return 'PL-' + y + '-' + String(max + 1).padStart(4, '0');
  }
  function isEditMode(){
    const modal = document.getElementById('modal-planting-plan');
    return !!(modal && modal.classList.contains('fp-editing-plan'));
  }
  function getDraft(){
    return safe(function(){ return (typeof _fpDraft !== 'undefined') ? _fpDraft : null; }, null);
  }
  function setDraft(draft){
    safe(function(){ _fpDraft = draft; });
  }
  function resetDraftForNewPlan(){
    createMode = true;
    setDraft(null);
  }
  function retagDraftTasks(planId){
    const draft = getDraft();
    if(!draft || !Array.isArray(draft.tasks)) return;
    draft.tasks.forEach(function(task, index){
      if(task && typeof task === 'object') task.id = 'task-' + String(planId).replace(/[^a-zA-Z0-9_-]/g, '') + '-' + (index + 1);
    });
  }
  function forceUniqueDraftId(){
    const draft = getDraft();
    if(!draft || isEditMode()) return draft;
    if(createMode || planExists(draft.id)){
      const freshId = nextPlanId();
      draft.id = freshId;
      draft.createdAt = new Date().toISOString();
      draft.updatedAt = new Date().toISOString();
      retagDraftTasks(freshId);
    }
    return draft;
  }
  function updateVersionLabels(){
    safe(function(){ document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
    safe(function(){
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(function(el){
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }

  const previousOpen = window.openPlantingPlanModal;
  if(typeof previousOpen === 'function' && !previousOpen.__v0648NewPlanFix){
    const wrappedOpen = function(reset){
      if(reset !== false) resetDraftForNewPlan();
      else createMode = false;
      const result = previousOpen.apply(this, arguments);
      if(reset !== false){
        safe(function(){ if(typeof calculatePlantingPlan === 'function') calculatePlantingPlan(); });
        forceUniqueDraftId();
        safe(function(){ if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
        safe(function(){ if(typeof setPlanModalMode === 'function') setPlanModalMode('add'); });
      }
      return result;
    };
    wrappedOpen.__v0648NewPlanFix = true;
    window.openPlantingPlanModal = wrappedOpen;
    try{ openPlantingPlanModal = wrappedOpen; }catch(e){}
  }

  const previousView = window.viewPlantingPlan;
  if(typeof previousView === 'function' && !previousView.__v0648NewPlanFix){
    const wrappedView = function(){
      createMode = false;
      return previousView.apply(this, arguments);
    };
    wrappedView.__v0648NewPlanFix = true;
    window.viewPlantingPlan = wrappedView;
    try{ viewPlantingPlan = wrappedView; }catch(e){}
  }

  const previousCalculate = window.calculatePlantingPlan;
  if(typeof previousCalculate === 'function' && !previousCalculate.__v0648NewPlanFix){
    const wrappedCalculate = function(){
      const result = previousCalculate.apply(this, arguments);
      forceUniqueDraftId();
      return getDraft() || result;
    };
    wrappedCalculate.__v0648NewPlanFix = true;
    window.calculatePlantingPlan = wrappedCalculate;
    try{ calculatePlantingPlan = wrappedCalculate; }catch(e){}
  }

  const previousSave = window.savePlantingPlan;
  if(typeof previousSave === 'function' && !previousSave.__v0648NewPlanFix){
    const wrappedSave = function(){
      forceUniqueDraftId();
      const result = previousSave.apply(this, arguments);
      createMode = false;
      return result;
    };
    wrappedSave.__v0648NewPlanFix = true;
    window.savePlantingPlan = wrappedSave;
    try{ savePlantingPlan = wrappedSave; }catch(e){}
  }

  ['savePlantingPlanDraft','syncCurrentPlantingPlanToCalendar'].forEach(function(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0648NewPlanFix) return;
    const wrapped = function(){
      forceUniqueDraftId();
      const result = fn.apply(this, arguments);
      createMode = false;
      return result;
    };
    wrapped.__v0648NewPlanFix = true;
    window[name] = wrapped;
  });

  const previousClose = window.closePlantingPlanModal;
  if(typeof previousClose === 'function' && !previousClose.__v0648NewPlanFix){
    const wrappedClose = function(){
      createMode = false;
      return previousClose.apply(this, arguments);
    };
    wrappedClose.__v0648NewPlanFix = true;
    window.closePlantingPlanModal = wrappedClose;
    try{ closePlantingPlanModal = wrappedClose; }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(updateVersionLabels, 600);
  });
  setTimeout(updateVersionLabels, 1200);
  console.log('✅ ' + VERSION + ' planting new-plan overwrite fix ready');
})();
