import { useState, useEffect } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { RiDeleteBinLine } from 'react-icons/ri';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useUserCtx } from '@/contexts/user_context';
import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import { IAccount } from '@/interfaces/accounting_account';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'next-i18next';

interface IEditAccountTitleModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  modalData: {
    accountId: number;
  };
}

const EditAccountTitleModal = ({
  isModalVisible,
  modalVisibilityHandler,
  modalData,
}: IEditAccountTitleModalProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } = useGlobalCtx();
  const { getAccountListHandler, deleteOwnAccountTitle } = useAccountingCtx();
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const { accountId } = modalData;

  const {
    trigger: getAccountById,
    data: accountData,
    isLoading: isAccountDataLoading,
    success: isAccountDataSuccess,
    code: errorCode,
  } = APIHandler<IAccount>(APIName.ACCOUNT_GET_BY_ID);

  const {
    trigger: updateAccountInfoById,
    data: updateResult,
    success: updateSuccess,
    code: updateCode,
  } = APIHandler<IAccount>(APIName.UPDATE_ACCOUNT_INFO_BY_ID);

  const [accountingType, setAccountingType] = useState('');
  const [liquidity, setLiquidity] = useState(false);
  const [currentAssetType, setCurrentAssetType] = useState('');
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (selectedCompany && accountId) {
      getAccountById({
        params: { companyId: selectedCompany.id, accountId },
      });
    }
  }, [selectedCompany, accountId]);

  useEffect(() => {
    if (accountData) {
      setAccountingType(accountData.type);
      setLiquidity(accountData.liquidity);
      setCurrentAssetType(accountData.name);
      setNameValue(accountData.name);
    }
  }, [accountData]);

  useEffect(() => {
    if (updateSuccess && updateResult && selectedCompany) {
      // Info: (20240719 - Julian) 關閉 modal
      modalVisibilityHandler();
      // Info: (20240719 - Julian) 重新取得 account list
      getAccountListHandler(selectedCompany.id);
      // Info: (20240719 - Julian) 顯示 toast
      toastHandler({
        id: `updateAccount-${updateCode}`,
        type: ToastType.SUCCESS,
        content: `${t('setting:SETTING.SUCCESSFULLY_UPDATED_ACCOUNT')} ${updateResult.name}`,
        closeable: true,
      });
    } else if (updateSuccess === false) {
      toastHandler({
        id: `updateAccount-${updateCode}`,
        type: ToastType.ERROR,
        content: t('setting:SETTING.FAILED_TO_UPDATE_ACCOUNT'),
        closeable: true,
      });
    }
  }, [updateSuccess, updateResult, updateCode]);

  useEffect(() => {
    if (!isModalVisible) {
      setNameValue('');
      setAccountingType('');
      setLiquidity(false);
      setCurrentAssetType('');
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (isAccountDataSuccess === false && isModalVisible) {
      toastHandler({
        id: `getAccount-${errorCode}`,
        type: ToastType.ERROR,
        content: t('setting:SETTING.FAILED_TO_GET_ACCOUNT_DATA'),
        closeable: true,
      });
    }
  }, [errorCode]);

  const disableSubmit = !nameValue || nameValue === currentAssetType;
  const liquidityText = liquidity ? 'Current' : 'Non-current';

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(event.target.value);
  };

  const handleSave = () => {
    if (selectedCompany && accountId) {
      updateAccountInfoById({
        params: { companyId: selectedCompany.id, accountId },
        body: {
          name: nameValue,
        },
      });
    }
  };

  const handleRemove = () => {
    messageModalDataHandler({
      title: t('setting:SETTING.REMOVE_ACCOUNTING_TITLE'),
      content: t('setting:SETTING.REMOVE_THIS_ACCOUNTING_TITLE_CHECK'),
      notes: nameValue,
      messageType: MessageType.WARNING,
      submitBtnStr: t('setting:SETTING.REMOVE'),
      submitBtnFunction: () => {
        if (!hasCompanyId) return;
        deleteOwnAccountTitle(selectedCompany?.id, accountId);
        modalVisibilityHandler();
      },
      backBtnStr: t('report_401:REPORTS_HISTORY_LIST.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  const displayType = isAccountDataLoading ? (
    <Skeleton width={210} height={46} rounded />
  ) : (
    <input
      id="input-accounting-type"
      type="text"
      // Info: (20240805 - Anna) value={accountingType}
      value={t(
        `setting:SETTING.${accountingType.toUpperCase().replace(/ /g, '_').replace(/-/g, '_')}`
      )}
      disabled
      className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
    />
  );

  const displayLiquidity = isAccountDataLoading ? (
    <Skeleton width={210} height={46} rounded />
  ) : (
    <input
      id="input-liquidity"
      type="text"
      // Info: (20240805 - Anna) value={liquidityText}
      value={t(
        `setting:SETTING.${liquidityText.toUpperCase().replace(/ /g, '_').replace(/-/g, '_')}`
      )}
      disabled
      className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
    />
  );

  const displayCurrentAsset = isAccountDataLoading ? (
    <Skeleton width={440} height={46} rounded />
  ) : (
    <input
      id="input-current-asset-type"
      type="text"
      value={currentAssetType}
      disabled
      className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
    />
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-barlow">
      <div
        className={`flex w-90vw flex-col items-stretch divide-y divide-stroke-neutral-quaternary rounded-sm bg-surface-neutral-surface-lv2 lg:w-520px`}
      >
        {/* Info: (20240717 - Julian) Title */}
        <div className="relative flex items-center justify-center py-16px text-xl font-bold text-card-text-primary">
          <h1>{t('setting:SETTING.EDIT_MY_NEW_ACCOUNTING_TITLE')}</h1>
          <button
            type="button"
            onClick={modalVisibilityHandler}
            className="absolute right-20px text-icon-surface-single-color-primary"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        {/* Info: (20240717 - Julian) Input */}
        <div className="grid grid-flow-row grid-cols-2 gap-x-20px gap-y-16px px-40px py-20px">
          {/* Info: (20240717 - Julian) Accounting Type */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">
              {t('setting:SETTING.ACCOUNTING_TYPE')}
            </p>
            {displayType}
          </div>
          {/* Info: (20240717 - Julian) Liquidity */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">
              {t('setting:SETTING.LIQUIDITY')}
            </p>
            {displayLiquidity}
          </div>
          {/* Info: (20240717 - Julian) Current Liquidity */}
          <div className="col-span-2 flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">
              {t('setting:SETTING.CURRENT_LIQUIDITY')}
            </p>
            {displayCurrentAsset}
          </div>
          {/* Info: (20240717 - Julian) Name */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">{t('setting:SETTING.NAME')}</p>
            <input
              id="input-name"
              type="text"
              value={nameValue}
              onChange={handleNameChange}
              // Info: (20240805 - Anna) placeholder="Enter name"
              placeholder={t('setting:SETTING.ENTER_NAME')}
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
          {/* Info: (20240718 - Julian) Remove Button */}
          <div className="col-span-2 mx-auto mt-20px">
            <Button
              id="remove-accounting-title-button"
              type="button"
              variant="secondaryOutline"
              onClick={handleRemove}
            >
              <RiDeleteBinLine /> <p>{t('setting:SETTING.REMOVE_ACCOUNTING_TITLE')}</p>
            </Button>
          </div>
        </div>
        {/* Info: (20240717 - Julian) Buttons */}
        <div className="flex items-center justify-end gap-12px px-20px py-16px text-sm">
          <Button id="cancel-button" type="button" variant={null} onClick={modalVisibilityHandler}>
            {t('report_401:REPORTS_HISTORY_LIST.CANCEL')}
          </Button>
          <Button
            id="save-accounting-title-button"
            type="button"
            variant="tertiary"
            disabled={disableSubmit}
            onClick={handleSave}
          >
            {t('common:EDIT_BOOKMARK_MODAL.SAVE')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default EditAccountTitleModal;
