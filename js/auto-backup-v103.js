/* V1.0.3 Auto Backup Safety Center UI Layer
   Extracted from farm_management_V0_6_83_css_split.html for V1.0.3 UI JS split.
   Original script line: 23098. Keep global API names stable for inline handlers. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SNAP_KEY = 'farmAutoBackups_v0682';
  const STATE_KEY = 'farmAutoBackupState_v0682';
  const MAX_SNAPSHOTS = 6;
  const MIN_INTERVAL_MS = 15 * 60 * 1000;
  let saveTimer = 0;
  let booted = false;

  function safe(fn, fallback){ try{ return fn(); }catch(e){ console.warn('V1.0.3 auto backup', e); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }
  function toast(msg){
    if(typeof window.showToast === 'function') return safe(function(){ showToast(msg); });
    console.log(msg);
  }
  function packData(){
    if(typeof window._packData === 'function') return window._packData();
    return {
      farmSettings: window.farmSettings,
      cropItems: window.cropItems,
      actItems: window.actItems,
      invItems: window.invItems,
      custItems: window.custItems,
      salesData: window.salesData,
      goalItems: window.goalItems,
      calEventsArr: window.calEvents,
      reqItems: window.reqItems,
      projectItems: window.projectItems,
      plantingPlans: window.plantingPlans,
      farmInputPlans: window.farmInputPlans,
      cropPlanTemplates: window.cropPlanTemplates,
      farmPlanHiddenCropNames: window.farmPlanHiddenCropNames,
      savedAt: new Date().toISOString()
    };
  }
  function counts(data){
    data = data || {};
    const arr = function(name){ return Array.isArray(data[name]) ? data[name].length : 0; };
    return {
      projects: arr('projectItems'),
      crops: arr('cropItems'),
      activities: arr('actItems'),
      inventory: arr('invItems'),
      sales: arr('salesData'),
      calendar: Array.isArray(data.calEventsArr) ? data.calEventsArr.length : arr('calEvents'),
      plantingPlans: arr('plantingPlans'),
      materialPlans: arr('farmInputPlans')
    };
  }
  function countText(c){
    return 'โครงการ ' + (c.projects||0) +
      ' · พืชผล ' + (c.crops||0) +
      ' · แผนปลูก ' + (c.plantingPlans||0) +
      ' · วัสดุปลูก ' + (c.materialPlans||0);
  }
  function hashText(text){
    let h = 2166136261;
    for(let i=0; i<text.length; i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function readJson(key, fallback){
    return safe(function(){
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }, fallback);
  }
  function readSnapshots(){
    const list = readJson(SNAP_KEY, []);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }
  function writeSnapshots(list){
    let next = list.slice(0, MAX_SNAPSHOTS);
    while(JSON.stringify(next).length > 3600000 && next.length > 2) next.pop();
    localStorage.setItem(SNAP_KEY, JSON.stringify(next));
    return next;
  }
  function state(){
    const st = readJson(STATE_KEY, {});
    return st && typeof st === 'object' ? st : {};
  }
  function writeState(st){
    localStorage.setItem(STATE_KEY, JSON.stringify(st || {}));
  }
  function createSnapshot(reason, opts){
    opts = opts || {};
    const data = packData();
    const raw = JSON.stringify(data);
    if(raw.length < 100) return null;
    const hash = hashText(raw);
    const st = state();
    const now = Date.now();
    if(!opts.force && st.lastHash === hash) return null;
    if(!opts.force && st.lastAt && now - Number(st.lastAt) < MIN_INTERVAL_MS) return null;
    const snap = {
      id: 'ab-' + now + '-' + Math.random().toString(16).slice(2, 8),
      createdAt: new Date(now).toISOString(),
      reason: reason || 'auto',
      appVersion: VERSION,
      counts: counts(data),
      bytes: raw.length,
      hash,
      data
    };
    const list = readSnapshots();
    list.unshift(snap);
    try{
      writeSnapshots(list);
    }catch(err){
      const smaller = list.slice(0, 3);
      writeSnapshots(smaller);
    }
    writeState(Object.assign({}, st, {lastHash: hash, lastAt: now}));
    renderAutoBackupPanel();
    return snap;
  }
  function scheduleAutoSnapshot(reason){
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function(){
      saveTimer = 0;
      createSnapshot(reason || 'บันทึกอัตโนมัติ');
    }, 2500);
  }
  function dailySnapshot(){
    const today = new Date().toISOString().slice(0, 10);
    const st = state();
    if(st.lastDaily === today) return;
    const snap = createSnapshot('สำรองรายวัน', {force:true});
    if(snap) writeState(Object.assign({}, state(), {lastDaily: today}));
  }
  function formatDate(iso){
    return safe(function(){
      return new Date(iso).toLocaleString('th-TH', {year:'2-digit', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    }, iso || '-');
  }
  function formatKb(bytes){
    return Math.max(1, Math.round((Number(bytes)||0) / 1024)).toLocaleString('th-TH') + ' KB';
  }
  function renderAutoBackupPanel(){
    const settingsPage = q('#page-settings');
    if(!settingsPage) return;
    const danger = q('#page-settings .settings-danger-zone');
    if(!danger || !danger.parentNode) return;
    let card = q('#auto-backup-v0682');
    if(!card){
      card = document.createElement('section');
      card.id = 'auto-backup-v0682';
      card.className = 'card settings-section-card';
      danger.parentNode.insertBefore(card, danger);
    }
    const list = readSnapshots();
    const rows = list.map(function(snap){
      const meta = countText(snap.counts || {});
      return '<div class="backup-v0682-row" data-snapshot-id="' + esc(snap.id) + '">' +
        '<div><div class="backup-v0682-title">' + esc(formatDate(snap.createdAt)) + ' · ' + esc(snap.reason || 'auto') + '</div>' +
        '<div class="backup-v0682-meta">' + esc(meta) + ' · ' + esc(formatKb(snap.bytes)) + ' · ' + esc(snap.appVersion || VERSION) + '</div></div>' +
        '<div class="backup-v0682-actions">' +
          '<button class="btn btn-outline" type="button" onclick="downloadAutoBackupV0682(\'' + esc(snap.id) + '\')">ดาวน์โหลด</button>' +
          '<button class="btn btn-outline" type="button" onclick="restoreAutoBackupV0682(\'' + esc(snap.id) + '\')">กู้คืน</button>' +
          '<button class="btn" type="button" onclick="deleteAutoBackupV0682(\'' + esc(snap.id) + '\')">ลบ</button>' +
        '</div></div>';
    }).join('');
    card.innerHTML =
      '<div class="settings-section-head">' +
        '<div><div class="settings-section-title">สำรองอัตโนมัติ</div>' +
        '<div class="settings-section-sub">ระบบเก็บ snapshot ก่อนนำเข้า/ล้างข้อมูล และเก็บเป็นระยะเมื่อข้อมูลเปลี่ยน</div></div>' +
      '</div>' +
      '<div class="backup-v0682-toolbar">' +
        '<span class="settings-pill local">เก็บล่าสุด ' + list.length + ' / ' + MAX_SNAPSHOTS + ' ชุด</span>' +
        '<button class="btn btn-outline btn-sm" type="button" onclick="createAutoBackupNowV0682()">สำรองตอนนี้</button>' +
      '</div>' +
      (rows ? '<div class="backup-v0682-list">' + rows + '</div>' : '<div class="backup-v0682-empty">ยังไม่มี snapshot อัตโนมัติ กด “สำรองตอนนี้” เพื่อสร้างชุดแรก</div>');
  }
  function findSnapshot(id){
    return readSnapshots().find(function(snap){ return snap && snap.id === id; });
  }
  window.createAutoBackupNowV0682 = function(){
    const snap = createSnapshot('สำรองด้วยตัวเอง', {force:true});
    if(snap) toast('✅ สำรองอัตโนมัติแล้ว');
  };
  window.downloadAutoBackupV0682 = function(id){
    const snap = findSnapshot(id);
    if(!snap) return toast('ไม่พบ snapshot');
    const payload = Object.assign({}, snap.data || {}, {
      exportedAt: new Date().toISOString(),
      backupSource: 'auto-backup-v0682',
      autoBackupCreatedAt: snap.createdAt,
      autoBackupReason: snap.reason,
      autoBackupCounts: snap.counts
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'farm_auto_backup_' + String(snap.createdAt || '').slice(0,10) + '_' + id + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  window.restoreAutoBackupV0682 = function(id){
    const snap = findSnapshot(id);
    if(!snap || !snap.data) return toast('ไม่พบ snapshot');
    const msg = 'กู้คืน snapshot นี้?\n\n' + formatDate(snap.createdAt) + '\n' + countText(snap.counts || {}) + '\n\nระบบจะสำรองข้อมูลปัจจุบันไว้อีกชุดก่อนกู้คืน';
    if(!confirm(msg)) return;
    createSnapshot('ก่อนกู้คืน snapshot', {force:true});
    if(typeof window._applyData === 'function') window._applyData(snap.data);
    else Object.assign(window, snap.data);
    safe(function(){ if(typeof normalizeProjectFlowData === 'function') normalizeProjectFlowData(); });
    safe(function(){ if(typeof saveData === 'function') saveData(); });
    safe(function(){
      cropRendered = actRendered = invRendered = salesRendered = custRendered = goalsRendered = false;
    });
    safe(function(){ navigate('settings', document.querySelector('.nav-item[onclick*="settings"]')); });
    window.setTimeout(function(){ renderAutoBackupPanel(); toast('✅ กู้คืน snapshot แล้ว'); }, 300);
  };
  window.deleteAutoBackupV0682 = function(id){
    const snap = findSnapshot(id);
    if(!snap) return;
    if(!confirm('ลบ snapshot นี้?')) return;
    writeSnapshots(readSnapshots().filter(function(item){ return item && item.id !== id; }));
    renderAutoBackupPanel();
  };
  function wrapSaveData(){
    const oldSave = window.saveData;
    if(typeof oldSave !== 'function' || oldSave.__v0682AutoBackup) return;
    const wrapped = function(){
      const result = oldSave.apply(this, arguments);
      scheduleAutoSnapshot('หลังบันทึกข้อมูล');
      return result;
    };
    wrapped.__v0682AutoBackup = true;
    window.saveData = wrapped;
    safe(function(){ saveData = wrapped; });
  }
  function wrapRiskyActions(){
    const oldImport = window.importDataPrompt;
    if(typeof oldImport === 'function' && !oldImport.__v0682AutoBackup){
      const wrappedImport = function(){
        createSnapshot('ก่อนนำเข้า JSON', {force:true});
        return oldImport.apply(this, arguments);
      };
      wrappedImport.__v0682AutoBackup = true;
      window.importDataPrompt = wrappedImport;
      safe(function(){ importDataPrompt = wrappedImport; });
    }
    const oldClear = window.clearAllData;
    if(typeof oldClear === 'function' && !oldClear.__v0682AutoBackup){
      const wrappedClear = function(){
        createSnapshot('ก่อนล้างข้อมูล', {force:true});
        return oldClear.apply(this, arguments);
      };
      wrappedClear.__v0682AutoBackup = true;
      window.clearAllData = wrappedClear;
      safe(function(){ clearAllData = wrappedClear; });
    }
  }
  function wrapSettingsRender(){
    const oldRender = window.renderSettings;
    if(typeof oldRender !== 'function' || oldRender.__v0682AutoBackup) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      window.setTimeout(renderAutoBackupPanel, 80);
      return result;
    };
    wrapped.__v0682AutoBackup = true;
    window.renderSettings = wrapped;
    safe(function(){ renderSettings = wrapped; });
  }
  function boot(){
    wrapSaveData();
    wrapRiskyActions();
    wrapSettingsRender();
    renderAutoBackupPanel();
    if(!booted){
      booted = true;
      window.setTimeout(dailySnapshot, 3500);
      window.setTimeout(renderAutoBackupPanel, 12000);
    }
  }
  window.farmAutoBackupV0682 = {
    boot,
    createSnapshot,
    readSnapshots,
    renderAutoBackupPanel,
    version: VERSION
  };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 1200);
    window.setTimeout(boot, 11000);
  });
})();
