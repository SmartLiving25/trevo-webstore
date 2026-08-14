# Trevo Fashion Store

A production-oriented, responsive e-commerce webstore and admin dashboard for Trevo. The project includes a customer storefront, product galleries, catalog filters, cart, wishlist, checkout, WhatsApp order handoff, advance-payment tracking, admin analytics, product/order/customer/payment management, durable Sites storage adapters, Firebase integration, Cloud Functions, security rules, CSV import and image-upload scripts.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Customer webstore |
| `/admin` | Trevo admin dashboard |
| `/setup` | Non-technical setup and deployment guide |
| `/api/orders` | Validated order create/list/update API |
| `/api/products` | Product API |
| `/api/uploads` | Authenticated image upload to Sites R2 |

## Recommended stack

- Web: Vinext/Next.js-compatible App Router, React 19, TypeScript, Tailwind build pipeline, custom responsive CSS.
- Hosted persistence: OpenAI Sites D1 for structured records and R2 for uploaded images.
- Requested external backend: Firebase Authentication, Firestore, Cloud Storage and Cloud Functions. The complete adapter and deployment files are included.
- WhatsApp: `wa.me` checkout works immediately; optional Meta WhatsApp Cloud API webhook supports automated templates.
- Payments: manual JazzCash, EasyPaisa and bank transfer are the MVP; the provider webhook is ready for an approved card/wallet gateway. Card data must stay on the provider's hosted/tokenized interface.

## Architecture

```text
Customer / Admin browser
        |
        v
React storefront + admin
        |
        v
Validated server APIs / Firebase callable functions
        |
        +---- Products, orders, customers, payments ---- Firestore or Sites D1
        +---- Product photos / payment proofs ---------- Firebase Storage or Sites R2
        +---- Customer messages ------------------------- WhatsApp Cloud API
        +---- Payment confirmation ---------------------- Signed gateway webhook
```

The server recalculates subtotal, shipping and total. It never trusts browser totals. Order records maintain separate `status`, `paymentStatus`, `advanceAmount`, `deliveryMethod` and `trackingCode` values so fulfilment and payment remain auditable.

## Store rules already implemented

- Admin-managed nationwide delivery (default Rs. 200) with optional order-value and offer-date free-shipping rules.
- JazzCash and EasyPaisa: 0300 7041451 with no extra fee.
- Bank transfer: customers request the current instructions through Trevo WhatsApp.
- COD: no advance payment required.
- WhatsApp number: +92 300 7041451.

## Quick start

Requirements: Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by the development server. The catalog already contains the 11 products supplied in `TREVO_Firebase_Products.csv`.

## Firebase setup

1. Create a Firebase project, a web app, Firestore, Authentication and Storage.
2. Copy `.firebaserc.example` to `.firebaserc` and replace the project ID.
3. Copy `.env.example` to `.env.local` and fill the Firebase values.
4. Download a Firebase service-account JSON. Keep it outside the repository and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path.
5. Install the Firebase CLI, sign in and deploy:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions,firestore:rules,storage
```

For the owner account, set a Firebase custom claim `{ admin: true }`. Firestore and Storage rules permit product/order management only to this admin claim. Enable App Check before running paid traffic.

## Product CSV

The supplied catalog is stored at `data/TREVO_Firebase_Products.csv`. Supported headings are:

`SKU,Product Name,Category,Regular Price,Sale Price,Stock,Image URL`

Optional headings are:

The importer also supports the extended lowercase headings in `data/products.sample.csv` for colors, sizes, materials and multiple images.

Use a vertical bar for multiple values, e.g. `Sage|Black|Ivory` and `url-1|url-2|url-3`.

Validate first, then import:

```bash
npm run firebase:import:check -- --file "data/TREVO_Firebase_Products.csv"
npm run firebase:import -- --file "data/TREVO_Firebase_Products.csv"
```

The importer uses Firestore batches, validates required columns and safely merges by product ID.

## Product images

Create one directory per SKU:

```text
data/product-images/
  TRV-SHB-001/
    01.jpg
    02.jpg
  TRV-TOT-002/
    01.webp
