# .github/ — GitHub Automation Configuration

This directory contains GitHub platform automation configuration. **Everything here is written but not yet enabled** — complete the checklist below manually to activate each workflow.

## File Manifest

| File | Purpose | Status |
|------|---------|--------|
| [workflows/claude-fix.yml](workflows/claude-fix.yml) | Triggers AI to auto-fix bugs and open a draft PR | 🟡 Script ready, pending activation |
| [workflows/deploy-web.yml](workflows/deploy-web.yml) | Web platform build + CDN deploy + canary | 🟡 Script ready, secrets/vars need configuring |
| [workflows/deploy-ios.yml](workflows/deploy-ios.yml) | iOS build + TestFlight/App Store | 🟡 Script ready, certificates and API key needed |
| [workflows/deploy-android.yml](workflows/deploy-android.yml) | Android build + internal distribution/Google Play | 🟡 Script ready, keystore needed |
| [workflows/deploy-harmony.yml](workflows/deploy-harmony.yml) | HarmonyOS build + AppGallery | 🟡 Script ready, signing and API config needed |
| [pull_request_template.md](pull_request_template.md) | Enforces a unified PR format with mandatory PRD/task links | ✅ GitHub applies this automatically on PR creation — no activation needed |

---

## Claude Fix: Activation Steps

**All steps are done in the repository `Settings` page — no code changes required.**

### 1. Add the Anthropic API Key (required)

