import { Dispatch, SetStateAction } from 'react';
import { IoIosArrowForward } from 'react-icons/io';
import Image from 'next/image';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import packageJson from '@package';
import { MENU_CONFIG, MenuContent, TMenuOption } from '@/interfaces/side_menu';
import { cn } from '@/lib/utils/common';

type MenuOptionProps = TMenuOption & {
  onClickMenuOption: (menuOptionTitle: string) => void;
  closeMenu: () => void;
};

const MenuOption = ({
  title,
  iconSrc,
  iconSrcAlt,
  iconWidth,
  iconHeight,
  disabled = false,
  hiddenForRole,
  link,
  subMenu,
  onClickMenuOption,
  closeMenu,
}: MenuOptionProps) => {
  const { t } = useTranslation(['layout']);
  const { teamRole } = useUserCtx();

  if (disabled) return null;

  return (
    <div>
      {link ? (
        <Link
          href={link}
          className={cn('flex w-full items-center gap-8px px-12px py-10px', {
            'pointer-events-none disabled:text-button-text-disable':
              hiddenForRole && hiddenForRole === teamRole,
            'hover:bg-button-surface-soft-secondary-hover':
              !hiddenForRole || hiddenForRole !== teamRole,
          })}
          onClick={closeMenu}
        >
          <div className="flex h-24px w-24px items-center justify-center">
            <Image src={iconSrc} alt={iconSrcAlt} width={iconWidth} height={iconHeight} />
          </div>
          <p className="grow text-left text-sm font-medium text-button-text-secondary">
            {t(`layout:SIDE_MENU.${title}`)}
          </p>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onClickMenuOption(title)}
          className="flex w-full items-center gap-8px px-12px py-10px text-button-text-secondary hover:bg-button-surface-soft-secondary-hover"
        >
          <div className="flex h-24px w-24px items-center justify-center">
            <Image src={iconSrc} alt={iconSrcAlt} width={iconWidth} height={iconHeight} />
          </div>
          <p className="grow text-left text-sm font-medium">{t(`layout:SIDE_MENU.${title}`)}</p>
          {subMenu && <IoIosArrowForward size={20} />}
        </button>
      )}
    </div>
  );
};

interface MainMenuProps {
  setSelectedMenuOption: Dispatch<SetStateAction<string>>;
  closeMenu: () => void;
  changeMenu: ({
    menuContent,
    headerTitle,
  }: {
    menuContent: MenuContent;
    headerTitle: string;
  }) => void;
}

const MainMenu = ({ setSelectedMenuOption, closeMenu, changeMenu }: MainMenuProps) => {
  const { t } = useTranslation(['layout']);
  const { version, versionName } = packageJson;
  const currentYear = new Date().getFullYear();

  const onClickMenuOption = (menuOption: string) => {
    setSelectedMenuOption(menuOption);
    changeMenu({
      menuContent: MenuContent.SUB_MENU,
      headerTitle: t(`layout:SIDE_MENU.${menuOption}`),
    });
  };

  return (
    <section className="flex flex-auto flex-col gap-24px bg-surface-neutral-surface-lv2 px-12px py-16px">
      {/* Info: (20241121 - Liz) Side Menu Content */}
      <div className="flex flex-auto flex-col gap-24px">
        {MENU_CONFIG.map((menu) => (
          <MenuOption
            key={menu.title}
            {...menu}
            onClickMenuOption={onClickMenuOption}
            closeMenu={closeMenu}
          />
        ))}
      </div>

      {/* Info: (20241121 - Liz) Side Menu Footer */}
      <div className="flex flex-col items-center gap-8px">
        <p className="text-xs text-text-neutral-tertiary">
          iSunFA {currentYear} {versionName} v{version}
        </p>

        {/* Info: (20241212 - Liz) 隱私權政策和服務條款頁面 */}
        <div className="flex gap-8px text-sm font-semibold">
          <Link href={ISUNFA_ROUTE.PRIVACY_POLICY} className="text-link-text-primary">
            {t('layout:SIDE_MENU.PRIVACY_POLICY')}
          </Link>
          <div className="w-1px bg-stroke-neutral-quaternary"></div>
          <Link href={ISUNFA_ROUTE.TERMS_OF_SERVICE} className="text-link-text-primary">
            {t('layout:SIDE_MENU.TERMS_OF_SERVICE')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MainMenu;
