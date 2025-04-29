import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaRegCircleCheck } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { MimeType } from '@/interfaces/skill';

interface IUploadItemProps {
  certificate: File;
  removeFile: () => void;
}

interface ICertificateUploadAreaProps {
  certificates: FileList | null;
  setCertificates: React.Dispatch<React.SetStateAction<FileList | null>>;
}

const UploadItem: React.FC<IUploadItemProps> = ({ certificate, removeFile }) => {
  // ToDo: Info: (20250429 - Julian) Developing the upload progress
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadProgress, setUploadProgress] = useState<number>(100);

  const fileTypeImages: Record<MimeType, string> = {
    [MimeType.PDF]: '/icons/pdf_file.png',
    [MimeType.DOC]: '/icons/doc_file.png',
    [MimeType.DOCX]: '/icons/docx_file.png',
  };

  const imgSrc = fileTypeImages[certificate.type as MimeType] || '/icons/default_file.png';
  const fileSize = (certificate.size / 1024).toFixed(2); // Info: (20250429 - Julian) 換算 KB

  // Info: (20250429 - Julian) 取得檔名
  const fileName = certificate.name.split('.');

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

const CertificateUploadArea: React.FC<ICertificateUploadAreaProps> = ({
  certificates,
  setCertificates,
}) => {
  const { t } = useTranslation(['hiring']);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleUpload = (files: FileList | null) => {
    // Info: (20250429 - Julian) 檢查文件類型
    if (files) {
      const validFiles = Array.from(files).filter((file) => {
        const fileType = file.type as MimeType;
        return Object.values(MimeType).includes(fileType);
      });

      if (validFiles.length > 0) {
        setIsUploading(true);
        // Info: (20250429 - Julian) 將有效的文件添加到 DataTransfer 物件中
        const validFileList = new DataTransfer();
        validFiles.forEach((file) => validFileList.items.add(file));
        // Info: (20250429 - Julian) 更新文件列表
        setCertificates(validFileList.files);
        setIsUploading(false);
      } else {
        // Info: (20250429 - Julian) 文件類型不正確
        // eslint-disable-next-line no-console
        console.error('Invalid file type. Please upload PDF, DOC, or DOCX files.');
      }
    } else {
      // ToDo: (20250429 - Julian) for debugging
      // eslint-disable-next-line no-console
      console.error('No files selected');
    }
  };

  // Info: (20250429 - Julian) 點擊上傳
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files) {
      handleUpload(files);
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

  const certList = certificates ? Array.from(certificates) : [];

  const uploadArea =
    certList.length > 0 ? (
      <div className="rounded-lg border border-dashed border-landing-page-gray p-lv-7">
        <div className="flex h-160px flex-col gap-10px overflow-y-auto">
          {certList.map((cert) => {
            // Info: (20250429 - Julian) 移除文件
            const removeFile = () => {
              // Info: (20250429 - Julian) 取得當前文件列表
              const updatedFiles = certList.filter((item) => item.name !== cert.name);
              // Info: (20250429 - Julian) 更新文件列表
              const newFileList = new DataTransfer();
              // Info: (20250429 - Julian) 將更新後的文件添加到 DataTransfer 物件中
              updatedFiles.forEach((file) => newFileList.items.add(file));
              // Info: (20250429 - Julian) 更新 state
              setCertificates(newFileList.files);
            };
            return <UploadItem key={cert.name} certificate={cert} removeFile={removeFile} />;
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
          accept=".pdf,.doc,.docx"
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

  return <div className="col-span-2">{uploadArea}</div>;
};

export default CertificateUploadArea;
