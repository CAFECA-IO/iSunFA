import React, { useState } from 'react';
import Image from 'next/image';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle } from '@/constants/display';
import { IExperienceDate } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import CertificateUploadArea from '@/components/join_us/certificate_upload_area';
import { ICertificateData, ICertificateSkill, ModalType } from '@/interfaces/skill';

interface ICertificateUploadModalProps {
  modalVisibilityHandler: () => void;
  modalType: ModalType;
  certData?: ICertificateSkill;
  saveHandler: (data: ICertificateData) => void;
  deleteHandler?: (langId: number) => void;
}

const CertificateUploadModal: React.FC<ICertificateUploadModalProps> = ({
  modalVisibilityHandler,
  modalType,
  certData,
  saveHandler,
  deleteHandler,
}) => {
  const { t } = useTranslation(['hiring', 'common']);
  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  const defaultState = {
    name: '',
    issuingOrganization: '',
    issueDate: { year: 0, month: 0 },
    expirationDate: { year: 0, month: 0 },
    certificate: null,
  };

  const {
    name: initialName,
    issuingOrganization: initialIssuingOrganization,
    issueDate: initialIssueDate,
    expirationDate: initialExpirationDate,
    certificate: initialCertificate,
  } = certData || defaultState;

  const [nameInput, setNameInput] = useState<string>(initialName);
  const [organizationInput, setOrganizationInput] = useState<string>(initialIssuingOrganization);
  const [issueDate, setIssueDate] = useState<IExperienceDate>(initialIssueDate);
  const [expirationDate, setExpirationDate] = useState<IExperienceDate>(initialExpirationDate);
  const [uploadedCertificate, setUploadedCertificate] = useState<File | null>(initialCertificate);

  const saveDisable = !uploadedCertificate;

  const issueDateValueFormat = `${issueDate.year}-${String(issueDate.month).padStart(2, '0')}`;
  const expirationDateValueFormat = `${expirationDate.year}-${String(expirationDate.month).padStart(2, '0')}`;

  const changeNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
  };
  const changeOrganizationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganizationInput(e.target.value);
  };
  const changeIssueTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setIssueDate({ year, month });
  };
  const changeExpirationTimestamp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setExpirationDate({ year, month });
  };

  // Info: (20250429 - Julian) 送出表單
  const saveClickHandler = (e: React.FormEvent<HTMLFormElement>) => {
    if (!uploadedCertificate) return;
    e.preventDefault();

    const data: ICertificateData = {
      name: nameInput,
      issuingOrganization: organizationInput,
      issueDate,
      expirationDate,
      certificate: uploadedCertificate,
    };

    saveHandler(data);
  };

  const deleteCertHandler = () => {
    if (certData && deleteHandler) {
      deleteHandler(certData.id);
    }
  };

  const cancelButton =
    modalType === ModalType.CREATE ? (
      <LandingButton
        type="button"
        variant="default"
        className="font-bold"
        onClick={modalVisibilityHandler}
      >
        {t('common:COMMON.CANCEL')}
      </LandingButton>
    ) : (
      <LandingButton
        type="button"
        variant="default"
        className="font-bold"
        onClick={deleteCertHandler}
      >
        <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
      </LandingButton>
    );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <form
        onSubmit={saveClickHandler}
        className="relative mx-auto flex w-90vw flex-col items-stretch rounded-lg border border-white bg-landing-nav px-52px py-40px shadow-lg shadow-black/80 backdrop-blur-lg"
      >
        {/* Info: (20250429 - Julian) Modal Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-36px font-bold text-text-brand-primary-lv3">
            {t('hiring:SKILLS.CERTIFICATE_MODAL_TITLE')}
          </h2>
          {/* Info: (20250429 - Julian) Close Button */}
          <button type="button" className="p-12px" onClick={modalVisibilityHandler}>
            <Image src="/icons/x_close.svg" width={24} height={24} alt="close_icon" />
          </button>
        </div>
        {/* Info: (20250429 - Julian) Form Content */}
        <div className="mt-40px grid grid-cols-2 gap-x-44px gap-y-24px px-150px">
          {/* Info: (20250429 - Julian) Name */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.CERTIFICATE_MODAL_NAME')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="TOEIC"
              value={nameInput}
              onChange={changeNameInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250429 - Julian) Issuing Organization */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.CERTIFICATE_MODAL_ORGA')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder="TOEIC Program"
              value={organizationInput}
              onChange={changeOrganizationInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250429 - Julian) Issue Date */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.CERTIFICATE_MODAL_ISSUE_DATE')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="month"
              value={issueDateValueFormat}
              onChange={changeIssueTimestamp}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250429 - Julian) Expiration Date */}
          <div className="flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.CERTIFICATE_MODAL_EXPIRE_DATE')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="month"
              value={expirationDateValueFormat}
              onChange={changeExpirationTimestamp}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250429 - Julian) Upload Certificate */}
          <CertificateUploadArea
            certificate={uploadedCertificate}
            setCertificate={setUploadedCertificate}
          />
        </div>
        {/* Info: (20250429 - Julian) Buttons */}
        <div className="ml-auto mt-40px flex items-center gap-lv-6">
          {cancelButton}
          <LandingButton
            type="submit"
            variant="primary"
            className="font-bold"
            disabled={saveDisable}
          >
            {t('hiring:COMMON.SAVE')}
          </LandingButton>
        </div>
      </form>
    </div>
  );
};

export default CertificateUploadModal;
