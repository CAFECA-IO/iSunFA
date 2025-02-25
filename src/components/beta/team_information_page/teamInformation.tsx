import { ITeam } from '@/interfaces/team';
import { Button } from '@/components/button/button';
import { FiEdit } from 'react-icons/fi';

interface teamInfoProps {
  teamInfo: ITeam;
}

const TeamInformation = ({ teamInfo, }: teamInfoProps) => {
  return (
    <section className="flex flex-auto flex-col gap-8px">
      <div className="grid grid-cols-2 items-center gap-y-10">
        <div className="text-left font-semibold text-neutral-300">Team Name</div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.name.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.name.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={() => {}} // Todo:(20250224 - Anna 先留空函數，之後改為開啟彈窗
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="text-left font-semibold text-neutral-300">About</div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.about.value}
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.about.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={() => {}} // Todo:(20250224 - Anna 先留空函數，之後改為開啟彈窗
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="text-left font-semibold text-neutral-300">Team Profile</div>
        <div className="text-right font-semibold">
          <a
            href={teamInfo.profile.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {teamInfo.profile.value}
          </a>
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.profile.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={() => {}} // Todo:(20250224 - Anna 先留空函數，之後改為開啟彈窗
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="text-left font-semibold text-neutral-300">Team Plan</div>
        <div className="text-right">
          <span className="rounded-full bg-navy-blue-500 px-3 py-2 text-sm font-semibold text-white">
            {teamInfo.planType.value}
          </span>
          {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
          {teamInfo.planType.editable && (
            <Button
              type="button"
              variant="tertiary"
              size="defaultSquare"
              className="ml-4"
              onClick={() => {}} // Todo:(20250224 - Anna 先留空函數，之後改為開啟彈窗
            >
              <FiEdit size={16} />
            </Button>
          )}
        </div>

        <div className="text-left font-semibold text-neutral-300">Team Member</div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.totalMembers} Member{teamInfo.totalMembers > 1 ? 's' : ''}
        </div>

        <div className="text-left font-semibold text-neutral-300">Libraries</div>
        <div className="text-right font-semibold text-neutral-600">
          {teamInfo.totalAccountBooks} Ledger{teamInfo.totalAccountBooks > 1 ? 's' : ''}
        </div>

        {teamInfo.bankAccount.value !== '-' && (
          <>
            <div className="text-left font-semibold text-neutral-300">Team Bank Account</div>
            <div className="text-right font-semibold text-neutral-600">
              {teamInfo.bankAccount.value}
              {/* Info:(20250224 - Anna) 如果 editable 為 true，顯示編輯按鈕 */}
              {teamInfo.bankAccount.editable && (
                <Button
                  type="button"
                  variant="tertiary"
                  size="defaultSquare"
                  className="ml-4"
                  onClick={() => {}} // Todo:(20250224 - Anna 先留空函數，之後改為開啟彈窗
                >
                  <FiEdit size={16} />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TeamInformation;
