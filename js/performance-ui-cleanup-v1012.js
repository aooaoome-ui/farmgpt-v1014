/* V1.0.12 Performance + UI Cleanup
   Frontend-only layer: skips duplicate dashboard renders and normalizes Settings card sizing. */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.12';
  const metrics = {
    version: VERSION,
    dashboardCalls: 0,
    dashboardRendered: 0,
    dashboardSkipped: 0,
    chartCalls: 0,
    chartRendered: 0,
    chartSkipped: 0,
    settingsStyled: 0,
    lastDashboardMs: 0,
    lastSkipReason: ''
  };

  let lastDashboardSignature = '';
  let lastDashboardAt = 0;
  let dashboardPending = false;
  let installed = false;

  function safe(fn, fallback){
    try { return fn(); } catch (error) { console.warn(VERSION, error); return fallback; }
  }

  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){ window.eval(name + ' = window["' + name + '"]'); });
  }

  function isDashboardActive(){
    const page = document.getElementById('page-dashboard');
    return !!(page && page.classList.contains('active'));
  }

  function dataSignature(){
    return safe(function(){
      const data = window.eval('({ projectItems, cropItems, actItems, invItems, salesData, calEvents, plantingPlans, farmInputPlans })');
      const sum = function(list, selector){
        return (Array.isArray(list) ? list : []).reduce(function(total, item){
          return total + (Number(selector(item)) || 0);
        }, 0);
      };
      return [
        Array.isArray(data.projectItems) ? data.projectItems.length : 0,
        Array.isArray(data.cropItems) ? data.cropItems.length : 0,
        Array.isArray(data.actItems) ? data.actItems.length : 0,
        Array.isArray(data.invItems) ? data.invItems.length : 0,
        Array.isArray(data.salesData) ? data.salesData.length : 0,
        Array.isArray(data.calEvents) ? data.calEvents.length : 0,
        Array.isArray(data.plantingPlans) ? data.plantingPlans.length : 0,
        Array.isArray(data.farmInputPlans) ? data.farmInputPlans.length : 0,
        sum(data.salesData, function(item){ return item.total; }).toFixed(2),
        sum(data.invItems, function(item){ return item.qty; }).toFixed(2),
        new Date().toISOString().slice(0, 10)
      ].join('|');
    }, String(Date.now()));
  }

  function wrapDashboard(){
    const original = window.renderDashboard;
    if (typeof original !== 'function' || original.__v1012DashboardCache) return false;
    const wrapped = function(){
      metrics.dashboardCalls += 1;
      const now = performance.now();
      const signature = dataSignature();

      if (!isDashboardActive()) {
        dashboardPending = true;
        metrics.dashboardSkipped += 1;
        metrics.lastSkipReason = 'dashboard-not-active';
        return false;
      }

      if (!dashboardPending && signature === lastDashboardSignature && now - lastDashboardAt < 1400) {
        metrics.dashboardSkipped += 1;
        metrics.lastSkipReason = 'duplicate-dashboard-render';
        return false;
      }

      const started = performance.now();
      const result = original.apply(this, arguments);
      lastDashboardSignature = signature;
      lastDashboardAt = performance.now();
      dashboardPending = false;
      metrics.dashboardRendered += 1;
      metrics.lastDashboardMs = Math.round(performance.now() - started);
      return result;
    };
    wrapped.__v1012DashboardCache = true;
    wrapped.__v1012Original = original;
    assignGlobal('renderDashboard', wrapped);
    return true;
  }

  function wrapChart(name, cooldownMs){
    const original = window[name];
    if (typeof original !== 'function' || original.__v1012ChartCache) return false;
    let lastAt = 0;
    const wrapped = function(){
      metrics.chartCalls += 1;
      const now = performance.now();
      if (now - lastAt < cooldownMs) {
        metrics.chartSkipped += 1;
        return false;
      }
      lastAt = now;
      metrics.chartRendered += 1;
      return original.apply(this, arguments);
    };
    wrapped.__v1012ChartCache = true;
    wrapped.__v1012Original = original;
    assignGlobal(name, wrapped);
    return true;
  }

  function ensureStyle(){
    if (document.getElementById('performance-ui-cleanup-v1012-style')) return;
    const style = document.createElement('style');
    style.id = 'performance-ui-cleanup-v1012-style';
    style.textContent =
      '#page-settings.settings-ui-v1012 .settings-main-grid{grid-auto-rows:minmax(292px,auto);align-items:stretch}' +
      '#page-settings.settings-ui-v1012 .settings-main-grid .settings-section-card,' +
      '#page-settings.settings-ui-v1012 #auto-backup-v0682,' +
      '#page-settings.settings-ui-v1012 #data-health-gate-v103,' +
      '#page-settings.settings-ui-v1012 #restore-audit-v103{' +
        'min-height:292px!important;height:100%!important;max-height:372px;overflow:auto;scrollbar-width:thin}' +
      '#page-settings.settings-ui-v1012 .settings-section-head{position:sticky;top:0;z-index:1;background:inherit;padding-bottom:8px}' +
      '#page-settings.settings-ui-v1012 .settings-section-card p,' +
      '#page-settings.settings-ui-v1012 .settings-section-card .app-soft-note,' +
      '#page-settings.settings-ui-v1012 .settings-cloud-box{max-width:70ch}' +
      '#page-settings.settings-ui-v1012 .settings-export-grid{align-items:stretch}' +
      '#page-settings.settings-ui-v1012 .settings-export-btn{height:58px;display:flex;flex-direction:column;justify-content:center}' +
      '#page-settings.settings-ui-v1012 .data-stability-gate-v1011-card,' +
      '#page-settings.settings-ui-v1012 [data-v1011-stability-card]{min-height:292px!important;max-height:372px;overflow:auto}' +
      '@media(max-width:980px){#page-settings.settings-ui-v1012 .settings-main-grid .settings-section-card,' +
        '#page-settings.settings-ui-v1012 #auto-backup-v0682,' +
        '#page-settings.settings-ui-v1012 #data-health-gate-v103,' +
        '#page-settings.settings-ui-v1012 #restore-audit-v103{height:auto!important;max-height:none;min-height:auto!important;overflow:visible}' +
        '#page-settings.settings-ui-v1012 .settings-section-head{position:static}}';
    document.head.appendChild(style);
  }

  function applySettingsUi(){
    safe(function(){
      ensureStyle();
      const page = document.getElementById('page-settings');
      if (!page) return;
      page.classList.add('settings-ui-v1012');
      metrics.settingsStyled += 1;
      const badge = page.querySelector('.settings-hero-badge');
      if (badge) badge.textContent = (window.farmCentralSyncV103 && window.farmCentralSyncV103.isReady && window.farmCentralSyncV103.isReady())
        ? 'Online Sync · ' + VERSION
        : 'Local · ' + VERSION;
    });
  }

  function wrapSettings(){
    const original = window.renderSettings;
    if (typeof original !== 'function' || original.__v1012SettingsUi) return false;
    const wrapped = function(){
      const result = original.apply(this, arguments);
      applySettingsUi();
      window.setTimeout(applySettingsUi, 80);
      return result;
    };
    wrapped.__v1012SettingsUi = true;
    wrapped.__v1012Original = original;
    assignGlobal('renderSettings', wrapped);
    return true;
  }

  function install(){
    const changed = [
      wrapDashboard(),
      wrapChart('buildReportCharts', 2400),
      wrapChart('initDashboardChart', 2400),
      wrapSettings()
    ].some(Boolean);
    applySettingsUi();
    installed = installed || changed;
    window.farmPerformanceUiCleanupV1012 = {
      version: VERSION,
      install,
      applySettingsUi,
      metrics: function(){ return JSON.parse(JSON.stringify(metrics)); }
    };
    return installed;
  }

  function boot(){
    install();
    [300, 900, 1800, 3600, 7200].forEach(function(delay){
      window.setTimeout(install, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
