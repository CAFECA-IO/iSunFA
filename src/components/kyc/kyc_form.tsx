import { useState, useRef } from 'react';
import KYCStepper from '@/components/kyc/kyc_stepper';
import KYCFormController from '@/components/kyc/kyc_form_controller';
import { IBasicInfo, initialBasicInfo } from '@/interfaces/kyc_basic_info';
import BasicInfoForm from '@/components/kyc/basic_info_form';
import { initialRegistrationInfo, IRegistrationInfo } from '@/interfaces/kyc_registration_info';
import RegistrationInfoForm from '@/components/kyc/registration_info_form';
import { IContactInfo, initialContactInfo } from '@/interfaces/kyc_contact_info';
import ContactInfoForm from '@/components/kyc/contact_info_form ';
import DocumentUploadForm from '@/components/kyc/document_upload_form';
import { initialUploadDocuments, IUploadDocuments } from '@/interfaces/kyc_document_upload';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import {
  RepresentativeIDType,
  BasicInfoKeys,
  RegistrationInfoKeys,
  ContactInfoKeys,
  UploadDocumentKeys,
} from '@/constants/kyc';
import { ICompanyKYCForm } from '@/interfaces/company_kyc';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'react-i18next';
import { isKYCFormComplete } from '@/lib/utils/type_guard/company_kyc';

const KYCForm = ({ onCancel }: { onCancel: () => void }) => {
  const { t } = useTranslation('common');
  const formRef = useRef<HTMLFormElement>(null);
  const { selectedCompany } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const { trigger: triggerUpload } = APIHandler(APIName.KYC_UPLOAD, {}, false, false);
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

  const handleDocumentChange = (key: UploadDocumentKeys, id: string | undefined) => {
    setUploadDocuments((prev) => ({ ...prev, [key]: id }));
  };

  const handleSelectRepresentativeType = (value: RepresentativeIDType) => {
    setUploadDocuments((prev) => ({ ...prev, [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: value }));
  };

  const handleSubmitClick = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { areaCode, contactNumber, ...restContactInfoValues } = contactInfoValues;
    const companyKYCForm: ICompanyKYCForm = {
      ...basicInfoValues,
      ...registrationInfoValues,
      ...restContactInfoValues,
      [ContactInfoKeys.CONTACT_PHONE]: contactInfoValues.areaCode + contactInfoValues.contactNumber,
      ...uploadDocuments,
    };
    const { isComplete, missingFields } = isKYCFormComplete(companyKYCForm);
    if (isComplete) {
      const { success, code } = await triggerUpload({
        params: {
          companyId: selectedCompany?.id,
        },
        body: companyKYCForm,
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
          <DocumentUploadForm
            data={uploadDocuments}
            onChange={handleDocumentChange}
            onSelect={handleSelectRepresentativeType}
          />
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
