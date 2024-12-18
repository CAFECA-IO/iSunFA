import React from 'react';
import Image from 'next/image';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_neo/linear_gradient_text';

const GlobalMap: React.FC = () => {
  return (
    <div className="flex flex-col px-16px py-120px md:px-80px lg:px-100px">
      <div className="flex flex-col gap-16px">
        <LinearGradientText size={LinearTextSize.LG} align={TextAlign.LEFT}>
          Suitable for Local Businesses to <br />
          Multinational Corporations
        </LinearGradientText>
        <p className="text-xs font-medium md:text-lg lg:text-xl">
          Countries/Regions Providing iSunFA Accounting Platform Services
        </p>
      </div>

      <div className="relative flex h-300px w-full items-center lg:h-700px">
        <Image src="/elements/map.svg" fill objectFit="contain" alt="map" />
        <p className="absolute right-1/5 -mt-10px text-xxs md:right-1/8 md:-mt-30px md:text-base">
          COMING SOON
        </p>
      </div>
    </div>
  );
};

export default GlobalMap;
