import { FORMIDABLE_CONFIG, USER_ICON_BACKGROUND_COLORS } from '@/constants/config';
import { promises as fs } from 'fs';
import path from 'path';
import { mkUploadFolder } from '@/lib/utils/common';
import { generateDestinationFileNameInGoogleBucket, uploadGoogleFile } from '@/lib/utils/google_image_upload';

const savePath =
  process.env.VERCEL === '1'
    ? FORMIDABLE_CONFIG.uploadDir
    : path.join(process.cwd(), FORMIDABLE_CONFIG.uploadDir);

function isChinese(name: string) {
  return /[\u3400-\u9FBF]/.test(name);
}

function generateInitials(name: string) {
  if (isChinese(name)) {
    return name.slice(-2);
  } else {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    } else {
      const lastNameIdx = parts.length - 1;
      return parts[0][0].toUpperCase() + parts[lastNameIdx][0].toUpperCase();
    }
  }
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
  return `
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
}

async function saveUserIconToFile(iconSvg: string, filepath: string) {
  await fs.writeFile(filepath, iconSvg);
}

async function generateSvgSavePath() {
  const tmpDir = savePath;
  const filename = generateRandomUUID() + '.svg';
  const filepath = `${tmpDir}/${filename}`;
  return filepath;
}

// Deprecated: (20240604 - Murky) This function is not used anymore
// function getFileNameFromPath(filepath: string) {
//   const parts = filepath.split('/');
//   return parts[parts.length - 1];
// }

export async function generateUserIcon(name: string) {
  let iconUrl = '';
  try {
    await mkUploadFolder();
    const initials = generateInitials(name);
    const backgroundColor = generateRandomColor();
    const iconSvg = generateUserIconSvg(
      initials,
      backgroundColor.lightMode,
      backgroundColor.darkMode
    );
    const filepath = await generateSvgSavePath();
    await saveUserIconToFile(iconSvg, filepath);

    const filePathInGoogleBucket = generateDestinationFileNameInGoogleBucket(filepath);

    const uploadGoogle = uploadGoogleFile(filepath, filePathInGoogleBucket);
    iconUrl = await uploadGoogle();
  } catch (error) {
    // Info: For debugging purpose
    // eslint-disable-next-line no-console
    console.error('Failed to generate user icon', error);
  }

  return iconUrl;
}
