/* V1.0.11 Data Stability Gate */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.11';
  const SNAPSHOT_KEY = 'farmDataStabilitySnapshots_v1011';
  const MAX_SNAPSHOTS = 8;
  const COLLECTIONS = [
    { key:'projectItems', label:'Projects' },
    { key:'cropItems', label:'Crops' },
    { key:'actItems', label:'Activities' },
    { key:'invItems', label:'Inventory' },
    { key:'salesData', label:'Sales' },
    { key:'custItems', label:'Customers' },
    { key:'calEventsArr', label:'Calendar' },
    { key:'plantingPlans', label:'Planting plans' },
    { key:'farmInputPlans', label:'Material plans' },
    { key:'reqItems', label:'Requisitions' }
  ];

  const metrics = {
    version: VERSION,
    audits: 0,
    saveBlocks: 0,
    cloudBlocks: 0,
    snapshotsCreated: 0,
    lastApply: null,
    lastRisk: null,
    lastAudit: null
  };

  function safe(fn, fallback){
    try { return fn(); } catch (error) { console.warn(VERSION, error); return fallback; }
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value || {}));
  }

  function readData(){
    return safe(function(){
      return typeof window._packData === 'function' ? clone(window._packData()) : {};
    }, {});
  }

  function countRows(data){
    const source = data || {};
    let total = 0;
    const rows = COLLECTIONS.map(function(entry){
      const count = Array.isArray(source[entry.key]) ? source[entry.key].length : 0;
      total += count;
      return { key:entry.key, label:entry.label, count };
    });
    return { total, rows };
  }

  function fingerprint(data){
    const source = clone(data || {});
    delete source.savedAt;
    delete source.cloudUpdatedAt;
    delete source.seededAt;
    delete source.seedSource;
    return JSON.stringify(source);
  }

  function centralStatus(){
    return safe(function(){
      const api = window.farmCentralSyncV103;
      if (!api || typeof api.guardStatus !== 'function') return {};
      return api.guardStatus() || {};
    }, {});
  }

  function currentBaselineTotal(){
    const status = centralStatus();
    return Number(status.lastCloudTotal || 0);
  }

  function evaluatePayloadRisk(data, options){
    const opts = options && typeof options === 'object' ? options : {};
    const counts = countRows(data || {});
    const baseline = Number(opts.baselineTotal == null ? currentBaselineTotal() : opts.baselineTotal) || 0;
    const allowDangerousOverwrite = opts.allowDangerousOverwrite === true || opts.mode === 'force-override';
    const risk = {
      block:false,
      reason:'ok',
      total:counts.total,
      baselineTotal:baseline,
      rows:counts.rows
    };
    if (allowDangerousOverwrite) return risk;
    if (counts.total === 0) {
      risk.block = true;
      risk.reason = 'empty-payload-blocked-v1011';
    } else if (baseline >= 50 && counts.total < Math.max(10, Math.floor(baseline * 0.5))) {
      risk.block = true;
      risk.reason = 'suspicious-count-drop-blocked-v1011';
    }
    metrics.lastRisk = Object.assign({ at:new Date().toISOString() }, risk);
    return risk;
  }

  function readSnapshots(){
    return safe(function(){
      const list = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    }, []);
  }

  function writeSnapshots(list){
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list.slice(0, MAX_SNAPSHOTS)));
  }

  function createSnapshot(reason){
    const data = readData();
    const counts = countRows(data);
    const snap = {
      version: VERSION,
      createdAt: new Date().toISOString(),
      reason: reason || 'manual',
      total: counts.total,
      rows: counts.rows,
      fingerprint: fingerprint(data),
      data
    };
    const list = readSnapshots().filter(function(item){ return item && item.fingerprint !== snap.fingerprint; });
    list.unshift(snap);
    writeSnapshots(list);
    metrics.snapshotsCreated += 1;
    render();
    return { ok:true, snapshot:{ createdAt:snap.createdAt, reason:snap.reason, total:snap.total, rows:snap.rows }, count:list.length };
  }

  function audit(options){
    const opts = options && typeof options === 'object' ? options : {};
    const data = readData();
    const counts = countRows(data);
    const status = centralStatus();
    const risk = evaluatePayloadRisk(data, { baselineTotal: status.lastCloudTotal || counts.total });
    const snapshots = readSnapshots();
    const report = {
      version: VERSION,
      createdAt: new Date().toISOString(),
      total: counts.total,
      rows: counts.rows,
      central: {
        ready: !!(window.farmCentralSyncV103 && window.farmCentralSyncV103.isReady && window.farmCentralSyncV103.isReady()),
        initialCloudLoadDone: !!status.initialCloudLoadDone,
        lastCloudTotal: Number(status.lastCloudTotal || 0),
        hasCloudFingerprint: !!status.hasCloudFingerprint,
        hasLocalFingerprint: !!status.hasLocalFingerprint,
        stats: status.stats || {}
      },
      risk,
      snapshots: snapshots.map(function(item){
        return { createdAt:item.createdAt, reason:item.reason, total:item.total };
      }),
      status: risk.block ? 'blocked-risk' : (status.initialCloudLoadDone ? 'stable' : 'checking')
    };
    metrics.audits += 1;
    metrics.lastAudit = report;
    if (opts.render !== false) render(report);
    return report;
  }

  function assignGlobal(name, fn){
    window[name] = fn;
    safe(function(){ window.eval(name + ' = window["' + name + '"]'); });
  }

  function wrapApplyData(){
    const original = window._applyData;
    if (typeof original !== 'function' || original.__v1011DataStability) return false;
    const wrapped = function(data){
      const counts = countRows(data || {});
      metrics.lastApply = {
        at: new Date().toISOString(),
        total: counts.total,
        source: data && data.cloudSchemaVersion ? 'central-or-cloud-shaped-data' : 'local-or-import-shaped-data'
      };
      return original.apply(this, arguments);
    };
    wrapped.__v1011DataStability = true;
    wrapped.__v1011Original = original;
    assignGlobal('_applyData', wrapped);
    return true;
  }

  function wrapSaveData(){
    const original = window.saveData;
    if (typeof original !== 'function' || original.__v1011DataStability) return false;
    const wrapped = function(options){
      const opts = options && typeof options === 'object' ? options : {};
      const risk = evaluatePayloadRisk(readData(), opts);
      if (risk.block && !opts.forceLocal && !opts.forceCloud) {
        metrics.saveBlocks += 1;
        render();
        return { ok:false, skipped:true, blocked:true, reason:risk.reason, gate:'v1011-data-stability' };
      }
      return original.apply(this, arguments);
    };
    wrapped.__v1011DataStability = true;
    wrapped.__v1011Original = original;
    assignGlobal('saveData', wrapped);
    return true;
  }

  function wrapForceCloud(){
    ['forceCloudSyncNowV103','forceCloudSyncNowV104','forceCloudSyncNowV106'].forEach(function(name){
      const original = window[name];
      if (typeof original !== 'function' || original.__v1011DataStability) return;
      const wrapped = async function(options){
        const opts = options && typeof options === 'object' ? options : {};
        const risk = evaluatePayloadRisk(readData(), opts);
        if (risk.block && opts.allowDangerousOverwrite !== true) {
          metrics.cloudBlocks += 1;
          render();
          return { ok:false, blocked:true, reason:risk.reason, gate:'v1011-data-stability', risk };
        }
        return original.apply(this, arguments);
      };
      wrapped.__v1011DataStability = true;
      wrapped.__v1011Original = original;
      assignGlobal(name, wrapped);
    });
  }

  function installStyle(){
    if (document.getElementById('data-stability-gate-v1011-style')) return;
    const style = document.createElement('style');
    style.id = 'data-stability-gate-v1011-style';
    style.textContent =
      '.data-stability-gate-v1011{border-color:#cbdbe7;background:#fbfdff}' +
      '.data-stability-gate-v1011 .ds-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}' +
      '.data-stability-gate-v1011 .ds-kpi{border:1px solid #e1eaf1;border-radius:10px;background:#fff;padding:9px 10px}' +
      '.data-stability-gate-v1011 .ds-kpi b{display:block;font-size:18px;color:#18364f}.data-stability-gate-v1011 .ds-kpi span{font-size:11px;color:#627587}' +
      '.data-stability-gate-v1011 .ds-status{border:1px solid #dfe9f0;border-radius:10px;background:#fff;padding:9px 10px;font-size:12px;color:#40586b;margin-bottom:8px}' +
      '.data-stability-gate-v1011 .ds-status.ready{border-color:#bfe6c8;background:#f2fff5;color:#176833}.data-stability-gate-v1011 .ds-status.warn{border-color:#f1d59c;background:#fffdfa;color:#9a6100}' +
      '.data-stability-gate-v1011 .ds-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.data-stability-gate-v1011 .ds-row{display:flex;justify-content:space-between;gap:8px;border:1px solid #e1eaf1;border-radius:9px;padding:7px 9px;background:#fff;font-size:12px;color:#53687a}' +
      '.data-stability-gate-v1011 .ds-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
      '@media(max-width:760px){.data-stability-gate-v1011 .ds-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.data-stability-gate-v1011 .ds-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function render(report){
    const danger = document.querySelector('#page-settings .settings-danger-zone');
    if (!danger || !danger.parentNode) return;
    const state = report || metrics.lastAudit || audit({ render:false });
    let card = document.getElementById('data-stability-gate-v1011');
    if (!card) {
      card = document.createElement('section');
      card.id = 'data-stability-gate-v1011';
      card.className = 'card settings-section-card data-stability-gate-v1011';
      const dataHealth = document.getElementById('data-health-gate-v103');
      danger.parentNode.insertBefore(card, dataHealth || danger);
    }
    const centralReady = state.central && state.central.initialCloudLoadDone && state.central.lastCloudTotal > 0;
    const riskOk = !(state.risk && state.risk.block);
    const statusClass = centralReady && riskOk ? 'ready' : 'warn';
    const snapshotCount = state.snapshots ? state.snapshots.length : readSnapshots().length;
    card.innerHTML =
      '<div class="settings-section-head"><div><div class="settings-section-title">Data Stability Gate</div><div class="settings-section-sub">Firestore-first load, overwrite guard, and local central snapshots for V1.0.11.</div></div><span class="settings-pill local">' + esc(VERSION) + '</span></div>' +
      '<div class="ds-status ' + statusClass + '">' +
        'Status: ' + esc(state.status) +
        ' | central total: ' + esc(state.central.lastCloudTotal || 0) +
        ' | current total: ' + esc(state.total || 0) +
        ' | risk: ' + esc(state.risk.reason) +
      '</div>' +
      '<div class="ds-kpis">' +
        '<div class="ds-kpi"><b>' + esc(state.total || 0) + '</b><span>current records</span></div>' +
        '<div class="ds-kpi"><b>' + esc(state.central.lastCloudTotal || 0) + '</b><span>central baseline</span></div>' +
        '<div class="ds-kpi"><b>' + esc(snapshotCount) + '</b><span>local checkpoints</span></div>' +
        '<div class="ds-kpi"><b>' + esc(metrics.saveBlocks + metrics.cloudBlocks) + '</b><span>blocked risky writes</span></div>' +
      '</div>' +
      '<div class="ds-grid">' +
        state.rows.map(function(row){
          return '<div class="ds-row"><span>' + esc(row.label) + '</span><b>' + esc(row.count) + '</b></div>';
        }).join('') +
      '</div>' +
      '<div class="ds-actions">' +
        '<button class="btn btn-outline btn-sm" type="button" onclick="runDataStabilityAuditV1011({force:true})">Run stability audit</button>' +
        "<button class=\"btn btn-outline btn-sm\" type=\"button\" onclick=\"createDataStabilitySnapshotV1011('manual-settings')\">Create local checkpoint</button>" +
      '</div>';
  }

  function maybeCreateAutoSnapshot(){
    const data = readData();
    const counts = countRows(data);
    if (counts.total <= 0) return;
    const status = centralStatus();
    if (!status.initialCloudLoadDone || Number(status.lastCloudTotal || 0) <= 0) return;
    if (counts.total !== Number(status.lastCloudTotal || 0)) return;
    const fp = fingerprint(data);
    if (readSnapshots().some(function(item){ return item && item.fingerprint === fp; })) return;
    createSnapshot('auto-after-central-load');
  }

  function hookSettings(){
    const original = window.renderSettings;
    if (typeof original !== 'function' || original.__v1011DataStability) return false;
    const wrapped = function(){
      const result = original.apply(this, arguments);
      safe(function(){ audit({ force:true }); });
      return result;
    };
    wrapped.__v1011DataStability = true;
    wrapped.__v1011Original = original;
    assignGlobal('renderSettings', wrapped);
    return true;
  }

  function boot(){
    installStyle();
    wrapApplyData();
    wrapSaveData();
    wrapForceCloud();
    hookSettings();
    window.farmDataStabilityGateV1011 = {
      version: VERSION,
      countRows,
      evaluatePayloadRisk,
      audit,
      render,
      createSnapshot,
      readSnapshots,
      metrics: function(){ return clone(metrics); }
    };
    window.runDataStabilityAuditV1011 = audit;
    window.createDataStabilitySnapshotV1011 = createSnapshot;
    safe(function(){ document.addEventListener('farm:data-health-rendered-v103', function(){ render(); }); });
    [1200, 3200, 6500].forEach(function(delay){
      window.setTimeout(function(){
        safe(maybeCreateAutoSnapshot);
        safe(function(){ audit({ force:true }); });
      }, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
