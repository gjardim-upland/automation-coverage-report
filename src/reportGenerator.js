'use strict';

const fs = require('fs');

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function renderCaseTable(cases, testrailUrl) {
  if (cases.length === 0) return '<p class="empty-note">No test cases.</p>';

  const rows = cases
    .map((c, i) => {
      const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd';
      const caseUrl = `${testrailUrl}/index.php?/cases/view/${c.id}`;
      return `
        <tr class="${rowClass}">
          <td>${esc(c.location)}</td>
          <td><a href="${esc(caseUrl)}" target="_blank" rel="noopener" class="case-link">C${esc(c.id)}</a></td>
          <td>${esc(c.title)}</td>
        </tr>`;
    })
    .join('');

  return `
    <table class="case-table">
      <thead>
        <tr>
          <th>Test case location</th>
          <th>Test case ID</th>
          <th>Test case name</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderCollapsibleSection(id, label, count, cases, testrailUrl, defaultOpen) {
  const icon = defaultOpen ? '&ndash;' : '+';
  const display = defaultOpen ? '' : ' style="display:none"';
  return `
    <div class="section-header" onclick="toggleSection('${id}')">
      ${esc(label)}: ${count} <span class="toggle-icon" id="icon-${id}">${icon}</span>
    </div>
    <div id="${id}"${display}>
      ${renderCaseTable(cases, testrailUrl)}
    </div>`;
}

function renderSuitePage(suite, projectName, testrailUrl) {
  const pageId = `suite-page-${suite.id}`;
  const autoId = `auto-${suite.id}`;
  const nonAutoId = `nonauto-${suite.id}`;
  const cannotId = `cannot-${suite.id}`;

  return `
  <div id="${pageId}" class="page" style="display:none">
    <div class="container">
      <div class="back-link">
        <a href="#" onclick="showProjects(); return false;">&larr; Back to Projects</a>
      </div>
      <h2 class="suite-title">S${esc(suite.id)} &ndash; ${esc(suite.name)}</h2>
      <p class="suite-project-label">${esc(projectName)}</p>

      ${renderCollapsibleSection(autoId, 'Automated tests', suite.automatedCount, suite.automatedCases, testrailUrl, true)}
      ${renderCollapsibleSection(nonAutoId, 'Non-automated tests', suite.nonAutomatedCases.length, suite.nonAutomatedCases, testrailUrl, false)}
      ${renderCollapsibleSection(cannotId, 'Cannot be automated', suite.cannotCases.length, suite.cannotCases, testrailUrl, false)}
    </div>
  </div>`;
}

function renderProjectBlock(project, index) {
  const projectElId = `project-${index}`;

  const suiteRows = project.suites
    .map((suite, i) => {
      const rowClass = i % 2 === 0 ? 'row-even' : 'row-odd';
      return `
        <tr class="${rowClass}">
          <td>S${esc(suite.id)}</td>
          <td>
            <a href="#" onclick="showSuite('suite-page-${suite.id}'); return false;" class="suite-link">
              ${esc(suite.name)}
            </a>
          </td>
          <td>${suite.total}</td>
          <td>${suite.automatedCount}</td>
          <td>${suite.automatedPercent} %</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="project-item">
      <div class="project-toggle" onclick="toggleProject('${projectElId}')">
        <span class="project-name">${esc(project.name)}</span>
        <span class="toggle-icon" id="icon-${projectElId}">+</span>
      </div>
      <div class="project-body" id="${projectElId}" style="display:none">
        <table class="suite-table">
          <thead>
            <tr>
              <th>Suite ID</th>
              <th>Suite name</th>
              <th>Total test cases</th>
              <th>Automated tests</th>
              <th>Automated %</th>
            </tr>
          </thead>
          <tbody>${suiteRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 14px;
    color: #212529;
    background: #f8f9fa;
    padding: 32px 16px;
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #adb5bd;
    border-radius: 4px;
    padding: 40px 48px;
  }

  h1 {
    font-size: 22px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 28px;
    color: #111;
  }

  /* ---- Projects list ---- */
  .project-item {
    margin-bottom: 6px;
  }

  .project-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 0;
    user-select: none;
  }

  .project-name {
    color: #6c757d;
    font-size: 15px;
  }

  .project-toggle .toggle-icon {
    color: #2e6da4;
    font-weight: 700;
    font-size: 16px;
  }

  .project-body {
    margin: 10px 0 20px 0;
  }

  /* ---- Suite table (on projects page) ---- */
  .suite-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
  }

  .suite-table thead tr {
    background: #2e6da4;
    color: #fff;
  }

  .suite-table th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
  }

  .suite-table td {
    padding: 9px 12px;
    font-size: 13px;
  }

  .suite-link {
    color: #2e6da4;
    text-decoration: none;
  }
  .suite-link:hover { text-decoration: underline; }

  /* ---- Suite detail page ---- */
  .back-link {
    margin-bottom: 20px;
    font-size: 13px;
  }
  .back-link a {
    color: #2e6da4;
    text-decoration: none;
  }
  .back-link a:hover { text-decoration: underline; }

  h2.suite-title {
    font-size: 20px;
    font-weight: 700;
    color: #2e6da4;
    margin-bottom: 4px;
  }

  .suite-project-label {
    color: #6c757d;
    font-size: 13px;
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
    color: #212529;
    cursor: pointer;
    margin: 24px 0 10px 0;
    user-select: none;
  }

  .section-header .toggle-icon {
    color: #2e6da4;
    font-weight: 700;
  }

  /* ---- Case table ---- */
  .case-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  .case-table thead tr {
    background: #2e6da4;
    color: #fff;
  }

  .case-table th {
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
  }

  .case-table td {
    padding: 8px 12px;
    font-size: 13px;
    vertical-align: top;
  }

  .case-link {
    color: #2e6da4;
    text-decoration: none;
  }
  .case-link:hover { text-decoration: underline; }

  .empty-note {
    color: #6c757d;
    font-style: italic;
    padding: 8px 0;
  }

  /* ---- Alternating rows ---- */
  .row-even { background: #fff; }
  .row-odd  { background: #e9ecef; }

  /* ---- Report timestamp ---- */
  .report-meta {
    text-align: center;
    color: #6c757d;
    font-size: 12px;
    margin-top: 32px;
  }
`;

// ---------------------------------------------------------------------------
// JavaScript
// ---------------------------------------------------------------------------
const JS = `
  function showPage(id) {
    document.querySelectorAll('.page').forEach(function(p) {
      p.style.display = 'none';
    });
    document.getElementById(id).style.display = '';
    window.scrollTo(0, 0);
  }

  function showProjects() {
    showPage('projects-page');
  }

  function showSuite(id) {
    showPage(id);
  }

  function toggleProject(id) {
    var el = document.getElementById(id);
    var icon = document.getElementById('icon-' + id);
    if (el.style.display === 'none') {
      el.style.display = '';
      icon.innerHTML = '&ndash;';
    } else {
      el.style.display = 'none';
      icon.innerHTML = '+';
    }
  }

  function toggleSection(id) {
    var el = document.getElementById(id);
    var icon = document.getElementById('icon-' + id);
    if (el.style.display === 'none') {
      el.style.display = '';
      icon.innerHTML = '&ndash;';
    } else {
      el.style.display = 'none';
      icon.innerHTML = '+';
    }
  }
`;

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

function generateReport(projects, testrailUrl, outputPath) {
  const generatedAt = new Date().toLocaleString();

  // Build projects page
  const projectBlocks = projects
    .map((project, i) => renderProjectBlock(project, i))
    .join('\n');

  // Build all suite detail pages
  const suitePages = projects
    .flatMap((project) =>
      project.suites.map((suite) => renderSuitePage(suite, project.name, testrailUrl))
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Automation Coverage Report</title>
  <style>${CSS}</style>
</head>
<body>

  <!-- ===================== Projects page ===================== -->
  <div id="projects-page" class="page">
    <div class="container">
      <h1>Upland Software - TestRail Projects</h1>
      ${projectBlocks}
      <p class="report-meta">Generated on ${esc(generatedAt)}</p>
    </div>
  </div>

  <!-- ===================== Suite detail pages ===================== -->
  ${suitePages}

  <script>${JS}</script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
}

module.exports = { generateReport };
