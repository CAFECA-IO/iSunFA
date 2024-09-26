import AssetList from '@/components/asset/asset_list';

const AssetListPageBody = () => {
  return (
    <div className="relative flex flex-col items-center gap-40px px-40px py-40px">
      {/* Info: (20240925 - Julian) Asset List */}
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* ToDo: (20240925 - Julian) Filter: 通用元件 */}
        <div className="flex h-72px w-full flex-col items-center justify-center bg-text-neutral-secondary text-white">
          This is filter
        </div>
        {/* Info: (20240925 - Julian) Asset List */}
        <AssetList />
      </div>
    </div>
  );
};

export default AssetListPageBody;
