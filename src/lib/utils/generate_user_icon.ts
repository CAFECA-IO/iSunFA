import { USER_ICON_BACKGROUND_COLORS } from '@/constants/config';
import path from 'path';
import {
  generateDestinationFileNameInGoogleBucket,
  uploadFileToGoogleCloud,
} from '@/lib/utils/google_image_upload';
import { BASE_STORAGE_FOLDER, VERCEL_STORAGE_FOLDER } from '@/constants/file';

const savePath =
  process.env.VERCEL === '1' ? VERCEL_STORAGE_FOLDER : path.join(BASE_STORAGE_FOLDER, 'tmp');

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

function generateRandomUUID() {
  return crypto.randomUUID();
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

export async function generateSavePath(fileExtension: string) {
  const tmpDir = savePath;
  const filename = generateRandomUUID() + '.' + fileExtension;
  const filepath = `${tmpDir}/${filename}`;
  return filepath;
}

export async function generateIcon(name: string) {
  let iconUrl = '';
  try {
    // await mkUploadFolder();
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
  } catch (error) {
    iconUrl = '';
  }
  return iconUrl;
}
