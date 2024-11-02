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
  let comments = {};

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      Object.keys(termsMap).forEach((term) => {
        if (content.includes(term)) {
          if (!comments[file]) {
            comments[file] = [];
          }
          const suggestions = termsMap[term].join(', ');
          comments[file].push(`For the term: "${term}", consider replacing it with: **${suggestions}**.`);
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

    if (Object.keys(comments).length > 0) {
      const context = github.context;
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

      const pullRequestNumber = context.payload.pull_request?.number;

      if (pullRequestNumber) {
        let body = '🔍 **Non-inclusive language found:**\n\n';
        for (const [file, messages] of Object.entries(comments)) {
          body += `In \`${file}\`:\n`;
          messages.forEach(message => {
            body += `${message}\n`;
          });
          body += '\n';
        }
        body += 'Please consider using the suggested replacements for a more inclusive language! ✨';

        await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: pullRequestNumber,
          body: body,
        });
      } else {
        core.info('No pull request found; comments will not be posted.');
      }
    } else {
      core.info('No non-inclusive language found.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
