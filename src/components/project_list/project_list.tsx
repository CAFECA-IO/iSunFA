import React, { useState } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { FiGrid, FiSearch } from 'react-icons/fi';
import { FaChevronDown, FaListUl } from 'react-icons/fa6';
import { Button } from '../button/button';

enum Layout {
  LIST = 'list',
  GRID = 'grid',
}

enum ProjectStage {
  DESIGNING = 'Designing',
  DEVELOPING = 'Developing',
  BETA_TESTING = 'Beta Testing',
  SELLING = 'Selling',
  SOLD = 'Sold',
  ARCHIVED = 'Archived',
}

interface IProject {
  id: string;
  name: string;
  stage: ProjectStage;
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
    stage: ProjectStage.ARCHIVED,
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
    stage: ProjectStage.SELLING,
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
    stage: ProjectStage.DEVELOPING,
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
    stage: ProjectStage.DESIGNING,
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
  const [filteredStage, setFilteredStage] = useState<string>('ALL');
  const [currentLayout, setCurrentLayout] = useState<Layout>(Layout.LIST);

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setIsStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const listBtnStyle = currentLayout === Layout.LIST ? 'tertiary' : 'secondaryOutline';
  const gridBtnStyle = currentLayout === Layout.GRID ? 'tertiary' : 'secondaryOutline';

  const listLayoutHandler = () => setCurrentLayout(Layout.LIST);
  const gridLayoutHandler = () => setCurrentLayout(Layout.GRID);

  const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  const stageMenuClickHandler = () => setIsStageOptionsVisible(!isStageOptionsVisible);
  const allClickHandler = () => {
    setFilteredStage('ALL');
    setIsStageOptionsVisible(false);
  };
  const designClickHandler = () => {
    setFilteredStage(ProjectStage.DESIGNING);
    setIsStageOptionsVisible(false);
  };
  const developClickHandler = () => {
    setFilteredStage(ProjectStage.DEVELOPING);
    setIsStageOptionsVisible(false);
  };
  const betaTestingClickHandler = () => {
    setFilteredStage(ProjectStage.BETA_TESTING);
    setIsStageOptionsVisible(false);
  };
  const sellingClickHandler = () => {
    setFilteredStage(ProjectStage.SELLING);
    setIsStageOptionsVisible(false);
  };
  const soldClickHandler = () => {
    setFilteredStage(ProjectStage.SOLD);
    setIsStageOptionsVisible(false);
  };
  const archivedClickHandler = () => {
    setFilteredStage(ProjectStage.ARCHIVED);
    setIsStageOptionsVisible(false);
  };

  const filteredProjects = dummyProjects
    .filter((project) => {
      return (
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.stage.toLowerCase().includes(search.toLowerCase())
      );
    })
    .filter((project) => {
      if (filteredStage === 'ALL') {
        return true; // Info: (2024606 - Julian) 選擇全部
      }
      return project.stage === filteredStage;
    });

  const stageColorMap = {
    [ProjectStage.DESIGNING]: 'bg-surface-support-strong-maple',
    [ProjectStage.DEVELOPING]: 'bg-surface-support-strong-green',
    [ProjectStage.BETA_TESTING]: 'bg-surface-support-strong-indigo',
    [ProjectStage.SELLING]: 'bg-surface-support-strong-taro',
    [ProjectStage.SOLD]: 'bg-surface-support-strong-rose',
    [ProjectStage.ARCHIVED]: 'bg-surface-neutral-mute',
  };

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 ${isStageOptionsVisible ? 'flex' : 'hidden'} w-full flex-col items-start rounded-xs border border-input-stroke-input bg-input-surface-input-background px-12px shadow-md`}
    >
      <button type="button" className="py-12px" onClick={allClickHandler}>
        All
      </button>
      <button type="button" className="py-12px" onClick={designClickHandler}>
        Designing
      </button>
      <button type="button" className="py-12px" onClick={developClickHandler}>
        Developing
      </button>
      <button type="button" className="py-12px" onClick={betaTestingClickHandler}>
        Beta Testing
      </button>
      <button type="button" className="py-12px" onClick={sellingClickHandler}>
        Selling
      </button>
      <button type="button" className="py-12px" onClick={soldClickHandler}>
        Sold
      </button>
      <button type="button" className="py-12px" onClick={archivedClickHandler}>
        Archived
      </button>
    </div>
  );

  const displayedProjectList =
    filteredProjects.length > 0 ? (
      <div className="my-40px flex w-full flex-col gap-y-16px">
        {filteredProjects.map((project) => {
          // ToDo: (2024606 - Julian) This part should be refactored to a separate component: ProjectCard
          const stageColor = stageColorMap[project.stage];
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
              <div
                className={`absolute -right-4 rounded-xs ${stageColor} ${project.stage === ProjectStage.ARCHIVED ? 'text-lightGray4' : 'text-badge-text-invert'} py-4px pl-12px pr-28px text-xs`}
              >
                {project.stage}
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
      <div className="flex w-full flex-col items-end gap-x-24px gap-y-40px md:flex-row">
        {/* Info: (2024606 - Julian) Select Stage */}
        <div className="flex w-full flex-col items-start gap-8px text-input-text-primary md:w-auto">
          <p className="font-semibold">Stage</p>
          <div
            onClick={stageMenuClickHandler}
            className="relative flex h-44px w-full items-center justify-between rounded-xs border border-input-stroke-input bg-input-surface-input-background px-12px hover:cursor-pointer md:w-200px"
          >
            {filteredStage}
            <FaChevronDown />
            {displayedStageOptions}
          </div>
        </div>
        {/* Info: (2024606 - Julian) Search bar */}
        <div className="flex w-full flex-1 items-center rounded-xs border border-input-stroke-input bg-input-surface-input-background px-16px text-icon-surface-single-color-primary">
          <input
            id="project-search-bar"
            type="text"
            onChange={searchHandler}
            className="h-44px flex-1 outline-none placeholder:text-input-text-input-placeholder"
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