1. Go to [Anthropic Console](https://console.anthropic.com/) and create an API key
2. Repository `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
3. Name: `ANTHROPIC_API_KEY`, Value: the key you just created

### 2. Grant Actions write permissions (required)

`Settings` → `Actions` → `General` → scroll to the bottom, `Workflow permissions`:

- ✅ Select **Read and write permissions**
- ✅ Check **Allow GitHub Actions to create and approve pull requests**

Without this, the workflow cannot push branches or open PRs and will log `permission denied`.

### 3. (Optional) Restrict who can trigger the workflow

By default, only repo members (OWNER / MEMBER / COLLABORATOR) can comment `@claude fix` to trigger the workflow, preventing external users from draining your API quota.

To loosen or tighten this, edit the `author_association` check in [workflows/claude-fix.yml](workflows/claude-fix.yml).

### 4. (Optional) Set up API budget alerts

Anthropic Console → `Billing` → set a monthly budget + alert threshold to prevent runaway workflow costs.

---

## How to Use (after activation)

### Method A: Trigger via issue comment (recommended)

1. Create a new issue describing the bug (symptoms + reproduction steps + error stack)
2. Leave a comment:
   ```
   @claude fix additional context (optional)
   ```
3. The workflow runs automatically and reports progress in the issue comments:
   - 🤖 Start notification
   - ✅ Done, with a link to the draft PR
   - ❌ Failed/blocked, with a link to logs and common causes
4. Manually review the draft PR, convert it to ready-for-review, and merge through the normal process

### Method B: Manual trigger from the Actions tab (for testing)

1. Repository `Actions` → `Claude Fix` → `Run workflow`
2. Fill in `bug_description` (required, multi-line text)
3. The `allow_pr` checkbox controls whether a PR is opened automatically

---

## How It Works

This workflow is a **pure dispatcher** — it contains no bug-fixing logic itself:

```
GitHub event (issue comment / workflow_dispatch)
    ↓
claude-fix.yml extracts the bug description and assembles parameters
    ↓
Calls /fix --pr --headless (defined in .claude/commands/fix.md)
    ↓
Claude executes the 6-step fix.md process:
  Reproduce → Locate → Fix → Verify → Commit → Open PR
    ↓
Workflow posts the result back as a comment on the original issue
```

To change `/fix` logic → edit [.claude/commands/fix.md](../.claude/commands/fix.md); no need to touch this workflow.
To change trigger conditions / allowlisted tools → edit [workflows/claude-fix.yml](workflows/claude-fix.yml).

---

## Security Boundaries

The workflow enforces hard limits when calling Claude:

- `allowed_tools` allowlist: only `Read` / `Edit` / `Write` / `Glob` / `Grep` + specific `Bash` subcommands
- `disallowed_tools` blocklist: `git push --force` / `git reset --hard` / `git checkout main` / `rm -rf` are all rejected
- `timeout-minutes: 15`: each run is capped at 15 minutes
- `concurrency`: only one run per issue at a time — no concurrent conflicting edits
- PRs are always opened as `--draft` and are **never auto-merged** (requires manual conversion to ready + manual merge)

Even if Claude goes off the rails, it cannot touch `main`, cannot modify core fields in `package.json`, and cannot access `.github/` or `workspace/api-spec/`.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Workflow never triggers | Commenter is not a repo member | Invite as collaborator or update `author_association` config |
| Workflow ran but no PR opened | `/fix` entered `[BLOCKED]` state | Check logs; common cause: "root cause is in the PRD layer" or "multiple approaches require human decision" |
| Workflow reports `permission denied` on push | Actions permissions not set | Go back to step 2 and enable Read and write |
| Workflow reports `ANTHROPIC_API_KEY` is empty | Secret not configured | Go back to step 1 and add it |
| API quota alert / runaway cost | Trigger frequency too high / single run too expensive | Limit complexity in `fix.md`, or add `if` conditions in the workflow to restrict triggering |

---

## Deploy Workflows: Activation Steps

Deploy workflows are triggered by the `/deploy` command, or can be triggered manually from the GitHub Actions tab.

### Common Configuration (all platforms)

1. **Notification channels** (optional):
   - `Settings` → `Variables` → `Actions` → add:
     - `DINGTALK_WEBHOOK`: DingTalk bot webhook URL
     - `FEISHU_WEBHOOK`: Feishu bot webhook URL

2. **Environment protection** (required for production):
   - `Settings` → `Environments` → create a `production` environment
   - Add `Required reviewers` (at least 1 approver)

### Web Platform

`Settings` → `Variables` → add:
- `STAGING_URL`: staging environment URL
- `PRODUCTION_URL`: production environment URL

CDN upload requires replacing the TODO placeholders in the workflow with actual commands (Alibaba Cloud OSS / AWS S3 / Tencent Cloud COS).

### iOS Platform

`Settings` → `Secrets` → add:
- `IOS_CERTIFICATE_P12`: certificate in base64
- `IOS_CERTIFICATE_PASSWORD`: certificate password
- `APP_STORE_CONNECT_ISSUER_ID`: App Store Connect API Issuer ID
- `APP_STORE_CONNECT_KEY_ID`: API Key ID
- `APP_STORE_CONNECT_PRIVATE_KEY`: API private key (.p8 content)

`Settings` → `Variables` → add:
- `IOS_BUNDLE_ID`: Bundle Identifier
- `IOS_SCHEME`: Xcode Scheme name

### Android Platform

`Settings` → `Secrets` → add:
- `ANDROID_KEYSTORE_BASE64`: base64-encoded release.keystore
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: key alias
- `ANDROID_KEY_PASSWORD`: key password
- `GOOGLE_PLAY_SERVICE_ACCOUNT`: Google Play Service Account JSON (production)
- `PGYER_API_KEY`: Pgyer API key (staging, optional)

`Settings` → `Variables` → add:
- `ANDROID_PACKAGE_NAME`: package name

### HarmonyOS Platform

`Settings` → `Secrets` → add:
- `HARMONY_KEY_ALIAS`: signing key alias
- `HARMONY_KEY_PASSWORD`: key password
- `HARMONY_KEYSTORE_PASSWORD`: keystore password
- `HUAWEI_CLIENT_ID`: AppGallery Connect Client ID (production)
- `HUAWEI_ACCESS_TOKEN`: AppGallery Connect Access Token (production)

> Setting up a HarmonyOS CI environment is complex (Huawei has no official GitHub Action). Using a Docker image or a self-hosted runner is recommended.

---

## Future Extensions

Once this workflow is running smoothly, the following can be added in parallel:

- `claude-review.yml` — PR comment triggers `/review` for automatic code review
- `claude-test.yml` — push to a feature branch automatically runs `/test` to fill in missing tests
- Sentry webhook → pipe errors directly into `/fix`

New workflows are just a different trigger source + a different command; `/fix.md` / `/review.md` / `/test.md` themselves don't need to change.
