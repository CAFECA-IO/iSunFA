import React from 'react';

interface IUploadingToastProps {
  progress: number;
  countOfAllUploading: number;
  countOfDone: number;
}

const UploadingToast: React.FC<IUploadingToastProps> = ({
  progress,
  countOfAllUploading,
  countOfDone,
}) => {
  const progressStr = `(${countOfDone}/${countOfAllUploading})`;

  return (
    <div className="fixed inset-x-0 left-300px right-50px top-40px z-50">
      <div className="relative flex w-full overflow-hidden rounded-xs bg-surface-neutral-surface-lv2 shadow-Dropshadow_S">
        <span className="absolute left-0 top-0 h-full w-10px bg-neutral-500"></span>
        <div className="flex flex-1 flex-col gap-20px px-24px py-12px">
          <p className="text-base font-semibold text-file-uploading-text-primary">
            {countOfAllUploading} images is uploading ... {progressStr}
          </p>
          <div className="flex items-center gap-16px">
            <div className="relative h-px w-full overflow-hidden rounded-full bg-progress-bar-surface-base py-2px">
              <span
                style={{ width: `${progress}%` }}
                className="absolute top-0 h-full bg-progress-bar-surface-bar-primary transition-all duration-200 ease-in-out"
              ></span>
            </div>
            <p className="text-xs font-medium">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadingToast;
