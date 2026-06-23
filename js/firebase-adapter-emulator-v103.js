/* V1.0.3 Firebase Adapter Emulator.
   Emulator-only adapter planning and explicit Settings opt-in. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const OPT_IN_KEY = 'farmFirebaseEmulatorAdapterOptIn_v103';
  const COLLECTIONS = Object.freeze([
    { key:'projectItems', collection:'projects', label:'โครงการ' },
    { key:'cropItems', collection:'crops', label:'พืช' },
    { key:'actItems', collection:'activities', label:'กิจกรรม' },
    { key:'invItems', collection:'inventory', label:'คลัง' },
    { key:'salesData', collection:'sales', label:'การขาย' },
    { key:'calEventsArr', collection:'calendarEvents', label:'ปฏิทิน' },
    { key:'plantingPlans', collection:'plantingPlans', label:'ปลูกพืช' },
    { key:'farmInputPlans', collection:'farmInputPlans', label:'เบิกวัสดุ' }
  ]);

  const $ = (sel) => document.querySelector(sel);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = (fn, fallback) => { try { return fn(); } catch(err) { console.warn('V1.0.3 Firebase adapter emulator', err); return fallback; } };

  function isOptedIn(){
    return safe(() => localStorage.getItem(OPT_IN_KEY) === '1', false);
  }

  function setOptIn(value){
    safe(() => localStorage.setItem(OPT_IN_KEY, value ? '1' : '0'));
    render();
    return audit();
  }

  function readData(){
    return safe(() => typeof window._packData === 'function' ? window._packData() : {}, {});
  }

  function docId(item, index){
    const raw = item && (item.id ?? item._id ?? item.key ?? item.code ?? item.name);
    const value = raw == null || raw === '' ? `row_${index + 1}` : String(raw);
    return value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96) || `row_${index + 1}`;
  }

  function plan(data){
    let total = 0;
    const rows = COLLECTIONS.map((entry) => {
      const list = Array.isArray(data[entry.key]) ? data[entry.key] : [];
      total += list.length;
      return {
        ...entry,
        count:list.length,
        sampleDocIds:list.slice(0, 3).map(docId)
      };
    });
    return {
      version:VERSION,
      farmPath:'farms/{farmId}',
      localKey:'farmData_v01',
      localFirst:true,
      emulatorOnly:true,
      productionWriteEnabled:false,
      optIn:isOptedIn(),
      totalMappedDocs:total,
      rows
    };
  }

  function audit(){
    const adapterPlan = plan(readData());
    return {
      version:VERSION,
      mode:adapterPlan.optIn ? 'emulator-adapter-opt-in' : 'emulator-adapter-disabled',
      cloudWriteEnabled:false,
      emulatorWriteEnabled:adapterPlan.optIn,
      requiresEmulator:true,
      localFallbackRequired:true,
      adapterPlan
    };
  }

  function render(){
    const host = $('#data-health-gate-v103 .data-health-gate-v103-contract');
    if(!host) return;
    let node = $('#firebase-adapter-emulator-v103');
    if(!node){
      node = document.createElement('div');
      node.id = 'firebase-adapter-emulator-v103';
      host.parentNode.insertBefore(node, host.nextSibling);
    }
    const status = audit();
    const cls = status.emulatorWriteEnabled ? 'ready' : 'warn';
    node.className = 'data-health-gate-v103-contract ' + cls;
    node.innerHTML = '<b>Firebase Adapter Emulator</b><span>' +
      esc(status.mode) + ' · mapped ' + esc(status.adapterPlan.totalMappedDocs) +
      ' docs · production write: off · <button class="btn btn-outline btn-sm" type="button" onclick="toggleFirebaseEmulatorAdapterV0906()">' +
      esc(status.emulatorWriteEnabled ? 'ปิด opt-in' : 'เปิด opt-in') +
      '</button></span>';
  }

  function toggle(){
    const next = !isOptedIn();
    setOptIn(next);
    if(typeof showToast === 'function'){
      showToast(next ? 'เปิด Firebase Emulator adapter แล้ว' : 'ปิด Firebase Emulator adapter แล้ว');
    }
    return audit();
  }

  function boot(){
    render();
    if(!document.__v103FirebaseAdapterRenderEvent){
      document.__v103FirebaseAdapterRenderEvent = true;
      document.addEventListener('farm:data-health-rendered-v103', render);
    }
    const oldRun = window.runDataHealthAuditV0906;
    if(typeof oldRun === 'function' && !oldRun.__v103FirebaseAdapter){
      const wrapped = function(){
        const result = oldRun.apply(this, arguments);
        render();
        return result;
      };
      wrapped.__v103FirebaseAdapter = true;
      window.runDataHealthAuditV0906 = wrapped;
    }
  }

  window.farmFirebaseAdapterEmulatorV0906 = Object.freeze({ version:VERSION, audit, plan, setOptIn, isOptedIn });
  window.toggleFirebaseEmulatorAdapterV0906 = toggle;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
