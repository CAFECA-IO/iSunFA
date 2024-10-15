import Search from '@/components/beta/layout/search';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import I18n from '@/components/i18n/i18n';
import Notification from '@/components/beta/layout/notification';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';

const Header = () => {
  return (
    <header className="flex items-center gap-24px">
      <Search />

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
