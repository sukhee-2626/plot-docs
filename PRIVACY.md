# Plot Docs Privacy

Last updated: October 28, 2026

Plot Docs opens, edits, and saves documents locally. Document editing does not
upload files to Plot Docs. AI features require a network connection and send
requests only when you use them.

## Usage analytics

Usage analytics is enabled by default in packaged official builds, including
the initial app launch before the onboarding notice is shown. Onboarding
explains what is collected and where to turn it off.

You can disable reporting at any time under **Settings → General → Send
anonymous usage statistics**. An explicit opt-out is remembered and stops all
subsequent analytics events.

### Events and parameters

When enabled, the app sends these events:

- `install_first_launch` — marks the first analytics-enabled use of a newly
  assigned anonymous `client_id`; used for retention cohorts
- `app_launch` — no event-specific parameter
- `file_open` — `ext`, the file extension such as `docx` or `xlsx`
- `file_new` — `kind`, one of `docx`, `xlsx`, `pptx`, `md`, or `pdf`
- `login_click` — no event-specific parameter
- `login_success` — no event-specific parameter

Every event includes:

- `app_version`
- `platform`
- `os_version`
- `ui_lang`
- a per-process `session_id` derived from the process start time
- `engagement_time_msec` with the fixed value `100`

When available, the payload also includes `country_id`, the two-letter country
code from the operating system's regional locale. This can differ from the
user's physical location.

The Google Analytics 4 payload also uses a random install UUID as `client_id`.
The country code is sent through GA4's country-only `user_location` field; the
app does not send a city or region. Neither identifier is a Soopus account or
email address.

## AI Data Analytics

The AI Data Analytics workspace stores imported datasets in local SQLite under
the app's private userData folder. Plot Docs does not upload the full dataset.
When you use Plot AI with analytics, the configured AI provider receives only
bounded tool observations needed to choose the next step:

- the dataset schema, column types, and profile counts;
- a bounded number of sample or query rows;
- the SQL needed for the current step; and
- page text, table samples, and direct-data links from a public page you asked
  Plot AI to inspect.

Before these observations are sent, Plot Docs replaces obvious contact, payment
and identifier columns/values with `[redacted]`, masks database passwords and
secret connection parameters, and strips query strings and fragments from URLs
shown to the model. Direct data links use a local mapping so the model can choose
a redacted link while the original signed URL stays in the local process. The
model does not receive database credentials, the full dataset, or export files.

This is pattern-based protection, not a complete PII classifier. Free-text names,
unusual identifier formats, or sensitive information embedded in page prose may
still be sent when you ask Plot AI to inspect that page. Review a dataset or page
before using an external AI provider. You can use the deterministic local
automation and SQL tools without configuring a model.

## Network information

Events are sent to Google Analytics 4 using the Measurement Protocol over
HTTPS. As the HTTPS recipient, Google necessarily sees the connection's public
IP address and transport metadata, and may use them for coarse geolocation and
security or spam-abuse processing. Plot Docs does not add an IP address to the
event payload.

## Data not collected by analytics

Plot Docs analytics never sends:

- document content
- file names
- file paths
- Soopus account identity
- email addresses

The analytics metadata is injected only into packaged official builds and is
not part of this repository. Source builds and forks without that packaged
metadata install a no-op tracker and send no usage analytics; all features work
the same.
