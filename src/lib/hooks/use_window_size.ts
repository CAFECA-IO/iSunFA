import { useState, useEffect } from 'react';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: 100,
    height: 100,
  });
  useEffect(() => {
    // Info: (20240417 - Shirley) Handler to call on window resize
    function handleResize() {
      // Info: (20240417 - Shirley) Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

export default useWindowSize;
