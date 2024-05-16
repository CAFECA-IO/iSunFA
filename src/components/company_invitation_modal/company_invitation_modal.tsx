import React, { useState } from 'react';
import { Button } from '@/components/button/button';
import { RxCross2 } from 'react-icons/rx';
import { IToastify, ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';

interface ICompanyInvitationModal {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  toastHandler: (props: IToastify) => void;
}

const CompanyInvitationModal = ({
  isModalVisible,
  modalVisibilityHandler,
  toastHandler,
}: ICompanyInvitationModal) => {
  const [codeInput, setCodeInput] = useState<string>('');
  const [isCodeValid, setIsCodeValid] = useState<boolean>(true);

  const changeCodeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodeInput(e.target.value);
  };

  const cancelBtnClickHandler = () => {
    setCodeInput('');
    setIsCodeValid(true);
    modalVisibilityHandler();
  };

  const submitBtnClickHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Info: (20240515 - Julian) Verify invitation code
    const codeRegex = /^[A-Za-z0-9]{8}$/; // ToDo: (20240515 - Julian) code regex
    setIsCodeValid(codeRegex.test(codeInput));

    // ToDo: (20240515 - Julian) Implement API call to verify invitation code
    // ToDo: (20240515 - Julian) Success handling
    if (codeRegex.test(codeInput)) {
      // Info: (20240515 - Julian) Close modal
      setCodeInput('');
      modalVisibilityHandler();
      // Info: (20240515 - Julian) Toastify
      const defaultCompanyName = 'ISUNONE';
      toastHandler({
        id: ToastId.INVITATION_SUCCESS,
        type: ToastType.SUCCESS,
        content: (
          <p>
            Congratulations! You&apos;ve successfully joined the{' '}
            <span className="font-semibold">{defaultCompanyName}</span> team!
          </p>
        ),
        closeable: true,
      });
    } else {
      // ToDo: (20240515 - Julian) Error handling
    }
  };

  const isDisplayedCompanyInvitationModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <form
        onSubmit={submitBtnClickHandler}
        className="relative mx-auto flex w-350px flex-col items-center gap-y-24px rounded-lg bg-white py-16px shadow-lg shadow-black/80"
      >
        {/* Info: (20240515 - Julian) Title */}
        <div className="flex justify-center px-20px">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold leading-8 text-navyBlue2">Invitation Code</h2>
            <p className="text-xs font-normal leading-tight tracking-tight text-lightGray5">
              Enter your Company invitation code
            </p>
          </div>
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="absolute right-3 top-3 flex items-center justify-center text-darkBlue2"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        <div className="flex w-full flex-col justify-center gap-8px px-20px py-10px">
          {/* Info: (20240515 - Julian) Invitation Code */}
          <div
            className={`inline-flex w-full items-center gap-12px divide-x rounded-sm border px-12px shadow ${isCodeValid ? 'divide-lightGray3 border-lightGray3 text-darkBlue2' : 'divide-lightRed border-lightRed text-lightRed'}`}
          >
            <p className={isCodeValid ? 'text-lightGray4' : 'text-lightRed'}>Invitation Code</p>
            <input
              id="invitationCodeInput"
              type="text"
              placeholder="Enter code"
              value={codeInput}
              onChange={changeCodeHandler}
              required
              className="w-full flex-1 px-12px py-10px outline-none placeholder:text-lightGray4"
            />
          </div>
          <p className={`text-right text-lightRed ${isCodeValid ? 'opacity-0' : 'opacity-100'}`}>
            Format Error!
          </p>
        </div>
        <div className="flex w-full justify-end gap-3 whitespace-nowrap px-20px text-sm font-medium leading-5 tracking-normal">
          <button
            type="button"
            onClick={cancelBtnClickHandler}
            className="rounded-sm px-4 py-2 text-secondaryBlue hover:text-primaryYellow"
          >
            Cancel
          </button>
          <Button type="submit" variant={'tertiary'}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  ) : null;

  return <div className="font-barlow">{isDisplayedCompanyInvitationModal}</div>;
};

export default CompanyInvitationModal;
