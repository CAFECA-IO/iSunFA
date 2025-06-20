import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';

const AccountSettings = () => {
  const { t } = useTranslation(['settings']);

  return (
    <main className="flex flex-col gap-40px">
      <section className="flex items-center gap-lv-4">
        <div className="flex items-center gap-lv-2">
          <Image src="/icons/attribution.svg" width={16} height={16} alt="notice_icon" />
          <span className="text-sm font-medium text-divider-text-lv-2">
            {t('settings:NORMAL.ACCOUNT_SETTINGS')}
          </span>
        </div>
        <hr className="flex-auto border-t border-divider-stroke-lv-4" />
      </section>

      <section className="flex flex-col items-start gap-24px">
        <Link
          href={ISUNFA_ROUTE.SUBSCRIPTIONS}
          className="flex items-center text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover disabled:text-link-text-disable"
        >
          {t('settings:NORMAL.SUBSCRIPTION_MANAGEMENT')}
        </Link>

        {/* ToDo: (20250417 - Liz) 目前不開放使用者刪除帳號 */}
        {/* <button
          type="button"
          className="flex items-center text-sm font-semibold text-text-state-error hover:text-link-text-error-hover disabled:text-link-text-disable"
        >
          {t('settings:ACCOUNT.REMOVE')}
        </button> */}
      </section>
    </main>
  );
};

export default AccountSettings;
