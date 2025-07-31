import { useEffect, useState } from 'react';

export const useIsLg = () => {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(query.matches);

    update(); // Info: (20250527 - Anna) 初始判斷
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return isLg;
};
