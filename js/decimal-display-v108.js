/* V1.0.8 Decimal Display Hotfix */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.8';
  const LONG_DECIMAL_TEST = /-?\d+\.\d{3,}(?!\d)/;
  const LONG_DECIMAL_RE = /-?\d+\.\d{3,}(?!\d)/g;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
  const WRAPPED_FUNCTIONS = [
    'renderDashboard',
    'renderCrops',
    'renderInv',
    'renderSales',
    'renderCalendar',
    'renderSettings',
    'openCropModal',
    'openInvModal',
    'openSaleModal',
    'editSaleItem',
    'openHarvestLogModal',
    '_buildProductOptions'
  ];

  let timer = 0;
  const metrics = {
    version: VERSION,
    runs: 0,
    textReplacements: 0,
    formReplacements: 0
  };

  function formatDecimal(raw){
    const number = Number(raw);
    if (!Number.isFinite(number)) return raw;
    const rounded = Math.round((number + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('en-US', {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function replaceLongDecimals(value, counterKey){
    const text = String(value ?? '');
    if (!LONG_DECIMAL_TEST.test(text)) return text;

    return text.replace(LONG_DECIMAL_RE, function(match){
      metrics[counterKey] += 1;
      return formatDecimal(match);
    });
  }

  function normalizeTextNodes(root){
    if (!root || !document.body) return;
    const scanRoot = root.nodeType === Node.ELEMENT_NODE ? root : document.body;
    const walker = document.createTreeWalker(scanRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return LONG_DECIMAL_TEST.test(node.nodeValue || '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      node.nodeValue = replaceLongDecimals(node.nodeValue, 'textReplacements');
    });
  }

  function normalizeFormValues(root){
    const scanRoot = root && root.querySelectorAll ? root : document;
    scanRoot.querySelectorAll('input, option').forEach(function(element){
      if (element.tagName === 'OPTION') {
        const nextText = replaceLongDecimals(element.textContent || '', 'formReplacements');
        if (nextText !== element.textContent) element.textContent = nextText;
        return;
      }

      const type = (element.getAttribute('type') || 'text').toLowerCase();
      if (!['number', 'text', 'search'].includes(type)) return;

      const nextValue = replaceLongDecimals(element.value || '', 'formReplacements');
      if (nextValue !== element.value) element.value = nextValue;
    });
  }

  function applyAll(root){
    if (!document.body) return;
    metrics.runs += 1;
    normalizeTextNodes(root || document.body);
    normalizeFormValues(root || document);
  }

  function schedule(root){
    clearTimeout(timer);
    timer = setTimeout(function(){
      requestAnimationFrame(function(){
        applyAll(root || document.body);
      });
    }, 80);
  }

  function wrapFunction(name){
    const original = window[name];
    if (typeof original !== 'function' || original.__v108DecimalDisplay) return;

    const wrapped = function(){
      const result = original.apply(this, arguments);
      schedule(document.body);
      return result;
    };
    wrapped.__v108DecimalDisplay = true;
    wrapped.__v108Original = original;

    window[name] = wrapped;
    try {
      window.eval(name + ' = window["' + name + '"]');
    } catch (error) {
      // Some globals are not writable in every browser mode; the observer still covers render output.
    }
  }

  function boot(){
    WRAPPED_FUNCTIONS.forEach(wrapFunction);
    applyAll(document.body);

    if (!window.__v108DecimalDisplayObserver && window.MutationObserver) {
      window.__v108DecimalDisplayObserver = new MutationObserver(function(){
        schedule(document.body);
      });
      window.__v108DecimalDisplayObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    window.farmDecimalDisplayV108 = {
      formatDecimal,
      applyAll,
      metrics: function(){
        return Object.assign({}, metrics);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  setTimeout(boot, 1600);
})();
