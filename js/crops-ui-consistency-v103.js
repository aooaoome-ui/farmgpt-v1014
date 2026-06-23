/* V1.0.3 Crops split
   Extracted from farm_management_V0_6_87_dashboard_activities_split.html. Keep original global API names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let stampTimer = 0;
  let versionObserver = null;
  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.sidebar-logo').forEach(function(el){
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V0\.6\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V0\.6\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V0\.6\.\d+/g, VERSION);
      });
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.farm-badge,.sidebar-logo').forEach(function(el){
        if(/V0\.6\.\d+/.test(el.innerHTML || '')) el.innerHTML = el.innerHTML.replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function setText(selector, text){
    const el = document.querySelector(selector);
    if(el) el.textContent = text;
  }
  function setPlaceholder(selector, text){
    const el = document.querySelector(selector);
    if(el) el.setAttribute('placeholder', text);
  }
  function trimCropsText(){
    setText('#page-crops .app-page-title', 'จัดการพืชผล');
    setText('#page-crops .app-page-subtitle', 'ติดตามสถานะพืช แปลง วันปลูก ผลผลิต และรายการที่ต้องดู');
    setText('#page-crops .app-panel-title', 'รายการพืชผล');
    setText('#page-crops .app-panel-sub', 'ค้นหา กรอง และกดดูรายละเอียดเฉพาะรายการที่ต้องการ');
    setText('#page-crops .app-tip-title', 'พืชที่ต้องดู');
    setText('#page-crops .app-tip-text', 'รวมรายการเสียหาย พร้อมเก็บ ใกล้เก็บ หรือไม่ได้อัปเดตนาน');
    setText('#page-crops .crop-modal-guide', 'กรอกข้อมูลหลักก่อน รายละเอียดอื่นเติมภายหลังได้');
    setPlaceholder('#search-crops', 'ค้นหาพืช แปลง สถานะ...');
    setPlaceholder('#crop-name', 'เช่น ผักคะน้า');
    setPlaceholder('#crop-plot', 'เช่น A1-A3');
    setPlaceholder('#crop-note', 'ปัญหา ข้อสังเกต หรือสิ่งที่ต้องติดตาม');
    document.querySelectorAll('#page-crops .crop-toolbar-reset').forEach(function(btn){
      if((btn.textContent || '').trim().length > 0) btn.textContent = 'ล้างตัวกรอง';
    });
    const addBtn = document.querySelector('#page-crops .app-head-actions .btn-primary');
    if(addBtn) addBtn.textContent = '+ เพิ่มพืชผล';
  }
  function applyCropsUi(){
    safe(function(){
      const page = document.getElementById('page-crops');
      if(page) page.classList.add('crops-ui-v0679');
      document.body.classList.add('crops-ui-v0679-active');
      document.querySelectorAll('#page-crops button,#modal-crop button,#modal-harvest-log button').forEach(function(btn){
        if(!btn.getAttribute('type')) btn.setAttribute('type','button');
      });
      trimCropsText();
      stamp();
    });
  }
  function wrapRender(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0679CropsUi) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      applyCropsUi();
      window.setTimeout(applyCropsUi, 80);
      return result;
    };
    wrapped.__v0679CropsUi = true;
    window[name] = wrapped;
    if(name === 'renderCrops') safe(function(){ renderCrops = wrapped; });
  }
  function boot(){
    wrapRender('renderCrops');
    applyCropsUi();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 120);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(function(){ stamp(); applyCropsUi(); }, 0);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    window.setTimeout(applyCropsUi, 700);
    window.setTimeout(applyCropsUi, 2200);
  }
  window.farmCropsUiConsistencyV0679 = { boot, applyCropsUi, trimCropsText, stamp };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 10000);
  });
})();
