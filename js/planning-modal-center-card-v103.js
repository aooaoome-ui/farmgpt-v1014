/* V1.0.3 JS split: Planning Modal Center Card + Script Leak Guard.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function centerModal(){
    const modal = document.getElementById('modal-planting-plan');
    if(!modal) return;
    modal.classList.add('fp-center-card-modal');
    if(modal.classList.contains('open')) document.body.classList.add('modal-open');
    setTimeout(()=>{
      const card = modal.querySelector('.farm-plan-create-modal');
      if(card) card.scrollTop = 0;
    }, 0);
  }
  function wrapOpen(){
    const oldOpen = window.openPlantingPlanModal;
    if (typeof oldOpen === 'function' && !oldOpen.__centerCardV0612) {
      const wrapped = function(reset=true){
        oldOpen.call(this, reset);
        centerModal();
      };
      wrapped.__centerCardV0612 = true;
      window.openPlantingPlanModal = wrapped;
    }
  }
  function wrapClose(){
    const oldClose = window.closePlantingPlanModal;
    if (typeof oldClose === 'function' && !oldClose.__centerCardV0612) {
      const wrappedClose = function(){
        oldClose.call(this);
        document.body.classList.remove('modal-open');
      };
      wrappedClose.__centerCardV0612 = true;
      window.closePlantingPlanModal = wrappedClose;
    }
  }
  function guardBackdropScroll(){
    const modal = document.getElementById('modal-planting-plan');
    if(!modal || modal.__fpBackdropGuardV0614) return;
    modal.__fpBackdropGuardV0614 = true;
    modal.addEventListener('click', function(e){
      if(e.target === modal){ e.preventDefault(); e.stopPropagation(); }
    }, true);
    const sync = function(){
      if(modal.classList.contains('open')) document.body.classList.add('modal-open');
      else document.body.classList.remove('modal-open');
    };
    new MutationObserver(sync).observe(modal, {attributes:true, attributeFilter:['class']});
    sync();
  }
  function apply(){ wrapOpen(); wrapClose(); guardBackdropScroll(); }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', apply);
  console.log('✅ Farm Planning Modal Center Card + Scroll Guard ready', VERSION);
})();
