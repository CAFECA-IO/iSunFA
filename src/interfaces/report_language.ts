export enum ReportLanguagesKey {
  en = 'en',
  tw = 'tw',
  cn = 'cn',
}

// TODO: (20240430 - Shirley) i18n
export const ReportLanguagesMap: Record<
  ReportLanguagesKey,
  { id: ReportLanguagesKey; name: string; icon: string }
> = {
  en: { id: ReportLanguagesKey.en, name: 'English', icon: '/icons/en.svg' },
  tw: { id: ReportLanguagesKey.tw, name: '繁體中文', icon: '/icons/tw.svg' },
  cn: { id: ReportLanguagesKey.cn, name: '简体中文', icon: '/icons/cn.svg' },
};
