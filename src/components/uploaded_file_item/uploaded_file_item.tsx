import Image from 'next/image';
import { FiTrash2, FiPauseCircle, FiPlay } from 'react-icons/fi';
import { IOCR } from '@/interfaces/ocr';
import { ProgressStatus } from '@/constants/account';
import { useTranslation } from 'next-i18next';

interface IUploadedFileItemProps {
  itemData: IOCR;
  pauseHandler: (id: number) => void;
  deleteHandler: (aichResultId: string) => void;
  clickHandler: (unprocessedJournal: IOCR) => void;
}

const UploadedFileItem = ({
  itemData,
  pauseHandler,
  deleteHandler,
  clickHandler,
}: IUploadedFileItemProps) => {
  const { t } = useTranslation('common');
  const { id, aichResultId, imageName, imageUrl, imageSize, progress, status } = itemData;
  // Info: (20240527 - Julian) 若 status 不是 in progress, success, paused 則視為 error
  const isError = !(
    status === ProgressStatus.IN_PROGRESS ||
    status === ProgressStatus.SUCCESS ||
    status === ProgressStatus.PAUSED
  );

  const pauseClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Info: (20240530 - Julian) 防止點擊暫停時，觸發 itemClickHandler
    pauseHandler(id);
  };

  const deleteClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Info: (20240530 - Julian) 防止點擊刪除時，觸發 itemClickHandler
    deleteHandler(aichResultId);
  };

  const itemClickHandler = () => {
    if (progress !== 100) return; // Info: (20240530 - Julian) 達到 100% 才能點擊
    clickHandler(itemData);
  };

  // Info: (20240527 - Julian) 若檔名過長，則擷取前 3 個和後 4 個(副檔名)字元，中間以 ... 代替
  const truncatedFileName =
    imageName.length > 20 ? `${imageName.slice(0, 3)}...${imageName.slice(-4)}` : imageName;

  const displayedPauseButton =
    status === ProgressStatus.PAUSED ? <FiPlay size={20} /> : <FiPauseCircle size={20} />;

  const displayedStatus = isError ? (
    <Image src="/icons/red_warning.svg" width={20} height={20} alt="error_icon" />
  ) : progress === 100 ? (
    <Image src="/icons/success_icon.svg" width={20} height={20} alt="success_icon" />
  ) : (
    <button type="button" onClick={pauseClickHandler}>
      {displayedPauseButton}
    </button>
  );

  const displayedProgress = progress === 100 ? 'Completed' : `${progress}%`;

  return (
    <div
      // Info: (20240523 - Julian) 達成 100% 後，點擊將 invoiceId 寫入 context
      onClick={itemClickHandler}
      className={`relative inline-flex w-90vw flex-col gap-10px rounded-sm border ${isError ? 'border-file-uploading-text-error hover:border-file-uploading-text-error' : 'border-file-uploading-stroke-outline hover:cursor-pointer hover:border-slider-surface-bar disabled:hover:border-file-uploading-stroke-outline'} bg-white p-5 md:w-full`}
    >
      <div className="relative inline-flex w-full items-center gap-20px">
        <Image src="/animations/scanning.gif" width={56} height={56} alt="scanning_animation" />
        {/* Info: (20240523 - Julian) File Thumbnail */}
        <div className="relative inline-flex h-64px w-64px items-center justify-center overflow-hidden">
          <Image src={imageUrl} alt="file_thumbnail" fill style={{ objectFit: 'contain' }} />
        </div>
        <div className="flex shrink grow flex-col items-start">
          {/* Info: (20240523 - Julian) File Name */}
          <h3
            className={`text-base font-semibold leading-normal tracking-tight ${isError ? 'text-file-uploading-text-error' : 'text-file-uploading-text-primary'}`}
          >
            {truncatedFileName}
          </h3>
          {/* Info: (20240523 - Julian) File Size */}
          <p className="text-xs font-normal leading-tight tracking-tight text-file-uploading-text-disable">
            {imageSize}
          </p>
        </div>
        {/* Info: (20240523 - Julian) Tool Buttons */}
        <div className="absolute right-0 z-10 flex items-center gap-10px text-icon-surface-single-color-primary">
          {/* Info: (20240523 - Julian) Status */}
          {displayedStatus}
          {/* Info: (20240523 - Julian) Trash Button */}
          <button type="button" onClick={deleteClickHandler}>
            <FiTrash2 size={20} />
          </button>
        </div>
      </div>
      {/* Info: (20240523 - Julian) Progress Bar */}
      <div className="inline-flex w-full items-center gap-16px">
        <p className="text-slider-surface-bar">{t('JOURNAL.AI_TECHNOLOGY_RECOGNIZING')}</p>
        <div className="relative h-5px flex-1 rounded-full bg-progress-bar-surface-base">
          <div
            className={`absolute left-0 top-0 h-5px rounded-full transition-all duration-300 ${isError ? 'bg-file-uploading-text-error' : 'bg-progress-bar-surface-bar-secondary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs font-medium leading-tight tracking-tight text-progress-bar-text-indicator">
          {displayedProgress}
        </p>
      </div>
    </div>
  );
};

export default UploadedFileItem;
