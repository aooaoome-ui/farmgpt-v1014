/* V1.0.3 Settings Notification Groups
   Extracted from farm_management_V0_6_84_ui_js_split.html for V1.0.3 Settings split.
   Original script line: 20847. Keep wrapper order and global function names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function fieldByInput(id){
    const input = document.getElementById(id);
    return input ? input.closest('.form-group') : null;
  }
  function ensureLayout(card, grid){
    let layout = document.getElementById('settings-default-groups-v0669');
    if(layout) return layout;
    layout = document.createElement('div');
    layout.id = 'settings-default-groups-v0669';
    layout.innerHTML =
      '<section class="settings-domain-panel stock">' +
        '<div class="settings-domain-head"><div><div class="settings-domain-title">เมนูคลังผลผลิต-วัสดุ</div><div class="settings-domain-sub">ตั้งค่าอายุไขในสต็อก การเตือนผลผลิต และเกณฑ์วัสดุใกล้หมด</div></div><span class="settings-domain-chip">คลัง</span></div>' +
        '<div class="settings-domain-fields" id="settings-stock-fields-v0669"></div>' +
      '</section>' +
      '<section class="settings-domain-panel plan">' +
        '<div class="settings-domain-head"><div><div class="settings-domain-title">เมนูแผนงานฟาร์ม / ปฏิทิน</div><div class="settings-domain-sub">ตั้งค่าการแจ้งเตือนของแผนปลูก แผนผลิตวัสดุ ภารกิจหน้าแดชบอร์ด และงานตามกำหนด</div></div><span class="settings-domain-chip">แผนงาน</span></div>' +
        '<div class="settings-domain-fields" id="settings-plan-fields-v0669"></div>' +
      '</section>';
    grid.insertAdjacentElement('beforebegin', layout);
    return layout;
  }
  function moveIfFound(slot, node, extraClass){
    if(!slot || !node) return;
    if(extraClass) node.classList.add(extraClass);
    slot.appendChild(node);
  }
  function organizeDefaultNotificationSettings(){
    safe(function(){
      if(window.farmNotificationLeadSettingsV0668 && typeof window.farmNotificationLeadSettingsV0668.injectSettingsControls === 'function'){
        window.farmNotificationLeadSettingsV0668.injectSettingsControls();
      }
    });
    const shelfLifeInput = document.getElementById('st-shelf-life');
    const card = shelfLifeInput && shelfLifeInput.closest('.settings-section-card');
    if(!card) return;
    const sub = card.querySelector('.settings-section-sub');
    if(sub) sub.textContent = 'แยกค่าของคลังผลผลิต-วัสดุออกจากแผนงานฟาร์มและปฏิทิน เพื่อลดความสับสนเวลาใช้งาน';
    const grid = card.querySelector('.form-grid');
    if(!grid) return;
    const layout = ensureLayout(card, grid);
    const stockSlot = layout.querySelector('#settings-stock-fields-v0669');
    const planSlot = layout.querySelector('#settings-plan-fields-v0669');
    moveIfFound(stockSlot, fieldByInput('st-shelf-life'));
    moveIfFound(stockSlot, fieldByInput('st-alert-pct'));
    moveIfFound(stockSlot, fieldByInput('st-harvest-warn-days'));
    const shelfByType = document.getElementById('shelf-by-type-list');
    if(shelfByType) moveIfFound(stockSlot, shelfByType.parentElement, 'full');
    moveIfFound(planSlot, fieldByInput('st-project-warn-days'));
    moveIfFound(planSlot, document.getElementById('settings-notification-lead-v0668'));
    grid.style.display = 'none';
  }
  function install(){
    const oldRenderSettings = window.renderSettings;
    if(typeof oldRenderSettings === 'function' && !oldRenderSettings.__v0669SettingsGroups){
      const wrappedRenderSettings = function(){
        const result = oldRenderSettings.apply(this, arguments);
        organizeDefaultNotificationSettings();
        return result;
      };
      wrappedRenderSettings.__v0669SettingsGroups = true;
      window.renderSettings = wrappedRenderSettings;
      safe(function(){ renderSettings = wrappedRenderSettings; });
    }
  }
  window.farmSettingsNotificationGroupsV0669 = {
    organize: organizeDefaultNotificationSettings
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      install();
      organizeDefaultNotificationSettings();
      safe(function(){ document.title = document.title.replace(/V0\.6\.\d+/, VERSION); });
      console.log('Settings notification groups ready', VERSION);
    }, 7000);
  });
})();
