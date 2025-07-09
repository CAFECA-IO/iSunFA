import React from 'react';
import { GrPowerReset } from 'react-icons/gr';
import { Button } from '@/components/button/button';

interface IProgressBarProps {
  progress: number;
  resetHandler: () => void;
}

const ProgressBar: React.FC<IProgressBarProps> = ({ progress, resetHandler }) => {
  return (
    <div className="flex items-end gap-12px">
      <div className="flex flex-col items-start gap-8px">
        <p className="text-base font-semibold text-text-state-success">Completed {progress}%</p>
        <div className="relative h-8px w-500px rounded-full bg-progress-bar-surface-base">
          <span
            className="absolute h-8px rounded-full bg-surface-state-success"
            style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}
          ></span>
        </div>
      </div>

      <Button type="button" onClick={resetHandler} variant="tertiaryBorderless">
        <GrPowerReset size={16} className="-scale-x-100" /> Reset
      </Button>
    </div>
  );
};

export default ProgressBar;
