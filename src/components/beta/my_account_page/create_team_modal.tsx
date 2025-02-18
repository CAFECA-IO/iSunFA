import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa6';
import { IoMailOutline } from 'react-icons/io5';
import { RxCross2 } from 'react-icons/rx';
import { PLANS } from '@/constants/subscription';
import { Button } from '@/components/button/button';
import SubscriptionPlan from '@/components/beta/team_subscription_page/subscription_plan';
import { APIName } from '@/constants/api_connection';
import { IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { IMember } from '@/interfaces/member';

interface ICreateTeamModalProps {
  modalVisibilityHandler: () => void;
}

const CreateTeamStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const step1src = currentStep === 1 ? '/icons/team_name_active.svg' : '/icons/team_name.svg';
  const step1textColor =
    currentStep === 1 ? 'text-stepper-text-active' : 'text-stepper-text-finish';

  const line1Color = currentStep === 1 ? 'bg-stepper-surface-base' : 'bg-stepper-text-finish';

  const step2src =
    currentStep === 1
      ? '/icons/team_member_disabled.svg'
      : currentStep === 2
        ? '/icons/team_member_active.svg'
        : '/icons/team_member.svg';
  const step2textColor =
    currentStep === 1
      ? 'text-stepper-text-default'
      : currentStep === 2
        ? 'text-stepper-text-active'
        : 'text-stepper-text-finish';

  const line2Color = currentStep === 3 ? 'bg-stepper-text-finish' : 'bg-stepper-surface-base';

  const step3src =
    currentStep === 3 ? '/icons/sub_plan_active.svg' : '/icons/sub_plan_disabled.svg';
  const step3textColor =
    currentStep === 3 ? 'text-stepper-text-active' : 'text-stepper-text-default';

  return (
    <div className="relative mx-auto flex w-320px items-center justify-between -space-x-10">
      {/* Info: (20250218 - Julian) Step 1 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step1src} width={30} height={30} alt="create_team_step_1" />
        <p className={`text-xs font-medium ${step1textColor}`}>Team Name</p>
      </div>

      {/* Info: (20250218 - Julian) Line 1 */}
      <div className={`z-0 h-4px w-120px -translate-y-8px ${line1Color}`}></div>

      {/* Info: (20250218 - Julian) Step 2 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step2src} width={30} height={30} alt="create_team_step_2" />
        <p className={`text-xs font-medium ${step2textColor}`}>Member</p>
      </div>

      {/* Info: (20250218 - Julian) Line 2 */}
      <div className={`z-0 h-4px w-120px -translate-y-8px ${line2Color}`}></div>

      {/* Info: (20250218 - Julian) Step 3 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step3src} width={30} height={30} alt="create_team_step_3" />
        <p className={`text-xs font-medium ${step3textColor}`}>Sub Plan</p>
      </div>
    </div>
  );
};

const CreateTeamModal: React.FC<ICreateTeamModalProps> = ({ modalVisibilityHandler }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  const [teamMemberInput, setTeamMemberInput] = useState<string>(''); // Info: (20250218 - Julian) input value
  // Deprecated: (20250218 - Julian) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamMembers, setTeamMembers] = useState<IMember[]>([]);

  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);

  // ToDo: (20250218 - Julian) For testing UI
  const fakeTeam = {
    id: 0,
    name: teamNameInput,
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.PAID,
  };

  const [newTeam, setNewTeam] = useState<IUserOwnedTeam | null>(fakeTeam);

  // ToDo: (20250218 - Julian) Implement API call
  const {
    trigger: createTeam,
    success: createSuccess,
    data,
  } = APIHandler<IUserOwnedTeam>(APIName.GET_TEAM_BY_ID);

  // Info: (20250218 - Julian) 送出 API 後，取得 Team 資訊
  useEffect(() => {
    if (createSuccess && data) {
      setNewTeam(data);
    }
  }, [createSuccess]);

  // Info: (20250218 - Julian) 檢查 Email 格式
  useEffect(() => {
    if (teamMemberInput !== '') {
      setIsValidEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamMemberInput));
    }
  }, [teamMemberInput]);

  const nextButtonStr = currentStep === 1 ? 'Create Team' : 'Continue';
  const cancelButtonText = currentStep === 1 ? 'Cancel' : 'Skip for Now';

  // ToDo: (20250218 - Julian) Recall API call
  const getOwnedTeam = async () => {
    // Deprecated: (20250218 - Julian) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('getOwnedTeam');
  };

  const nextButtonDisabled =
    currentStep === 1
      ? teamNameInput === ''
      : currentStep === 2
        ? teamMembers.length <= 0 || !isValidEmail
        : true;

  const toNextStep =
    currentStep === 1
      ? () => {
          // Info: (20250218 - Julian) 第一步即建立 Team
          setCurrentStep(2);
          createTeam({ body: { name: teamNameInput } });
        }
      : currentStep === 2
        ? () => {
            setCurrentStep(3);
          }
        : // ToDo: (20250218 - Julian) Implement API call
          // eslint-disable-next-line no-console
          () => console.log('Create Team!');

  const cancelOrSkip =
    currentStep === 1
      ? // Info: (20250218 - Julian) 第一步為 Cancel，即關閉 Modal
        modalVisibilityHandler
      : // Info: (20250218 - Julian) 第二步開始為 Skip，即跳到下一步
        toNextStep;

  const formBody =
    currentStep === 1 ? (
      // Info: (20250217 - Julian) Team Name
      <div className="flex flex-col gap-8px text-sm">
        <p className="font-semibold text-input-text-primary">
          Team Name <span className="text-text-state-error">*</span>
        </p>
        <input
          id="team-name"
          type="text"
          value={teamNameInput}
          onChange={(e) => setTeamNameInput(e.target.value)}
          className="rounded-sm border border-input-stroke-input px-12px py-10px placeholder:text-input-text-input-placeholder"
          placeholder="Name"
        />
      </div>
    ) : currentStep === 2 ? (
      // Info: (20250217 - Julian) Member Email
      <div className="flex flex-col gap-8px text-sm">
        <p className="font-semibold text-input-text-primary">Member Email</p>
        <div className="flex items-center gap-12px rounded-sm border border-input-stroke-input px-12px py-10px">
          <div className="text-icon-surface-single-color-primary">
            <IoMailOutline size={16} />
          </div>
          <input
            id="member-email"
            type="text"
            value={teamMemberInput}
            onChange={(e) => setTeamMemberInput(e.target.value)}
            className="w-full bg-transparent outline-none"
          />
          <button type="button" className="text-icon-surface-single-color-primary">
            <FaPlus size={20} />
          </button>
        </div>
        <p className={`text-red-600 ${isValidEmail ? 'opacity-0' : 'opacity-100'}`}>
          Please enter a valid email address.
        </p>
      </div>
    ) : (
      <>
        {/* Info: (20250218 - Julian) Subscription Plan */}
        <div className="flex justify-center gap-lv-7">
          {newTeam &&
            PLANS.map((plan) => (
              <SubscriptionPlan
                key={plan.id}
                team={newTeam}
                plan={plan}
                getOwnedTeam={getOwnedTeam}
              />
            ))}
        </div>
        <ul className="list-disc font-normal text-text-neutral-primary marker:text-surface-support-strong-maple">
          <li>
            If you choose to skip this step, we will automatically set your team to the free
            version.You can opt to use the free version of the service temporarily, enjoying basic
            features with potential limitations compared to premium plans.
          </li>
        </ul>
      </>
    );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div
        className={`flex flex-col items-stretch gap-lv-5 rounded-md bg-surface-neutral-surface-lv1 p-lv-7 ${
          currentStep === 3 ? 'w-min' : 'w-400px'
        }`}
      >
        {/* Info: (20250217 - Julian) Title */}
        <div className="relative flex items-start justify-center">
          <h2 className="text-xl font-bold text-text-neutral-primary">Create a Team</h2>
          <button
            type="button"
            className="absolute right-0 text-icon-surface-single-color-primary"
            onClick={modalVisibilityHandler}
          >
            <RxCross2 size={24} />
          </button>
        </div>

        {/* Info: (20250217 - Julian) Stepper */}
        <CreateTeamStepper currentStep={currentStep} />

        {/* Info: (20250217 - Julian) Form */}
        <div className="flex flex-col gap-lv-7">
          {formBody}

          {/* Info: (20250217 - Julian) Buttons */}
          <div className="ml-auto flex items-center gap-24px">
            <Button type="button" variant="secondaryBorderless" onClick={cancelOrSkip}>
              {cancelButtonText}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              disabled={nextButtonDisabled}
              onClick={toNextStep}
            >
              {nextButtonStr} <FaArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
