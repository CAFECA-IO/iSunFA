import React, { useEffect, useState } from 'react';
import { MdKeyboardDoubleArrowUp } from 'react-icons/md';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <LandingButton
      type="button"
      onClick={scrollToTop}
      variant="primary"
      size="square"
      className={`fixed bottom-6 right-8 z-50 rounded-sm text-center font-bold transition ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <MdKeyboardDoubleArrowUp size={24} className="" />
    </LandingButton>
  );
};

export default ScrollToTopButton;
