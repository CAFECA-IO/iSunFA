import { RxCross2 } from 'react-icons/rx';
import { FaPlus } from 'react-icons/fa6';
import { useState } from 'react';
import { Button } from '@/components/button/button';
import { dummyAccountingTitleData } from '@/interfaces/accounting_account';

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
  const { accountId } = modalData;
  // ToDo: (20240717 - Julian) placeholder from API data
  const parentAccount = dummyAccountingTitleData.find((data) => data.id === accountId);

  const accountingType = parentAccount?.type;
  const liquidity = parentAccount?.liquidity;
  const currentAssetType = parentAccount?.name;

  const [nameValue, setNameValue] = useState('');

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(event.target.value);
  };

  const disableSubmit = !nameValue;

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-barlow">
      <div
        className={`flex w-90vw flex-col items-stretch divide-y divide-stroke-neutral-quaternary rounded-sm bg-surface-neutral-surface-lv2 lg:w-520px`}
      >
        {/* Info: (20240717 - Julian) Title */}
        <div className="relative flex items-center justify-center py-16px text-xl font-bold text-card-text-primary">
          <h1>Add New Accounting Title</h1>
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
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              Accounting Type
            </p>
            <input
              id="input-accounting-type"
              type="text"
              value={accountingType}
              disabled
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
          {/* Info: (20240717 - Julian) Liquidity */}
          <div className="flex flex-col gap-y-8px">
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">Liquidity</p>
            <input
              id="input-liquidity"
              type="text"
              value={`${liquidity}`}
              disabled
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
          {/* Info: (20240717 - Julian) Current Asset */}
          <div className="col-span-2 flex flex-col gap-y-8px">
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">
              Current Asset
            </p>
            <input
              id="input-current-asset-type"
              type="text"
              value={currentAssetType}
              disabled
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
          {/* Info: (20240717 - Julian) Name */}
          <div className="flex flex-col gap-y-8px">
            <p className="text-sm font-semibold text-input-text-primary lg:text-base">Name</p>
            <input
              id="input-name"
              type="text"
              value={nameValue}
              onChange={handleNameChange}
              placeholder="Enter name"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            />
          </div>
        </div>
        {/* Info: (20240717 - Julian) Buttons */}
        <div className="flex items-center justify-end gap-12px px-20px py-16px text-sm">
          <Button id="cancel-button" type="button" variant={null} onClick={modalVisibilityHandler}>
            Cancel
          </Button>
          <Button
            id="add-accounting-title-button"
            type="button"
            variant="tertiary"
            disabled={disableSubmit}
          >
            <p>Add</p> <FaPlus />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAccountTitleModal;
