import { SortBy } from '@/constants/journal';
import { NewsType } from '@/constants/news';
import { SortOrder } from '@/constants/sort';
import {
  createNews,
  deleteNewsForTesting,
  listNews,
  listNewsSimple,
  getNewsById,
} from '@/lib/utils/repo/news.repo';
import { getTimestampNow } from '@/lib/utils/common';

describe('News Repository', () => {
  describe('createNews', () => {
    it('should create a new news item', async () => {
      const imageId = 555;
      const title = 'Test News Title';
      const content = 'Test News Content';
      const type = NewsType.FINANCIAL;
      const news = await createNews(imageId, title, content, type);
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
        startDateInSecond,
        endDateInSecond,
        searchQuery,
        sortOrder,
        sortBy
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

  describe('getNewsById', () => {
    it('should return a news item by ID', async () => {
      const imageId = 555;
      const title = 'Test News Title';
      const content = 'Test News Content';
      const type = NewsType.FINANCIAL;
      const createdNews = await createNews(imageId, title, content, type);
      const news = await getNewsById(createdNews!.id);
      await deleteNewsForTesting(createdNews!.id);
      expect(news).toBeDefined();
      expect(news!.id).toBe(createdNews!.id);
      expect(news!.title).toBe(title);
      expect(news!.content).toBe(content);
      expect(news!.type).toBe(type);
    });

    it('should return null if news item does not exist', async () => {
      const news = await getNewsById(999999); // Info: (20241024 - Jacky) Assuming this ID does not exist
      expect(news).toBeNull();
    });
  });
});
