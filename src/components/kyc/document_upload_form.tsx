import UploadArea from '@/components/kyc/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import { useTranslation } from 'next-i18next';
import { IUploadDocuments } from '@/interfaces/kyc_document_upload';
import { UploadDocumentKeys, RepresentativeIDType, KYCFiles } from '@/constants/kyc';

const DocumentUploadForm = ({
  data,
  onChange,
  onSelect,
}: {
  data: IUploadDocuments;
  onChange: (key: UploadDocumentKeys, id: number | undefined) => void;
  onSelect: (value: RepresentativeIDType) => void;
}) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);

  return (
    <div className="flex flex-col items-center bg-gray-100 md:w-650px">
      <div className="mb-8">
        <RadioButtonComponent
          selectedValue={data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}
          onChange={onSelect}
        />
      </div>
      <div className="grid w-full max-w-3xl grid-flow-row grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex w-full flex-col items-center">
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('kyc:KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
          </h3>
          <UploadArea
            loacalStorageFilesKey={KYCFiles}
            type={UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID}
            onChange={onChange}
          />
        </div>
        <div className="flex w-full flex-col items-center">
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('kyc:KYC.TAX_STATUS_CERTIFICATE')}
          </h3>
          <UploadArea
            loacalStorageFilesKey={KYCFiles}
            type={UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID}
            onChange={onChange}
          />
        </div>
        <div className="flex w-full flex-col items-center md:col-span-2 md:w-full-available">
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('kyc:KYC.REPRESENTATIVE_ID_CERTIFICATE', {
              type: t(`kyc:KYC.${data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}`),
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
