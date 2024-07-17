import { useEffect, useState } from 'react';
import UploadArea from '@/components/upload_area/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useTranslation } from 'react-i18next';
import { initialKYCDocuments, KYCDocuments, KYCDocumentType } from '@/interfaces/kyc_document_type';
import { ToastType } from '@/interfaces/toastify';
import { useGlobalCtx } from '@/contexts/global_context';
import { IAccountResultStatus } from '@/interfaces/accounting_account';

const DocumentUploadForm = () => {
  const { t } = useTranslation('common');
  const { toastHandler } = useGlobalCtx();
  const [selectedValue, setSelectedValue] = useState<string>('');
  const {
    data: uploadedFiles,
    success: getSuccess,
    code: getCode,
  } = APIHandler<KYCDocuments>(APIName.FILE_LIST_UPLOADED, {}, false);
  const [uploadFiles, setUploadFiles] = useState<KYCDocuments>(initialKYCDocuments);

  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
  };

  const { trigger: uploadFile } = APIHandler<IAccountResultStatus>(
    APIName.FILE_UPLOAD,
    {},
    false,
    false
  );

  const handleFileUpload = (file: File, type: KYCDocumentType) => {
    setUploadFiles((prev) => ({
      ...prev,
      [type]: file,
    }));
  };

  useEffect(() => {
    if (getSuccess && uploadedFiles) {
      setUploadFiles(uploadedFiles);
    }
    if (getSuccess === false) {
      toastHandler({
        id: `listUploadedFiles-${getCode}`,
        content: `Failed to list uploaded files: ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [uploadedFiles, getSuccess, getCode]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 p-6">
      <div className="mb-6">
        <RadioButtonComponent selectedValue={selectedValue} onChange={handleRadioChange} />
      </div>
      <div className="flex w-full max-w-3xl flex-col space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
            </h3>
            <UploadArea
              type={KYCDocumentType.BUSINESS_REGISTRATION_CERTIFICATE}
              uploadFile={uploadFiles[KYCDocumentType.BUSINESS_REGISTRATION_CERTIFICATE]}
              uploadHandler={handleFileUpload}
              onUpload={uploadFile}
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.TAX_STATUS_CERTIFICATE')}
            </h3>
            <UploadArea
              type={KYCDocumentType.TAX_STATUS_CERTIFICATE}
              uploadFile={uploadFiles[KYCDocumentType.TAX_STATUS_CERTIFICATE]}
              uploadHandler={handleFileUpload}
              onUpload={uploadFile}
            />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('KYC.REPRESENTATIVE_ID_CERTIFICATE', { certificate: 'Certificate' })}
          </h3>
          <UploadArea
            type={KYCDocumentType.REPRESENTATIVE_ID_CERTIFICATE}
            uploadFile={uploadFiles[KYCDocumentType.REPRESENTATIVE_ID_CERTIFICATE]}
            uploadHandler={handleFileUpload}
            onUpload={uploadFile}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
