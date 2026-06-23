/* V1.0.3 Firestore Central Sync Status.
   Online central sync is enabled for the shared farm before the login phase. */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const DEFAULT_FARM_ID = 'tong_lampang_luang';
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
  const safe = (fn, fallback) => { try { return fn(); } catch(err) { console.warn('V1.0.3 central sync guard', err); return fallback; } };

  function readData(){
    return safe(() => typeof window._packData === 'function' ? window._packData() : {}, {});
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

  function sdkStatus(){
    return {
      firebaseLoaded: !!window.firebase,
      authLoaded: !!(window.firebase && firebase.auth),
      firestoreLoaded: !!(window.firebase && firebase.firestore)
    };
  }

  function validateConfig(sdk){
    const issues = [];
    if(!sdk.firebaseLoaded) issues.push('firebase sdk missing');
    if(!sdk.firestoreLoaded) issues.push('firestore sdk missing');
    if(!window.farmCentralSyncV103) issues.push('central sync runtime missing');
    if(window.farmCentralSyncV103 && !window.farmCentralSyncV103.isReady()) issues.push('central sync not signed in yet');
    return issues;
  }

  function audit(){
    const sdk = sdkStatus();
    const counts = mapCounts(readData());
    const issues = validateConfig(sdk);
    return {
      version:VERSION,
      status:issues.length ? 'needs-attention' : 'online-central-sync',
      projectId:'farmgptv1',
      farmId:window.farmCentralSyncV103?.farmId || DEFAULT_FARM_ID,
      uid:window.farmCentralSyncV103?.uid ? window.farmCentralSyncV103.uid() : null,
      sdk,
      issues,
      mappedDocs:counts.total,
      rows:counts.rows,
      authRequired:false,
      memberBootstrapRequired:false,
      writerMoved:true,
      localFirst:true,
      centralWriteEnabled:true,
      productionWriteEnabled:false
    };
  }

  function render(){
    const host = document.querySelector('#data-health-gate-v103 .data-health-gate-v103-contract');
    if(!host) return;
    let node = document.querySelector('#firestore-central-sync-guard-v103');
    if(!node){
      node = document.createElement('div');
      node.id = 'firestore-central-sync-guard-v103';
      const staging = document.querySelector('#firebase-staging-guard-v103');
      (staging || host).parentNode.insertBefore(node, staging ? staging.nextSibling : host.nextSibling);
    }
    const state = audit();
    const cls = state.status === 'online-central-sync' ? 'ready' : 'warn';
    node.className = 'data-health-gate-v103-contract ' + cls;
    node.innerHTML = '<b>Firestore Central Sync</b><span>' +
      esc(state.status) + ' | farm ' + esc(state.farmId) +
      ' | mapped ' + esc(state.mappedDocs) +
      ' docs | auth later' +
      ' | central write: on</span>';
  }

  function boot(){
    render();
    if(!document.__v103FirestoreCentralSyncGuardRenderEvent){
      document.__v103FirestoreCentralSyncGuardRenderEvent = true;
      document.addEventListener('farm:data-health-rendered-v103', render);
    }
    const oldRun = window.runDataHealthAuditV0906;
    if(typeof oldRun === 'function' && !oldRun.__v103FirestoreCentralSyncGuard){
      const wrapped = function(){
        const result = oldRun.apply(this, arguments);
        render();
        return result;
      };
      wrapped.__v103FirestoreCentralSyncGuard = true;
      window.runDataHealthAuditV0906 = wrapped;
    }
  }

  window.farmFirestoreCentralSyncGuardV103 = Object.freeze({ version:VERSION, audit, render });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
