/* V1.0.3 Core Read-only Summary Helper.
   Pure collection summary only. No storage reads or writes. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const inspection = window.farmCoreReadonlyInspectionV0906;
  if(!inspection) throw new Error('V1.0.3 core read-only inspection helper is required');

  const COLLECTIONS = Object.freeze([
    Object.freeze(['พืชผล', 'cropItems', 'id', 'nextCropId']),
    Object.freeze(['กิจกรรม', 'actItems', 'id', 'nextActId']),
    Object.freeze(['คลัง', 'invItems', 'id', 'nextInvId']),
    Object.freeze(['ลูกค้า', 'custItems', 'id', 'nextCustId']),
    Object.freeze(['การขาย', 'salesData', '_id', '_nextSaleId']),
    Object.freeze(['ปฏิทิน', 'calEventsArr', 'id', '_nextCalId']),
    Object.freeze(['เบิกวัสดุ', 'reqItems', 'id', '_nextReqId']),
    Object.freeze(['โครงการ', 'projectItems', 'id', '_nextProjId'])
  ]);

  function summarize(data){
    const rows = COLLECTIONS.map((args) => inspection.inspectCollection(data, ...args));
    const issueCount = inspection.countIssues(rows);
    return { status:issueCount ? 'needs-review' : 'ready', issueCount, rows };
  }

  window.farmCoreReadonlySummaryV0906 = Object.freeze({
    version:VERSION,
    collections:COLLECTIONS,
    summarize
  });
})();
