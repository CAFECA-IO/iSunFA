import { USER_ICON_BACKGROUND_COLORS } from '@/constants/config';
import {
  generateDestinationFileNameInGoogleBucket,
  generateSavePath,
  uploadFileToGoogleCloud,
} from '@/lib/utils/google_image_upload';
import logger from '@/lib/utils/logger_back';

function isChinese(name: string): boolean {
  return /[\u3400-\u9FBF]/.test(name);
}

function generateInitials(name: string): string {
  const cleanedName = name.trim();
  let initials = '';

  if (isChinese(cleanedName)) {
    initials = cleanedName.slice(-2);
  } else {
    const parts = cleanedName.split(/\s+/).map((part) => part.replace(/[^a-zA-Z0-9]/g, ''));
    if (parts.length === 1) {
      initials = parts[0].slice(0, 2).toUpperCase();
    } else {
      const lastNameIdx = parts.length - 1;
      initials = (parts[0][0] + parts[lastNameIdx][0]).toUpperCase();
    }
  }

  return initials;
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function generateRandomColor() {
  const colorsLen = USER_ICON_BACKGROUND_COLORS.length;
  const randomIdx = getRandomInt(colorsLen);
  return USER_ICON_BACKGROUND_COLORS[randomIdx];
}

function generateUserIconSvg(
  initials: string,
  backgroundColor: string,
  darkBackgroundColor: string
) {
  const svgContent = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <style>
        circle {
          fill: ${backgroundColor};
          stroke: ${backgroundColor};
        }
        text {
          fill: #FFFFFF;
          font-family: sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          circle {
            fill: ${darkBackgroundColor};
            stroke: ${darkBackgroundColor};
          }
        }
      </style>
      <circle cx="100" cy="100" r="80" stroke-width="3" />
      <text x="100" y="105" font-size="48" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    </svg>
  `;
  const cleanedSvg = svgContent.replace(/\s+/g, ' ').trim();
  return cleanedSvg;
}

function getSizeAndMimeType(svg: string) {
  const mimeType = 'image/svg+xml';

  const blob = new Blob([svg], { type: mimeType });
  const { size } = blob;
  return {
    size,
    mimeType,
  };
}

export async function generateIcon(name: string) {
  let iconUrl = '';
  let mimeType = '';
  let size = 0;
  try {
    const initials = generateInitials(name);
    const backgroundColor = generateRandomColor();
    const iconSvg = generateUserIconSvg(
      initials,
      backgroundColor.lightMode,
      backgroundColor.darkMode
    );
    const filepath = await generateSavePath('svg');

    const destFileName = generateDestinationFileNameInGoogleBucket(filepath);

    iconUrl = await uploadFileToGoogleCloud(iconSvg, destFileName, 'image/svg+xml');
    const mimeAndSize = getSizeAndMimeType(iconSvg);
    mimeType = mimeAndSize.mimeType;
    size = mimeAndSize.size;
  } catch (error) {
    logger.error(error, 'Error happened in generateIcon in generate_user_icon.ts');
  }
  return {
    iconUrl,
    mimeType,
    size,
  };
}
