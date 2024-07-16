import { useState } from 'react';
import KYCStepper from '@/components/kyc/kyc_stepper';
import KYCFormController from '@/components/kyc/kyc_form_controller';
import { BasicInfoKeys, IBasicInfo, initialBasicInfo } from '@/interfaces/kyc_basic_info';
import BacicInfoForm from '@/components/kyc/basic_info_form';
import {
  initialRegistrationInfo,
  IRegistrationInfo,
  RegistrationInfoKeys,
} from '@/interfaces/kyc_registration_info';
import RegistrationInfoForm from '@/components/kyc/registration_info_form';
import { ContactInfoKeys, IContactInfo, initialContactInfo } from '@/interfaces/kyc_contact_info';
import ContactInfoForm from '@/components/kyc/contact_info_form ';
import DocumentUploadForm from '@/components/kyc/document_upload_form';

const KYCForm = ({ onCancel }: { onCancel: () => void }) => {
  const [step, setStep] = useState(0);
  const [basicInfoValues, setBasicInfoValues] = useState<IBasicInfo>(initialBasicInfo);
  const [registrationInfoValues, setRegistrationInfoValues] =
    useState<IRegistrationInfo>(initialRegistrationInfo);
  const [contactInfoValues, setContactInfoValues] = useState<IContactInfo>(initialContactInfo);

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
  return (
    <section className="mx-auto flex w-fit flex-col items-center gap-40px">
      <KYCStepper currentStep={step} onClick={handleStepChange} />
      <form>
        {step === 0 && <BacicInfoForm data={basicInfoValues} onChange={handleBasicInfoChange} />}
        {step === 1 && (
          <RegistrationInfoForm
            data={registrationInfoValues}
            onChange={handleRegistrationInfoChange}
          />
        )}
        {step === 2 && (
          <ContactInfoForm data={contactInfoValues} onChange={handleContactInfoChange} />
        )}
        {step === 3 && <DocumentUploadForm />}
        <KYCFormController
          step={step}
          onCancel={onCancel}
          onNext={() => handleStepChange(step + 1)}
          onSubmit={() => {}}
        />
      </form>
    </section>
  );
};

export default KYCForm;
