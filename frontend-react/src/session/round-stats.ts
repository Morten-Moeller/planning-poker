import { t } from './messages';

const AVERAGE = new Intl.NumberFormat('de', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function averageText(average: number | null): string {
  return average === null ? t('roundStats.noAverage') : AVERAGE.format(average);
}
