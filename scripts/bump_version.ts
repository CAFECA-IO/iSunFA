import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const content = fs.readFileSync(packageJsonPath, 'utf8');
const pkg = JSON.parse(content);

if (pkg.version && pkg.version.includes('+')) {
  const [base, buildStr] = pkg.version.split('+');
  const buildNum = parseInt(buildStr, 10);
  if (!isNaN(buildNum)) {
    pkg.version = `${base}+${buildNum + 1}`;

    const endsWithNewline = content.endsWith('\n');
    let newContent = JSON.stringify(pkg, null, 2);
    if (endsWithNewline) {
      newContent += '\n';
    }

    fs.writeFileSync(packageJsonPath, newContent, 'utf8');
    console.log(`Version bumped to ${pkg.version}`);
  } else {
    console.log(`No valid build number found after '+'. Skipping bump.`);
  }
} else {
  console.log(`No '+' found in version (${pkg.version}). Skipping bump.`);
}
