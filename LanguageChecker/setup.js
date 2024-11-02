const fs = require('fs');

const content = `
{
  "@actions/core": "^1.10.0",
  "@actions/github": "^5.0.0"
}
`;

fs.writeFileSync('package.json', content);
console.log('Dependencies added to package.json');
