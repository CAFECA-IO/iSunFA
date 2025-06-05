import { z } from 'zod';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';

export const vacancyQueryValidator = z.object({
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
  location: z.string().optional(),
});

export const IVacancyValidator = z.object({
  id: z.number(),
  title: z.string(),
  location: z.string(),
  date: z.number(),
  description: z.string(),
  isOpen: z.boolean(),
});

export const IVacancyDetailValidator = IVacancyValidator.extend({
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  extraSkills: z.array(z.string()),
});
