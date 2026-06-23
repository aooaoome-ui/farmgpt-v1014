/* V1.0.3 JS split: Restore Planting Form Layout.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const safe = (fn)=>{ try{ return fn(); }catch(e){ console.warn(VERSION, e); } };
  function restorePlanningLayout(){
    const box = document.getElementById('fp-v0640-manager-check');
    const summary = document.getElementById('fp-plan-summary');
    if(summary && box && summary.nextElementSibling !== box){
      summary.insertAdjacentElement('afterend', box);
    }
    if(box && !box.querySelector('.fp-manager-toggle')){
      const head = box.querySelector('.fp-manager-check-head');
      if(head){
        head.insertAdjacentHTML('beforeend', '<button type="button" class="fp-manager-toggle" onclick="togglePlantingReadinessDetail()">ดูรายละเอียด</button>');
      }
    }
    if(box && !box.classList.contains('expanded')){
      const sub = box.querySelector('.fp-manager-check-sub');
      if(sub) sub.textContent = 'สรุปสถานะสำคัญแบบย่อ รายละเอียดเปิดดูได้เมื่อต้องการ';
    }
  }
  window.togglePlantingReadinessDetail = function(){
    const box = document.getElementById('fp-v0640-manager-check');
    if(!box) return;
    box.classList.toggle('expanded');
    const btn = box.querySelector('.fp-manager-toggle');
    if(btn) btn.textContent = box.classList.contains('expanded') ? 'ย่อรายละเอียด' : 'ดูรายละเอียด';
  };
  const oldDraft = window.renderPlantingDraft;
  if(typeof oldDraft === 'function' && !oldDraft.__v0641LayoutRestore){
    const wrapped = function(){
      const result = oldDraft.apply(this, arguments);
      setTimeout(restorePlanningLayout, 30);
      return result;
    };
    wrapped.__v0641LayoutRestore = true;
    window.renderPlantingDraft = wrapped;
  }
  const oldOpen = window.openPlantingPlanModal;
  if(typeof oldOpen === 'function' && !oldOpen.__v0641LayoutRestore){
    const wrapped = function(){
      const result = oldOpen.apply(this, arguments);
      setTimeout(restorePlanningLayout, 180);
      return result;
    };
    wrapped.__v0641LayoutRestore = true;
    window.openPlantingPlanModal = wrapped;
  }
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      restorePlanningLayout();
      safe(function(){ document.title = document.title.replace(/V0\.6\.\d+/, VERSION); });
      safe(function(){ document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; }); });
      safe(function(){ document.querySelectorAll('.badge-text span:last-child').forEach(function(el){ if(/V0\.6\./.test(el.textContent || '')) el.textContent = VERSION; }); });
      console.log('✅ ' + VERSION + ' Planting form layout restored');
    }, 1850);
  });
})();
