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
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase functions deploy device-pair
supabase functions deploy device-sync
supabase functions deploy device-events
```

5. Auth settings:
   - Disable public signups
   - Enable email provider
   - Invite caregivers via Authentication → Users

6. Optional: run seed on remote via SQL editor (copy from `supabase/seed.sql`)

## Web dashboard (Vercel)

1. Import the repo in Vercel
2. Set root directory to `web`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL)
4. Deploy

Add the Vercel URL to Supabase Auth → URL Configuration → Redirect URLs.

## iPhone app (TestFlight)

1. Update `ios/MomMeds/Config.local.xcconfig` (or a Release xcconfig) with production Supabase URL and anon key
2. Set your Apple Developer Team in Xcode signing settings
3. Archive and upload to App Store Connect
4. Distribute via TestFlight

Production Supabase URL format: `https://YOUR_PROJECT_REF.supabase.co`

## Security notes

- Device tokens are hashed (SHA-256) before storage; raw tokens exist only on the iPhone Keychain
- Edge functions use the service role key server-side only
- Dashboard access is protected by Supabase Auth + RLS
- For HIPAA-regulated use, arrange BAAs with Supabase and your hosting providers separately
