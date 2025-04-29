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
  certificate: File | null;
  setCertificate: React.Dispatch<React.SetStateAction<File | null>>;
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

  return (
    <div className="flex min-h-200px flex-col gap-10px rounded-lg border border-dashed border-landing-page-gray p-lv-7">
      <div className="flex items-center justify-between">
        <div className="flex gap-8px">
          {/* Info: (20250429 - Julian) File Image */}
          <Image src={imgSrc} alt="File_Icon" width={40} height={40} />
          {/* Info: (20250429 - Julian) File Name */}
          <div className="flex flex-col">
            <p className="font-semibold">{certificate.name}</p>
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
  certificate,
  setCertificate,
}) => {
  const { t } = useTranslation(['hiring']);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCertificate(file);
    }
  };

  const removeFile = () => setCertificate(null);

  const uploadArea = certificate ? (
    <UploadItem certificate={certificate} removeFile={removeFile} />
  ) : (
    <>
      <input
        id="file-upload"
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="file-upload"
        className="flex w-full flex-col items-center gap-20px rounded-lg border border-dashed border-landing-page-gray p-lv-7 hover:cursor-pointer hover:border-surface-brand-primary"
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
    </>
  );

  return <div className="col-span-2">{uploadArea}</div>;
};

export default CertificateUploadArea;
