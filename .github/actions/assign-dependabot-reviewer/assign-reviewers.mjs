import axios from 'axios';
import {setFailed} from '@actions/core';
import {reviewersMap} from "./config/reviewers.mjs";
import github from "@actions/github";
import core from "@actions/core";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
console.log('GH_TOKEN', GITHUB_TOKEN);
const token = core.getInput('GITHUB_TOKEN', {required: true});

console.log('token', token);


const REPO = github.context.repo.repo;
const REPO_OWNER = github.context.repo.owner;
const PR_NUMBER = github.context.payload.pull_request.number;
const octokit = github.getOctokit(token)

const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
};

/**
 * Pull the PR details from the
 * @returns {Promise<any>}
 */
async function getPRDetails() {
    console.log(`Retrieving PR details OWNER=${REPO_OWNER} REPO=${REPO} PR=${PR_NUMBER}`);
    return await octokit.rest.pulls.get({
        owner: REPO_OWNER,
        repo: REPO,
        pull_number: PR_NUMBER
    })
}

async function assignReviewers(team_reviewers) {
    console.log(`Assign reviewers REPO=${REPO} PR=${PR_NUMBER} reviewers=${team_reviewers}`);
    const url = `https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/requested_reviewers`;
    const response = await axios.post(url, {
        team_reviewers,
    }, {headers});

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
        const prDetails = await getPRDetails();
        const prTitle = prDetails.title || '';
        // Determine the dependency using the title of the PR

        const reviewers = new Set();
        const dependencyName = extractDependencyName(prTitle);
        console.log(reviewersMap[dependencyName]);

        if (reviewers.size > 0) {
            const assigned = await assignReviewers(Array.from(reviewers));
            if (assigned) {
                console.log(`Successfully assigned reviewers: ${Array.from(reviewers).join(', ')}`);
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
