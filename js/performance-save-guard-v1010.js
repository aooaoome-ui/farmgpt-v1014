/* V1.0.10 Performance + Save Guard Audit */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.10';
  const metrics = {
    version: VERSION,
    decimalApplyQueued: 0,
    decimalApplyFlushed: 0,
    decimalObserverScoped: false,
    navigationAudits: []
  };

  function safe(fn, fallback){
    try { return fn(); } catch (error) { console.warn(VERSION, error); return fallback; }
  }

  function activeRoot(){
    return document.querySelector('.page.active') || document.body;
  }

  function installAsyncDecimalDisplay(){
    const api = window.farmDecimalDisplayV108;
    if (!api || typeof api.applyAll !== 'function' || api.__v1010AsyncApply) return false;

    const originalApplyAll = api.applyAll.bind(api);
    let timer = 0;
    let queuedRoot = null;

    function flush(){
      const root = queuedRoot || activeRoot();
      queuedRoot = null;
      timer = 0;
      metrics.decimalApplyFlushed += 1;
      return originalApplyAll(root);
    }

    function schedule(root){
      queuedRoot = root && root !== document ? root : activeRoot();
      metrics.decimalApplyQueued += 1;
      if (timer) return true;
      timer = window.setTimeout(function(){
        const run = function(){ safe(flush); };
        if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 300 });
        else window.requestAnimationFrame(run);
      }, 120);
      return true;
    }

    api.applyAllImmediate = originalApplyAll;
    api.applyAll = function(root){
      if (root && root !== document.body && root !== document && root.querySelectorAll) {
        return originalApplyAll(root);
      }
      return schedule(root);
    };
    api.flushV1010 = flush;
    api.__v1010AsyncApply = true;

    safe(function(){
      if (window.__v108DecimalDisplayObserver && typeof window.__v108DecimalDisplayObserver.disconnect === 'function') {
        window.__v108DecimalDisplayObserver.disconnect();
      }
      if (!window.__v1010DecimalDisplayObserver && window.MutationObserver) {
        window.__v1010DecimalDisplayObserver = new MutationObserver(function(records){
          if (records.some(record => record.addedNodes && record.addedNodes.length)) schedule(activeRoot());
        });
        window.__v1010DecimalDisplayObserver.observe(document.body, { childList:true, subtree:true, characterData:false });
        metrics.decimalObserverScoped = true;
      }
    });
    return true;
  }

  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){ window.eval(name + ' = window["' + name + '"]'); });
  }

  function stats(){
    return safe(function(){
      if (window.farmCentralSyncV103 && typeof window.farmCentralSyncV103.guardStatus === 'function') {
        const status = window.farmCentralSyncV103.guardStatus();
        return Object.assign({}, status.stats || {});
      }
      return {};
    }, {});
  }

  function installNavigateAudit(){
    const original = window.navigate;
    if (typeof original !== 'function' || original.__v1010SaveGuardAudit) return false;
    const wrapped = function(page, el){
      const before = stats();
      const started = performance.now();
      const result = original.apply(this, arguments);
      window.setTimeout(function(){
        const after = stats();
        const audit = {
          page,
          ms: Math.round(performance.now() - started),
          localWritesDelta: (after.localWrites || 0) - (before.localWrites || 0),
          cloudWritesDelta: (after.cloudWrites || 0) - (before.cloudWrites || 0),
          saveCallsDelta: (after.saveCalls || 0) - (before.saveCalls || 0),
          lastDecision: after.lastDecision || null
        };
        metrics.navigationAudits.push(audit);
        if (metrics.navigationAudits.length > 30) metrics.navigationAudits.shift();
      }, 1600);
      return result;
    };
    wrapped.__v1010SaveGuardAudit = true;
    wrapped.__v1010Original = original;
    assignGlobal('navigate', wrapped);
    return true;
  }

  function boot(){
    installAsyncDecimalDisplay();
    installNavigateAudit();
    window.farmPerformanceSaveGuardV1010 = {
      version: VERSION,
      installAsyncDecimalDisplay,
      installNavigateAudit,
      flushDecimal: function(){
        const api = window.farmDecimalDisplayV108;
        return api && typeof api.flushV1010 === 'function' ? api.flushV1010() : false;
      },
      metrics: function(){ return JSON.parse(JSON.stringify(metrics)); },
      stats
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  [700, 1800, 3600].forEach(function(delay){ window.setTimeout(boot, delay); });
})();
