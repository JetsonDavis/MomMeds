# MomMeds Deployment

## Supabase (backend)

1. Create a project at https://supabase.com/dashboard
2. Link the local repo:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. Push schema:

```bash
supabase db push
```

4. Deploy edge functions:

```bash
supabase functions deploy device-pair
supabase functions deploy device-sync
supabase functions deploy device-events
```

Supabase automatically injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into deployed edge functions. You do **not** need `supabase secrets set` for those names — the CLI rejects secrets starting with `SUPABASE_`.

The **service_role** key is only needed in `web/.env.local` (and Vercel env vars) for the Next.js dashboard. Copy it from **Project Settings → API → Legacy anon, service_role API keys**.

5. Auth settings:
   - Disable public signups
   - Enable email provider
   - Invite caregivers via Authentication → Users

6. Optional: run seed on remote via SQL editor (copy from `supabase/seed.sql`)

## Web dashboard (Vercel)

1. Import the repo in Vercel
2. Set root directory to `web`
3. Add environment variables (from **Legacy anon, service_role API keys** in Supabase):

   | Key | Vercel type | Value |
   |-----|-------------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | **Config** | `https://YOUR_PROJECT_REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Config** | legacy **anon** key |
   | `NEXT_PUBLIC_SITE_URL` | **Config** | `https://your-app.vercel.app` |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | legacy **service_role** key |

   Use **Config** for all `NEXT_PUBLIC_*` vars. Only the service role key should be **Secret**. If you created a `NEXT_PUBLIC_*` var as Secret by mistake, delete it and re-add as Config (Vercel does not allow converting Secret → Config).

4. Deploy

Add the Vercel URL to Supabase Auth → URL Configuration → Redirect URLs:

```
https://your-app.vercel.app/**
```

## iPhone app

The patient iPhone app does **not** log in. It pairs once with a 6-digit code from the caregiver dashboard, then sends events using a device token stored in the Keychain.

**Before you start:** Supabase (schema + edge functions) must be deployed to the cloud. The phone cannot talk to `127.0.0.1`.

Production Supabase URL format: `https://YOUR_PROJECT_REF.supabase.co`

### Step 1 — Point the app at production Supabase

1. Open a terminal in the repo root.
2. Copy the example config if you have not already:

```bash
cd ios/MomMeds
cp Config.local.xcconfig.example Config.local.xcconfig
```

3. Edit `ios/MomMeds/Config.local.xcconfig`:

```xcconfig
#include "Config.xcconfig"

SUPABASE_URL = https:/$()/YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY = eyJ...your-legacy-anon-key...
```

Get the **anon** key from Supabase → **Project Settings → API → Legacy anon, service_role API keys**.

**Do not** put the service role key in the iPhone app. Only the anon key belongs here.

This file is gitignored — it stays on your Mac only.

### Step 2 — Apple Developer account

