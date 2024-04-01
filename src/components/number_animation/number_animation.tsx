import { useCallback, useEffect, useRef, useState } from 'react';
import { INTERVAL_NUMBER_ANIMATION_DESKTOP } from '../../constants/display';

interface NumberAnimationProps {
  targetNumber: number;
}

const NumberAnimation = ({ targetNumber }: NumberAnimationProps) => {
  const [number, setNumber] = useState(0);
  const numberRef = useRef(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const animateNumber = () => {
    setNumber((prevNumber: number) => {
      if (prevNumber < targetNumber) {
        return prevNumber + 1;
      }
      return prevNumber;
    });

    if (number < targetNumber) {
      requestAnimationFrame(animateNumber);
    }
  };

  const scrollHandler = useCallback(() => {
    const element = numberRef.current;
    if (!element) return;
    const position = (element as HTMLDivElement).getBoundingClientRect();

    // Check if element is within viewport
    if (position.top >= 0 && position.bottom <= window.innerHeight) {
      intervalRef.current = setInterval(() => {
        // const interval = setInterval(() => {

        requestAnimationFrame(animateNumber);

        // setNumber((prevNumber: number) => {
        //   if (prevNumber < targetNumber) {
        //     return prevNumber + 1;
        //   }

        //   clearInterval(intervalRef.current as NodeJS.Timeout);
        //   return prevNumber;
        // });
      }, INTERVAL_NUMBER_ANIMATION_DESKTOP);
    }

    // else {
    //   setNumber(0); // Reset number when element is out of view
    // }
  }, [targetNumber]);

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [scrollHandler]);

  return (
    <div ref={numberRef} className="text-h2 font-bold leading-h2 text-primaryYellow">
      {number}
    </div>
  );
};

export default NumberAnimation;

/*
import { useCallback, useEffect, useRef, useState } from 'react';
import { INTERVAL_NUMBER_ANIMATION_DESKTOP } from '../../constants/display';

interface NumberAnimationProps {
  targetNumber: number;
}

const NumberAnimation = ({ targetNumber }: NumberAnimationProps) => {
  const [number, setNumber] = useState(0);
  const numberRef = useRef(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const animateNumber = useCallback(() => {
    setNumber((prevNumber: number) => {
      if (prevNumber < targetNumber) {
        return prevNumber + 1;
      }
      return prevNumber;
    });

    if (number < targetNumber) {
      requestAnimationFrame(animateNumber);
    }
  }, [number, targetNumber]);

  const scrollHandler = useCallback(() => {
    const element = numberRef.current;
    if (!element) return;
    const position = (element as HTMLDivElement).getBoundingClientRect();

    // Check if element is within viewport
    if (position.top >= 0 && position.bottom <= window.innerHeight) {
      intervalRef.current = setInterval(() => {
        // const interval = setInterval(() => {
        requestAnimationFrame(animateNumber);
        // setNumber((prevNumber: number) => {
        //   if (prevNumber < targetNumber) {
        //     return prevNumber + 1;
        //   }

        //   clearInterval(intervalRef.current as NodeJS.Timeout);
        //   return prevNumber;
        // });
      }, INTERVAL_NUMBER_ANIMATION_DESKTOP);
    } else {
      setNumber(0); // Reset number when element is out of view
    }
  }, [targetNumber]);

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [scrollHandler]);

  return (
    <div ref={numberRef} className="text-h2 font-bold leading-h2 text-primaryYellow">
      {number}
    </div>
  );
};

// export const MobileNumberAnimation = ({ targetNumber }: NumberAnimationProps) => {
//   const [number, setNumber] = useState(0);
//   const numberRef = useRef(null);

//   const scrollHandler = () => {
//     const element = numberRef.current;
//     if (!element) return;
//     const position = (element as HTMLDivElement).getBoundingClientRect();

//     // Check if element is within viewport
//     if (position.top >= 0 && position.bottom <= window.innerHeight) {
//       const interval = setInterval(() => {
//         setNumber((prevNumber: number) => {
//           if (prevNumber < targetNumber) {
//             return prevNumber + 1;
//           }

//           clearInterval(interval);
//           return prevNumber;
//         });
//       }, INTERVAL_NUMBER_ANIMATION_MOBILE);
//     } else {
//       setNumber(0); // Reset number when element is out of view
//     }
//   };

//   useEffect(() => {
//     window.addEventListener('scroll', scrollHandler);

//     return () => {
//       window.removeEventListener('scroll', scrollHandler);
//     };
//   }, [targetNumber]);

//   return (
//     <div ref={numberRef} className="text-h2 font-bold leading-h2 text-primaryYellow">
//       {number}
//     </div>
//   );
// };

export default NumberAnimation;

*/
