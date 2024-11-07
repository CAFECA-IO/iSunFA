import React from 'react';
import Image from 'next/image';
import { FiEye, FiArrowRight } from 'react-icons/fi';
import { RoleName } from '@/constants/role';
import { useUserCtx } from '@/contexts/user_context';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IntroductionProps {
  showingRole: React.SetStateAction<RoleName | null>;
  togglePreviewModal: () => void;
}
interface ButtonsProps {
  showingRole: RoleName;
  togglePreviewModal: () => void;
}
interface BookkeeperIntroductionProps {
  showingRole: RoleName;
  togglePreviewModal: () => void;
}
interface EducationalTrialVersionIntroductionProps {
  showingRole: RoleName;
  togglePreviewModal: () => void;
}

const DefaultIntroduction: React.FC = () => {
  return (
    <section className="relative h-full">
      <div className="flex flex-col gap-40px pl-60px pt-60px">
        <h1 className="text-nowrap text-64px font-bold text-text-neutral-primary">
          Select Your Role
        </h1>
        <p className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          iSunFA offers various roles for users to choose from, each with its own dedicated
          interface and commonly used features. You can select the role that best suits your needs,
          allowing iSunFA to assist you in your work. The key advantage of iSunFA lies in its
          role-optimized interface and AI-integrated accounting, enabling you to complete tasks more
          efficiently!
        </p>
      </div>

      <div className="absolute right-0 top-0 z-0 w-600px screen1280:w-800px">
        <Image
          src="/images/bg_select_role.png"
          alt="bg_select_role"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const Buttons: React.FC<ButtonsProps> = ({ togglePreviewModal, showingRole }) => {
  const { createRole, selectRole } = useUserCtx();
  const router = useRouter();

  const handleCreateAndSelectRole = async () => {
    try {
      const userRole = await createRole(showingRole);

      if (!userRole || !userRole.role || !userRole.role.id) {
        // Deprecated: (20241107 - Liz)
        // eslint-disable-next-line no-console
        console.log('角色建立失敗: 無效的 userRole 或 role ID', userRole);
        return;
      }

      // 角色建立成功，執行選擇角色的操作
      const res = await selectRole(userRole.role.id);

      // 檢查選擇角色是否成功，失敗則顯示錯誤訊息
      if (!res) {
        // Deprecated: (20241107 - Liz)
        // eslint-disable-next-line no-console
        console.log('選擇角色失敗 userRole.role.id', userRole.role.id);
        return;
      }

      // 選擇角色成功，導向至儀表板
      router.push(ISUNFA_ROUTE.BETA_DASHBOARD);
    } catch (error) {
      // Info: (20241029 - Liz) 處理錯誤的邏輯，例如顯示錯誤訊息
      // console.error("發生錯誤:", error);
    }
  };

  return (
    <div className="flex gap-40px">
      <button
        type="button"
        className="flex items-center gap-8px rounded-xs border border-button-stroke-secondary px-32px py-14px text-lg font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
        onClick={togglePreviewModal}
      >
        <p>Preview</p>
        <FiEye size={24} />
      </button>

      <button
        type="button"
        className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={handleCreateAndSelectRole}
      >
        <p>Start</p>
        <FiArrowRight size={24} />
      </button>
    </div>
  );
};

const BookkeeperIntroduction: React.FC<BookkeeperIntroductionProps> = ({
  showingRole,
  togglePreviewModal,
}) => {
  return (
    <section className="relative h-full">
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

        <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          <p>{`A bookkeeper is a professional financial worker responsible for managing the daily financial records and accounting tasks of a business or individual. Their primary duties include preparing accounting vouchers, recording entries in ledgers, reconciling accounts, and generating financial statements to ensure the accuracy and completeness of financial information.`}</p>
          <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">Common Functions</h3>
          <p>General Ledger, Voucher Issuance, Preparation of Financial and Tax Reports</p>
        </div>

        <Buttons showingRole={showingRole} togglePreviewModal={togglePreviewModal} />
      </div>

      <div className="absolute right-0 top-0 z-0 w-500px screen1280:w-600px">
        <Image
          src="/images/bg_bookkeeper.png"
          alt="bg_bookkeeper"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const EducationalTrialVersionIntroduction: React.FC<EducationalTrialVersionIntroductionProps> = ({
  showingRole,
  togglePreviewModal,
}) => {
  return (
    <section className="relative h-full">
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

        <div className="w-2/5 text-sm font-semibold text-text-neutral-secondary">
          <p>
            {`The iSunFA Student Version is an educational tool tailored for students and interns in the accounting field. It offers practical hands-on experience in managing financial tasks such as creating accounting vouchers, journal entries, and reconciling accounts. It's ideal for building a solid foundation in financial management and preparing for professional bookkeeping or accounting roles.`}
          </p>
          <h3 className="pt-24px text-xl font-bold text-text-neutral-primary">Common Functions</h3>
          <p>General Ledger, Voucher Issuance</p>
        </div>

        <Buttons showingRole={showingRole} togglePreviewModal={togglePreviewModal} />
      </div>

      <div className="absolute right-0 top-0 z-0 w-500px screen1280:w-600px">
        <Image
          src="/images/bg_educational_trial_version.png"
          alt="bg_educational_trial_version"
          width={600}
          height={600}
          className="w-full"
        ></Image>
      </div>
    </section>
  );
};

const Introduction: React.FC<IntroductionProps> = ({ showingRole, togglePreviewModal }) => {
  return (
    <>
      {!showingRole && <DefaultIntroduction />}
      {showingRole === RoleName.BOOKKEEPER && (
        <BookkeeperIntroduction showingRole={showingRole} togglePreviewModal={togglePreviewModal} />
      )}
      {showingRole === RoleName.EDUCATIONAL_TRIAL_VERSION && (
        <EducationalTrialVersionIntroduction
          showingRole={showingRole}
          togglePreviewModal={togglePreviewModal}
        />
      )}
    </>
  );
};

export default Introduction;
