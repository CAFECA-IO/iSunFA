import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';

function LandingI18n() {
  const { asPath } = useRouter();

  const [currentLanguage, setCurrentLanguage] = useState('Language');

  /* Info: (20230712 - Shirley) close menu when click outer */
  const { targetRef, componentVisible, setComponentVisible } = useOuterClick<HTMLDivElement>(false);
  const clickMenuHandler = () => setComponentVisible(!componentVisible);

  const internationalizationList = [
    { label: '繁體中文', value: 'tw' },
    { label: 'English', value: 'en' },
    { label: '简体中文', value: 'cn' },
  ];

  const subMenu = internationalizationList.map((item) => {
    const clickHandler = () => {
      setComponentVisible(false);
      setCurrentLanguage(item.label);
    };

    return (
      // Info: (20240115 - Shirley) it's okay to use index as key in this case
      // Info: (20240829 - Anna) use value instead
      <li key={item.value} className="py-2 hover:cursor-pointer hover:bg-purpleLinear">
        <Link
          locale={item.value}
          scroll={false}
          className="block h-full w-full px-6 py-2"
          href={asPath}
          onClick={clickHandler}
        >
          {item.label}
        </Link>
      </li>
    );
  });

  /* Info: (20230712 - Shirley) Desktop menu */
  const desktopMenu = (
    <div className="relative hidden w-140px rounded lg:flex">
      <div
        className="flex w-full items-center px-5 py-2 hover:cursor-pointer"
        onClick={clickMenuHandler}
      >
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            componentVisible ? 'invisible opacity-0' : 'visible opacity-100'
          }`}
        >
          {currentLanguage}
        </div>
        <span className="-mt-2 h-12px w-12px rotate-45 border-b-2 border-r-2 border-button-text-invert" />
      </div>
      <div ref={targetRef}>
        <ul
          className={`absolute left-0 top-12 grid h-auto w-full grid-cols-1 rounded bg-button-surface-strong-secondary ${
            componentVisible ? 'visible grid-rows-1 opacity-100' : 'invisible grid-rows-0 opacity-0'
          } drop-shadow-lg transition-all duration-300 ease-in-out`}
        >
          {subMenu}
        </ul>
      </div>
    </div>
  );

  /* Info: (20230712 - Shirley) Mobile menu */
  const mobileMenu = (
    <div ref={targetRef} className="flex w-140px rounded lg:hidden">
      <div
        className="flex w-full items-baseline justify-center px-5 py-2 hover:cursor-pointer"
        onClick={clickMenuHandler}
      >
        <div className="flex">{currentLanguage}</div>
        <span className="ml-2 h-12px w-12px -rotate-45 border-b-2 border-r-2 border-button-text-invert" />
      </div>
      <ul
        className={`absolute left-0 top-0 flex h-95vh w-full flex-col items-center rounded ${
          componentVisible ? 'visible translate-x-0' : 'invisible translate-x-full'
        } bg-button-surface-strong-secondary py-2 transition-all duration-300 ease-in-out`}
      >
        <li className="w-full px-6 py-2" onClick={clickMenuHandler}>
          <span className="block h-12px w-12px rotate-135 border-b-2 border-r-2 border-button-text-invert" />
        </li>
        {subMenu}
      </ul>
    </div>
  );

  return (
    <>
      {desktopMenu}
      {mobileMenu}
    </>
  );
}

export default LandingI18n;
