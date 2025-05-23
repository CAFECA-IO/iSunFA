import Link from 'next/link';
import { TbHome } from 'react-icons/tb';
import I18n from '@/components/i18n/i18n';
import { RoleName } from '@/constants/role';
import { ISUNFA_ROUTE } from '@/constants/url';
import useOuterClick from '@/lib/hooks/use_outer_click';
import DefaultIntro from '@/components/beta/create_role/default_intro';
import IndividualIntro from '@/components/beta/create_role/individual_intro';
import AccountingFirmsIntro from '@/components/beta/create_role/accounting_firms_intro';
import EnterpriseIntro from '@/components/beta/create_role/enterprise_intro';
import IntroButtons from '@/components/beta/create_role/intro_buttons';

interface IntroductionProps {
  displayedRole: RoleName | undefined;
  togglePreviewModal: () => void;
}

const Introduction = ({ displayedRole, togglePreviewModal }: IntroductionProps) => {
  const {
    targetRef: globalRef,
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  return (
    <main className="flex flex-auto flex-col p-16px tablet:p-0">
      <section className="mb-20px flex items-center justify-end gap-12px tablet:hidden">
        <div ref={globalRef}>
          <I18n isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        </div>
        <Link
          href={ISUNFA_ROUTE.LANDING_PAGE}
          className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <TbHome size={20} />
        </Link>
      </section>

      {/* Info: (20250522 - Liz) 預設介紹 */}
      {!displayedRole && <DefaultIntro />}

      {/* Info: (20250522 - Liz) 「個人」角色介紹 */}
      {displayedRole === RoleName.INDIVIDUAL && (
        <IndividualIntro>
          <IntroButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </IndividualIntro>
      )}

      {/* Info: (20250522 - Liz) 「事務所團隊」角色介紹 */}
      {displayedRole === RoleName.ACCOUNTING_FIRMS && (
        <AccountingFirmsIntro>
          <IntroButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </AccountingFirmsIntro>
      )}

      {/* Info: (20250522 - Liz) 「企業」角色介紹 */}
      {displayedRole === RoleName.ENTERPRISE && (
        <EnterpriseIntro>
          <IntroButtons togglePreviewModal={togglePreviewModal} displayedRole={displayedRole} />
        </EnterpriseIntro>
      )}
    </main>
  );
};

export default Introduction;
