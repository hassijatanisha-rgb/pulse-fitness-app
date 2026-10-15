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
- Gym classes, day passes, trainer discovery, trainer matching, and membership renewal
- Private and group Stretch bookings
- Padel court booking without an account
- Padel court availability locks and server-ready duplicate-slot validation
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
- Responsive desktop and mobile interfaces

## Included admin flows

- Admin sign-in demo (`admin@admin.com` / `12345678`)
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

This build is intentionally integration-ready but does not send real payments, emails, push notifications, or OkayFit requests. Email and text controls open the visitor's installed mail or messaging app with a prepared message. Data persists in each browser using `localStorage`; it is not shared between devices. Production adapters need:

- Selcom merchant credentials, webhook URL, and confirmed refund contract
- OkayFit API/partner documentation and credentials
- Transactional email provider credentials
- Push notification project credentials

The demo admin credentials are implemented in client-side JavaScript and are not secure enough for production. Replace them with server-side authentication before using real customer data.

## Preview routes

- `?view=entry` — welcome screen
- `?view=guest` — guest experience
- `?view=member` — member experience
- `?view=admin` — admin portal
