// update_version.ts

import * as fs from 'fs';
import * as path from 'path';

// Absolute path to package.json
const packageJsonPath: string = path.resolve(__dirname, '../package.json');

// Read package.json
const packageJsonContent: string = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);

// Extract current version and metadata parts
const [version, metadata]: string[] = packageJson.version.split('+');

// Increment metadata part
const newMetadata: string = metadata ? String(Number(metadata) + 1) : '1'; // Start from 1 if metadata part doesn't exist
const newVersion: string = `${version}+${newMetadata}`;

// Update package.json with new version
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Info: (20240627 - Jacky) Log the new version
// eslint-disable-next-line no-console
console.log(`Version updated to ${newVersion}`);
