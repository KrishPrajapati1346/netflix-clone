const fs = require('fs');
const stripComments = require('strip-comments');
const { globSync } = require('glob');
const path = require('path');

const rootDir = '/Users/krishprajapati/Desktop/NetFlix';

const patterns = [
  `${rootDir}/backend/src/models/**/*.ts`,
  `${rootDir}/shared/src/**/*.ts`
];

let files = [];
for (const pattern of patterns) {
  files = files.concat(globSync(pattern));
}

for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // stripComments removes both line and block comments
    const stripped = stripComments(content);
    fs.writeFileSync(file, stripped, 'utf8');
    console.log(`Stripped comments from ${file}`);
  }
}
