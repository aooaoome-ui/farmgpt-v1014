/* V1.0.3 Real Data Restore Gate
   Adds a Settings audit panel before any core/data split. This layer is read-only
   for farm data; it only stores audit history under farmRestoreAudit_v103. */

(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SNAP_KEY = 'farmAutoBackups_v0682';
  const AUDIT_KEY = 'farmRestoreAudit_v103';
  const MAX_AUDITS = 8;

  function safe(fn, fallback){
    try{ return fn(); }catch(err){ console.warn('V1.0.3 real data restore gate', err); return fallback; }
  }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }
  function toast(msg){
    if(typeof window.showToast === 'function') return safe(function(){ showToast(msg); });
    console.log(msg);
  }
  function readJson(key, fallback){
    return safe(function(){
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }, fallback);
  }
  function writeJson(key, value){
    safe(function(){ localStorage.setItem(key, JSON.stringify(value)); });
  }
  function asArray(value){
    return Array.isArray(value) ? value : [];
  }
  function packData(){
    if(typeof window._packData === 'function') return window._packData();
    return {
      farmSettings: window.farmSettings || {},
      cropItems: asArray(window.cropItems),
      actItems: asArray(window.actItems),
      invItems: asArray(window.invItems),
      custItems: asArray(window.custItems),
      salesData: asArray(window.salesData),
      goalItems: window.goalItems || {},
      calEventsArr: asArray(window.calEvents || window.calEventsArr),
      reqItems: asArray(window.reqItems),
      projectItems: asArray(window.projectItems),
      plantingPlans: asArray(window.plantingPlans),
      farmInputPlans: asArray(window.farmInputPlans),
      cropPlanTemplates: window.cropPlanTemplates || {},
      farmPlanHiddenCropNames: window.farmPlanHiddenCropNames || {},
      savedAt: new Date().toISOString()
    };
  }
  function countData(data){
    data = data || {};
    const arr = function(name){ return Array.isArray(data[name]) ? data[name].length : 0; };
    return {
      projects: arr('projectItems'),
      crops: arr('cropItems'),
      activities: arr('actItems'),
      inventory: arr('invItems'),
      sales: arr('salesData'),
      customers: arr('custItems'),
      calendar: Array.isArray(data.calEventsArr) ? data.calEventsArr.length : arr('calEvents'),
      plantingPlans: arr('plantingPlans'),
      materialPlans: arr('farmInputPlans')
    };
  }
  function totalCount(counts){
    return Object.keys(counts || {}).reduce(function(sum, key){ return sum + (Number(counts[key]) || 0); }, 0);
  }
  function readSnapshots(){
    const list = readJson(SNAP_KEY, []);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }
  function latestSnapshot(){
    return readSnapshots()[0] || null;
  }
  function formatDate(iso){
    if(!iso) return '-';
    return safe(function(){
      return new Date(iso).toLocaleString('th-TH', {year:'2-digit', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    }, iso);
  }
  function storageBytes(key){
    return safe(function(){
      const raw = localStorage.getItem(key) || '';
      return raw.length;
    }, 0);
  }
  function keyCoverage(data){
    const keys = [
      'farmSettings',
      'projectItems',
      'cropItems',
      'actItems',
      'invItems',
      'salesData',
      'custItems',
      'calEventsArr',
      'plantingPlans',
      'farmInputPlans',
      'cropPlanTemplates'
    ];
    return keys.map(function(key){
      const value = data ? data[key] : undefined;
      const ok = Array.isArray(value) ? true : value && typeof value === 'object';
      return {key, ok: !!ok, count: Array.isArray(value) ? value.length : (ok ? Object.keys(value).length : 0)};
    });
  }
  function buildAudit(){
    const data = packData();
    const currentCounts = countData(data);
    const snap = latestSnapshot();
    const snapData = snap && snap.data ? snap.data : null;
    const snapCounts = snap ? (snap.counts || countData(snapData || {})) : null;
    const dataTotal = totalCount(currentCounts);
    const snapTotal = snapCounts ? totalCount(snapCounts) : 0;
    const coverage = keyCoverage(data);
    const snapshotCoverage = snapData ? keyCoverage(snapData) : [];
    const audit = {
      version: VERSION,
      auditedAt: new Date().toISOString(),
      appVersion: VERSION,
      dataReady: dataTotal > 0,
      snapshotReady: !!(snap && snapData && snapTotal > 0),
      snapshotVersionOk: !snap || snap.appVersion === VERSION,
      currentCounts,
      currentTotal: dataTotal,
      currentCoverage: coverage,
      latestSnapshot: snap ? {
        id: snap.id || null,
        createdAt: snap.createdAt || null,
        reason: snap.reason || null,
        appVersion: snap.appVersion || null,
        counts: snapCounts || {},
        total: snapTotal,
        bytes: Number(snap.bytes) || storageBytes(SNAP_KEY),
        coverage: snapshotCoverage
      } : null,
      localStorage: {
        snapshotKey: SNAP_KEY,
        snapshotCount: readSnapshots().length,
        snapshotBytes: storageBytes(SNAP_KEY),
        auditKey: AUDIT_KEY
      },
      gate: 'core-data-split-blocked-until-real-data-restore-is-verified'
    };
    audit.status = audit.dataReady && audit.snapshotReady && audit.snapshotVersionOk ? 'ready' : 'needs-review';
    return audit;
  }
  function saveAudit(audit){
    const list = readJson(AUDIT_KEY, []);
    const next = Array.isArray(list) ? list.slice(0, MAX_AUDITS - 1) : [];
    next.unshift(audit);
    writeJson(AUDIT_KEY, next);
    return next;
  }
  function pill(label, value){
    return '<div class="restore-audit-v103-pill"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }
  function coverageText(items){
    if(!items || !items.length) return '-';
    const ok = items.filter(function(item){ return item.ok; }).length;
    return ok + ' / ' + items.length;
  }
  function renderPanel(audit){
    const settingsPage = q('#page-settings');
    if(!settingsPage) return;
    const danger = q('#page-settings .settings-danger-zone');
    if(!danger || !danger.parentNode) return;
    audit = audit || buildAudit();
    let card = q('#restore-audit-v103');
    if(!card){
      card = document.createElement('section');
      card.id = 'restore-audit-v103';
      card.className = 'card settings-section-card restore-audit-v103';
      danger.parentNode.insertBefore(card, danger);
    }
    const counts = audit.currentCounts || {};
    const snap = audit.latestSnapshot;
    const statusText = audit.status === 'ready' ? 'พร้อมตรวจรอบ core split' : 'ต้องตรวจซ้ำก่อนแยก core/data';
    const statusClass = audit.status === 'ready' ? 'ready' : 'warn';
    card.innerHTML =
      '<div class="settings-section-head restore-audit-v103-head">' +
        '<div><div class="settings-section-title">ตรวจความพร้อมกู้คืนข้อมูลจริง</div>' +
        '<div class="settings-section-sub">อ่านจำนวนข้อมูลจริงและ snapshot ล่าสุดใน browser นี้ ก่อนอนุญาตให้แยก core/data</div></div>' +
        '<span class="settings-pill local restore-audit-v103-status ' + statusClass + '">' + esc(statusText) + '</span>' +
      '</div>' +
      '<div class="restore-audit-v103-grid">' +
        pill('โครงการ', counts.projects || 0) +
        pill('พืชผล', counts.crops || 0) +
        pill('กิจกรรม', counts.activities || 0) +
        pill('คลัง', counts.inventory || 0) +
        pill('ขาย', counts.sales || 0) +
        pill('ลูกค้า', counts.customers || 0) +
        pill('แผนปลูก', counts.plantingPlans || 0) +
        pill('แผนวัสดุ', counts.materialPlans || 0) +
      '</div>' +
      '<div class="restore-audit-v103-summary">' +
        '<div><span>ข้อมูลปัจจุบัน</span><b>' + esc(audit.currentTotal) + ' รายการ</b><em>coverage ' + esc(coverageText(audit.currentCoverage)) + '</em></div>' +
        '<div><span>snapshot ล่าสุด</span><b>' + esc(snap ? formatDate(snap.createdAt) : 'ยังไม่มี') + '</b><em>' + esc(snap ? ((snap.appVersion || '-') + ' / ' + (snap.total || 0) + ' รายการ') : 'ควรสร้าง auto backup ก่อนแยก core') + '</em></div>' +
      '</div>' +
      '<div class="restore-audit-v103-actions">' +
        '<button class="btn btn-outline btn-sm" type="button" onclick="runRestoreAuditV0906()">ตรวจตอนนี้</button>' +
        '<button class="btn btn-outline btn-sm" type="button" onclick="downloadRestoreAuditV0906()">ดาวน์โหลดผลตรวจ</button>' +
        '<button class="btn btn-primary btn-sm" type="button" onclick="createRestoreGateSnapshotV0906()">สร้าง auto backup ตอนนี้</button>' +
      '</div>';
  }
  function injectStyle(){
    if(q('#restore-audit-v103-style')) return;
    const style = document.createElement('style');
    style.id = 'restore-audit-v103-style';
    style.textContent =
      '.restore-audit-v103{border-color:#b8d8c3;background:#fbfffc}' +
      '.restore-audit-v103-head{align-items:flex-start}' +
      '.restore-audit-v103-status.ready{background:#ecfff1;color:#0f7a3a;border-color:#bbebc9}' +
      '.restore-audit-v103-status.warn{background:#fff7e6;color:#9a6100;border-color:#f3d69c}' +
      '.restore-audit-v103-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}' +
      '.restore-audit-v103-pill{border:1px solid #dfeee4;background:#fff;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}' +
      '.restore-audit-v103-pill span{font-size:12px;color:#51705b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.restore-audit-v103-pill b{font-size:18px;color:#1f5131}' +
      '.restore-audit-v103-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}' +
      '.restore-audit-v103-summary>div{border:1px dashed #cfe4d4;border-radius:8px;padding:9px 10px;background:#fff;display:grid;gap:3px}' +
      '.restore-audit-v103-summary span{font-size:12px;color:#51705b}.restore-audit-v103-summary b{font-size:14px;color:#23402c}.restore-audit-v103-summary em{font-size:12px;color:#6b7f70;font-style:normal}' +
      '.restore-audit-v103-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
      '@media(max-width:720px){.restore-audit-v103-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.restore-audit-v103-summary{grid-template-columns:1fr}.restore-audit-v103-actions .btn{flex:1 1 180px}}';
    document.head.appendChild(style);
  }
  function runAudit(){
    const audit = buildAudit();
    saveAudit(audit);
    renderPanel(audit);
    toast(audit.status === 'ready' ? 'ตรวจ restore gate ผ่าน' : 'ตรวจ restore gate แล้ว ต้องตรวจ snapshot/ข้อมูลอีกครั้ง');
    return audit;
  }
  function downloadAudit(){
    const audit = buildAudit();
    saveAudit(audit);
    const blob = new Blob([JSON.stringify(audit, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'farm_restore_audit_v103_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 0);
  }
  function createGateSnapshot(){
    if(typeof window.createAutoBackupNowV0682 === 'function'){
      window.createAutoBackupNowV0682();
      window.setTimeout(function(){ renderPanel(buildAudit()); }, 250);
      return;
    }
    toast('ยังไม่พบระบบ auto backup');
  }
  function wrapSettingsRender(){
    const oldRender = window.renderSettings;
    if(typeof oldRender !== 'function' || oldRender.__v103RealDataRestoreGate) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      window.setTimeout(function(){ injectStyle(); renderPanel(); }, 90);
      return result;
    };
    wrapped.__v103RealDataRestoreGate = true;
    window.renderSettings = wrapped;
    safe(function(){ renderSettings = wrapped; });
  }
  function boot(){
    injectStyle();
    wrapSettingsRender();
    renderPanel();
  }

  window.getRestoreAuditV0906 = buildAudit;
  window.runRestoreAuditV0906 = runAudit;
  window.downloadRestoreAuditV0906 = downloadAudit;
  window.createRestoreGateSnapshotV0906 = createGateSnapshot;
  window.farmRestoreAuditV0906 = {
    version: VERSION,
    buildAudit,
    runAudit,
    renderPanel,
    readSnapshots
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
  window.setTimeout(boot, 1200);
  window.setTimeout(boot, 5000);
})();
