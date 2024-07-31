import { SortOptions } from '@/constants/display';

export enum SortOptionQuery {
  newest = 'desc',
  oldest = 'asc',
}

export const sortOptionQuery = {
  [SortOptions.newest]: SortOptionQuery.newest,
  [SortOptions.oldest]: SortOptionQuery.oldest,
};
