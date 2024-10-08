import Image from 'next/image';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'next-i18next';
import ProjectCard from '@/components/project_card/project_card';
import { IProject } from '@/interfaces/project';
import Pagination from '@/components/pagination/pagination';

interface IProjectListProps {
  projects: IProject[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}

const ProjectList = ({ projects, currentPage, setCurrentPage, totalPages }: IProjectListProps) => {
  const { t } = useTranslation('common');
  const displayedProjectList =
    projects.length > 0 ? (
      <div className="flex w-full flex-col items-center gap-y-16px">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <div className="mt-80px">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    ) : (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
        <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
        <p>{t('common:COMMON.EMPTY')}</p>
      </div>
    );

  return displayedProjectList;
};

export default ProjectList;
