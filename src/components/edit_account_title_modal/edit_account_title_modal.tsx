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
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';

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
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } = useGlobalCtx();
  const { getAccountListHandler, deleteOwnAccountTitle } = useAccountingCtx();
  const { selectedCompany } = useUserCtx();
  const { accountId } = modalData;

  const {
    trigger: getAccountById,
    data: accountData,
    isLoading: isAccountDataLoading,
    success: isAccountDataSuccess,
    code: errorCode,
  } = APIHandler<IAccount>(APIName.ACCOUNT_GET_BY_ID, {}, false, false);

  const {
    trigger: updateAccountInfoById,
    data: updateResult,
    success: updateSuccess,
    code: updateCode,
  } = APIHandler<IAccount>(APIName.UPDATE_ACCOUNT_INFO_BY_ID, {}, false, false);

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
        content: `Successfully updated account: ${updateResult.name}`,
        closeable: true,
      });
    } else if (updateSuccess === false) {
      toastHandler({
        id: `updateAccount-${updateCode}`,
        type: ToastType.ERROR,
        content: 'Failed to update account, please try again later.',
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
        content: 'Failed to get account data, please try again later.',
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
      title: 'Remove Accounting title',
      content: 'Are you sure you want to remove this accounting title?',
      notes: nameValue,
      messageType: MessageType.WARNING,
      submitBtnStr: 'Remove',
      submitBtnFunction: () =>
        deleteOwnAccountTitle(selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID, accountId),
      backBtnStr: 'Cancel',
    });
    messageModalVisibilityHandler();
  };

  const displayType = isAccountDataLoading ? (
    <Skeleton width={210} height={46} rounded />
  ) : (
    <input
      id="input-accounting-type"
      type="text"
      value={accountingType}
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
      value={liquidityText}
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
          <h1>Edit My New Accounting Title</h1>
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
            <p className="font-semibold text-input-text-primary">Accounting Type</p>
            {displayType}
          </div>
          {/* Info: (20240717 - Julian) Liquidity */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Liquidity</p>
            {displayLiquidity}
          </div>
          {/* Info: (20240717 - Julian) Current Liquidity */}
          <div className="col-span-2 flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Current Liquidity</p>
            {displayCurrentAsset}
          </div>
          {/* Info: (20240717 - Julian) Name */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Name</p>
            <input
              id="input-name"
              type="text"
              value={nameValue}
              onChange={handleNameChange}
              placeholder="Enter name"
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
              <RiDeleteBinLine /> <p>Remove Accounting Title</p>
            </Button>
          </div>
        </div>
        {/* Info: (20240717 - Julian) Buttons */}
        <div className="flex items-center justify-end gap-12px px-20px py-16px text-sm">
          <Button id="cancel-button" type="button" variant={null} onClick={modalVisibilityHandler}>
            Cancel
          </Button>
          <Button
            id="save-accounting-title-button"
            type="button"
            variant="tertiary"
            disabled={disableSubmit}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default EditAccountTitleModal;
