import React from 'react';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { FiTrash2, FiEdit } from 'react-icons/fi';
import { ILocale } from '@/interfaces/locale';
import SideMenu from '@/components/upload_certificate/side_menu';
import Header from '@/components/upload_certificate/header';
import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { useModalContext } from '@/contexts/modal_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { IAssetDetails, mockAssetDetails } from '@/interfaces/asset';
import { numberWithCommas, timestampToString, timestampToYMD } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { AssetStatus } from '@/constants/asset';
import { ToastType } from '@/interfaces/toastify';
import { ASSET_DELETE_TERM } from '@/constants/common';

const AssetDetailPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();
  const { assetStatusSettingModalDataHandler, assetStatusSettingModalVisibilityHandler } =
    useGlobalCtx();

  const { data: assetData, isLoading } = APIHandler<IAssetDetails>(
    APIName.ASSET_GET_BY_ID_V2,
    {
      // ToDo: (20241016 - Julian) Replace with real parameters
      params: {
        companyId: '111',
        assetId: '123',
      },
    },
    true
  );

  // ToDo: (20241016 - Julian) Get asset details from API
  const {
    id: assetId,
    assetName,
    assetNumber,
    assetType,
    acquisitionDate,
    depreciationStart,
    depreciationMethod,
    usefulLife,
    purchasePrice,
    accumulatedDepreciation,
    residualValue,
    remainingLife,
    note,
    relatedVouchers,
    assetStatus,
  } = assetData || mockAssetDetails;

  const pageTitle = `${t('asset:ASSET_DETAIL_PAGE.TITLE')} ${assetId}`;

  // Info: (20241016 - Julian) 可刪除資產的期限
  const now = new Date().getTime() / 1000;
  const assetDeleteDeadline = acquisitionDate + ASSET_DELETE_TERM;
  const deleteDisabled = now > assetDeleteDeadline;
  const deleteRemainingDays = Math.floor((assetDeleteDeadline - now) / 86400);
  const deleteRemainingStr =
    deleteRemainingDays > 0 ? (
      <p>
        ({deleteRemainingDays} {t('asset:ASSET_DETAIL_PAGE.DAYS_UNIT')})
      </p>
    ) : null;

  // Info: (20241016 - Julian) 計算剩餘時間
  const remainingYears = timestampToYMD(remainingLife).years;
  const remainingMonths = timestampToYMD(remainingLife).months;
  const remainingDays = timestampToYMD(remainingLife).days;

  const voucherList = relatedVouchers.map((voucher) => <p key={voucher.id}>{voucher.number}</p>);

  // ToDo: (20241016 - Julian) Call API to undo delete asset
  const undoDeleteAsset = async () => {
    // eslint-disable-next-line no-console
    console.log('Asset restored');
  };

  // ToDo: (20241016 - Julian) Call API to delete asset (voucher will be deleted too)
  const deleteAsset = async () => {
    // eslint-disable-next-line no-console
    console.log('Asset deleted');

    toastHandler({
      id: 'delete-asset-toast',
      type: ToastType.SUCCESS,
      content: (
        <div className="flex items-center justify-between">
          <p className="text-text-neutral-primary">
            {t('asset:ASSET_DETAIL_PAGE.DELETE_SUCCESS_TOAST')}
          </p>
          <button
            type="button"
            onClick={undoDeleteAsset}
            className="font-semibold text-link-text-success"
          >
            {t('asset:ASSET_DETAIL_PAGE.UNDO')}
          </button>
        </div>
      ),
      closeable: true,
    });
  };

  const deleteClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_TITLE'),
      content: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_CONTENT'),
      submitBtnStr: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_SUBMIT_BTN'),
      submitBtnFunction: deleteAsset,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  // ToDo: (20241016 - Julian) Call API to edit asset
  const editClickHandler = () => {
    // eslint-disable-next-line no-console
    console.log('Edit asset');
  };

  const statusSettingClickHandler = () => {
    assetStatusSettingModalDataHandler(assetStatus as AssetStatus);
    assetStatusSettingModalVisibilityHandler();
  };

  const remainingProcessBar = (
    <div className="relative h-5px w-120px overflow-hidden rounded-full bg-surface-neutral-depth">
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

  const isTitle = !isLoading ? (
    <div className="flex items-center gap-10px font-bold">
      <h1 className="text-44px text-text-neutral-primary">{assetName}</h1>
      <p className="text-xl text-text-neutral-tertiary">{assetNumber}</p>
    </div>
  ) : (
    <Skeleton width={300} height={44} rounded />
  );

  const isType = !isLoading ? <p>{assetType}</p> : <Skeleton width={200} height={24} rounded />;
  const isAcquisitionDate = !isLoading ? (
    <p>{timestampToString(acquisitionDate).date}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isDepreciationDate = !isLoading ? (
    <p>{timestampToString(depreciationStart).date}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isDepreciationMethod = !isLoading ? (
    <p>{depreciationMethod}</p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isUsefulLife = !isLoading ? (
    <p>
      {usefulLife}{' '}
      <span className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.MONTH_UNIT')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isPurchasePrice = !isLoading ? (
    <p>
      {numberWithCommas(purchasePrice)}{' '}
      <span className="text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isAccumDep = !isLoading ? (
    <p>
      {numberWithCommas(accumulatedDepreciation)}{' '}
      <span className="text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isResidualValue = !isLoading ? (
    <p>
      {numberWithCommas(residualValue)}{' '}
      <span className="text-text-neutral-tertiary">{t('common:COMMON.TWD')}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isRemainingLife = !isLoading ? (
    displayedRemainingLife
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isNote = !isLoading ? <p>{note}</p> : <Skeleton width={200} height={24} rounded />;
  const isVoucher = !isLoading ? (
    <div className="flex flex-col text-link-text-primary">{voucherList}</div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle} - iSunFA</title>
      </Head>
      <main className="flex h-screen w-screen overflow-hidden">
        {/* Info: (20241016 - Julian) Side Menu */}
        <SideMenu />

        {/* Info: (20241016 - Julian) Main Content Area */}
        <div className="flex flex-1 flex-col bg-surface-neutral-main-background">
          {/* Info: (20241016 - Julian) Header */}
          <Header />

          {/* Info: (20241016 - Julian) Main Content */}
          <div className="overflow-y-auto px-40px pb-32px pt-40px">
            {/* Info: (20241016 - Julian) Title */}
            <div className="flex items-center justify-between">
              {isTitle}
              {/* Info: (20241016 - Julian) Action Buttons */}
              <div className="flex justify-end gap-16px">
                <Button
                  id="delete-asset-btn"
                  type="button"
                  variant="tertiary"
                  onClick={deleteClickHandler}
                  disabled={deleteDisabled}
                  className={deleteRemainingDays > 0 ? '' : 'h-48px w-48px p-0'}
                >
                  <FiTrash2 size={20} />
                  {deleteRemainingStr}
                </Button>
                <Button
                  id="edit-asset-btn"
                  type="button"
                  variant="tertiary"
                  className="h-48px w-48px p-0"
                  onClick={editClickHandler}
                >
                  <FiEdit size={20} />
                </Button>
                <Button
                  id="asset-status-setting-btn"
                  type="button"
                  variant="tertiary"
                  onClick={statusSettingClickHandler}
                >
                  {t('asset:ASSET_DETAIL_PAGE.STATUS_SETTING')}
                </Button>
              </div>
            </div>
            {/* Info: (20241016 - Julian) Asset Details */}
            <div className="mt-40px flex w-full flex-col gap-24px">
              {/* Info: (20241016 - Julian) Asset Type */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.TYPE')}</p>
                {isType}
              </div>
              {/* Info: (20241016 - Julian) Acquisition Date */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.ACQUISITION_DATE')}
                </p>
                {isAcquisitionDate}
              </div>
              {/* Info: (20241016 - Julian) Depreciation Start Date */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.DEPRECIATION_START_DATE')}
                </p>
                {isDepreciationDate}
              </div>
              {/* Info: (20241016 - Julian) Depreciation Method */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.DEPRECIATION_METHOD')}
                </p>
                {isDepreciationMethod}
              </div>
              {/* Info: (20241016 - Julian) Useful Life */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.USEFUL_LIFE')}
                </p>
                {isUsefulLife}
              </div>
              {/* Info: (20241016 - Julian) Purchase Price */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.PURCHASE_PRICE')}
                </p>
                {isPurchasePrice}
              </div>
              {/* Info: (20241016 - Julian) Accumulated Depreciation */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.ACCUM_DEP')}
                </p>
                {isAccumDep}
              </div>
              {/* Info: (20241016 - Julian) Residual Value */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.RESIDUAL_VALUE')}
                </p>
                {isResidualValue}
              </div>
              {/* Info: (20241016 - Julian) Remaining Useful Life */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">
                  {t('asset:ASSET_DETAIL_PAGE.REMAINING_LIFE')}
                </p>
                {isRemainingLife}
              </div>
              {/* Info: (20241016 - Julian) Note */}
              <div className="flex items-center justify-between font-semibold">
                <p className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.NOTE')}</p>
                {isNote}
              </div>
              {/* Info: (20241016 - Julian) Voucher */}
              <div className="flex items-start justify-between font-semibold">
                <p className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.VOUCHER')}</p>
                {isVoucher}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

const getStaticPropsFunction = async ({ locale }: ILocale) => ({
  props: {
    ...(await serverSideTranslations(locale, [
      'common',
      'journal',
      'kyc',
      'project',
      'report_401',
      'salary',
      'setting',
      'terms',
      'asset',
    ])),
  },
});

export const getStaticProps = getStaticPropsFunction;

export default AssetDetailPage;
