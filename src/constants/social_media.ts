export type ISocialMedia = 'FACEBOOK' | 'TWITTER' | 'LINE';

export interface ISocialMediaConstant {
  FACEBOOK: ISocialMedia;
  TWITTER: ISocialMedia;
  LINE: ISocialMedia;
}

export const SocialMediaConstant: ISocialMediaConstant = {
  FACEBOOK: 'FACEBOOK',
  TWITTER: 'TWITTER',
  LINE: 'LINE',
};

export interface ISocialMediaSetting {
  url: string;
  type: string;
  text?: string;
  size: string;
}

export const ShareSettings: Record<ISocialMedia, ISocialMediaSetting> = {
  FACEBOOK: {
    url: 'https://www.facebook.com/sharer/sharer.php?u=',
    type: 'facebook-share-dialog',
    size: 'width=800,height=600',
  },
  TWITTER: {
    url: 'https://twitter.com/intent/tweet?url=',
    type: 'twitter-share-dialog',
    size: 'width=800,height=600',
  },
  LINE: {
    url: 'https://social-plugins.line.me/lineit/share?url=',
    type: 'line-share-dialog',
    size: 'width=1200,height=627',
  },
};