1. Enroll at [developer.apple.com](https://developer.apple.com) ($99/year) if you are not already enrolled.
2. You need this for TestFlight and for installing on someone else's iPhone long-term.

### Step 3 — Open Xcode and turn on code signing

This step tells Xcode **who is allowed to install the app on an iPhone** (you, via your Apple Developer account). You are not changing app code — just signing settings.

#### 3a. Open the project

1. On your Mac, open **Finder**.
2. Go to the MomMeds folder on your Mac (wherever you cloned the repo).
3. Open `ios` → `MomMeds`.
4. Double-click **`MomMeds.xcodeproj`** (blue Xcode icon).

Xcode should open. If macOS asks to install extra components, allow it.

#### 3b. Find the signing screen

1. In Xcode's **left sidebar** (Project Navigator), click the **top item** named **MomMeds** with a blue app icon.
2. In the **middle column**, under **TARGETS**, click **MomMeds** (not "MomMedsTests" if you see tests).
3. Across the top of the main area, click the **Signing & Capabilities** tab.

You should see a section called **Signing**.

#### 3c. Set your team

1. Check **Automatically manage signing**.
2. Open the **Team** dropdown:
   - If you see your name or company → select it.
   - If it says **Add an Account…** → click it, sign in with your Apple ID (the one enrolled in the Developer Program), then select that team.
3. Leave **Bundle Identifier** as `com.mommeds.app` unless Xcode says it is already taken — then change it slightly (e.g. `com.jetsondavis.mommeds`).

#### 3d. Confirm it worked

Under **Signing**, you should see **no red errors**. A green or neutral status like "Signing Certificate: Apple Development" is fine.

Common errors:

| Error | What to do |
|-------|------------|
| "Signing requires a development team" | Pick a **Team** in the dropdown, or add your Apple ID |
| "Failed to register bundle identifier" | Change **Bundle Identifier** to something unique (e.g. add your name) |
| "No profiles found" | Keep **Automatically manage signing** checked; Xcode creates the profile |

When signing shows no errors, you are done with Step 3.

### Step 4 — Build and run on a test device (optional)

Good for a quick test before TestFlight:

1. Connect the iPhone with a USB cable (or enable wireless debugging).
2. On the iPhone: trust the computer if prompted.
3. In the **top toolbar**, click the device menu (see below) and choose your **physical iPhone** by name.
4. Click **Run** (▶) — the triangle button in the top-left of Xcode.

The app should launch on the phone. Skip to **Step 7** to pair it.

**Note:** Direct installs from Xcode are fine for testing. For ongoing use without your Mac, use TestFlight (Step 5).

### Step 5 — Upload to TestFlight (recommended for the patient)

#### Where is the run destination menu?

Look at the **top toolbar** in Xcode — the row with the ▶ Run and ■ Stop buttons.

Immediately to the **right of ▶ Run**, there is a dropdown that might currently say something like `iPhone 16` or `MomMeds > iPhone 16 Simulator`.

```
[ ▶ Run ] [ ■ Stop ] [ MomMeds  ▼ ] [ iPhone 16 Simulator  ▼ ]  ← click THIS dropdown
```

Click that **right-hand dropdown** (the device name, not the scheme name `MomMeds`).

In the menu:

1. Under **iOS Simulators** — ignore these (do not pick a simulator).
2. Under **iOS Devices** or at the top — choose **Any iOS Device (arm64)**.

   Some Xcode versions show **Any iOS Device** without “(arm64)” — that is the same choice.

You must pick **Any iOS Device** before archiving. If a simulator is selected, **Product → Archive** is grayed out or builds the wrong thing.

#### Xcode version requirement

App Store Connect requires builds made with the **current Xcode SDK** (as of iOS 26, that means **Xcode 26 or later**). If upload fails with an SDK version error, update Xcode from the **Mac App Store** → search **Xcode** → Update. Then archive again.

Check your version: **Xcode → About Xcode**. You cannot work around this by changing project settings — you must update Xcode.

#### Archive and upload

1. With **Any iOS Device (arm64)** selected, menu: **Product → Archive**.
2. When the Organizer opens, select the archive → **Distribute App**.
3. Choose **App Store Connect** → **Upload** → follow the prompts.
4. Go to [App Store Connect](https://appstoreconnect.apple.com).
5. **My Apps** → create an app for MomMeds if one does not exist (use the same bundle ID as Xcode).
6. Open the app → **TestFlight** tab.
7. Wait for the build to finish processing (often 5–30 minutes).
8. Add the patient (or yourself) as a tester:
   - **Internal testing** — up to 100 users on your team, no Apple review
   - **External testing** — requires brief Beta App Review the first time
9. The tester installs **TestFlight** from the App Store, accepts the invite, then installs MomMeds.

#### Upload validation errors

| Error | Fix |
|-------|-----|
| Missing 120x120 icon / `CFBundleIconName` | Pull latest repo — `AppIcon.appiconset` must include 120×120, 180×180, and 1024×1024 PNGs |
| SDK version / iOS 26 SDK required | Update to **Xcode 26+** from the Mac App Store, then **Product → Archive** again |

### Step 6 — Create the patient in the dashboard

On your computer (or any browser):

1. Sign in to the caregiver dashboard (`https://your-app.vercel.app/login`).
2. Create a patient (**New patient**).
3. Add their medications.
4. Do **not** generate the pairing code yet — do that when you have the iPhone in hand (codes expire in 15 minutes).

### Step 7 — Pair the iPhone (one time)

1. In the dashboard, open the patient → **Generate pairing code**.
2. On the iPhone, open MomMeds.
3. Enter the 6-digit code → **Pair iPhone**.
4. The home screen should show the patient's name and medication buttons.

If pairing fails:

- **Invalid / expired code** — generate a new code (15-minute limit).
- **Cannot connect** — the app still points at localhost; rebuild after fixing `Config.local.xcconfig`.
- **Unauthorized** — device was revoked; generate a new code.

### Step 8 — Verify end-to-end

1. On the iPhone, tap **I feel great**.
2. In the dashboard, open the patient — the event should appear under **Recent events**.
3. Tap **I am having pain**, set a level, tap **Record pain** — confirm it appears.
4. Tap **I took \<medication\>** — confirm it appears.
5. Open **View charts** — confirm data shows up.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| App builds but cannot pair | Confirm edge functions are deployed: `supabase functions deploy device-pair` (and sync, events) |
| "Invalid server URL" | In `Config.local.xcconfig` use `https:/$()/YOUR_PROJECT_REF.supabase.co` (not `https://` — `//` is a comment in xcconfig files). Rebuild and upload a new TestFlight build after fixing. |
| Events never appear | Confirm anon key (not service role) is in `Config.local.xcconfig`; rebuild and reinstall |
| Settings / unpair | Tap the patient name at the top of the home screen **5 times** |

### Hidden settings on the iPhone

Tap the **patient name** at the top of the home screen five times to open Settings (sync status, unpair, re-pair).

## Security notes

- Device tokens are hashed (SHA-256) before storage; raw tokens exist only on the iPhone Keychain
- Edge functions use the service role key server-side only
- Dashboard access is protected by Supabase Auth + RLS
- For HIPAA-regulated use, arrange BAAs with Supabase and your hosting providers separately
