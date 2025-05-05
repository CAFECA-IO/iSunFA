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
  removeEducationExperience: (id: number) => void;

  tempWorkList: IWorkExperience[];
  addWorkExperience: (work: IWorkExperience) => void;
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
  // Info: (20250505 - Julian) [Step 2] 刪除學歷資訊
  const removeEducationExperience = (id: number) => {
    setEducationList((prev) => prev.filter((education) => education.id !== id));
  };

  // Info: (20250505 - Julian) [Step 2] 新增工作經歷資訊
  const addWorkExperience = (workList: IWorkExperience) => {
    setWorkList((prev) => [...prev, workList]);
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
      removeEducationExperience,

      tempWorkList: workListRef.current,
      addWorkExperience,
      removeWorkExperience,
    }),
    [
      favoriteJobIdsRef.current,
      toggleFavoriteJobId,
      personalInfoRef.current,
      savePersonalInfo,
      educationListRef.current,
      addEducationExperience,
      removeEducationExperience,
      workListRef.current,
      addWorkExperience,
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
