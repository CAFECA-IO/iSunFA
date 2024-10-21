import {
  createNews,
  deleteNewsForTesting,
  listNews,
  listNewsSimple,
} from '@/lib/utils/repo/news.repo';
import { NewsType } from '@/constants/news';
import { SortOrder } from '@/constants/sort';
import { SortBy } from '@/constants/journal';
import { getTimestampNow } from '@/lib/utils/common';

describe('News Repository', () => {
  describe('createNews', () => {
    it('should create a new news item', async () => {
      const title = 'Test News Title';
      const content = 'Test News Content';
      const type = NewsType.FINANCIAL;
      const news = await createNews(title, content, type);
      await deleteNewsForTesting(news!.id);
      expect(news).toBeDefined();
      expect(news!.title).toBe(title);
      expect(news!.content).toBe(content);
      expect(news!.type).toBe(type);
    });
  });

  describe('listNews', () => {
    it('should return a paginated list of news items', async () => {
      const type = NewsType.FINANCIAL;
      const targetPage = 1;
      const pageSize = 10;
      const sortOrder = SortOrder.DESC;
      const sortBy = SortBy.CREATED_AT;
      const startDateInSecond = getTimestampNow() - 100000;
      const endDateInSecond = getTimestampNow();
      const searchQuery = 'Test';

      const newsList = await listNews(
        type,
        targetPage,
        pageSize,
        sortOrder,
        sortBy,
        startDateInSecond,
        endDateInSecond,
        searchQuery
      );

      expect(newsList).toBeDefined();
      expect(Array.isArray(newsList.data)).toBe(true);
      expect(newsList.data.length).toBeLessThanOrEqual(pageSize);
      expect(newsList.page).toBe(targetPage);
      expect(newsList.totalPages).toBeGreaterThanOrEqual(0);
      expect(newsList.totalCount).toBeGreaterThanOrEqual(0);
      expect(newsList.pageSize).toBe(pageSize);
      expect(newsList.hasNextPage).toBeDefined();
      expect(newsList.hasPreviousPage).toBeDefined();
      expect(newsList.sort).toEqual([{ sortBy, sortOrder }]);
    });
  });

  describe('listNewsSimple', () => {
    it('should return a simple list of news items', async () => {
      const type = NewsType.FINANCIAL;
      const pageSize = 10;
      const newsList = await listNewsSimple(type, pageSize);
      expect(newsList).toBeDefined();
      expect(Array.isArray(newsList)).toBe(true);
      expect(newsList.length).toBeLessThanOrEqual(pageSize);
    });
  });
});
