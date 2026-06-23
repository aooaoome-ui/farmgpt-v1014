/* V1.0.7 Navigation Performance Hotfix
   Keep page activation immediate; defer heavy page renders to the next frame. */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.7';
  let navToken = 0;
  let lastPage = '';
  let lastNonDashboardNavAt = 0;
  let lastDashboardClickAt = 0;
  const metrics = {
    version: VERSION,
    navCalls: 0,
    deferredRenders: 0,
    lastPage: '',
    lastActivateMs: 0,
    lastRenderMs: 0
  };
  const RENDER_DELAY_MS = {
    dashboard: 160,
    inventory: 340,
    settings: 220,
    sales: 90,
    planning: 40
  };

  function safe(fn, fallback){
    try { return fn(); } catch (err) { console.warn(VERSION, 'navigation performance warning', err); return fallback; }
  }

  function assignNavigate(fn){
    window.navigate = fn;
    safe(function(){ navigate = fn; });
  }

  function navElementFor(page, el){
    if (el && el.classList) return el;
    return document.querySelector(".nav-item[onclick*=\"" + page + "\"]") ||
      document.querySelector(".nav-item[onclick*='" + page + "']");
  }

  function cleanTitle(text){
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .trim();
  }

  function setTitle(page, el){
    const titleEl = document.getElementById('page-title');
    if (!titleEl) return;
    const navTitle = cleanTitle((el && el.textContent) || '');
    if (navTitle) {
      titleEl.textContent = navTitle;
      return;
    }
    const active = document.querySelector(".nav-item[onclick*=\"" + page + "\"],.nav-item[onclick*='" + page + "']");
    const activeTitle = cleanTitle(active && active.textContent);
    if (activeTitle) titleEl.textContent = activeTitle;
  }

  function activatePage(page, el){
    const started = performance.now();
    document.querySelectorAll('.page').forEach(function(node){ node.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(node){ node.classList.remove('active'); });
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = navElementFor(page, el);
    if (navEl) navEl.classList.add('active');
    safe(function(){ if (typeof closeSidebar === 'function') closeSidebar(); });
    safe(function(){ if (typeof setBottomNav === 'function') setBottomNav(page); });
    setTitle(page, navEl);
    metrics.lastActivateMs = Math.round(performance.now() - started);
  }

  function scheduleRender(page, token){
    document.documentElement.classList.add('farm-perf-navigating');
    requestAnimationFrame(function(){
      window.setTimeout(function(){
        if (token !== navToken) return;
        const started = performance.now();
        renderPage(page);
        metrics.lastRenderMs = Math.round(performance.now() - started);
        metrics.deferredRenders += 1;
        document.documentElement.classList.remove('farm-perf-navigating');
      }, RENDER_DELAY_MS[page] || 0);
    });
  }

  function renderPage(page){
    if (page === 'dashboard') {
      safe(function(){ if (typeof renderDashboard === 'function') renderDashboard(); });
      window.setTimeout(function(){
        safe(function(){ if (typeof initDashboardChart === 'function') initDashboardChart(); });
        safe(function(){ if (typeof buildReportCharts === 'function') buildReportCharts(); });
        safe(function(){ chartsInit = true; });
      }, 90);
      return;
    }
    if (page === 'crops') {
      safe(function(){ if (typeof renderCrops === 'function' && (typeof cropRendered === 'undefined' || !cropRendered)) renderCrops(); });
      safe(function(){ cropRendered = true; });
      return;
    }
    if (page === 'activities') {
      safe(function(){ if (typeof renderActivities === 'function' && (typeof actRendered === 'undefined' || !actRendered)) renderActivities(); });
      safe(function(){ actRendered = true; });
      return;
    }
    if (page === 'sales') {
      safe(function(){ if (typeof renderSales === 'function' && (typeof salesRendered === 'undefined' || !salesRendered)) renderSales(); });
      safe(function(){ salesRendered = true; });
      window.setTimeout(function(){ safe(function(){ if (typeof renderSalesCharts === 'function') renderSalesCharts(); }); }, 90);
      return;
    }
    if (page === 'inventory') {
      safe(function(){ if (typeof renderInv === 'function' && (typeof invRendered === 'undefined' || !invRendered)) renderInv(); });
      safe(function(){ invRendered = true; });
      window.setTimeout(function(){ safe(function(){ if (typeof renderReqHistory === 'function') renderReqHistory(); }); }, 0);
      return;
    }
    if (page === 'customers') {
      safe(function(){ if (typeof renderCustomers === 'function' && (typeof custRendered === 'undefined' || !custRendered)) renderCustomers(); });
      safe(function(){ custRendered = true; });
      return;
    }
    if (page === 'projects') {
      safe(function(){ if (typeof renderProjects === 'function') renderProjects(); });
      return;
    }
    if (page === 'planning') {
      safe(function(){
        if (typeof switchFarmPlanTab === 'function' && document.getElementById('farm-plan-tab-command')) switchFarmPlanTab('command');
        else if (typeof renderFarmPlanning === 'function') renderFarmPlanning();
      });
      return;
    }
    if (page === 'calendar') {
      safe(function(){ if (typeof renderCalendar === 'function') renderCalendar(); });
      return;
    }
    if (page === 'settings') {
      safe(function(){ if (typeof renderSettings === 'function') renderSettings(); });
    }
  }

  function install(){
    if (typeof window.navigate !== 'function') return false;
    const previous = window.navigate;
    if (previous.__v107NavigationPerf) return true;
    const wrapped = function(page, el){
      if (page === 'reports') page = 'dashboard';
      if (page === 'manager') page = 'planning';
      const target = document.getElementById('page-' + page);
      if (!target) return previous.apply(this, arguments);
      if (page === 'dashboard' && metrics.navCalls <= 3 && lastNonDashboardNavAt && Date.now() - lastNonDashboardNavAt < 8000 && Date.now() - lastDashboardClickAt > 700) {
        return true;
      }
      if (page !== 'dashboard') lastNonDashboardNavAt = Date.now();
      metrics.navCalls += 1;
      metrics.lastPage = page;
      if (lastPage === page && target.classList.contains('active') && page !== 'dashboard') {
        activatePage(page, el);
        return true;
      }
      lastPage = page;
      navToken += 1;
      activatePage(page, el);
      scheduleRender(page, navToken);
      return true;
    };
    wrapped.__v107NavigationPerf = true;
    wrapped.__v107Original = previous;
    assignNavigate(wrapped);
    window.farmNavigationPerformanceV107 = {
      install: install,
      metrics: function(){ return Object.assign({}, metrics); }
    };
    console.log('Navigation performance hotfix ready', VERSION);
    return true;
  }

  function boot(){
    if (!install()) window.setTimeout(boot, 250);
    document.addEventListener('click', function(event){
      const target = event.target && event.target.closest ? event.target.closest("[onclick*='dashboard'],[onclick*=\"dashboard\"]") : null;
      if (target) lastDashboardClickAt = Date.now();
    }, true);
    [900, 1800, 3600, 9600].forEach(function(delay){
      window.setTimeout(install, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
