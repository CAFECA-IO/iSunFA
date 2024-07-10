import { SortOptions } from '@/constants/display';

export enum SortOptionQuery {
  newest = 'newest',
  oldest = 'oldest',
}

export const sortOptionQuery = {
  [SortOptions.newest]: SortOptionQuery.newest,
  [SortOptions.oldest]: SortOptionQuery.oldest,
};
