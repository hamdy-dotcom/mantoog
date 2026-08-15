# Gateway logos

Drop the official SVG from each provider's brand kit here, named by gateway id:

    paytabs.svg
    tabby.svg
    tamara.svg

These are trademarked marks, so take the provider's own file rather than redrawing
it. `GatewayLogo.tsx` falls back to the definition's emoji when a file is missing —
no code change is needed once you add one.

Two things to know:

- **They must be committed to deploy.** `public/` is served straight off the
  instance, so a logo that exists only on a dev machine renders as the emoji
  fallback in production.
- **`tamara.svg` is a raster in an SVG wrapper** — a 1024x539 PNG embedded as
  base64, ~420 KB, drawn in black on transparency. Hence the light plate in
  `GatewayLogo.tsx`. A true vector wordmark from Tamara's partner portal would
  be smaller and sharper if one becomes available.
