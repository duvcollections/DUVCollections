# DUV Collections — brand assets

Identity: **Bloom** — three ink circles overprinting the way cyan, magenta and yellow
actually mix on press. The overlaps produce green, red and deep blue.

## Which file to use

| Situation | File |
|---|---|
| Site header, light background | `logo/duv-logo.svg` |
| Dark background (footer, gift tag, packaging) | `logo/duv-logo-reversed.svg` |
| Narrow or square space | `logo/duv-logo-stacked.svg` |
| One-colour print — neck labels, stamps, vinyl | `logo/duv-logo-mono-plum.svg` |
| One-colour on a dark garment | `logo/duv-logo-mono-white.svg` |
| Symbol alone — avatars, app icon, packing tape | `icon/duv-mark.svg` |
| Browser tab | `icon/favicon.ico` |
| iOS home screen | `icon/apple-touch-icon-180.png` |

Prefer the SVG everywhere on the web — it stays sharp at any size and the files are
tiny. The PNGs exist for places that can't take vector: marketplace seller profiles,
social avatars, print shops that ask for raster.

## Rules

- **Clear space** — keep empty space equal to the height of the mark on all sides.
- **Minimum size** — 24px tall for the full lockup, 20px for the mark alone. Below
  that the three circles start to merge.
- **Don't** recolour the mark, add effects, outline it, stretch it, or place the
  colour version on a mid-tone background. Use the one-colour version instead.
- **Never** rebuild the wordmark by typing "DUV COLLECTIONS" in a font — the letter
  spacing is custom and the shapes are outlined vectors with no font dependency.

## Colour

Full palette in `tokens/tokens.css` (CSS custom properties) and `tokens/tokens.json`.

Type is set in **Plus Jakarta Sans**. Body text is plum `#2E1065`, never black —
black flattens the palette.
