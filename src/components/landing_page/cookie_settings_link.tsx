'use client';

import { useTranslation } from '@/i18n/i18n_context';

export default function CookieSettingsTrigger() {
  const { t } = useTranslation();

  const openSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event('openCookieSettings'));
  };

  const button = (
    <button
      onClick={openSettings}
      className="cursor-pointer text-xs leading-5 text-gray-400 hover:text-white"
    >
      {t('cookie_consent.cookie_settings')}
    </button>
  );

  // ToDo: (20260104 - Luphia) openSettings does not work, need to fix
  return false ? button : null;
}
