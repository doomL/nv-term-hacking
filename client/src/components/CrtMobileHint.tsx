import { useTranslation } from 'react-i18next';
import { useTouchUi } from '../hooks/useTouchUi';

export function CrtMobileHint() {
  const { t } = useTranslation();
  const touchUi = useTouchUi();

  if (!touchUi) return null;

  return (
    <div className="crt-mobile-hint" aria-hidden="true">
      <span>{t('menu.swipeHint')}</span>
      <span>{t('menu.tapHint')}</span>
    </div>
  );
}
