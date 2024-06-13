export enum ProjectStage {
  DESIGNING = 'Designing',
  DEVELOPING = 'Developing',
  BETA_TESTING = 'Beta Testing',
  SELLING = 'Selling',
  SOLD = 'Sold',
  ARCHIVED = 'Archived',
}

export const stageList = [
  ProjectStage.DESIGNING,
  ProjectStage.DEVELOPING,
  ProjectStage.BETA_TESTING,
  ProjectStage.SELLING,
  ProjectStage.SOLD,
  ProjectStage.ARCHIVED,
];

// Info: (2024606 - Julian) Stage 顏色對照表
export const stageColorMap = {
  [ProjectStage.DESIGNING]: {
    bg: 'bg-surface-support-strong-maple',
    text: 'text-text-support-maple',
    border: 'border-stroke-support-maple',
  },
  [ProjectStage.DEVELOPING]: {
    bg: 'bg-surface-support-strong-green',
    text: 'text-text-support-green',
    border: 'border-stroke-support-green',
  },
  [ProjectStage.BETA_TESTING]: {
    bg: 'bg-surface-support-strong-indigo',
    text: 'text-text-support-indigo',
    border: 'border-stroke-support-indigo',
  },
  [ProjectStage.SELLING]: {
    bg: 'bg-surface-support-strong-taro',
    text: 'text-text-support-taro',
    border: 'border-stroke-support-taro',
  },
  [ProjectStage.SOLD]: {
    bg: 'bg-surface-support-strong-rose',
    text: 'text-text-support-rose',
    border: 'border-stroke-support-rose',
  },
  [ProjectStage.ARCHIVED]: {
    bg: 'bg-surface-neutral-mute',
    text: 'text-text-neutral-mute',
    border: 'border-stroke-neutral-mute',
  },
};
