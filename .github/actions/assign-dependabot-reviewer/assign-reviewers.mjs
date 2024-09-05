import axios from 'axios';
import {setFailed} from '@actions/core';
import {reviewersMap} from "./config/reviewers.mjs";
import github from "@actions/github";

const GH_TOKEN = process.env.GH_TOKEN;
console.log('GH_TOKEN', GH_TOKEN);
console.log('github context', github.context);

const REPO = github.context.repo.repo;
const REPO_OWNER = github.context.repo.owner;
const PR_NUMBER = github.context.payload.pull_request.number;
const octokit = github.getOctokit(GH_TOKEN)

const headers = {
    'Authorization': `token ${GH_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
};

async function assignReviewers(team_reviewers) {
    console.log(`Assign reviewers REPO=${REPO} PR=${PR_NUMBER} OWNER=${REPO_OWNER} reviewers=${team_reviewers}`);
    const response = await octokit.rest.pulls.requestReviewers({
        owner: REPO_OWNER,
        repo: REPO,
        pull_number: PR_NUMBER,
        team_reviewers
    });

    console.log("response", response.data)

    return response.status === 201;
}

function getDependencyNameRegex(str) {
    if (str.includes('group')) {
        return /the (\S+) group/;
    }

    return /Bump (\S+) from/
}

function extractDependencyName(str) {
    console.log(str);
  const match = str.match(getDependencyNameRegex(str));
    console.log(match[1]);
  if (match) {
    // Return the first non-null capture group which contains the dependency name
    return (match[1] || match[2] || '').trim();
  }
  return null; // If no match is found
}

async function main() {
    try {
        const prTitle = github.context.payload.pull_request.title || '';
        // Determine the dependency using the title of the PR

        const reviewers = [];
        const dependencyName = extractDependencyName(prTitle);
        const reviewer = reviewersMap[dependencyName];
        console.log(`Found ${reviewer} for ${dependencyName}`)

        if (reviewer != null) {
            reviewers.push(reviewer);
        }

        if (reviewers.length > 0) {
            const assigned = await assignReviewers(reviewers);
            if (assigned) {
                console.log(`Successfully assigned reviewers: ${reviewers.join(', ')}`);
            } else {
                console.error('Failed to assign reviewers.');
            }
        } else {
            console.log('No reviewers to assign based on updated dependencies.');
        }
    } catch (error) {
        console.error('Error:', error.message);
        setFailed(error.message);
    }
}

main();
