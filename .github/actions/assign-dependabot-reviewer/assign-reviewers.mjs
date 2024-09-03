import axios from 'axios';
import {setFailed} from '@actions/core';
import {reviewersMap} from "./config/reviewers.mjs";
import { Octokit } from '@octokit/action'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;
const octokit = new Octokit();

const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
};

/**
 * Pull the PR details from the
 * @returns {Promise<any>}
 */
async function getPRDetails() {
    return await octokit.rest.pulls.get({
        repo: REPO,
        pull_number: PR_NUMBER
    })
}

async function assignReviewers(team_reviewers) {
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
