/* V1.0.3 JS split: Care Task Editor Card Popup.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function ensureCareBackdrop(){
    const modal = document.getElementById('modal-planting-plan');
    if(!modal) return null;
    let backdrop = document.getElementById('fp-care-submodal-backdrop');
    if(!backdrop){
      backdrop = document.createElement('div');
      backdrop.id = 'fp-care-submodal-backdrop';
      backdrop.className = 'fp-care-submodal-backdrop';
      backdrop.addEventListener('click', function(){
        if(typeof window.cancelCareTaskEditor === 'function') window.cancelCareTaskEditor();
      });
      modal.appendChild(backdrop);
    }
    return backdrop;
  }
  function markOpen(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.add('care-card-open');
    ensureCareBackdrop();
    setTimeout(function(){ document.getElementById('fp-care-title')?.focus(); }, 40);
  }
  function markClosed(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.remove('care-card-open');
  }
  function wrapCareEditor(){
    const oldOpen = window.openCareTaskEditor;
    if(typeof oldOpen === 'function' && !oldOpen.__careCardV0612){
      const wrappedOpen = function(idx){ oldOpen.call(this, idx); ensureCareBackdrop(); markOpen(); };
      wrappedOpen.__careCardV0612 = true;
      window.openCareTaskEditor = wrappedOpen;
    }
    const oldCancel = window.cancelCareTaskEditor;
    if(typeof oldCancel === 'function' && !oldCancel.__careCardV0612){
      const wrappedCancel = function(){ oldCancel.call(this); markClosed(); };
      wrappedCancel.__careCardV0612 = true;
      window.cancelCareTaskEditor = wrappedCancel;
    }
    const oldClose = window.closePlantingPlanModal;
    if(typeof oldClose === 'function' && !oldClose.__careCardV0612){
      const wrappedClose = function(){ markClosed(); oldClose.call(this); };
      wrappedClose.__careCardV0612 = true;
      window.closePlantingPlanModal = wrappedClose;
    }
  }
  wrapCareEditor();
  document.addEventListener('DOMContentLoaded', function(){ ensureCareBackdrop(); wrapCareEditor(); console.log('✅ Farm Planning Care Task Editor Card ready', VERSION); });
})();
