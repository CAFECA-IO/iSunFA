import Search from '@/components/beta/layout/search';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import I18n from '@/components/i18n/i18n';
import Notification from '@/components/beta/layout/notification';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';
import PageTitle from '@/components/beta/layout/page_title';

interface HeaderProps {
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
  className?: string; // Info: (20241118 - Anna) 因為列印功能會需要用到
}

// Info: (20241118 - Anna) 因為列印功能會需要用到className
const Header = ({ isDashboard, pageTitle, goBackUrl, className }: HeaderProps) => {
  return (
    <header
      className={`flex items-center gap-24px px-20px pb-8px pt-32px screen1280:px-56px ${className || ''}`}
    >
      {isDashboard ? <Search /> : <PageTitle pageTitle={pageTitle} goBackUrl={goBackUrl} />}

      <section className="flex flex-none items-center gap-16px">
        <ModeSwitch />

        <I18n />

        <Notification />

        <CompanyBadge />

        <Profile />
      </section>
    </header>
  );
};

export default Header;
