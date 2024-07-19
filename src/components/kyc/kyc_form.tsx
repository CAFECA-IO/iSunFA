import { useEffect, useState, useRef } from 'react';
import KYCStepper from '@/components/kyc/kyc_stepper';
import KYCFormController from '@/components/kyc/kyc_form_controller';
import { IBasicInfo, initialBasicInfo } from '@/interfaces/kyc_basic_info';
import BasicInfoForm from '@/components/kyc/basic_info_form';
import { initialRegistrationInfo, IRegistrationInfo } from '@/interfaces/kyc_registration_info';
import RegistrationInfoForm from '@/components/kyc/registration_info_form';
import { IContactInfo, initialContactInfo } from '@/interfaces/kyc_contact_info';
import ContactInfoForm from '@/components/kyc/contact_info_form ';
import DocumentUploadForm from '@/components/kyc/document_upload_form';
import { initialUploadDocuments, IUploadDocuments } from '@/interfaces/kyc_document_type';
import { ProgressStatus } from '@/constants/account';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { ToastType } from '@/interfaces/toastify';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import {
  RepresentativeIDType,
  BasicInfoKeys,
  RegistrationInfoKeys,
  ContactInfoKeys,
  UploadDocumentKeys,
} from '@/constants/kyc';
import { createFormData, ICompanyKYCForm, isKYCFormComplete } from '@/interfaces/company_kyc';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'react-i18next';

const KYCForm = ({ onCancel }: { onCancel: () => void }) => {
  const { t } = useTranslation('common');
  const formRef = useRef<HTMLFormElement>(null);
  const { selectedCompany } = useUserCtx();
  const { toastHandler, messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const {
    data: uploadedData,
    success: getSuccess,
    code: getCode,
  } = APIHandler<IUploadDocuments>(
    APIName.FILE_LIST_UPLOADED,
    {
      params: {
        companyId: selectedCompany?.id,
      },
    },
    false
  );
  const { trigger: triggerUpload } = APIHandler(APIName.FILE_UPLOAD, {}, false, false);
  const [step, setStep] = useState(0);
  const [basicInfoValues, setBasicInfoValues] = useState<IBasicInfo>(initialBasicInfo);
  const [registrationInfoValues, setRegistrationInfoValues] =
    useState<IRegistrationInfo>(initialRegistrationInfo);
  const [contactInfoValues, setContactInfoValues] = useState<IContactInfo>(initialContactInfo);
  const [uploadDocuments, setUploadDocuments] = useState<IUploadDocuments>(initialUploadDocuments);

  const handleBasicInfoChange = (key: BasicInfoKeys, value: string) => {
    setBasicInfoValues((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  const handleRegistrationInfoChange = (key: RegistrationInfoKeys, value: string) => {
    setRegistrationInfoValues((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  const handleContactInfoChange = (key: ContactInfoKeys, value: string) => {
    setContactInfoValues((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  const handleDocumentChange = (
    key: UploadDocumentKeys,
    value:
      | { file: File | null; status: ProgressStatus | null; fileId: string | null }
      | RepresentativeIDType
  ) => {
    setUploadDocuments((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitClick = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const companyKYCForm: ICompanyKYCForm = {
      ...basicInfoValues,
      ...registrationInfoValues,
      ...contactInfoValues,
      [ContactInfoKeys.CONTACT_PHONE]: contactInfoValues.areaCode + contactInfoValues.contactNumber,
      [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]:
        uploadDocuments[UploadDocumentKeys.REPRESENTATIVE_ID_TYPE],
      registrationCertificateId:
        uploadDocuments[UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE].fileId || '',
      taxCertificateId: uploadDocuments[UploadDocumentKeys.TAX_STATUS_CERTIFICATE].fileId || '',
      representativeIdCardId:
        uploadDocuments[UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE].fileId || '',
    };
    const { isComplete, missingFields } = isKYCFormComplete(companyKYCForm);
    if (isComplete) {
      const formData = createFormData(companyKYCForm);
      const { success, code } = await triggerUpload({
        params: {
          companyId: selectedCompany?.id,
        },
        body: formData,
      });
      if (success) {
        messageModalDataHandler({
          messageType: MessageType.SUCCESS,
          title: t('KYC.SUBMIT_SUCCESS'),
          content: t('KYC.SUBMIT_SUCCESS_MESSAGE'),
          submitBtnStr: t('KYC.CONFIRM'),
          submitBtnFunction: messageModalVisibilityHandler,
          backBtnStr: t('KYC.CANCEL'),
        });
        messageModalVisibilityHandler();
      } else if (success === false) {
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: t('KYC.SUBMIT_FAILED'),
          content: t('KYC.CONTACT_SERVICE_TEAM'),
          subMsg: t('KYC.SUBMIT_FAILED_MESSAGE', code),
          submitBtnStr: t('KYC.CONFIRM'),
          submitBtnFunction: messageModalVisibilityHandler,
          backBtnStr: t('KYC.CANCEL'),
        });
      }
    } else {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('KYC.INCOMPLETE_FORM'),
        subMsg: t('KYC.INCOMPLETE_FORM_SUB_MESSAGE', { fields: missingFields.join(', ') }),
        content: t('KYC.CONTACT_SERVICE_TEAM'),
        submitBtnStr: t('KYC.CONFIRM'),
        submitBtnFunction: messageModalVisibilityHandler,
        backBtnStr: t('KYC.CANCEL'),
      });
      messageModalVisibilityHandler();
    }
  };

  useEffect(() => {
    if (getSuccess && uploadedData) {
      setUploadDocuments(uploadedData);
    }
    if (getSuccess === false) {
      toastHandler({
        id: `listUploadedFiles-${getCode}`,
        content: `Failed to list uploaded files: ${getCode}`,
        type: ToastType.ERROR,
        closeable: true,
      });
    }
  }, [uploadedData, getSuccess, getCode]);

  return (
    <section className="mx-auto flex w-fit flex-col items-center gap-40px">
      <KYCStepper currentStep={step} onClick={handleStepChange} />
      <form ref={formRef} onSubmit={handleSubmit}>
        {step === 0 && <BasicInfoForm data={basicInfoValues} onChange={handleBasicInfoChange} />}
        {step === 1 && (
          <RegistrationInfoForm
            data={registrationInfoValues}
            onChange={handleRegistrationInfoChange}
          />
        )}
        {step === 2 && (
          <ContactInfoForm data={contactInfoValues} onChange={handleContactInfoChange} />
        )}
        {step === 3 && (
          <DocumentUploadForm data={uploadDocuments} onChange={handleDocumentChange} />
        )}
      </form>
      <KYCFormController
        step={step}
        onCancel={onCancel}
        onNext={() => handleStepChange(step + 1)}
        onSubmit={handleSubmitClick}
      />
    </section>
  );
};

export default KYCForm;
