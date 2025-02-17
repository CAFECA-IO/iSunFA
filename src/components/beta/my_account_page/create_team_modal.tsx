import React, { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';

interface ICreateTeamModalProps {
  modalVisibilityHandler: () => void;
}

const CreateTeamModal: React.FC<ICreateTeamModalProps> = ({ modalVisibilityHandler }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentStep, setCurrentStep] = useState(0);

  const [teamNameInput, setTeamNameInput] = useState('');

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
        <div className="flex items-center"></div>

        {/* Info: (20250217 - Julian) Form */}
        <div className="flex flex-col gap-lv-7">
          {/* Info: (20250217 - Julian) Team Name */}
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
          {/* Info: (20250217 - Julian) Buttons */}
          <div className="ml-auto flex items-center gap-24px">
            <Button type="button" variant="secondaryBorderless">
              Cancel
            </Button>
            <Button type="button" variant="tertiary" disabled={teamNameInput === ''}>
              Create Team <FaArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
