import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { haloStyle, orangeRadioStyle } from '@/constants/display';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { IPersonalInfo } from '@/interfaces/resume';
import { useHiringCtx } from '@/contexts/hiring_context';
import loggerFront from '@/lib/utils/logger_front';

interface ITFQuestionProps {
  id: string;
  question: string;
  answer: boolean | null;
  onChange: (answer: boolean) => void;
}

interface IPersonalInfoFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

const TFQuestion: React.FC<ITFQuestionProps> = ({ id, question, answer, onChange }) => {
  const { t } = useTranslation(['hiring']);

  const isCheckedYes = answer === true;
  const isCheckedNo = answer === false;

  const changeYes = () => onChange(true);
  const changeNo = () => onChange(false);

  const toggleAnswer = () => onChange(!answer);

  return (
    <div className="flex items-center justify-between">
      <p onClick={toggleAnswer} className="hover:cursor-pointer">
        {t(question)} <span className="ml-px text-stroke-state-error">*</span>
      </p>

      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-lv-2 text-white">
          <input
            type="radio"
            id={`${id}-yes`}
            name={id}
            value="yes"
            checked={isCheckedYes}
            onChange={changeYes}
            className={orangeRadioStyle}
            required
          />
          <label htmlFor={`${id}-yes`} className="hover:cursor-pointer">
            {t('hiring:PERSONAL_INFO.YES')}
          </label>
        </div>
        <div className="flex items-center gap-lv-2 text-white">
          <input
            type="radio"
            id={`${id}-no`}
            name={id}
            value="no"
            checked={isCheckedNo}
            onChange={changeNo}
            className={orangeRadioStyle}
            required
          />
          <label htmlFor={`${id}-no`} className="hover:cursor-pointer">
            {t('hiring:PERSONAL_INFO.NO')}
          </label>
        </div>
      </div>
    </div>
  );
};

