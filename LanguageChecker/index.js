const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

console.log('Starting action...');

console.log('Current working directory:', process.cwd());

console.log('Environment variables:', process.env);

const loadTerms = () => {
  const filePath = path.join(__dirname, 'nonInclusiveWords.json');
  console.log('Loading terms from:', filePath);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content).terms;
};

const checkFiles = async (files) => {
  const termsMap = loadTerms();
  let comments = [];

  for (const file of files) {
    console.log('Checking file:', file);
    const content = fs.readFileSync(file, 'utf-8');
    
    Object.keys(termsMap).forEach((term) => {
      if (content.includes(term)) {
        const suggestions = termsMap[term].join(', ');
        comments.push(`Non-inclusive term found in ${file}: "${term}". Suggested replacements: ${suggestions}.`);
      }
    });
  }

  return comments;
};

async function run() {
  try {
    const files = process.argv.slice(2);
    console.log('Files to check:', files);
    const comments = await checkFiles(files);
    
    if (comments.length > 0) {
      const context = github.context;
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

      const pullRequestNumber = context.payload.pull_request.number;

      if (pullRequestNumber) {
        for (const comment of comments) {
          await octokit.rest.issues.createComment({
            ...context.repo,
            issue_number: pullRequestNumber,
            body: comment,
          });
        }
      } else {
        core.setFailed('No pull request found.');
      }
    } else {
      core.info('No non-inclusive language found.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
