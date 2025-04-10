import React, { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';

interface TFQuestionProps {
  id: string;
  question: string;
  answer: boolean;
  onChange: (answer: boolean) => void;
}

const TFQuestion: React.FC<TFQuestionProps> = ({ id, question, answer, onChange }) => {
  const radioStyle =
    'peer relative h-16px w-16px appearance-none rounded-full border border-white before:absolute before:left-2px before:top-2px before:hidden before:h-10px before:w-10px before:rounded-full before:bg-surface-brand-primary-moderate checked:border-surface-brand-primary-moderate checked:before:block hover:bg-surface-brand-primary-30 hover:border-surface-brand-primary';

  const changeYes = () => onChange(true);
  const changeNo = () => onChange(false);

  return (
    <div className="flex items-center justify-between">
      <p>
        {question} <span className="ml-px text-stroke-state-error">*</span>
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
            Yes
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
            No
          </label>
        </div>
      </div>
    </div>
  );
};

const PersonalInfoForm: React.FC = () => {
  const { t } = useTranslation(['hiring', 'common']);

  const haloStyle =
    'border border-white bg-landing-page-black3 outline-none backdrop-blur-md shadow-job backdrop-blur-md';

  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50`;

  const questions = [
    {
      id: 'related-company',
      question: 'Have you ever worked for a related company?',
    },
    {
      id: 'working-isuncloud',
      question: 'Do you currently have any relatives working at iSunCloud?',
    },
    {
      id: 'criminal-record',
      question: 'Do you have any criminal records or a history of bad credit?',
    },
  ];

  const learnAboutJobOptions = ['104', 'Facebook', 'Linkedin', 'Official Web', 'Other'];

  const [firstNaeInput, setFirstNameInput] = useState<string>('');
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
            {t(`hiring:${option}`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form className="flex flex-col gap-y-24px">
      {/* Info: (20250410 - Julian) Input Fields */}
      <div className="grid grid-cols-2 gap-x-44px gap-y-24px lg:w-840px">
        {/* Info: (20250410 - Julian) First Name */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            First Name <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="text"
            className={inputStyle}
            placeholder={'John'}
            value={firstNaeInput}
            onChange={changeFirstName}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Last Name */}
        <div className="flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">
            Last Name <span className="ml-px text-stroke-state-error">*</span>
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
            Phone number <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="text"
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
            Email <span className="ml-px text-stroke-state-error">*</span>
          </p>
          <input
            type="text"
            className={inputStyle}
            placeholder={'abc123@himail.com'}
            value={emailInput}
            onChange={changeEmail}
            required
          />
        </div>

        {/* Info: (20250410 - Julian) Address */}
        <div className="col-span-2 flex flex-col items-start gap-6px pb-32px">
          <p className="text-base font-normal text-white">Address</p>
          <input
            type="text"
            className={inputStyle}
            placeholder={
              '13F.-6, No. 2, Ln. 150, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City 110416 , Taiwan'
            }
            value={addressInput}
            onChange={changeAddress}
            required
          />
        </div>
      </div>

      {/* Info: (20250410 - Julian) True/False Questions */}
      <div className="flex flex-col gap-50px">
        {tfQuestions}
        <div className="flex items-center justify-between">
          <p>Where did you learn about this job opening?</p>
          <div ref={targetRef} className="relative flex flex-col">
            <div
              onClick={toggleDropdown}
              className={`${haloStyle} flex items-center gap-8px rounded-full px-24px py-4px hover:cursor-pointer`}
            >
              <p className="w-120px">{whereLearnAboutJob}</p>
              <FaChevronDown />
            </div>
            {whereDropdown}
          </div>
        </div>
      </div>
    </form>
  );
};

export default PersonalInfoForm;
