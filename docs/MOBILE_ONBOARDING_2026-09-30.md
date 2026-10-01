# Mobile onboarding stability — 2026-09-30

Production Cloudflare Pages deployment: 23fb0d69.

## Code-confirmed causes

- updateDisplayName/updateHandle called syncUI on each input. The normal application had no persistent onboarding modal host, so this notified the store and rebuilt the reactive modal root. A host, when supplied, also replaced all descendants through innerHTML.
- Name/handle inputs contained inline smooth scrollIntoView on focus. Recreating/refocusing them interacted with mobile keyboard viewport movement.
- Mobile inputs used sub-16px text. Mobile Safari may zoom when focusing them.
- Full-height mobile modal used 100dvh minimum height and nested overlay/body scrolling rather than the application's measured visible keyboard viewport.

## Repairs

- Onboarding owns a body portal outside app-modal-root. It mounts after the initial application scaffold and remains independent of background store patches.
- syncUI patches existing elements and only changed attributes/text. Active input nodes and their selection/value remain intact. This applies across profile, interest selection and recovery stages. Step changes reset only the step body's scroll.
- Removed forced focus scrolling. Async handle parsing rechecks the requested handle after JSON decoding to prevent an old response overwriting new input validation.
- Modal height follows --app-viewport-height, with one constrained step-body scroll container. The mobile footer remains within the visible viewport, and inputs use 16px text. Mobile onboarding backdrop blur is disabled.
- The optional rapid onboarding also uses visible viewport constraints and 16px inputs; its automatic focus was removed.
- Profile save, interest persistence, recovery requirements and sovereign identity/DM crypto remain unchanged.

## Validation and limits

Frontend TypeScript and production build succeeded. Live homepage returned 200, references main-BPx4-NjY.js, and live app-Op3U-Nyl.js matches local dist SHA-256. No automated unit/E2E suites were run for this pass. Physical iOS/Android keyboard and scrolling behavior has not been verified on the owner's device. Previous test counts are not results for this change.