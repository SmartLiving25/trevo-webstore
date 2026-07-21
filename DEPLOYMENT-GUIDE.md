# Trevo deployment and daily-use guide

## 1. Add your logo

1. Keep the filename exactly `logo.png` (lowercase).
2. In GitHub open the `secure-admin-images` branch.
3. Open `public`, then open `images`.
4. Click **Add file → Upload files**.
5. Select `logo.png` from your computer.
6. Click **Commit changes** and commit to `secure-admin-images`.

The website already reads the logo from `/images/logo.png`. Until that file is uploaded, the TREVO text wordmark remains visible.

Recommended logo: transparent PNG, horizontal layout, about 600–1200 px wide, under 1 MB.

## 2. Test the branch before making it live

1. Wait for the Vercel deployment for `secure-admin-images` to show **Ready**.
2. Open its Preview URL.
3. Visit `/admin` at the end of that Preview URL.
4. Sign in with the Firebase admin email.
5. Add or edit a product with at least four unique image URLs.
6. Add every colour as a separate variant with its own swatch, stock and image URLs.
7. Open the storefront in a private/incognito window. Confirm the product and colour galleries appear.
8. Place one test order. Return to `/admin` and confirm the same order number appears.
9. Change its status and mark payment paid. Refresh and confirm the changes remain.

## 3. Make the tested branch live

1. In GitHub open **Pull requests**.
2. Click **New pull request**.
3. Set **base** to `main` and **compare** to `secure-admin-images`.
4. Click **Create pull request**.
5. Check that Vercel reports a successful build.
6. Click **Merge pull request**, then **Confirm merge**.
7. Vercel automatically deploys `main` to `trevopk.com`.

## 4. Product image links from GitHub

1. Upload product images inside `public/images/products/PRODUCT-SKU/` in this repository.
2. After the branch is live, use links such as:
   `https://trevopk.com/images/products/TRV-SHB-012/front.jpg`
3. In Admin → Products, paste those links into the correct colour variant.

Use simple lowercase filenames without spaces, for example `black-front.jpg`.

## 5. Important security rules

- Never upload the downloaded Firebase service-account JSON file to GitHub.
- Never paste `FIREBASE_PRIVATE_KEY` into source files.
- Keep all Firebase server variables only in Vercel Environment Variables.
- Firestore browser access is denied; products and orders pass through validated server APIs.
