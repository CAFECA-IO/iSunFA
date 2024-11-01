import React, { useState } from 'react';
import { FiLayout } from 'react-icons/fi';
import { IoIosArrowForward } from 'react-icons/io';
import Image from 'next/image';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
// import { useUserCtx } from '@/contexts/user_context'; // ToDo: (20241018 - Liz) 準備串接真實資料

interface SideMenuProps {
  toggleOverlay?: () => void;
}

interface CaptionProps {
  caption: string;
}

interface SubMenuItemProps {
  linkText: string;
  href?: string;
  disabled?: boolean;
  isCompanyNeeded?: boolean;
  toggleOverlay?: () => void;
}

interface PanelLayoutProps {
  panelTitle: string;
  iconSrc: string;
  iconSrcAlt: string;
  iconWidth: number;
  iconHeight: number;
  children: React.ReactNode;
  disabled?: boolean;
}

const TEMPORARY_LINK = ISUNFA_ROUTE.BETA_DASHBOARD;

const PanelLayout = ({
  panelTitle,
  iconSrc,
  iconSrcAlt,
  iconWidth,
  iconHeight,
  children,
  disabled = false,
}: PanelLayoutProps) => {
  const {
    targetRef: panelLayoutRef,
    componentVisible: isPanelOpen,
    setComponentVisible: setIsPanelOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  return (
    <div ref={panelLayoutRef}>
      <button
        type="button"
        onClick={togglePanel}
        disabled={disabled}
        className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:bg-transparent disabled:text-button-text-disable"
      >
        <div className="flex h-24px w-24px items-center justify-center">
          <Image src={iconSrc} alt={iconSrcAlt} width={iconWidth} height={iconHeight}></Image>
        </div>
        {/* Info: (20241101 - Anna) 加上 mb-0、no-underline 防止報告頁面跑版，其他頁面應不受影響 */}
        <p className="mb-0 grow text-left no-underline">{panelTitle}</p>
        <IoIosArrowForward size={20} />
      </button>

      {/* // Info: (20241014 - Liz) Panel : 面板上有各種 links 可以連結到其他頁面 */}
      {isPanelOpen && (
        <div
          onClick={togglePanel} // Info: (20241022 - Liz) 點擊此 Panel 會關閉 Panel
          className="absolute left-full top-0 z-20 h-full w-280px bg-surface-neutral-surface-lv1 px-12px py-32px shadow-SideMenu before:absolute before:left-0 before:top-0 before:h-full before:w-12px before:bg-gradient-to-r before:from-gray-200 before:to-transparent"
        >
          {children}
        </div>
      )}
    </div>
  );
};

const Caption = ({ caption }: CaptionProps) => {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-widest text-text-brand-primary-lv1">
      {caption}
    </h4>
  );
};

const SubMenuItem = ({
  linkText,
  href,
  disabled = false,
  isCompanyNeeded = false,
  toggleOverlay = () => {},
}: SubMenuItemProps) => {
  const { toastHandler } = useModalContext();

  // const { selectedCompany } = useUserCtx(); // ToDo: (20241018 - Liz) 準備串接真實資料

  /* === Fake Data === */
  const selectedCompany = '';
  const isSelectedCompany = !!selectedCompany;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isCompanyNeeded && !isSelectedCompany) {
      // Info: (20241018 - Liz) 阻止導航
      e.preventDefault();

      // ToDo: (20241018 - Liz) 要換成真實的「選擇公司」的 Link href
      toastHandler({
        id: 'company-needed',
        type: ToastType.INFO,
        content: (
          <div className="flex items-center gap-32px">
            <p className="text-sm text-text-neutral-primary">
              Please select a company before proceeding with the operation.
            </p>
            <Link href={'/'} className="text-base font-semibold text-link-text-primary">
              Company Link
            </Link>
          </div>
        ),
        closeable: true,
        position: ToastPosition.TOP_CENTER,
        onOpen: () => {
          // Info: (20241018 - Liz) 開啟 Toast 時順便開啟 Overlay
          toggleOverlay();
        },
        onClose: () => {
          // Info: (20241018 - Liz) 關閉 Toast 時順便關閉 Overlay
          toggleOverlay();
        },
      });
    }
  };

  return (
    <Link
      href={href ?? TEMPORARY_LINK}
      onClick={handleClick}
      // Info: (20241101 - Anna) 加上 no-underline 防止報告頁面跑版，其他頁面應不受影響
      className={`rounded-xs px-12px py-10px font-medium no-underline hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:bg-transparent disabled:text-button-text-disable ${disabled ? 'pointer-events-none text-button-text-disable' : 'text-button-text-secondary'}`}
    >
      {linkText}
    </Link>
  );
};

