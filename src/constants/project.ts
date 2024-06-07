export enum ProjectStage {
  DESIGNING = 'Designing',
  DEVELOPING = 'Developing',
  BETA_TESTING = 'Beta Testing',
  SELLING = 'Selling',
  SOLD = 'Sold',
  ARCHIVED = 'Archived',
}

// Info: (2024606 - Julian) Stage 顏色對照表
export const stageColorMap = {
  [ProjectStage.DESIGNING]: 'bg-surface-support-strong-maple',
  [ProjectStage.DEVELOPING]: 'bg-surface-support-strong-green',
  [ProjectStage.BETA_TESTING]: 'bg-surface-support-strong-indigo',
  [ProjectStage.SELLING]: 'bg-surface-support-strong-taro',
  [ProjectStage.SOLD]: 'bg-surface-support-strong-rose',
  [ProjectStage.ARCHIVED]: 'bg-surface-neutral-mute',
};
