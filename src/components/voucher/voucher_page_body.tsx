import { Button } from '@/components/button/button';
import { LuPlus } from 'react-icons/lu';
import VoucherList from '@/components/voucher/voucher_list';

const VoucherPageBody = () => {
  return (
    <div className="relative flex flex-col items-center gap-40px px-40px pt-40px lg:h-1000px">
      {/* Info: (20240920 - Julian) Add New Voucher button */}
      <div className="ml-auto">
        <Button type="button">
          <LuPlus />
          <p>Add New Voucher</p>
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Voucher List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* ToDo: (20240920 - Julian) Tabs: 通用元件 */}
        <div className="flex items-center justify-center">
          <div className="w-full border-b-2 border-tabs-stroke-active p-8px text-center">
            Uploaded Voucher
          </div>
          <div className="w-full border-b-2 border-tabs-stroke-default p-8px text-center">
            Upcoming Events
          </div>
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
