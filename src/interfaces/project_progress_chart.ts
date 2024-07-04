import { useTranslation } from 'next-i18next';
import { timestampInSeconds } from '@/lib/utils/common';

export interface IProjectProgressChartData {
  date: number;
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
  empty: boolean;
}

// 使用 useTranslation 來獲取翻譯
// export function useTranslatedCategories() {
//   const { t } = useTranslation();
//   return [
//     t('STAGE_NAME_MAP.DESIGNING'),
//     t('STAGE_NAME_MAP.BETA_TESTING'),
//     t('STAGE_NAME_MAP.DEVELOPING'),
//     t('STAGE_NAME_MAP.SOLD'),
//     t('STAGE_NAME_MAP.SELLING'),
//     t('STAGE_NAME_MAP.ARCHIVED'),
//   ];
// }

export const DUMMY_CATEGORIES = [
  'Designing',
  'Beta Testing',
  'Develop',
  'Sold',
  'Selling',
  'Archived',
];

// 使用 useTranslation 來獲取翻譯
export function useTranslatedCategories() {
  const { t } = useTranslation('common');
  return DUMMY_CATEGORIES.map((category) =>
    t(`STAGE_NAME_MAP.${category.toUpperCase().replace(' ', '_')}`)
  );
}

export function generateRandomData(): IProjectProgressChartData {
  // const categories = useTranslatedCategories();
  return {
    date: timestampInSeconds(new Date('2024-04-01').getTime()),
    categories: DUMMY_CATEGORIES,
    // categories,
    series: [
      {
        name: 'Projects',
        data: [
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
          Math.floor(Math.random() * 200),
        ],
      },
    ],
    empty: false,
  };
}

// Info: 註冊日期或第一個專案的日期 (20240513 - Shirley)
export const DUMMY_START_DATE = '2024/02/12';
