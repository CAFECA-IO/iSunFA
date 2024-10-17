import React, { useState } from 'react';
import { FiLayout } from 'react-icons/fi';
import { IoIosArrowForward } from 'react-icons/io';
import Image from 'next/image';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';

interface CaptionLayoutProps {
  caption: string;
}

interface LinkLayoutProps {
  linkText: string;
  href?: string;
  disabled?: boolean;
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
        <p className="grow text-left">{panelTitle}</p>
        <IoIosArrowForward size={20} />
      </button>

      {/* // Info: (20241014 - Liz) Panel : 面板上有各種 links 可以連結到其他頁面 */}
      {isPanelOpen && (
        <div className="absolute left-full top-0 z-10 h-full w-280px bg-surface-neutral-surface-lv1 px-12px py-32px before:absolute before:left-0 before:top-0 before:h-full before:w-12px before:bg-gradient-to-r before:from-gray-200 before:to-transparent">
          {children}
        </div>
      )}
    </div>
  );
};

const temporaryLink = ISUNFA_ROUTE.BETA_DASHBOARD;

const CaptionLayout = ({ caption }: CaptionLayoutProps) => {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-widest text-text-brand-primary-lv1">
      {caption}
    </h4>
  );
};

const LinkLayout = ({ linkText, href, disabled = false }: LinkLayoutProps) => {
  return (
    <Link
      href={href ?? temporaryLink}
      className={`rounded-xs px-12px py-10px font-medium hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:bg-transparent disabled:text-button-text-disable ${disabled ? 'pointer-events-none text-button-text-disable' : 'text-button-text-secondary'}`}
    >
      {linkText}
    </Link>
  );
};

const SideMenu = () => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(true);

  const toggleSideMenu = () => {
    setIsSideMenuOpen((prev) => !prev);
  };

  return (
    <div className="bg-surface-neutral-main-background">
      {isSideMenuOpen ? (
        <section className="relative flex h-screen w-max flex-none flex-col gap-24px bg-surface-neutral-surface-lv2 px-12px py-32px shadow-SideMenu">
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
                <CaptionLayout caption="Accounting" />
                <LinkLayout linkText="Adding Voucher" href={ISUNFA_ROUTE.ADD_NEW_VOUCHER} />
                <LinkLayout linkText="Voucher List" href={ISUNFA_ROUTE.VOUCHER_LIST} />
                <LinkLayout
                  linkText="Payable/Receivable List"
                  href={ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST}
                />

                <CaptionLayout caption="Certificates" />
                <LinkLayout linkText="Upload Certificate" href={ISUNFA_ROUTE.CERTIFICATE_LIST} />
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
                <CaptionLayout caption="Asset" />
                <LinkLayout linkText="Asset List" href={ISUNFA_ROUTE.ASSET_LIST} />
              </div>
            </PanelLayout>

            {/* // Info: (20241014 - Liz) Personnel Management */}
            <PanelLayout
              panelTitle="Personnel Management"
              iconSrc="/icons/personnel_management_icon.svg"
              iconSrcAlt="personnel_management_icon"
              iconWidth={23.95}
              iconHeight={24}
              disabled
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
                <CaptionLayout caption="Financial Report" />
                <LinkLayout linkText="Balance Sheet" />
                <LinkLayout linkText="Income Statement" />
                <LinkLayout linkText="Statement of Cash Flows" />

                <CaptionLayout caption="Tax Report" />
                <LinkLayout linkText="Business Tax Return (401)" />

                <CaptionLayout caption="Daily Report" />
                <LinkLayout linkText="Ledger" />
                <LinkLayout linkText="Trial Balance" />

                <CaptionLayout caption="Embed code" />
                <LinkLayout linkText="Generate Embed Code" />
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
                <CaptionLayout caption="Setting" />
                <LinkLayout linkText="General Setting" />

                <CaptionLayout caption="Company setting" />
                <LinkLayout linkText="Accounting Setting" />
                <LinkLayout linkText="Clients/Suppliers Management" />
              </div>
            </PanelLayout>

            {/* // Info: (20241015 - Liz) 回到儀表板 */}
            <button
              type="button"
              className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:bg-transparent disabled:text-button-text-disable"
            >
              <Image src="/icons/dashboard.svg" alt="dashboard_icon" width={24} height={24}></Image>
              <p>Back to dashboard</p>
            </button>
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
        <section className="w-66px flex-none px-12px py-32px">
          <button type="button" onClick={toggleSideMenu} className="p-10px">
            <FiLayout size={24} />
          </button>
        </section>
      )}
    </div>
  );
};

export default SideMenu;
