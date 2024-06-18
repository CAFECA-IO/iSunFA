export interface IMember {
  id: number;
  name: string;
  role: string;
  imageId: string;
}

export const dummyMemberList: IMember[] = [
  {
    id: 1,
    name: 'Emily',
    role: 'Full Stack Engineer',
    imageId: '/elements/yellow_check.svg',
  },
  {
    id: 2,
    name: 'Gibbs',
    role: 'Blockchain Engineer',
    imageId: '/elements/yellow_check.svg',
  },
  {
    id: 3,
    name: 'Jacky Fang',
    role: 'QA Engineer',
    imageId: '/elements/yellow_check.svg',
  },
  {
    id: 4,
    name: 'Julian Hsu',
    role: 'Front-end Engineer',
    imageId: '/elements/yellow_check.svg',
  },
  {
    id: 5,
    name: 'Liz',
    role: 'Front-end Engineer',
    imageId: '/elements/yellow_check.svg',
  },
];
