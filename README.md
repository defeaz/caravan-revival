# Caravan Revival

The live site at https://caravanrevival.com is published by GitHub Pages from the root of the `main` branch. The page uses `app.js`, `booking-studio.css`, `style.css`, and `updates.css`.

Booking availability, enquiries, and the £30 Stripe deposit flow use the shared Google Apps Script URL in `booking-config.js`. The Apps Script project stores bookings and availability in Google Sheets and confirms paid bookings in Google Calendar. Keep its deployment URL current when redeploying the script. Never commit Stripe keys or Google credentials.

To edit wording, change root `index.html` on `main`. The retired `migrate-github-pages` branch contains a Harbour Shine page and must not be selected as this site's Pages source.
