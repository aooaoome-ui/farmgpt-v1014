/* V1.0.3 Inventory split
   Extracted from farm_management_V0_6_85_settings_split.html. Keep original global API names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let stampTimer = 0;
  let versionObserver = null;
  function safe(fn){ try{ return fn(); }catch(err){ console.warn(VERSION, err); } }
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
  function applyInventoryUi(){
    safe(function(){
      document.body.classList.add('inventory-ui-v0675-active');
      const page = document.getElementById('page-inventory');
      if(page) page.classList.add('inventory-ui-v0675');
      document.querySelectorAll('#page-inventory button,#modal-inv button,#modal-requisition button,#modal-export button').forEach(function(btn){
        if(!btn.getAttribute('type')) btn.setAttribute('type','button');
      });
      stamp();
    });
  }
  function wrapFunction(name){
    const oldFn = window[name];
    if(typeof oldFn !== 'function' || oldFn.__v0675InventoryUi) return;
    const wrapped = function(){
      const result = oldFn.apply(this, arguments);
      window.setTimeout(applyInventoryUi, 0);
      return result;
    };
    wrapped.__v0675InventoryUi = true;
    window[name] = wrapped;
    try{ eval(name + ' = wrapped'); }catch(e){}
  }
  function boot(){
    ['renderInv','switchInventoryTab','openInvModal','openInventoryAddItem','openRequisitionModal','closeModal'].forEach(wrapFunction);
    applyInventoryUi();
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 120);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(stamp, 0);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    window.setTimeout(applyInventoryUi, 800);
    window.setTimeout(applyInventoryUi, 2200);
  }
  window.farmInventoryUiConsistencyV0675 = { boot, applyInventoryUi, stamp };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 9800);
  });
})();
