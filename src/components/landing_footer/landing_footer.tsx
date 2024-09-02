import Link from 'next/link';
import Image from 'next/image';
import { BiLogoGithub } from 'react-icons/bi';
import { BsTelephone } from 'react-icons/bs';
import { FiMapPin } from 'react-icons/fi';
import { ISUNFA_ROUTE } from '@/constants/url';
import {
  copyright,
  iSunFAAddress,
  iSunFAAddressOnMap,
  iSunFAPhone,
  githubLink,
} from '@/constants/config';

function LandingFooter() {
  return (
    <div className="flex flex-col space-y-12 bg-navy-blue-700 px-4 py-12 font-roboto drop-shadow-xlReverse lg:px-28">
      <div className="flex w-full flex-col items-center space-y-6 lg:flex-row lg:space-x-20 lg:space-y-0">
        <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
          {/* Info:(20230711 - Shirley) Desktop Logo */}
          <Image
            className="hidden lg:block"
            src="/logo/isunfa_logo_small.svg"
            alt="iSunFA_logo"
            width={88}
            height={68}
          />
          {/* Info:(20230711 - Shirley) Mobile Logo */}
          <Image
            className="block lg:hidden"
            src="/logo/isunfa_logo_small.svg"
            alt="iSunFA_logo"
            width={88}
            height={68}
          />
        </Link>

        <div className="flex flex-1 flex-col items-center space-y-6 text-sm lg:flex-row lg:space-x-6 lg:space-y-0 lg:divide-x lg:divide-navy-blue-25">
          <div className="flex flex-col items-start space-y-4">
            <Link
              href={iSunFAAddressOnMap ?? ''}
              target="_blank"
              className="flex items-center space-x-2"
            >
              <FiMapPin className="text-2xl" />
              <p className="w-280px lg:w-auto">{iSunFAAddress}</p>
            </Link>
            <Link href={`tel:${iSunFAPhone}`} className="flex items-center space-x-2">
              <BsTelephone className="text-2xl" />
              <p>{iSunFAPhone}</p>
            </Link>
          </div>
        </div>

        <div className="flex w-full flex-1 justify-center border-t border-navy-blue-25 lg:justify-end lg:border-t-0">
          <Link
            href={githubLink ?? ''}
            target="_blank"
            className="px-6 py-4 lg:border-l lg:border-navy-blue-25"
          >
            <BiLogoGithub className="text-40px" />
          </Link>
        </div>
      </div>

      {/* Info:(20230711 - Shirley) Copyright */}
      <div className="flex justify-center text-sm lg:justify-end">{copyright}</div>
    </div>
  );
}

export default LandingFooter;
