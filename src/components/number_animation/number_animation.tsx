/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';

interface NumberAnimationProps {
  targetNumber: number;
}

const NumberAnimation = ({ targetNumber }: NumberAnimationProps) => {
  const [number, setNumber] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const interval = setInterval(() => {
          setNumber((prevNumber: number) => {
            if (prevNumber < targetNumber) {
              return prevNumber + 1;
            } else {
              clearInterval(interval);
              return prevNumber;
            }
          });
        }, 10); // Adjust the speed of the animation by changing the interval duration
      } else {
        setNumber(0);
      }
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [targetNumber]);

  return (
    <div ref={ref} className="text-h2 font-bold leading-h2 text-primaryYellow">
      {number}
    </div>
  );
};

export default NumberAnimation;
