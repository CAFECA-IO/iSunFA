import React, { createContext, useContext, useMemo } from 'react';
import useStateRef from 'react-usestateref';
import { IAttachment, IPersonalInfo, IPreference } from '@/interfaces/resume';
import { IEducationExperience, IWorkExperience } from '@/interfaces/experience';
import { ICertificateSkill, ILanguageSkill } from '@/interfaces/skill';

export interface IHiringProvider {
  children: React.ReactNode;
}

interface IHiringContext {
  favoriteVacancyIds: number[];
  toggleFavoriteVacancyId: (vacancyId: number) => void;

  tempPersonalInfo: IPersonalInfo | undefined;
  savePersonalInfo: (info: IPersonalInfo) => void;

  tempEducationList: IEducationExperience[];
  addEducationExperience: (education: IEducationExperience) => void;
  updateEducationExperience: (id: number, updatedEducation: IEducationExperience) => void;
  removeEducationExperience: (id: number) => void;

  tempWorkList: IWorkExperience[];
  addWorkExperience: (work: IWorkExperience) => void;
  updateWorkExperience: (id: number, updatedWork: IWorkExperience) => void;
  removeWorkExperience: (id: number) => void;

  tempLanguageList: ILanguageSkill[];
  addLanguageSkill: (language: ILanguageSkill) => void;
  updateLanguageSkill: (id: number, updatedLanguage: ILanguageSkill) => void;
  removeLanguageSkill: (id: number) => void;

  tempCertificateList: ICertificateSkill[];
  addCertificateSkill: (certificate: ICertificateSkill) => void;
  updateCertificateSkill: (id: number, updatedCertificate: ICertificateSkill) => void;
  removeCertificateSkill: (id: number) => void;

  tempPreference: IPreference | undefined;
  savePreference: (preference: IPreference) => void;

  tempAttachment: IAttachment | undefined;
  saveAttachment: (attachment: IAttachment) => void;
}

const HiringContext = createContext<IHiringContext | undefined>(undefined);

