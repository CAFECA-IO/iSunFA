import { Dispatch, SetStateAction } from 'react';
import { RoleName } from '@/constants/role';
import RoleCardMobile from '@/components/beta/create_role/mobile/role_card_mobile';

interface RoleCardsMobileProps {
  uncreatedRoles: RoleName[];
  displayedRole: RoleName | undefined;
  setDisplayedRole: Dispatch<SetStateAction<RoleName | undefined>>;
}

const RoleCardsMobile = ({
  uncreatedRoles,
  displayedRole,
  setDisplayedRole,
}: RoleCardsMobileProps) => {
  return (
    <main className="relative tablet:hidden">
      {/* Info: (20250207 - Liz) 角色卡片按鈕 */}
      <section className="hide-scrollbar flex max-w-fit gap-12px overflow-x-auto px-20px">
        {uncreatedRoles.map((uncreatedRole) => (
          <RoleCardMobile
            key={uncreatedRole}
            uncreatedRole={uncreatedRole}
            displayedRole={displayedRole}
            setDisplayedRole={setDisplayedRole}
          />
        ))}
      </section>
    </main>
  );
};

export default RoleCardsMobile;
