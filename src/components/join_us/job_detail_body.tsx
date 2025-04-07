import React from 'react';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import LandingFooter from '@/components/landing_page_v2/landing_footer';
import ScrollToTopButton from '@/components/landing_page_v2/scroll_to_top';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { IJobDetail } from '@/interfaces/job';
import { timestampToString } from '@/lib/utils/common';

interface IJobDetailBodyProps {
  jobData: IJobDetail;
}

const JobDetailBody: React.FC<IJobDetailBodyProps> = ({ jobData }) => {
  const { title, location, date, description, jobResponsibilities, requirements, extraSkills } =
    jobData;
  const dateString = timestampToString(date).dateWithSlash;

  const resList = jobResponsibilities.map((item) => (
    <li key={item} className="text-lg leading-10">
      {item}
    </li>
  ));

  const reqList = requirements.map((item) => (
    <li key={item} className="text-lg leading-10">
      {item}
    </li>
  ));

  const extraList = extraSkills.map((item) => (
    <li key={item} className="text-lg leading-10">
      {item}
    </li>
  ));

  return (
    <div className="relative flex flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250407 - Julian) Background */}
      <div className="absolute inset-x-0 top-0 h-546px w-full bg-job-detail bg-contain bg-top bg-no-repeat md:h-670px lg:h-1024px"></div>

      {/* Info: (20250407 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 overflow-y-auto overflow-x-hidden">
        {/* Info: (20250407 - Julian) Job Detail */}
        <div className="flex flex-col items-stretch gap-100px px-150px pb-100px pt-500px">
          {/* Info: (20250407 - Julian) Job Head */}
          <div className="flex flex-col items-center">
            <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
              {title}
            </LinearGradientText>
            <div className="flex items-center gap-lv-5 text-xl font-semibold text-surface-brand-primary">
              <p>{location}</p>
              <p>{dateString}</p>
            </div>
          </div>

          {/* Info: (20250407 - Julian) Job Body */}
          <div className="flex flex-col gap-lv-10">
            {/* Info: (20250407 - Julian) Job Description */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-36px font-bold text-text-brand-primary-lv3">Job Description</h2>
              <p className="text-lg leading-10">{description}</p>
            </div>
            {/* Info: (20250407 - Julian) Your Job Will Be ... */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-36px font-bold text-text-brand-primary-lv3">
                Your Job Will Be ...
              </h2>
              <ul className="list-inside list-disc">{resList}</ul>
            </div>
            {/* Info: (20250407 - Julian) What Makes You a Great Fit */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-36px font-bold text-text-brand-primary-lv3">
                What Makes You a Great Fit
              </h2>
              <ul className="flex list-inside list-disc list-image-orange-check flex-col gap-4px">
                {reqList}
              </ul>
            </div>
            {/* Info: (20250407 - Julian) Extra Power You Bring */}
            <div className="flex flex-col gap-40px">
              <h2 className="text-36px font-bold text-text-brand-primary-lv3">
                Extra Power You Bring
              </h2>
              <ul className="flex list-inside list-disc list-image-orange-plus flex-col gap-4px">
                {extraList}
              </ul>
            </div>
          </div>

          {/* Info: (20250407 - Julian) Job Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center"></div>
          </div>
        </div>

        {/* Info: (20250407 - Julian) Footer */}
        <LandingFooter />
        <ScrollToTopButton />
      </main>
    </div>
  );
};

export default JobDetailBody;
