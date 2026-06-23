/* V1.0.3 Settings Notification Behavior
   Extracted from farm_management_V0_6_84_ui_js_split.html for V1.0.3 Settings split.
   Original script line: 20931. Keep wrapper order and global function names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const DEFAULTS = {
    notifyPlantingEnabled: true,
    notifyMaterialEnabled: true,
    dashboardTaskLimit: 8,
    defaultPostponeDays: 1,
    requireSkipReason: false
  };
  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function settings(){
    safe(function(){ if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {}; });
    farmSettings.notifyPlantingEnabled = farmSettings.notifyPlantingEnabled !== false;
    farmSettings.notifyMaterialEnabled = farmSettings.notifyMaterialEnabled !== false;
    farmSettings.dashboardTaskLimit = clampInt(farmSettings.dashboardTaskLimit, DEFAULTS.dashboardTaskLimit, 3, 20);
    farmSettings.defaultPostponeDays = clampInt(farmSettings.defaultPostponeDays, DEFAULTS.defaultPostponeDays, 1, 30);
    farmSettings.requireSkipReason = farmSettings.requireSkipReason === true;
    return farmSettings;
  }
  function clampInt(value, fallback, min, max){
    const n = parseInt(value, 10);
    if(!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
  function boolInput(id){ const el = document.getElementById(id); return !!(el && el.checked); }
  function numInput(id, fallback, min, max){ const el = document.getElementById(id); return clampInt(el && el.value, fallback, min, max); }
  function todayIso(){ return safe(function(){ return (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10); }, new Date().toISOString().slice(0,10)); }
  function addDays(iso, n){
    const d = new Date(String(iso || todayIso()) + 'T00:00:00');
    if(isNaN(d.getTime())) return todayIso();
    d.setDate(d.getDate() + Number(n || 0));
    return d.toISOString().slice(0,10);
  }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function ensureBehaviorControls(){
    safe(function(){
      if(window.farmSettingsNotificationGroupsV0669 && typeof window.farmSettingsNotificationGroupsV0669.organize === 'function'){
        window.farmSettingsNotificationGroupsV0669.organize();
      }
    });
    const slot = document.getElementById('settings-plan-fields-v0669');
    if(!slot || document.getElementById('settings-notification-behavior-v0670')) return;
    slot.insertAdjacentHTML('beforeend',
      '<div id="settings-notification-behavior-v0670">' +
        '<div class="behavior-title">พฤติกรรมแจ้งเตือนและภารกิจ</div>' +
        '<div class="behavior-sub">ควบคุมว่าจะแสดงงานประเภทไหนบน Dashboard/แจ้งเตือน และกำหนดค่าเริ่มต้นของปุ่ม action</div>' +
        '<div class="behavior-grid">' +
          '<div class="behavior-field"><label class="behavior-toggle"><input type="checkbox" id="st-notify-planting-enabled"><span>แสดงแจ้งเตือนและภารกิจจากแผนปลูก</span></label></div>' +
          '<div class="behavior-field"><label class="behavior-toggle"><input type="checkbox" id="st-notify-material-enabled"><span>แสดงแจ้งเตือนและภารกิจจากแผนผลิตวัสดุ</span></label></div>' +
          '<div class="behavior-field"><label for="st-dashboard-task-limit">จำนวนภารกิจสูงสุดบน Dashboard</label><div class="behavior-input-row"><input type="number" class="form-control" id="st-dashboard-task-limit" min="3" max="20" step="1"><span class="behavior-unit">งาน</span></div></div>' +
          '<div class="behavior-field"><label for="st-default-postpone-days">ค่าเลื่อนเริ่มต้น</label><div class="behavior-input-row"><input type="number" class="form-control" id="st-default-postpone-days" min="1" max="30" step="1"><span class="behavior-unit">วัน</span></div></div>' +
          '<div class="behavior-field" style="grid-column:1/-1;"><label class="behavior-toggle"><input type="checkbox" id="st-require-skip-reason"><span>บังคับกรอกเหตุผลเมื่อกด “ไม่ทำ”</span></label></div>' +
        '</div>' +
      '</div>');
    fillBehaviorControls();
  }
  function fillBehaviorControls(){
    const s = settings();
    const planting = document.getElementById('st-notify-planting-enabled');
    const material = document.getElementById('st-notify-material-enabled');
    const limit = document.getElementById('st-dashboard-task-limit');
    const postpone = document.getElementById('st-default-postpone-days');
    const reason = document.getElementById('st-require-skip-reason');
    if(planting) planting.checked = s.notifyPlantingEnabled !== false;
    if(material) material.checked = s.notifyMaterialEnabled !== false;
    if(limit) limit.value = s.dashboardTaskLimit;
    if(postpone) postpone.value = s.defaultPostponeDays;
    if(reason) reason.checked = s.requireSkipReason === true;
  }
  function readBehaviorControls(){
    const s = settings();
    s.notifyPlantingEnabled = boolInput('st-notify-planting-enabled');
    s.notifyMaterialEnabled = boolInput('st-notify-material-enabled');
    s.dashboardTaskLimit = numInput('st-dashboard-task-limit', DEFAULTS.dashboardTaskLimit, 3, 20);
    s.defaultPostponeDays = numInput('st-default-postpone-days', DEFAULTS.defaultPostponeDays, 1, 30);
    s.requireSkipReason = boolInput('st-require-skip-reason');
    return s;
  }
  function removeDisabledTaskSurfaces(){
    const s = settings();
    if(!s.notifyPlantingEnabled){
      document.querySelectorAll('.planned-task-notify-section').forEach(n => n.remove());
      document.querySelectorAll('#dash-todo-list .planned-task-row:not(.material-action-row):not(.material-action-only-row)').forEach(n => n.remove());
    }
    if(!s.notifyMaterialEnabled){
      document.querySelectorAll('.material-task-notify-section').forEach(n => n.remove());
      document.querySelectorAll('#dash-todo-list .material-action-row,#dash-todo-list .material-action-only-row').forEach(n => n.remove());
    }
  }
  function enforceDashboardLimit(){
    const s = settings();
    const list = document.getElementById('dash-todo-list');
    if(!list) return;
    const rows = Array.from(list.querySelectorAll('.mock-task-row'));
    rows.forEach((row, idx) => { row.style.display = idx < s.dashboardTaskLimit ? '' : 'none'; });
    const countEl = document.getElementById('dash-todo-count');
    if(countEl) countEl.textContent = Math.min(rows.length, s.dashboardTaskLimit) + ' งาน';
  }
  function applyNotificationBehavior(){
    removeDisabledTaskSurfaces();
    enforceDashboardLimit();
    safe(function(){
      if(window.farmUnifiedActionButtonsV0667 && typeof window.farmUnifiedActionButtonsV0667.refreshSurfaces === 'function'){
        window.farmUnifiedActionButtonsV0667.refreshSurfaces();
      }
    });
  }
  function installDueFilters(){
    const api = window.farmPlannedTaskConfirmV0625;
    if(api && typeof api.duePlannedTasks === 'function' && !api.duePlannedTasks.__v0670Behavior){
      const original = api.duePlannedTasks;
      const wrapped = function(limitFuture){
        if(limitFuture === true && settings().notifyPlantingEnabled === false) return [];
        return original.apply(this, arguments) || [];
      };
      wrapped.__v0670Behavior = true;
      api.duePlannedTasks = wrapped;
    }
    const leadApi = window.farmNotificationLeadSettingsV0668;
    if(leadApi && typeof leadApi.materialDueTasks === 'function' && !leadApi.materialDueTasks.__v0670Behavior){
      const originalMaterialDue = leadApi.materialDueTasks;
      const wrappedMaterialDue = function(){
        if(settings().notifyMaterialEnabled === false) return [];
        return originalMaterialDue.apply(this, arguments) || [];
      };
      wrappedMaterialDue.__v0670Behavior = true;
      leadApi.materialDueTasks = wrappedMaterialDue;
    }
  }
  function installPostponeDefaults(){
    const oldPlantingPostpone = window.postponePlannedTask;
    if(typeof oldPlantingPostpone === 'function' && !oldPlantingPostpone.__v0670Behavior){
      const wrappedPlantingPostpone = function(eventId){
        const result = oldPlantingPostpone.apply(this, arguments);
        setTimeout(function(){
          const oldInput = document.getElementById('fp-postpone-old-date');
          const newInput = document.getElementById('fp-postpone-new-date');
          if(oldInput && newInput) newInput.value = addDays(oldInput.value || todayIso(), settings().defaultPostponeDays);
        }, 30);
        return result;
      };
      wrappedPlantingPostpone.__v0670Behavior = true;
      window.postponePlannedTask = wrappedPlantingPostpone;
      safe(function(){ postponePlannedTask = wrappedPlantingPostpone; });
    }
    const oldMaterialPostpone = window.postponeMaterialAction;
    if(typeof oldMaterialPostpone === 'function' && !oldMaterialPostpone.__v0670Behavior){
      const wrappedMaterialPostpone = function(){
        const oldPrompt = window.prompt;
        window.prompt = function(message, defaultValue){
          let nextDefault = defaultValue;
          if(/เลื่อน|postpone/i.test(String(message || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(defaultValue || ''))){
            nextDefault = addDays(defaultValue, settings().defaultPostponeDays - 1);
          }
          return oldPrompt.call(window, message, nextDefault);
        };
        try{ return oldMaterialPostpone.apply(this, arguments); }
        finally{ window.prompt = oldPrompt; }
      };
      wrappedMaterialPostpone.__v0670Behavior = true;
      window.postponeMaterialAction = wrappedMaterialPostpone;
      safe(function(){ postponeMaterialAction = wrappedMaterialPostpone; });
    }
  }
  function installSkipReasonGuard(){
    ['skipPlannedTask','skipMaterialAction'].forEach(function(name){
      const oldFn = window[name];
      if(typeof oldFn !== 'function' || oldFn.__v0670Behavior) return;
      const wrapped = function(){
        if(!settings().requireSkipReason) return oldFn.apply(this, arguments);
        const oldPrompt = window.prompt;
        window.prompt = function(message, defaultValue){
          const answer = oldPrompt.call(window, message, defaultValue);
          if(answer !== null && !String(answer || '').trim()){
            safe(function(){ showToast('กรุณากรอกเหตุผลก่อนบันทึกว่าไม่ทำ'); });
            return null;
          }
          return answer;
        };
        try{ return oldFn.apply(this, arguments); }
        finally{ window.prompt = oldPrompt; }
      };
      wrapped.__v0670Behavior = true;
      window[name] = wrapped;
      safe(function(){ eval(name + ' = window[name]'); });
    });
  }
  function installRenderWrappers(){
    const oldRenderSettings = window.renderSettings;
    if(typeof oldRenderSettings === 'function' && !oldRenderSettings.__v0670Behavior){
      const wrappedRenderSettings = function(){
        const result = oldRenderSettings.apply(this, arguments);
        ensureBehaviorControls();
        fillBehaviorControls();
        stamp();
        setTimeout(stamp, 50);
        return result;
      };
      wrappedRenderSettings.__v0670Behavior = true;
      window.renderSettings = wrappedRenderSettings;
      safe(function(){ renderSettings = wrappedRenderSettings; });
    }
    const oldSaveDefaults = window.saveSettingsDefaults;
    if(typeof oldSaveDefaults === 'function' && !oldSaveDefaults.__v0670Behavior){
      const wrappedSaveDefaults = function(){
        readBehaviorControls();
        const result = oldSaveDefaults.apply(this, arguments);
        readBehaviorControls();
        safe(function(){ saveData(); });
        refreshAfterBehaviorChange();
        safe(function(){ showToast('บันทึกค่าพฤติกรรมแจ้งเตือนแล้ว'); });
        return result;
      };
      wrappedSaveDefaults.__v0670Behavior = true;
      window.saveSettingsDefaults = wrappedSaveDefaults;
      safe(function(){ saveSettingsDefaults = wrappedSaveDefaults; });
    }
    const oldDashboard = window.renderDashboard;
    if(typeof oldDashboard === 'function' && !oldDashboard.__v0670Behavior){
      const wrappedDashboard = function(){
        const result = oldDashboard.apply(this, arguments);
        setTimeout(applyNotificationBehavior, 0);
        return result;
      };
      wrappedDashboard.__v0670Behavior = true;
      window.renderDashboard = wrappedDashboard;
      safe(function(){ renderDashboard = wrappedDashboard; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0670Behavior){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        setTimeout(applyNotificationBehavior, 0);
        return result;
      };
      wrappedNotify.__v0670Behavior = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(function(){ renderDashboardNotifications = wrappedNotify; });
    }
    const oldNavigate = window.navigate;
    if(typeof oldNavigate === 'function' && !oldNavigate.__v0670Behavior){
      const wrappedNavigate = function(){
        const result = oldNavigate.apply(this, arguments);
        setTimeout(stamp, 80);
        return result;
      };
      wrappedNavigate.__v0670Behavior = true;
      window.navigate = wrappedNavigate;
      safe(function(){ navigate = wrappedNavigate; });
    }
  }
  function refreshAfterBehaviorChange(){
    installDueFilters();
    safe(function(){ renderDashboardNotifications(); });
    safe(function(){ renderDashboard(); });
    setTimeout(applyNotificationBehavior, 30);
  }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span').forEach(function(el){
        if(!el) return;
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V0\.6\.\d+/.test(node.nodeValue || '')){
            node.nodeValue = (node.nodeValue || '').replace(/V0\.6\.\d+/g, VERSION);
          }
        });
        if(el.children.length === 0 && /V0\.6\.\d+/.test(el.textContent || '')){
          el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        }
      });
    });
  }
  function boot(){
    settings();
    installDueFilters();
    installPostponeDefaults();
    installSkipReasonGuard();
    installRenderWrappers();
    ensureBehaviorControls();
    fillBehaviorControls();
    refreshAfterBehaviorChange();
    stamp();
    setInterval(stamp, 1000);
  }
  window.farmNotificationBehaviorSettingsV0670 = {
    settings,
    ensureBehaviorControls,
    fillBehaviorControls,
    readBehaviorControls,
    applyNotificationBehavior,
    refreshAfterBehaviorChange,
    stamp
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      boot();
      console.log('Notification behavior settings ready', VERSION);
    }, 7600);
  });
})();
