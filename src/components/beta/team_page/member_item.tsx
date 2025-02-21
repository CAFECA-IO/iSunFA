import { useState } from 'react';
import Image from 'next/image';
import { ITeamMember, TeamRole } from '@/interfaces/team';
import { FiTrash2, FiSave } from 'react-icons/fi';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useTranslation } from 'next-i18next';

interface MemberItemProps {
  member: ITeamMember;
}

const MemberItem = ({ member }: MemberItemProps) => {
  const { t } = useTranslation(['team']);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const [role, setRole] = useState<TeamRole | null>(null);

  return (
    <main className="flex items-center gap-80px">
      <section className="flex flex-auto items-center gap-8px">
        <Image
          src={member.imageId}
          alt="member_image"
          width={32}
          height={32}
          className="h-32px w-32px"
        ></Image>
        <div className="flex flex-col gap-4px">
          <span className="text-xs font-medium leading-5 text-text-neutral-primary">
            {member.name}
          </span>
          <span className="text-xs font-medium leading-5 text-text-neutral-secondary">
            {member.email}
          </span>
        </div>
      </section>

      <section className="flex items-center gap-16px">
        {!member.editable && (
          <div className="text-base font-semibold text-text-neutral-primary">
            {t(`team:TEAM_ROLE.${member.role.toUpperCase()}`)}
          </div>
        )}

        {/* Info: (20250220 - Liz) edit team role */}
        {member.editable && (
          <div className="flex items-center gap-4px">
            <section className="relative">
              <button
                type="button"
                className="flex w-160px items-center justify-between rounded-sm border border-input-stroke-input bg-dropdown-surface-menu-background-primary text-dropdown-text-input-filled shadow-Dropshadow_SM"
                onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              >
                <span className="px-12px py-10px text-base font-medium text-input-text-input-filled">
                  {t(`team:TEAM_ROLE.${role?.toUpperCase() ?? member.role.toUpperCase()}`)}
                </span>
                <span className="px-12px py-10px text-icon-surface-single-color-primary">
                  {isRoleDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                </span>
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute inset-x-0 top-full z-10 mt-8px">
                  <div className="mb-20px flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                    {Object.values(TeamRole).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setRole(item);
                          setIsRoleDropdownOpen(false);
                        }}
                        disabled={item === member.role}
                        className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover disabled:pointer-events-none disabled:text-input-text-disable"
                      >
                        {t(`team:TEAM_ROLE.${item.toUpperCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {role && (
              <button type="button" className="text-text-state-success">
                <FiSave size={16} />
              </button>
            )}
          </div>
        )}

        {/* Info: (20250220 - Liz) delete member */}
        {member.editable && (
          <button type="button" className="text-icon-surface-single-color-primary">
            <FiTrash2 size={16} />
          </button>
        )}
      </section>
    </main>
  );
};

export default MemberItem;
