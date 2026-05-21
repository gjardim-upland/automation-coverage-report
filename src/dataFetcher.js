'use strict';

const FIELD_NAME = 'custom_has_been_automated';

/**
 * Parses a TestRail field "items" string like "0, No\n1, Yes\n2, Cannot"
 * into a map of { yes, no, cannot } numeric values.
 * Falls back to { yes: 2, no: 1, cannot: null } if the field/project config
 * cannot be found.
 */
function parseFieldValues(caseFields, projectId) {
  const field = caseFields.find(f => f.system_name === FIELD_NAME);
  if (!field) return fallback();

  // Find the config that applies to this project (or the global config)
  const config =
    field.configs.find(c => c.context.project_ids.includes(projectId)) ||
    field.configs.find(c => c.context.is_global);

  if (!config) return fallback();

  const map = {};
  for (const line of (config.options.items || '').split('\n')) {
    const comma = line.indexOf(',');
    if (comma === -1) continue;
    const val = parseInt(line.slice(0, comma).trim(), 10);
    const label = line.slice(comma + 1).trim().toLowerCase();
    map[label] = val;
  }

  return {
    yes:    map['yes']    ?? null,
    no:     map['no']     ?? null,
    cannot: map['cannot'] ?? null,
  };
}

function fallback() {
  console.warn('  Warning: could not resolve field config — using default values (1=No, 2=Yes).');
  return { yes: 2, no: 1, cannot: null };
}

/**
 * Builds a map of sectionId → full path string (e.g. "Folder/Sub/Leaf")
 */
function buildSectionPaths(sections) {
  const byId = {};
  for (const s of sections) byId[s.id] = s;

  const pathCache = {};

  function getPath(id) {
    if (pathCache[id] !== undefined) return pathCache[id];
    const section = byId[id];
    if (!section) return '';
    if (!section.parent_id) {
      pathCache[id] = section.name;
    } else {
      const parentPath = getPath(section.parent_id);
      pathCache[id] = parentPath ? `${parentPath}/${section.name}` : section.name;
    }
    return pathCache[id];
  }

  for (const s of sections) getPath(s.id);
  return pathCache;
}

function mapCase(c, sectionPaths) {
  return {
    id: c.id,
    title: c.title,
    location: sectionPaths[c.section_id] || '',
  };
}

/**
 * Fetches all data for the given project IDs and returns a structured object.
 * @param {import('./testrail')} client
 * @param {Array<{id: number, name?: string}>} projectConfigs
 * @returns {Promise<Array>} Array of project data objects
 */
async function fetchAllData(client, projectConfigs, globalExcludedSuiteIds = []) {
  const projects = [];
  const globalExcluded = new Set(globalExcludedSuiteIds.map(Number));

  // Fetch case field definitions once — used to resolve per-project value mappings
  const caseFields = await client.getCaseFields();

  for (const projectConfig of projectConfigs) {
    console.log(`  Fetching project ${projectConfig.id}...`);
    const projectInfo = await client.getProject(projectConfig.id);
    const projectName = projectConfig.name || projectInfo.name;

    const fieldValues = parseFieldValues(caseFields, projectConfig.id);
    console.log(`    Field mapping: No=${fieldValues.no}, Yes=${fieldValues.yes}, Cannot=${fieldValues.cannot}`);

    // Merge global and per-project excluded suite IDs
    const excluded = new Set([
      ...globalExcluded,
      ...(projectConfig.excludedSuiteIds || []).map(Number),
    ]);

    const allSuites = await client.getSuites(projectConfig.id);
    const suites = allSuites.filter(s => !excluded.has(s.id));
    const skipped = allSuites.length - suites.length;
    console.log(`    Found ${allSuites.length} suite(s) in "${projectName}"${skipped ? ` (${skipped} excluded)` : ''}`);

    const suitesData = [];

    for (const suite of suites) {
      console.log(`    Fetching suite: ${suite.name} (S${suite.id})...`);

      const [sections, cases] = await Promise.all([
        client.getSections(projectConfig.id, suite.id),
        client.getCases(projectConfig.id, suite.id),
      ]);

      const sectionPaths = buildSectionPaths(sections);

      const automatedCases = [];
      const nonAutomatedCases = [];
      const cannotCases = [];

      for (const c of cases) {
        const val = c[FIELD_NAME];
        if (val === fieldValues.yes) {
          automatedCases.push(mapCase(c, sectionPaths));
        } else if (val === fieldValues.cannot) {
          cannotCases.push(mapCase(c, sectionPaths));
        } else {
          nonAutomatedCases.push(mapCase(c, sectionPaths));
        }
      }

      const total = cases.length;
      const automatedCount = automatedCases.length;
      const automatedPercent = total > 0 ? Math.round((automatedCount / total) * 100) : 0;

      suitesData.push({
        id: suite.id,
        name: suite.name,
        total,
        automatedCount,
        automatedPercent,
        automatedCases,
        nonAutomatedCases,
        cannotCases,
      });
    }

    projects.push({
      id: projectConfig.id,
      name: projectName,
      suites: suitesData,
    });
  }

  return projects;
}

module.exports = { fetchAllData };
