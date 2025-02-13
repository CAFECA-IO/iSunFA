import { ITeam } from '@/interfaces/team';

export const FAKE_TEAM_LIST: ITeam[] = [
  {
    id: '1',
    name: 'Team A',
    members: [
      {
        id: '1',
        name: 'User A',
        email: 'user_a@gmail.com',
        role: 'admin',
      },
      {
        id: '2',
        name: 'User B',
        email: 'user_b@gmail.com',
        role: 'member',
      },
    ],
  },
  {
    id: '2',
    name: 'Team B',
    members: [
      {
        id: '1',
        name: 'User C',
        email: 'user_c@gmail.com',
        role: 'admin',
      },
      {
        id: '2',
        name: 'User D',
        email: 'user_d@gmail.com',
        role: 'member',
      },
    ],
  },
];