const SideMenu = ({ toggleOverlay }: SideMenuProps) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(true);

  const toggleSideMenu = () => {
    setIsSideMenuOpen((prev) => !prev);
  };

  return (
    <div className="z-100 h-full bg-surface-neutral-main-background">
      {isSideMenuOpen ? (
        <section className="relative flex h-full w-max flex-none flex-col gap-24px bg-surface-neutral-surface-lv2 px-12px py-32px shadow-SideMenu">
          {/* Side Menu Icon */}
          <div>
            <button type="button" onClick={toggleSideMenu} className="p-10px">
              <FiLayout size={24} />
            </button>
          </div>

          {/* Side Menu Body */}
          <div className="flex flex-auto flex-col gap-24px">
            {/* // Info: (20241014 - Liz) Accounting */}
            <PanelLayout
              panelTitle="Accounting"
              iconSrc="/icons/accounting_icon_calculator.svg"
              iconSrcAlt="accounting_icon_calculator"
              iconWidth={20.34}
              iconHeight={23.85}
            >
              <div className="flex flex-col gap-24px">
                <Caption caption="Accounting" />
                <SubMenuItem linkText="Adding Voucher" href={ISUNFA_ROUTE.ADD_NEW_VOUCHER} />
                <SubMenuItem linkText="Voucher List" href={ISUNFA_ROUTE.VOUCHER_LIST} />
                <SubMenuItem
                  linkText="Payable/Receivable List"
                  href={ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST}
                />

                <Caption caption="Certificates" />
                <SubMenuItem linkText="Upload Certificate" href={ISUNFA_ROUTE.CERTIFICATE_LIST} />
              </div>
            </PanelLayout>

            {/* // Info: (20241014 - Liz) Asset Management */}
            <PanelLayout
              panelTitle="Asset Management"
              iconSrc="/icons/asset_management_icon.svg"
              iconSrcAlt="asset_management_icon"
              iconWidth={24}
              iconHeight={24}
            >
              <div className="flex flex-col gap-24px">
                <Caption caption="Asset" />
                <SubMenuItem linkText="Asset List" href={ISUNFA_ROUTE.ASSET_LIST} />
              </div>
            </PanelLayout>

            {/* // Info: (20241014 - Liz) Personnel Management */}
            <PanelLayout
              disabled
              panelTitle="Personnel Management"
              iconSrc="/icons/personnel_management_icon.svg"
              iconSrcAlt="personnel_management_icon"
              iconWidth={23.95}
              iconHeight={24}
            >
              <div></div>
            </PanelLayout>

            {/* // Info: (20241014 - Liz) Reports */}
            <PanelLayout
              panelTitle="Reports"
              iconSrc="/icons/reports_icon.svg"
              iconSrcAlt="reports_icon"
              iconWidth={20.58}
              iconHeight={23.85}
            >
              <div className="flex flex-col gap-24px">
                <Caption caption="Financial Report" />
                <SubMenuItem linkText="Balance Sheet" />
                <SubMenuItem linkText="Income Statement" />
                <SubMenuItem linkText="Statement of Cash Flows" />

                <Caption caption="Tax Report" />
                <SubMenuItem linkText="Business Tax Return (401)" />

                <Caption caption="Daily Report" />
                <SubMenuItem linkText="Ledger" />
                <SubMenuItem linkText="Trial Balance" />

                <Caption caption="Embed code" />
                <SubMenuItem linkText="Generate Embed Code" />
              </div>
            </PanelLayout>

            {/* // Info: (20241014 - Liz) Parameter Setting */}
            <PanelLayout
              panelTitle="Parameter Setting"
              iconSrc="/icons/parameter_setting.svg"
              iconSrcAlt="parameter_setting"
              iconWidth={23.77}
              iconHeight={23.73}
            >
              <div className="flex flex-col gap-24px">
                <Caption caption="Setting" />
                <SubMenuItem
                  linkText="General Setting"
                  href={ISUNFA_ROUTE.EXAMPLE}
                  isCompanyNeeded
                  toggleOverlay={toggleOverlay}
                />

                <Caption caption="Company setting" />
                <SubMenuItem linkText="Accounting Setting" href={ISUNFA_ROUTE.EXAMPLE} />
                <SubMenuItem linkText="Clients/Suppliers Management" />
              </div>
            </PanelLayout>

            {/* // Info: (20241015 - Liz) 回到儀表板 */}
            <Link
              href={ISUNFA_ROUTE.BETA_DASHBOARD}
              // Info: (20241101 - Anna) 加上 no-underline 防止報告頁面跑版，其他頁面應不受影響
              className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary no-underline hover:bg-button-surface-soft-secondary-hover disabled:bg-transparent disabled:text-button-text-disable"
            >
              <Image src="/icons/dashboard.svg" alt="dashboard_icon" width={24} height={24}></Image>
              {/* Info: (20241101 - Anna) 加上 mb-0 防止報告頁面跑版，其他頁面應不受影響 */}
              <p className="mb-0">Back to dashboard</p>
            </Link>
          </div>

          {/* Side Menu Footer */}
          <div className="flex flex-col items-center gap-8px">
            <p className="text-xs text-text-neutral-tertiary">iSunFA 2024 Beta V1.0.0</p>

            {/* // ToDo: (20241014 - Liz) Link 到隱私權政策和服務條款頁面 */}
            <div className="flex gap-8px text-sm font-semibold">
              <p className="text-link-text-primary">Private Policy</p>
              <div className="w-1px bg-stroke-neutral-quaternary"></div>
              <p className="text-link-text-primary">Service Term</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="h-full w-66px flex-none px-12px py-32px">
          <button type="button" onClick={toggleSideMenu} className="p-10px">
            <FiLayout size={24} />
          </button>
        </section>
      )}
    </div>
  );
};

export default SideMenu;
