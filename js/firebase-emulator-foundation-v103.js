/* V1.0.3 Firebase Emulator Foundation.
   Read-only runtime guard for local Firebase preparation. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const EMULATORS = Object.freeze({
    auth:{ host:'127.0.0.1', port:9099 },
    firestore:{ host:'127.0.0.1', port:8080 },
    hosting:{ host:'127.0.0.1', port:5000 },
    ui:{ host:'127.0.0.1', port:4000 }
  });
  const FIRESTORE_COLLECTIONS = Object.freeze([
    'projects',
    'crops',
    'activities',
    'inventory',
    'sales',
    'calendarEvents',
    'plantingPlans',
    'farmInputPlans',
    'members'
  ]);

  function hasProductionConfig(){
    try {
      return !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
    } catch(e) {
      return false;
    }
  }

  function audit(){
    return {
      version:VERSION,
      mode:hasProductionConfig() ? 'production-config-present' : 'emulator-foundation-only',
      productionConfigPresent:hasProductionConfig(),
      authRequired:true,
      cloudWriteEnabled:false,
      localFallbackRequired:true,
      emulatorPorts:EMULATORS,
      firestoreCollections:FIRESTORE_COLLECTIONS
    };
  }

  function render(){
    const host = document.querySelector('#data-health-gate-v103 .data-health-gate-v103-contract');
    if(!host || document.getElementById('firebase-emulator-foundation-v103')) return;
    const status = audit();
    const node = document.createElement('div');
    node.id = 'firebase-emulator-foundation-v103';
    node.className = 'data-health-gate-v103-contract ready';
    node.innerHTML = '<b>Firebase Emulator foundation</b><span>' +
      status.mode + ' · Auth ' + EMULATORS.auth.port + ' · Firestore ' + EMULATORS.firestore.port +
      ' · Hosting ' + EMULATORS.hosting.port + ' · cloud write: off</span>';
    host.parentNode.insertBefore(node, host.nextSibling);
  }

  function boot(){
    render();
    const oldRun = window.runDataHealthAuditV0906;
    if(typeof oldRun === 'function' && !oldRun.__v103FirebaseFoundation){
      const wrapped = function(){
        const result = oldRun.apply(this, arguments);
        render();
        return result;
      };
      wrapped.__v103FirebaseFoundation = true;
      window.runDataHealthAuditV0906 = wrapped;
    }
  }

  window.farmFirebaseEmulatorFoundationV0906 = Object.freeze({ version:VERSION, audit });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
