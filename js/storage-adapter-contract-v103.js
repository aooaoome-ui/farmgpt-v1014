/* V1.0.3 Storage Adapter Contract.
   Read-only contract for the future adapter/Firebase migration. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const LOCAL_KEY = 'farmData_v01';
  const PACK_KEYS = Object.freeze([
    'farmSettings',
    'cropItems', 'nextCropId',
    'actItems', 'nextActId',
    'invItems', 'nextInvId',
    'custItems', 'nextCustId',
    'salesData', '_nextSaleId',
    'goalItems',
    'calEventsArr', '_nextCalId',
    'reqItems', '_nextReqId',
    'projectItems', '_nextProjId',
    'plantingPlans', 'farmInputPlans', 'cropPlanTemplates', 'farmPlanHiddenCropNames',
    'savedAt'
  ]);

  const FIRESTORE_COLLECTIONS = Object.freeze([
    Object.freeze({ packKey:'projectItems', collection:'projects', idKey:'id' }),
    Object.freeze({ packKey:'cropItems', collection:'crops', idKey:'id' }),
    Object.freeze({ packKey:'actItems', collection:'activities', idKey:'id' }),
    Object.freeze({ packKey:'invItems', collection:'inventory', idKey:'id' }),
    Object.freeze({ packKey:'salesData', collection:'sales', idKey:'_id' }),
    Object.freeze({ packKey:'calEventsArr', collection:'calendarEvents', idKey:'id' }),
    Object.freeze({ packKey:'plantingPlans', collection:'plantingPlans', idKey:'id' }),
    Object.freeze({ packKey:'farmInputPlans', collection:'farmInputPlans', idKey:'id' })
  ]);

  function missingPackKeys(data){
    const src = data && typeof data === 'object' ? data : {};
    return PACK_KEYS.filter((key) => !(key in src));
  }

  function collectionCoverage(data, summaryRows){
    const src = data && typeof data === 'object' ? data : {};
    const rows = Array.isArray(summaryRows) ? summaryRows : [];
    return FIRESTORE_COLLECTIONS.map((contract) => {
      const row = rows.find((item) => item && item.key === contract.packKey);
      const packed = Array.isArray(src[contract.packKey]) ? src[contract.packKey] : null;
      return Object.assign({}, contract, {
        presentInPack:Array.isArray(packed),
        presentInSummary:!!row,
        count:row ? row.count : (packed ? packed.length : null)
      });
    });
  }

  function audit(data, summary){
    const missing = missingPackKeys(data);
    const coverage = collectionCoverage(data, summary && summary.rows);
    const unmapped = coverage.filter((row) => !row.presentInPack).map((row) => row.packKey);
    const ready = missing.length === 0 && unmapped.length === 0;
    return {
      version:VERSION,
      localKey:LOCAL_KEY,
      writerMoved:false,
      firebaseWriteEnabled:false,
      status:ready ? 'ready' : 'needs-review',
      missingPackKeys:missing,
      unmappedCollections:unmapped,
      firestoreCollections:coverage
    };
  }

  window.farmStorageAdapterContractV0906 = Object.freeze({
    version:VERSION,
    localKey:LOCAL_KEY,
    packKeys:PACK_KEYS,
    firestoreCollections:FIRESTORE_COLLECTIONS,
    audit
  });
})();
