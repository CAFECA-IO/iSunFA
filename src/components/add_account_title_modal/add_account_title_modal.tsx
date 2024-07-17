import { RxCross2 } from 'react-icons/rx';
import { FaPlus } from 'react-icons/fa6';
import { useState } from 'react';
import { Button } from '@/components/button/button';

interface IAddAccountTitleModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AddAccountTitleModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: IAddAccountTitleModalProps) => {
  // ToDo: (20240717 - Julian) placeholder from props

  const [accountingTypeValue, setAccountingTypeValue] = useState('');
  const [assetTypeValue, setAssetTypeValue] = useState('');
  const [currentAssetTypeValue, setCurrentAssetTypeValue] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [nameValue, setNameValue] = useState('');

  const handleAccountingTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountingTypeValue(event.target.value);
  };
  const handleAssetTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetTypeValue(event.target.value);
  };
  const handleCurrentAssetTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentAssetTypeValue(event.target.value);
  };
  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCodeValue(event.target.value);
  };
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameValue(event.target.value);
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 font-barlow">
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
            <p className="font-semibold text-input-text-primary">Accounting Type</p>
            <input
              id="input-accounting-type"
              type="text"
              value={accountingTypeValue}
              onChange={handleAccountingTypeChange}
              placeholder="Assets"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
          {/* Info: (20240717 - Julian) Asset Type */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Asset Type</p>
            <input
              id="input-asset-type"
              type="text"
              value={assetTypeValue}
              onChange={handleAssetTypeChange}
              placeholder="Non-Current Assets"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
          {/* Info: (20240717 - Julian) Current Asset Type */}
          <div className="col-span-2 flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Current Asset Type</p>
            <input
              id="input-current-asset-type"
              type="text"
              value={currentAssetTypeValue}
              onChange={handleCurrentAssetTypeChange}
              placeholder="Consolidated financial assets"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
          {/* Info: (20240717 - Julian) Code */}
          <div className="flex flex-col gap-y-8px">
            <p className="font-semibold text-input-text-primary">Code</p>
            <input
              id="input-code"
              type="text"
              value={codeValue}
              onChange={handleCodeChange}
              placeholder="1234"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
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
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
        </div>
        {/* Info: (20240717 - Julian) Buttons */}
        <div className="flex items-center justify-end gap-12px px-20px py-16px text-sm">
          <Button id="cancel-button" type="button" variant={null} onClick={modalVisibilityHandler}>
            Cancel
          </Button>
          <Button id="add-accounting-title-button" type="button" variant="tertiary">
            <p>Add</p> <FaPlus />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddAccountTitleModal;
