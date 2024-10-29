import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { BiSave } from 'react-icons/bi';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { default30DayPeriodInSec, radioButtonStyle } from '@/constants/display';
import { Button } from '@/components/button/button';
import { AssetStatus } from '@/constants/asset';
import { IAssetDetails } from '@/interfaces/asset';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { FREE_COMPANY_ID } from '@/constants/config';
import { ToastType } from '@/interfaces/toastify';

interface IAssetStatusSettingModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  updateAssetId: string;
  defaultStatus: string;
}

const AssetStatusSettingModal: React.FC<IAssetStatusSettingModal> = ({
  isModalVisible,
  modalVisibilityHandler,
  updateAssetId,
  defaultStatus,
}) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useModalContext();

  const {
    trigger: updateAssetStatus,
    isLoading: isUpdating,
    success: updateSuccess,
    error: updateError,
  } = APIHandler<IAssetDetails>(APIName.UPDATE_ASSET_V2, {
    params: {
      companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      assetId: updateAssetId,
    },
  });

  const [selectedPeriod, setSelectedPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [assetStatus, setAssetStatus] = useState<string>(defaultStatus);

  useEffect(() => {
    if (!isModalVisible) {
      setSelectedPeriod(default30DayPeriodInSec);
      setAssetStatus(defaultStatus);
    }
  }, [isModalVisible]);

  useEffect(() => {
    setAssetStatus(defaultStatus);
  }, [defaultStatus]);

  // Info: (20240926 - Julian) 沒填日期時，禁用 Save 按鈕
  const saveBtnDisabled = selectedPeriod.startTimeStamp === 0 && selectedPeriod.endTimeStamp === 0;

  const updateAssetHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateAssetStatus({
      body: {
        updatedAt: selectedPeriod.startTimeStamp,
        assetStatus,
      },
    });
  };

  useEffect(() => {
    if (!isUpdating) {
      if (updateSuccess) {
        // Info: (20241028 - Julian) 關閉 Modal 並顯示成功 Toast
        modalVisibilityHandler();
        toastHandler({
          id: 'update-status-success',
          type: ToastType.SUCCESS,
          content: t('asset:STATUS_SETTING_MODAL.UPDATE_STATUS_SUCCESS_TOAST'),
          closeable: true,
        });
      } else if (updateError) {
        toastHandler({
          id: 'update-status-error',
          type: ToastType.ERROR,
          content: t('asset:ADD_ASSET_MODAL.TOAST_ERROR'),
          closeable: true,
        });
      }
    }
  }, [updateSuccess, updateError, isUpdating]);

  const statusRadio = Object.values(AssetStatus).map((status) => {
    const changeStatus = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAssetStatus(e.target.value);
    };

    const statusText = t(`asset:ASSET.STATUS_${status.toUpperCase()}`);

    return (
      <label
        key={status}
        htmlFor={`status-${status}`}
        className="flex items-center gap-8px py-4px text-checkbox-text-primary"
      >
        <input
          type="radio"
          id={`status-${status}`}
          name="status"
          className={radioButtonStyle}
          value={status}
          checked={assetStatus === status}
          onChange={changeStatus}
        />
        <p>{statusText}</p>
      </label>
    );
  });

  const isDisplayedAssetStatusSettingModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <form
        onSubmit={updateAssetHandler}
        className="relative flex w-90vw flex-col items-center gap-24px rounded-md bg-card-surface-primary px-24px py-26px shadow-lg shadow-black/80 md:w-600px"
      >
        {/* Info: (20240926 - Julian) Close button */}
        <button type="button" onClick={modalVisibilityHandler} className="absolute right-4 top-4">
          <RxCross2 size={24} className="text-icon-surface-single-color-primary" />
        </button>
        {/* Info: (20240926 - Julian) Title */}
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-card-text-primary">
            {t('asset:STATUS_SETTING_MODAL.TITLE')}
          </h1>
          <p className="text-xs text-card-text-secondary">
            {t('asset:STATUS_SETTING_MODAL.SUBTITLE')}
          </p>
        </div>
        {/* Info: (20240926 - Julian) Date picker */}
        <div className="flex w-full flex-col items-start gap-8px">
          <p className="text-sm font-bold text-input-text-primary">
            {t('asset:STATUS_SETTING_MODAL.UPDATE_DATE')}
            <span className="ml-4px text-text-state-error">*</span>
          </p>
          <DatePicker
            type={DatePickerType.TEXT_DATE}
            period={selectedPeriod}
            setFilteredPeriod={setSelectedPeriod}
            btnClassName="w-full"
          />
        </div>
        {/* Info: (20240926 - Julian) Status */}
        <div className="flex w-full flex-col items-start gap-8px">
          <p className="text-sm font-bold text-input-text-primary">
            {t('asset:STATUS_SETTING_MODAL.STATUS')}
          </p>
          <div className="flex items-center gap-32px">{statusRadio}</div>
        </div>
        {/* Info: (20240926 - Julian) buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryOutline" onClick={modalVisibilityHandler}>
            {t('common:COMMON.CANCEL')}
          </Button>
          {/* ToDo: (20240926 - Julian) Implement SAVE function */}
          <Button type="submit" disabled={saveBtnDisabled}>
            <p>{t('common:COMMON.SAVE')}</p>
            <BiSave size={20} />
          </Button>
        </div>
      </form>
    </div>
  ) : null;

  return isDisplayedAssetStatusSettingModal;
};

export default AssetStatusSettingModal;
