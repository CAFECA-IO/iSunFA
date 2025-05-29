import { useRouter } from 'next/router';
import Link from 'next/link';
import { PiGlobe } from 'react-icons/pi';
import { Dispatch, SetStateAction } from 'react';
import { INTERNATIONALIZATION_LIST } from '@/constants/i18n';
import { cn } from '@/lib/utils/common';

interface I18nProps {
  isMenuOpen: boolean;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
  toggleI18nMenu?: () => void;
}

const I18n = ({
  isMenuOpen,
  setIsMenuOpen,
  toggleI18nMenu = () => setIsMenuOpen((prev) => !prev),
}: I18nProps) => {
  const { asPath } = useRouter();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="relative">
      {/* Info: (20250513 - Liz) I18n Button */}
      <button
        type="button"
        onClick={toggleI18nMenu}
        className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        <PiGlobe size={20} />
      </button>

      {/* Info: (20250513 - Liz) I18n Menu */}
      <div
        id="I18nMenuDesktop"
        className={cn(
          'absolute start-1/2 top-full z-50 mt-10px w-150px -translate-x-1/2 rounded-sm bg-white shadow-dropmenu transition-all duration-300',
          {
            'visible opacity-100': isMenuOpen,
            'invisible opacity-0': !isMenuOpen,
          }
        )}
      >
        <ul className="py-1 text-base text-button-text-secondary" aria-labelledby="i18nButton">
          {INTERNATIONALIZATION_LIST.map((item) => (
            <li key={item.value} onClick={closeMenu}>
              <Link
                id={`${item.value.toUpperCase()}ButtonDesktop`}
                scroll={false}
                locale={item.value}
                href={asPath}
                className="block rounded-none py-3 text-center hover:text-button-text-primary-hover"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default I18n;
