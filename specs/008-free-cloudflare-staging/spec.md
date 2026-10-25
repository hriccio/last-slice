# 008 — Free Cloudflare staging for Flutter PWA validation

**Status:** PWA published on Workers Free; static checks and TestKase iPhone Safari demo checkout pass; Home Screen installation and standalone launch pass
**Depends on:** [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md), [006 — Demo kitchen order board](../006-demo-kitchen-order-board/spec.md)

## Goal

Publish the Flutter Web/PWA client at a public Cloudflare URL for remote iOS Safari testing, while keeping Cloudflare usage at $0 and preserving the existing API and Supabase architecture.

## Staging behavior

- Build the existing Flutter Web app and publish its generated static files as an assets-only Cloudflare Worker on the account's Workers Free plan, using its `workers.dev` hostname. Do not add a custom domain, paid plan, paid add-on, container, or paid inference service.
- For this temporary validation stage, point the Flutter app to the local public-demo API through a Cloudflare Quick Tunnel. The API remains the existing local Node process in `KITCHEN_MODE=public-demo`, uses fictional in-memory demo orders and the deterministic fake assistant, and makes no OpenAI, Supabase, payment, or fulfillment requests.
- The public Quick Tunnel URL is temporary and accessible to anyone who has it. It only exposes the public-demo API; stop the tunnel and local API when remote mobile validation is complete. The PWA's API calls will fail while the tunnel or local API is stopped.
- Keep all Cloudflare environment configuration, build scripts, and output scoped to this staging deployment. Do not change production configuration or deploy the Node API as a Worker.

## Acceptance criteria

- [x] The Flutter Web release build and Cloudflare assets-only dry run succeed with a caller-supplied HTTPS API origin.
- [x] The published PWA is served from a `workers.dev` URL without adding a custom domain or paid Cloudflare resource.
- [x] The PWA loads its menu and completes a fictional public-demo checkout through the HTTPS Quick Tunnel while the local public API is running.
- [x] Both locales, manifest, icons, service worker, and standalone startup shell are present at the staging URL.
- [x] Cloudflare account remains on Workers Free and no metered AI, database, or other paid product is used.

## Non-goals

- A persistent, highly available staging API or a permanent public tunnel.
- Changing the API runtime, replacing Supabase, creating a new Supabase project, or storing credentials in Cloudflare.
- Testing multiple iOS devices/versions; validation used an iPhone 16 on iOS 26.5.
- Production deployment, custom domain, real payment, identity collection, or real fulfillment.

## Device validation

- TestKase Device Farm opened the staging PWA in an iPhone 16 session (iOS 26.5). The menu loaded through the HTTPS Quick Tunnel, the locale toggle displayed both languages, a Calabresa medium pizza was added to the bag, and the fictional checkout returned a demo order confirmation. The screen identified the checkout as demo-only with no real payment or delivery.
- A repeat TestKase session on 2026-10-25 (`45798ffb-bc04-401c-a67f-1054da3ccf51`) revealed Add to Home Screen by scrolling the collapsed Safari Share sheet. Open as Web App was enabled. Installation created the Last Slice Home Screen icon, and launching it loaded the Portuguese Flutter menu in standalone mode without Safari browser controls. The session was ended after validation.
