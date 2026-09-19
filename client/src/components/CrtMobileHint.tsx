import { useTranslation } from 'react-i18next';
import { useTouchUi } from '../hooks/useTouchUi';

interface CrtMobileHintProps {
  looking?: boolean;
}

export function CrtMobileHint({ looking = false }: CrtMobileHintProps) {
  const { t } = useTranslation();
  const touchUi = useTouchUi();

  if (!touchUi) return null;

  return (
    <>
      {looking ? (
        <div className="crt-look-feedback" aria-hidden="true">
          {t('menu.looking')}
        </div>
      ) : null}
      <div className="crt-mobile-hint" aria-hidden="true">
        <span>{t('menu.swipeHint')}</span>
        <span>{t('menu.tapHint')}</span>
        <span>{t('menu.lookHint')}</span>
      </div>
    </>
  );
}
