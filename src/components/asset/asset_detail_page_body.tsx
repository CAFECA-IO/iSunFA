import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiTrash2, FiEdit } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { useModalContext } from '@/contexts/modal_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import { MessageType } from '@/interfaces/message_modal';
import { IAssetDetails, IAssetPostOutput, mockAssetDetails } from '@/interfaces/asset';
import { numberWithCommas, timestampToString, timestampToYMD } from '@/lib/utils/common';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { AssetStatus, AssetDepreciationMethod } from '@/constants/asset';
import { ToastType } from '@/interfaces/toastify';
import { ASSET_DELETE_TERM } from '@/constants/common';
import { AssetModalType } from '@/interfaces/asset_modal';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ToastId } from '@/constants/toast_id';
import { TbArrowBackUp } from 'react-icons/tb';

const AssetDetailPageBody: React.FC<{ assetId: string }> = ({ assetId }) => {
  const { t } = useTranslation(['asset', 'filter_section_type']);
  const router = useRouter();

  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } =
    useModalContext();
  const {
    // assetStatusSettingModalDataHandler,
    // assetStatusSettingModalVisibilityHandler,
    addAssetModalDataHandler,
    addAssetModalVisibilityHandler,
  } = useGlobalCtx();
  const { connectedAccountBook } = useUserCtx();

  const accountBookId = connectedAccountBook?.id;

  const params = { accountBookId, assetId };

  // Info: (20241028 - Julian) Get asset details from API
  const {
    trigger: getAssetDetail,
    data: assetDetail,
    isLoading,
  } = APIHandler<IAssetDetails>(APIName.ASSET_GET_BY_ID_V2, { params });

  // Info: (20241028 - Julian) Delete asset API
  const {
    trigger: deleteAsset,
    isLoading: isDeleting,
    success: deleteSuccess,
    error: deleteError,
  } = APIHandler<IAssetDetails>(APIName.DELETE_ASSET_V2, { params });

  // Info: (20241028 - Julian) Update asset API
  const { trigger: updateAsset, data: defaultAssetData } = APIHandler<IAssetPostOutput>(
    APIName.UPDATE_ASSET_V2,
    { params }
  );

  // Info: (20241016 - Julian) Get asset details from API
  const {
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
    currencyAlias,
  } = assetDetail || mockAssetDetails;

  // Info: (20241016 - Julian) 可刪除資產的期限
  const now = new Date().getTime() / 1000;
  const assetDeleteDeadline = acquisitionDate + ASSET_DELETE_TERM;
  const deleteDisabled = now > assetDeleteDeadline || isDeleting; // Info: (20241202 - Julian) 過期或正在刪除中
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

  // Info: (20241016 - Julian) 傳票列表
  const voucherList = relatedVouchers.map((voucher) => (
    <Link
      key={voucher.id}
      href={`/users/accounting/${voucher.id}`}
      className="text-link-text-primary hover:underline"
    >
      {voucher.number}
    </Link>
  ));

  // Info: (20250122 - Julian) 資產類別代碼
  const assetCode = assetType.split(' ')[0];

  const goBack = () => router.push(ISUNFA_ROUTE.ASSET_LIST);

  const deleteClickHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_TITLE'),
      content: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_CONTENT'),
      submitBtnStr: t('asset:ASSET_DETAIL_PAGE.DELETE_MESSAGE_SUBMIT_BTN'),
      submitBtnFunction: deleteAsset, // Info: (20241028 - Julian) Call API to delete asset (voucher will be deleted too)
      backBtnStr: t('asset:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  // ToDo: (20241016 - Julian) Call API to edit asset
  const editClickHandler = () => {
    updateAsset(); // Info: (20241028 - Julian) 先 call API 取得資料
    addAssetModalDataHandler({
      modalType: AssetModalType.EDIT,
      assetAccountList: [],
      assetData: defaultAssetData ?? null,
    });
    addAssetModalVisibilityHandler();
  };

  const translateMethod = (method: AssetDepreciationMethod) => {
    const key = method.toUpperCase().replace(/ /g, '_').replace(/-/g, '_');
    return t(`asset:ADD_ASSET_MODAL.${key}`);
  };

  // const statusSettingClickHandler = () => {
  //   assetStatusSettingModalDataHandler(assetId, assetStatus as AssetStatus);
  //   assetStatusSettingModalVisibilityHandler();
  // };

  useEffect(() => {
    // Info: (20241121 - Julian) Get voucher detail & account list when companyId & assetId are ready
    if (accountBookId && assetId) {
      getAssetDetail();
    }
  }, [accountBookId, assetId]);

  useEffect(() => {
    // Info: (20241210 - Julian) Redirect to 404 page if the asset is not connected to any voucher
    if (!!assetDetail && relatedVouchers.length === 0) {
      router.push('/404');
    }

    if (assetDetail === null) {
      router.push('/404');
    }
  }, [assetDetail]);

  useEffect(() => {
    if (!isDeleting) {
      if (deleteSuccess) {
        // Info: (20241029 - Julian) 刪除成功後，跳轉至列表頁，並顯示成功 toast
        router.push(ISUNFA_ROUTE.ASSET_LIST);
        // toastHandler({
        //   id: ToastId.ASSET_DELETE_SUCCESS,
        //   type: ToastType.SUCCESS,
        //   content: (
        //     <div className="flex min-w-120px items-center justify-between gap-20px">
        //       <p className="text-text-neutral-primary">
        //         {t('asset:ASSET_DETAIL_PAGE.DELETE_SUCCESS_TOAST')}
        //       </p>
        //       <button
        //         type="button"
        //         onClick={undoDeleteAssetHandler}
        //         className="font-semibold text-link-text-success"
        //       >
        //         {t('asset:ASSET_DETAIL_PAGE.UNDO')}
        //       </button>
        //     </div>
        //   ),
        //   closeable: true,
        // });
      } else if (deleteError) {
        toastHandler({
          id: ToastId.ASSET_DELETE_ERROR,
          type: ToastType.ERROR,
          content: t('asset:ASSET_DETAIL_PAGE.DELETE_FAIL_TOAST'),
          closeable: true,
        });
      }
    }
  }, [isDeleting, deleteSuccess, deleteError]);

  const noteStr = note === '' ? '-' : note;

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

  const displayAssetStatus = (
    <div className="ml-auto w-fit rounded-full bg-badge-surface-soft-error px-6px py-px text-xs text-badge-text-error-solid">
      {t(`asset:ASSET.STATUS_${assetStatus.toUpperCase()}`)}
    </div>
  );

  const displayedRemainingLife =
    assetStatus === AssetStatus.NORMAL ? (
      <div className="flex flex-col items-end">
        {/* Info: (20240925 - Julian) Remaining count */}
        <div className="flex items-center gap-4px">
          {/* Info: (20240925 - Julian) Years */}
          <p className="text-text-neutral-primary">
            {remainingYears}{' '}
            <span className="text-text-neutral-tertiary">{t('asset:COMMON.Y')}</span>
          </p>
          {/* Info: (20240925 - Julian) Months */}
          <p className="text-text-neutral-primary">
            {remainingMonths}{' '}
            <span className="text-text-neutral-tertiary">{t('asset:COMMON.M')}</span>
          </p>
          {/* Info: (20240925 - Julian) Days */}
          <p className="text-text-neutral-primary">
            {remainingDays}{' '}
            <span className="text-text-neutral-tertiary">{t('asset:COMMON.D')}</span>
          </p>
        </div>
        {/* Info: (20240925 - Julian) process bar */}
        {remainingProcessBar}
      </div>
    ) : (
      displayAssetStatus
    );

  const isStatus = assetStatus !== AssetStatus.NORMAL ? displayAssetStatus : null;

  const isTitle = !isLoading ? (
    <div className="mt-lv-6 flex items-center gap-10px font-bold tablet:mt-0">
      <h1 className="text-2xl text-text-neutral-primary tablet:text-44px">{assetName}</h1>
      <p className="text-xs text-text-neutral-tertiary tablet:text-xl">{assetNumber}</p>
      {isStatus}
    </div>
  ) : (
    <Skeleton width={300} height={44} rounded />
  );

  const isType = !isLoading ? (
    <p className="text-input-text-primary">
      {assetCode}{' '}
      <span className="text-text-neutral-tertiary">
        {t(`filter_section_type:FILTER_SECTION_TYPE.${assetCode}`)}
      </span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
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
    <p>{translateMethod(depreciationMethod as AssetDepreciationMethod)}</p>
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
      <span className="text-text-neutral-tertiary">{currencyAlias}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isAccumDep = !isLoading ? (
    <p>
      {numberWithCommas(accumulatedDepreciation)}{' '}
      <span className="text-text-neutral-tertiary">{currencyAlias}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isResidualValue = !isLoading ? (
    <p>
      {numberWithCommas(residualValue)}{' '}
      <span className="text-text-neutral-tertiary">{currencyAlias}</span>
    </p>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isRemainingLife = !isLoading ? (
    displayedRemainingLife
  ) : (
    <Skeleton width={200} height={24} rounded />
  );
  const isNote = !isLoading ? <p>{noteStr}</p> : <Skeleton width={200} height={24} rounded />;
  const isVoucher = !isLoading ? (
    <div className="flex flex-col">{voucherList}</div>
  ) : (
    <Skeleton width={200} height={24} rounded />
  );

  return (
    <div className="overflow-y-auto pb-25px tablet:px-40px tablet:pb-32px tablet:pt-40px">
      {/* Info: (20250526 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('asset:ASSET_DETAIL_PAGE.TITLE')} {assetId}
        </p>
      </div>
      {/* Info: (20241016 - Julian) Title */}
      <div className="flex flex-col items-start justify-between gap-y-lv-6 tablet:flex-row tablet:items-center">
        {isTitle}
        {/* Info: (20241016 - Julian) Action Buttons */}
        <div className="flex justify-end gap-16px">
          <Button
            id="delete-asset-btn"
            type="button"
            variant="tertiary"
            onClick={deleteClickHandler}
            disabled={deleteDisabled}
          >
            <FiTrash2 size={20} />
            {deleteRemainingStr}
          </Button>
          <Button
            id="edit-asset-btn"
            type="button"
            variant="tertiary"
            size={'defaultSquare'}
            onClick={editClickHandler}
          >
            <FiEdit size={20} />
          </Button>
          {/* Info: (20241212 - Julian) 目前先隱藏功能 */}
          {/* <Button
            id="asset-status-setting-btn"
            type="button"
            variant="tertiary"
            onClick={statusSettingClickHandler}
          >
            {t('asset:ASSET_DETAIL_PAGE.STATUS_SETTING')}
          </Button> */}
        </div>
      </div>
      {/* Info: (20241016 - Julian) Asset Details */}
      <div className="mt-lv-6 flex w-full flex-col gap-24px text-xs tablet:mt-40px tablet:text-sm">
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
          <p className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.USEFUL_LIFE')}</p>
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
          <p className="text-text-neutral-tertiary">{t('asset:ASSET_DETAIL_PAGE.ACCUM_DEP')}</p>
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
  );
};

export default AssetDetailPageBody;
