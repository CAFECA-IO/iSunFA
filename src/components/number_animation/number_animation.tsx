import React, { useEffect, useState } from 'react';

interface NumberAnimationProps {
  targetNumber: number;
}

const NumberAnimation = ({ targetNumber }: NumberAnimationProps) => {
  const [number, setNumber] = useState(0);
  const numberRef = React.useRef(null);

  const scrollHandler = () => {
    const element = numberRef.current;
    if (!element) return;
    const position = (element as HTMLDivElement).getBoundingClientRect();

    // Check if element is within viewport
    if (position.top >= 0 && position.bottom <= window.innerHeight) {
      const interval = setInterval(() => {
        setNumber((prevNumber: number) => {
          if (prevNumber < targetNumber) {
            return prevNumber + 1;
          }
          clearInterval(interval);
          return prevNumber;
        });
      }, 10);
    } else {
      setNumber(0); // Reset number when element is out of view
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [targetNumber]);

  return (
    <div ref={numberRef} className="text-h2 font-bold leading-h2 text-primaryYellow">
      {number}
    </div>
  );
};

export default NumberAnimation;
