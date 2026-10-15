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

- Admin sign-in demo with client-side SHA-256 verification (no plain-text password stored in the repository)
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

This build does not send real payments, push notifications, or OkayFit requests. The deployed Google Apps Script endpoint in `config.js` writes every new reservation idempotently to a central **Pulse Fitness Reservations** Google Sheet and sends its confirmation email from `hassijatanisha@gmail.com`. The remaining UI state persists in each browser using `localStorage`. Email and text controls in the admin portal open the visitor's installed mail or messaging app with a prepared message. Production adapters still need:

- Selcom merchant credentials, webhook URL, and confirmed refund contract
- OkayFit API/partner documentation and credentials
- Push notification project credentials

The demo admin credentials are implemented in client-side JavaScript and are not secure enough for production. Replace them with server-side authentication before using real customer data.

## Preview routes

- `?view=entry` — welcome screen
- `?view=guest` — guest experience
- `?view=member` — member experience
- `?view=admin` — admin portal
