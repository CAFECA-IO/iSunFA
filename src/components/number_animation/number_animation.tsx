import { DEFAULT_THROTTLE_TIME } from '@/constants/display';
import React, { useEffect, useRef, useCallback } from 'react';

interface NumberAnimationProps {
  targetNumber: number;
  interval: number;
}

const NumberAnimation = ({ targetNumber, interval }: NumberAnimationProps) => {
  const numberRef = useRef<HTMLDivElement>(null);
  const currentNumberRef = useRef(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastScrollTime = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;

      const nextNumber = Math.min(Math.floor((progress / interval) * targetNumber), targetNumber);

      if (numberRef.current) {
        numberRef.current.textContent = nextNumber.toString();
      }
      currentNumberRef.current = nextNumber;

      if (nextNumber < targetNumber) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    },
    [targetNumber, interval]
  );

  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return; // Info: 如果已經在動畫中，不要重新開始 (20240722 - Shirley)

    isAnimatingRef.current = true;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    startTimeRef.current = undefined;

    // Info: 從當前數字開始，而不是從 0 開始 (20240722 - Shirley)
    const startNumber = currentNumberRef.current;
    const remainingNumber = targetNumber - startNumber;
    const adjustedStartTime = performance.now() - (startNumber / targetNumber) * interval;

    const adjustedAnimate = (timestamp: number) => {
      const progress = timestamp - adjustedStartTime;
      const nextNumber = Math.min(
        Math.floor(startNumber + (progress / interval) * remainingNumber),
        targetNumber
      );

      if (numberRef.current) {
        numberRef.current.textContent = nextNumber.toString();
      }
      currentNumberRef.current = nextNumber;

      if (nextNumber < targetNumber) {
        animationRef.current = requestAnimationFrame(adjustedAnimate);
      } else {
        isAnimatingRef.current = false;
      }
    };

    animationRef.current = requestAnimationFrame(adjustedAnimate);
  }, [animate, targetNumber, interval]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    isAnimatingRef.current = false;
    // Info: 不重置 currentNumberRef，保持當前值 (20240722 - Shirley)
  }, []);

  const scrollHandler = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollTime.current > DEFAULT_THROTTLE_TIME) {
      // Info: 100ms throttle (20240722 - Shirley)
      lastScrollTime.current = now;

      if (numberRef.current) {
        const rect = numberRef.current.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (isInViewport) {
          startAnimation();
        } else {
          stopAnimation();
        }
      }
    }
  }, [startAnimation, stopAnimation]);

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler);
    return () => {
      window.removeEventListener('scroll', scrollHandler);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [scrollHandler]);

  // Info: 初始化顯示 (20240722 - Shirley)
  useEffect(() => {
    if (numberRef.current) {
      numberRef.current.textContent = '0';
    }
  }, []);

  return <div ref={numberRef} className="text-h2 font-bold leading-h2 text-primaryYellow" />;
};

export default NumberAnimation;