const PersonalInfoForm: React.FC<IPersonalInfoFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  const { tempPersonalInfo, savePersonalInfo } = useHiringCtx();

  const inputStyle = `${haloStyle} rounded-full h-60px w-full outline-none px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const questions = [
    { id: 'related-company', question: 'hiring:PERSONAL_INFO.QUESTION_1_TITLE' },
    { id: 'working-isuncloud', question: 'hiring:PERSONAL_INFO.QUESTION_2_TITLE' },
    { id: 'criminal-record', question: 'hiring:PERSONAL_INFO.QUESTION_3_TITLE' },
  ];

  const learnAboutJobOptions = ['104', 'FB', 'Linkedin', 'OW', 'Others'];

  // Info: (20250505 - Julian) input 預設值
  const {
    firstName: initialFirstName,
    lastName: initialLastName,
    phoneNumber: initialPhoneNumber,
    email: initialEmail,
    address: initialAddress,
    isRelatedCompany: initialIsRelatedCompany,
    isWorkingISunCloud: initialIsWorkingISunCloud,
    hasCriminalRecord: initialHasCriminalRecord,
    whereLearnAboutJob: initialWhereLearnAboutJob,
  } = tempPersonalInfo || {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    address: '',
    isRelatedCompany: null,
    isWorkingISunCloud: null,
    hasCriminalRecord: null,
    whereLearnAboutJob: learnAboutJobOptions[0],
  };

  const [firstNameInput, setFirstNameInput] = useState<string>(initialFirstName);
  const [lastNameInput, setLastNameInput] = useState<string>(initialLastName);
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>(initialPhoneNumber);
  const [emailInput, setEmailInput] = useState<string>(initialEmail);
  const [addressInput, setAddressInput] = useState<string>(initialAddress);
  const [isRelatedCompany, setIsRelatedCompany] = useState<boolean | null>(initialIsRelatedCompany);
  const [isWorkingISunCloud, setIsWorkingISunCloud] = useState<boolean | null>(
    initialIsWorkingISunCloud
  );
  const [hasCriminalRecord, setHasCriminalRecord] = useState<boolean | null>(
    initialHasCriminalRecord
  );
  const [whereLearnAboutJob, setWhereLearnAboutJob] = useState<string>(initialWhereLearnAboutJob);

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setTypeOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const disableSubmit =
    isRelatedCompany === null || isWorkingISunCloud === null || hasCriminalRecord === null;

  const toggleDropdown = () => setTypeOpen(!isOpen);

  const changeFirstName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstNameInput(e.target.value);
  };
  const changeLastName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastNameInput(e.target.value);
  };
  const changePhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumberInput(e.target.value);
  };
  const changeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
  };
  const changeAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressInput(e.target.value);
  };

  // Info: (20250410 - Julian) 提交表單
  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (disableSubmit) return;

    try {
      const formData: IPersonalInfo = {
        firstName: firstNameInput,
        lastName: lastNameInput,
        phoneNumber: phoneNumberInput,
        email: emailInput,
        address: addressInput,
        isRelatedCompany,
        isWorkingISunCloud,
        hasCriminalRecord,
        whereLearnAboutJob,
      };

      // Info: (20250505 - Julian) 儲存個人資訊至 HiringContext
      savePersonalInfo(formData);

      // Info: (20250410 - Julian) 進行到下一步
      toNextStep();
    } catch (error) {
      loggerFront.error('Error submitting form:', error);
    }
  };

  const tfQuestions = questions.map((question, index) => {
    const answer =
      index === 0 ? isRelatedCompany : index === 1 ? isWorkingISunCloud : hasCriminalRecord;

    const onChange = (ans: boolean) => {
      if (index === 0) {
        setIsRelatedCompany(ans);
      } else if (index === 1) {
        setIsWorkingISunCloud(ans);
      } else {
        setHasCriminalRecord(ans);
      }
    };

    return (
      <TFQuestion
        key={question.id}
        id={question.id}
        question={question.question}
        answer={answer}
        onChange={onChange}
      />
    );
  });

  const whereDropdown = (
    <div
      className={`${
        isOpen ? 'grid-rows-1 opacity-100' : 'grid-rows-0 opacity-0'
      } ${haloStyle} absolute top-40px z-10 grid w-full grid-cols-1 overflow-hidden rounded-sm transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col">
        {learnAboutJobOptions.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              setWhereLearnAboutJob(option);
              setTypeOpen(false);
            }}
            className="px-24px py-4px text-left hover:text-landing-page-orange"
          >
            {t(`hiring:PERSONAL_INFO.WHERE_OPTION_${option.toUpperCase()}`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form className="flex flex-col" onSubmit={submitHandler}>
      {/* Info: (20250410 - Julian) Input Fields */}
      <div className="grid grid-cols-2 gap-x-44px gap-y-24px lg:w-840px">
        {/* Info: (20250410 - Julian) First Name */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            {t('hiring:PERSONAL_INFO.FIRST_NAME_TITLE')}{' '}
            <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="text"
            className={inputStyle}
            placeholder={'John'}
            value={firstNameInput}
            onChange={changeFirstName}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Last Name */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            {t('hiring:PERSONAL_INFO.LAST_NAME_TITLE')}{' '}
            <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="text"
            className={inputStyle}
            placeholder={'Chen'}
            value={lastNameInput}
            onChange={changeLastName}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Phone Number */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            {t('hiring:PERSONAL_INFO.PHONE_TITLE')}{' '}
            <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="tel"
            className={inputStyle}
            placeholder={'0912345678'}
            value={phoneNumberInput}
            onChange={changePhoneNumber}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Email */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            {t('hiring:PERSONAL_INFO.EMAIL_TITLE')}{' '}
            <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="email"
            className={inputStyle}
            placeholder={'abc123@himail.com'}
            value={emailInput}
            onChange={changeEmail}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Address */}
        <div className="col-span-2 flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            {t('hiring:PERSONAL_INFO.ADDRESS_TITLE')}
          </p>
          <input
            type="text"
            className={inputStyle}
            placeholder={
              '13F.-6, No. 2, Ln. 150, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City 110416 , Taiwan'
            }
            value={addressInput}
            onChange={changeAddress}
          />
        </div>
      </div>

      {/* Info: (20250410 - Julian) True/False Questions */}
      <div className="mt-24px flex flex-col gap-50px">
        {tfQuestions}

        {/* Info: (20250410 - Julian) Where did you learn about this job opening? */}
        <div className="flex items-center justify-between">
          <p>{t('hiring:PERSONAL_INFO.QUESTION_4_TITLE')}</p>
          <div ref={targetRef} className="relative flex flex-col">
            <div
              onClick={toggleDropdown}
              className={`${haloStyle} ${isOpen ? 'border-surface-brand-primary-moderate text-surface-brand-primary-moderate' : 'border-white'} flex items-center gap-8px rounded-full px-24px py-4px hover:cursor-pointer hover:border-surface-brand-primary-moderate hover:text-surface-brand-primary-moderate`}
            >
              <p className="w-120px">
                {t(`hiring:PERSONAL_INFO.WHERE_OPTION_${whereLearnAboutJob.toUpperCase()}`)}
              </p>
              <FaChevronDown />
            </div>
            {whereDropdown}
          </div>
        </div>
      </div>

      <div className="ml-auto mt-70px flex items-center gap-lv-6">
        {/* Info: (20250410 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
          {t('common:COMMON.CANCEL')}
        </LandingButton>

        {/* Info: (20250410 - Julian) Next Button */}
        <LandingButton
          type="submit"
          variant="primary"
          className="font-bold"
          disabled={disableSubmit}
        >
          {t('hiring:COMMON.NEXT')}
        </LandingButton>
      </div>
    </form>
  );
};

export default PersonalInfoForm;
