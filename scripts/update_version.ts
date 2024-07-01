// update_version.ts

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Function to get the last committed version of package.json
function getLastCommittedVersion(): string | null {
  let lastCommittedVersion: string | null = null;
  try {
    const lastCommittedPackageJsonContent: string = execSync(
      `git show HEAD:package.json`
    ).toString();
    const lastCommittedPackageJson = JSON.parse(lastCommittedPackageJsonContent);
    lastCommittedVersion = lastCommittedPackageJson.version;
  } catch (error) {
    lastCommittedVersion = null;
  }
  return lastCommittedVersion;
}

// Absolute path to package.json
const packageJsonPath: string = path.resolve(__dirname, '../package.json');

// Read the current package.json content
let packageJsonContent: string;
let packageJson: { version: string };

try {
  packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  // Info:(20240701-Jacky) - Log the error
  // eslint-disable-next-line no-console
  console.error('Error reading package.json:', error);
  process.exit(1); // Exit the process with an error code
}

// Extract current version and metadata parts
const [currentVersion, currentMetadata]: string[] = packageJson.version.split('+');

// Get the last committed version
const lastCommittedVersion: string | null = getLastCommittedVersion();

// Determine new version
let newVersion: string;

if (lastCommittedVersion) {
  const [lastCommittedMainVersion]: string[] = lastCommittedVersion.split('+');
  if (currentVersion !== lastCommittedMainVersion) {
    // If the main version part has changed, do not add metadata
    newVersion = `${currentVersion}`;
  } else {
    // If the main version part has not changed, increment the metadata part
    const newMetadata: string = currentMetadata ? String(Number(currentMetadata) + 1) : '1'; // Start from 1 if metadata part doesn't exist
    newVersion = `${currentVersion}+${newMetadata}`;
  }
} else {
  // If there is no last committed version, start with the current version
  newVersion = `${currentVersion}`;
}

// Update package.json with the new version
try {
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
} catch (error) {
  // Info:(20240701-Jacky) - Log the error
  // eslint-disable-next-line no-console
  console.error('Error writing package.json:', error);
  process.exit(1); // Exit the process with an error code
}

// Info:(20240701-Jacky) - Log the updated version
// eslint-disable-next-line no-console
console.log(`Version updated to ${newVersion}`);
