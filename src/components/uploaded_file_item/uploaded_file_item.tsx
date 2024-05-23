import Image from 'next/image';
import { FiTrash2, FiPauseCircle, FiPlay } from 'react-icons/fi';
import { IUploadedItem } from '@/interfaces/uploaded_item';

interface IUploadedFileItemProps {
  itemData: IUploadedItem;
  pauseHandler: (id: string) => void;
  deleteHandler: (id: string) => void;
}

const UploadedFileItem = ({ itemData, pauseHandler, deleteHandler }: IUploadedFileItemProps) => {
  const { id, fileName, thumbnailSrc, fileSize, progressPercentage, isPaused, isError } = itemData;

  const pauseClickHandler = () => pauseHandler(id);
  const deleteClickHandler = () => deleteHandler(id);

  const displayedPauseButton = isPaused ? <FiPlay size={20} /> : <FiPauseCircle size={20} />;

  const displayedStatus = isError ? (
    <Image src="/icons/red_warning.svg" width={20} height={20} alt="error_icon" />
  ) : progressPercentage === 100 ? (
    <Image src="/icons/success_icon.svg" width={20} height={20} alt="success_icon" />
  ) : (
    <button type="button" onClick={pauseClickHandler}>
      {displayedPauseButton}
    </button>
  );

  return (
    <div className="relative inline-flex w-full flex-col gap-10px rounded-sm border border-file-uploading-stroke-outline bg-white p-5 shadow">
      <div className="inline-flex items-center gap-20px">
        <Image src="/icons/upload_cloud.svg" width={24} height={24} alt="upload_cloud_icon" />
        {/* Info: (20240523 - Julian) File Thumbnail */}
        <div className="inline-flex h-64px w-64px items-center justify-center">
          <Image src={thumbnailSrc} width={64} height={64} alt="file_thumbnail" />
        </div>
        <div className="flex shrink grow flex-col items-start">
          {/* Info: (20240523 - Julian) File Name */}
          <h3
            className={`text-base font-semibold leading-normal tracking-tight ${isError ? 'text-file-uploading-text-error' : 'text-file-uploading-text-primary'}`}
          >
            {fileName}
          </h3>
          {/* Info: (20240523 - Julian) File Size */}
          <p className="text-xs font-normal leading-tight tracking-tight text-file-uploading-text-disable">
            {fileSize}
          </p>
        </div>
        {/* Info: (20240523 - Julian) Tool Buttons */}
        <div className="z-30 flex items-center gap-10px text-icon-surface-single-color-primary">
          {/* Info: (20240523 - Julian) Status */}
          {displayedStatus}
          {/* Info: (20240523 - Julian) Trash Button */}
          <button type="button" onClick={deleteClickHandler}>
            <FiTrash2 size={20} />
          </button>
        </div>
      </div>
      {/* Info: (20240523 - Julian) Progress Bar */}
      <div className="inline-flex items-center gap-16px">
        <div className="relative h-5px flex-1 rounded-full bg-progress-bar-surface-base">
          <div
            className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${isError ? 'bg-file-uploading-text-error' : 'bg-progress-bar-surface-bar-secondary'}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
          {progressPercentage} %
        </p>
      </div>

      {/* Info: (20240523 - Julian) click mask */}
      <button
        type="button"
        disabled={progressPercentage !== 100}
        // ToDo: (20240523 - Julian) 達成 100% 後，點擊將 invoiceId 寫入 context
        // onClick={() => {}}
        className="absolute left-0 top-0 h-full w-full disabled:hidden"
      ></button>
    </div>
  );
};

export default UploadedFileItem;
