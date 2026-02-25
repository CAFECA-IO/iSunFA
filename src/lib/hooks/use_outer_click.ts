import { useEffect, useRef } from 'react';
import useStateRef from 'react-usestateref';

function useOuterClick<T extends HTMLElement>(initialVisibleState: boolean) {
  const [componentVisible, setComponentVisible, componentVisibleRef] = useStateRef<boolean>(initialVisibleState);

  const targetRef = useRef<T>(null);

  function handleClickOutside(event: MouseEvent): void {
    if (componentVisibleRef.current && event.target instanceof HTMLElement && !targetRef.current?.contains(event.target)) {
      setComponentVisible(false);
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);  
    };
  }, []);

  return {
    targetRef,
    componentVisible,
    setComponentVisible,
  };
}

export default useOuterClick;
