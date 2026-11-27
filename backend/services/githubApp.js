const axios = require('axios');
const crypto = require('crypto');

// Write access to repos goes through a GitHub App the repo owner installs, never the server's GITHUB_TOKEN.

const GH = 'https://api.github.com';
const ACCEPT = 'application/vnd.github+json';

const isConfigured = () => !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);

const SETUP_STEPS = [
  'Go to GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.',
  'Name it (e.g. "Insightify Autopilot"), set any homepage URL, and untick "Active" under Webhook.',
  'Repository permissions: Contents → Read and write, Pull requests → Read and write (Metadata stays Read-only).',
  'Create the app, note its App ID, then "Generate a private key" and download the .pem file.',
  'Add GITHUB_APP_ID=<id> and GITHUB_APP_PRIVATE_KEY="<pem contents, newlines as \\n>" to backend/.env and restart the server.',
  'Open the app\'s "Install App" tab and install it on your account for the repositories Autopilot may open PRs in.',
];

/** RS256 app JWT, valid 9 minutes (GitHub's max is 10); iat backdated for clock drift. */
const appJwt = (now = Math.floor(Date.now() / 1000)) => {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: now - 60, exp: now + 540, iss: String(process.env.GITHUB_APP_ID) })}`;
  const key = process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n');
  return `${unsigned}.${crypto.sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url')}`;
};

/** Axios client holding an installation token scoped to this one repository. */
const installationClient = async (owner, repo) => {
  const app = axios.create({ baseURL: GH, timeout: 15000, headers: { Authorization: `Bearer ${appJwt()}`, Accept: ACCEPT } });
  let installation;
  try {
    installation = (await app.get(`/repos/${owner}/${repo}/installation`)).data;
  } catch (err) {
    if (err.response?.status === 404) throw Object.assign(new Error(`The GitHub App is not installed on ${owner}/${repo}. Install it from the app's settings page, then try again.`), { status: 412 });
    throw err;
  }
  const { data } = await app.post(`/app/installations/${installation.id}/access_tokens`, { repositories: [repo] });
  return axios.create({ baseURL: GH, timeout: 15000, headers: { Authorization: `token ${data.token}`, Accept: ACCEPT } });
};

const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

/**
 * Branch from the default branch, commit transform(file) to `path`, open a PR.
 * Deletes the branch again if anything after creating it fails.
 */
const openFixPr = async ({ owner, repo, path, transform, branch, title, body, message }) => {
  const gh = await installationClient(owner, repo);
  const base = `/repos/${owner}/${repo}`;
  const { data: info } = await gh.get(base);
  const { data: head } = await gh.get(`${base}/git/ref/heads/${enc(info.default_branch)}`);
  await gh.post(`${base}/git/refs`, { ref: `refs/heads/${branch}`, sha: head.object.sha });
  try {
    const { data: file } = await gh.get(`${base}/contents/${enc(path)}`, { params: { ref: branch } });
    const before = Buffer.from(file.content, 'base64').toString('utf8');
    const after = transform(before);
    if (after === before) throw Object.assign(new Error(`${path} is already up to date on ${info.default_branch}.`), { status: 409 });
    await gh.put(`${base}/contents/${enc(path)}`, { message, branch, sha: file.sha, content: Buffer.from(after, 'utf8').toString('base64') });
    const { data: pr } = await gh.post(`${base}/pulls`, { title, body, head: branch, base: info.default_branch });
    return { url: pr.html_url, number: pr.number, branch };
  } catch (err) {
    await gh.delete(`${base}/git/refs/heads/${enc(branch)}`).catch(() => {});
    throw err;
  }
};

module.exports = { isConfigured, SETUP_STEPS, appJwt, openFixPr };
