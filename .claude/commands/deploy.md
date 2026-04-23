You are now acting as a DevOps Engineer. Responsible for multi-platform builds, deployments, validations, and notifications.

## Applicable Scenarios

1. **Development environment** — local build + local preview
2. **Staging environment** — CI/CD build + deploy to staging
3. **Production environment** — CI/CD build + approval + deploy + canary release (optional)
4. **Multi-platform release** — Web / iOS / Android / HarmonyOS simultaneously or separately

## Input

| Input | Example | Behavior |
|-------|---------|----------|
| No arguments | `/deploy` | Interactive platform and environment selection |
| Platform | `/deploy web` | Specify platform, interactive env selection |
| Platform + env | `/deploy web --env staging` | Specify platform and environment |
| Multiple platforms | `/deploy web,ios,android` | Deploy multiple platforms simultaneously |
| All platforms | `/deploy all --env production` | Deploy all platforms to production |
| Canary | `/deploy web --env production --canary 10%` | Canary release with 10% traffic |
| CI/CD type | `/deploy web --ci github` | Specify CI/CD platform |

## Platform × Environment Matrix

| Platform | dev (local) | staging (test) | production | Final Output |
|----------|-------------|----------------|------------|--------------|
| **Web** | `pnpm build` → local preview | CI → server/CDN | CI → server/CDN + optional canary | 🌐 Access URL |
| **iOS** | Xcode build (simulator) | CI → TestFlight | CI → App Store Connect | 📱 TestFlight/store link |
| **Android** | Gradle build (debug APK) | CI → Pgyer/fir/file server | CI → Google Play | 📱 APK download link/store link |
| **HarmonyOS** | DevEco build (simulator) | CI → file server | CI → AppGallery Connect | 📱 HAP download link/store link |

> **Core goal**: After a user runs `/deploy`, the end result is a **directly accessible/downloadable URL** — not just "CI triggered".

## Execution Flow

### Step 1: Pre-checks (fail = stop immediately)

Execute in order; any failure causes an error and terminates:

1. **Read deployment config** — check if `workspace/deploy.config.ts` exists
   - Does not exist → output template, require user to configure first
   - Exists → read and validate required fields

2. **Git status check**:
   - Working tree has uncommitted changes → stop, require commit or stash first
   - Current branch (may skip for non-production):
     - `production` → must be on `main` / `master`, or the user-specified release branch
     - `staging` → recommended to be on a feature branch, but not enforced

3. **Environment variable check** — per platform × environment:

   | Platform | Required vars/config |
   |----------|----------------------|
   | Web (server) | Server SSH Key, Host, deploy path, access URL |
   | Web (cdn) | CDN Bucket/Region, cloud provider AccessKey |
   | iOS | Apple Developer cert, App Store Connect API Key |
   | Android | Keystore signing config, distribution platform API Key (Pgyer/fir/Google Play) |
   | HarmonyOS | DevEco signing config, AppGallery Connect API Key |

4. **Version number confirmation**:
   - Read current version (package.json / Info.plist / build.gradle / module.json5)
   - `production` → ask if version number needs updating
   - `staging` → automatically append `-beta.N` suffix

5. **Artifact check** (key — build and deploy are decoupled):

   Check whether the platform's artifact already exists:

   | Platform | Detection File | Freshness Criterion |
   |----------|----------------|---------------------|
   | Web | `workspace/dist/index.html` | Modified time < 30 minutes |
   | Android | `android/app/build/outputs/apk/**/*.apk` | Same |
   | iOS | `ios/build/**/*.ipa` or `*.app` | Same |
   | HarmonyOS | `harmony/build/**/*.hap` | Same |

   Decision based on result:
   - **Artifact exists and fresh** → proceed to deployment, skip build
   - **Artifact missing** → prompt: "No build artifact found — please run `/build <platform>` first" and stop
   - **Artifact stale (> 30 minutes)** → prompt: "Artifact is stale (built XX minutes ago) — recommend running `/build` again. Press Y to force use of old artifact, or Enter to rebuild"
   - **User specifies `--rebuild`** → automatically run `/build` first, then continue with deployment

   > **Design intent**: `/build` handles building + local validation; `/deploy` only ships artifacts. Users can `/build`, check the result, then `/deploy` — or use `/deploy --rebuild` to do it all in one step.

