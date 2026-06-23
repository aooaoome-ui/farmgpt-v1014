/* V1.0.3 Performance Fast Render
   Extracted from farm_management_V0_6_89_planning_performance_split.html for V1.0.3 UI JS split.
   Keep farmPerformanceFastRenderV0672 and wrapper globals stable for inline handlers. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const RENDER_NAMES = [
    'renderCrops',
    'renderActivities',
    'renderInv',
    'renderCustomers',
    'renderSales',
    'renderCalendar',
    'renderDashboard',
    'renderDashboardNotifications',
    'renderSettings',
    'renderFarmPlanning',
    'renderPlantingPlans',
    'renderFarmInputPlans',
    'renderProjects',
    'renderReqHistory',
    'renderSalesCharts',
    'renderCropNameManagerPopup',
    'renderPlantingDraft',
    'renderPlantingTimeline'
  ];
  let renderDepth = 0;
  let queuedSaveTimer = 0;
  let lastChartRun = 0;
  let navToken = 0;
  let observerTimer = 0;
  let booted = false;
  let stampTimer = 0;

  function safe(fn, fallback){
    try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; }
  }
  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){
      if(name === 'saveData') saveData = fn;
      if(name === 'navigate') navigate = fn;
      if(name === 'buildReportCharts') buildReportCharts = fn;
      if(name === 'initDashboardChart') initDashboardChart = fn;
      if(name === 'renderCrops') renderCrops = fn;
      if(name === 'renderActivities') renderActivities = fn;
      if(name === 'renderInv') renderInv = fn;
      if(name === 'renderCustomers') renderCustomers = fn;
      if(name === 'renderSales') renderSales = fn;
      if(name === 'renderCalendar') renderCalendar = fn;
      if(name === 'renderDashboard') renderDashboard = fn;
      if(name === 'renderDashboardNotifications') renderDashboardNotifications = fn;
      if(name === 'renderSettings') renderSettings = fn;
      if(name === 'renderFarmPlanning') renderFarmPlanning = fn;
      if(name === 'renderPlantingPlans') renderPlantingPlans = fn;
      if(name === 'renderFarmInputPlans') renderFarmInputPlans = fn;
      if(name === 'renderProjects') renderProjects = fn;
      if(name === 'renderReqHistory') renderReqHistory = fn;
      if(name === 'renderSalesCharts') renderSalesCharts = fn;
      if(name === 'renderCropNameManagerPopup') renderCropNameManagerPopup = fn;
      if(name === 'renderPlantingDraft') renderPlantingDraft = fn;
      if(name === 'renderPlantingTimeline') renderPlantingTimeline = fn;
    });
  }
  function inRender(){
    return renderDepth > 0 || document.documentElement.classList.contains('farm-perf-navigating');
  }
  function queueSave(realSave){
    window.clearTimeout(queuedSaveTimer);
    queuedSaveTimer = window.setTimeout(function(){
      safe(function(){ realSave.call(window); });
    }, 1100);
  }
  function installSaveGate(){
    const oldSave = window.saveData;
    if(typeof oldSave !== 'function' || oldSave.__v0672Performance) return;
    const wrappedSave = function(){
      if(inRender()){
        queueSave(oldSave);
        return false;
      }
      return oldSave.apply(this, arguments);
    };
    wrappedSave.__v0672Performance = true;
    wrappedSave.__v0672Original = oldSave;
    assignGlobal('saveData', wrappedSave);
  }
  function withRenderLock(fn, ctx, args){
    renderDepth++;
    try{ return fn.apply(ctx, args || []); }
    finally{ renderDepth = Math.max(0, renderDepth - 1); }
  }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V\d+\.\d+\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.farm-badge *,.sidebar-logo,.logo-sub').forEach(function(el){
        if(!el) return;
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V\d+\.\d+\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V\d+\.\d+\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V\d+\.\d+\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V\d+\.\d+\.\d+/g, VERSION);
      });
    });
  }
  function installRenderLocks(){
    RENDER_NAMES.forEach(function(name){
      const oldFn = window[name];
      if(typeof oldFn !== 'function' || oldFn.__v0672Performance) return;
      const wrapped = function(){
        const result = withRenderLock(oldFn, this, arguments);
        stamp();
        return result;
      };
      wrapped.__v0672Performance = true;
      wrapped.__v0672Original = oldFn;
      assignGlobal(name, wrapped);
    });
  }
  function installChartThrottle(){
    ['buildReportCharts','initDashboardChart'].forEach(function(name){
      const oldFn = window[name];
      if(typeof oldFn !== 'function' || oldFn.__v0672ChartThrottle) return;
      const wrapped = function(){
        const now = performance.now();
        if(now - lastChartRun < 360) return;
        lastChartRun = now;
        return withRenderLock(oldFn, this, arguments);
      };
      wrapped.__v0672ChartThrottle = true;
      wrapped.__v0672Original = oldFn;
      assignGlobal(name, wrapped);
    });
  }
  function isPageActive(page){
    const el = document.getElementById('page-' + page);
    return !!(el && el.classList.contains('active'));
  }
  function installFastNavigate(){
    const oldNavigate = window.navigate;
    if(typeof oldNavigate !== 'function' || oldNavigate.__v0672Performance) return;
    const wrappedNavigate = function(page, el){
      if(isPageActive(page) && page !== 'dashboard'){
        if(el && el.classList) {
          document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
          el.classList.add('active');
        }
        stamp();
        return;
      }
      navToken++;
      document.documentElement.classList.add('farm-perf-navigating');
      const result = withRenderLock(oldNavigate, this, arguments);
      stamp();
      const current = navToken;
      requestAnimationFrame(function(){
        if(current === navToken) document.documentElement.classList.remove('farm-perf-navigating');
      });
      return result;
    };
    wrappedNavigate.__v0672Performance = true;
    wrappedNavigate.__v0672Original = oldNavigate;
    assignGlobal('navigate', wrappedNavigate);
  }
  function scheduleActionRefresh(){
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(function(){
      safe(function(){
        const api = window.farmActionWorkflowHardeningV0671;
        if(api && typeof api.normalizeSurfaces === 'function') api.normalizeSurfaces(document);
        if(api && typeof api.cleanupResolvedRows === 'function') api.cleanupResolvedRows();
      });
    }, 160);
  }
  function installScopedActionObserver(){
    safe(function(){
      if(window.__v0671ActionObserver && typeof window.__v0671ActionObserver.disconnect === 'function'){
        window.__v0671ActionObserver.disconnect();
      }
    });
    if(window.__v0672ScopedActionObserver) return;
    const targets = [
      document.getElementById('dash-todo-list'),
      document.getElementById('notify-panel'),
      document.getElementById('modal-cal-detail')
    ].filter(Boolean);
    if(!targets.length) return;
    window.__v0672ScopedActionObserver = new MutationObserver(function(records){
      if(records.some(r => r.addedNodes && r.addedNodes.length)) scheduleActionRefresh();
    });
    targets.forEach(function(target){
      window.__v0672ScopedActionObserver.observe(target, {childList:true, subtree:true});
    });
  }
  function installSelectResponsiveness(){
    if(document.__v0672SelectResponsiveness) return;
    document.__v0672SelectResponsiveness = true;
    document.addEventListener('pointerdown', function(ev){
      const select = ev.target && ev.target.closest ? ev.target.closest('select') : null;
      if(!select) return;
      document.documentElement.classList.add('farm-perf-navigating');
      window.setTimeout(function(){ document.documentElement.classList.remove('farm-perf-navigating'); }, 450);
    }, true);
  }
  function boot(){
    if(typeof window.navigate !== 'function' || typeof window.saveData !== 'function'){
      window.setTimeout(boot, 250);
      return;
    }
    if(booted){
      installScopedActionObserver();
      installSelectResponsiveness();
      stamp();
      return;
    }
    booted = true;
    installSaveGate();
    installRenderLocks();
    installChartThrottle();
    installFastNavigate();
    installScopedActionObserver();
    installSelectResponsiveness();
    stamp();
    window.setTimeout(stamp, 120);
    if(!stampTimer) stampTimer = window.setInterval(stamp, 8000);
  }
  window.farmPerformanceFastRenderV0672 = {
    boot,
    installSaveGate,
    installRenderLocks,
    installFastNavigate,
    installScopedActionObserver,
    stamp,
    metrics:function(){ return {renderDepth, queuedSave:!!queuedSaveTimer, observerScoped:!!window.__v0672ScopedActionObserver}; }
  };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(function(){
      boot();
      console.log('Performance fast render ready', VERSION);
    }, 9100);
  });
})();
