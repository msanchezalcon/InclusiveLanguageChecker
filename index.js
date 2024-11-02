const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

const loadTerms = () => {
  const filePath = path.join(__dirname, 'nonInclusiveWords.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content).terms;
};

const checkFiles = async (files) => {
  const termsMap = loadTerms();
  let comments = [];

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      Object.keys(termsMap).forEach((term) => {
        if (content.includes(term)) {
          const suggestions = termsMap[term].join(', ');
          comments.push(`Non-inclusive term found in ${file}: "${term}". Suggested replacements: ${suggestions}.`);
        }
      });
    } else {
      core.warning(`File not found: ${filePath}`);
    }
  }

  return comments;
};

async function run() {
  try {
    const filesInput = core.getInput('files');
    const files = filesInput.split(',').map(file => file.trim());

    const comments = await checkFiles(files);

    if (comments.length > 0) {
      const context = github.context;
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

      const pullRequestNumber = context.payload.pull_request?.number;

      if (pullRequestNumber) {
        for (const comment of comments) {
          await octokit.rest.issues.createComment({
            ...context.repo,
            issue_number: pullRequestNumber,
            body: comment,
          });
        }
      } else {
        core.info('Non-inclusive language found:');
        comments.forEach(comment => {
          core.info(comment);
        });
      }
    } else {
      core.info('No non-inclusive language found.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
