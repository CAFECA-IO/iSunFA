import UploadArea from '@/components/kyc/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import { useTranslation } from 'react-i18next';
import { IUploadDocuments } from '@/interfaces/kyc_document_type';
import { ProgressStatus } from '@/constants/account';
import { UploadDocumentKeys, RepresentativeIDType } from '@/constants/kyc';

const DocumentUploadForm = ({
  data,
  onChange,
}: {
  data: IUploadDocuments;
  onChange: (
    key: UploadDocumentKeys,
    value:
      | { file: File | null; status: ProgressStatus | null; fileId: string | null }
      | RepresentativeIDType
  ) => void;
}) => {
  const { t } = useTranslation('common');

  const representativeTypeChangeHandler = (type: RepresentativeIDType) =>
    onChange(UploadDocumentKeys.REPRESENTATIVE_ID_TYPE, type);

  const bussinessRegistrationUploadHandler = (
    file: File | null,
    status: ProgressStatus | null,
    fileId: string | null
  ) =>
    onChange(UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE, {
      file,
      status,
      fileId,
    });

  const taxStatusUploadHandler = (
    file: File | null,
    status: ProgressStatus | null,
    fileId: string | null
  ) => onChange(UploadDocumentKeys.TAX_STATUS_CERTIFICATE, { file, status, fileId });

  const representativeUploadHandler = (
    file: File | null,
    status: ProgressStatus | null,
    fileId: string | null
  ) =>
    onChange(UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE, {
      file,
      status,
      fileId,
    });

  return (
    <div className="mb-14 flex flex-col items-center bg-gray-100">
      <div className="mb-8">
        <RadioButtonComponent
          selectedValue={data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}
          onChange={representativeTypeChangeHandler}
        />
      </div>
      <div className="flex w-full max-w-3xl flex-col space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
            </h3>
            <UploadArea
              type={UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE}
              uploadFile={data[UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE].file}
              uploadHandler={bussinessRegistrationUploadHandler}
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.TAX_STATUS_CERTIFICATE')}
            </h3>
            <UploadArea
              type={UploadDocumentKeys.TAX_STATUS_CERTIFICATE}
              uploadFile={data[UploadDocumentKeys.TAX_STATUS_CERTIFICATE].file}
              uploadHandler={taxStatusUploadHandler}
            />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-center text-base font-medium text-gray-700">
            {t('KYC.REPRESENTATIVE_ID_CERTIFICATE', {
              type: t(`KYC.${data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}`),
            })}
          </h3>
          <UploadArea
            type={UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE}
            uploadFile={data[UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE].file}
            uploadHandler={representativeUploadHandler}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
