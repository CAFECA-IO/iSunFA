import React, { useState } from 'react';
import Image from 'next/image';
import { FaListUl } from 'react-icons/fa6';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { Button } from '../button/button';

enum Layout {
  LIST = 'list',
  GRID = 'grid',
}

interface IProject {
  id: string;
  name: string;
  status: string;
  income: number;
  expense: number;
  profit: number;
  contractCount: number;
  members: {
    id: string;
    avatar: string;
  }[];
}

const dummyProjects: IProject[] = [
  {
    id: '1',
    name: 'Project 1',
    status: 'Active',
    income: 1000,
    expense: 500,
    profit: 500,
    contractCount: 3,
    members: [
      {
        id: '1',
        avatar: '/entities/tesla.png',
      },
      {
        id: '2',
        avatar: '/entities/tidebit.jpeg',
      },
      {
        id: '3',
        avatar: '/entities/happy.png',
      },
    ],
  },
  {
    id: '2',
    name: 'Project 2',
    status: 'Selling',
    income: 4200,
    expense: 4700,
    profit: -500,
    contractCount: 5,
    members: [
      {
        id: '1',
        avatar: '/elements/avatar.png',
      },
      {
        id: '2',
        avatar: '/entities/isuncloud.png',
      },
      {
        id: '3',
        avatar: '/entities/happy.png',
      },
    ],
  },
  {
    id: '3',
    name: 'Project 3',
    status: 'Developing',
    income: 2310,
    expense: 2354,
    profit: -44,
    contractCount: 26,
    members: [
      {
        id: '1',
        avatar: '/entities/happy.png',
      },
    ],
  },
  {
    id: '4',
    name: 'StellarScape',
    status: 'Designing',
    income: 13940,
    expense: 12480,
    profit: 1460,
    contractCount: 8,
    members: [
      {
        id: '1',
        avatar: '/elements/avatar.png',
      },
      {
        id: '2',
        avatar: '/entities/happy.png',
      },
    ],
  },
];

const ProjectList = () => {
  const [search, setSearch] = useState<string>('');
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);
  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  const filteredProjects = dummyProjects.filter((project) => {
    return (
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.status.toLowerCase().includes(search.toLowerCase())
    );
  });

  const displayedProjectList =
    filteredProjects.length > 0 ? (
      <div className="my-40px flex w-full flex-col gap-y-16px">
        {filteredProjects.map((project) => {
          // ToDo: (2024606 - Julian) This part should be refactored to a separate component: ProjectCard
          return (
            // ToDo: (2024606 - Julian) Link to project detail page
            <div
              key={project.id}
              className="relative flex w-full flex-col gap-y-16px overflow-hidden rounded-sm bg-surface-neutral-surface-lv1 p-16px shadow-md"
            >
              <div className="flex items-center gap-x-8px">
                {/* Info: (2024606 - Julian) Title */}
                <h2 className="text-2xl font-bold text-text-neutral-primary">{project.name}</h2>
                <div className="flex h-24px w-24px items-center justify-center rounded-full bg-badge-surface-soft-primary text-xs text-badge-text-primary-solid">
                  {project.contractCount}
                </div>
              </div>
              {/* Info: (2024606 - Julian) Members */}
              <div className="flex items-center">
                {project.members.map((member) => (
                  <Image
                    src={member.avatar}
                    width={24}
                    height={24}
                    key={member.id}
                    alt={`${member.id}_icon`}
                    className="rounded-full border-2 border-avatar-stroke-primary "
                  />
                ))}
              </div>
              {/* Info: (2024606 - Julian) Divider */}
              <hr className="border-divider-stroke-lv-4" />
              {/* Info: (2024606 - Julian) Content */}
              <div className="flex flex-col gap-y-14px text-sm">
                <div className="flex items-center gap-x-16px">
                  <p className="w-52px text-text-neutral-tertiary">Income</p>
                  <p className="font-semibold text-text-neutral-primary">{project.income}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-16px">
                    <p className="w-52px text-text-neutral-tertiary">Expense</p>
                    <p className="font-semibold text-text-neutral-primary">{project.expense}</p>
                  </div>
                  <div className="flex items-center gap-x-16px">
                    <p className="text-text-neutral-tertiary">Profit</p>
                    <p className="font-semibold text-text-neutral-primary">{project.profit}</p>
                  </div>
                </div>
              </div>
              {/* Info: (2024606 - Julian) Status */}
              <div className="absolute -right-4 rounded-xs bg-surface-support-strong-taro py-4px pl-12px pr-28px text-xs text-badge-text-invert">
                {project.status}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>Empty</p>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Info: (2024606 - Julian) Filter */}
      <div className="flex w-full items-center gap-x-24px">
        {/* Info: (2024606 - Julian) Search bar */}
        <div className="flex h-44px flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
          <input
            id="project-search-bar"
            type="text"
            onChange={searchHandler}
            className="flex-1 outline-none placeholder:text-input-text-input-placeholder"
            placeholder="Search Project"
          />
          <FiSearch size={20} />
        </div>
        {/* Info: (2024606 - Julian) Layout Toggle */}
        <div className="flex gap-x-8px">
          {/* Info: (2024606 - Julian) List button */}
          <Button type="button" variant={listBtnStyle} className="p-3" onClick={listLayoutHandler}>
            <FaListUl size={20} />
          </Button>
          {/* Info: (2024606 - Julian) Grid button */}
          <Button type="button" variant={gridBtnStyle} className="p-3" onClick={gridLayoutHandler}>
            <FiGrid size={20} />
          </Button>
        </div>
      </div>

      {/* Info: (2024606 - Julian) List */}
      {displayedProjectList}
    </div>
  );
};

export default ProjectList;
