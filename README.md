# Caravan Revival

Website and booking system for `caravanrevival.com`.

## Launch setup

1. Import this GitHub repository into Netlify. The publish and functions directories are configured in `netlify.toml`.
2. Create a Supabase project and run `supabase.sql` in its SQL editor.
3. Add every variable from `.env.example` to Netlify environment variables.
4. In Stripe, add a webhook endpoint at `https://caravanrevival.com/api/stripe-webhook` for `checkout.session.completed`, then copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
5. Verify `caravanrevival.com` in Resend and create `bookings@caravanrevival.com` as the sending identity.
6. Add the domain to Netlify and copy the displayed DNS records into GoDaddy DNS.

Bookings and blocked dates can initially be managed in the Supabase table editor. A dedicated owner calendar is the next deployment step after authentication is chosen.

Never commit live Stripe, Supabase or Resend secrets.
