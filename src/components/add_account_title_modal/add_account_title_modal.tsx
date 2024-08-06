import { RxCross2 } from 'react-icons/rx';
import { FaPlus } from 'react-icons/fa6';
import { useState, useEffect } from 'react';
import { Button } from '@/components/button/button';
import Skeleton from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccount } from '@/interfaces/accounting_account';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'next-i18next';

interface IAddAccountTitleModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  modalData: {
    accountId: number;
  };
}

const AddAccountTitleModal = ({
  isModalVisible,
  modalVisibilityHandler,
  modalData,
}: IAddAccountTitleModalProps) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { toastHandler } = useGlobalCtx();
  const { getAccountListHandler } = useAccountingCtx();

  const { accountId } = modalData;

  const {
    trigger: getAccountById,
    data: accountData,
    isLoading: isAccountDataLoading,
    success: isAccountDataSuccess,
    code: errorCode,
  } = APIHandler<IAccount>(APIName.ACCOUNT_GET_BY_ID);

  const {
    trigger: createNewSubAccount,
    data: result,
    success: createSuccess,
    code: createCode,
  } = APIHandler<IAccount>(APIName.CREATE_NEW_SUB_ACCOUNT);

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
    }
  }, [accountData]);

  useEffect(() => {
    if (createSuccess && result && selectedCompany) {
      // Info: (20240719 - Julian) 關閉 modal
      modalVisibilityHandler();
      // Info: (20240719 - Julian) 重新取得 account list
      getAccountListHandler(selectedCompany.id);
      // Info: (20240719 - Julian) 顯示 toast
      toastHandler({
        id: `createSubAccount-${createCode}`,
        type: ToastType.SUCCESS,
        // content: `Successfully created new sub account: ${result.name}`,
        content: t('SETTING.SUCCESSFULLY_CREATED_NEW_SUB_ACCOUNT', { name: result.name }),
        closeable: true,
      });
    } else if (createSuccess === false) {
      toastHandler({
        id: `createSubAccount-${createCode}`,
        type: ToastType.ERROR,
        // content: 'Failed to create new sub account, please try again later.',
        content: t('SETTING.FAILED_TO_CREATE_NEW_SUB_ACCOUNT'),
        closeable: true,
      });
    }
  }, [createSuccess, result, createCode]);

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
        content: 'Failed to get account data, please try again later.',
        closeable: true,
      });
    }
  }, [errorCode]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(event.target.value);
  };

  const addNewSubAccount = () => {
    if (selectedCompany && accountId) {
      createNewSubAccount({
        params: { companyId: selectedCompany.id },
        body: {
          accountId,
          name: nameValue,
        },
      });
    }
  };

  const disableSubmit = !nameValue;
  const liquidityText = liquidity ? 'Current' : 'Non-current';

  const displayType = isAccountDataLoading ? (
    <Skeleton width={210} height={46} rounded />
  ) : (
    <input
      id="input-accounting-type"
      type="text"
      // value={accountingType}
      value={t(
        `SETTING.${accountingType.toUpperCase().replace(/ /g, '_').replace(/-/g, '_')}`
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
      // value={liquidityText}
      value={t(`SETTING.${liquidityText.toUpperCase().replace(/ /g, '_').replace(/-/g, '_')}`)}
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
          {/* <h1>Add New Accounting Title</h1> */}
          <h1>{t('SETTING.ADD_NEW_ACCOUNTING_TITLE')}</h1>
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
            {/* <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              Accounting Type
            </p> */}
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              {t('SETTING.ACCOUNTING_TYPE')}
            </p>
            {displayType}
          </div>
          {/* Info: (20240717 - Julian) Liquidity */}
          <div className="flex flex-col gap-y-8px">
            {/* <p className="text-sm font-semibold text-input-text-primary lg:text-base">Liquidity</p> */}
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              {t('SETTING.LIQUIDITY')}
            </p>
            {displayLiquidity}
          </div>
          {/* Info: (20240717 - Julian) Current Asset */}
          <div className="col-span-2 flex flex-col gap-y-8px">
            {/* <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              Current Asset
            </p> */}
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              {t('SETTING.CURRENT_ASSET')}
            </p>
            {displayCurrentAsset}
          </div>
          {/* Info: (20240717 - Julian) Name */}
          <div className="flex flex-col gap-y-8px">
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              {t('SETTING.NAME')}
            </p>
            <input
              id="input-name"
              type="text"
              value={nameValue}
              onChange={handleNameChange}
              // placeholder="Enter name"
              placeholder={t('SETTING.ENTER_NAME')}
              required
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
        </div>
        {/* Info: (20240717 - Julian) Buttons */}
        <div className="flex items-center justify-end gap-12px px-20px py-16px text-sm">
          <Button id="cancel-button" type="button" variant={null} onClick={modalVisibilityHandler}>
            {t('REPORTS_HISTORY_LIST.CANCEL')}
          </Button>
          <Button
            id="add-accounting-title-button"
            type="button"
            variant="tertiary"
            disabled={disableSubmit}
            onClick={addNewSubAccount}
          >
            <p>{t('PROJECT.ADD')}</p> <FaPlus />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAccountTitleModal;
