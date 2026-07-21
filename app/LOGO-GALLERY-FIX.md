# Trevo logo and quick-view gallery update

Replace these two files on the `secure-admin-images` branch:

- `app/page.tsx`
- `app/globals.css`

The header now displays the existing coloured `public/images/logo.png` emblem beside the name **Trevo**. No colour filter is applied.

In product Quick View:

- Left/right arrows move through every image from every saved colour.
- Moving to an image automatically selects its colour swatch.
- Clicking a colour swatch jumps to that colour's first image.
- Thumbnail clicks also update the selected colour.

After committing, wait for Vercel Preview to become **Ready**, open it, and press `Ctrl + F5`.
