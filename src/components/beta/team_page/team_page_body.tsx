import { useState } from 'react';
import { ITeam } from '@/interfaces/team';
import UploadTeamPictureModal from '@/components/beta/team_page/upload_team_picture_modal';
import TeamHeader from '@/components/beta/team_page/team_header';

interface TeamPageBodyProps {
  team: ITeam;
}

const TeamPageBody = ({ team }: TeamPageBodyProps) => {
  const [teamToUploadPicture, setTeamToUploadPicture] = useState<ITeam | undefined>();

  return (
    <main className="flex flex-col gap-40px">
      <TeamHeader team={team} setTeamToUploadPicture={setTeamToUploadPicture} />

      {/* // Info: (20250218 - Liz) Modal */}
      {teamToUploadPicture && (
        <UploadTeamPictureModal
          teamToUploadPicture={teamToUploadPicture}
          setTeamToUploadPicture={setTeamToUploadPicture}
        />
      )}
    </main>
  );
};

export default TeamPageBody;
