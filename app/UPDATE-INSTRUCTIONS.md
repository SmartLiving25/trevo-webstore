# Trevo storefront update

This update changes only the customer-facing storefront. It does not change Firebase, products, orders, authentication, or the admin dashboard.

## Included files

- `app/page.tsx`
- `app/globals.css`

## Upload to GitHub

1. Open the `secure-admin-images` branch of `SmartLiving25/trevo-webstore`.
2. Open the existing top-level `app` folder. The address must end with `/tree/secure-admin-images/app`.
3. Click **Add file**, then **Upload files**.
4. Upload only `page.tsx` and `globals.css` from this ZIP's `app` folder.
5. Confirm that GitHub says both existing files will be replaced.
6. Commit directly to the `secure-admin-images` branch.
7. Wait for Vercel to finish the automatic deployment.

Do not upload the whole `app` folder while already inside GitHub's `app` folder. The correct paths are exactly `app/page.tsx` and `app/globals.css`, never `app/app/page.tsx`.

Keep the existing repository file `public/images/logo.png`. The updated stylesheet now displays that complete image without the previous forced crop.

## What changed

- Complete `logo.png` is contained inside the logo mark without changing its colours.
- Privacy, Terms, and Returns open as readable popup panels.
- Damaged parcels may be reported within two days through WhatsApp.
- Product quick view shows the colour-variation notice.
- Instagram, Facebook, TikTok, and WhatsApp are shown with icons and platform names only.

