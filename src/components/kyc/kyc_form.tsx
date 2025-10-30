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
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import {
  RepresentativeIDType,
  BasicInfoKeys,
  RegistrationInfoKeys,
  ContactInfoKeys,
  UploadDocumentKeys,
} from '@/constants/kyc';
import { IAccountBookKYCForm } from '@/interfaces/account_book_kyc';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import { isKYCFormComplete } from '@/lib/utils/type_guard/account_book_kyc';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';

const KYCForm = () => {
  const { t } = useTranslation(['common', 'kyc']);
  const router = useRouter();

  const formRef = useRef<HTMLFormElement>(null);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
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

  const handleDocumentChange = (key: UploadDocumentKeys, id: number | undefined) => {
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
    const { ...restContactInfoValues } = contactInfoValues;

    // Info: (20240830 - Murky) To Emily and Jacky, File update down below
    const intUploadDocuments = {
      ...uploadDocuments,
      [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: Number(
        uploadDocuments[UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]
      ),
      [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: Number(
        uploadDocuments[UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]
      ),
      [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: Number(
        uploadDocuments[UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]
      ),
    };
    const companyKYCForm: IAccountBookKYCForm = {
      ...basicInfoValues,
      ...registrationInfoValues,
      ...restContactInfoValues,
      [ContactInfoKeys.CONTACT_PHONE]: contactInfoValues.areaCode + contactInfoValues.contactNumber,
      ...intUploadDocuments,
    };
    const { isComplete, missingFields } = isKYCFormComplete(companyKYCForm);

    if (isComplete) {
      const { success, code } = await triggerUpload({
        params: {
          companyId: connectedAccountBook?.id,
        },
        body: companyKYCForm,
      });
      if (success) {
        messageModalDataHandler({
          messageType: MessageType.SUCCESS,
          title: t('kyc:KYC.SUBMIT_SUCCESS'),
          content: t('kyc:KYC.SUBMIT_SUCCESS_MESSAGE'),
          backBtnStr: t('common:COMMON.CANCEL'),
          submitBtnStr: t('kyc:KYC.CONFIRM'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
            goCompanyInfo();
          },
        });
        messageModalVisibilityHandler();
      } else if (success === false) {
        messageModalDataHandler({
          messageType: MessageType.ERROR,
          title: t('kyc:KYC.SUBMIT_FAILED'),
          content: t('kyc:KYC.CONTACT_SERVICE_TEAM'),
          subMsg: t('kyc:KYC.SUBMIT_FAILED_MESSAGE', code),
          backBtnStr: t('common:COMMON.CANCEL'),
          submitBtnStr: t('kyc:KYC.CONFIRM'),
          submitBtnFunction: () => {
            messageModalVisibilityHandler();
            goCompanyInfo();
          },
        });
      }
    } else {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('kyc:KYC.INCOMPLETE_FORM'),
        subMsg: t('kyc:KYC.INCOMPLETE_FORM_SUB_MESSAGE', { fields: missingFields.join(', ') }),
        content: t('kyc:KYC.CONTACT_SERVICE_TEAM'),
        submitBtnStr: t('kyc:KYC.CONFIRM'),
        backBtnStr: t('common:COMMON.CANCEL'),
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
    const { ...requiredFields } = contactInfoValues;
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
                {t('kyc:KYC.NEXT')}
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
                className="rounded px-4 py-2 text-button-text-secondary"
                onClick={handleBackButtonClick}
              >
                {t('kyc:KYC.BACK')}
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 ${isRegistrationInfoFormComplete ? enabledButtonStyle : disabledButtonStyle}`}
                onClick={handleNextButtonClick}
                disabled={!isRegistrationInfoFormComplete}
              >
                {t('kyc:KYC.NEXT')}
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
                className="rounded px-4 py-2 text-button-text-secondary"
                onClick={handleBackButtonClick}
              >
                {t('kyc:KYC.BACK')}
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 ${isContactInfoFormComplete() ? enabledButtonStyle : disabledButtonStyle}`}
                onClick={handleNextButtonClick}
                disabled={!isContactInfoFormComplete()}
              >
                {t('kyc:KYC.NEXT')}
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
                className="rounded px-4 py-2 text-button-text-secondary"
                onClick={handleBackButtonClick}
              >
                {t('kyc:KYC.BACK')}
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                className={`rounded px-4 py-2 ${isDocumentUploadFormComplete ? enabledButtonStyle : disabledButtonStyle}`}
                disabled={!isDocumentUploadFormComplete}
              >
                {t('kyc:KYC.SUBMIT')}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
};

export default KYCForm;
