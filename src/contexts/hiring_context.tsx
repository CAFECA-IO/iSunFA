import React, { createContext, useContext, useMemo } from 'react';
import useStateRef from 'react-usestateref';
import { IPersonalInfo } from '@/interfaces/resume';
import { IEducationExperience, IWorkExperience } from '@/interfaces/experience';

export interface IHiringProvider {
  children: React.ReactNode;
}

interface IHiringContext {
  favoriteJobIds: number[];
  toggleFavoriteJobId: (jobId: number) => void;

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
}

const HiringContext = createContext<IHiringContext | undefined>(undefined);

export const HiringProvider = ({ children }: IHiringProvider) => {
  const [, setFavoriteJobIds, favoriteJobIdsRef] = useStateRef<number[]>([]);

  const [, setPersonalInfo, personalInfoRef] = useStateRef<IPersonalInfo | undefined>(undefined);
  const [, setEducationList, educationListRef] = useStateRef<IEducationExperience[]>([]);
  const [, setWorkList, workListRef] = useStateRef<IWorkExperience[]>([]);

  // Info: (20250505 - Julian) 收藏工作職缺的 ID
  const toggleFavoriteJobId = (jobId: number) => {
    setFavoriteJobIds((prev) => {
      const newFavorites = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId) // Info: (20250505 - Julian) 若已有該 jobId，則移除
        : [...prev, jobId]; // Info: (20250505 - Julian) 若沒有該 jobId，則加入
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

  const value = useMemo(
    () => ({
      favoriteJobIds: favoriteJobIdsRef.current,
      toggleFavoriteJobId,

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
    }),
    [
      favoriteJobIdsRef.current,
      toggleFavoriteJobId,
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
