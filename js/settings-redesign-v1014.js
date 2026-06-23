/* V1.0.14 Settings Redesign
   UI-only organization layer. It does not change data, storage, or backup behavior. */
(function(){
  'use strict';

  const VERSION = 'V1.0.14';
  const STORAGE_KEY = 'farmgpt.settings.tab.v1014';
  const TAB_IDS = ['general', 'workflow', 'backup', 'system'];
  const TAB_LABELS = {
    general: 'ทั่วไป',
    workflow: 'การทำงาน',
    backup: 'สำรองข้อมูล',
    system: 'ระบบ'
  };
  let activeTab = 'general';
  let organizing = false;
  let observer = null;

  function safe(fn, fallback){
    try { return fn(); } catch (error) { console.warn(VERSION, error); return fallback; }
  }
  function q(selector, root){ return (root || document).querySelector(selector); }
  function qa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function ensureStyle(){
    if (q('#settings-redesign-v1014-style')) return;
    const style = document.createElement('style');
    style.id = 'settings-redesign-v1014-style';
    style.textContent =
      '#page-settings.settings-redesign-v1014{--sr-green:#257a38;--sr-green-soft:#f3faf2;--sr-line:#dfe9df;--sr-text:#1d2b20;--sr-sub:#6d796f}' +
      '#page-settings.settings-redesign-v1014 .app-page-shell{gap:12px}' +
      '#page-settings.settings-redesign-v1014 .settings-hero{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:18px!important;padding:13px 16px!important;margin:0!important;border-radius:14px!important;background:#fff!important;border:1px solid var(--sr-line)!important;color:var(--sr-text)!important;box-shadow:none!important}' +
      '#page-settings.settings-redesign-v1014 .settings-hero-title{font-size:19px!important;margin:0!important}' +
      '#page-settings.settings-redesign-v1014 .settings-hero-sub{font-size:11px!important;color:var(--sr-sub)!important;margin-top:2px!important}' +
      '#page-settings.settings-redesign-v1014 .settings-hero-badge{padding:6px 9px!important;font-size:11px!important;border-radius:9px!important;white-space:nowrap}' +
      '#page-settings.settings-redesign-v1014 .settings-kpi-row{display:none!important}' +
      '.settings-summary-v1014{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0}' +
      '.settings-summary-item-v1014{display:flex;align-items:center;gap:6px;min-width:0;padding:6px 9px;border:1px solid #e5ede4;border-radius:9px;background:#fbfdfb;color:#667268;font-size:10.5px;white-space:nowrap}' +
      '.settings-summary-item-v1014 b{font-size:11.5px;color:#284b30;overflow:hidden;text-overflow:ellipsis}' +
      '.settings-summary-dot-v1014{width:7px;height:7px;border-radius:50%;background:#2fa24b;box-shadow:0 0 0 3px #e6f6e9}' +
      '.settings-tabs-v1014{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:5px;border:1px solid var(--sr-line);border-radius:13px;background:#f7faf6}' +
      '.settings-tab-v1014{min-height:42px;border:0;border-radius:9px;background:transparent;color:#68746a;font:inherit;font-size:12px;font-weight:750;cursor:pointer;transition:background .16s,color .16s,box-shadow .16s}' +
      '.settings-tab-v1014:hover{background:#fff;color:#31563a}' +
      '.settings-tab-v1014[aria-selected="true"]{background:#fff;color:#1f7033;box-shadow:0 2px 8px rgba(35,75,42,.09)}' +
      '.settings-tab-v1014:focus-visible,.settings-details-toggle-v1014:focus-visible,.settings-danger-v1014 summary:focus-visible{outline:3px solid rgba(47,139,65,.25);outline-offset:2px}' +
      '#page-settings.settings-redesign-v1014 .settings-main-grid{display:block!important;min-height:0!important}' +
      '.settings-panel-v1014{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}' +
      '.settings-panel-v1014[hidden]{display:none!important}' +
      '#page-settings.settings-redesign-v1014 .settings-panel-v1014>.settings-section-card,#page-settings.settings-redesign-v1014 .settings-panel-v1014>#auto-backup-v0682,#page-settings.settings-redesign-v1014 .settings-panel-v1014>#data-health-gate-v103,#page-settings.settings-redesign-v1014 .settings-panel-v1014>#restore-audit-v103{display:flex!important;flex-direction:column!important;grid-column:auto!important;min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:15px!important;border-radius:13px!important;border-color:var(--sr-line)!important;box-shadow:none!important}' +
      '#page-settings.settings-redesign-v1014 .settings-section-head{position:static!important;margin:0 0 10px!important;padding:0 0 9px!important;align-items:flex-start!important;background:transparent!important;border-bottom:1px solid #edf2ec}' +
      '#page-settings.settings-redesign-v1014 .settings-section-title,#page-settings.settings-redesign-v1014 .settings-section-head h3{font-size:15px!important;line-height:1.3!important}' +
      '#page-settings.settings-redesign-v1014 .settings-section-sub,#page-settings.settings-redesign-v1014 .settings-section-head p{font-size:10.8px!important;line-height:1.35!important;color:var(--sr-sub)!important;margin-top:2px!important}' +
      '#settings-panel-general-v1014>.settings-section-card:first-child,#settings-panel-workflow-v1014>.settings-section-card,#settings-panel-backup-v1014>#backup-restore-control-center-v1013,#settings-panel-backup-v1014>.settings-export-card-v1014{grid-column:1/-1!important}' +
      '#settings-panel-backup-v1014>.settings-danger-zone{grid-column:1/-1!important;min-height:0!important;background:#fffdfd!important}' +
      '#page-settings.settings-redesign-v1014 .settings-export-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}' +
      '#page-settings.settings-redesign-v1014 .settings-export-btn{min-height:44px!important;height:auto!important;padding:9px 11px!important;display:flex!important;flex-direction:row!important;justify-content:space-between!important;border-radius:9px!important}' +
      '#page-settings.settings-redesign-v1014 .settings-export-btn span{display:none!important}' +
      '#page-settings.settings-redesign-v1014 .app-soft-note{display:none}' +
      '#page-settings.settings-redesign-v1014 .settings-chip-wrap{min-height:0!important}' +
      '#page-settings.settings-redesign-v1014 .brc-status-grid-v1013{grid-template-columns:repeat(4,minmax(0,1fr))}' +
      '#page-settings.settings-redesign-v1014 .brc-counts-v1013{margin:0}' +
      '.settings-backup-details-v1014{margin-top:10px;border-top:1px solid #e7eee7;padding-top:8px}' +
      '.settings-backup-details-v1014 summary,.settings-danger-v1014 summary{cursor:pointer;color:#53705a;font-size:11px;font-weight:750;list-style:none}' +
      '.settings-backup-details-v1014 summary::-webkit-details-marker,.settings-danger-v1014 summary::-webkit-details-marker{display:none}' +
      '.settings-backup-details-v1014 summary::after,.settings-danger-v1014 summary::after{content:"+";float:right;font-size:15px;line-height:1}' +
      '.settings-backup-details-v1014[open] summary::after,.settings-danger-v1014[open] summary::after{content:"−"}' +
      '.settings-backup-details-v1014 .brc-counts-v1013{margin-top:8px}' +
      '.settings-danger-v1014{border:1px solid #f0d3d3;border-radius:10px;background:#fffafa;padding:10px 11px}' +
      '.settings-danger-actions-v1014{display:grid;gap:8px;margin-top:10px}' +
      '.settings-danger-actions-v1014 .btn{width:100%}' +
      '.settings-system-card-v1014:not(.is-expanded)>*:not(.settings-section-head){display:none!important}' +
      '.settings-details-toggle-v1014{margin-left:auto;border:1px solid #d8e6d8;border-radius:8px;background:#fff;color:#2c6c38;padding:6px 9px;font:inherit;font-size:10.5px;font-weight:750;cursor:pointer;white-space:nowrap}' +
      '#settings-panel-system-v1014{grid-template-columns:1fr}' +
      '#settings-panel-system-v1014>.settings-section-card{width:100%}' +
      '@media(max-width:900px){#page-settings.settings-redesign-v1014 .settings-hero{grid-template-columns:1fr auto!important}.settings-summary-v1014{grid-column:1/-1;justify-content:flex-start;overflow:auto;padding-bottom:2px}.settings-panel-v1014{grid-template-columns:1fr}.settings-panel-v1014>*{grid-column:1!important}}' +
      '@media(max-width:640px){#page-settings.settings-redesign-v1014 .settings-hero{grid-template-columns:1fr!important;gap:8px!important;padding:12px!important}#page-settings.settings-redesign-v1014 .settings-hero-badge{justify-self:start}.settings-summary-v1014{width:100%;display:grid;grid-template-columns:1fr}.settings-summary-item-v1014{justify-content:space-between}.settings-tabs-v1014{grid-template-columns:repeat(2,minmax(0,1fr))}.settings-tab-v1014{min-height:44px}#page-settings.settings-redesign-v1014 .settings-export-grid,#page-settings.settings-redesign-v1014 .brc-status-grid-v1013{grid-template-columns:1fr!important}#page-settings.settings-redesign-v1014 .settings-section-head{flex-direction:row!important}#page-settings.settings-redesign-v1014 .settings-section-head>.btn{width:auto!important;flex:0 0 auto}.settings-panel-v1014>.settings-section-card{padding:13px!important}}';
    document.head.appendChild(style);
  }

  function statusSnapshot(){
    return safe(function(){
      return window.farmBackupRestoreControlCenterV1013.status();
    }, null);
  }

  function refreshSummary(){
    const host = q('#settings-summary-v1014');
    if (!host) return;
    const status = statusSnapshot();
    const online = !!(status && status.central && status.central.ready);
    const total = status && status.current ? status.current.total : 0;
    const latest = status && status.latest ? status.latest : null;
    const latestText = latest && latest.createdAt
      ? new Intl.DateTimeFormat('th-TH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(latest.createdAt))
      : 'ยังไม่มี';
    host.innerHTML =
      '<div class="settings-summary-item-v1014"><span class="settings-summary-dot-v1014" style="background:' + (online ? '#2fa24b' : '#d59a25') + '"></span><span>ระบบ</span><b>' + (online ? 'ออนไลน์' : 'กำลังตรวจสอบ') + '</b></div>' +
      '<div class="settings-summary-item-v1014"><span>ข้อมูล</span><b>' + total + ' รายการ</b></div>' +
      '<div class="settings-summary-item-v1014"><span>Backup ล่าสุด</span><b>' + latestText + '</b></div>';
  }

  function panel(id){ return q('#settings-panel-' + id + '-v1014'); }

  function setTab(id, options){
    const next = TAB_IDS.indexOf(id) >= 0 ? id : 'general';
    activeTab = next;
    qa('.settings-tab-v1014').forEach(function(button){
      const selected = button.dataset.tab === next;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
    TAB_IDS.forEach(function(tabId){
      const item = panel(tabId);
      if (item) item.hidden = tabId !== next;
    });
    if (!(options && options.remember === false)) safe(function(){ sessionStorage.setItem(STORAGE_KEY, next); });
    if (options && options.focus) {
      const selectedButton = q('.settings-tab-v1014[data-tab="' + next + '"]');
      if (selectedButton) selectedButton.focus();
    }
    refreshSummary();
    return next;
  }

  function onTabKeydown(event){
    const current = TAB_IDS.indexOf(event.currentTarget.dataset.tab);
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % TAB_IDS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + TAB_IDS.length) % TAB_IDS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_IDS.length - 1;
    else return;
    event.preventDefault();
    setTab(TAB_IDS[next], { focus:true });
  }

  function ensureShell(page){
    const mainGrid = q('.settings-main-grid', page);
    if (!mainGrid) return null;
    let tabs = q('#settings-tabs-v1014');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.id = 'settings-tabs-v1014';
      tabs.className = 'settings-tabs-v1014';
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'หมวดการตั้งค่า');
      TAB_IDS.forEach(function(id){
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'settings-tab-' + id + '-v1014';
        button.className = 'settings-tab-v1014';
        button.dataset.tab = id;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'settings-panel-' + id + '-v1014');
        button.textContent = TAB_LABELS[id];
        button.addEventListener('click', function(){ setTab(id); });
        button.addEventListener('keydown', onTabKeydown);
        tabs.appendChild(button);
      });
      mainGrid.parentNode.insertBefore(tabs, mainGrid);
    }
    TAB_IDS.forEach(function(id){
      if (panel(id)) return;
      const item = document.createElement('div');
      item.id = 'settings-panel-' + id + '-v1014';
      item.className = 'settings-panel-v1014';
      item.setAttribute('role', 'tabpanel');
      item.setAttribute('aria-labelledby', 'settings-tab-' + id + '-v1014');
      mainGrid.appendChild(item);
    });
    return mainGrid;
  }

  function rememberStaticCards(page){
    if (page.__v1014Cards) return page.__v1014Cards;
    page.__v1014Cards = {
      farm:q('#st-farm-name', page)?.closest('.settings-section-card'),
      exportCard:q('.settings-export-grid', page)?.closest('.settings-section-card'),
      workflow:q('#st-shelf-life', page)?.closest('.settings-section-card'),
      status:q('#settings-storage-summary', page)?.closest('.settings-section-card'),
      workers:q('#worker-list', page)?.closest('.settings-section-card'),
      plots:q('#plot-list', page)?.closest('.settings-section-card'),
      danger:q('.settings-danger-zone', page)
    };
    if (page.__v1014Cards.exportCard) page.__v1014Cards.exportCard.classList.add('settings-export-card-v1014');
    return page.__v1014Cards;
  }

  function targetTab(card, cards){
    if (card === cards.farm || card === cards.workers || card === cards.plots) return 'general';
    if (card === cards.workflow) return 'workflow';
    if (card === cards.exportCard || card === cards.danger) return 'backup';
    if (card === cards.status) return 'system';
    const id = card.id || '';
    if (/^backup-restore-control-center-v1013$/i.test(id)) return 'backup';
    if (/auto-backup|restore-audit|data-health|data-stability|firebase|storage|adapter/i.test(id)) return 'system';
    if (/backup|restore/i.test(id)) return 'backup';
    return 'system';
  }

  function improveDangerZone(danger){
    if (!danger || danger.dataset.v1014Ready) return;
    danger.dataset.v1014Ready = 'true';
    const exportButton = q('button[onclick*="exportData"]', danger);
    const importButton = q('button[onclick*="importDataPrompt"]', danger);
    const clearButton = q('button[onclick*="clearAllData"]', danger);
    if (exportButton) exportButton.hidden = true;
    if (importButton) importButton.hidden = true;
    const note = q('.app-soft-note', danger);
    const body = clearButton && clearButton.parentElement;
    const details = document.createElement('details');
    details.className = 'settings-danger-v1014';
    details.innerHTML = '<summary>Danger Zone — ล้างข้อมูลในเครื่อง</summary><div class="settings-danger-actions-v1014"></div>';
    const actions = q('.settings-danger-actions-v1014', details);
    if (clearButton) actions.appendChild(clearButton);
    if (note) {
      note.style.display = 'block';
      actions.appendChild(note);
    }
    if (body) body.hidden = true;
    danger.appendChild(details);
    const title = q('.settings-section-title', danger);
    const sub = q('.settings-section-sub', danger);
    if (title) title.textContent = 'การจัดการข้อมูลขั้นสูง';
    if (sub) sub.textContent = 'คำสั่งล้างข้อมูลถูกซ่อนไว้เพื่อป้องกันการกดโดยไม่ตั้งใจ';
  }

  function improveBackupCard(){
    const card = q('#backup-restore-control-center-v1013');
    if (!card) return;
    const title = q('.settings-section-title', card);
    const sub = q('.settings-section-sub', card);
    if (title) title.textContent = 'สำรองและกู้คืนข้อมูล';
    if (sub) sub.textContent = 'ตรวจสถานะ สร้าง Backup และ Preview ก่อนกู้คืน';
    const counts = q('.brc-counts-v1013', card);
    if (counts && !counts.closest('.settings-backup-details-v1014')) {
      const details = document.createElement('details');
      details.className = 'settings-backup-details-v1014';
      details.innerHTML = '<summary>ดูจำนวนข้อมูลแยกตามหมวด</summary>';
      counts.parentNode.insertBefore(details, counts);
      details.appendChild(counts);
    }
  }

  function improveSystemCard(card){
    if (!card || card.classList.contains('settings-system-card-v1014')) return;
    card.classList.add('settings-system-card-v1014');
    const head = q('.settings-section-head', card);
    if (!head) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-details-toggle-v1014';
    button.textContent = 'ดูรายละเอียด';
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', function(){
      const expanded = card.classList.toggle('is-expanded');
      button.textContent = expanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด';
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    head.appendChild(button);
  }

  function organize(){
    if (organizing) return;
    const page = q('#page-settings');
    if (!page) return;
    organizing = true;
    safe(function(){
      ensureStyle();
      page.classList.add('settings-redesign-v1014');
      const hero = q('.settings-hero', page);
      if (hero) {
        const title = q('.settings-hero-title', hero);
        const sub = q('.settings-hero-sub', hero);
        if (title) title.textContent = 'ตั้งค่า';
        if (sub) sub.textContent = 'เลือกเฉพาะหมวดที่ต้องการจัดการ';
        let summary = q('#settings-summary-v1014', hero);
        if (!summary) {
          summary = document.createElement('div');
          summary.id = 'settings-summary-v1014';
          summary.className = 'settings-summary-v1014';
          hero.insertBefore(summary, q('.settings-hero-badge', hero));
        }
      }
      const cards = rememberStaticCards(page);
      const mainGrid = ensureShell(page);
      if (!mainGrid) return;
      qa('#page-settings .settings-section-card,#page-settings #auto-backup-v0682,#page-settings #data-health-gate-v103,#page-settings #restore-audit-v103').forEach(function(card){
        const tabId = targetTab(card, cards);
        const host = panel(tabId);
        if (host && card.parentElement !== host) host.appendChild(card);
      });
      qa(':scope > .app-settings-stack', mainGrid).forEach(function(wrapper){ wrapper.remove(); });
      improveDangerZone(cards.danger);
      improveBackupCard();
      qa('#settings-panel-system-v1014 > .settings-section-card').forEach(improveSystemCard);
      const badge = q('.settings-hero-badge', page);
      if (badge) badge.textContent = 'V1.0.14';
      refreshSummary();
      setTab(activeTab, { remember:false });
    });
    organizing = false;
  }

  function boot(){
    activeTab = safe(function(){ return sessionStorage.getItem(STORAGE_KEY); }, 'general');
    if (TAB_IDS.indexOf(activeTab) < 0) activeTab = 'general';
    organize();
    const page = q('#page-settings');
    if (page && window.MutationObserver && !observer) {
      observer = new MutationObserver(function(){
        window.clearTimeout(observer._timer);
        observer._timer = window.setTimeout(organize, 80);
      });
      observer.observe(page, { childList:true, subtree:true });
    }
    [250, 900, 2200, 5000, 10000].forEach(function(delay){ window.setTimeout(organize, delay); });
  }

  window.farmSettingsRedesignV1014 = {
    version:VERSION,
    tabs:TAB_IDS.slice(),
    setTab:setTab,
    getTab:function(){ return activeTab; },
    organize:organize,
    refreshSummary:refreshSummary
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