```

Then run:

```bash
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app \
npm run firebase:upload-images -- --folder "data/product-images"
```

The uploader accepts JPG, PNG and WebP, uploads images in filename order and updates the Firestore product matching the directory SKU.

## WhatsApp integration

Immediate checkout uses a pre-filled `https://wa.me/...` link. It includes item name, selected color, quantity, subtotal, delivery and total.

For automated order confirmations and tracking:

1. Create a Meta Business app and add WhatsApp.
2. Add `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_VERIFY_TOKEN` to the Firebase Functions environment/secrets.
3. Deploy `whatsappWebhook` and register its URL in Meta.
4. Create and approve transactional templates for order confirmation, payment reminder, dispatch and delivery.

The webhook stores event payloads for the admin message history. Verify Meta webhook signatures before enabling production automation.

## Payment integration

The MVP supports cash on delivery with no advance payment and optional full advance-payment proofs. For an online gateway:

1. Complete merchant onboarding with a supported provider.
2. Set `PAYMENT_PROVIDER`, public/secret keys and `PAYMENT_WEBHOOK_SECRET` in the hosting environment.
3. Create a payment session on the server, not in the browser.
4. Register the deployed `paymentWebhook` URL with the provider.
5. Verify the provider's official webhook signature algorithm before updating an order to `paid`.

Never store card number, CVV or full wallet credentials. Store the provider reference, amount, status and timestamps only.

## Database model

The Sites implementation uses tables for `products`, `orders`, `customers`, `payments` and `inventory_events`. Firestore uses collections with equivalent names. Important order fields:

- `status`: new → confirmed → packed → shipped → delivered.
- `paymentStatus`: `cod`, `pending_advance`, `paid` or `refunded`. The legacy `cod_advance_required` value remains readable for older orders.
- `advanceAmount`: `0` for cash on delivery, or the full order total when the customer voluntarily pays in advance.
- `items`: immutable order-line snapshots containing SKU, price, variant and quantity.
- `trackingCode`: courier reference when shipped.

## Security checklist

- Keep `.env.local`, service-account JSON, private keys and webhook secrets out of Git.
- Require Firebase Auth and the admin custom claim for the admin dashboard and management APIs.
- Enable Firebase App Check, rate limiting and billing alerts.
- Recalculate order totals on the server and read current product prices/stock before accepting payment.
- Use signed, verified payment and WhatsApp webhooks. Make webhook handling idempotent.
- Product images may be public; payment proofs and customer data must be private.
- Publish privacy, shipping, return/refund and terms pages appropriate for Pakistan.
- Apply data retention, account deletion and secure backup procedures.
- Test dependency and platform security updates regularly.

## MVP and phase 2

### MVP — included

- Responsive store and mobile menu.
- Search, category/collection/price filters, galleries and stock indicators.
- Cart, wishlist, guest checkout and customer details validation.
- WhatsApp checkout and support links.
- Advance/COD payment status and delivery rules.
- Admin analytics, product/order/customer/payment screens and low-stock alerts.
- D1/R2 and Firebase schema/adapters, CSV import and image upload.

### Phase 2

- Fully synced customer accounts, saved addresses and wishlists.
- Approved WhatsApp templates and automated courier tracking.
- Live gateway checkout, refunds and payment reconciliation.
- Courier labels and fulfilment APIs.
- Discount engine, abandoned-cart flows and product reviews.
- Meta Pixel/Conversions API, analytics attribution and conversion funnels.
- Vendor roles, commissions and payout ledger if Trevo becomes multi-vendor.

## Production deployment

Run the full quality gate:

```bash
npm run lint
npm test
```

GitHub stores the source but GitHub Pages cannot run this store's secure APIs. For a GitHub-based deployment, connect the repository to Vercel, choose Next.js, and use `npm run build:vercel`. Deploy Firebase Functions/Firestore/Storage first, add the `.env.example` values in Vercel, then connect `trevopk.com` and `www.trevopk.com`. Keep the old Netlify DNS records until the new Vercel address passes an end-to-end order test.
