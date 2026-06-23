/* V1.0.3 Planning Performance Pass
   Extracted from farm_management_V0_6_88_crops_split.html for V1.0.3 UI JS split.
   Keep farmPlanningPerformanceV0680 and wrapper globals stable for inline handlers. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let stampTimer = 0;
  let versionObserver = null;
  let planTimer = 0;
  let calcTimer = 0;
  let lastPlanSignature = '';
  let lastCalcSignature = '';
  let renderCount = 0;
  let skippedRenderCount = 0;
  let lastRenderMs = 0;
  let booted = false;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){
      if(name === 'renderPlantingPlans') renderPlantingPlans = fn;
      if(name === 'calculatePlantingPlan') calculatePlantingPlan = fn;
      if(name === 'renderFarmPlanning') renderFarmPlanning = fn;
      if(name === 'onFarmPlanCropTypeChange') onFarmPlanCropTypeChange = fn;
      if(name === 'onFarmPlanCropNameChange') onFarmPlanCropNameChange = fn;
    });
  }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V\d+\.\d+\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.farm-badge *,.sidebar-logo,.logo-sub').forEach(function(el){
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V\d+\.\d+\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V\d+\.\d+\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V\d+\.\d+\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V\d+\.\d+\.\d+/g, VERSION);
      });
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.farm-badge,.sidebar-logo').forEach(function(el){
        if(/V\d+\.\d+\.\d+/.test(el.innerHTML || '')) el.innerHTML = el.innerHTML.replace(/V\d+\.\d+\.\d+/g, VERSION);
      });
    });
  }
  function applyPerfClass(){
    const page = q('#page-planning');
    const modal = q('#modal-planting-plan');
    if(page) page.classList.add('planning-perf-v0680');
    if(modal) modal.classList.add('planning-perf-v0680');
  }
  function text(v){ return String(v == null ? '' : v); }
  function activeFilterSignature(){
    return [
      q('#fp-search')?.value || '',
      q('#fp-status-filter')?.value || ''
    ].join('~');
  }
  function planDataSignature(){
    const plans = safe(function(){ return Array.isArray(plantingPlans) ? plantingPlans : []; }, []);
    return plans.length + '|' + plans.map(function(p){
      return [
        p && p.id,
        p && p.updatedAt,
        p && p.calendarSyncedAt,
        p && p.status,
        p && p.cropName,
        p && p.plot,
        p && p.harvestDate
      ].map(text).join(':');
    }).join('|');
  }
  function planSignature(){
    return activeFilterSignature() + '::' + planDataSignature();
  }
  function calcSignature(){
    return ['fp-type','fp-crop','fp-plot','fp-start','fp-qty','fp-unit','fp-status'].map(function(id){
      return q('#' + id)?.value || '';
    }).join('::');
  }
  function isPlanningVisible(){
    const page = q('#page-planning');
    return !!(page && page.classList.contains('active'));
  }
  function isPlantingModalOpen(){
    return !!q('#modal-planting-plan.open');
  }
  function markPending(on){
    const table = q('#fp-plan-body')?.closest('.farm-plan-table-wrap');
    if(table) table.classList.toggle('fp-render-pending', !!on);
  }
  function installRenderCache(){
    const oldRender = window.renderPlantingPlans;
    if(typeof oldRender !== 'function' || oldRender.__v0680PlanningPerf) return;
    const wrapped = function(force){
      const body = q('#fp-plan-body');
      const forceRender = force === true || (force && force.force === true) || isPlantingModalOpen();
      const sig = planSignature();
      if(!forceRender && body && body.children.length && sig === lastPlanSignature){
        skippedRenderCount++;
        stamp();
        return false;
      }
      window.clearTimeout(planTimer);
      markPending(false);
      const start = performance.now();
      const result = oldRender.apply(this, arguments);
      lastRenderMs = Math.round(performance.now() - start);
      renderCount++;
      lastPlanSignature = planSignature();
      applyPerfClass();
      stamp();
      return result;
    };
    wrapped.__v0680PlanningPerf = true;
    wrapped.__v0680Original = oldRender;
    assignGlobal('renderPlantingPlans', wrapped);
  }
  function schedulePlantingRender(delay){
    window.clearTimeout(planTimer);
    markPending(true);
    planTimer = window.setTimeout(function(){
      window.requestAnimationFrame(function(){
        planTimer = 0;
        markPending(false);
        safe(function(){ window.renderPlantingPlans({force:true}); });
      });
    }, delay == null ? 140 : delay);
  }
  function installFilterDebounce(){
    const search = q('#fp-search');
    const status = q('#fp-status-filter');
    if(search && !search.__v0680Debounced){
      search.__v0680Debounced = true;
      search.removeAttribute('oninput');
      search.oninput = function(){ schedulePlantingRender(180); };
    }
    if(status && !status.__v0680Debounced){
      status.__v0680Debounced = true;
      status.removeAttribute('onchange');
      status.onchange = function(){ schedulePlantingRender(80); };
    }
  }
  function installCalculateCache(){
    const oldCalc = window.calculatePlantingPlan;
    if(typeof oldCalc !== 'function' || oldCalc.__v0680PlanningPerf) return;
    const wrapped = function(force){
      const sig = calcSignature();
      const hasDraft = safe(function(){ return typeof _fpDraft !== 'undefined' && !!_fpDraft; }, false);
      if(force !== true && hasDraft && sig === lastCalcSignature){
        safe(function(){ if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
        stamp();
        return safe(function(){ return _fpDraft; }, null);
      }
      const result = oldCalc.apply(this, arguments);
      lastCalcSignature = calcSignature();
      stamp();
      return result;
    };
    wrapped.__v0680PlanningPerf = true;
    wrapped.__v0680Original = oldCalc;
    assignGlobal('calculatePlantingPlan', wrapped);
  }
  function scheduleCalculate(delay){
    window.clearTimeout(calcTimer);
    calcTimer = window.setTimeout(function(){
      window.requestAnimationFrame(function(){
        calcTimer = 0;
        safe(function(){ window.calculatePlantingPlan(true); });
      });
    }, delay == null ? 120 : delay);
  }
  function installModalDropdownDebounce(){
    const oldType = window.onFarmPlanCropTypeChange;
    if(typeof oldType === 'function' && !oldType.__v0680PlanningPerf){
      const wrappedType = function(skipCalc){
        const result = oldType.call(this, true);
        if(!skipCalc) scheduleCalculate(120);
        return result;
      };
      wrappedType.__v0680PlanningPerf = true;
      wrappedType.__v0680Original = oldType;
      assignGlobal('onFarmPlanCropTypeChange', wrappedType);
    }
    const oldCrop = window.onFarmPlanCropNameChange;
    if(typeof oldCrop === 'function' && !oldCrop.__v0680PlanningPerf){
      const wrappedCrop = function(){
        scheduleCalculate(120);
        return false;
      };
      wrappedCrop.__v0680PlanningPerf = true;
      wrappedCrop.__v0680Original = oldCrop;
      assignGlobal('onFarmPlanCropNameChange', wrappedCrop);
    }
    ['#fp-type','#fp-crop'].forEach(function(sel){
      const el = q(sel);
      if(el && !el.__v0680DropdownReady){
        el.__v0680DropdownReady = true;
        el.addEventListener('pointerdown', function(){
          document.documentElement.classList.add('farm-perf-navigating');
          window.setTimeout(function(){ document.documentElement.classList.remove('farm-perf-navigating'); }, 520);
        }, true);
      }
    });
  }
  function installPlanningRenderLazy(){
    const oldFarmPlanning = window.renderFarmPlanning;
    if(typeof oldFarmPlanning !== 'function' || oldFarmPlanning.__v0680PlanningPerf) return;
    const wrapped = function(){
      if(!isPlanningVisible()) return oldFarmPlanning.apply(this, arguments);
      const active = q('#page-planning .farm-plan-tab.active')?.id || '';
      if(active.indexOf('planting') >= 0){
        schedulePlantingRender(0);
        return true;
      }
      if(active.indexOf('inputs') >= 0 && typeof window.renderFarmInputPlans === 'function'){
        return window.renderFarmInputPlans();
      }
      return oldFarmPlanning.apply(this, arguments);
    };
    wrapped.__v0680PlanningPerf = true;
    wrapped.__v0680Original = oldFarmPlanning;
    assignGlobal('renderFarmPlanning', wrapped);
  }
  function installSwitchRefresh(){
    const oldSwitch = window.switchFarmPlanTab;
    if(typeof oldSwitch !== 'function' || oldSwitch.__v0680PlanningPerf) return;
    const wrapped = function(tab){
      const result = oldSwitch.apply(this, arguments);
      if(tab === 'planting'){
        lastPlanSignature = '';
        schedulePlantingRender(0);
      }
      applyPerfClass();
      stamp();
      return result;
    };
    wrapped.__v0680PlanningPerf = true;
    wrapped.__v0680Original = oldSwitch;
    window.switchFarmPlanTab = wrapped;
    safe(function(){ switchFarmPlanTab = wrapped; });
  }
  function boot(){
    applyPerfClass();
    installRenderCache();
    installCalculateCache();
    installFilterDebounce();
    installModalDropdownDebounce();
    installPlanningRenderLazy();
    installSwitchRefresh();
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 8000);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(function(){ stamp(); applyPerfClass(); installFilterDebounce(); installModalDropdownDebounce(); }, 120);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    if(!booted){
      booted = true;
      window.setTimeout(function(){ boot(); }, 1800);
    }
  }
  window.farmPlanningPerformanceV0680 = {
    boot,
    schedulePlantingRender,
    scheduleCalculate,
    metrics:function(){
      return {
        version:VERSION,
        renderCount,
        skippedRenderCount,
        lastRenderMs,
        pendingRender:!!planTimer,
        pendingCalculate:!!calcTimer,
        lastPlanSignatureLength:lastPlanSignature.length
      };
    }
  };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 10000);
  });
})();
