/* eslint-disable */
import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { useTranslation } from 'next-i18next';
import LandingFooter from '../landing_footer/landing_footer';
import { massiveDataContent, whyUsContent } from '../../constants/config';
import { TranslateFunction } from '../../interfaces/locale';
import NumberAnimation from '../number_animation/number_animation';
import Carousel from '../carousel/carousel';
import Card from '../card/card';

function LandingPageBody() {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const textSlides = Array.from({ length: 5 });

  const massiveDataList = massiveDataContent.map(({ icon, text, alt }, index) => (
    // Info: (20240112 - Shirley) it's ok to use index as key in this case
    // eslint-disable-next-line react/no-array-index-key
    <div key={index} className="flex flex-col items-center space-y-4 px-4">
      <div className="relative h-50px w-50px">
        <Image src={icon} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>
      <p className="text-base font-normal lg:text-lg">{t(text)}</p>
    </div>
  ));

  const numberBlockContent = [
    {
      image: '/elements/lightening_1.png',
      alt: 'lighting_1',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_1',
      targetNumber: 150,
      unit: 'X',
    },
    {
      image: '/elements/clock.png',
      alt: 'clock',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_2',
      targetNumber: 85,
      unit: '%',
    },
    {
      image: '/elements/robot_hand.png',
      alt: 'robot_hand',
      description: 'LANDING_PAGE.NUMBER_BLOCK_DESCRIPTION_3',
      targetNumber: 24,
      unit: 'hrs',
    },
  ];

  const numberBlockList = numberBlockContent.map(
    ({ image, alt, description, targetNumber, unit }, index) => (
      <div
        // Info: (20240112 - Shirley) it's ok to use index as key in this case
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className="relative z-10 mx-0 flex h-300px flex-col items-center space-y-14 rounded-2xl bg-tertiaryBlue px-10 py-10 drop-shadow-101"
      >
        {/* Info:(20230815 - Shirley) Image */}
        <div className="absolute -top-10 h-100px w-100px " style={{}}>
          <Image
            className="drop-shadow-xlReverse"
            src={image}
            alt={alt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
          />
          <div className="shadow-md shadow-black"></div>
        </div>
        {/* Info:(20240315 - Shirley) Number animation */}
        {/* <div className="h-80px" /> */}

        {/* Info:(20240315 - Shirley) Number animation */}
        <div className="flex w-full items-baseline justify-center space-x-2 font-bold">
          {' '}
          <NumberAnimation targetNumber={targetNumber} />
          <p className="text-h4 leading-h4">{unit}</p>
        </div>

        {/* Info:(20240315 - Shirley) Description */}
        <div className="pt-0">
          {' '}
          <p className="w-240px text-start text-base">{t(description)}</p>
        </div>
      </div>
    )
  );

  const heroDescriptions = [
    {
      image: '/elements/bulb.svg',
      alt: 'bulb icon',
      title: 'LANDING_PAGE.HERO_TITLE_1',
      description: 'LANDING_PAGE.HERO_CONTENT_1',
    },
    {
      image: '/elements/server.svg',
      alt: 'server icon',
      title: 'LANDING_PAGE.HERO_TITLE_2',
      description: 'LANDING_PAGE.HERO_CONTENT_2',
    },
    {
      image: '/elements/shield.svg',
      alt: 'shield icon',
      title: 'LANDING_PAGE.HERO_TITLE_3',
      description: 'LANDING_PAGE.HERO_CONTENT_3',
    },
  ];

  const heroList = heroDescriptions.map(({ image, alt, description, title }, index) => (
    // TODO: (20240112 - Shirley) temp solution
    // eslint-disable-next-line react/no-array-index-key
    <div key={index} className="flex flex-col items-center space-y-6 text-center">
      <div className="relative h-80px w-80px">
        <Image src={image} alt={alt} fill style={{ objectFit: 'contain' }} />
      </div>

      <p className="text-h5 leading-h5 text-primaryYellow">{t(title)}</p>

      <p className="text-base text-white">{t(description)}</p>
    </div>
  ));

  const verticalDotLine = (
    <>
      {/* eslint-disable */}
      {/* dashed vertical line */}

      {/* <div className={`ml-12 h-10 w-1px border-0.5px border-dashed border-gray-50`} /> */}

      <div className="relative h-500px">
        {/* ----- Dot & Line components ----- */}
        <div className="flex items-center rounded-lg px-12 pt-10 ">
          {/* ----- filled circle ----- */}
          <div
            className={`absolute left-1.8rem z-10 h-27px w-27px rounded-full bg-primaryYellow`}
          ></div>

          {/* ----- filled circle bg ----- */}
          <div className={`absolute left-1.4rem h-40px w-40px rounded-full bg-tertiaryBlue`}></div>

          {/* ----- Line ----- */}
          <div
            className={`absolute left-2.3rem top-5 h-400px w-1px border-5px border-solid border-tertiaryBlue`}
          />

          {/* <span className="ml-2.5rem space-y-2">
            <div className="font-bold text-base">title</div>
            <div className="text-gray-750 text-xs font-normal leading-5 tracking-normal">
              content
            </div>
          </span> */}
        </div>
      </div>
    </>
  );

  const carouselItems = [
    {
      title: 'Efficient Peer-to-Peer Network Architecture',
      content:
        'Through a bio-inspired routing model and role-based mechanism, we develop a highly efficient peer-to-peer network architecture. This system enables fast communication and protocol execution, supporting a blockchain system operating near traditional database efficiency. This ensures seamless handling of vast access requests from zero-knowledge bookkeeping (zk-bookkeeping) while minimizing data tampering risks.',
    },
    {
      title: 'Decentralized Identity Verification',
      content:
        'We authenticate user identity using elliptic curve digital signature technology. Users provide proof of identity, validity period, purpose, and supplementary information, generating a time-limited and authorized identity certificate using a designated private key. This independent verification process ensures each zero-knowledge bookkeeping entry is endorsed by professionals or enterprises, deterring errors in bookkeeping.',
    },
    {
      title: 'ZK- Proof Blockchain Preservation of Evidence',
      content:
        'Our method transforms data into matrix format, incorporating noise data and performing coordinate axis rotations. This process creates verifiable metadata consistent with the original data but cannot be reversed to obtain the original data.',
    },
    {
      title:
        'Real-Time Generation of Accounting Reports Based on ZK- Proof Blockchain Preservation of Evidence',
      content:
        'By embedding difference value metadata of accounting reports into the noise injection process, we achieve zero-knowledge bookkeeping. This enables real-time generation of accounting reports, including reporting period, list of included metadata, and environmental parameters like exchange rates, based on zero-knowledge blockchain certification.',
    },
    {
      title: 'Audit Method Based on ZK- Proof Blockchain Preservation of Evidence',
      content:
        'Using specific algorithms, audits are swiftly conducted to verify the existence, order, and accuracy of metadata in accounting reports. The zero-knowledge proof method confirms metadata authenticity and consistency with the blockchain. This ensures an efficient audit method based on zero-knowledge blockchain certification.',
    },
  ];

  return (
    <div>
      {/* Info: NOTE mix-blend-exclusion, mix-blend-lighten, mix-blend-plus-lighter, mix-blend-screen */}
      {/* <div className="absolute top-0 right-0 flex h-140vh w-full flex-col items-center bg-light_up mix-blend-screen bg-auto bg-center bg-no-repeat lg:bg-auto lg:bg-top-4" /> */}

      <div className="flex min-h-screen w-screen flex-col overflow-hidden bg-secondaryBlue font-barlow">
        {/* Info:(20230815 - Shirley) Pipe Background Image */}
        {/* <div
        className="absolute inset-0 bg-light_up bg-auto bg-center bg-no-repeat lg:bg-cover lg:bg-top-4"
        style={{
          maskImage: "url('/elements/mask.svg')",
          maskSize: 'cover',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      /> */}
        {/* <div className="relative flex h-140vh w-full flex-col items-center bg-mask bg-auto bg-center bg-no-repeat lg:bg-cover lg:bg-top-4"> */}
        {/* TODO: make this bg-light_up fixed at the top-right corner responsively */}
        {/* <div className="flex flex-col justify-center mix-blend-screen max-w-[950px]">
          <img
            loading="lazy"
            srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&"
            className="w-full bg-blend-screen mix-blend-screen aspect-[1.54] fill-[radial-gradient(86.31%_87.08%_at_18.22%_91.72%,#FFA502_0%,#F49E01_1%,#C17D01_9%,#935F01_17%,#6B4500_26%,#4A3000_34%,#2F1E00_44%,#1A1000_54%,#0B0700_65%,#020100_79%,#000_100%)] max-md:max-w-full"
          />
        </div> */}

        {/* <img
          loading="lazy"
          srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/b599a051-ca21-4adf-abeb-05bea5efc568?apiKey=0e17b0b875f041659e186639705112b1&"
          className="w-full bg-blend-screen aspect-[1.54] fill-[radial-gradient(86.31%_87.08%_at_18.22%_91.72%,#FFA502_0%,#F49E01_1%,#C17D01_9%,#935F01_17%,#6B4500_26%,#4A3000_34%,#2F1E00_44%,#1A1000_54%,#0B0700_65%,#020100_79%,#000_100%)] max-md:max-w-full"
        /> */}

        {/* FIXME: it works but should overlay more vectors? */}
        {/* <div className="relative w-screen h-screen mix-blend-screen">
          <div className="absolute w-[700px] h-[620px] top-0 right-0">
            <img
              className="w-[401px] h-[339px] bg-blend-color-dodge"
              alt="Vector"
              src="/elements/light_up.svg"
          </div>
        </div>

        <div className="relative w-[1440px] h-[6764px]">
          <div className="absolute w-[1440px] h-[1687px] top-[5285px] left-0">
            <img
              className="absolute w-[1440px] h-[1115px] top-[572px] left-0"
              alt="Shadow"
              src="shadow-02.svg"
            />
            <img
              className="absolute w-[1440px] h-[820px] top-0 left-0"
              alt="Light"
              src="light-04.svg"
            />
          </div>
          <img
            className="absolute w-[1440px] h-[1163px] top-[3500px] left-0"
            alt="Light"
            src="light-03.svg"
          />
          <div className="absolute w-[1440px] h-[3404px] top-0 left-0">
            <img
              className="absolute w-[1440px] h-[1131px] top-[2273px] left-0"
              alt="Light"
              src="light-02.svg"
            />
            <img
              className="absolute w-[1440px] h-[1148px] top-[1370px] left-0"
              alt="Light"
              src="light-01.svg"
            />
            <img
              className="absolute w-[1440px] h-[1112px] top-0 left-0 mix-blend-screen"
              alt="Web"
              src="web.svg"
            />
            <div className="absolute w-[1432px] h-[1227px] top-[4px] left-0">
              <div className="relative h-[1131px] top-[-4px] [background:linear-gradient(180deg,rgba(0,24,64,0)_32.5%,rgb(0,24,64)_85.5%)]">
                <img
                  className="absolute w-[856px] h-[1079px] top-0 left-0 bg-blend-color-dodge"
                  alt="Shadow"
                  src="shadow.svg"
                />
              </div>
            </div>
            <img
              className="absolute w-[1440px] h-[1267px] top-[193px] left-0"
              alt="Green light"
              src="green-light.svg"
            />
            <img
              className="absolute w-[1440px] h-[1089px] top-[313px] left-0 mix-blend-screen"
              alt="Light down"
              src="light-down.png"
            />
            <img
              className="absolute w-[1440px] h-[620px] top-0 left-0 mix-blend-screen"
              alt="Light up"
              src="light-up.svg"
            />
          </div>
        </div> */}

        {/* FIXME: It works! */}
        {/* <div className="relative">
          {' '}
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/bcbc01dc26ea922042dd2a656788155f0479259a2ef18bd8fd2f0c44d075fd67?apiKey=0e17b0b875f041659e186639705112b1&"
            className="w-full bg-blend-screen mix-blend-screen aspect-[0.36] fill-[radial-gradient(50.34%_49.91%_at_49.96%_51.15%,#008669_0%,#00765C_11%,#00211A_72%,#000_100%)]"
          />
        </div> */}

        {/* <div className="absolute -top-40 -right-56 flex h-140vh w-full flex-col items-center bg-light_up mix-blend-exclusion bg-auto bg-center bg-no-repeat lg:bg-auto " /> */}
        <div className="relative flex h-140vh w-screen flex-col items-center bg-web bg-contain bg-center bg-no-repeat lg:bg-cover lg:bg-top-4">
          {/* Info: ---light_up svg--- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            <div className="absolute right-0 top-0 h-500px w-900px bg-light_up bg-blend-color-dodge">
              {/* <img
                className="w-[401px] h-[339px] bg-blend-color-dodge"
                alt="Vector"
                src="/elements/light_up.svg"
              /> */}
              {/* <img
              className="w-[950px] h-[620px] left-0 bg-blend-screen absolute top-0"
              alt="Vector"
              src="vector.svg"
            /> */}
            </div>
          </div>
          {/* <div className="relative flex h-140vh w-full flex-col items-center bg-light_up mix-blend-screen bg-auto bg-center bg-no-repeat lg:bg-auto lg:bg-top-4" /> */}

          {/* Info:(20230711 - Shirley) Main Title Block */}
          <div className="z-5 ml-40 flex h-screen w-full flex-col items-start justify-center space-y-10 px-4 py-12 text-start">
            <div className="flex flex-col space-y-5">
              {' '}
              <h1 className="text-6xl font-bold tracking-wider text-primaryYellow lg:text-7xl">
                {t('LANDING_PAGE.MAIN_TITLE')}
              </h1>
              <h1 className="text-2xl font-bold tracking-widest text-hoverWhite lg:text-6xl">
                {t('LANDING_PAGE.MAIN_SUBTITLE_1')}
              </h1>
            </div>
            <div className="max-w-md text-base font-bold tracking-widest text-hoverWhite tablet:max-w-xl lg:text-base desktop:max-w-2xl">
              <p>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_1')}</p>
              <p>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_2')}</p>
              <p>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_3')}</p>
              <p>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_4')}</p>
              <p>{t('LANDING_PAGE.MAIN_SUBTITLE_2_POINT_5')}</p>
            </div>

            {/* Info:(20230711 - Shirley) Arrow */}
            {/* <Link href="#iSunFA_101" scroll={false} className="absolute bottom-80 lg:bottom-20">
              <Image src="/animations/arrow_down.gif" alt="scroll arrow" width={50} height={50} />
            </Link> */}

            <button
              className="flex items-center space-x-2 rounded-lg bg-primaryYellow px-6 py-3 font-bold text-tertiaryBlue"
              type="button"
            >
              <p className="">Try Now</p>
              <Image src="/elements/arrow.svg" width={20} height={20} alt="arrow_right" />
            </button>
          </div>
        </div>
        {/* </div> */}
        {/* </div> */}

        {/* Info:(20230815 - Shirley) How we work */}

        <div className="flex h-fit w-full flex-col py-20 lg:pb-20 lg:pt-52">
          <h1 className="flex w-full justify-center text-h1 font-bold tracking-wider text-white lg:text-h1">
            {/* FIXME: i18n */}
            How we work
          </h1>
          <div className="flex">
            <div className="relative ml-1/8 pt-40">
              {' '}
              {/* <div> */}
              <div className="flex flex-col justify-center">{verticalDotLine}</div>{' '}
              <div className="-mt-6.2rem flex flex-col justify-center">{verticalDotLine}</div>
              <div className="-mt-6.2rem flex flex-col justify-center">{verticalDotLine}</div>
            </div>
            {/* </div> */}

            {/* <div className="relative pt-40">
              {' '}
              <div>
                <div className="ml-1/6 flex flex-col justify-center">{verticalDotLine}</div>{' '}
                <div className="absolute h-1/2 w-1/2 top-48 left-56">
                  <Image
                    src="/elements/how_we_work_1.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div> */}

            <div className="mt-44 flex flex-col space-y-32">
              <div className="mr-10 flex space-x-2">
                <div className="relative h-300px w-600px">
                  <Image
                    src="/elements/how_we_work_1.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_1')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_1')}
                  </p>
                </div>
              </div>

              <div className="mr-10 flex space-x-2">
                <div className="relative h-300px w-600px">
                  <Image
                    src="/elements/how_we_work_2.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_2')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_2')}
                  </p>
                </div>
              </div>

              <div className="mr-10 flex space-x-2">
                <div className="relative h-300px w-600px">
                  <Image
                    src="/elements/how_we_work_3.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-20 flex max-w-lg flex-col space-y-5 lg:mt-20 lg:space-y-8">
                  {' '}
                  <p className="text-h3 leading-h3 text-primaryYellow lg:text-h1 lg:leading-h1">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_TITLE_3')}
                  </p>
                  <p className="text-base text-white">
                    {t('LANDING_PAGE.PRIVACY_BLOCK_CONTENT_3')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* <div>
            <div className="ml-1/6 flex flex-col justify-center">{verticalDotLine}</div>{' '}
            <div className="absolute h-1/2 w-1/2 top-96 left-56">
              <Image
                src="/elements/how_we_work_2.png"
                alt="how we work"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div> */}

          {/* <div>
            {' '}
            <div className="relative h-full w-full bg-gray-300">
              <div className="absolute top-1/3 left-0 w-1 h-1 bg-blue-500"></div>
              <div className="absolute top-2/3 left-0 w-1 h-1 bg-blue-500"></div>
              <div className="absolute top-3/3 left-0 w-1 h-1 bg-blue-500"></div>
            </div>
          </div> */}
          {/* <div id="iSunFA_101" className="w-full py-0 lg:px-0 lg:py-120px">
            <div
              // style={{ minHeight: '500px', borderRadius: '25px' }}
              className="flex flex-col items-center space-y-10 bg-101 bg-cover bg-center bg-no-repeat px-5 py-28 drop-shadow-101 lg:min-h-500px min-h-200px lg:flex-row lg:space-x-20 lg:space-y-0 lg:py-20 lg:px-28 xl:px-40"
            >
              <div className="flex h-full flex-col items-center space-y-5 lg:space-y-10 whitespace-nowrap lg:w-1/2 lg:items-start">
                <h2 className="text-32px font-bold lg:text-6xl">
                  {t('LANDING_PAGE.iSunFA_101_TITLE')}:
                </h2>
                <div className="w-fit rounded-xl bg-primaryYellow px-5 py-10px text-lg text-secondaryBlue font-bold">
                  {t('LANDING_PAGE.iSunFA_101_SUBTITLE')}
                </div>
              </div>
              <div className="lg:w-2/3">
                <p className="text-base lg:text-xl">{t('LANDING_PAGE.iSunFA_101_CONTENT')}</p>
              </div>
            </div>
          </div> */}

          {/* Info: (20240315 - Shirley) Blocks with number animation */}
          <div
            // ref={scrl}
            className="mt-20 flex flex-col items-center space-y-28 scroll-smooth px-4 lg:w-full lg:flex-row lg:justify-evenly lg:space-x-14 lg:space-y-0 lg:overflow-x-auto lg:px-40 lg:py-20"

            // className="flex flex-col items-center space-y-28 scroll-smooth px-4 lg:flex-row lg:space-x-10 lg:space-y-0 lg:overflow-x-auto lg:px-40 lg:py-20"
          >
            {numberBlockList}

            {/* Info:(20240308 - Shirley) background img */}
            {/* <div className="absolute -right-20 top-48 h-255px w-900px rounded-2xl bg-101 bg-cover bg-no-repeat hidden lg:block" /> */}
          </div>

          {/* Info:(20240315 - Shirley) Features Block */}
          <div className="mt-20 flex flex-col items-center space-y-16 px-4 pt-20 text-center lg:mb-40 lg:h-450px lg:px-20 lg:py-20">
            <div className="flex flex-col">
              <h3 className="text-h1 font-bold leading-h1 text-white">
                {t('LANDING_PAGE.FEATURES_SUBTITLE')}
              </h3>
              {/* <h2 className="text-2xl font-bold lg:text-5xl">{t('LANDING_PAGE.FEATURES_TITLE')}</h2> */}
            </div>
            {/* container mx-auto pl-1/2 */}
            <div className="flex justify-center pr-1/10">
              {/* flex */}
              <div className="relative">
                <div className="relative h-515px w-865px">
                  <Image
                    src="/elements/mac.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                <div className="relative bottom-19rem left-32rem h-300px w-432px">
                  <Image
                    src="/elements/ipad.png"
                    alt="how we work"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>

            {/* <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">{massiveDataList}</div> */}
          </div>

          <div className="mx-20 mb-40 grid grid-cols-1 gap-20 lg:mx-40 lg:mt-40 lg:flex-1 lg:grid-cols-3 lg:gap-10">
            {heroList}
          </div>

          <div className="flex w-full justify-center space-x-5">
            <div className="relative mt-20 h-400px w-400px">
              <Image
                src="/elements/contract_blue.svg"
                alt="contract_blue"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>{' '}
            {/* <div className="flex flex-col">
              <p>Technical Patents</p> */}
            <div className="max-w-[700px]">
              {' '}
              {/* autoSlide */}
              <Carousel autoSlide>
                {/* {slides.map((slide, i) => (
            <img
              key={i}
              src={slide}
              alt={`slide-${i}`}
              // style={{ width: "100%" }}
              // className="max-w-[500px]"
            />
          ))} */}
                {carouselItems.map(({ title, content }, i) => (
                  <Card key={i} title={title} content={content} />
                ))}
              </Carousel>
              {/* </div> */}
            </div>
          </div>

          {/* <div className="flex flex-col items-center space-y-16 px-4 py-20 text-center lg:h-450px lg:px-20">
            <div className="flex flex-col lg:flex-row space-x-5 h-500px">
              <div className="flex flex-col items-center space-y-10">
                <h2 className="text-2xl font-bold lg:text-5xl">test</h2>
                <p className="text-base lg:text-lg">content</p>
              </div>
            </div>
          </div>

          <div className="py-40">t</div> */}
        </div>

        {/* Info:(20230711 - Shirley) Footer */}
        <LandingFooter />
      </div>
    </div>
  );
}

export default LandingPageBody;
