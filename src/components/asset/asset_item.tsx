import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { AssetStatus } from '@/constants/asset';
import { numberWithCommas, timestampToYMD } from '@/lib/utils/common';
import { IAssetItemUI } from '@/interfaces/asset';
import { checkboxStyle } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IAssetItemProps {
  assetData: IAssetItemUI;
  selectHandler: (id: number) => void;
  isCheckBoxOpen: boolean;
}

const AssetItem: React.FC<IAssetItemProps> = ({ assetData, selectHandler, isCheckBoxOpen }) => {
  const { t } = useTranslation('common');

  const {
    id: assetId,
    acquisitionDate,
    assetType,
    assetNumber,
    assetName,
    purchasePrice,
    accumulatedDepreciation,
    residualValue,
    remainingLife,
    assetStatus,
    currencyAlias,
    isSelected,
  } = assetData;

  const unit = currencyAlias === 'TWD' ? t('common:COMMON.TWD') : currencyAlias;
  const assetTypeCode = assetType.split(' ')[0];
  const assetTypeTitle = assetType.split(' ').slice(1).join(' ');

  const displayedDate = (
    <div className="flex items-center justify-center">
      <CalendarIcon timestamp={acquisitionDate} />
    </div>
  );

  // Info: (20241024 - Julian) checkbox click handler
  const checkboxHandler = () => selectHandler(assetId);

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
      {numberWithCommas(purchasePrice)}
      <span className="text-text-neutral-tertiary"> {unit}</span>
    </p>
  );

  const displayedDepreciation = (
    <p>
      {numberWithCommas(accumulatedDepreciation)}
      <span className="text-text-neutral-tertiary"> {unit}</span>
    </p>
  );

  const displayedResidual = (
    <p>
      {numberWithCommas(residualValue)}
      <span className="text-text-neutral-tertiary"> {unit}</span>
    </p>
  );

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
            {remainingYears}{' '}
            <span className="text-text-neutral-tertiary">{t('common:COMMON.Y')}</span>
          </p>
          {/* Info: (20240925 - Julian) Months */}
          <p className="text-text-neutral-primary">
            {remainingMonths}{' '}
            <span className="text-text-neutral-tertiary">{t('common:COMMON.M')}</span>
          </p>
          {/* Info: (20240925 - Julian) Days */}
          <p className="text-text-neutral-primary">
            {remainingDays}{' '}
            <span className="text-text-neutral-tertiary">{t('common:COMMON.D')}</span>
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
    <Link
      href={`${ISUNFA_ROUTE.ASSET_LIST}/${assetId}`}
      className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240920 - Julian) Select */}
      <div className={`${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center`}>
        <div className="relative top-20px px-8px">
          <input
            type="checkbox"
            className={checkboxStyle}
            checked={isSelected}
            onChange={checkboxHandler}
          />
        </div>
      </div>
      {/* Info: (20240925 - Julian) Issued Date */}
      <div className="table-cell py-10px align-middle">{displayedDate}</div>
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
    </Link>
  );
};

export default AssetItem;
