import { useEffect, useRef, useState } from 'react';

export function useClickManager<T extends HTMLElement>() {
  const refs = useRef<React.RefObject<T>[]>([]);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

  const registerRef = (key: string, ref: React.RefObject<T>) => {
    refs.current.push(ref);
    setVisibleMap((prev) => ({ ...prev, [key]: false }));
  };

  const setVisibility = (key: string, isVisible: boolean) => {
    setVisibleMap((prev) => ({ ...prev, [key]: isVisible }));
  };

  const handleClickOutside = (event: MouseEvent) => {
    refs.current.forEach((ref, index) => {
      const key = Object.keys(visibleMap)[index];
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        setVisibility(key, false);
      }
    });
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  return { registerRef, visibleMap, setVisibility };
}

export default useClickManager;
