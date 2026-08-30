export const PHOTO_CHECK_IN_INTERVAL = 4;

// Photos create a useful monthly comparison: a baseline on check-in 1 and a
// follow-up on check-in 4. Weekly check-ins 2 and 3 deliberately contain no
// photo step, and later check-ins stay lightweight as well.
export function checkInPhotoCycle(submittedCount: number) {
  const safeCount = Math.max(0, Math.floor(submittedCount));
  const nextCheckInNumber = safeCount + 1;
  const isFirst = nextCheckInNumber === 1;
  const photosRequired = isFirst || nextCheckInNumber === PHOTO_CHECK_IN_INTERVAL;
  return {
    submittedCount: safeCount,
    nextCheckInNumber,
    position: nextCheckInNumber,
    isFirst,
    photosRequired,
    remainingUntilPhotos: nextCheckInNumber < PHOTO_CHECK_IN_INTERVAL
      ? PHOTO_CHECK_IN_INTERVAL - nextCheckInNumber
      : 0,
  };
}
