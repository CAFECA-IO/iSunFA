import { SortBy, SortOrder } from '@/constants/sort';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';

export function parseSortOption(
  defaultSortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[],
  sortOptionString: string | undefined
): {
  sortBy: SortBy;
  sortOrder: SortOrder;
}[] {
  try {
    if (!sortOptionString) {
      return defaultSortOption;
    }

    const optionsString = sortOptionString.startsWith('sortOption=')
      ? sortOptionString.substring('sortOption='.length)
      : sortOptionString;

    const parseResult = zodFilterSectionSortingOptions().safeParse(optionsString);
    if (!parseResult.success) {
      return defaultSortOption;
    }
    const sortOptionParsed = parseResult.data;
    return sortOptionParsed;
  } catch (error) {
    (error as Error).message += ` | parseSortOption Failed`;
    return defaultSortOption;
  }
}

export const createOrderByList = (sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) => {
  return sortOptions.map(({ sortBy, sortOrder }) => ({
    createdAt: sortBy === SortBy.CREATED_AT || sortBy === SortBy.DATE ? sortOrder : SortOrder.DESC,
  }));
};
