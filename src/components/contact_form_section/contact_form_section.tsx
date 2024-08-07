import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import ContactForm from '@/components/contact_form/contact_form';

const ContactFormSection = () => {
  const animeRef61 = useRef(null);
  const [isAnimeRef61Visible, setIsAnimeRef61Visible] = useState(false);

  const scrollHandler = () => {
    if (animeRef61.current) {
      const rect = (animeRef61.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsAnimeRef61Visible(rectTop < windowHeight - 200);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <div id="contact-us" className="mb-20 h-1000px md:mt-40 lg:-mt-24 xl:-mt-4">
      <div className="relative h-500px w-full">
        {' '}
        <Image
          loading="lazy"
          src="/animations/contact_bg.svg"
          alt="contact_bg"
          fill
          style={{ objectFit: 'cover' }}
        />
        <div
          ref={animeRef61}
          className={` ${isAnimeRef61Visible ? `translate-x-0` : `lg:-translate-x-140%`} absolute inset-0 flex justify-center duration-1000`}
        >
          {' '}
          <ContactForm />
        </div>
      </div>
    </div>
  );
};

export default ContactFormSection;