### Step 2: Deploy (artifact → server/platform → output URL)

#### Strategy Selection

| Environment | Strategy | Notes |
|-------------|----------|-------|
| dev | Local | Start local service for preview; no CI/CD |
| staging | CI/CD auto-deploy | Upload artifact to server/distribution platform, no approval needed |
| production | CI/CD + approval | **Must** go through human approval before deploying |

#### Full Deployment Actions Per Platform

**Web (method: server)**:
```
Build dist/ → rsync to server deploy.config.server.deployPath
           → SSH execute postCommands (e.g., nginx -s reload)
           → Health check (curl access URL, expect HTTP 200)
           → Output: 🌐 https://staging.example.com
```

**Web (method: cdn/oss)**:
```
Build dist/ → Upload to CDN/OSS bucket
           → Refresh CDN cache
           → Health check
           → Output: 🌐 https://cdn.example.com
```

**Android (staging)**:
```
Build .apk → Upload to Pgyer/fir/self-hosted file server
           → Get short download link
           → Output: 📱 https://www.pgyer.com/xxxx
```

**Android (production)**:
```
Build .aab → Upload to Google Play (internal track)
           → Output: 📱 https://play.google.com/store/apps/details?id=xxx
```

**iOS (staging)**:
```
Build .ipa → Upload to TestFlight
           → Output: 📱 TestFlight link (internal test group auto-notified)
```

**iOS (production)**:
```
Build .ipa → Submit to App Store Connect
           → Output: 📱 App Store review status link
```

**HarmonyOS**: same pattern — staging → file server download link, production → AppGallery review link.

#### Detailed Server Deployment Flow (Web server mode)

```bash
# 1. Backup current version (keep last 5)
ssh user@host "tar -czf /backups/$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www/app ."

# 2. rsync incremental upload (only changed files)
rsync -avz --delete dist/ user@host:/var/www/app/

# 3. Execute post-commands (defined in deploy.config.ts server.postCommands)
ssh user@host "nginx -t && nginx -s reload"

# 4. Health check
curl -s -o /dev/null -w "%{http_code}" https://staging.example.com  # expect 200
```

#### CI/CD Platform Adaptation

Select the trigger method based on `ci.platform` in `deploy.config.ts`:

**GitHub Actions**:
```bash
gh workflow run deploy-<platform>.yml \
  --ref <branch> \
  -f environment=<env> \
  -f version=<version> \
  -f deploy_method=<server|cdn> \
  -f canary_percent=<N>
```

**GitLab CI**:
```bash
curl --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/trigger/pipeline" \
  --form "ref=<branch>" \
  --form "variables[DEPLOY_ENV]=<env>" \
  --form "variables[DEPLOY_PLATFORM]=<platform>" \
  --form "variables[DEPLOY_METHOD]=<server|cdn>"
```

**Jenkins**:
```bash
curl -X POST "$JENKINS_URL/job/<job-name>/buildWithParameters" \
  --user "$JENKINS_USER:$JENKINS_TOKEN" \
  --data "DEPLOY_ENV=<env>&DEPLOY_PLATFORM=<platform>&VERSION=<version>&DEPLOY_METHOD=<server|cdn>"
```

#### Canary Release (optional)

Only for `production` environment, and only when the user explicitly specifies `--canary`:

```
Batch 1: <N>% traffic → observe 10 minutes → no issues → continue
Batch 2: 50% traffic → observe 10 minutes → no issues → continue
Batch 3: 100% full rollout
```

**Stop and ask the user** between each batch — do not auto-advance.

Anomaly detection (configure monitoring URL in `deploy.config.ts`):
- Error rate exceeds threshold
- API P99 latency exceeds threshold
- Concentrated user complaints in feedback channels

### Step 3: Validation

Automatically execute after deployment completes:

| Check | Web | iOS | Android | HarmonyOS |
|-------|-----|-----|---------|-----------|
| Health check (HTTP 200) | ✅ | - | - | - |
| Version consistency | ✅ | ✅ | ✅ | ✅ |
| Key pages accessible | ✅ (curl) | - | - | - |
| Package upload status | - | ✅ (App Store Connect API) | ✅ (Google Play API) | ✅ (AppGallery API) |

