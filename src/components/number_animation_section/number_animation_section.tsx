import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import NumberAnimation from '@/components/number_animation/number_animation';
import { TranslateFunction } from '@/interfaces/locale';
import { INTERVAL_NUMBER_ANIMATION } from '@/constants/display';

const NumberAnimationSection = () => {
  const { t }: { t: TranslateFunction } = useTranslation('landing_page');

  const numberBlockContent = [
    {
      image: '/elements/lightening_1.png',
      alt: 'lighting_1',
      description: 'landing_page:LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_1',
      targetNumber: 150,
      unit: 'X',
    },
    {
      image: '/elements/clock.png',
      alt: 'clock',
      description: 'landing_page:LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_2',
      targetNumber: 85,
      unit: '%',
    },
    {
      image: '/elements/robot_hand.png',
      alt: 'robot_hand',
      description: 'landing_page:LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_3',
      targetNumber: 24,
      unit: 'hrs',
    },
  ];

  const numberBlockList = numberBlockContent.map(
    ({ image, alt, description, targetNumber, unit }) => (
      <div
        key={description}
        className="relative z-10 mx-0 flex h-300px flex-col items-center space-y-14 rounded-2xl bg-navy-blue-400 py-10 lg:w-300px"
      >
        {/* Info:(20230815 - Shirley) Image */}
        <div className="absolute -top-10 h-100px w-100px">
          <Image
            className="drop-shadow-xlReverse"
            src={image}
            alt={alt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
          />
          <div className="relative left-0 top-7rem">
            <Image
              className=""
              src={`/elements/bottom_shadow.svg`}
              alt={alt}
              width={75}
              height={15}
            />
          </div>
        </div>

        {/* Info:(20240315 - Shirley) Number animation */}
        <div className="flex w-full items-baseline justify-center space-x-2 font-bold">
          <div className="flex">
            <NumberAnimation targetNumber={targetNumber} interval={INTERVAL_NUMBER_ANIMATION} />
          </div>
          <p className="text-h4 leading-h4">{unit}</p>
        </div>

        {/* Info:(20240315 - Shirley) Description */}
        <p className="w-300px px-5 text-start text-base lg:w-full">{t(description)}</p>
      </div>
    )
  );

  return (
    <div className="mt-48 flex flex-col items-center space-y-28 scroll-smooth px-4 md:mt-52 lg:w-full lg:flex-row lg:justify-evenly lg:space-x-14 lg:space-y-0 lg:overflow-x-auto lg:px-10 lg:py-20">
      {numberBlockList}
    </div>
  );
};

export default NumberAnimationSection;
