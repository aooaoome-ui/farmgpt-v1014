/* V1.0.3 JS split: Modal Scroll Recovery.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  function cleanup(){
    const hasOpen = !!document.querySelector('.modal-overlay.open');
    if(!hasOpen) document.body.classList.remove('modal-open');
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') cleanup();
  });
  window.addEventListener('pageshow', cleanup);
  window.addEventListener('load', cleanup);
})();