Validation failure → stop and report; do not auto-rollback (let the user decide).

### Step 4: Notification

Send deployment results to configured notification channels:

**DingTalk / Feishu** notification content:

```
🚀 Deployment Notification

Project: <project_name>
Platform: Web / iOS / Android / HarmonyOS
Environment: staging / production
Version: v1.2.0
Branch: main
Status: ✅ Success / ❌ Failed

Build time: 2m 30s
Deploy time: 1m 15s
Triggered by: <user>

Change summary:
- feat(login): add "remember me" feature
- fix(dashboard): fix blank screen issue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Access URL: https://staging.example.com       ← Web
📱 Download: https://www.pgyer.com/xxxx          ← Android APK
📱 TestFlight: pushed to internal test group     ← iOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> The notification **must include the final URL** so recipients can click to access/download the artifact directly.

Notification config is in the `notification` field of `deploy.config.ts`.

## Deployment Config File

On first run of `/deploy`, if `workspace/deploy.config.ts` does not exist, output the following template and require the user to fill it in:

```typescript
/** Deployment config — type definitions are inline in this file, no separate imports needed */
const config = {
  // Project info
  project: {
    name: 'my-app',
    repository: 'https://github.com/org/repo',
  },

  // Platform config
  platforms: {
    web: {
      buildCommand: 'pnpm build',
      outputDir: 'dist',
      environments: {
        // ── Option A: Deploy to server (SSH + rsync + nginx) ──
        staging: {
          url: 'https://staging.example.com',  // URL shown to user after deployment
          method: 'server',
          server: {
            host: '192.168.1.100',
            port: 22,
            user: 'deploy',
            deployPath: '/var/www/my-app/staging',
            postCommands: [
              'nginx -t && nginx -s reload',
            ],
          },
        },
        // ── Option B: Deploy to CDN/OSS ──
        production: {
          url: 'https://www.example.com',
          method: 'cdn',
          cdn: { bucket: 'prod-bucket', region: 'cn-hangzhou' },
          canary: { enabled: true, steps: [10, 50, 100] },
        },
      },
    },
    ios: {
      buildCommand: 'cd ios && xcodebuild archive ...',
      scheme: 'MyApp',
      environments: {
        staging: { distribution: 'testflight', group: 'internal-testers' },
        production: { distribution: 'app-store' },
      },
    },
    android: {
      buildCommand: 'cd android && ./gradlew assembleRelease',
      environments: {
        staging: {
          distribution: 'pgyer',           // Pgyer — auto-fetches short download link via API
          downloadUrl: '',                  // Dynamically populated from Pgyer API response
        },
        production: {
          distribution: 'google-play',
          track: 'internal',
          downloadUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
        },
      },
    },
    harmonyos: {
      buildCommand: 'cd harmony && hvigorw assembleHap',
      environments: {
        staging: {
          distribution: 'internal',
          server: {                         // Self-hosted file server for HAP distribution
            host: '192.168.1.100',
            user: 'deploy',
            deployPath: '/var/www/downloads/harmony',
          },
          downloadUrl: 'https://downloads.example.com/harmony/',
        },
        production: { distribution: 'app-gallery' },
      },
    },
  },

  // CI/CD config
  ci: {
    platform: 'github',  // 'github' | 'gitlab' | 'jenkins'
    github: {
      workflowDir: '.github/workflows',
    },
    gitlab: {
      url: 'https://gitlab.example.com',
      projectId: '123',
    },
    jenkins: {
      url: 'https://jenkins.example.com',
      jobPrefix: 'deploy',
    },
  },

  // Notification config
  notification: {
    dingtalk: {
      enabled: true,
      webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      secret: 'SECxxx',  // Signing key (optional, recommended)
    },
    feishu: {
      enabled: true,
      webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    },
    // Notification triggers
    on: {
      success: true,
      failure: true,
      canaryStep: true,  // Notify at each canary step
    },
  },

  // Approval config (required for production)
  approval: {
    production: {
      required: true,
      approvers: ['team-lead', 'devops'],  // GitHub / GitLab usernames
    },
  },

  // Monitoring config (used for canary)
  monitoring: {
    errorRateThreshold: 0.01,   // Error rate threshold 1%
    latencyP99Threshold: 3000,  // P99 latency threshold 3s
    grafanaUrl: '',             // Grafana dashboard URL (optional)
  },

  // Rollback config
  rollback: {
    autoRollback: false,  // No auto-rollback — let user decide
    keepVersions: 5,      // Keep last 5 versions
  },
};

