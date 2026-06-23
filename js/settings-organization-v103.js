/* V1.0.3 Settings organization layer.
   Groups the existing settings cards without changing data or save behavior. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const $ = (selector, root) => (root || document).querySelector(selector);

  function ensureStyle(){
    if($('#settings-organization-v103-style')) return;
    const style = document.createElement('style');
    style.id = 'settings-organization-v103-style';
    style.textContent =
      '#page-settings .settings-group-label-v103{display:flex;align-items:center;gap:8px;margin:4px 0 2px;padding:0 2px;color:#456054;font-size:12px;font-weight:800}' +
      '#page-settings .settings-group-label-v103::after{content:"";height:1px;flex:1;background:#dce7df}' +
      '#page-settings .settings-safety-card-v103{border-color:#bfd9c7;background:#fcfffd}' +
      '#page-settings .settings-danger-zone{margin-top:4px;border-color:#efc6c6;background:#fffdfd}' +
      '#page-settings .settings-main-grid{align-items:start}' +
      '#page-settings .app-settings-stack{gap:10px}' +
      '#page-settings .data-health-gate-v103-status.ready{background:#eaf8ed;color:#16733b;border-color:#b6dfc1}' +
      '@media(max-width:760px){#page-settings .settings-group-label-v103{margin-top:8px}#page-settings .settings-section-head{gap:8px;align-items:flex-start}#page-settings .settings-section-head .btn{flex:0 0 auto}}';
    document.head.appendChild(style);
  }

  function ensureLabel(parent, before, id, text){
    if(!parent || !before || document.getElementById(id)) return;
    const label = document.createElement('div');
    label.id = id;
    label.className = 'settings-group-label-v103';
    label.textContent = text;
    parent.insertBefore(label, before);
  }

  function organize(){
    ensureStyle();
    const page = $('#page-settings');
    if(!page) return;
    page.classList.add('settings-organized-v103');
    const main = $('#page-settings .app-settings-stack');
    const aside = $('#page-settings aside.app-settings-stack');
    if(main && main.firstElementChild) ensureLabel(main, main.firstElementChild, 'settings-main-label-v103', 'ข้อมูลและการตั้งค่าการทำงาน');
    if(aside && aside.firstElementChild) ensureLabel(aside, aside.firstElementChild, 'settings-reference-label-v103', 'ระบบและข้อมูลอ้างอิง');
    const safety = $('#restore-audit-v103') || $('#auto-backup-panel-v103') || $('#data-health-gate-v103');
    if(aside && safety) ensureLabel(aside, safety, 'settings-safety-label-v103', 'ความปลอดภัยและสุขภาพข้อมูล');
    ['#restore-audit-v103','#auto-backup-panel-v103','#data-health-gate-v103'].forEach(selector => {
      const card = $(selector);
      if(card) card.classList.add('settings-safety-card-v103');
    });
    const danger = $('#page-settings .settings-danger-zone');
    if(aside && danger) ensureLabel(aside, danger, 'settings-danger-label-v103', 'สำรอง ย้ายเครื่อง และรีเซ็ต');
  }

  function boot(){
    organize();
    const page = $('#page-settings');
    if(page && window.MutationObserver){
      const observer = new MutationObserver(() => organize());
      observer.observe(page, { childList:true, subtree:true });
    }
    [120, 900, 2600, 7600].forEach(delay => window.setTimeout(organize, delay));
  }

  window.farmSettingsOrganizationV0906 = { version:VERSION, organize };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
