import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { ISUNFA_ROUTE } from '@/constants/url';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal_new';
import {
  MENU_CONFIG,
  TSubMenuOption,
  SubMenuOptionType,
  ISubMenuSection,
} from '@/interfaces/side_menu';
import { cn } from '@/lib/utils/common';

type SubMenuOptionProps = TSubMenuOption & {
  closeMenu?: () => void;
};

const SubMenuOption = ({
  type,
  title,
  link,
  disabled,
  needToConnectAccountBook,
  hiddenForRole,
  closeMenu = () => {},
}: SubMenuOptionProps) => {
  const { t } = useTranslation(['layout']);
  const { toastHandler } = useModalContext();
  const { connectedAccountBook } = useUserCtx();
  const notConnectAccountBook = !connectedAccountBook;
  const [isEmbedCodeModalOpen, setIsEmbedCodeModalOpen] = useState<boolean>(false);
  const { teamRole } = useUserCtx();

  const toggleEmbedCodeModal = () => {
    setIsEmbedCodeModalOpen((prev) => {
      const next = !prev;
      // Info: (20250602 - Anna) !next 為 true 時，再呼叫 closeMenu ，避免 modal 尚未顯示就被 menu 卸載
      if (!next) {
        closeMenu();
      }
      return next;
    });
  };

  const showAccountBookNeededToast = () => {
    toastHandler({
      id: ToastId.NEED_TO_SELECT_ACCOUNT_BOOK_MOBILE_VER,
      position: ToastPosition.TOP_CENTER,
      type: ToastType.INFO,
      content: (
        <div className="">
          <p className="text-xs text-text-neutral-primary">
            {t('layout:TOAST.PLEASE_SELECT_AN_ACCOUNT_BOOK_BEFORE_PROCEEDING_WITH_THE_OPERATION')}
          </p>
          <Link
            href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
            className="text-sm font-semibold text-link-text-primary"
          >
            {t('layout:TOAST.ACCOUNT_BOOKS_LINK')}
          </Link>
        </div>
      ),
      closeable: true,
    });
  };

  const onClickButton = () => {
    if (needToConnectAccountBook && notConnectAccountBook) {
      showAccountBookNeededToast();
      return;
    }

    if (title === 'GENERATE_EMBED_CODE') {
      toggleEmbedCodeModal();
      // Info: (20250602 - Anna) 點「嵌入程式碼」時，避免執行 closeMenu，否則 modal 會被立即卸載
      return;
    }
    // Info: (20241126 - Liz) 如果有其他按鈕的 onClick 事件就新增在這裡: if (title === 'XXX') { ... }
    closeMenu();
  };

  const onClickLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (needToConnectAccountBook && notConnectAccountBook) {
      // Info: (20241018 - Liz) 阻止導航
      e.preventDefault();
      showAccountBookNeededToast();
      return;
    }
    closeMenu();
  };

  if (disabled) return null;

  if (type === SubMenuOptionType.LINK) {
    return (
      <Link
        href={link}
        onClick={onClickLink}
        className={cn('rounded-xs px-12px py-10px text-sm font-medium text-button-text-secondary', {
          'pointer-events-none disabled:text-button-text-disable':
            hiddenForRole && hiddenForRole === teamRole,
          'hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid':
            !hiddenForRole || hiddenForRole !== teamRole,
        })}
      >
        {t(`layout:SIDE_MENU.${title}`)}
      </Link>
    );
  }

  if (type === SubMenuOptionType.BUTTON) {
    return (
      <>
        <button
          type="button"
          onClick={onClickButton}
          className="rounded-xs px-12px py-10px text-left font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid"
        >
          {t(`layout:SIDE_MENU.${title}`)}
        </button>

        {isEmbedCodeModalOpen && (
          <EmbedCodeModal
            isModalVisible={isEmbedCodeModalOpen}
            modalVisibilityHandler={toggleEmbedCodeModal}
          />
        )}
      </>
    );
  }

  return null;
};

interface SubMenuSectionProps {
  subMenuSection: ISubMenuSection;
  closeMenu: () => void;
}

const SubMenuSection = ({ subMenuSection, closeMenu }: SubMenuSectionProps) => {
  const { t } = useTranslation(['layout']);
  const { teamRole } = useUserCtx();

  if (subMenuSection.disabled) return null;

  return (
    <>
      <h4
        className={cn(
          'text-xs font-semibold uppercase leading-5 tracking-widest text-text-brand-primary-lv1',
          {
            'pointer-events-none disabled:text-button-text-disable':
              subMenuSection.hiddenForRole && subMenuSection.hiddenForRole === teamRole,
          }
        )}
      >
        {t(`layout:SIDE_MENU.${subMenuSection.caption}`)}
      </h4>

      {subMenuSection.subMenu.map((option) => (
        <SubMenuOption key={option.title} {...option} closeMenu={closeMenu} />
      ))}
    </>
  );
};

interface SubMenuProps {
  selectedMenuOption: string;
  closeMenu: () => void;
}

const SubMenu = ({ selectedMenuOption, closeMenu }: SubMenuProps) => {
  const subMenu = MENU_CONFIG.find((menu) => menu.title === selectedMenuOption)?.subMenu;

  if (!subMenu) return null;

  return (
    <section className="flex flex-col gap-24px px-12px py-16px">
      {subMenu.map((item) => (
        <SubMenuSection key={item.caption} subMenuSection={item} closeMenu={closeMenu} />
      ))}
    </section>
  );
};

export default SubMenu;
