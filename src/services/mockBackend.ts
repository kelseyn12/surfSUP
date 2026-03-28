/**
 * @deprecated Use checkInService instead.
 * This file is a compatibility shim — all exports are re-exported from checkInService.
 */
export {
  initializeCheckInService as initializeMockBackend,
  resetAllCheckInsAndCounts,
  getSurferCount,
  checkInToSpot,
  checkOutFromSpot,
  getActiveCheckInForUser,
  getActiveCheckInForUserAnywhere,
} from './checkInService';
