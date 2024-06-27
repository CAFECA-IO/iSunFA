// update_version.js

const fs = require('fs');
const path = require('path');

// Absolute path to package.json
const packageJsonPath = path.resolve(__dirname, '../package.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Extract current version and metadata parts
const [version, metadata] = packageJson.version.split('+');

// Increment metadata part
const newMetadata = metadata ? String(Number(metadata) + 1) : '1'; // Start from 1 if metadata part doesn't exist
const newVersion = `${version}+${newMetadata}`;

// Update package.json with new version
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
