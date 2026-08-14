# Trevo shipping settings

## What was added

- One Firestore settings document: `storeSettings/shipping`.
- A public read/admin-only update API at `/api/settings/shipping`.
- A new **Shipping** screen in `/admin`.
- One shared calculation used by storefront totals and the order API.
- Server-side recalculation before every order is saved.
- Dynamic delivery messages on the home page and information pages.
- The legacy Firebase `createOrder` function now reads the same Firestore document.

The first time the feature runs, the safe defaults are:

- Flat nationwide shipping: **Rs. 200**
- Conditional free shipping: **off**
- Order-value threshold: **more than Rs. 2,000**

No manual Firestore document needs to be created. Saving the admin form creates it.

## How to manage shipping

1. Open `https://www.trevopk.com/admin` and sign in.
2. Select **Shipping** in the left menu.
3. Enter the flat shipping fee.
4. To offer free shipping, turn on **Conditional free shipping**.
5. Enable either or both rules:
   - **Order-value rule:** free when the product subtotal is greater than the entered value.
   - **Date rule:** choose one start date for a single day, or add an end date for an inclusive range.
6. Select **Save and publish shipping settings**.

Both conditions use OR logic: if either enabled condition matches, shipping is free. Dates are evaluated using Pakistan time.

## Deployment

1. Upload/replace the project files in the `main` branch of `trevo-webstore`.
2. Commit the changes.
3. Vercel will deploy the `main` branch automatically.
4. When the deployment says **Ready**, open `/admin`, select **Shipping**, and save the desired policy once.

No new Vercel environment variable and no Firebase rule change is required. The existing Firebase Admin credentials are used by the protected API.

## Safety behavior

- A customer cannot reduce the fee by editing the browser request.
- The order API always reloads the latest policy and calculates the final fee itself.
- The saved order records the actual shipping fee and the free-shipping reason.
- If the settings document is missing, the store uses the Rs. 200 default.
