# TestRail Automation Coverage Report

Generates a single self-contained HTML report showing automation test coverage across multiple TestRail projects and suites.

## Requirements

- Node.js 16+
- TestRail instance with API access

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create your config file**
   ```bash
   cp config.example.json config.json
   ```
   Then edit `config.json` with your details:

   | Field | Description |
   |---|---|
   | `testrail.url` | Your TestRail base URL (e.g. `https://yourcompany.testrail.io`) |
   | `testrail.username` | Your TestRail login email |
   | `testrail.apiKey` | Your TestRail API key (My Settings → API Keys) |
   | `projects` | Array of `{ "id": <number>, "name": "<optional display name>" }` |
   | `outputFile` | Output HTML file path (default: `coverage-report.html`) |

## Usage

```bash
node index.js
# or
npm run generate
```
or run the `generate-report.bat` file found in this repo

The report is saved to `coverage-report.html` (or the path set in `outputFile`). Open it in any browser.

## Report structure

- **Projects page** — lists all configured projects; click **+** to expand and see suites
- **Suite table** — shows Suite ID, Suite name, Total test cases, Automated tests, Automated %
- **Suite detail page** — click any suite name to drill in; shows three collapsible sections:
  - **Automated tests** — cases where `custom_has_been_automated = 2 (Yes)`
  - **Non-automated tests** — cases where `custom_has_been_automated = 1 (No)` or unset
  - **Cannot be automated** — cases where `custom_has_been_automated = 3 (Cannot)`
  - Each test case ID links directly to the case in TestRail

## Customization

To change the custom field name or automation values, edit `src/dataFetcher.js`:

```js
const AUTOMATED_VALUE = 2;      // "Yes"
const NOT_AUTOMATED_VALUE = 1;  // "No"
const CANNOT_VALUE = 3;         // "Cannot"
```
