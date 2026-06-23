/* V1.0.3 Restore QA Gate
   Keeps backup/export/restore complete before any core/data split. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SNAP_KEY = 'farmAutoBackups_v0682';
  let stampTimer = 0;

  function safe(fn, fallback){
    try{ return fn(); }catch(err){ console.warn('V1.0.3 restore QA gate', err); return fallback; }
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }
  function stampVersion(){
    safe(function(){
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){
        el.textContent = VERSION;
        el.setAttribute('data-app-version', VERSION);
      });
      document.querySelectorAll('#page-settings .settings-hero-badge').forEach(function(el){
        el.textContent = 'Local · ' + VERSION;
      });
    });
  }
  function readSnapshots(){
    return safe(function(){
      const raw = localStorage.getItem(SNAP_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    }, []);
  }
  function writeSnapshots(list){
    safe(function(){ localStorage.setItem(SNAP_KEY, JSON.stringify(list || [])); });
  }
  function upgradeLatestSnapshotVersion(){
    const list = readSnapshots();
    if(!list.length) return;
    if(list[0] && list[0].appVersion !== VERSION){
      list[0].appVersion = VERSION;
      writeSnapshots(list);
    }
  }
  function listEvents(){
    return safe(function(){
      if(typeof calEvents === 'undefined' || !Array.isArray(calEvents)) calEvents = [];
      return calEvents;
    }, []);
  }
  function iso(v){
    return String(v || '').slice(0, 10);
  }
  function dedupePlanCalendarEvents(){
    const events = listEvents();
    if(!events.length) return 0;
    const seen = new Set();
    const clean = [];
    let removed = 0;
    events.forEach(function(ev){
      if(!ev){ return; }
      const isPlan = ev.source === 'planting-plan' || ev.planId || ev.taskId;
      const key = isPlan
        ? ['plan', ev.planId || '', ev.taskId || '', iso(ev.start), ev.title || ''].join('|')
        : ['normal', ev.id || '', iso(ev.start), ev.title || ''].join('|');
      if(isPlan && seen.has(key)){ removed += 1; return; }
      seen.add(key);
      clean.push(ev);
    });
    if(removed){
      calEvents = clean;
      safe(function(){ if(typeof renderCalendar === 'function') renderCalendar(); });
    }
    return removed;
  }
  function completePackData(){
    if(typeof _packData === 'function') return _packData();
    return {
      farmSettings: typeof farmSettings !== 'undefined' ? farmSettings : {},
      cropItems: typeof cropItems !== 'undefined' ? cropItems : [],
      actItems: typeof actItems !== 'undefined' ? actItems : [],
      invItems: typeof invItems !== 'undefined' ? invItems : [],
      custItems: typeof custItems !== 'undefined' ? custItems : [],
      salesData: typeof salesData !== 'undefined' ? salesData : [],
      goalItems: typeof goalItems !== 'undefined' ? goalItems : {},
      calEventsArr: typeof calEvents !== 'undefined' ? calEvents : [],
      reqItems: typeof reqItems !== 'undefined' ? reqItems : [],
      projectItems: typeof projectItems !== 'undefined' ? projectItems : [],
      plantingPlans: typeof plantingPlans !== 'undefined' ? plantingPlans : [],
      farmInputPlans: typeof farmInputPlans !== 'undefined' ? farmInputPlans : [],
      cropPlanTemplates: typeof cropPlanTemplates !== 'undefined' ? cropPlanTemplates : {},
      farmPlanHiddenCropNames: typeof farmPlanHiddenCropNames !== 'undefined' ? farmPlanHiddenCropNames : {},
      savedAt: new Date().toISOString()
    };
  }
  function applyCompleteData(data){
    if(!data || typeof data !== 'object') return;
    if(typeof _applyData === 'function') _applyData(data);
    else Object.assign(window, data);
    safe(function(){ if(typeof normalizeProjectFlowData === 'function') normalizeProjectFlowData(); });
    dedupePlanCalendarEvents();
  }
  function resetRenderFlags(){
    safe(function(){ cropRendered = actRendered = invRendered = salesRendered = custRendered = goalsRendered = false; });
  }
  function renderCurrentViews(){
    safe(function(){ if(typeof renderDashboard === 'function') renderDashboard(); });
    safe(function(){ if(typeof renderProjects === 'function') renderProjects(); });
    safe(function(){ if(typeof renderFarmPlanning === 'function') renderFarmPlanning(); });
    safe(function(){ if(typeof renderCalendar === 'function') renderCalendar(); });
    safe(function(){ if(typeof renderSettings === 'function') renderSettings(); });
  }
  function downloadJson(payload, name){
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 0);
  }
  function wrapSaveData(){
    if(typeof saveData !== 'function' || saveData.__v103RestoreQa) return;
    const oldSave = saveData;
    const wrapped = function(){
      dedupePlanCalendarEvents();
      const result = oldSave.apply(this, arguments);
      upgradeLatestSnapshotVersion();
      stampVersion();
      return result;
    };
    wrapped.__v103RestoreQa = true;
    saveData = wrapped;
    window.saveData = wrapped;
  }
  function wrapApplyData(){
    if(typeof _applyData !== 'function' || _applyData.__v103RestoreQa) return;
    const oldApply = _applyData;
    const wrapped = function(data){
      const result = oldApply.apply(this, arguments);
      safe(function(){ if(typeof normalizeProjectFlowData === 'function') normalizeProjectFlowData(); });
      dedupePlanCalendarEvents();
      return result;
    };
    wrapped.__v103RestoreQa = true;
    _applyData = wrapped;
    window._applyData = wrapped;
  }
  function wrapExportImport(){
    window.exportData = function(){
      dedupePlanCalendarEvents();
      const payload = Object.assign({}, completePackData(), {
        exportedAt: new Date().toISOString(),
        version: VERSION,
        backupSource: 'backup-json-complete-v103'
      });
      downloadJson(payload, 'farm_backup_full_' + new Date().toISOString().slice(0,10) + '.json');
      safe(function(){ if(typeof showToast === 'function') showToast('Backup JSON ทั้งหมดสำเร็จ'); });
    };
    exportData = window.exportData;

    window.importDataPrompt = function(){
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = function(e){
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(ev){
          try{
            const data = JSON.parse(ev.target.result);
            if(!confirm('นำเข้า Backup JSON ทั้งหมด? ข้อมูลปัจจุบันจะถูกแทนที่')) return;
            safe(function(){ if(typeof createAutoBackupNowV0682 === 'function') createAutoBackupNowV0682(); });
            applyCompleteData(data);
            resetRenderFlags();
            if(typeof saveData === 'function') saveData();
            renderCurrentViews();
            safe(function(){ if(typeof navigate === 'function') navigate('dashboard', document.querySelector('.nav-item[onclick*="dashboard"]')); });
            safe(function(){ if(typeof showToast === 'function') showToast('นำเข้า Backup JSON สำเร็จ'); });
          }catch(err){
            console.warn('V1.0.3 import failed', err);
            safe(function(){ if(typeof showToast === 'function') showToast('ไฟล์ Backup JSON ไม่ถูกต้อง'); });
          }
        };
        reader.readAsText(file);
      };
      inp.click();
    };
    importDataPrompt = window.importDataPrompt;
  }
  function wrapAutoRestore(){
    if(typeof restoreAutoBackupV0682 === 'function' && !restoreAutoBackupV0682.__v103RestoreQa){
      const oldRestore = restoreAutoBackupV0682;
      const wrappedRestore = function(){
        const result = oldRestore.apply(this, arguments);
        [80, 350, 900].forEach(function(delay){
          setTimeout(function(){
            dedupePlanCalendarEvents();
            resetRenderFlags();
            if(typeof saveData === 'function') saveData();
            renderCurrentViews();
            upgradeLatestSnapshotVersion();
            stampVersion();
          }, delay);
        });
        return result;
      };
      wrappedRestore.__v103RestoreQa = true;
      restoreAutoBackupV0682 = wrappedRestore;
      window.restoreAutoBackupV0682 = wrappedRestore;
    }
    if(typeof createAutoBackupNowV0682 === 'function' && !createAutoBackupNowV0682.__v103RestoreQa){
      const oldCreate = createAutoBackupNowV0682;
      const wrappedCreate = function(){
        const result = oldCreate.apply(this, arguments);
        upgradeLatestSnapshotVersion();
        safe(function(){ if(window.farmAutoBackupV0682 && typeof window.farmAutoBackupV0682.renderAutoBackupPanel === 'function') window.farmAutoBackupV0682.renderAutoBackupPanel(); });
        return result;
      };
      wrappedCreate.__v103RestoreQa = true;
      createAutoBackupNowV0682 = wrappedCreate;
      window.createAutoBackupNowV0682 = wrappedCreate;
    }
  }
  function boot(){
    wrapApplyData();
    wrapSaveData();
    wrapExportImport();
    wrapAutoRestore();
    dedupePlanCalendarEvents();
    upgradeLatestSnapshotVersion();
    stampVersion();
    if(!stampTimer) stampTimer = setInterval(stampVersion, 10);
    window.farmRestoreQaGateV0707 = {
      version: VERSION,
      dedupePlanCalendarEvents,
      completePackData,
      applyCompleteData
    };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  setTimeout(boot, 1200);
  setTimeout(boot, 5000);
})();
