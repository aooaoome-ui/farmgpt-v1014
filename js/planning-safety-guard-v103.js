/* V1.0.3 JS split: Script Leak / Modal Safety Guard.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function unlockIfSafe(){
    try{
      const anyOpen = document.querySelector('.modal.open, .fp-care-editor-backdrop.open, #modal-planting-plan.open, #fp-care-backdrop.open');
      if(!anyOpen){ document.body.classList.remove('modal-open'); document.documentElement.classList.remove('modal-open'); document.body.style.overflow=''; }
    }catch(e){}
  }
  function guardBackdropClicks(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal && !modal.__v0618BackdropGuard){
      modal.__v0618BackdropGuard = true;
      modal.addEventListener('click', function(e){ if(e.target === modal){ e.stopPropagation(); e.preventDefault(); } }, true);
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ guardBackdropClicks(); setTimeout(unlockIfSafe, 300); });
  window.addEventListener('load', function(){ guardBackdropClicks(); setTimeout(unlockIfSafe, 300); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setTimeout(unlockIfSafe, 80); }, true);
  console.log('✅ ' + VERSION + ' Safety Guard ready');
})();
