/* V1.0.3 Firebase Staging Guard.
   Audits staging readiness without enabling browser cloud writes. */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const CONFIG_NAMES = ['FARM_FIREBASE_STAGING_CONFIG', 'FIREBASE_STAGING_CONFIG'];
  const COLLECTIONS = Object.freeze([
    { key:'projectItems', collection:'projects' },
    { key:'cropItems', collection:'crops' },
    { key:'actItems', collection:'activities' },
    { key:'invItems', collection:'inventory' },
    { key:'salesData', collection:'sales' },
    { key:'calEventsArr', collection:'calendarEvents' },
    { key:'plantingPlans', collection:'plantingPlans' },
    { key:'farmInputPlans', collection:'farmInputPlans' }
  ]);

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = (fn, fallback) => { try { return fn(); } catch(err) { console.warn('V1.0.3 Firebase staging guard', err); return fallback; } };

  function readData(){
    return safe(() => typeof window._packData === 'function' ? window._packData() : {}, {});
  }

  function readConfig(){
    for(const name of CONFIG_NAMES){
      const value = window[name];
      if(value && typeof value === 'object') return { source:name, value };
    }
    return { source:null, value:null };
  }

  function mapCounts(data){
    let total = 0;
    const rows = COLLECTIONS.map((entry) => {
      const count = Array.isArray(data[entry.key]) ? data[entry.key].length : 0;
      total += count;
      return { ...entry, count };
    });
    return { total, rows };
  }

  function validateConfig(config){
    const issues = [];
    if(!config) return { status:'not-configured', issues:['missing staging config'] };
    if(config.environment !== 'staging') issues.push('environment must be staging');
    if(!config.projectId) issues.push('projectId is required');
    if(config.projectId === 'farm-management-local' || config.projectId === 'farm-management-local-emulator') issues.push('projectId must not be local emulator');
    if(config.allowProductionWrite === true || config.productionWriteEnabled === true) issues.push('production writes are not allowed');
    if(!config.apiKey && !config.useEmulatorOnly) issues.push('apiKey missing for real staging');
    return { status:issues.length ? 'blocked' : 'ready', issues };
  }

  function audit(){
    const configResult = readConfig();
    const validation = validateConfig(configResult.value);
    const counts = mapCounts(readData());
    return {
      version:VERSION,
      status:validation.status,
      configSource:configResult.source,
      projectId:configResult.value?.projectId || null,
      issues:validation.issues,
      mappedDocs:counts.total,
      rows:counts.rows,
      dryRunOnly:true,
      localFallbackRequired:true,
      stagingWriteEnabled:false,
      productionWriteEnabled:false
    };
  }

  function render(){
    const host = document.querySelector('#data-health-gate-v103 .data-health-gate-v103-contract');
    if(!host) return;
    let node = document.querySelector('#firebase-staging-guard-v103');
    if(!node){
      node = document.createElement('div');
      node.id = 'firebase-staging-guard-v103';
      host.parentNode.insertBefore(node, host.nextSibling);
    }
    const state = audit();
    const cls = state.status === 'ready' ? 'ready' : (state.status === 'blocked' ? 'danger' : 'warn');
    const label = state.status === 'ready' ? 'staging config ready' : (state.status === 'blocked' ? 'staging config blocked' : 'staging config not set');
    node.className = 'data-health-gate-v103-contract ' + cls;
    node.innerHTML = '<b>Firebase Staging Guard</b><span>' +
      esc(label) + ' · dry-run only · mapped ' + esc(state.mappedDocs) +
      ' docs · staging write: off · production write: off</span>';
  }

  function boot(){
    render();
    if(!document.__v103FirebaseStagingGuardRenderEvent){
      document.__v103FirebaseStagingGuardRenderEvent = true;
      document.addEventListener('farm:data-health-rendered-v103', render);
    }
    const oldRun = window.runDataHealthAuditV0906;
    if(typeof oldRun === 'function' && !oldRun.__v103FirebaseStagingGuard){
      const wrapped = function(){
        const result = oldRun.apply(this, arguments);
        render();
        return result;
      };
      wrapped.__v103FirebaseStagingGuard = true;
      window.runDataHealthAuditV0906 = wrapped;
    }
  }

  window.farmFirebaseStagingGuardV103 = Object.freeze({ version:VERSION, audit, render });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
