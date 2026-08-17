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
- **`paytabs.svg` is not a PayTabs wordmark.** PayTabs ships no corporate mark
  in its own Magento module; what it uses to represent card payment is a
  222x42 scheme strip (mada / Mastercard / VISA), wrapped here as base64 in an
  SVG so the `<id>.svg` convention still holds. That arguably reads better to a
  customer than a gateway brand they have never heard of — the row already says
  "PayTabs" in text — but swap in a real wordmark if you would rather have one.
