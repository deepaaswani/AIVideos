# Individual account signup and login

The responsive `/signup` and `/login` pages use the existing Sapphire, Royal blue, Quicksand and Shellstone palette. `/signin` redirects to `/login`. They use Supabase email/password authentication, server actions, cookie-backed sessions and Next.js 16 Proxy. No service-role key, customer password table, organization signup or email-confirmation page is introduced.

## Hosted configuration

Append the following to `apps/web/.env.local`, preserving the existing narration configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
```

Never use a database password or a secret/service-role key in a `NEXT_PUBLIC_` variable. The server verifies sessions with Supabase rather than trusting decoded cookie text. Proxy forwards refreshed cookies into both the request and response, including private/no-store response headers.

### Immediate signup without confirmation

The owner must disable **Confirm email** in the hosted Supabase project's authentication settings and save the change. The location can be Authentication → Sign In / Providers; the project may present Confirm email in the user-signup settings rather than inside the Email provider panel. This is an external project setting and is not changed by application code.

Signup checks `/auth/v1/settings` using the publishable key before calling `signUp`. If `mailer_autoconfirm` is not exactly `true`, it does not submit signup and does not intentionally initiate a confirmation email. The UI shows a temporary-unavailability message. No admin auto-confirm bypass or confirmation-mail resend is implemented. If the hosted setting changes between preflight and signup, the provider controls the outcome; only a returned session counts as success.

### Personal workspace

The SQL foundation must already be applied. Its `auth.users` insert trigger provisions a profile, private workspace, preferences and an unfunded credit account. No free allowance is invented on signup. The protected welcome page calls the idempotent `app.ensure_personal_workspace` function and reads only owner-scoped project summaries.

If using the Supabase Data API, expose `app`, keep `private` unexposed and retain the migration's restricted table/function grants. Missing schema access produces a recoverable workspace-loading message; it does not bypass ownership policies or fabricate projects.

## Routes and scope

| Route | Behavior |
| --- | --- |
| `/signup` | Name, email, password; immediate sign-in when hosted confirmation is disabled |
| `/login` | Email/password login |
| `/signin` | Login alias with a validated return destination |
| `/dashboard` | Protected personal welcome page, owned recent project titles and local-device logout |

The welcome page is an authentication landing screen, not the complete V1 dashboard or creative studio. The existing prototype remains a public demonstration. Homepage Create video buttons enter the protected welcome flow; direct example links remain available.

Password recovery, social login, the complete dashboard, and project creation/editing remain later tasks. Account form validation preserves name/email after an error and never returns password values in action state. Password visibility controls, field errors, pending states, focus management and reduced-motion behavior are included.

## Verification

Run `npm run check` and `npm run build` at the repository root. Focused tests are in `scripts/auth.test.ts`; they cover redirect injection, invalid input, confirmation gating, session-required success, credential preservation, rate limits and error sanitization.

Verify on the hosted project with owner-controlled test accounts: immediate signup, auto-created personal workspace, logout, login, refresh persistence, guest redirects and two-account isolation. Unit tests do not establish hosted signup or RLS behavior. Do not put test account passwords, tokens or API keys in verification evidence.
