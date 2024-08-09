import { useEffect, useState } from 'react';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa6';
import StepOneTab from '@/components/step_one_tab/step_one_tab';
import StepTwoTab from '@/components/step_two_tab/step_two_tab';
import AccountingStepper from '@/components/accounting_stepper/accounting_stepper';
import { Button } from '@/components/button/button';
import { AccountingStep } from '@/interfaces/stepper_string';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { useTranslation } from 'next-i18next';
import { MessageType } from '@/interfaces/message_modal';
import { useGlobalCtx } from '@/contexts/global_context';

const AddJournalBody = () => {
  const { t } = useTranslation('common');
  const { messageModalVisibilityHandler, messageModalDataHandler } = useGlobalCtx();

  const {
    selectedOCR,
    selectOCRHandler,
    selectedJournal,
    selectJournalHandler,
    // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
    // inputDescriptionHandler,
  } = useAccountingCtx();
  // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
  // const [inputDescription, setInputDescription] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<AccountingStep>(AccountingStep.STEP_ONE);

  const isStepOne = currentStep === AccountingStep.STEP_ONE;

  // Info: (20240422 - Julian) Back button -> 回到上一步
  const backClickHandler = () => {
    setCurrentStep(AccountingStep.STEP_ONE);
    selectOCRHandler(undefined);
    selectJournalHandler(undefined);
    // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
    // setInputDescription('');
  };

  const leaveMessageModal = {
    title: t('JOURNAL.LEAVE_HINT'),
    content: t('JOURNAL.LEAVE_HINT_CONTENT'), // 'Are you sure you want to leave the form?',
    submitBtnStr: t('JOURNAL.LEAVE'),
    submitBtnFunction: () => backClickHandler(),
    cancelBtnStr: t('JOURNAL.CANCEL'),
    cancelBtnFunction: () => messageModalVisibilityHandler(),
    messageType: MessageType.WARNING,
  };

  const leaveFormClickHandler = () => {
    messageModalDataHandler(leaveMessageModal);
    messageModalVisibilityHandler();
  };

  // Info: (20240422 - Julian) Skip -> 直接跳到第二步填表格
  const skipClickHandler = () => {
    selectJournalHandler(undefined);
    setCurrentStep(AccountingStep.STEP_TWO);
    // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
    // setInputDescription('');
  };

  // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
  // const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setInputDescription(event.target.value);
  // };

  // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
  // const handelClick = () => {
  //   inputDescriptionHandler(inputDescription);
  //   setCurrentStep(AccountingStep.STEP_TWO);
  // };

  useEffect(() => {
    // Info: (20240422 - Julian) 如果有 OCR 結果，直接跳到第二步
    if (selectedOCR || selectedJournal) {
      setCurrentStep(AccountingStep.STEP_TWO);
      if (selectedOCR) {
        selectJournalHandler(undefined);
      }
    }
  }, [selectedOCR, selectedJournal]);

  // Info: (20240422 - Julian) 第一步不會顯示 back button
  const displayBackButton = isStepOne ? null : (
    <button
      type="button"
      onClick={leaveFormClickHandler}
      className="rounded border border-navyBlue p-12px text-navyBlue hover:border-primaryYellow hover:text-primaryYellow"
    >
      <FaArrowLeft />
    </button>
  );
  // Info: (20240808 - Anna) Alpha版先隱藏(事件描述)
  // 原本代碼是：
  // const displayStepTab = isStepOne ? (
  //   <StepOneTab
  //     inputDescription={inputDescription}
  //     handleInputChange={handleInputChange}
  //     handelClick={handelClick}
  //   />
  // ) : (
  //   <StepTwoTab />
  // );
  const displayStepTab = isStepOne ? (
    <StepOneTab
    // inputDescription={inputDescription}
    // handleInputChange={handleInputChange}
    // handelClick={handelClick}
    />
  ) : (
    <StepTwoTab />
  );

  const displayButtons = isStepOne ? (
    <div className="absolute right-0 hidden items-center gap-8px md:flex">
      {/* Info: (20240422 - Julian) Skip button */}
      <button
        type="button"
        onClick={skipClickHandler}
        className="flex items-center gap-4px px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
      >
        <p>{t('JOURNAL.SKIP')}</p>
        <FaArrowRight />
      </button>
    </div>
  ) : null;

  const displayButtonsMobile = isStepOne ? (
    <div className="my-20px flex w-full items-center justify-between gap-8px px-20px md:hidden">
      {/* Info: (20240422 - Julian) Skip button */}
      <button
        type="button"
        onClick={skipClickHandler}
        className="flex flex-1 items-center justify-center gap-4px px-16px py-8px text-secondaryBlue hover:text-primaryYellow"
      >
        <p>{t('JOURNAL.SKIP')}</p>
        <FaArrowRight />
      </button>
      {/* Info: (20240422 - Julian) Next button */}
      <Button disabled className="flex-1 px-16px py-8px">
        {t('JOURNAL.NEXT')}
      </Button>
    </div>
  ) : null;

  return (
    <div className="flex h-full w-full bg-gray-100">
      <div className="mt-100px flex-1 md:ml-80px">
        <div className="flex min-h-screen w-full flex-col px-16px pb-80px pt-32px md:p-40px">
          {/* Info: (20240422 - Julian) Title */}
          <div className="flex h-45px items-center gap-24px">
            {displayBackButton}
            <h1 className="text-base font-semibold text-lightGray5 md:text-4xl">
              {t('JOURNAL.ADD_NEW_JOURNAL')}
            </h1>
          </div>

          {/* Info: (20240422 - Julian) Divider */}
          <hr className="my-20px w-full border-lightGray6" />

          {/* Info: (20240422 - Julian) Stepper & Buttons */}
          <div className="relative my-40px flex items-center">
            {/* Info: (20240422 - Julian) Stepper */}
            <div className="mx-auto">
              <AccountingStepper step={currentStep} />
            </div>

            {displayButtons}
          </div>

          {/* Info: (20240422 - Julian) Step tab */}
          {displayStepTab}

          {/* Info: (20240422 - Julian) Mobile Buttons */}
          {displayButtonsMobile}
        </div>
      </div>
    </div>
  );
};

export default AddJournalBody;
