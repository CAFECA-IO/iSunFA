import { useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { RiDeleteBinLine } from 'react-icons/ri';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { Button } from '@/components/button/button';
import { MessageType } from '@/interfaces/message_modal';

interface IEditAccountTitleModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const EditAccountTitleModal = ({
  isModalVisible,
  modalVisibilityHandler,
}: IEditAccountTitleModalProps) => {
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
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

  const handleRemove = () => {
    messageModalDataHandler({
      title: 'Remove Accounting title',
      content: 'Are you sure you want to remove this accounting title?',
      notes: nameValue,
      messageType: MessageType.WARNING,
      submitBtnStr: 'Remove',
      // ToDo: (20240717 - Julian) call API to remove accounting title
      submitBtnFunction: () => {},
      backBtnStr: 'Cancel',
    });
    messageModalVisibilityHandler();
  };

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
            <input
              id="input-accounting-type"
              type="text"
              value={accountingTypeValue}
              onChange={handleAccountingTypeChange}
              placeholder="Assets"
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
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
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
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
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
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
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
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
              className="rounded-md border border-input-stroke-input bg-transparent px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
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
          <Button id="save-accounting-title-button" type="button" variant="tertiary">
            Save
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default EditAccountTitleModal;
