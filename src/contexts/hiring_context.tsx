import React, { createContext, useContext, useMemo, useState } from 'react';
// import useStateRef from 'react-usestateref';

export interface IHiringProvider {
  children: React.ReactNode;
}

interface IHiringContext {
  favoriteJobIds: number[];
  toggleFavoriteJobId: (jobId: number) => void;
}

const HiringContext = createContext<IHiringContext | undefined>(undefined);

export const HiringProvider = ({ children }: IHiringProvider) => {
  const [favoriteJobIds, setFavoriteJobIds] = useState<number[]>([]);

  // Info: (20250505 - Julian) 收藏工作職缺的 ID
  const toggleFavoriteJobId = (jobId: number) => {
    setFavoriteJobIds((prev) => {
      const newFavorites = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId) // Info: (20250505 - Julian) 若已有該 jobId，則移除
        : [...prev, jobId]; // Info: (20250505 - Julian) 若沒有該 jobId，則加入
      return newFavorites;
    });
  };

  const value = useMemo(
    () => ({
      favoriteJobIds,
      toggleFavoriteJobId,
    }),
    [favoriteJobIds]
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
