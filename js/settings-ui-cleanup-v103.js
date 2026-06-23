/* V1.0.3 Settings UI Cleanup
   Frontend-only cleanup for the Settings page. Keeps data, save/load, and storage behavior unchanged. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let stampTimer = 0;
  let observerReady = false;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function ensureStyle(){
    if(q('#settings-ui-cleanup-v103-style')) return;
    const style = document.createElement('style');
    style.id = 'settings-ui-cleanup-v103-style';
    style.textContent =
      '#page-settings.settings-ui-v103{--set-gap:12px;--set-radius:12px}' +
      '#page-settings.settings-ui-v103 .settings-hero{padding:14px 16px;border-radius:14px;margin-bottom:12px;background:#fbfdf9;color:#132015;border:1px solid #dfe9dd;box-shadow:none}' +
      '#page-settings.settings-ui-v103 .settings-hero-title{font-size:20px;margin:0 0 2px}' +
      '#page-settings.settings-ui-v103 .settings-hero-sub{font-size:12px;line-height:1.45;color:#667263;max-width:720px}' +
      '#page-settings.settings-ui-v103 .settings-hero-badge{background:#f4fbf1;color:#1c6a2d;border-color:#cfe6ca;padding:7px 10px}' +
      '#page-settings.settings-ui-v103 .settings-kpi-row{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}' +
      '#page-settings.settings-ui-v103 .settings-mini-card{min-height:auto;border-radius:12px;padding:10px 12px;box-shadow:none}' +
      '#page-settings.settings-ui-v103 .settings-mini-icon{width:30px;height:30px;border-radius:10px;font-size:15px}' +
      '#page-settings.settings-ui-v103 .settings-mini-head{font-size:11.5px;margin-bottom:5px}' +
      '#page-settings.settings-ui-v103 .settings-mini-value{font-size:22px}' +
      '#page-settings.settings-ui-v103 .settings-mini-note{font-size:10.5px;margin-top:2px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;align-items:stretch}' +
      '#page-settings.settings-ui-v103 .settings-group-label-v103{display:none!important}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack,' +
      '#page-settings.settings-ui-v103 .settings-main-grid>aside.app-settings-stack{display:contents}' +
      '#page-settings.settings-ui-v103 .settings-main-grid .settings-section-card,' +
      '#page-settings.settings-ui-v103 #auto-backup-v0682,' +
      '#page-settings.settings-ui-v103 #data-health-gate-v103,' +
      '#page-settings.settings-ui-v103 #restore-audit-v103{grid-column:span 4;min-height:232px;height:100%;display:flex;flex-direction:column}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(1){order:10;grid-column:span 8;min-height:254px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>aside.app-settings-stack>.settings-section-card:nth-of-type(1){order:20;grid-column:span 4;min-height:254px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(2){order:30;grid-column:span 8;min-height:280px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>aside.app-settings-stack>.settings-section-card:nth-of-type(2){order:40;grid-column:span 4;min-height:280px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(3){order:50;grid-column:span 8;min-height:330px}' +
      '#page-settings.settings-ui-v103 .settings-main-grid>aside.app-settings-stack>.settings-section-card:nth-of-type(3){order:60;grid-column:span 4;min-height:232px}' +
      '#page-settings.settings-ui-v103 #auto-backup-v0682{order:70;grid-column:span 4;min-height:260px}' +
      '#page-settings.settings-ui-v103 #data-health-gate-v103{order:55;grid-column:span 4;min-height:330px}' +
      '#page-settings.settings-ui-v103 #restore-audit-v103{order:90;grid-column:span 8;min-height:260px}' +
      '#page-settings.settings-ui-v103 .settings-danger-zone{order:100!important;grid-column:span 4!important;min-height:260px}' +
      '#page-settings.settings-ui-v103 .settings-section-card,' +
      '#page-settings.settings-ui-v103 .settings-domain-panel,' +
      '#page-settings.settings-ui-v103 #settings-notification-behavior-v0670,' +
      '#page-settings.settings-ui-v103 #settings-overstock-window-v0676{border-radius:var(--set-radius)!important;padding:14px;box-shadow:none;border-color:#e2e9e1}' +
      '#page-settings.settings-ui-v103 .settings-section-card>*:last-child{margin-bottom:0}' +
      '#page-settings.settings-ui-v103 .settings-section-head{margin-bottom:10px;gap:10px;align-items:flex-start}' +
      '#page-settings.settings-ui-v103 .settings-section-title,' +
      '#page-settings.settings-ui-v103 .settings-domain-title{font-size:15px;line-height:1.25}' +
      '#page-settings.settings-ui-v103 .settings-section-sub,' +
      '#page-settings.settings-ui-v103 .settings-domain-sub,' +
      '#page-settings.settings-ui-v103 #settings-notification-behavior-v0670 .behavior-sub,' +
      '#page-settings.settings-ui-v103 #settings-overstock-window-v0676 .overstock-setting-help-v0676{font-size:11px;line-height:1.35;color:#71806f;max-width:620px}' +
      '#page-settings.settings-ui-v103 .settings-export-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
      '#page-settings.settings-ui-v103 .settings-export-btn{border-radius:10px;padding:9px 10px;min-height:52px}' +
      '#page-settings.settings-ui-v103 .settings-export-btn strong{font-size:12px}' +
      '#page-settings.settings-ui-v103 .settings-export-btn span{font-size:10px;margin-top:1px}' +
      '#page-settings.settings-ui-v103 .settings-chip-wrap{gap:6px;padding:2px 0 6px;min-height:72px;align-content:flex-start}' +
      '#page-settings.settings-ui-v103 .settings-chip-wrap span{font-size:11px;padding:5px 8px;border-radius:9px}' +
      '#page-settings.settings-ui-v103 .settings-cloud-box{font-size:11px;line-height:1.45;border-radius:10px;padding:10px;background:#fbfdf9}' +
      '#page-settings.settings-ui-v103 .settings-list-card{font-size:11px;padding:8px 10px;border-radius:10px}' +
      '#page-settings.settings-ui-v103 .backup-v0682-list{max-height:118px;overflow:auto;padding-right:2px}' +
      '#page-settings.settings-ui-v103 .backup-v0682-row{padding:8px 9px;border-radius:10px}' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-grid{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-row div{display:grid;gap:2px}' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-row{padding:7px 8px}' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-row b{font-size:12px}' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-row span,' +
      '#page-settings.settings-ui-v103 .data-health-gate-v103-row em{font-size:10px}' +
      '#page-settings.settings-ui-v103 .restore-audit-v103-grid{grid-template-columns:repeat(4,minmax(0,1fr));margin:10px 0}' +
      '#page-settings.settings-ui-v103 .form-label{font-size:11.5px;margin-bottom:5px}' +
      '#page-settings.settings-ui-v103 .form-control,' +
      '#page-settings.settings-ui-v103 input,' +
      '#page-settings.settings-ui-v103 select,' +
      '#page-settings.settings-ui-v103 textarea{font-size:12px;border-radius:9px}' +
      '#page-settings.settings-ui-v103 .app-soft-note{font-size:11px;line-height:1.35;margin-top:8px!important}' +
      '#page-settings.settings-ui-v103 .btn{border-radius:10px;font-size:12px;padding:8px 11px}' +
      '.logo-version{font-weight:900;color:#86efac!important;letter-spacing:0}' +
      '.farm-badge{font-size:12px}' +
      '.farm-badge .badge-text,.farm-badge small{font-weight:800}' +
      '@media(max-width:1180px){#page-settings.settings-ui-v103 .settings-main-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#page-settings.settings-ui-v103 .settings-main-grid .settings-section-card,#page-settings.settings-ui-v103 #auto-backup-v0682,#page-settings.settings-ui-v103 #data-health-gate-v103,#page-settings.settings-ui-v103 #restore-audit-v103{grid-column:auto!important}#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(1),#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(2),#page-settings.settings-ui-v103 .settings-main-grid>.app-settings-stack>.settings-section-card:nth-of-type(3),#page-settings.settings-ui-v103 #data-health-gate-v103,#page-settings.settings-ui-v103 #restore-audit-v103{grid-column:span 2!important}}' +
      '@media(max-width:980px){#page-settings.settings-ui-v103 .settings-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}#page-settings.settings-ui-v103 .settings-main-grid{grid-template-columns:1fr}#page-settings.settings-ui-v103 .settings-main-grid .settings-section-card,#page-settings.settings-ui-v103 #auto-backup-v0682,#page-settings.settings-ui-v103 #data-health-gate-v103,#page-settings.settings-ui-v103 #restore-audit-v103{grid-column:1/-1!important;min-height:auto!important}}' +
      '@media(max-width:640px){#page-settings.settings-ui-v103 .settings-hero{grid-template-columns:1fr;padding:12px}#page-settings.settings-ui-v103 .settings-kpi-row,#page-settings.settings-ui-v103 .settings-export-grid,#page-settings.settings-ui-v103 .data-health-gate-v103-grid,#page-settings.settings-ui-v103 .restore-audit-v103-grid{grid-template-columns:1fr}#page-settings.settings-ui-v103 .settings-section-head{flex-direction:column}#page-settings.settings-ui-v103 .settings-section-head .btn{width:100%}}';
    document.head.appendChild(style);
  }

  function setText(selector, text){
    const el = q(selector);
    if(el) el.textContent = text;
  }

  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V\d+\.\d+\.\d+/g, VERSION);
      qa('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.farm-badge *,.sidebar-logo,.logo-sub').forEach(function(el){
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V\d+\.\d+\.\d+/.test(node.nodeValue || '')){
            node.nodeValue = node.nodeValue.replace(/V\d+\.\d+\.\d+/g, VERSION);
          }
        });
        if(el.children.length === 0 && /V\d+\.\d+\.\d+/.test(el.textContent || '')){
          el.textContent = el.textContent.replace(/V\d+\.\d+\.\d+/g, VERSION);
        }
      });
      qa('.logo-version,[data-app-version]').forEach(function(el){
        el.textContent = VERSION;
        el.setAttribute('data-app-version', VERSION);
      });
    });
  }

  function trimSettingsText(){
    setText('#page-settings .settings-hero-sub', 'ตั้งค่าข้อมูลฟาร์ม Export Backup และความปลอดภัยในหน้าเดียว');
    setText('#page-settings .settings-hero-badge', 'Local · ' + VERSION);
    setText('#page-settings .settings-section-card:nth-of-type(1) .settings-section-sub', 'ชื่อ ที่ตั้ง และข้อมูลบนเอกสาร');
    setText('#page-settings .settings-section-card:nth-of-type(2) .settings-section-sub', 'ส่งออกข้อมูลแยกตามเมนู');
    setText('#page-settings .settings-section-card:nth-of-type(3) .settings-section-sub', 'ค่าเริ่มต้นของคลัง แผน และแจ้งเตือน');
    setText('#page-settings aside .settings-section-card:nth-of-type(1) .settings-section-sub', 'บันทึกในเครื่องเท่านั้น');
    setText('#page-settings aside .settings-section-card:nth-of-type(2) .settings-section-sub', 'ใช้ในกิจกรรม');
    setText('#page-settings aside .settings-section-card:nth-of-type(3) .settings-section-sub', 'ใช้ในฟอร์มพืชและกิจกรรม');
    setText('#page-settings aside .settings-section-card:nth-of-type(4) .settings-section-sub', 'สำรอง ย้ายเครื่อง หรือรีเซ็ต');
    setText('#settings-default-groups-v0669 .stock .settings-domain-sub', 'อายุผลผลิตและเตือนคลัง');
    setText('#settings-default-groups-v0669 .plan .settings-domain-sub', 'เตือนแผนปลูก วัสดุ และภารกิจ');
    setText('#settings-notification-lead-v0668 .notify-lead-sub', 'จำนวนวันแจ้งเตือนล่วงหน้า');
    setText('#settings-notification-behavior-v0670 .behavior-sub', 'การแสดงภารกิจและปุ่ม action');
    setText('#settings-overstock-window-v0676 .overstock-setting-help-v0676', 'ใช้กับผลผลิตที่ต้องดูแลและแจ้งเตือน');
    qa('#page-settings .settings-export-btn span').forEach(function(el){
      const text = (el.textContent || '').trim();
      if(text.length > 24) el.textContent = text.replace(/\s*และ\s*/g, ' / ').slice(0, 24).trim();
    });
  }

  function applySettingsUi(){
    safe(function(){
      ensureStyle();
      const page = q('#page-settings');
      if(page) page.classList.add('settings-ui-v0678','settings-ui-v103');
      document.body.classList.add('settings-ui-v103-active');
      qa('#page-settings button').forEach(function(btn){
        if(!btn.getAttribute('type')) btn.setAttribute('type','button');
      });
      trimSettingsText();
      stamp();
    });
  }

  function wrapRenderSettings(){
    const oldRender = window.renderSettings;
    if(typeof oldRender !== 'function' || oldRender.__v103SettingsUi) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      applySettingsUi();
      window.setTimeout(applySettingsUi, 120);
      return result;
    };
    wrapped.__v103SettingsUi = true;
    window.renderSettings = wrapped;
    safe(function(){ renderSettings = wrapped; });
  }

  function installObserver(){
    if(observerReady || !window.MutationObserver) return;
    const page = q('#page-settings');
    if(!page) return;
    observerReady = true;
    const observer = new MutationObserver(function(){
      window.clearTimeout(observer._timer);
      observer._timer = window.setTimeout(applySettingsUi, 120);
    });
    observer.observe(page, { childList:true, subtree:true });
  }

  function boot(){
    wrapRenderSettings();
    applySettingsUi();
    installObserver();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 1400);
    window.setTimeout(applySettingsUi, 900);
    window.setTimeout(applySettingsUi, 2400);
  }

  window.farmSettingsUiCleanupV103 = { boot, applySettingsUi, trimSettingsText, stamp, version:VERSION };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 10000);
  });
})();
