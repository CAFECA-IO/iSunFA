import { useEffect, useState } from 'react';
import HowWeWork from '@/components/how_we_work/how_we_work';
import CTASection from '@/components/cta_section/cta_section';
import NumberAnimationSection from '@/components/number_animation_section/number_animation_section';
import FeatureSection from '@/components/feature_section/feature_section';
import CarouselSection from '@/components/carousel_section/carousel_section';
import WhyISunFASection from '@/components/why_isunfa_section/why_isunfa_section';
// import PartnersSection from '@/components/partners_section/partners_section'; // Info: (20240515 - Luphia)
import ContactFormSection from '@/components/contact_form_section/contact_form_section';

function LandingPageBody() {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    function detectIsSafari() {
      return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }
    const bool = detectIsSafari();
    setIsSafari(bool);
    if (bool) {
      document.querySelectorAll('.mix-blend-color-dodge').forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.classList.remove('mix-blend-color-dodge');
        htmlElement.style.opacity = '0';
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen w-screen flex-col bg-navy-blue-600 font-barlow">
      <div className="relative flex flex-col items-center lg:h-1000px">
        {/* Info: (20240318 - Shirley) web background image */}
        <div className="absolute right-0 top-22rem flex aspect-1/1 w-120vw flex-col items-center bg-web bg-cover bg-center bg-no-repeat md:aspect-4/3 md:w-80vw lg:top-0 lg:w-1400px lg:bg-cover lg:bg-top-4">
          <div className="absolute -bottom-2 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
          {/* Info: (20240318 - Shirley) WI: shadow_01 svg */}
          <div className="absolute -bottom-0 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
        </div>

        {/* Info: (20240318 - Shirley) --- light_up svg --- */}
        <div className="absolute h-screen w-screen mix-blend-screen">
          <div className="absolute right-0 top-0 h-1800px w-700px bg-light_up bg-no-repeat bg-blend-color-dodge lg:w-900px"></div>
        </div>

        {/* Info: (20240318 - Shirley) --- light_down svg --- */}
        <div className={isSafari ? 'hidden' : 'absolute h-screen w-screen mix-blend-screen'}>
          <div className="bottomShadow absolute -left-1/10 top-1/5 z-0 w-60vw bg-light_down bg-contain bg-no-repeat bg-blend-color-dodge shadow-md md:-top-1/5 md:h-1800px lg:-top-1/3 lg:w-1400px"></div>
        </div>

        {/* Info: (20240318 - Shirley) --- green_light_left svg --- */}
        <div className="absolute h-screen w-screen mix-blend-color-dodge">
          <div className="absolute -right-0 top-0 h-600px w-700px bg-green_light_left bg-contain bg-no-repeat bg-blend-color-dodge lg:top-1/3 lg:h-1200px lg:w-1400px"></div>
        </div>

        {/* Info: (20240318 - Shirley) --- green_light_right svg --- */}
        <div className="absolute h-screen w-screen mix-blend-color-dodge">
          <div className="absolute right-0 top-0 h-600px w-700px bg-green_light_right bg-contain bg-no-repeat bg-blend-color-dodge lg:top-20 lg:h-1200px lg:w-1400px"></div>
        </div>

        {/* Info: (20240319 - SHirley) --- iSunFA CTA section --- */}
        <CTASection />
      </div>

      {/* Info: (20240318 - Shirley) ----- light_01 svg ----- */}
      {/* Info: (20240326 - Shirley) 光線 svg 只在桌面版顯示 */}
      <div className="relative hidden lg:block">
        {' '}
        <div className="absolute h-screen w-screen mix-blend-color-dodge">
          <div className="absolute right-0 top-0 aspect-0.87 w-1400px bg-light_01 bg-no-repeat bg-blend-color-dodge"></div>
        </div>
      </div>

      {/* Info: (20240326 - Shirley) --- How we work section --- */}
      <div id="about">
        <HowWeWork />
      </div>

      {/* Info: (20240315 - Shirley) --- Number animation section --- */}
      <NumberAnimationSection />

      {/* Info: (20240318 - Shirley) ----- light_02 svg ----- */}
      {/* Info: (20240326 - Shirley) 光線 svg 只在桌面版顯示 */}
      <div className="relative hidden lg:block">
        <div className="absolute h-screen w-screen mix-blend-color-dodge">
          <div className="absolute -top-20 left-0 h-1400px w-full bg-light_02 bg-no-repeat bg-blend-color-dodge md:w-1200px"></div>
        </div>
      </div>

      {/* Info: (20240315 - Shirley) --- Features section --- */}
      <div id="features">
        <FeatureSection />
      </div>

      <div>
        {/* Info: (20240318 - Shirley) ----- light_03 svg ----- */}
        {/* Info: (20240326 - Shirley) 光線 svg 只在桌面版顯示 */}
        <div className="relative hidden lg:block">
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -top-0 right-0 aspect-0.87 w-1400px bg-light_03 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>

        {/* Info: (20240318 - Shirley) ----- Partners section ----- */}
        {/* <PartnersSection /> */}

        {/* Info: (20240318 - Shirley) ----- Carousel section ----- */}
        <CarouselSection />
      </div>

      {/* Info: (20240318 - Shirley) ----- why iSunFA section ----- */}
      <div className="md:h-1200px lg:h-1000px">
        <WhyISunFASection />
      </div>

      {/* Info: (20240318 - Shirley) ----- light_04 svg ----- */}
      {/* Info: (20240326 - Shirley) 光線 svg 只在桌面版顯示 */}
      <div className="relative hidden lg:block">
        {' '}
        <div className="absolute h-screen w-screen mix-blend-color-dodge">
          <div className="absolute -left-20 -top-96rem aspect-0.87 h-1200px bg-light_04 bg-no-repeat bg-blend-color-dodge md:w-1400px lg:-top-24rem lg:left-0"></div>
        </div>
      </div>

      {/* Info: (20240318 - Shirley) ----- Contact form section ----- */}
      <ContactFormSection />
    </div>
  );
}

export default LandingPageBody;
