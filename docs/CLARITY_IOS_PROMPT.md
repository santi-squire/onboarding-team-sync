# Clarity iOS Integration — prompt for ios-commander Claude session

Self-contained prompt to paste into a Claude Code session running in the
`squire-technologies/ios-commander` repo. Implements Microsoft Clarity SDK
+ custom event tracking at known friction points surfaced by our login A/B
experiment (SQR-6510).

Context for whoever runs this: Yurii (iOS lead) is the contact for Clarity
project setup. The bundle ID, dependency manager, and conventions are
discovered by reading the repo.

---

## The prompt — copy from below the line

---

I'm working in the `ios-commander` repo. Goal: integrate Microsoft Clarity
session-recording SDK so we can watch user sessions in our login flow A/B
experiment (SQR-6510), and add custom Clarity events at the friction points
we've already detected in Snowflake. Yurii is the iOS lead and owns the
Clarity project — coordinate with him on the project ID before shipping.

## Pre-flight (do this BEFORE touching code)

1. Read the project structure to identify:
   - Dependency manager (SPM via `Package.swift`, CocoaPods via `Podfile`,
     or Carthage). **Use whatever the repo already uses — don't introduce a
     new manager.**
   - The bundle identifier (likely `com.squire.commander` or similar — find
     in `*.xcodeproj` settings or Info.plist).
   - The app's main entry point (`@main` AppDelegate or `App` struct in
     SwiftUI).
   - Any existing analytics SDKs (Rudder, etc.) — Clarity should sit
     alongside them, not replace them.

2. Confirm with Yurii (the user will relay):
   - Clarity project ID. If they don't have one yet, the steps to create it
     are in **Appendix A** below — surface them so the user can complete the
     setup at clarity.microsoft.com before code work proceeds.
   - Whether to gate Clarity init behind a flag (LD/GrowthBook) for
     phased rollout, or just init unconditionally on Release.

## Step 1 — Add the Clarity SDK

Microsoft Clarity for iOS is published at
`https://github.com/microsoft/clarity-ios`. Add it via the dependency
manager the repo already uses.

If the repo uses **SPM**, add to `Package.swift` or via Xcode → Add Package
Dependency:
```swift
.package(url: "https://github.com/microsoft/clarity-ios", from: "1.0.0")
```
Target dependency: `.product(name: "Clarity", package: "clarity-ios")`.

If the repo uses **CocoaPods**, add to the `Podfile`:
```ruby
pod 'Clarity', '~> 1.0'
```
Then `pod install`.

If the repo uses **Carthage**, add to `Cartfile`:
```
github "microsoft/clarity-ios" ~> 1.0
```

## Step 2 — Initialize at app launch

Find the `@main` entry point. Initialize Clarity as early as possible —
ideally first thing in `application(_:didFinishLaunchingWithOptions:)` or in
the SwiftUI `App` `init()`. Match the existing analytics-init pattern in the
repo if there is one.

```swift
import Clarity

// At app launch, after any required environment setup
let config = ClarityConfig(projectId: "<CLARITY_PROJECT_ID>")
// Reasonable defaults for log level + user identification:
config.logLevel = .none  // .verbose only when debugging locally
ClaritySDK.initialize(config: config)
```

If the repo uses a typed config (e.g. `Environment.current.clarityProjectId`),
read from there rather than hardcoding the project ID — match the pattern of
existing third-party SDK config.

## Step 3 — Apply masking for sensitive fields

Clarity captures everything by default. **Mask** sensitive fields explicitly.
The masking API on iOS uses `ClaritySDK.mask(_:)` on a `UIView` (or the
SwiftUI modifier `.clarityMask()` if the SDK ships SwiftUI helpers — check
the docs).

**Mandatory mask list** (privacy + PII):
- Any password input (`UITextField` with `isSecureTextEntry = true`) — Clarity
  may auto-mask these but verify on a test recording.
- Email input fields in flows where they're paired with passwords (login,
  signup) — at minimum mask the *value*, the field can remain visible.
- Payment / card / SSN / DOB fields — mask hard.
- Any field marked `textContentType = .creditCardNumber, .password, .newPassword`
  — Clarity should auto-mask, but explicit `mask()` is safer.
- Personal contact info already on the user's profile (email, phone) when
  shown read-only.

**Verify privacy**: after the first recording lands in the dashboard, watch
it back and confirm passwords / payment fields render as solid blocks. If
anything readable leaks, add explicit `.mask()`.

## Step 4 — Custom events at known friction points (the experiment-specific work)

Tristan and I are running an A/B login experiment (Flow A vs Flow B). From
Snowflake we've already identified the friction surfaces below — fire a
Clarity custom event at each so we can correlate Clarity sessions with the
Snowflake events. Use `ClaritySDK.sendCustomEvent(_:)` with a stable name.

**Friction surfaces** (in priority order):

### 4.1 — Post-forgot-password screen reached
**Why**: Tristan asked specifically — Flow A has 196-278 forgot_password
taps but we don't know if those users actually proceed to the reset screen
or just bounced. Need a tracker on the page that loads AFTER the user taps
"Forgot password".

```swift
// In the view that loads after "Forgot password" is tapped (the password-reset screen)
// Place in viewDidAppear or .onAppear
ClaritySDK.sendCustomEvent("forgot_password_screen_reached")
```

If there's already a Rudder event firing on that screen, just colocate the
Clarity event alongside it — don't re-instrument from scratch.

