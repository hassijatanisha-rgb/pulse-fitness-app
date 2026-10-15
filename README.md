# Pulse Fitness prototype

Open `index.html` directly, or serve this folder with any static web server.

## Brand direction

The interface is aligned to Pulse's public brand surfaces:

- `pulse.co.tz` — official geometric wordmark, black-and-white foundation, gym photography, and elite-performance positioning
- `@pulsetanzania` — condensed editorial typography, monochrome campaign system, heartbeat motif, and direct action-led messaging
- `@stretchbypulse` — warm ivory, taupe, sage, natural studio imagery, and softer editorial/script typography

The official Pulse wordmark and public photography are stored locally in `assets/` so the prototype does not depend on third-party image hosting.

## Included customer flows

- Member sign-in demo and guest access
- Official Pulse weekly Gym timetable with section-specific class booking, day passes, trainer discovery, trainer matching, and membership renewal
- Stretch Out Pilates Reformer and premium mat class bookings
- Padel court booking without an account
- Padel overlap protection plus admin-controlled court pricing and booking length (90 minutes by default)
- Admin-editable Gym calendar with class dates, times, instructors, capacity, pricing, and visibility
- Padel community with open matches, skill levels, friends, and SMS handoff
- Member promotions with claim state and automatic off-peak court discounts
- Club ladder rankings, match history, result entry, and point updates
- Tournament and league registration with capacity, brackets, and event agendas
- Members-only Juice Bar preorders with pickup times and Selcom-style payment
- Pay-in-app Selcom-style checkout and pay-on-arrival selection
- Unique booking confirmation numbers
- Seven-day service calendars with selectable dates and times
- Customer booking history and 24-hour cancellation enforcement
- Booking confirmation and policy messaging
- Branded booking-email preview and a Google Apps Script backend that stores reservations in a central Sheet and sends confirmation email
- Responsive desktop and mobile interfaces

## Included admin flows

- Admin sign-in verified by the Google Apps Script service with a short-lived server session
- Operations overview and live activity
- Booking filters and customer contact records
- One-tap email and text-message drafts for customers
- Full booking editing for service, date, time, status, and payment status
- Check-in and payment-at-reception updates
- Cancellation and automatic refund state
- No-show fees, booking blocks, and fee collection
- Trainer request acceptance and rejection
- Persistent trainer goals, contact details, and preferred meeting times
- Payment and integration status screens

## Integration boundary

This build does not send real payments, push notifications, or OkayFit requests. The Google Apps Script endpoint in `config.js` atomically validates Padel conflicts, writes reservations to the central **Pulse Fitness Reservations** Google Sheet, sends confirmation email from `hassijatanisha@gmail.com`, serves shared court settings and Gym schedules, and supplies authenticated booking data to the admin portal. Local storage is now only a client-side cache for fast rendering and non-critical demo community state. Email and text controls in the admin portal open the visitor's installed mail or messaging app with a prepared message. Production adapters still need:

- Selcom merchant credentials, webhook URL, and confirmed refund contract
- OkayFit API/partner documentation and credentials
- Push notification project credentials

The admin password is not present in the frontend repository. Google Apps Script validates the submitted SHA-256 value and issues a six-hour in-memory server session. Before deploying the backend source, store that verifier in the private Apps Script property `PULSE_ADMIN_PASSWORD_SHA256`; never commit its value. Before a full public launch, replace the fixed demo credential with per-user accounts and multi-factor authentication.

## Preview routes

- `?view=entry` — welcome screen
- `?view=guest` — guest experience
- `?view=member` — member experience
- `?view=admin` — admin portal
