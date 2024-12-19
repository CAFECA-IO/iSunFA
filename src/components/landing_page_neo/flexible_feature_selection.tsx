import React from 'react';
import Image from 'next/image';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';

const FlexibleFeatureIcon: React.FC<{ feature: string }> = ({ feature }) => {
  const imageSrc = `/flexible_feature/${feature.toLowerCase().replace(' ', '_')}.svg`;
  const imageAlt = `${feature}_icon`;

  return (
    <div className="flex w-120px flex-col items-center justify-center gap-16px justify-self-center md:h-160px md:w-180px">
      <Image src={imageSrc} width={120} height={120} alt={imageAlt} />
      <p className="lg:text-base">{feature}</p>
    </div>
  );
};

const FlexibleFeatureSelection: React.FC = () => {
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
    </div>
  );
};

export default FlexibleFeatureSelection;
