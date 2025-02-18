import React, { useState } from 'react';
import Image from 'next/image';
import { FaArrowRight } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa6';
import { IoMailOutline } from 'react-icons/io5';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
// import { IMember } from '@/interfaces/member';

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
    <div className="relative flex w-full items-center justify-between -space-x-10">
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  // const [teamMemberInput, setTeamMemberInput] = useState<IMember[]>([]);

  const nextButtonStr = currentStep === 1 ? 'Create Team' : 'Continue';
  const cancelButtonText = currentStep === 1 ? 'Cancel' : 'Skip for Now';

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
    ) : (
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
            // value={teamNameInput}
            // onChange={(e) => setTeamNameInput(e.target.value)}
            className="w-full bg-transparent outline-none"
          />

          <div className="text-icon-surface-single-color-primary">
            <FaPlus size={20} />
          </div>
        </div>
      </div>
    );

  const toNextStep =
    // Info: (20250218 - Julian) 第三步以前為 Next，即跳到下一步
    currentStep !== 3
      ? () => setCurrentStep((prev) => prev + 1)
      : // ToDo: (20250218 - Julian) Implement API call
        // eslint-disable-next-line no-console
        () => console.log('Create Team!');

  const cancelOrSkip =
    currentStep === 1
      ? // Info: (20250218 - Julian) 第一步為 Cancel，即關閉 Modal
        modalVisibilityHandler
      : // Info: (20250218 - Julian) 第二步開始為 Skip，即跳到下一步
        toNextStep;

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col items-stretch gap-lv-5 rounded-md bg-surface-neutral-surface-lv1 p-lv-7">
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
              disabled={teamNameInput === ''}
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
