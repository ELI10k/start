export const PHOTO_CHECK_IN_INTERVAL = 4;

// Photos are asked for on the first check-in and then on every fourth.
//
// The first one is the baseline: without it there is nothing for the later
// photos to be compared against, and the client had been sent through three
// check-ins before the app ever asked. So the rule is "the first, and every
// fourth" - check-ins 1, 4, 8, 12 - rather than "every fourth" alone.
export function checkInPhotoCycle(submittedCount: number) {
  const safeCount = Math.max(0, Math.floor(submittedCount));
  const nextCheckInNumber = safeCount + 1;
  const position = (safeCount % PHOTO_CHECK_IN_INTERVAL) + 1;
  const isFirst = nextCheckInNumber === 1;
  const photosRequired = isFirst || position === PHOTO_CHECK_IN_INTERVAL;
  return {
    submittedCount: safeCount,
    nextCheckInNumber,
    position,
    isFirst,
    photosRequired,
    remainingUntilPhotos: photosRequired ? 0 : PHOTO_CHECK_IN_INTERVAL - position,
  };
}
