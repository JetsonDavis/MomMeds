# MomMeds Local Setup

## Prerequisites

- Node.js 20+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker Desktop (for local Supabase)
- Xcode 16+ (for the iPhone app)

## 1. Start Supabase

```bash
cd /path/to/MomMeds
supabase start
```

Copy the `API URL`, `anon key`, and `service_role key` from the output.

Apply migrations and seed data:

```bash
supabase db reset
```

Serve edge functions locally:

```bash
supabase functions serve --env-file supabase/.env.local
```

Create `supabase/.env.local`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 2. Web dashboard

```bash
cd web
cp .env.local.example .env.local
```

Fill in `.env.local` with keys from `supabase status`.

Install and run:

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3000/login

### Create a caregiver account

Public signups are disabled. Create a user in Supabase Studio:

1. Open http://127.0.0.1:54323
2. Authentication → Users → Add user
3. Set email and password

Sign in at http://127.0.0.1:3000/login

## 3. iPhone app

```bash
cd ios/MomMeds
cp Config.local.xcconfig.example Config.local.xcconfig
```

Edit `Config.local.xcconfig` with your Supabase URL and anon key.

Open `MomMeds.xcodeproj` in Xcode, select a simulator, and Run.

### Pair the simulator

1. In the dashboard, open a patient
2. Click **Generate pairing code**
3. Enter the 6-digit code in the iPhone app

## 4. End-to-end smoke test

1. Create a patient in the dashboard
2. Add medications
3. Generate a pairing code and pair the iPhone app
4. Tap **I feel great**, **I am having pain** (with slider), and **I took \<medication\>**
5. Confirm events appear in the patient's recent events list
6. Open **View charts** and verify hourly/daily data

## Troubleshooting

- **401 on device calls**: pairing code expired (15 minutes) or device revoked — generate a new code
- **Events not appearing**: check `supabase functions serve` is running and iOS `Config.local.xcconfig` points to the same Supabase URL
- **Login redirect loop**: confirm `.env.local` has valid Supabase keys and the caregiver user exists