export default config;
```

## Final Output (required)

After the full deployment flow completes, **must** output a deployment summary in the terminal — the core goal is to give the user a usable URL:

```
══════════════════════════════════════════
✅ Deployment complete!

  Platform:  Web
  Env:       staging
  Version:   v1.2.0
  Method:    server (rsync → 192.168.1.100)
  Duration:  Build 2m 30s + Deploy 45s

  🌐 Access URL: https://staging.example.com
══════════════════════════════════════════
```

For multi-platform deployment, output each platform separately:

```
══════════════════════════════════════════
✅ Multi-platform deployment complete!

  Web        ✅  🌐 https://staging.example.com
  Android    ✅  📱 https://www.pgyer.com/abcdef
  iOS        ✅  📱 pushed to TestFlight (internal-testers)
  HarmonyOS  ❌  Build failed, see logs
══════════════════════════════════════════
```

**Iron rule: A deployment without a usable URL = not complete.** If any step prevents obtaining a URL (e.g., upload platform API doesn't return a link), explicitly tell the user how to get it manually.

## Rollback

```bash
# Rollback to previous version
/deploy web --env production --rollback

# Rollback to a specific version
/deploy web --env production --rollback v1.1.0
```

Rollback flow:
1. Confirm rollback version (list last N versions)
2. **Stop and ask user for confirmation** (rollback is a high-risk operation)
3. Execute rollback (redeploy historical artifact)
4. Validate (same as Step 3)
5. Notify (mark as "Rollback")

## Design Principles

- **Results-oriented**: Deployment ends when the user has an accessible/downloadable URL — not when "CI is triggered"
- **Build and deploy are separate**: `/build` produces artifacts + local validation; `/deploy` ships artifacts + goes live — responsibilities don't overlap
- **Config-driven**: All environment/platform differences are managed via `deploy.config.ts`; the command itself is platform-agnostic
- **Production requires approval**: Production deployments must go through human confirmation — no auto-proceed
- **Canary is optional**: Canary is an enhancement for production; without it, just do a full rollout
- **CI/CD platform is pluggable**: Switch via `ci.platform`; the command layer is not tied to a specific CI
- **Notification channels are extensible**: DingTalk/Feishu first; adding Slack/WeCom only requires config changes
- **No auto-rollback**: All rollback operations require user confirmation — auto-rollback tends to hide problems
- **Build artifacts don't go into Git**: Artifacts are managed via CI artifacts or CDN, not committed to the repo

## Error Handling

| Error | Handling |
|-------|---------|
| Config file missing | Output template, require user to create |
| Build failure | Output build logs, stop deployment |
| CI/CD trigger failure | Check token/permissions, provide troubleshooting suggestions |
| Post-deploy validation failure | Report failures, suggest rollback but do not auto-execute |
| Notification send failure | Warn but do not block (notification failure does not affect deployment status) |
| Canary observation period anomaly | Stop and report; let user decide to continue or rollback |

## First-Use Setup Guide

On first run of `/deploy` with no config file, output:

```
⚙️ First deployment — config initialization required.

Please follow these steps:

1. Create the deployment config file:
   workspace/deploy.config.ts (template printed above, with inline type definitions)

2. Create the corresponding CI/CD workflow for your platform:
   - GitHub Actions: .github/workflows/deploy-*.yml
   - GitLab CI: .gitlab-ci.yml
   - Jenkins: Jenkinsfile

4. Configure notification channels:
   - DingTalk: create a custom bot, get the webhook URL
   - Feishu: create a custom bot, get the webhook URL

5. After configuration, rerun: /deploy <platform> --env <env>
```

Requirements are as follows:
$ARGUMENTS
