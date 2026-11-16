import { useCallback, useEffect, useState } from 'react';
import { readText, writeText } from './storage';

/**
 * The holiday theme is seasonal. It is on by default until this date, in the reader's time
 * zone. From that day the switch, the decorations and the holiday card are gone, with no
 * further change to the code. Move the date to extend the season.
 */
export const HOLIDAY_ENDS = '2027-01-07';

const KEY = 'ossabaw-holiday';

export function holidaySeason(now = new Date()) {
  return now < new Date(`${HOLIDAY_ENDS}T00:00:00`);
}

/** On unless the reader switched it off; off for good once the season ends. */
export function holidayAtStart() {
  return holidaySeason() && readText(KEY) !== 'off';
}

/** Sets <html data-holiday>, which every holiday style keys off. */
export function applyHoliday(on: boolean) {
  document.documentElement.setAttribute('data-holiday', on ? 'on' : 'off');
}

export function useHoliday() {
  const [season] = useState(holidaySeason);
  const [on, setOn] = useState(holidayAtStart);
  useEffect(() => applyHoliday(on), [on]);
  const toggle = useCallback(() => {
    writeText(KEY, on ? 'off' : 'on');
    setOn(!on);
  }, [on]);
  return { season, on: season && on, toggle };
}
