import { ILoginPageProps } from '@/interfaces/page_props';

export type IPageQueryKeys = 'loginPage';

export interface IPageQueryItem {
  options: ILoginPageProps;
  actions: Record<string, string>;
}

export type IPageQueries = {
  [key in IPageQueryKeys]: IPageQueryItem;
};

/**
 * Info: (20240613 - Shirley)
 * options 與 page component 的 props 相同，代表該頁面可以接受哪些參數
 * actions 為 props 中 action 的選項之一，代表該頁面可以有哪些行為
 */
export const pageQueries: IPageQueries = {
  loginPage: {
    options: {
      invitation: 'invitation',
      action: 'action',
    },
    actions: {
      login: 'login',
      register: 'register',
    },
  },
};
