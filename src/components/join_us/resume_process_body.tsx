import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import ResumeStepper from '@/components/join_us/resume_stepper';
import PersonalInfoForm from '@/components/join_us/personal_info_form';
import ExperienceForm from '@/components/join_us/experience_form';
import SkillForm from '@/components/join_us/skill_form';
import PreferenceForm from '@/components/join_us/preference_form';
import AttachmentForm from '@/components/join_us/attachment_form';

const ResumeProcessBody: React.FC = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);

  const toPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      // Info: (20250411 - Julian) 如果當前步驟為第一步，則返回到工作列表頁面
      router.push(`${ISUNFA_ROUTE.JOIN_US}/${router.query.jobId}`);
    }
  };

  const toNextStep = () => {
    if (currentStep === 5) {
      // ToDo: (20250502 - Julian) Post API
      // eslint-disable-next-line no-console
      console.log('Resume submitted!');

      // Info: (20250502 - Julian) 提交後跳轉到完成頁面
      router.push(ISUNFA_ROUTE.FINISH_PAGE);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const showingForm =
    currentStep === 1 ? (
      <PersonalInfoForm toPrevStep={toPrevStep} toNextStep={toNextStep} />
    ) : currentStep === 2 ? (
      <ExperienceForm toPrevStep={toPrevStep} toNextStep={toNextStep} />
    ) : currentStep === 3 ? (
      <SkillForm toPrevStep={toPrevStep} toNextStep={toNextStep} />
    ) : currentStep === 4 ? (
      <PreferenceForm toPrevStep={toPrevStep} toNextStep={toNextStep} />
    ) : (
      <AttachmentForm toPrevStep={toPrevStep} toNextStep={toNextStep} />
    );

  return (
    <div className="flex flex-col items-center gap-90px py-60px">
      <ResumeStepper currentStep={currentStep} />
      {showingForm}
    </div>
  );
};

export default ResumeProcessBody;
