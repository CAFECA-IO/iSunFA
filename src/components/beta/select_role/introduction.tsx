import React from 'react';
import Image from 'next/image';
import { FiEye, FiArrowRight } from 'react-icons/fi';
import { RoleId } from '@/constants/role';

interface IntroductionProps {
  role: React.SetStateAction<string>;
}

const DefaultIntroduction = () => {
  return (
    <section className="h-600px bg-bg_select_role bg-contain bg-right-top bg-no-repeat">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          Select Your Role
        </h1>
        <p className="w-400px text-sm font-semibold text-text-neutral-secondary">
          iSunFA offers various roles for users to choose from, each with its own dedicated
          interface and commonly used features. You can select the role that best suits your needs,
          allowing iSunFA to assist you in your work. The key advantage of iSunFA lies in its
          role-optimized interface and AI-integrated accounting, enabling you to complete tasks more
          efficiently!
        </p>
      </div>
    </section>
  );
};

const Buttons = () => {
  const handlePreview = () => {
    // Deprecated: (20241007 - Liz)
    // eslint-disable-next-line no-console
    console.log('Preview');
  };

  const handleStart = () => {
    // Deprecated: (20241007 - Liz)
    // eslint-disable-next-line no-console
    console.log('Start');
  };

  return (
    <div className="flex gap-40px">
      <button
        type="button"
        className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary px-32px py-14px text-lg font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
        onClick={handlePreview}
      >
        <p>Preview</p>
        <FiEye size={24} />
      </button>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleStart}
      >
        <p>Start</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const BookkeeperIntroduction = () => {
  return (
    <section className="h-600px bg-bg_bookkeeper bg-contain bg-right-top bg-no-repeat">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
        <div className="flex items-center gap-24px">
          <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">Bookkeeper</h1>
          <Image
            src={'/icons/information_desk.svg'}
            alt="information_desk"
            width={30}
            height={30}
          ></Image>
        </div>

        <div className="w-400px text-sm font-semibold text-text-neutral-secondary">
          <p>{`A bookkeeper is a professional financial worker responsible for managing the daily financial records and accounting tasks of a business or individual. Their primary duties include preparing accounting vouchers, recording entries in ledgers, reconciling accounts, and generating financial statements to ensure the accuracy and completeness of financial information.`}</p>
          <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">Common Functions</h3>
          <p>General Ledger, Voucher Issuance, Preparation of Financial and Tax Reports</p>
        </div>

        <Buttons />
      </div>
    </section>
  );
};

const EducationalTrialVersionIntroduction = () => {
  return (
    <section className="h-600px bg-bg_educational_trial_version bg-contain bg-right-top bg-no-repeat">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
        <div className="flex items-center gap-24px">
          <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
            Educational
            <span className="ml-8px text-28px text-text-neutral-tertiary">(Trial Version)</span>
          </h1>
          <Image
            src={'/icons/graduation_cap.svg'}
            alt="graduation_cap"
            width={30}
            height={30}
          ></Image>
        </div>

        <div className="w-400px text-sm font-semibold text-text-neutral-secondary">
          <p>
            {`The iSunFA Student Version is an educational tool tailored for students and interns in the accounting field. It offers practical hands-on experience in managing financial tasks such as creating accounting vouchers, journal entries, and reconciling accounts. It's ideal for building a solid foundation in financial management and preparing for professional bookkeeping or accounting roles.`}
          </p>
          <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">Common Functions</h3>
          <p>General Ledger, Voucher Issuance</p>
        </div>

        <Buttons />
      </div>
    </section>
  );
};

const Introduction = ({ role }: IntroductionProps) => {
  return (
    <>
      {!role && <DefaultIntroduction />}
      {role === RoleId.BOOKKEEPER && <BookkeeperIntroduction />}
      {role === RoleId.EDUCATIONAL_TRIAL_VERSION && <EducationalTrialVersionIntroduction />}
    </>
  );
};

export default Introduction;
