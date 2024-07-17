import { useState } from 'react';
import UploadArea from '@/components/upload_area/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IUploadProgress } from '@/interfaces/upload_progress';
import { useTranslation } from 'react-i18next';

const DocumentUploadForm = () => {
  const { t } = useTranslation('common');
  const [uploadFile1, setUploadFile1] = useState<File | null>(null);
  const [uploadFile2, setUploadFile2] = useState<File | null>(null);
  const [uploadFile3, setUploadFile3] = useState<File | null>(null);

  const { trigger: uploadFile } = APIHandler<IUploadProgress>(
    APIName.FILE_UPLOAD,
    {},
    false,
    false
  );

  const handleFileUpload1 = (file: File) => setUploadFile1(file);
  const handleFileUpload2 = (file: File) => setUploadFile2(file);
  const handleFileUpload3 = (file: File) => setUploadFile3(file);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 p-6">
      <div className="mb-6">
        <RadioButtonComponent />
      </div>
      <div className="flex w-full max-w-3xl flex-col space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
            </h3>
            <UploadArea
              uploadFile={uploadFile1}
              uploadHandler={handleFileUpload1}
              onUpload={uploadFile}
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.TAX_STATUS_CERTIFICATE')}
            </h3>
            <UploadArea
              uploadFile={uploadFile2}
              uploadHandler={handleFileUpload2}
              onUpload={uploadFile}
            />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('KYC.TAX_STATUS_CERTIFICATE', { certificate: 'Certificate' })}
          </h3>
          <UploadArea
            uploadFile={uploadFile3}
            uploadHandler={handleFileUpload3}
            onUpload={uploadFile}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