### 4.2 — Login abandoned: email_entry (Flow B new step)
**Why**: Flow B introduces a new email-entry step. Snowflake shows 111
abandonment events here. Need to see what users do.

```swift
// In the email-entry view of Flow B
// On viewDidAppear:
ClaritySDK.sendCustomEvent("login_email_entry_viewed")
// On view dismissal WITHOUT progressing:
ClaritySDK.sendCustomEvent("login_email_entry_abandoned")
```

### 4.3 — Login abandoned: password_entry (both flows)
**Why**: Highest-volume abandonment surface (329 events Flow A, 167 Flow B).

```swift
// In the password-entry view (both flows)
ClaritySDK.sendCustomEvent("login_password_entry_viewed")
// On dismissal without success:
ClaritySDK.sendCustomEvent("login_password_entry_abandoned")
```

### 4.4 — Welcome screen viewed (entry funnel anchor)
**Why**: Anchors the funnel start so we can watch from the very first
screen if needed.

```swift
ClaritySDK.sendCustomEvent("welcome_screen_viewed")
```

### 4.5 — Account creation outcome
**Why**: We're trying to understand why we're seeing 0 indie account
creations. Even a tag on the success screen helps us replay and see what
account_type was selected.

```swift
// On the account-creation success view
ClaritySDK.sendCustomEvent("account_created_screen_reached")
// If the user_type / account_type is known at this point, set as a tag:
ClaritySDK.setCustomTag("account_type", value: accountType)  // "barber" / "shop"
ClaritySDK.setCustomTag("user_subtype", value: userType ?? "none")  // "Rental" / "Commission" / etc.
```

## Step 5 — User identification (correlate Clarity sessions with our user_id)

If the user is logged in, set the Clarity user identifier so we can connect
a Clarity session to a specific user we see in Snowflake / Rudder. Use the
same user ID you pass to Rudder.

```swift
// After successful login:
ClaritySDK.setCustomUserId(currentUser.id)
```

Don't include PII (email, phone) in custom user IDs — use the Squire
internal user UUID.

## Step 6 — Verify the integration

1. Build and run the app on a device or simulator.
2. Navigate through:
   - Welcome screen
   - Email entry (Flow B path)
   - Password entry
   - Forgot password tap → confirm post-forgot screen tracking
3. Wait ~5 minutes for the session to upload (Clarity batches uploads).
4. Open https://clarity.microsoft.com → your project → Sessions.
5. Confirm:
   - The session appears within 10 minutes
   - Custom events fire at the right moments (visible in the session
     timeline)
   - Password fields are masked (no readable text)
   - User ID tag is attached to logged-in sessions

## Step 7 — Open a PR but DO NOT MERGE without:

- Yurii's review (he owns iOS infra)
- A privacy walkthrough with someone on legal/security if the codebase
  doesn't already document Clarity in privacy disclosures
- App Store privacy nutrition label updated if Clarity counts as new data
  collection (it does — record session-replay-style data is "User Content"
  + "Identifiers" → check Apple's spec)

## What NOT to do

- Don't ship Clarity init unconditionally to Production until masking is
  verified on a real session recording.
- Don't include user PII in custom event names or tag values (e.g. don't
  tag with email, full name).
- Don't initialize Clarity multiple times — guard with a one-shot flag if
  there are multiple init paths.
- Don't add the project ID to a public commit. Use Xcode build settings,
  scheme env vars, or the existing secret-management pattern (whatever the
  repo uses for analytics keys).

---

## Appendix A — Creating the Clarity project (if Yurii hasn't done it)

If no project ID exists yet:

1. Go to https://clarity.microsoft.com → Sign in with the Microsoft account
   that owns Squire's analytics tooling (Yurii will know which one).
2. Create new project → name `Squire iOS — Onboarding Experiment`.
3. Platform: select **iOS** (or "Mobile app" — Clarity has had both labels).
4. Bundle ID: enter the iOS bundle ID (find it in the repo).
5. Save → copy the **Project ID** from the project settings.
6. Provide that ID to the iOS implementation step above.

## Appendix B — Open questions for the iOS team to answer in PR review

Surface these in the PR description for Yurii:

- Should Clarity init be gated by a feature flag (LaunchDarkly /
  GrowthBook) so we can roll it out gradually, or always-on for Release?
- Where do we store the Clarity project ID? (Env var, config plist, build
  setting?)
- Do we need to update the app's privacy disclosures / App Store data
  collection labels? (Likely yes.)
- Should we also instrument Android with the equivalent (Clarity Android
  SDK exists)? Cross-platform parity has been a value of this project so
  far — worth tracking in a follow-up.

## Appendix C — Friction surfaces we may add later

These didn't make the first round but are worth tracking once Clarity is
live. Treat as a follow-up backlog:

- Email check result screen (Flow B) — tag with the result (`returning`,
  `temp_password`, `new_user`) so we can replay sessions per outcome.
- Welcome → login transitions for users with cached SSO tokens (look for
  the "iOS auto sign-in" path Khem flagged in QA).
- Onboarding course screens (when Courses ships) — entirely new flow
  worth recording from day 1.

---

**End of prompt.** Paste everything between the `---` markers above into a
Claude Code session running inside the ios-commander repo. The Claude in
that session will read the repo, identify the dependency manager and entry
point, and execute the steps above. Report back here when the PR is ready
for review.
