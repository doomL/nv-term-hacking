import type { TFunction } from 'i18next';

/** Desktop keyboard hints; on touch UI the swipe/tap overlay replaces nav/enter hints. */
export function getCrtMenuFooterLines(t: TFunction, touchUi: boolean, extra: string[] = []): string[] {
  if (touchUi) return extra;
  return [t('menu.navHint'), t('menu.enterHint'), ...extra];
}
