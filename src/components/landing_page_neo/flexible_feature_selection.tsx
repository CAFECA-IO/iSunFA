import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_neo/landing_button';
import { LuBellPlus } from 'react-icons/lu';

const FlexibleFeatureIcon: React.FC<{ feature: string; size?: number; halo?: boolean }> = ({
  feature,
  size = 120,
  halo = false,
}) => {
  const imageSrc = `/flexible_feature/${feature.toLowerCase().replaceAll(' ', '_')}.svg`;
  const imageAlt = `${feature}_icon`;

  return (
    <div className="flex w-120px flex-col items-center justify-center gap-16px justify-self-center md:h-160px md:w-180px">
      <Image
        src={imageSrc}
        width={size}
        height={size}
        alt={imageAlt}
        className={halo ? 'drop-shadow-halo' : ''}
      />
      <p className="text-center text-base">{feature}</p>
    </div>
  );
};

const FlexibleFeatureSelection: React.FC = () => {
  // Info: (20241219 - Julian) 第一分類
  const featuresOfFirstPart = [
    'Dashboard',
    'AI Assistant',
    'Accounting System',
    'Asset Management',
    'CRM',
    'Calendar',
    'Reports System',
    'Outsourcing Matching',
    'Technical Support',
  ];

  // Info: (20241219 - Julian) 第二分類
  const featuresOfSecondPart = ['Financial Health Check', 'Financial Auditing', 'Audit System'];

  // Info: (20241219 - Julian) 第三分類
  const featuresOfThirdPart = [
    'HR Management',
    'Access Control',
    'Time and Attendance',
    'Leave Management',
    'Online Communication',
    'Project Management',
    'Contract Management',
    'Procurement Management',
    'Inventory Management',
  ];

  // Info: (20241219 - Julian) 第四分類
  const featuresOfFourthPart = ['Sales Management', 'POS', 'Online Store'];

  // Info: (20241219 - Julian) 第五分類
  const featuresOfFifthPart = ['Manufacturing Management', 'Supply Chain Management'];

  return (
    <div className="flex flex-col gap-120px px-16px py-120px md:px-80px lg:px-112px">
      {/* Info: (20241219 - Julian) Title */}
      <LinearGradientText size={LinearTextSize.LG} align={TextAlign.CENTER}>
        Flexible Feature Selection
      </LinearGradientText>

      {/* Info: (20241219 - Julian) Features of First Part */}
      <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfFirstPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Features of Second Part */}
      <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfSecondPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} size={160} halo />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Features of Third Part */}
      <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfThirdPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Features of Fourth Part */}
      <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfFourthPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Features of Fifth Part */}
      <div className="grid grid-cols-2 gap-34px md:grid-cols-3 lg:grid-cols-5">
        {featuresOfFifthPart.map((feature) => (
          <FlexibleFeatureIcon key={feature} feature={feature} />
        ))}
      </div>

      {/* Info: (20241219 - Julian) Make a Wish Link */}
      {/* Info: (20241219 - Julian) 先隱藏 */}
      <Link href="/" className="hidden w-fit">
        <LandingButton className="p-20px">
          <LuBellPlus size={24} />
          <p className="text-base font-bold">Make a Wish</p>
        </LandingButton>
      </Link>
    </div>
  );
};

export default FlexibleFeatureSelection;
