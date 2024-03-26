import ContactForm from '../contact_form/contact_form';
import LandingFooter from '../landing_footer/landing_footer';
import HowWeWork from '../how_we_work/how_we_work';
import CTASection from '../cta_section/cta_section';
import NumberAnimationSection from '../number_animation_section/number_animation_section';
import FeatureSection from '../feature_section/feature_section';
import CarouselSection from '../carousel_section/carousel_section';
import WhyISunFASection from '../why_isunfa_section/why_isunfa_section';
import PartnersSection from '../partners_section/partners_section';

function LandingPageBody() {
  return (
    <div className="">
      <div className="flex min-h-screen w-screen flex-col bg-secondaryBlue font-barlow">
        <div className="relative flex flex-col items-center lg:h-1000px">
          {/* Info: web background image (20240318 - Shirley) */}
          <div className="absolute right-0 top-22rem flex aspect-1/1 w-120vw flex-col items-center bg-web bg-cover bg-center bg-no-repeat md:aspect-4/3 md:w-80vw lg:top-0 lg:w-1400px lg:bg-cover lg:bg-top-4">
            {' '}
            <div className="absolute -bottom-2 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
            {/* Info: WI: shadow_01 svg */}
            <div className="absolute -bottom-0 left-0 flex aspect-21/9 w-full bg-customGradient bg-cover bg-no-repeat"></div>
          </div>
          {/* <div className="bg-background_pattern absolute right-0 top-0 flex h-screen w-screen flex-col items-center bg-cover bg-center bg-no-repeat mix-blend-screen lg:bg-cover lg:bg-top-4"></div> */}
          {/* Info: --- light_up svg --- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            <div className="absolute right-0 top-0 h-1800px w-700px bg-light_up bg-no-repeat bg-blend-color-dodge lg:w-900px"></div>
          </div>
          {/* Info: --- light_up svg --- (20240318 - Shirley) */}
          {/* Info: --- light_down svg --- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-screen">
            {' '}
            <div className="bottomShadow absolute -left-1/10 top-1/5 z-0 aspect-4/3 w-60vw bg-light_down bg-contain bg-no-repeat bg-blend-color-dodge shadow-md md:-top-1/5 md:h-1800px lg:-top-1/3 lg:w-1400px"></div>
          </div>
          {/* Info: --- light_down svg --- (20240318 - Shirley) */}
          {/* Info: --- green_light_left svg --- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            {' '}
            <div className="absolute -right-0 top-0 h-600px w-700px bg-green_light_left bg-contain bg-no-repeat bg-blend-color-dodge md:top-0 lg:top-1/3 lg:h-1200px lg:w-1400px"></div>
          </div>
          {/* Info: --- green_light_left svg --- (20240318 - Shirley) */}

          {/* Info: --- green_light_right svg --- (20240318 - Shirley) */}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute right-0 top-0 h-600px w-700px bg-green_light_right bg-contain bg-no-repeat bg-blend-color-dodge md:top-0 lg:top-20 lg:h-1200px lg:w-1400px"></div>
          </div>
          {/* Info: --- green_light_right svg --- (20240318 - Shirley) */}
          {/* Info:(20230711 - Shirley) Main Title Block */}

          {/* Info: --- iSunFA CTA section --- (20240319 - SHirley) */}
          <CTASection />
          {/* Info: --- iSunFA CTA section --- (20240319 - SHirley) */}
        </div>

        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}
        {/* Info: 光線 svg 只在桌面版顯示 (20240326 - Shirley) */}
        <div className="relative hidden lg:block">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute right-0 top-0 aspect-0.87 w-1400px bg-light_01 bg-no-repeat bg-blend-color-dodge"></div>
          </div>
        </div>
        {/* Info: ----- light_01 svg ----- (20240318 - Shirley) */}

        {/* Info: --- How we work section --- (20240326 - Shirley)  */}
        <HowWeWork />

        {/* Info: --- How we work section --- (20240326 - Shirley)  */}

        {/* Info: --- Number animation section --- (20240315 - Shirley)  */}
        <NumberAnimationSection />
        {/* Info: --- Number animation section --- (20240315 - Shirley)  */}

        {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}
        {/* Info: 光線 svg 只在桌面版顯示 (20240326 - Shirley) */}
        <div className="relative hidden lg:block">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -top-20 left-0 h-1400px w-full bg-light_02 bg-no-repeat bg-blend-color-dodge md:w-1200px"></div>
          </div>
        </div>
        {/* Info: ----- light_02 svg ----- (20240318 - Shirley) */}

        {/* Info: --- Features section --- (20240315 - Shirley) */}
        <FeatureSection />
        {/* Info: --- Features section --- (20240315 - Shirley) */}

        <div>
          {/* Info: ----- light_03 svg ----- (20240318 - Shirley) */}
          {/* Info: 光線 svg 只在桌面版顯示 (20240326 - Shirley) */}
          <div className="relative hidden lg:block">
            {' '}
            <div className="absolute h-screen w-screen mix-blend-color-dodge">
              <div className="absolute -top-0 right-0 aspect-0.87 w-1400px bg-light_03 bg-no-repeat bg-blend-color-dodge"></div>
            </div>
          </div>
          {/* Info: ----- light_03 svg ----- (20240318 - Shirley) */}

          {/* Info: ----- Partners section (20240318 - Shirley) ----- */}
          <PartnersSection />
          {/* Info: ----- Partners section (20240318 - Shirley) ----- */}

          {/* Info: ----- Carousel section (20240318 - Shirley) ----- */}
          <CarouselSection />
          {/* Info: ----- Carousel section (20240318 - Shirley) ----- */}
        </div>

        {/* Info: ----- why iSunFA section (20240318 - Shirley) ----- */}
        <WhyISunFASection />
        {/* Info: ----- why iSunFA section (20240318 - Shirley) ----- */}

        {/* Info: ----- light_04 svg ----- (20240318 - Shirley) */}
        {/* Info: 光線 svg 只在桌面版顯示 (20240326 - Shirley) */}
        <div className="relative hidden lg:block">
          {' '}
          <div className="absolute h-screen w-screen mix-blend-color-dodge">
            <div className="absolute -left-20 -top-96rem aspect-0.87 h-1200px bg-light_04 bg-no-repeat bg-blend-color-dodge md:w-1400px lg:-top-24rem lg:left-0"></div>
          </div>
        </div>
        {/* Info: ----- light_04 svg ----- (20240318 - Shirley) */}

        {/* Info: ----- Contact form section ----- (20240318 - Shirley) */}
        <ContactForm />
        {/* Info: ----- Contact form section ----- (20240318 - Shirley) */}

        {/* Info:(20230711 - Shirley) Footer */}
        <div className="">
          <LandingFooter />
        </div>
      </div>
    </div>
  );
}

export default LandingPageBody;
