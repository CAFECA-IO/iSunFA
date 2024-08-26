import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Info: (20240701 - Jacky) Function to get the last committed version of package.json
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

// Info: (20240701 - Jacky) Absolute path to package.json
const packageJsonPath: string = path.resolve(__dirname, '../package.json');

// Info: (20240701 - Jacky) Read the current package.json content
let packageJsonContent: string;
let packageJson: { version: string };

try {
  packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
  process.exit(1); // Info: (20240701 - Jacky) Exit the process with an error code
}

// Info: (20240701 - Jacky) Extract current version and metadata parts
const [currentVersion, currentMetadata]: string[] = packageJson.version.split('+');

// Info: (20240701 - Jacky) Get the last committed version
const lastCommittedVersion: string | null = getLastCommittedVersion();

// Info: (20240701 - Jacky) Determine new version
let newVersion: string;

if (lastCommittedVersion) {
  const [lastCommittedMainVersion]: string[] = lastCommittedVersion.split('+');
  if (currentVersion !== lastCommittedMainVersion) {
    // Info: (20240701 - Jacky) If the main version part has changed, do not add metadata
    newVersion = `${currentVersion}`;
  } else {
    // Info: (20240701 - Jacky) If the main version part has not changed, increment the metadata part
    const newMetadata: string = currentMetadata ? String(Number(currentMetadata) + 1) : '1'; // Info: (20240701 - Jacky) Start from 1 if metadata part doesn't exist
    newVersion = `${currentVersion}+${newMetadata}`;
  }
} else {
  // Info: (20240701 - Jacky) If there is no last committed version, start with the current version
  newVersion = `${currentVersion}`;
}

// Info: (20240701 - Jacky) Update package.json with the new version
try {
  packageJson.version = newVersion;
  // Info:(20240730 - Jacky) - Add last line to prevent EOF error
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
} catch (error) {
  // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
  process.exit(1); // Info: (20240701 - Jacky) Exit the process with an error code
}

// Info:(20240701-Jacky) - Log the updated version
// Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
