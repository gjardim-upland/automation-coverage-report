'use strict';

const axios = require('axios');

class TestRailClient {
  constructor({ url, username, apiKey }) {
    this.baseUrl = `${url.replace(/\/$/, '')}/index.php?/api/v2`;
    this.auth = Buffer.from(`${username}:${apiKey}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${this.auth}`,
      'Content-Type': 'application/json',
    };
  }

  async _get(path) {
    try {
      const response = await axios.get(`${this.baseUrl}/${path}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(`TestRail API error [${path}]: ${msg}`);
    }
  }

  /**
   * Fetch all pages of a paginated endpoint.
   * TestRail v2 API may return either a plain array (older) or
   * { <resultKey>: [], offset, limit, size } (newer).
   */
  async _getPaginated(basePath, resultKey) {
    const results = [];
    let offset = 0;
    const limit = 250;

    while (true) {
      const sep = basePath.includes('?') || basePath.includes('&') ? '&' : '&';
      const data = await this._get(`${basePath}${sep}limit=${limit}&offset=${offset}`);

      if (Array.isArray(data)) {
        // Older API — returns everything at once
        results.push(...data);
        break;
      }

      const items = data[resultKey] ?? [];
      results.push(...items);

      if (items.length < limit) break;
      offset += limit;
    }

    return results;
  }

  async getProject(projectId) {
    return this._get(`get_project/${projectId}`);
  }

  async getCaseFields() {
    return this._get('get_case_fields');
  }

  async getSuites(projectId) {
    const data = await this._get(`get_suites/${projectId}`);
    if (Array.isArray(data)) return data;          // older API — plain array
    if (Array.isArray(data.suites)) return data.suites; // newer API — paginated wrapper
    return [data];                                 // single-suite mode — bare object
  }

  async getSections(projectId, suiteId) {
    return this._getPaginated(
      `get_sections/${projectId}&suite_id=${suiteId}`,
      'sections'
    );
  }

  async getCases(projectId, suiteId) {
    return this._getPaginated(
      `get_cases/${projectId}&suite_id=${suiteId}`,
      'cases'
    );
  }
}

module.exports = TestRailClient;
