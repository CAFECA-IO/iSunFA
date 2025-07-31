import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import Link from 'next/link';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { LuBellPlus } from 'react-icons/lu';
import { ISUNFA_ROUTE } from '@/constants/url';

const FlexibleFeatureIcon: React.FC<{
  feature: string;
  size?: number;
  halo?: boolean;
  link: string;
}> = ({ feature, size = 120, halo = false, link = '/' }) => {
  const { t } = useTranslation('common');

  const imageSrc = `/flexible_feature/${feature.toLowerCase().replaceAll(' ', '_')}.svg`;
  const imageAlt = `${feature.toLowerCase().replaceAll(' ', '_')}_icon`;

  const featureText = t(
    `landing_page_v2:FLEXIBLE_FEATURE_SELECTION.${feature.toUpperCase().replaceAll(' ', '_')}`
  );

  return (
    <Link
      href={link}
      className="flex w-120px flex-col items-center justify-center gap-16px justify-self-center md:h-160px md:w-180px"
    >
      <Image
        src={imageSrc}
        width={size}
        height={size}
        alt={imageAlt}
        className={halo ? 'drop-shadow-halo' : ''}
      />
      <p className="text-center text-base">{featureText}</p>
    </Link>
  );
};

const FlexibleFeatureSelection: React.FC = () => {
  const { t } = useTranslation('common');

  const featureHeadRef = useRef<HTMLDivElement>(null);
  const featureFirstRef = useRef<HTMLDivElement>(null);

  const [isFeatureHeadRefVisible, setIsFeatureHeadRefVisible] = useState(false);
  const [isFeatureFirstRefVisible, setIsFeatureFirstRefVisible] = useState(false);

  const scrollHandler = () => {
    if (featureHeadRef.current) {
      const rect = (featureHeadRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsFeatureHeadRefVisible(rectTop < windowHeight);
    }

    if (featureFirstRef.current) {
      const rect = (featureFirstRef.current as HTMLElement).getBoundingClientRect();
      const rectTop = rect.top;
      const windowHeight = window.innerHeight;

      setIsFeatureFirstRefVisible(rectTop < windowHeight);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  // Info: (20241219 - Julian) 第一分類：主要功能
  const featuresOfFirstPart = [
    { title: 'Dashboard', link: ISUNFA_ROUTE.DASHBOARD },
    // { title: 'AI Assistant', link: '/' }, // ToDo: (20250106 - Julian) AI 助手先隱藏
    { title: 'Accounting System', link: ISUNFA_ROUTE.ADD_NEW_VOUCHER },
    { title: 'Asset Management', link: ISUNFA_ROUTE.ASSET_LIST },
    // { title: 'CRM', link: '/' }, // ToDo: (20250106 - Julian) 客戶關係管理先隱藏
    { title: 'Calendar', link: ISUNFA_ROUTE.TODO_LIST_PAGE },
    { title: 'Reports System', link: ISUNFA_ROUTE.TRIAL_BALANCE },
    // { title: 'Outsourcing Matching', link: '/' }, // ToDo: (20250106 - Julian) 平台媒合先隱藏
    // { title: 'Technical Support', link: '/' }, // ToDo: (20250106 - Julian) 技術支援先隱藏
    { title: 'Salary Calculator', link: ISUNFA_ROUTE.SALARY_CALCULATOR },
  ];

  // Info: (20241219 - Julian) 第二分類：金融相關功能
  // ToDo: (20250106 - Julian) 金融相關功能先隱藏
  // const featuresOfSecondPart = [
  //   { title: 'Financial Health Check', link: '/' },
  //   { title: 'Financial Auditing', link: '/' },
  //   { title: 'Audit System', link: '/' },
  // ];

  // Info: (20241219 - Julian) 第三分類：人事相關功能
  // ToDo: (20250106 - Julian) 人事相關功能先隱藏
  // const featuresOfThirdPart = [
  //   { title: 'HR Management', link: '/' },
  //   { title: 'Access Control', link: '/' },
  //   { title: 'Time and Attendance', link: '/' },
  //   { title: 'Leave Management', link: '/' },
  //   { title: 'Online Communication', link: '/' },
  //   { title: 'Project Management', link: '/' },
  //   { title: 'Contract Management', link: '/' },
  //   { title: 'Procurement Management', link: '/' },
  //   { title: 'Inventory Management', link: '/' },
  // ];

  // Info: (20241219 - Julian) 第四分類：銷售相關功能
  // ToDo: (20250106 - Julian) 銷售相關功能先隱藏
  // const featuresOfFourthPart = [
  //   { title: 'Sales Management', link: '/' },
  //   { title: 'POS', link: '/' },
  //   { title: 'Online Store', link: '/' },
  // ];

  // Info: (20241219 - Julian) 第五分類：製造相關功能
  // ToDo: (20250106 - Julian) 製造相關功能先隱藏
  // const featuresOfFifthPart = [
  //   { title: 'Manufacturing Management', link: '/' },
  //   { title: 'Supply Chain Management', link: '/' },
  // ];

  return (
    <div
      ref={featureHeadRef}
      className="flex flex-col gap-120px px-16px py-120px md:px-80px lg:px-112px"
    >
      {/* Info: (20241219 - Julian) Title */}
      <LinearGradientText
        size={LinearTextSize.LG}
        align={TextAlign.CENTER}
        className={`${
          isFeatureHeadRefVisible ? 'translate-y-0 opacity-100' : '-translate-y-200px opacity-0'
        } transition-all duration-500`}
      >
        {t('landing_page_v2:FLEXIBLE_FEATURE_SELECTION.MAIN_TITLE')}
      </LinearGradientText>

      {/* Info: (20241219 - Julian) Features of First Part */}
      <div
        ref={featureFirstRef}
        className={`${
          isFeatureFirstRefVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } grid grid-cols-2 gap-34px transition-all duration-500 md:grid-cols-3 lg:grid-cols-5`}
      >
        {featuresOfFirstPart.map((feature) => (
          <FlexibleFeatureIcon key={feature.title} feature={feature.title} link={feature.link} />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Features of Second Part */}
      {/* <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfSecondPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} size={160} halo />
        ))}
      </div> */}

      {/* Info: (20241219 - Julian) Features of Third Part */}
      {/* <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfThirdPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div> */}

      {/* Info: (20241219 - Julian) Features of Fourth Part */}
      {/* <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfFourthPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div> */}

      {/* Info: (20241219 - Julian) Features of Fifth Part */}
      {/* <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfFifthPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div> */}

      {/* Info: (20241219 - Julian) Make a Wish Link */}
      {/* Info: (20241219 - Julian) 先隱藏 */}
      <Link href="/" className="hidden w-fit">
        <LandingButton className="p-20px">
          <LuBellPlus size={24} />
          <p className="text-base font-bold">
            {t('landing_page_v2:FLEXIBLE_FEATURE_SELECTION.MAKE_A_WISH')}
          </p>
        </LandingButton>
      </Link>
    </div>
  );
};

export default FlexibleFeatureSelection;
