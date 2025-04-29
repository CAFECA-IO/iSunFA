import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface IResumeMainBodyProps {
  setIsProcess: React.Dispatch<React.SetStateAction<boolean>>;
}

const ResumeMainBody: React.FC<IResumeMainBodyProps> = ({ setIsProcess }) => {
  const { t } = useTranslation(['hiring']);

  const resumeRef = useRef<HTMLDivElement>(null);
  const [isResumeRefVisible, setIsResumeRefVisible] = useState<boolean>(false);

  useEffect(() => {
    const waitForResume = setTimeout(() => {
      setIsResumeRefVisible(true);
    }, 500);
    return () => {
      clearTimeout(waitForResume);
    };
  }, []);

  const clickCreateResume = () => setIsProcess(true);

  return (
    <div ref={resumeRef} className="mt-100px flex flex-col items-center gap-100px">
      <div
        className={`flex flex-col items-center gap-lv-4 ${
          isResumeRefVisible ? 'opacity-100' : 'opacity-0'
        } transition-all duration-500`}
      >
        <p className="text-lg font-semibold text-surface-brand-primary">
          {t('hiring:RESUME_PAGE.MAIN_SUBTITLE')}
        </p>
        <LinearGradientText align={TextAlign.CENTER} size={LinearTextSize.XL}>
          {t('hiring:RESUME_PAGE.MAIN_TITLE')}
        </LinearGradientText>
      </div>

      <div className="flex flex-col items-center gap-38px">
        {/* Info: (20250409 - Julian) Sign in with LinkedIn Button */}
        <div
          className={` ${
            isResumeRefVisible ? 'opacity-100' : 'opacity-0'
          } hidden transition-all delay-1000 duration-500`} // Info: (20250409 - Julian) 先隱藏
        >
          <button type="button" className="hover:opacity-80">
            <Image
              src="/elements/sign_linkedin.png"
              alt="Sign in with LinkedIn"
              width={215}
              height={41}
            />
          </button>
        </div>

        {/* Info: (20250409 - Julian) Update Resume Button */}
        <div
          className={` ${
            isResumeRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-80px opacity-0'
          } hidden transition-all delay-1000 duration-500`} // Info: (20250409 - Julian) 先隱藏
        >
          <LandingButton variant="primary" className="font-black">
            <Image src="/icons/upload_resume.svg" alt="upload_resume" width={20} height={20} />
            {t('hiring:RESUME_PAGE.UPLOAD_RESUME_BTN')}
          </LandingButton>
        </div>

        {/* Info: (20250409 - Julian) Create New Resume Button */}
        <div
          className={` ${
            isResumeRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-160px opacity-0'
          } transition-all delay-1000 duration-500`}
        >
          <LandingButton variant="default" className="font-black" onClick={clickCreateResume}>
            <div className="h-20px w-20px">
              <Image src="/icons/user_plus.svg" alt="create_resume" width={20} height={20} />
            </div>
            {t('hiring:RESUME_PAGE.CREATE_RESUME_BTN')}
          </LandingButton>
        </div>
      </div>
    </div>
  );
};

export default ResumeMainBody;
