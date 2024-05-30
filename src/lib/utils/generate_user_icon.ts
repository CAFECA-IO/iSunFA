import { FORMIDABLE_CONFIG } from '@/constants/config';
import { promises as fs } from 'fs';
import path from 'path';
import { transformOCRImageIDToURL } from './common';

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

function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function generateRandomUUID() {
  return crypto.randomUUID();
}

function generateUserIconSvg(initials: string, backgroundColor: string) {
  return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" stroke="${backgroundColor}" stroke-width="3" fill="${backgroundColor}" />
  <text x="100" y="105" font-size="48" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF">${initials}</text>
</svg>`;
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

function getFileNameFromPath(filepath: string) {
  const parts = filepath.split('/');
  return parts[parts.length - 1];
}
export async function generateUserIcon(name: string) {
  const initials = generateInitials(name);
  const backgroundColor = generateRandomColor();
  const iconSvg = generateUserIconSvg(initials, backgroundColor);
  const filepath = await generateSvgSavePath();
  await saveUserIconToFile(iconSvg, filepath);
  const filename = getFileNameFromPath(filepath);
  const url = transformOCRImageIDToURL('invoice', 0, filename);
  return url;
}
