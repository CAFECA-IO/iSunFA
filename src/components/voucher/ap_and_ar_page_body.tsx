import APandARList from '@/components/voucher/ap_and_ar_list';

const APandARPageBody = () => {
  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* ToDo: (20240924 - Julian) Tabs: 通用元件 */}
        <div className="flex h-50px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is tabs
        </div>
        {/* ToDo: (20240924 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240924 - Julian) AP/AR List */}
        <APandARList />
      </div>
    </div>
  );
};

export default APandARPageBody;
