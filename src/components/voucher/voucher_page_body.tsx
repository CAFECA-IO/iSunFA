import { useTranslation } from 'next-i18next';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/button/button';
import VoucherList from '@/components/voucher/voucher_list';

const VoucherPageBody = () => {
  const { t } = useTranslation('common');

  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      {/* Info: (20240920 - Julian) Add New Voucher button */}
      <div className="ml-auto">
        <Button type="button">
          <LuPlus />
          <p>{t('journal:VOUCHER.ADD_NEW_VOUCHER')}</p>
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* ToDo: (20240920 - Julian) Tabs: 通用元件 */}
        <div className="flex h-50px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is tabs
        </div>
        {/* ToDo: (20240920 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240920 - Julian) Voucher List */}
        <VoucherList />
      </div>
    </div>
  );
};

export default VoucherPageBody;
