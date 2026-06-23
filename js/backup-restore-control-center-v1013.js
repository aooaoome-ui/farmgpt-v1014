/* V1.0.13 Backup and Restore Control Center */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.13';
  const COLLECTIONS = [
    ['projectItems','โครงการ'],
    ['cropItems','พืชผล'],
    ['actItems','กิจกรรม'],
    ['invItems','คลัง'],
    ['salesData','การขาย'],
    ['custItems','ลูกค้า'],
    ['calEventsArr','ปฏิทิน'],
    ['plantingPlans','แผนปลูก'],
    ['farmInputPlans','แผนวัสดุ'],
    ['reqItems','ใบเบิก']
  ];
  let selectedCandidate = null;
  let lastResult = null;

  function safe(fn, fallback){
    try { return fn(); } catch (error) { console.warn(VERSION, error); return fallback; }
  }
  function clone(value){ return JSON.parse(JSON.stringify(value || {})); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }
  function formatDate(value){
    if (!value) return '-';
    return safe(function(){
      return new Date(value).toLocaleString('th-TH', { dateStyle:'medium', timeStyle:'short' });
    }, value);
  }
  function formatSize(bytes){
    const value = Number(bytes || 0);
    return value >= 1048576 ? (value / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(value / 1024)) + ' KB';
  }
  function toast(message){
    if (typeof window.showToast === 'function') return safe(function(){ window.showToast(message); });
    console.log(message);
  }
  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){ window.eval(name + ' = window["' + name + '"]'); });
  }
  function currentData(){
    return safe(function(){ return typeof window._packData === 'function' ? clone(window._packData()) : {}; }, {});
  }
  function normalizeData(data){
    const source = clone(data && data.data && typeof data.data === 'object' ? data.data : data || {});
    if (!Array.isArray(source.calEventsArr) && Array.isArray(source.calEvents)) source.calEventsArr = source.calEvents;
    return source;
  }
  function countData(data){
    const source = data || {};
    let total = 0;
    const rows = COLLECTIONS.map(function(entry){
      const count = Array.isArray(source[entry[0]]) ? source[entry[0]].length : 0;
      total += count;
      return { key:entry[0], label:entry[1], count };
    });
    return { total, rows };
  }
  function dataFingerprint(data){
    const source = clone(data || {});
    ['savedAt','cloudUpdatedAt','exportedAt','backupMeta'].forEach(function(key){ delete source[key]; });
    return JSON.stringify(source);
  }
  function centralStatus(){
    return safe(function(){
      return window.farmCentralSyncV103 && typeof window.farmCentralSyncV103.guardStatus === 'function'
        ? window.farmCentralSyncV103.guardStatus() || {}
        : {};
    }, {});
  }
  function evaluateRisk(data){
    const gate = window.farmDataStabilityGateV1011;
    if (gate && typeof gate.evaluatePayloadRisk === 'function') return gate.evaluatePayloadRisk(data);
    const current = countData(currentData());
    const candidate = countData(data);
    return {
      block:candidate.total === 0 || (current.total >= 50 && candidate.total < Math.max(10, Math.floor(current.total * 0.5))),
      reason:candidate.total === 0 ? 'empty-payload-blocked-v1013' : 'ok',
      total:candidate.total,
      baselineTotal:current.total,
      rows:candidate.rows
    };
  }
  function readBackups(){
    const rows = [];
    const autoApi = window.farmAutoBackupV0682;
    const stabilityApi = window.farmDataStabilityGateV1011;
    const auto = safe(function(){ return autoApi && autoApi.readSnapshots ? autoApi.readSnapshots() : []; }, []);
    const stable = safe(function(){ return stabilityApi && stabilityApi.readSnapshots ? stabilityApi.readSnapshots() : []; }, []);
    auto.forEach(function(item, index){
      if (!item || !item.data) return;
      const itemTotal = countData(item.data).total;
      if (itemTotal <= 0) return;
      rows.push({
        id:'auto:' + (item.id || index),
        source:'Auto backup',
        createdAt:item.createdAt,
        reason:item.reason || 'snapshot',
        bytes:Number(item.bytes || JSON.stringify(item.data).length),
        counts:item.counts || countData(item.data),
        total:itemTotal,
        data:item.data
      });
    });
    stable.forEach(function(item, index){
      if (!item || !item.data) return;
      const itemTotal = Number(item.total || countData(item.data).total);
      if (itemTotal <= 0) return;
      rows.push({
        id:'stable:' + index + ':' + (item.createdAt || ''),
        source:'Data stability',
        createdAt:item.createdAt,
        reason:item.reason || 'central checkpoint',
        bytes:JSON.stringify(item.data).length,
        counts:{ rows:item.rows || countData(item.data).rows },
        total:itemTotal,
        data:item.data
      });
    });
    const seen = new Set();
    return rows.sort(function(a,b){ return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); })
      .filter(function(item){
        const key = (item.createdAt || '') + ':' + dataFingerprint(item.data);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  function findBackup(id){ return readBackups().find(function(item){ return item.id === id; }) || null; }
  function buildStatus(){
    const current = countData(currentData());
    const central = centralStatus();
    const backups = readBackups();
    const latest = backups[0] || null;
    return {
      version:VERSION,
      current,
      central:{
        ready:!!central.initialCloudLoadDone,
        total:Number(central.lastCloudTotal || 0),
        localWrites:Number(central.stats && central.stats.localWrites || 0),
        cloudWrites:Number(central.stats && central.stats.cloudWrites || 0)
      },
      localBackups:backups.length,
      latest:latest ? {
        id:latest.id,
        source:latest.source,
        createdAt:latest.createdAt,
        reason:latest.reason,
        total:latest.total,
        bytes:latest.bytes
      } : null,
      selected:selectedCandidate ? selectedCandidate.summary : null,
      lastResult
    };
  }
  function previewCandidate(data, meta){
    const normalized = normalizeData(data);
    const recognized = COLLECTIONS.some(function(entry){ return Array.isArray(normalized[entry[0]]); });
    if (!recognized) return { ok:false, blocked:true, reason:'invalid-backup-shape' };
    const current = currentData();
    const currentCounts = countData(current);
    const candidateCounts = countData(normalized);
    const risk = evaluateRisk(normalized);
    const differences = COLLECTIONS.map(function(entry){
      const before = Array.isArray(current[entry[0]]) ? current[entry[0]].length : 0;
      const after = Array.isArray(normalized[entry[0]]) ? normalized[entry[0]].length : 0;
      return { key:entry[0], label:entry[1], before, after, delta:after-before };
    });
    const reduction = candidateCounts.total < currentCounts.total;
    const empty = candidateCounts.total === 0;
    selectedCandidate = {
      data:normalized,
      fingerprint:dataFingerprint(normalized),
      meta:Object.assign({ source:'unknown', name:'Backup' }, meta || {}),
      summary:{
        currentTotal:currentCounts.total,
        candidateTotal:candidateCounts.total,
        delta:candidateCounts.total-currentCounts.total,
        reduction,
        empty,
        requiresAcknowledgement:reduction,
        blocked:empty,
        risk,
        differences
      }
    };
    renderPreview();
    openPreviewModal();
    return { ok:!empty, selected:selectedCandidate.summary };
  }
  function previewSnapshot(id){
    const item = findBackup(id);
    if (!item) return { ok:false, blocked:true, reason:'snapshot-not-found' };
    return previewCandidate(item.data, {
      id:item.id,
      source:item.source,
      name:item.reason || 'Snapshot',
      createdAt:item.createdAt,
      bytes:item.bytes
    });
  }
  function createSafetySnapshots(reason){
    const result = { auto:false, stability:false };
    const autoSnapshot = safe(function(){
      if (window.farmAutoBackupV0682 && window.farmAutoBackupV0682.createSnapshot) {
        return window.farmAutoBackupV0682.createSnapshot(reason, { force:true });
      }
      return null;
    }, null);
    result.auto = !!autoSnapshot;
    const stabilitySnapshot = safe(function(){
      if (window.farmDataStabilityGateV1011 && window.farmDataStabilityGateV1011.createSnapshot) {
        return window.farmDataStabilityGateV1011.createSnapshot(reason);
      }
      return null;
    }, null);
    result.stability = !!(stabilitySnapshot && stabilitySnapshot.ok);
    return result;
  }
  async function confirmRestore(options){
    const opts = options && typeof options === 'object' ? options : {};
    if (!selectedCandidate) return { ok:false, blocked:true, reason:'no-preview-selected' };
    const summary = selectedCandidate.summary;
    if (summary.empty) return { ok:false, blocked:true, reason:'empty-backup-blocked-v1013' };
    if (summary.requiresAcknowledgement && opts.acknowledgeCountDrop !== true) {
      return { ok:false, blocked:true, reason:'count-drop-acknowledgement-required', summary };
    }
    if (opts.dryRun === true) {
      return { ok:true, dryRun:true, wouldRestore:true, allowDangerousOverwrite:summary.risk.block || summary.reduction, summary };
    }
    const before = currentData();
    const safetySnapshots = createSafetySnapshots('ก่อนกู้คืนผ่าน V1.0.13 Control Center');
    try {
      window._applyData(clone(selectedCandidate.data));
      safe(function(){ if (typeof window.normalizeProjectFlowData === 'function') window.normalizeProjectFlowData(); });
      const central = centralStatus();
      let saveResult;
      let savedToCloud = false;
      if (central.initialCloudLoadDone && typeof window.forceCloudSyncNowV103 === 'function') {
        saveResult = await window.forceCloudSyncNowV103({
          allowDangerousOverwrite:summary.risk.block || summary.reduction,
          reason:'v1013-restore-control-center'
        });
        savedToCloud = !!(saveResult && saveResult.ok);
        if (saveResult && saveResult.ok === false && saveResult.reason === 'firebase-not-ready' && typeof window.saveData === 'function') {
          saveResult = window.saveData({
            mode:'user-edit',
            reason:'v1013-restore-local-fallback',
            forceLocal:true,
            allowDangerousOverwrite:summary.risk.block || summary.reduction
          });
          savedToCloud = false;
        }
      } else if (typeof window.saveData === 'function') {
        saveResult = window.saveData({
          mode:'user-edit',
          reason:'v1013-restore-control-center',
          forceLocal:true,
          allowDangerousOverwrite:summary.risk.block || summary.reduction
        });
      }
      if (saveResult && (saveResult.blocked || saveResult.ok === false)) throw new Error(saveResult.reason || 'restore-save-blocked');
      safe(function(){
        window.eval('cropRendered=actRendered=invRendered=salesRendered=custRendered=goalsRendered=false');
      });
      lastResult = {
        ok:true,
        restoredAt:new Date().toISOString(),
        source:selectedCandidate.meta.source,
        total:summary.candidateTotal,
        cloud:savedToCloud,
        safetySnapshots
      };
      selectedCandidate = null;
      closePreviewModal();
      safe(function(){ if (typeof window.renderSettings === 'function') window.renderSettings(); });
      window.setTimeout(render, 100);
      toast('กู้คืนข้อมูลสำเร็จ');
      return clone(lastResult);
    } catch (error) {
      safe(function(){ window._applyData(before); });
      safe(function(){
        if (typeof window.saveData === 'function') window.saveData({ mode:'user-edit', reason:'v1013-restore-rollback', forceLocal:true, allowDangerousOverwrite:true });
      });
      lastResult = { ok:false, rolledBack:true, reason:String(error && error.message || error) };
      renderPreview();
      toast('กู้คืนไม่สำเร็จ ระบบย้อนกลับข้อมูลเดิมแล้ว');
      return clone(lastResult);
    }
  }
  function downloadCurrentBackup(){
    const data = currentData();
    const status = buildStatus();
    const payload = Object.assign({}, data, {
      backupMeta:{
        source:'v1013-control-center',
        appVersion:VERSION,
        exportedAt:new Date().toISOString(),
        total:status.current.total,
        rows:status.current.rows,
        centralTotal:status.central.total
      }
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'farm_full_backup_' + new Date().toISOString().slice(0,10) + '_v1013.json';
    anchor.click();
    window.setTimeout(function(){ URL.revokeObjectURL(anchor.href); }, 0);
    toast('สร้าง Backup JSON แล้ว');
    return { ok:true, total:status.current.total, bytes:JSON.stringify(payload).length };
  }
  function createLocalCheckpoint(){
    createSafetySnapshots('สำรองด้วย V1.0.13 Control Center');
    render();
    toast('สร้าง snapshot ในเครื่องแล้ว');
    return buildStatus();
  }
  function openImport(){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function(event){
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(loadEvent){
        try {
          const data = JSON.parse(loadEvent.target.result);
          const result = previewCandidate(data, { source:'JSON file', name:file.name, bytes:file.size, createdAt:file.lastModified ? new Date(file.lastModified).toISOString() : null });
          if (!result.ok && result.reason === 'invalid-backup-shape') toast('ไฟล์นี้ไม่ใช่ Backup ของระบบ');
        } catch (error) {
          toast('อ่านไฟล์ JSON ไม่สำเร็จ');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  function closePreviewModal(){
    const modal = document.getElementById('backup-restore-preview-v1013');
    if (modal) modal.classList.remove('open');
  }
  function openPreviewModal(){
    ensurePreviewModal();
    const modal = document.getElementById('backup-restore-preview-v1013');
    if (modal) modal.classList.add('open');
  }
  function ensurePreviewModal(){
    if (document.getElementById('backup-restore-preview-v1013')) return;
    const modal = document.createElement('div');
    modal.id = 'backup-restore-preview-v1013';
    modal.className = 'brc-modal-v1013';
    modal.innerHTML = '<div class="brc-dialog-v1013" role="dialog" aria-modal="true" aria-labelledby="brc-preview-title-v1013"><div id="brc-preview-content-v1013"></div></div>';
    modal.addEventListener('click', function(event){ if (event.target === modal) closePreviewModal(); });
    document.body.appendChild(modal);
  }
  function deltaText(value){ return value > 0 ? '+' + value : String(value); }
  function renderPreview(){
    ensurePreviewModal();
    const host = document.getElementById('brc-preview-content-v1013');
    if (!host) return;
    if (!selectedCandidate) {
      host.innerHTML = '<div class="brc-dialog-head-v1013"><h3 id="brc-preview-title-v1013">Restore Preview</h3><button class="btn btn-icon" type="button" aria-label="ปิด" onclick="closeBackupRestorePreviewV1013()">×</button></div><div class="brc-empty-v1013">ยังไม่ได้เลือก backup</div>';
      return;
    }
    const summary = selectedCandidate.summary;
    const meta = selectedCandidate.meta;
    const rows = summary.differences.map(function(row){
      const cls = row.delta < 0 ? 'down' : (row.delta > 0 ? 'up' : 'same');
      return '<div class="brc-diff-row-v1013 ' + cls + '"><span>' + esc(row.label) + '</span><b>' + esc(row.before) + ' → ' + esc(row.after) + '</b><em>' + esc(deltaText(row.delta)) + '</em></div>';
    }).join('');
    const warning = summary.empty
      ? '<div class="brc-alert-v1013 danger">Backup ว่าง ระบบไม่อนุญาตให้กู้คืน</div>'
      : (summary.reduction
        ? '<div class="brc-alert-v1013 warn">จำนวนข้อมูลจะลดลง ' + esc(Math.abs(summary.delta)) + ' รายการ ต้องยืนยันก่อนกู้คืน</div>'
        : '<div class="brc-alert-v1013 ready">จำนวนข้อมูลไม่ลดลง พร้อมกู้คืน</div>');
    host.innerHTML =
      '<div class="brc-dialog-head-v1013"><div><h3 id="brc-preview-title-v1013">Restore Preview</h3><p>' + esc(meta.name || meta.source) + ' · ' + esc(formatDate(meta.createdAt)) + '</p></div><button class="btn btn-icon" type="button" aria-label="ปิด" onclick="closeBackupRestorePreviewV1013()">×</button></div>' +
      '<div class="brc-preview-kpis-v1013"><div><span>ปัจจุบัน</span><b>' + esc(summary.currentTotal) + '</b></div><div><span>หลัง Restore</span><b>' + esc(summary.candidateTotal) + '</b></div><div class="' + (summary.delta < 0 ? 'down' : 'up') + '"><span>เปลี่ยนแปลง</span><b>' + esc(deltaText(summary.delta)) + '</b></div></div>' +
      warning +
      '<div class="brc-diff-grid-v1013">' + rows + '</div>' +
      (summary.requiresAcknowledgement && !summary.empty ? '<label class="brc-ack-v1013"><input id="brc-ack-count-drop-v1013" type="checkbox" onchange="refreshBackupRestorePreviewV1013()"><span>ยืนยันว่าตรวจสอบแล้วและยอมรับว่าจำนวนข้อมูลจะลดลง</span></label>' : '') +
      '<div class="brc-dialog-actions-v1013"><button class="btn btn-outline" type="button" onclick="closeBackupRestorePreviewV1013()">ยกเลิก</button><button id="brc-confirm-restore-v1013" class="btn btn-primary" type="button" onclick="commitBackupRestoreV1013()" ' + (summary.empty || summary.requiresAcknowledgement ? 'disabled' : '') + '>ยืนยัน Restore</button></div>';
  }
  function refreshPreview(){
    const checkbox = document.getElementById('brc-ack-count-drop-v1013');
    const button = document.getElementById('brc-confirm-restore-v1013');
    if (button) button.disabled = !!(selectedCandidate && selectedCandidate.summary.empty) || !!(selectedCandidate && selectedCandidate.summary.requiresAcknowledgement && !(checkbox && checkbox.checked));
  }
  async function commitFromUi(){
    const checkbox = document.getElementById('brc-ack-count-drop-v1013');
    const button = document.getElementById('brc-confirm-restore-v1013');
    if (button) button.disabled = true;
    const result = await confirmRestore({ acknowledgeCountDrop:!!(checkbox && checkbox.checked) });
    if (button && !result.ok) button.disabled = false;
    return result;
  }
  function render(){
    const page = document.getElementById('page-settings');
    const danger = page && page.querySelector('.settings-danger-zone');
    if (!page || !danger || !danger.parentNode) return;
    page.classList.add('backup-control-v1013-ready');
    let card = document.getElementById('backup-restore-control-center-v1013');
    if (!card) {
      card = document.createElement('section');
      card.id = 'backup-restore-control-center-v1013';
      card.className = 'card settings-section-card backup-restore-control-center-v1013';
      danger.parentNode.insertBefore(card, danger);
    }
    const status = buildStatus();
    const backups = readBackups();
    const latest = status.latest;
    const options = backups.map(function(item){
      return '<option value="' + esc(item.id) + '">' + esc(formatDate(item.createdAt)) + ' · ' + esc(item.source) + ' · ' + esc(item.total) + ' รายการ</option>';
    }).join('');
    card.innerHTML =
      '<div class="settings-section-head brc-head-v1013"><div><div class="settings-section-title">Backup & Restore Control Center</div><div class="settings-section-sub">สถานะข้อมูลกลาง สำรองข้อมูล และตรวจสอบก่อน Restore</div></div><span class="settings-pill local">' + esc(VERSION) + '</span></div>' +
      '<div class="brc-status-grid-v1013">' +
        '<div class="' + (status.central.ready ? 'ready' : 'warn') + '"><span>Firestore</span><b>' + (status.central.ready ? 'พร้อมใช้งาน' : 'กำลังตรวจสอบ') + '</b><em>' + esc(status.central.total) + ' records</em></div>' +
        '<div><span>ข้อมูลปัจจุบัน</span><b>' + esc(status.current.total) + ' records</b><em>Firestore-first</em></div>' +
        '<div><span>Snapshot ในเครื่อง</span><b>' + esc(status.localBackups) + ' ชุด</b><em>' + esc(latest ? formatDate(latest.createdAt) : 'ยังไม่มี') + '</em></div>' +
        '<div class="' + (status.current.total > 0 ? 'ready' : 'danger') + '"><span>Restore guard</span><b>' + (status.current.total > 0 ? 'พร้อมตรวจ Preview' : 'ข้อมูลว่าง') + '</b><em>count-drop protected</em></div>' +
      '</div>' +
      '<div class="brc-toolbar-v1013"><button class="btn btn-primary" type="button" onclick="downloadFullBackupV1013()">สำรอง JSON ตอนนี้</button><button class="btn btn-outline" type="button" onclick="createLocalCheckpointV1013()">สร้าง Snapshot</button><button class="btn btn-outline" type="button" onclick="openBackupImportV1013()">นำเข้า JSON</button></div>' +
      '<div class="brc-restore-band-v1013"><div><b>Restore จาก Snapshot</b><span>' + esc(latest ? ('ล่าสุด ' + formatDate(latest.createdAt) + ' · ' + latest.total + ' รายการ · ' + formatSize(latest.bytes)) : 'ยังไม่มี snapshot') + '</span></div><select class="form-control" aria-label="เลือก Snapshot" onchange="openSnapshotPreviewV1013(this.value)"><option value="">เลือก snapshot เพื่อ Preview</option>' + options + '</select></div>' +
      '<div class="brc-counts-v1013">' + status.current.rows.map(function(row){ return '<span><b>' + esc(row.count) + '</b>' + esc(row.label) + '</span>'; }).join('') + '</div>';
  }
  function installStyle(){
    if (document.getElementById('backup-restore-control-center-v1013-style')) return;
    const style = document.createElement('style');
    style.id = 'backup-restore-control-center-v1013-style';
    style.textContent =
      '#page-settings.backup-control-v1013-ready #auto-backup-v0682,#page-settings.backup-control-v1013-ready #restore-audit-v103,#page-settings.backup-control-v1013-ready #data-stability-gate-v1011{display:none!important}' +
      '#page-settings #backup-restore-control-center-v1013{order:65!important;grid-column:1/-1!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;border-color:#bfd9c7;background:#fcfffd}' +
      '.brc-head-v1013{position:static!important}.brc-status-grid-v1013{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}' +
      '.brc-status-grid-v1013>div{border:1px solid #dfe9e1;border-radius:8px;padding:9px 10px;background:#fff;display:grid;gap:2px;min-width:0}.brc-status-grid-v1013 span{font-size:10.5px;color:#6b786d}.brc-status-grid-v1013 b{font-size:13px;color:#213c28}.brc-status-grid-v1013 em{font-size:10px;color:#78827a;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brc-status-grid-v1013 .ready{border-color:#bfe3c8;background:#f4fff6}.brc-status-grid-v1013 .warn{border-color:#efd59f;background:#fffaf0}.brc-status-grid-v1013 .danger{border-color:#efbcbc;background:#fff7f7}' +
      '.brc-toolbar-v1013{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.brc-restore-band-v1013{display:grid;grid-template-columns:minmax(180px,.7fr) minmax(260px,1.3fr);align-items:center;gap:12px;border-top:1px solid #e4ece5;padding-top:10px}.brc-restore-band-v1013>div{display:grid;gap:2px}.brc-restore-band-v1013 b{font-size:12px;color:#294632}.brc-restore-band-v1013 span{font-size:10.5px;color:#6f7e72}' +
      '.brc-counts-v1013{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.brc-counts-v1013 span{display:flex;align-items:center;gap:4px;border:1px solid #e2eae3;border-radius:7px;background:#fff;padding:5px 7px;font-size:10px;color:#68766b}.brc-counts-v1013 b{font-size:11px;color:#24442d}' +
      '.brc-modal-v1013{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(20,35,24,.42);z-index:10050}.brc-modal-v1013.open{display:flex}.brc-dialog-v1013{width:min(760px,100%);max-height:min(86vh,780px);overflow:auto;background:#fff;border-radius:8px;box-shadow:0 24px 70px rgba(12,28,16,.28);padding:18px}.brc-dialog-head-v1013{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.brc-dialog-head-v1013 h3{margin:0;color:#193823;font-size:18px}.brc-dialog-head-v1013 p{margin:3px 0 0;color:#718075;font-size:11px}' +
      '.brc-preview-kpis-v1013{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0 10px}.brc-preview-kpis-v1013>div{border:1px solid #e1e9e2;border-radius:8px;padding:10px;background:#fbfdfb;display:grid;gap:2px}.brc-preview-kpis-v1013 span{font-size:10.5px;color:#708075}.brc-preview-kpis-v1013 b{font-size:20px;color:#203f2a}.brc-preview-kpis-v1013 .down b{color:#b23a3a}.brc-preview-kpis-v1013 .up b{color:#18733b}' +
      '.brc-alert-v1013{border:1px solid;border-radius:8px;padding:9px 10px;font-size:12px;margin-bottom:10px}.brc-alert-v1013.ready{border-color:#bfe3c8;background:#f2fff5;color:#176b35}.brc-alert-v1013.warn{border-color:#ebcf96;background:#fff9ec;color:#906000}.brc-alert-v1013.danger{border-color:#efb5b5;background:#fff5f5;color:#a32f2f}' +
      '.brc-diff-grid-v1013{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.brc-diff-row-v1013{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:8px;border:1px solid #e3eae4;border-radius:7px;padding:7px 9px}.brc-diff-row-v1013 span{font-size:11px;color:#66756a}.brc-diff-row-v1013 b{font-size:11px;color:#253f2d}.brc-diff-row-v1013 em{font-size:10px;font-style:normal;color:#738078}.brc-diff-row-v1013.down{border-color:#edc9c9;background:#fffafa}.brc-diff-row-v1013.down em{color:#ae3838}.brc-diff-row-v1013.up em{color:#17723a}' +
      '.brc-ack-v1013{display:flex;align-items:flex-start;gap:9px;border:1px solid #e7cb92;border-radius:8px;padding:10px;margin-top:12px;background:#fffaf0;font-size:12px;color:#775517}.brc-ack-v1013 input{margin-top:2px}.brc-dialog-actions-v1013{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.brc-dialog-actions-v1013 .btn:disabled{opacity:.42;cursor:not-allowed;filter:grayscale(.35)}.brc-empty-v1013{padding:24px;text-align:center;color:#728078}' +
      '@media(max-width:760px){.brc-status-grid-v1013{grid-template-columns:repeat(2,minmax(0,1fr))}.brc-restore-band-v1013{grid-template-columns:1fr}.brc-diff-grid-v1013{grid-template-columns:1fr}.brc-modal-v1013{padding:10px;align-items:flex-end}.brc-dialog-v1013{max-height:92vh}.brc-dialog-actions-v1013 .btn{flex:1}.brc-toolbar-v1013 .btn{flex:1 1 140px}}';
    document.head.appendChild(style);
  }
  function wrapSettings(){
    const original = window.renderSettings;
    if (typeof original !== 'function' || original.__v1013BackupControl) return;
    const wrapped = function(){
      const result = original.apply(this, arguments);
      window.setTimeout(render, 120);
      return result;
    };
    wrapped.__v1013BackupControl = true;
    wrapped.__v1013Original = original;
    assignGlobal('renderSettings', wrapped);
  }
  function wrapLegacyActions(){
    const importWrapped = function(){ return openImport(); };
    importWrapped.__v1013BackupControl = true;
    importWrapped.__v0682AutoBackup = true;
    assignGlobal('importDataPrompt', importWrapped);
    const restoreWrapped = function(id){ return previewSnapshot('auto:' + id); };
    restoreWrapped.__v1013BackupControl = true;
    assignGlobal('restoreAutoBackupV0682', restoreWrapped);
  }
  function boot(){
    installStyle();
    ensurePreviewModal();
    wrapSettings();
    wrapLegacyActions();
    render();
  }

  assignGlobal('downloadFullBackupV1013', downloadCurrentBackup);
  assignGlobal('createLocalCheckpointV1013', createLocalCheckpoint);
  assignGlobal('openBackupImportV1013', openImport);
  assignGlobal('openSnapshotPreviewV1013', function(id){ return id ? previewSnapshot(id) : null; });
  assignGlobal('closeBackupRestorePreviewV1013', closePreviewModal);
  assignGlobal('refreshBackupRestorePreviewV1013', refreshPreview);
  assignGlobal('commitBackupRestoreV1013', commitFromUi);
  window.farmBackupRestoreControlCenterV1013 = {
    version:VERSION,
    status:buildStatus,
    listBackups:function(){ return readBackups().map(function(item){ return Object.assign({}, item, { data:undefined }); }); },
    preview:previewCandidate,
    previewSnapshot,
    confirmRestore,
    createLocalCheckpoint,
    downloadCurrentBackup,
    render,
    closePreview:closePreviewModal
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
  [1400, 4200, 10000].forEach(function(delay){ window.setTimeout(boot, delay); });
})();
