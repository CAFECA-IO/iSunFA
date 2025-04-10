import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { IPersonalInfo } from '@/interfaces/resume';

interface ITFQuestionProps {
  id: string;
  question: string;
  answer: boolean;
  onChange: (answer: boolean) => void;
}

interface IPersonalInfoFormProps {
  toNextStep: () => void;
}

const TFQuestion: React.FC<ITFQuestionProps> = ({ id, question, answer, onChange }) => {
  const { t } = useTranslation(['hiring']);

  const radioStyle =
    'peer relative h-16px w-16px appearance-none rounded-full border border-white before:absolute before:left-2px before:top-2px before:hidden before:h-10px before:w-10px before:rounded-full before:bg-surface-brand-primary-moderate checked:border-surface-brand-primary-moderate checked:before:block hover:bg-surface-brand-primary-30 hover:border-surface-brand-primary';

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
            checked={answer}
            onChange={changeYes}
            className={radioStyle}
            required
          />
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
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
            checked={!answer}
            onChange={changeNo}
            className={radioStyle}
            required
          />
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor={`${id}-no`} className="hover:cursor-pointer">
            {t('hiring:PERSONAL_INFO.NO')}
          </label>
        </div>
      </div>
    </div>
  );
};

const PersonalInfoForm: React.FC<IPersonalInfoFormProps> = ({ toNextStep }) => {
  const { t } = useTranslation(['hiring']);
  const router = useRouter();

  const haloStyle =
    'border border-white bg-landing-page-black3 outline-none backdrop-blur-md shadow-job backdrop-blur-md';

  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50`;

  const questions = [
    {
      id: 'related-company',
      question: 'hiring:PERSONAL_INFO.QUESTION_1_TITLE',
    },
    {
      id: 'working-isuncloud',
      question: 'hiring:PERSONAL_INFO.QUESTION_2_TITLE',
    },
    {
      id: 'criminal-record',
      question: 'hiring:PERSONAL_INFO.QUESTION_3_TITLE',
    },
  ];

  const learnAboutJobOptions = ['104', 'FB', 'Linkedin', 'OW', 'Others'];

  const [firstNameInput, setFirstNameInput] = useState<string>('');
  const [lastNameInput, setLastNameInput] = useState<string>('');
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  const [isRelatedCompany, setIsRelatedCompany] = useState<boolean>(false);
  const [isWorkingISunCloud, setIsWorkingISunCloud] = useState<boolean>(false);
  const [hasCriminalRecord, setHasCriminalRecord] = useState<boolean>(false);
  const [whereLearnAboutJob, setWhereLearnAboutJob] = useState<string>(learnAboutJobOptions[0]);

  const {
    targetRef,
    componentVisible: isOpen,
    setComponentVisible: setTypeOpen,
  } = useOuterClick<HTMLDivElement>(false);

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

  // Info: (20250410 - Julian) 回到上一頁
  const cancelClickHandler = () => {
    router.push(`${ISUNFA_ROUTE.JOIN_US}/${router.query.jobId}`);
  };

  // Info: (20250410 - Julian) 提交表單
  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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

    // deprecated: (20250410 - Julian) for debugging
    // eslint-disable-next-line no-console
    console.log('Form Data:', formData);

    // Info: (20250410 - Julian) 進行到下一步
    toNextStep();
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
        <div className="flex items-center justify-between">
          <p>Where did you learn about this job opening?</p>
          <div ref={targetRef} className="relative flex flex-col">
            <div
              onClick={toggleDropdown}
              className={`${haloStyle} ${isOpen ? 'border-surface-brand-primary-moderate text-surface-brand-primary-moderate' : ''} flex items-center gap-8px rounded-full px-24px py-4px hover:cursor-pointer hover:border-surface-brand-primary-moderate hover:text-surface-brand-primary-moderate`}
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
        <LandingButton variant="default" className="font-bold" onClick={cancelClickHandler}>
          {t('common:COMMON.CANCEL')}
        </LandingButton>

        {/* Info: (20250410 - Julian) Next Button */}
        <LandingButton type="submit" variant="primary" className="font-bold">
          {t('hiring:RESUME_PAGE.NEXT_BTN')}
        </LandingButton>
      </div>
    </form>
  );
};

export default PersonalInfoForm;
