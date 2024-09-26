import React from 'react';
import { useTranslation } from 'next-i18next';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { AssetStatus } from '@/constants/asset';

interface IAssetItem {
  id: number;
  acquisitionDate: number;
  assetType: string;
  assetNumber: string;
  assetName: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  assetStatus: AssetStatus;
}

// ToDo: (20240925 - Julian) dummy data
const dummyData: IAssetItem = {
  id: 1,
  acquisitionDate: 1632511200,
  assetType: '123 Machinery',
  assetNumber: 'A-000010',
  assetName: 'MackBook',
  purchasePrice: 100000,
  accumulatedDepreciation: 5000,
  residualValue: 5000,
  remainingLife: 61580800,
  assetStatus: AssetStatus.NORMAL,
};

const AssetItem = () => {
  const { t } = useTranslation('common');

  const {
    acquisitionDate,
    assetType,
    assetNumber,
    assetName,
    purchasePrice,
    accumulatedDepreciation,
    residualValue,
    remainingLife,
    assetStatus,
  } = dummyData;

  const displayedDate = <CalendarIcon timestamp={acquisitionDate} />;

  const assetTypeCode = assetType.split(' ')[0];
  const assetTypeTitle = assetType.split(' ').slice(1).join(' ');

  const displayedAssetType = (
    <p className="text-text-neutral-primary">
      {assetTypeCode}
      <span className="text-text-neutral-tertiary"> {assetTypeTitle}</span>
    </p>
  );

  const displayedAssetNumberAndName = (
    <div className="flex flex-col">
      <p className="text-text-neutral-tertiary">{assetNumber}</p>
      <p className="text-text-neutral-primary">{assetName}</p>
    </div>
  );

  const displayedPurchasePrice = (
    <p>
      {purchasePrice}
      <span className="text-text-neutral-tertiary"> TWD</span>
    </p>
  );

  const displayedDepreciation = (
    <p>
      {accumulatedDepreciation}
      <span className="text-text-neutral-tertiary"> TWD</span>
    </p>
  );

  const displayedResidual = (
    <p>
      {residualValue}
      <span className="text-text-neutral-tertiary"> TWD</span>
    </p>
  );

  // Info: (20240926 - Julian) 將時間戳轉換成年月日
  const timestampToYMD = (timestamp: number) => {
    const years = Math.floor(timestamp / (60 * 60 * 24 * 365));
    const months = Math.floor((timestamp % (60 * 60 * 24 * 365)) / (60 * 60 * 24 * 30));
    const days = Math.floor(
      ((timestamp % (60 * 60 * 24 * 365)) % (60 * 60 * 24 * 30)) / (60 * 60 * 24)
    );

    return {
      years: years < 0 ? 0 : years,
      months: months < 0 ? 0 : months,
      days: days < 0 ? 0 : days,
    };
  };

  const remainingYears = timestampToYMD(remainingLife).years;
  const remainingMonths = timestampToYMD(remainingLife).months;
  const remainingDays = timestampToYMD(remainingLife).days;

  const remainingProcessBar = (
    <div className="relative h-5px w-7/10 overflow-hidden rounded-full bg-surface-neutral-depth">
      <span
        className={`absolute right-0 h-5px rounded-full ${
          remainingYears > 0
            ? 'bg-surface-state-success'
            : remainingMonths > 0
              ? 'bg-surface-state-warning'
              : 'bg-surface-state-error'
        }`}
        style={{
          width: `${remainingYears > 0 ? 75 : remainingMonths > 0 ? 50 : 25}%`,
        }}
      ></span>
    </div>
  );

  const assetStatusString = t(`asset:ASSET.STATUS_${assetStatus.toUpperCase()}`);

  const displayedRemainingLife =
    assetStatus === AssetStatus.NORMAL && remainingLife > 0 ? (
      <div className="flex flex-col items-end">
        {/* Info: (20240925 - Julian) Remaining count */}
        <div className="flex items-center gap-4px">
          {/* Info: (20240925 - Julian) Years */}
          <p className="text-text-neutral-primary">
            {remainingYears} <span className="text-text-neutral-tertiary">Y</span>
          </p>
          {/* Info: (20240925 - Julian) Months */}
          <p className="text-text-neutral-primary">
            {remainingMonths} <span className="text-text-neutral-tertiary">M</span>
          </p>
          {/* Info: (20240925 - Julian) Days */}
          <p className="text-text-neutral-primary">
            {remainingDays} <span className="text-text-neutral-tertiary">D</span>
          </p>
        </div>
        {/* Info: (20240925 - Julian) process bar */}
        {remainingProcessBar}
      </div>
    ) : (
      <div className="ml-auto w-fit rounded-full bg-badge-surface-soft-error px-6px py-px text-badge-text-error-solid">
        {assetStatusString}
      </div>
    );

  return (
    <div className="table-row font-medium">
      {/* Info: (20240925 - Julian) Issued Date */}
      <div className="table-cell py-10px text-center align-middle">{displayedDate}</div>
      {/* Info: (20240925 - Julian) Asset Type */}
      <div className="table-cell text-center align-middle">{displayedAssetType}</div>
      {/* Info: (20240925 - Julian) Asset Number and Name */}
      <div className="table-cell px-8px text-left align-middle">{displayedAssetNumberAndName}</div>
      {/* Info: (20240925 - Julian) Purchase Price */}
      <div className="table-cell px-8px text-right align-middle">{displayedPurchasePrice}</div>
      {/* Info: (20240925 - Julian) Accumulated Depreciation */}
      <div className="table-cell px-8px text-right align-middle">{displayedDepreciation}</div>
      {/* Info: (20240925 - Julian) Residual Value */}
      <div className="table-cell px-8px text-right align-middle">{displayedResidual}</div>
      {/* Info: (20240925 - Julian) Remaining Useful Life */}
      <div className="table-cell px-8px text-right align-middle">{displayedRemainingLife}</div>
    </div>
  );
};

export default AssetItem;
