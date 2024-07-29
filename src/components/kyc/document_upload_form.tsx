import UploadArea from '@/components/kyc/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import { useTranslation } from 'react-i18next';
import { IUploadDocuments } from '@/interfaces/kyc_document_upload';
import { UploadDocumentKeys, RepresentativeIDType, KYCFiles } from '@/constants/kyc';

const DocumentUploadForm = ({
  data,
  onChange,
  onSelect,
}: {
  data: IUploadDocuments;
  onChange: (key: UploadDocumentKeys, id: string | undefined) => void;
  onSelect: (value: RepresentativeIDType) => void;
}) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col items-center bg-gray-100">
      <div className="mb-8">
        <RadioButtonComponent
          selectedValue={data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}
          onChange={onSelect}
        />
      </div>
      <div className="flex w-full max-w-3xl flex-col items-center space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
            </h3>
            <UploadArea
              loacalStorageFilesKey={KYCFiles}
              type={UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID}
              onChange={onChange}
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.TAX_STATUS_CERTIFICATE')}
            </h3>
            <UploadArea
              loacalStorageFilesKey={KYCFiles}
              type={UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID}
              onChange={onChange}
            />
          </div>
        </div>
        <div className="flex flex-col items-center md:block md:w-full-available">
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('KYC.REPRESENTATIVE_ID_CERTIFICATE', {
              type: t(`KYC.${data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}`),
            })}
          </h3>
          <UploadArea
            loacalStorageFilesKey={KYCFiles}
            type={UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
