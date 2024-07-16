import { useState } from 'react';
import KYCStepper from './kyc_stepper';

const BacicInfoForm = () => {
  return <>BacicInfoForm</>;
};

const RegistrationInfoForm = () => {
  return <>RegistrationInfoForm</>;
};

const ContactInfoForm = () => {
  return <>ContactInfoForm</>;
};

const DocumentUploadForm = () => {
  return <>DocumentUploadForm</>;
};

const KYCForm = ({ onCancel }: { onCancel: () => void }) => {
  const [step, setStep] = useState(0);
  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };
  return (
    <>
      <KYCStepper currentStep={step} onClick={handleStepChange} />
      <form>
        {step === 0 && <BacicInfoForm />}
        {step === 1 && <RegistrationInfoForm />}
        {step === 2 && <ContactInfoForm />}
        {step === 3 && <DocumentUploadForm />}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="rounded bg-gray-500 px-4 py-2 text-white"
            onClick={onCancel}
          >
            Cancel
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="rounded bg-yellow-500 px-4 py-2 text-white"
              onClick={() => handleStepChange(step + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="rounded bg-yellow-500 px-4 py-2 text-white"
              onClick={() => {}}
            >
              Summit
            </button>
          )}
        </div>
      </form>
    </>
  );
};

export default KYCForm;
