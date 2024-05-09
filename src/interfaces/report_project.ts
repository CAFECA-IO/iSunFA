export interface IReportProject {
  id: string;
  name: string;
  icon: string;
}

export const DUMMY_PROJECTS_MAP: Record<string, IReportProject> = {
  Overall: { id: 'overall', name: 'Overall', icon: '' },
  'Project AB': { id: 'project_ab', name: 'Project AB', icon: '/icons/project_a.svg' },
  'Project BN': { id: 'project_bn', name: 'Project BN', icon: '/icons/project_b.svg' },
  'Project CQ': { id: 'project_cq', name: 'Project CQ', icon: '/icons/project_c.svg' },
  'Project DR': { id: 'project_dr', name: 'Project DR', icon: '/icons/project_d.svg' },
  'Project ES': { id: 'project_es', name: 'Project ES', icon: '' },
  'Project FT': { id: 'project_ft', name: 'Project FT', icon: '' },
  'Project GU': { id: 'project_gu', name: 'Project GU', icon: '' },
  'Project IW': { id: 'project_iw', name: 'Project IW', icon: '' },
  'Project JX': { id: 'project_jx', name: 'Project JX', icon: '' },
  'Project KI': { id: 'project_ki', name: 'Project KI', icon: '' },
};
