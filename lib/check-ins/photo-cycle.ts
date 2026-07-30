export const PHOTO_CHECK_IN_INTERVAL = 4;

export function checkInPhotoCycle(submittedCount: number) {
  const safeCount = Math.max(0, Math.floor(submittedCount));
  const position = (safeCount % PHOTO_CHECK_IN_INTERVAL) + 1;
  return {
    submittedCount: safeCount,
    nextCheckInNumber: safeCount + 1,
    position,
    photosRequired: position === PHOTO_CHECK_IN_INTERVAL,
    remainingUntilPhotos:
      position === PHOTO_CHECK_IN_INTERVAL
        ? 0
        : PHOTO_CHECK_IN_INTERVAL - position,
  };
}
