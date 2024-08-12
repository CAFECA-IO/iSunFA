import { useState, useRef } from 'react';
import KYCStepper from '@/components/kyc/kyc_stepper';
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
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';

const KYCForm = () => {
  const { t } = useTranslation('common');
  const router = useRouter();

  const formRef = useRef<HTMLFormElement>(null);
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();
  const { trigger: triggerUpload } = APIHandler(APIName.KYC_UPLOAD);
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

  const goCompanyInfo = () => {
    router.push(ISUNFA_ROUTE.COMPANY_INFO);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasCompanyId) return;
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
          backBtnStr: t('COMMON.CANCEL'),
          submitBtnStr: t('KYC.CONFIRM'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
            goCompanyInfo();
          },
        });
        messageModalVisibilityHandler();
      } else if (success === false) {
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: t('KYC.SUBMIT_FAILED'),
          content: t('KYC.CONTACT_SERVICE_TEAM'),
          subMsg: t('KYC.SUBMIT_FAILED_MESSAGE', code),
          backBtnStr: t('COMMON.CANCEL'),
          submitBtnStr: t('KYC.CONFIRM'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
            goCompanyInfo();
          },
        });
      }
    } else {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('KYC.INCOMPLETE_FORM'),
        subMsg: t('KYC.INCOMPLETE_FORM_SUB_MESSAGE', { fields: missingFields.join(', ') }),
        content: t('KYC.CONTACT_SERVICE_TEAM'),
        submitBtnStr: t('KYC.CONFIRM'),
        backBtnStr: t('COMMON.CANCEL'),
        submitBtnFunction: () => {
          messageModalVisibilityHandler();
          goCompanyInfo();
        },
      });
      messageModalVisibilityHandler();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextButtonClick = () => {
    handleStepChange(step + 1);
    scrollToTop();
  };

  const handleBackButtonClick = () => {
    handleStepChange(step - 1);
    scrollToTop();
  };

  // Info: (20240801 - Liz) 確認每個步驟的表格是否填寫完整
  const isBasicInfoFormComplete = Object.values(basicInfoValues).every((value) => value !== '');

  const isRegistrationInfoFormComplete = Object.values(registrationInfoValues).every(
    (value) => value !== ''
  );

  const isContactInfoFormComplete = () => {
    const {
      [ContactInfoKeys.COMPANY_WEBSITE]: _, // Info: (20240801 - Liz) _ means ignore this value
      [ContactInfoKeys.CONTACT_PHONE]: __, // Info: (20240801 - Liz) __ means ignore this value
      ...requiredFields
    } = contactInfoValues;
    return Object.values(requiredFields).every((value) => value !== '');
  };

  const isDocumentUploadFormComplete = Object.values(uploadDocuments).every(
    (value) => value !== '' && value !== undefined
  );

  // Info: (20240801 - Liz) 按鈕的樣式 (disabled or enabled)
  const disabledButtonStyle = 'text-button-text-disable bg-button-surface-strong-disable';
  const enabledButtonStyle = 'bg-button-surface-strong-primary text-button-text-primary-solid';

  return (
    <section className="flex w-full flex-col items-center gap-40px">
      <KYCStepper currentStep={step} />
      <form ref={formRef} onSubmit={handleSubmit}>
        {step === 0 && (
          <>
            <BasicInfoForm data={basicInfoValues} onChange={handleBasicInfoChange} />
            <div className="mt-40px flex justify-end gap-20px">
              <button
                type="button"
                className={`rounded px-4 py-2 ${isBasicInfoFormComplete ? enabledButtonStyle : disabledButtonStyle}`}
                onClick={handleNextButtonClick}
                disabled={!isBasicInfoFormComplete}
              >
                {t('KYC.NEXT')}
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <RegistrationInfoForm
              data={registrationInfoValues}
              onChange={handleRegistrationInfoChange}
            />
            <div className="mt-40px flex justify-end gap-20px">
              <button
                type="button"
                className="rounded px-4 py-2 text-secondaryBlue"
                onClick={handleBackButtonClick}
              >
                {t('KYC.BACK')}
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 ${isRegistrationInfoFormComplete ? enabledButtonStyle : disabledButtonStyle}`}
                onClick={handleNextButtonClick}
                disabled={!isRegistrationInfoFormComplete}
              >
                {t('KYC.NEXT')}
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <ContactInfoForm data={contactInfoValues} onChange={handleContactInfoChange} />
            <div className="mt-40px flex justify-end gap-20px">
              <button
                type="button"
                className="rounded px-4 py-2 text-secondaryBlue"
                onClick={handleBackButtonClick}
              >
                {t('KYC.BACK')}
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 ${isContactInfoFormComplete() ? enabledButtonStyle : disabledButtonStyle}`}
                onClick={handleNextButtonClick}
                disabled={!isContactInfoFormComplete()}
              >
                {t('KYC.NEXT')}
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <DocumentUploadForm
              data={uploadDocuments}
              onChange={handleDocumentChange}
              onSelect={handleSelectRepresentativeType}
            />
            <div className="mt-40px flex justify-end gap-20px">
              <button
                type="button"
                className="rounded px-4 py-2 text-secondaryBlue"
                onClick={handleBackButtonClick}
              >
                {t('KYC.BACK')}
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                className={`rounded px-4 py-2 ${isDocumentUploadFormComplete ? enabledButtonStyle : disabledButtonStyle}`}
                disabled={!isDocumentUploadFormComplete}
              >
                {t('KYC.SUBMIT')}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
};

export default KYCForm;
