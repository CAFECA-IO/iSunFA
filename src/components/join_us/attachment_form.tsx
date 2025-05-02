import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { haloStyle } from '@/constants/display';
import UploadArea from '@/components/join_us/upload_area';

interface IAttachmentFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

const AttachmentForm: React.FC<IAttachmentFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring', 'common']);

  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [websiteInput, setWebsiteInput] = useState<string>('');

  const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // ToDo: (20250502 - Julian) 處理表單提交邏輯
    const formData = {
      attachments,
      personalWebsite: websiteInput,
    };

    // eslint-disable-next-line no-console
    console.log('Form submitted:', formData);

    toNextStep();
  };

  return (
    <form onSubmit={submitHandler} className="flex w-full flex-col">
      <div className="flex flex-col items-stretch gap-50px">
        {/* Info: (20250502 - Julian) Attachment */}
        <div className="flex flex-col items-start gap-10px">
          <p className="text-base font-normal">{t('hiring:ATTACHMENT_PAGE.ATTACHMENT')}</p>
          <UploadArea files={attachments} setFiles={setAttachments} className="w-full" />
        </div>

        {/* Info: (20250502 - Julian) Personal Website */}
        <div className="flex flex-col items-start gap-6px">
          <p className="text-base font-normal">{t('hiring:ATTACHMENT_PAGE.PERSONAL_WEBSITE')}</p>
          <input
            type="text"
            className={`${haloStyle} h-60px w-full rounded-full px-24px`}
            value={websiteInput}
            onChange={(e) => setWebsiteInput(e.target.value)}
            placeholder={t('hiring:ATTACHMENT_PAGE.PLACEHOLDER')}
          />
        </div>
      </div>

      <div className="ml-auto mt-70px flex items-center gap-lv-6">
        {/* Info: (20250502 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
          {t('hiring:COMMON.PREVIOUS')}
        </LandingButton>

        {/* Info: (20250502 - Julian) Next Button */}
        <LandingButton type="submit" variant="primary" className="font-bold">
          {t('common:COMMON.SUBMIT')}
        </LandingButton>
      </div>
    </form>
  );
};

export default AttachmentForm;
