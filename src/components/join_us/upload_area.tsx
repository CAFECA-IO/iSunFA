import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaRegCircleCheck } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { MimeType } from '@/constants/mime_type';
import loggerFront from '@/lib/utils/logger_front';

interface IUploadItemProps {
  file: File;
  removeFile: () => void;
}

interface IUploadAreaProps {
  files: FileList | null;
  setFiles: React.Dispatch<React.SetStateAction<FileList | null>>;
  className?: string;
  limitedFileTypes?: MimeType[]; // Info: (20250502 - Julian) 限制的檔案類型
}

const UploadItem: React.FC<IUploadItemProps> = ({ file, removeFile }) => {
  // ToDo: Info: (20250429 - Julian) Developing the upload progress
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadProgress, setUploadProgress] = useState<number>(100);

  // Info: (20250502 - Julian) Find key of file type
  const fileType = Object.keys(MimeType).find(
    (key) => MimeType[key as keyof typeof MimeType] === file.type
  );
  const imgSrc = `/file_icon/${fileType}.png`;

  const fileSize = (file.size / 1024).toFixed(2); // Info: (20250429 - Julian) 換算 KB

  // Info: (20250429 - Julian) 取得檔名
  const fileName = file.name.split('.');

  // Info: (20250429 - Julian) 檔名長度超過 20 字元時，顯示前 5 個字元 + '...' + 後 5 個字元
  const nameParts =
    fileName[0].length > 20 ? `${fileName[0].slice(0, 5)}...${fileName[0].slice(-5)}` : fileName[0];
  const fileExtension = fileName[1] ? `.${fileName[1]}` : '';

  // Info: (20250429 - Julian) 重新組合檔名
  const formattedFileName = `${nameParts}${fileExtension}`;

  return (
    <div className="flex flex-col gap-10px">
      <div className="flex items-center justify-between">
        <div className="flex gap-8px">
          {/* Info: (20250429 - Julian) File Image */}
          <Image src={imgSrc} alt="File_Icon" width={40} height={40} />
          {/* Info: (20250429 - Julian) File Name */}
          <div className="flex flex-col">
            <p className="font-semibold">{formattedFileName}</p>
            <p>{fileSize} KB</p>
          </div>
        </div>
        <div className="flex items-center gap-8px">
          {uploadProgress === 100 && (
            <FaRegCircleCheck size={16} className="text-icon-surface-success" />
          )}
          <button type="button" onClick={removeFile} className="hover:text-button-text-primary">
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-lv-4">
        {/* Info: (20250429 - Julian) Progress Bar */}
        <div className="relative h-5px w-full rounded-full bg-progress-bar-surface-base">
          <span
            className="absolute h-5px rounded-full bg-surface-brand-primary-moderate transition-all duration-100 ease-in-out"
            style={{ width: `${uploadProgress}%` }}
          ></span>
        </div>
        <p className="text-landing-page-gray">{uploadProgress}%</p>
      </div>
    </div>
  );
};

const UploadArea: React.FC<IUploadAreaProps> = ({
  files,
  setFiles,
  className,
  limitedFileTypes,
}) => {
  const { t } = useTranslation(['hiring']);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Info: (20250429 - Julian) 若無 limitedFileTypes ，則不限制檔案類型
  const limitedTypes = limitedFileTypes || Object.values(MimeType);

  // Info: (20250507 - Julian) 取得可接受的副檔名
  const acceptedFileTypes = limitedTypes
    .map((type) => {
      const fileType = Object.keys(MimeType).find(
        (key) => MimeType[key as keyof typeof MimeType] === type
      );
      return fileType ? `.${fileType}` : '';
    })
    .join(', ');

  const handleUpload = (fileList: FileList | null) => {
    // Info: (20250429 - Julian) 檢查文件類型
    if (fileList) {
      // Info: (20250429 - Julian) 過濾有效的文件類型
      const validFiles = Array.from(fileList).filter((file) => {
        const fileType = file.type as MimeType;
        return limitedTypes.includes(fileType);
      });

      if (validFiles.length > 0) {
        setIsUploading(true);
        // Info: (20250429 - Julian) 將有效的文件添加到 DataTransfer 物件中
        const validFileList = new DataTransfer();
        validFiles.forEach((file) => validFileList.items.add(file));
        // Info: (20250429 - Julian) 更新文件列表
        setFiles(validFileList.files);
        setIsUploading(false);
      } else {
        // Info: (20250502 - Julian) 文件類型不正確
        const validFileTypes = limitedTypes.join(', ');
        loggerFront.error(`Invalid file type. Please upload files of type: ${validFileTypes}`);
      }
    } else {
      loggerFront.error('No files selected');
    }
  };

  // Info: (20250429 - Julian) 點擊上傳
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files;
    if (file) {
      handleUpload(file);
    }
  };

  // Info: (20250429 - Julian) 拖曳上傳
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isUploading) return;

    const droppedFiles = event.dataTransfer.files;
    handleUpload(droppedFiles);
    setIsDragOver(false);
  };

  const fileList = files ? Array.from(files) : [];

  const uploadArea =
    fileList.length > 0 ? (
      <div className="rounded-lg border border-dashed border-landing-page-gray p-lv-7">
        <div className="flex h-160px flex-col gap-10px overflow-y-auto">
          {fileList.map((cert) => {
            // Info: (20250429 - Julian) 移除文件
            const removeFile = () => {
              // Info: (20250429 - Julian) 取得當前文件列表
              const updatedFiles = fileList.filter((item) => item.name !== cert.name);
              // Info: (20250429 - Julian) 更新文件列表
              const newFileList = new DataTransfer();
              // Info: (20250429 - Julian) 將更新後的文件添加到 DataTransfer 物件中
              updatedFiles.forEach((file) => newFileList.items.add(file));
              // Info: (20250429 - Julian) 更新 state
              setFiles(newFileList.files);
            };
            return <UploadItem key={cert.name} file={cert} removeFile={removeFile} />;
          })}
        </div>
      </div>
    ) : (
      <div
        className={`min-h-200px rounded-lg border border-dashed border-landing-page-gray px-24px py-12px hover:border-surface-brand-primary ${
          isDragOver ? 'border-surface-brand-primary' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="file-upload"
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="flex w-full flex-col items-center gap-20px p-lv-7 hover:cursor-pointer"
        >
          <Image src="/icons/double_file.svg" alt="Upload_Icon" width={55} height={61} />
          <div className="text-center text-base font-medium">
            <p>
              {t('hiring:SKILLS.UPLOAD_TEXT_1')}{' '}
              <span className="font-semibold text-surface-brand-primary-moderate">
                {t('hiring:SKILLS.UPLOAD_TEXT_2')}
              </span>
            </p>
            <p className="font-medium text-landing-page-gray">
              {t('hiring:SKILLS.UPLOAD_MAXIMUM_SIZE')}
            </p>
          </div>
        </label>
      </div>
    );

  return <div className={className}>{uploadArea}</div>;
};

export default UploadArea;
