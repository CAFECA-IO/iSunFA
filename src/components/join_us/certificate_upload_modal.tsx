import React, { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle } from '@/constants/display';
import { IExperienceDate } from '@/interfaces/experience';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import UploadArea from '@/components/join_us/upload_area';
import { ICertificateSkill } from '@/interfaces/skill';
import { MimeType } from '@/constants/mime_type';
import { useHiringCtx } from '@/contexts/hiring_context';
import { IoClose } from 'react-icons/io5';

interface ICertificateUploadModalProps {
  modalVisibilityHandler: () => void;
  editId: number | null;
}

const CertificateUploadModal: React.FC<ICertificateUploadModalProps> = ({
  modalVisibilityHandler,
  editId,
}) => {
  const { t } = useTranslation(['hiring', 'common']);
  const {
    tempCertificateList,
    addCertificateSkill,
    updateCertificateSkill,
    removeCertificateSkill,
  } = useHiringCtx();

  const inputStyle = `${haloStyle} rounded-full outline-none h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;
  const isEditMode = editId !== null;

  const initialData = tempCertificateList.find((cert) => cert.id === editId);

  const defaultState = {
    name: '',
    issuingOrganization: '',
    issueDate: { year: 0, month: 0 },
    expirationDate: { year: 0, month: 0 },
    certificates: null,
  };

  const {
    name: initialName,
    issuingOrganization: initialIssuingOrganization,
    issueDate: initialIssueDate,
    expirationDate: initialExpirationDate,
    certificates: initialCertificates,
  } = initialData || defaultState;

  const [nameInput, setNameInput] = useState<string>(initialName);
  const [organizationInput, setOrganizationInput] = useState<string>(initialIssuingOrganization);
  const [issueDate, setIssueDate] = useState<IExperienceDate>(initialIssueDate);
  const [expirationDate, setExpirationDate] = useState<IExperienceDate>(initialExpirationDate);
  const [uploadedCertificates, setUploadedCertificates] = useState<FileList | null>(
    initialCertificates
  );

  const saveDisable = !uploadedCertificates;

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
    if (!uploadedCertificates) return;
    e.preventDefault();

    if (isEditMode) {
      // Info: (20250506 - Julian) 編輯模式
      const updateData: ICertificateSkill = {
        id: editId,
        name: nameInput,
        issuingOrganization: organizationInput,
        issueDate,
        expirationDate,
        certificates: uploadedCertificates,
      };
      updateCertificateSkill(editId, updateData);
    } else {
      // Info: (20250506 - Julian) 新增模式
      const newId = (tempCertificateList[tempCertificateList.length - 1]?.id ?? 0) + 1;
      const newData: ICertificateSkill = {
        id: newId,
        name: nameInput,
        issuingOrganization: organizationInput,
        issueDate,
        expirationDate,
        certificates: uploadedCertificates,
      };
      addCertificateSkill(newData);
    }

    // Info: (20250506 - Julian) 關閉 Modal
    modalVisibilityHandler();
  };

  const deleteCertHandler = () => {
    if (isEditMode) {
      removeCertificateSkill(editId!);
      modalVisibilityHandler();
    }
  };

  const cancelButton = isEditMode ? (
    <LandingButton
      type="button"
      variant="default"
      className="font-bold"
      onClick={deleteCertHandler}
    >
      <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
    </LandingButton>
  ) : (
    <LandingButton
      type="button"
      variant="default"
      className="font-bold"
      onClick={modalVisibilityHandler}
    >
      {t('common:COMMON.CANCEL')}
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
            <IoClose size={24} />
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
          <UploadArea
            files={uploadedCertificates}
            setFiles={setUploadedCertificates}
            className="col-span-2"
            limitedFileTypes={[MimeType.PDF, MimeType.DOC, MimeType.DOCX]}
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
