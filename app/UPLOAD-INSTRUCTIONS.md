# Trevo New Arrivals fix

This update replaces only `app/page.tsx`.

1. In GitHub, select the `secure-admin-images` branch.
2. Open the existing top-level `app` folder.
3. Choose **Add file** and **Upload files**.
4. Upload `page.tsx` from this ZIP's `app` folder.
5. Confirm that GitHub will replace the existing `app/page.tsx`.
6. Commit directly to `secure-admin-images` and wait for Vercel.

Do not upload the whole `app` folder while already inside GitHub's `app` folder. The final path must be exactly `app/page.tsx`.

After deployment, clicking **New arrivals** in the header, mobile menu, or footer will clear old filters and show six active products in the shop section.

