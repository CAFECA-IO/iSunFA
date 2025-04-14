import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { IMissingCertificate } from '@/interfaces/pending_task';

interface AccountBookListProps {
  list: IMissingCertificate[]; // Info: (20250109 - Liz) IMissingCertificate 與 IUnpostedVoucher 相同
}

const AccountBookListForPendingTask = ({ list }: AccountBookListProps) => {
  const { t } = useTranslation('dashboard');

  const isListNoData = list.length === 0;

  if (isListNoData) {
    return (
      <div className="text-center text-base font-medium text-text-neutral-mute">
        {t('dashboard:DASHBOARD.NO_DATA_AVAILABLE')}
      </div>
    );
  }

  // Info: (20250109 - Liz) 依照 list.count 由大到小排序(降冪)
  list.sort((a, b) => b.count - a.count);

  return (
    <section className="flex flex-col gap-8px">
      {list.map((item) => (
        <div
          key={item.companyId}
          className="flex items-center justify-between gap-8px bg-surface-brand-primary-10 px-8px py-4px"
        >
          <div className="flex items-center gap-8px">
            <div className="h-24px w-24px overflow-hidden rounded-xxs border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
              <Image src={item.companyLogoSrc} alt="company_logo" width={24} height={24} />
            </div>
            <p className="text-xs font-semibold text-text-neutral-primary">{item.companyName}</p>
          </div>

          <p className="text-sm font-semibold text-text-neutral-primary">{item.count}</p>
        </div>
      ))}
    </section>
  );
};

export default AccountBookListForPendingTask;
