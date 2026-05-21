#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const TestRailClient = require('./src/testrail');
const { fetchAllData } = require('./src/dataFetcher');
const { generateReport } = require('./src/reportGenerator');

async function main() {
  // Load config
  const configPath = path.resolve('config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: config.json not found. Copy config.example.json and fill in your details.');
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error: Failed to parse config.json —', err.message);
    process.exit(1);
  }

  const { testrail, projects, outputFile } = config;

  if (!testrail?.url || !testrail?.username || !testrail?.apiKey) {
    console.error('Error: config.json must include testrail.url, testrail.username, and testrail.apiKey.');
    process.exit(1);
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    console.error('Error: config.json must include a non-empty "projects" array.');
    process.exit(1);
  }

  const outputPath = path.resolve(outputFile || 'coverage-report.html');
  const client = new TestRailClient(testrail);

  console.log('TestRail Automation Coverage Report');
  console.log('=====================================');
  console.log(`Instance : ${testrail.url}`);
  console.log(`Projects : ${projects.length}`);
  console.log(`Output   : ${outputPath}`);
  console.log('');
  console.log('Fetching data from TestRail...');

  let data;
  try {
    data = await fetchAllData(client, projects, config.excludedSuiteIds || []);
  } catch (err) {
    console.error('\nFailed to fetch data:', err.message);
    process.exit(1);
  }

  console.log('\nGenerating HTML report...');
  try {
    generateReport(data, testrail.url, outputPath);
  } catch (err) {
    console.error('Failed to generate report:', err.message);
    process.exit(1);
  }

  console.log(`\nReport saved to: ${outputPath}`);

  // Summary
  for (const project of data) {
    console.log(`\n  ${project.name}`);
    for (const suite of project.suites) {
      console.log(`    S${suite.id}  ${suite.name.padEnd(40)} ${suite.automatedPercent}% automated (${suite.automatedCount}/${suite.total})`);
    }
  }
}

main();
