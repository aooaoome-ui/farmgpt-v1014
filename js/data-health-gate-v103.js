/* V1.0.3 Data Health Gate
   Read-only data integrity audit before core/data/storage split work. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const AUDIT_KEY = 'farmDataHealthAudit_v103';
  const $ = (sel) => document.querySelector(sel);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = (fn, fallback) => { try { return fn(); } catch (err) { console.warn('V1.0.3 data health gate', err); return fallback; } };
  const coreSummary = window.farmCoreReadonlySummaryV0906;
  if(!coreSummary) throw new Error('V1.0.3 core read-only summary helper is required');
  const storageContract = window.farmStorageAdapterContractV0906;
  if(!storageContract) throw new Error('V1.0.3 storage adapter contract is required');
  let lastReport = null;
  let lastSignature = '';
  let lastAuditAt = 0;

  function readData(){
    return safe(() => typeof window._packData === 'function' ? window._packData() : {}, {});
  }

  function dataSignature(data){
    const src = data && typeof data === 'object' ? data : {};
    return [
      'cropItems','actItems','invItems','custItems','salesData','goalItems','calEventsArr',
      'reqItems','projectItems','plantingPlans','farmInputPlans'
    ].map((key) => key + ':' + (Array.isArray(src[key]) ? src[key].length : '-')).join('|') +
      '|ids:' + ['nextCropId','nextActId','nextInvId','nextCustId','_nextSaleId','_nextCalId','_nextReqId','_nextProjId'].map((key) => src[key] ?? '-').join(',');
  }

  function isSettingsVisible(){
    const page = $('#page-settings');
    return !!(page && page.classList.contains('active'));
  }

  function runAudit(options){
    const opts = options && typeof options === 'object' ? options : {};
    const data = readData();
    const signature = dataSignature(data);
    const now = Date.now();
    if(!opts.force && lastReport && signature === lastSignature && now - lastAuditAt < (opts.cacheMs || 5000)){
      render(lastReport);
      safe(() => document.dispatchEvent(new CustomEvent('farm:data-health-rendered-v103', { detail:lastReport })));
      return lastReport;
    }
    const summary = coreSummary.summarize(data);
    const contract = storageContract.audit(data, summary);
    const report = { version:VERSION, createdAt:new Date().toISOString(), ...summary, storageContract:contract };
    lastReport = report;
    lastSignature = signature;
    lastAuditAt = now;
    safe(() => {
      const history = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      history.unshift(report);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(history.slice(0, 20)));
    });
    render(report);
    safe(() => document.dispatchEvent(new CustomEvent('farm:data-health-rendered-v103', { detail:report })));
    return report;
  }

  function statusText(report){ return report.status === 'ready' ? 'พร้อมไปต่อ' : 'ควรตรวจข้อมูล'; }
  function issueText(row){
    const parts = [];
    if(row.duplicateIds.length) parts.push('id ซ้ำ ' + row.duplicateIds.join(', '));
    if(row.missingIdIndexes.length) parts.push('ไม่มี id ' + row.missingIdIndexes.length + ' รายการ');
    if(row.staleNextId) parts.push(row.nextKey + ' ต่ำกว่าหรือเท่ากับ id สูงสุด');
    return parts.length ? parts.join(' · ') : 'ปกติ';
  }

  function render(report){
    const danger = $('#page-settings .settings-danger-zone');
    if(!danger || !danger.parentNode) return;
    let card = $('#data-health-gate-v103');
    if(!card){
      card = document.createElement('section');
      card.id = 'data-health-gate-v103';
      card.className = 'card settings-section-card data-health-gate-v103';
      danger.parentNode.insertBefore(card, danger);
    }
    const cls = report.status === 'ready' ? 'ready' : 'warn';
    card.innerHTML =
      '<div class="settings-section-head data-health-gate-v103-head">' +
        '<div><h3>ตรวจสุขภาพข้อมูล</h3><p>ตรวจ id ซ้ำและเลขลำดับถัดไปก่อนแยก core/data/storage</p></div>' +
        '<span class="settings-pill local data-health-gate-v103-status ' + cls + '">' + esc(statusText(report)) + '</span>' +
      '</div>' +
      '<div class="data-health-gate-v103-summary"><b>' + esc(report.issueCount) + '</b><span>ประเด็นที่ต้องตรวจ</span><em>' + esc(report.createdAt) + '</em></div>' +
      '<div class="data-health-gate-v103-contract ' + (report.storageContract.status === 'ready' ? 'ready' : 'warn') + '">' +
        '<b>Storage adapter contract</b><span>' + esc(report.storageContract.status) + ' · key ' + esc(report.storageContract.localKey) + ' · Firestore collections ' + esc(report.storageContract.firestoreCollections.length) + ' · writer moved: no</span>' +
      '</div>' +
      '<div class="data-health-gate-v103-grid">' +
        report.rows.map((row) =>
          '<div class="data-health-gate-v103-row ' + (issueText(row) === 'ปกติ' ? 'ready' : 'warn') + '">' +
            '<div><b>' + esc(row.label) + '</b><span>' + esc(row.count) + ' รายการ · max ' + esc(row.maxId) + ' · next ' + esc(row.nextId == null ? '-' : row.nextId) + '</span></div>' +
            '<em>' + esc(issueText(row)) + '</em>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div class="data-health-gate-v103-actions"><button class="btn btn-outline btn-sm" type="button" onclick="runDataHealthAuditV0906({force:true})">ตรวจซ้ำ</button></div>';
  }

  function installStyle(){
    if($('#data-health-gate-v103-style')) return;
    const style = document.createElement('style');
    style.id = 'data-health-gate-v103-style';
    style.textContent =
      '.data-health-gate-v103{border-color:#c8d7e8;background:#fcfdff}' +
      '.data-health-gate-v103-head{align-items:flex-start}' +
      '.data-health-gate-v103-status.ready{background:#ecfff1;color:#0f7a3a;border-color:#bbebc9}' +
      '.data-health-gate-v103-status.warn{background:#fff7e6;color:#9a6100;border-color:#f3d69c}' +
      '.data-health-gate-v103-summary{display:flex;align-items:baseline;gap:8px;border:1px dashed #d3e0ec;border-radius:8px;padding:9px 10px;background:#fff;margin:10px 0}' +
      '.data-health-gate-v103-summary b{font-size:22px;color:#23405e}.data-health-gate-v103-summary span{font-size:12px;color:#526b82}.data-health-gate-v103-summary em{font-size:11px;color:#7c8f9f;font-style:normal;margin-left:auto}' +
      '.data-health-gate-v103-contract{border:1px solid #dce6ee;border-radius:8px;padding:8px 10px;background:#fff;display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}' +
      '.data-health-gate-v103-contract b{font-size:12px;color:#263f54}.data-health-gate-v103-contract span{font-size:11px;color:#667b8d}.data-health-gate-v103-contract.warn{border-color:#f1d59c;background:#fffdfa}' +
      '.data-health-gate-v103-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
      '.data-health-gate-v103-row{border:1px solid #dce6ee;border-radius:8px;padding:9px 10px;background:#fff;display:grid;gap:4px}' +
      '.data-health-gate-v103-row div{display:flex;justify-content:space-between;gap:8px}.data-health-gate-v103-row b{font-size:13px;color:#263f54}.data-health-gate-v103-row span,.data-health-gate-v103-row em{font-size:11px;color:#667b8d;font-style:normal}' +
      '.data-health-gate-v103-row.warn{border-color:#f1d59c;background:#fffdfa}.data-health-gate-v103-row.warn em{color:#9a6100}' +
      '.data-health-gate-v103-actions{margin-top:10px}' +
      '@media(max-width:720px){.data-health-gate-v103-grid{grid-template-columns:1fr}.data-health-gate-v103-summary{flex-wrap:wrap}.data-health-gate-v103-summary em{width:100%;margin-left:0}}';
    document.head.appendChild(style);
  }

  function hookSettings(){
    const oldRender = window.renderSettings;
    if(typeof oldRender !== 'function' || oldRender.__v103DataHealthGate) return;
    const wrapped = function(){
      const value = oldRender.apply(this, arguments);
      safe(() => runAudit({cacheMs:5000}));
      return value;
    };
    wrapped.__v103DataHealthGate = true;
    window.renderSettings = wrapped;
    safe(() => { renderSettings = wrapped; });
  }

  function boot(){
    installStyle();
    hookSettings();
    if(isSettingsVisible()) safe(() => runAudit({cacheMs:5000}));
  }

  window.runDataHealthAuditV0906 = runAudit;
  window.getDataHealthAuditV0906 = () => safe(() => JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'), []);
  window.farmDataHealthGateV0906 = { version:VERSION, runAudit, summarize:coreSummary.summarize, storageContract:storageContract.audit };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
