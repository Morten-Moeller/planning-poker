import { formatNumber, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe);

export function averageText(average: number | null): string {
  return average === null
    ? $localize`:@@roundStats.noAverage:kein Durchschnitt`
    : formatNumber(average, 'de', '1.1-1');
}
