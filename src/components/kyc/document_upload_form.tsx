import UploadArea from '@/components/kyc/upload_area';
import RadioButtonComponent from '@/components/kyc/radio_button_component';
import { useTranslation } from 'react-i18next';
import {
  IUploadDocuments,
  RepresentativeIDType,
  UploadDocumentKeys,
} from '@/interfaces/kyc_document_type';
import { ProgressStatus } from '@/constants/account';
// import APIHandler from '@/lib/utils/api_handler';
// import { APIName } from '@/constants/api_connection';
// import { ToastType } from '@/interfaces/toastify';
// import { useGlobalCtx } from '@/contexts/global_context';
// import { useUserCtx } from '@/contexts/user_context';

const DocumentUploadForm = ({
  data,
  onChange,
}: {
  data: IUploadDocuments;
  onChange: (
    key: UploadDocumentKeys,
    value: { file: File | null; status: ProgressStatus } | RepresentativeIDType
  ) => void;
}) => {
  // const { toastHandler } = useGlobalCtx();
  // const { selectedCompany } = useUserCtx();
  // const {
  //   data: uploadedFiles,
  //   success: getSuccess,
  //   code: getCode,
  // } = APIHandler<KYCDocuments>(
  //   APIName.FILE_LIST_UPLOADED,
  //   {
  //     params: {
  //       companyId: selectedCompany?.id,
  //     },
  //   },
  //   false
  // );
  const { t } = useTranslation('common');

  // useEffect(() => {
  //   if (getSuccess && uploadedFiles) {
  //     setUploadFiles(uploadedFiles);
  //   }
  //   if (getSuccess === false) {
  //     toastHandler({
  //       id: `listUploadedFiles-${getCode}`,
  //       content: `Failed to list uploaded files: ${getCode}`,
  //       type: ToastType.ERROR,
  //       closeable: true,
  //     });
  //   }
  // }, [uploadedFiles, getSuccess, getCode]);

  return (
    <div className="mb-10 flex flex-col items-center bg-gray-100">
      <div className="mb-8">
        <RadioButtonComponent
          selectedValue={data[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]}
          onChange={(type: RepresentativeIDType) =>
            onChange(UploadDocumentKeys.REPRESENTATIVE_ID_TYPE, type)
          }
        />
      </div>
      <div className="flex w-full max-w-3xl flex-col space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.BUSINESS_REGISTRATION_CERTIFICATE')}
            </h3>
            <UploadArea
              uploadFile={data[UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE].file}
              uploadHandler={(file: File | null, status: ProgressStatus) =>
                onChange(UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE, { file, status })
              }
            />
          </div>
          <div>
            <h3 className="mb-2 text-center text-base font-medium text-gray-700">
              {t('KYC.TAX_STATUS_CERTIFICATE')}
            </h3>
            <UploadArea
              uploadFile={data[UploadDocumentKeys.TAX_STATUS_CERTIFICATE].file}
              uploadHandler={(file: File | null, status: ProgressStatus) =>
                onChange(UploadDocumentKeys.TAX_STATUS_CERTIFICATE, { file, status })
              }
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
            uploadFile={data[UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE].file}
            uploadHandler={(file: File | null, status: ProgressStatus) =>
              onChange(UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE, { file, status })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadForm;