export const HiringProvider = ({ children }: IHiringProvider) => {
  const [, setFavoriteVacancyIds, favoriteVacancyIdsRef] = useStateRef<number[]>([]);

  const [, setPersonalInfo, personalInfoRef] = useStateRef<IPersonalInfo | undefined>(undefined);
  const [, setEducationList, educationListRef] = useStateRef<IEducationExperience[]>([]);
  const [, setWorkList, workListRef] = useStateRef<IWorkExperience[]>([]);
  const [, setLanguageList, languageListRef] = useStateRef<ILanguageSkill[]>([]);
  const [, setCertificateList, certificateListRef] = useStateRef<ICertificateSkill[]>([]);
  const [, setPreference, preferenceRef] = useStateRef<IPreference | undefined>(undefined);
  const [, setAttachment, attachmentRef] = useStateRef<IAttachment | undefined>(undefined);

  // Info: (20250505 - Julian) 收藏工作職缺的 ID
  const toggleFavoriteVacancyId = (vacancyId: number) => {
    setFavoriteVacancyIds((prev) => {
      const newFavorites = prev.includes(vacancyId)
        ? prev.filter((id) => id !== vacancyId) // Info: (20250505 - Julian) 若已有該 vacancyId，則移除
        : [...prev, vacancyId]; // Info: (20250505 - Julian) 若沒有該 vacancyId，則加入
      return newFavorites;
    });
  };

  // Info: (20250505 - Julian) [Step 1] 儲存個人資訊
  const savePersonalInfo = (info: IPersonalInfo) => {
    setPersonalInfo(info);
  };

  // Info: (20250505 - Julian) [Step 2] 新增學歷資訊
  const addEducationExperience = (educationList: IEducationExperience) => {
    setEducationList((prev) => [...prev, educationList]);
  };
  // Info: (20250505 - Julian) [Step 2] 更新學歷資訊
  const updateEducationExperience = (id: number, updatedEducation: IEducationExperience) => {
    setEducationList((prev) =>
      prev.map((education) => (education.id === id ? updatedEducation : education))
    );
  };
  // Info: (20250505 - Julian) [Step 2] 刪除學歷資訊
  const removeEducationExperience = (id: number) => {
    setEducationList((prev) => prev.filter((education) => education.id !== id));
  };

  // Info: (20250505 - Julian) [Step 2] 新增工作經歷資訊
  const addWorkExperience = (workList: IWorkExperience) => {
    setWorkList((prev) => [...prev, workList]);
  };
  // Info: (20250505 - Julian) [Step 2] 更新工作經歷資訊
  const updateWorkExperience = (id: number, updatedWork: IWorkExperience) => {
    setWorkList((prev) => prev.map((work) => (work.id === id ? updatedWork : work)));
  };
  // Info: (20250505 - Julian) [Step 2] 刪除工作經歷資訊
  const removeWorkExperience = (id: number) => {
    setWorkList((prev) => prev.filter((work) => work.id !== id));
  };

  // Info: (20250505 - Julian) [Step 3] 新增語言技能資訊
  const addLanguageSkill = (languageList: ILanguageSkill) => {
    setLanguageList((prev) => [...prev, languageList]);
  };
  // Info: (20250505 - Julian) [Step 3] 更新語言技能資訊
  const updateLanguageSkill = (id: number, updatedLanguage: ILanguageSkill) => {
    setLanguageList((prev) =>
      prev.map((language) => (language.id === id ? updatedLanguage : language))
    );
  };
  // Info: (20250505 - Julian) [Step 3] 刪除語言技能資訊
  const removeLanguageSkill = (id: number) => {
    setLanguageList((prev) => prev.filter((language) => language.id !== id));
  };

  // Info: (20250505 - Julian) [Step 3] 新增證書技能資訊
  const addCertificateSkill = (certificateList: ICertificateSkill) => {
    setCertificateList((prev) => [...prev, certificateList]);
  };
  // Info: (20250505 - Julian) [Step 3] 更新證書技能資訊
  const updateCertificateSkill = (id: number, updatedCertificate: ICertificateSkill) => {
    setCertificateList((prev) =>
      prev.map((certificate) => (certificate.id === id ? updatedCertificate : certificate))
    );
  };
  // Info: (20250505 - Julian) [Step 3] 刪除證書技能資訊
  const removeCertificateSkill = (id: number) => {
    setCertificateList((prev) => prev.filter((certificate) => certificate.id !== id));
  };

  // Info: (20250505 - Julian) [Step 4] 儲存求職偏好資訊
  const savePreference = (preference: IPreference) => {
    setPreference(preference);
  };

  // Info: (20250505 - Julian) [Step 5] 儲存附件資訊
  const saveAttachment = (attachment: IAttachment) => {
    setAttachment(attachment);
  };

  const value = useMemo(
    () => ({
      favoriteVacancyIds: favoriteVacancyIdsRef.current,
      toggleFavoriteVacancyId,

      tempPersonalInfo: personalInfoRef.current,
      savePersonalInfo,

      tempEducationList: educationListRef.current,
      addEducationExperience,
      updateEducationExperience,
      removeEducationExperience,

      tempWorkList: workListRef.current,
      addWorkExperience,
      updateWorkExperience,
      removeWorkExperience,

      tempLanguageList: languageListRef.current,
      addLanguageSkill,
      updateLanguageSkill,
      removeLanguageSkill,

      tempCertificateList: certificateListRef.current,
      addCertificateSkill,
      updateCertificateSkill,
      removeCertificateSkill,

      tempPreference: preferenceRef.current,
      savePreference,

      tempAttachment: attachmentRef.current,
      saveAttachment,
    }),
    [
      favoriteVacancyIdsRef.current,
      toggleFavoriteVacancyId,
      personalInfoRef.current,
      savePersonalInfo,
      educationListRef.current,
      addEducationExperience,
      updateEducationExperience,
      removeEducationExperience,
      workListRef.current,
      addWorkExperience,
      updateWorkExperience,
      removeWorkExperience,
      languageListRef.current,
      addLanguageSkill,
      updateLanguageSkill,
      removeLanguageSkill,
      certificateListRef.current,
      addCertificateSkill,
      updateCertificateSkill,
      removeCertificateSkill,
      preferenceRef.current,
      savePreference,
      attachmentRef.current,
      saveAttachment,
    ]
  );

  return <HiringContext.Provider value={value}>{children}</HiringContext.Provider>;
};

export const useHiringCtx = () => {
  const context = useContext(HiringContext);
  if (!context) {
    throw new Error('useHiringContext must be used within a HiringProvider');
  }
  return context;
};
