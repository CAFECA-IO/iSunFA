import {
  ISocialMedia,
  ISocialMediaSetting,
  ShareSettings,
  SocialMediaConstant,
} from '@/constants/social_media';

interface IShare {
  socialMedia: ISocialMedia;
  text?: string;
  size?: string;
}

interface IUseShareProcess {
  sharePath: string;
}

const useShareProcess = ({ sharePath }: IUseShareProcess) => {
  const shareOn = ({ url, text, type, size }: ISocialMediaSetting) => {
    const domain = process.env.WEB_URL;
    const shareUrl = `${domain}/${sharePath}`;

    if (shareUrl === '') throw new Error('Share url is empty');

    window.open(`${url}${encodeURIComponent(shareUrl)}${text}`, `${type}`, `${size}`);
  };

  const share = async ({ socialMedia, text, size }: IShare) => {
    switch (socialMedia) {
      case SocialMediaConstant.FACEBOOK:
        await shareOn({
          url: ShareSettings.FACEBOOK.url,
          type: ShareSettings.FACEBOOK.type,
          // Info: (20250507 - Julian) Facebook 已經不支援 text 參數
          size: size ?? ShareSettings.FACEBOOK.size,
        });
        break;

      case SocialMediaConstant.TWITTER:
        await shareOn({
          url: ShareSettings.TWITTER.url,
          type: ShareSettings.TWITTER.type,
          text: text ? `&text=${encodeURIComponent(text)}` : '',
          size: size ?? ShareSettings.TWITTER.size,
        });
        break;

      case SocialMediaConstant.LINE:
        await shareOn({
          url: ShareSettings.LINE.url,
          type: ShareSettings.LINE.type,
          text: text ? `&text=${encodeURIComponent(text)}` : '',
          size: size ?? ShareSettings.LINE.size,
        });
        break;
      default:
        throw new Error('Invalid social media type');
    }
  };

  return { share };
};

export default useShareProcess;
