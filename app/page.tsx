"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Menu,
  MessageCircle,
  Minus,
  Music2,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { OptimizedProductImage } from "@/components/OptimizedProductImage";
import {
  formatPKR,
  normalizeProduct,
  productVariants,
  products as catalogProducts,
  type Product,
  type ProductVariant,
} from "../lib/catalog";
import { trackMetaEvent } from "../lib/meta-pixel";
import { firebaseAuth } from "../lib/firebase/client";

type CartLine = { product: Product; quantity: number; color: string };
type LegalPanel = "privacy" | "terms" | "returns";
type AccountMode = "welcome" | "signin" | "register";
type AuthNotice = { kind: "success" | "error"; text: string };
type CheckoutFields = {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  delivery: "standard" | "urgent";
  payment: "cod" | "advance";
};

const initialCheckout: CheckoutFields = {
  name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
  delivery: "standard",
  payment: "cod",
};

const WhatsAppNumber = "923007041451";

function customerAuthMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return "The email or password is incorrect.";
  }
  if (code.includes("email-already-in-use")) {
    return "An account already exists for this email. Please sign in instead.";
  }
  if (code.includes("weak-password")) {
    return "Please choose a password with at least 6 characters.";
  }
  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a little and try again.";
  }
  return "We could not complete that request. Please try again.";
}

const legalContent: Record<
  LegalPanel,
  { title: string; introduction: string; points: string[] }
> = {
  privacy: {
    title: "Privacy",
    introduction:
      "Trevo uses your information only to process orders, arrange delivery and provide customer support.",
    points: [
      "We collect the contact, delivery and order details you provide at checkout.",
      "We do not store card details on this website. Payments are handled through the selected payment method.",
      "We do not sell your personal information. It is shared only when needed to complete your order, such as with a delivery partner.",
      "For a privacy question or data request, contact Trevo on WhatsApp.",
    ],
  },
  terms: {
    title: "Terms",
    introduction:
      "By placing an order, you confirm that the delivery and contact information you provide is correct.",
    points: [
      "Product availability, prices and delivery estimates are confirmed when your order is accepted.",
      "Orders marked for advance payment are prepared for fulfillment after payment is confirmed.",
      "Product colour may vary slightly from the original product online because of lighting and screen settings.",
      "Trevo may contact you by phone or WhatsApp to confirm an order or delivery detail.",
    ],
  },
  returns: {
    title: "Returns",
    introduction:
      "If your parcel arrives damaged, you may request a return within 2 days of delivery.",
    points: [
      "Contact Trevo on WhatsApp within 2 days and include your order number.",
      "Send clear photos or a short video showing the damage and the parcel packaging.",
      "Keep the product unused and in its original packaging while your request is reviewed.",
      "Approved damaged-item returns will be handled through WhatsApp with replacement or refund instructions.",
    ],
  },
};

function TrevoBrand({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`brand brand-lockup ${light ? "light" : ""}`}
      href="/"
      aria-label="Trevo home"
    >
      <span className="brand-mark" aria-hidden="true">
        <img src="/images/logo.png" alt="" />
      </span>
      <span className="brand-name">Trevo</span>
    </a>
  );
}

async function syncCustomerAccount(
  user: User,
  name: string,
  activity: "register" | "signin",
) {
  const token = await user.getIdToken();
  const response = await fetch("/api/customer-account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, activity }),
  });

  if (!response.ok) {
    throw new Error("Customer profile could not be saved.");
  }
}

export type StorefrontPage = "home" | "bags" | "new-arrivals";

export function Storefront({ page = "home" }: { page?: StorefrontPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All bags");
  const [collection, setCollection] = useState("All collections");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState(page === "new-arrivals");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [checkout, setCheckout] = useState<CheckoutFields>(initialCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [legalPanel, setLegalPanel] = useState<LegalPanel | null>(null);
  const [storeProducts, setStoreProducts] =
    useState<Product[]>(catalogProducts);
  const [accountMode, setAccountMode] = useState<AccountMode>("welcome");
  const [accountUser, setAccountUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("trevo-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("trevo-wishlist") || "[]"));
    } catch {
      // Invalid device-local data is safely ignored.
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    if (requestedCategory) {
      setCategory(requestedCategory);
      setNewArrivalsOnly(false);
    }
    if (params.get("account") === "1") setAccountOpen(true);
    if (params.get("bag") === "1") setCartOpen(true);
    if (params.get("wishlist") === "1") setWishlistOpen(true);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { products?: Product[]; inactiveIds?: string[] }) => {
        const live = (data.products || []).map((product) =>
          normalizeProduct(product),
        );
        const hidden = new Set(data.inactiveIds || []);
        const liveIds = new Set(live.map((product) => product.id));
        setStoreProducts([
          ...live,
          ...catalogProducts.filter(
            (product) => !liveIds.has(product.id) && !hidden.has(product.id),
          ),
        ]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthReady(true);
      return;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setAccountUser(user);
      setAuthReady(true);
      if (user) {
        setCheckout((current) => ({
          ...current,
          name: current.name || user.displayName || "",
          email: current.email || user.email || "",
        }));
        void syncCustomerAccount(
          user,
          user.displayName || "",
          "signin",
        ).catch(() => undefined);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("trevo-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("trevo-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const open =
      cartOpen ||
      wishlistOpen ||
      accountOpen ||
      checkoutOpen ||
      !!legalPanel ||
      !!selectedProduct ||
      menuOpen;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    cartOpen,
    wishlistOpen,
    accountOpen,
    checkoutOpen,
    legalPanel,
    selectedProduct,
    menuOpen,
  ]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedCategory = category.trim().toLowerCase();
    const matchingProducts = storeProducts.filter((product) => {
      const matchesQuery =
        !query ||
        `${product.name} ${product.category} ${product.collection} ${product.colors.join(" ")}`
          .toLowerCase()
          .includes(query);
      const matchesCategory =
        selectedCategory === "all bags" ||
        String(product.category).trim().toLowerCase() === selectedCategory;
      const matchesCollection =
        collection === "All collections" || product.collection === collection;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesCollection &&
        product.price <= maxPrice
      );
    });
    return newArrivalsOnly ? matchingProducts.slice(0, 6) : matchingProducts;
  }, [storeProducts, search, category, collection, maxPrice, newArrivalsOnly]);

  const availableCategories = useMemo(
    () => [
      "All bags",
      ...Array.from(
        new Set(
          storeProducts
            .map((product) => String(product.category).trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [storeProducts],
  );

  const selectedVariants = selectedProduct ? productVariants(selectedProduct) : [];
  const gallerySlides = selectedVariants.flatMap((variant) => variant.images.map((image) => ({ image, variantId: variant.id, color: variant.color })));
  const currentSlide = gallerySlides[activeImage] || gallerySlides[0];
  const selectedVariant = selectedProduct
    ? selectedVariants.find(
        (variant) => variant.color === selectedColor,
      ) || selectedVariants[0]
    : null;
  const selectedStock = selectedVariant?.stock ?? selectedProduct?.stock ?? 0;

  const subtotal = cart.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const shipping = 100;
  const total = subtotal + shipping;
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  const closeOverlays = () => {
    setCartOpen(false);
    setWishlistOpen(false);
    setAccountOpen(false);
    setCheckoutOpen(false);
    setLegalPanel(null);
    setSelectedProduct(null);
    setMenuOpen(false);
  };

  const openProduct = (product: Product) => {
    trackMetaEvent("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "PKR",
    });
    setSelectedProduct(product);
    setActiveImage(0);
    setSelectedColor(productVariants(product)[0]?.color || "As shown");
  };

  const moveGallery = (direction: -1 | 1) => {
    if (!gallerySlides.length) return;
    const nextIndex = (activeImage + direction + gallerySlides.length) % gallerySlides.length;
    setActiveImage(nextIndex);
    setSelectedColor(gallerySlides[nextIndex].color);
  };

  const chooseVariant = (variant: ProductVariant) => {
    const firstImageIndex = gallerySlides.findIndex((slide) => slide.variantId === variant.id);
    setSelectedColor(variant.color);
    setActiveImage(firstImageIndex >= 0 ? firstImageIndex : 0);
  };

  const addToCart = (
    product: Product,
    color = productVariants(product)[0]?.color || "As shown",
    open = true,
  ) => {
    const variantStock =
      productVariants(product).find((variant) => variant.color === color)
        ?.stock ?? product.stock;
    if (variantStock < 1) return;
    trackMetaEvent("AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "PKR",
      color,
    });
    setCart((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id && line.color === color,
      );
      if (existing) {
        return current.map((line) =>
          line === existing
            ? { ...line, quantity: Math.min(line.quantity + 1, variantStock) }
            : line,
        );
      }
      return [...current, { product, quantity: 1, color }];
    });
    setSelectedProduct(null);
    if (open) setCartOpen(true);
  };

  const startCheckout = (directProduct?: Product) => {
    const checkoutContents = directProduct
      ? [{ id: directProduct.id, quantity: 1 }]
      : cart.map((line) => ({
          id: line.product.id,
          quantity: line.quantity,
        }));
    trackMetaEvent("InitiateCheckout", {
      content_ids: checkoutContents.map((item) => item.id),
      contents: checkoutContents,
      value: directProduct ? directProduct.price : total,
      currency: "PKR",
      num_items: directProduct ? 1 : count,
    });
    setCheckoutOpen(true);
  };

  const toggleWishlist = (id: string) => {
    setWishlist((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const submitCustomerAuth = async () => {
    if (!firebaseAuth) {
      setAuthNotice({
        kind: "error",
        text: "Customer sign-in is not configured yet. Please check the Firebase environment variables.",
      });
      return;
    }

    setAuthBusy(true);
    setAuthNotice(null);
    try {
      if (accountMode === "register") {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          authEmail.trim(),
          authPassword,
        );
        const customerName = authName.trim();
        if (customerName) {
          await updateProfile(credential.user, { displayName: customerName });
        }
        await syncCustomerAccount(
          credential.user,
          customerName || credential.user.displayName || "",
          "register",
        );
        setAuthNotice({
          kind: "success",
          text: "Your Trevo account is ready.",
        });
      } else {
        const credential = await signInWithEmailAndPassword(
          firebaseAuth,
          authEmail.trim(),
          authPassword,
        );
        await syncCustomerAccount(
          credential.user,
          credential.user.displayName || "",
          "signin",
        );
        setAuthNotice({
          kind: "success",
          text: "You are now signed in.",
        });
      }
      setAuthPassword("");
    } catch (error) {
      setAuthNotice({ kind: "error", text: customerAuthMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  };

  const resetCustomerPassword = async () => {
    if (!firebaseAuth || !authEmail.trim()) {
      setAuthNotice({
        kind: "error",
        text: "Enter your email address first, then select Forgot password.",
      });
      return;
    }

    setAuthBusy(true);
    setAuthNotice(null);
    try {
      await sendPasswordResetEmail(firebaseAuth, authEmail.trim());
      setAuthNotice({
        kind: "success",
        text: "Password reset instructions have been sent to your email.",
      });
    } catch (error) {
      setAuthNotice({ kind: "error", text: customerAuthMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  };

  const signOutCustomer = async () => {
    if (!firebaseAuth) return;
    setAuthBusy(true);
    try {
      await signOut(firebaseAuth);
      setAccountMode("welcome");
      setAuthNotice({ kind: "success", text: "You have been signed out." });
    } finally {
      setAuthBusy(false);
    }
  };

  const updateQuantity = (id: string, color: string, amount: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === id && line.color === color
            ? {
                ...line,
                quantity: Math.max(
                  0,
                  Math.min(
                    productVariants(line.product).find(
                      (variant) => variant.color === color,
                    )?.stock ?? line.product.stock,
                    line.quantity + amount,
                  ),
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const whatsappMessage = () => {
    const lines = cart.map(
      (line) =>
        `• ${line.product.name} (${line.color}) x${line.quantity} — ${formatPKR(line.product.price * line.quantity)}`,
    );
    const message = [
      "Assalam-o-Alaikum Trevo, I would like to place this order:",
      "",
      ...lines,
      "",
      `Subtotal: ${formatPKR(subtotal)}`,
      `Delivery: Flat nationwide shipping — ${formatPKR(shipping)}`,
      `Total: ${formatPKR(total)}`,
      `Payment: ${checkout.payment === "advance" ? "Advance payment" : "Cash on delivery (no advance required)"}`,
      "",
      checkout.payment === "advance"
        ? "Please confirm the payment details. I need bank details via WhatsApp if I choose bank transfer."
        : "Please confirm availability and my cash-on-delivery order.",
    ].join("\n");
    return `https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent(message)}`;
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length) return;
    setSubmitting(true);
    setCheckoutError("");
    const payload = {
      customer: checkout,
      items: cart.map((line) => ({
        productId: line.product.id,
        sku: line.product.sku,
        name: line.product.name,
        color: line.color,
        quantity: line.quantity,
        unitPrice: line.product.price,
      })),
      subtotal,
      shipping,
      total,
      paymentStatus:
        checkout.payment === "advance"
          ? "pending_advance"
          : "cod",
    };
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Order service unavailable");
      setOrderNumber(String(data.order.orderNumber));
      trackMetaEvent("Purchase", {
        content_ids: cart.map((line) => line.product.id),
        contents: cart.map((line) => ({
          id: line.product.id,
          quantity: line.quantity,
        })),
        value: total,
        currency: "PKR",
        num_items: count,
        order_id: String(data.order.orderNumber),
      });
      setCart([]);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Your order could not be submitted. Please try again.",
      );
    }
    setSubmitting(false);
  };

  const scrollToShop = () =>
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  const showNewArrivals = () => {
    setCategory("All bags");
    setCollection("All collections");
    setMaxPrice(5500);
    setSearch("");
    setNewArrivalsOnly(true);
    window.requestAnimationFrame(scrollToShop);
  };

  const chooseCategory = (nextCategory: string) => {
    setNewArrivalsOnly(false);
    setCategory(nextCategory);
  };

  const showAllProducts = () => {
    setCategory("All bags");
    setCollection("All collections");
    setMaxPrice(5500);
    setSearch("");
    setNewArrivalsOnly(false);
    window.requestAnimationFrame(scrollToShop);
  };

  return (
    <main>
      <div className="announcement">
        <span>Flat nationwide delivery — Rs. 100</span>
        <span className="announcement-separator">•</span>
        <span>Advance payment has no extra fee</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-only"
          aria-label="Open menu"
          title="Menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} />
        </button>
        <TrevoBrand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/new-arrivals">New arrivals</a>
          <a href="/bags?category=Luxury%20Collection">Luxury</a>
          <a href="/bags?category=Tote%20Bags">Totes</a>
          <a href="/bags?category=Crossbody">Crossbody</a>
          <a href="/bags?category=Box%20Bags">Box bags</a>
          <a href="/our-story">Our story</a>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-trigger"
            aria-label="Search products"
            title="Search"
            onClick={scrollToShop}
          >
            <Search size={19} />
          </button>
          <button
            className="icon-button desktop-action"
            aria-label="Open account"
            title="Account"
            onClick={() => setAccountOpen(true)}
          >
            <UserRound size={19} />
          </button>
          <button
            className="icon-button desktop-action badge-wrap"
            aria-label={`Wishlist with ${wishlist.length} items`}
            title="Wishlist"
            onClick={() => setWishlistOpen(true)}
          >
            <Heart size={19} />
            {wishlist.length > 0 && <b>{wishlist.length}</b>}
          </button>
          <button
            className="bag-button badge-wrap"
            aria-label={`Cart with ${count} items`}
            title="Shopping bag"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={19} />
            <span>Bag</span>
            {count > 0 && <b>{count}</b>}
          </button>
        </div>
      </header>

      {page === "home" && <section className="hero" id="top">
        <picture className="hero-media">
          <source srcSet="/images/trevo-hero.webp" type="image/webp" />
          <img
            src="/images/trevo-hero.png"
            alt="Trevo collection of sage, taupe and blush handbags in a refined studio setting"
            width="1586"
            height="992"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="hero-content">
          <p className="eyebrow">The signature edit · 2026</p>
          <h1>
            Designed to be
            <br />
            carried <em>your way.</em>
          </h1>
          <p>
            Thoughtful silhouettes for work, weekends and every version of you.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={showAllProducts}>
              Shop the collection <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setNewArrivalsOnly(false);
                setCategory("All bags");
                setCollection("Luxury");
                scrollToShop();
              }}
            >
              Explore the luxury edit
            </button>
          </div>
        </div>
        <div className="hero-note">
          <Sparkles size={15} />
          <span>
            Small drops. Distinctive details.
            <br />
            <b>Made for everyday confidence.</b>
          </span>
        </div>
      </section>}

      {page === "home" && <section className="service-strip" aria-label="Store benefits">
        <div>
          <PackageCheck />
          <span>
            <b>Nationwide delivery</b>
            <small>Tracked across Pakistan</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <b>Secure checkout</b>
            <small>Your information stays protected</small>
          </span>
        </div>
        <div>
          <Check />
          <span>
            <b>7-day support</b>
            <small>Easy help with eligible returns</small>
          </span>
        </div>
      </section>}

      {page === "home" && <section className="editorial-intro" id="new">
        <p className="eyebrow">New season, considered style</p>
        <h2>
          The bags you&apos;ll reach for
          <br />
          <em>again and again.</em>
        </h2>
        <p>
          From polished work totes to compact crossbodies, each Trevo piece is
          selected for beautiful form and everyday function.
        </p>
      </section>}

      {page !== "home" && (
        <section className="catalog-intro" id="top">
          <p className="eyebrow">Trevo collections</p>
          <h1>{page === "new-arrivals" ? "New arrivals" : "All bags"}</h1>
          <p>
            {page === "new-arrivals"
              ? "Discover the newest silhouettes, colours and details added to Trevo."
              : "Explore every Trevo style and filter the collection to find your next everyday bag."}
          </p>
        </section>
      )}

      <section className="shop-section" id="shop">
        <div className="shop-heading">
          <div>
            <p className="eyebrow">
              {newArrivalsOnly ? "Freshly added" : "Curated for you"}
            </p>
            <h2>
              {newArrivalsOnly
                ? "New arrivals"
                : category === "All bags"
                  ? "Shop all bags"
                  : category}
            </h2>
          </div>
          <p>{filtered.length} styles</p>
        </div>
        <div className="shop-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Search by style, colour or collection"
              value={search}
              onChange={(e) => {
                setNewArrivalsOnly(false);
                setSearch(e.target.value);
              }}
            />
            {search && (
              <button
                aria-label="Clear search"
                title="Clear"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="quick-categories">
            {availableCategories.map((item) => (
              <button
                key={item}
                className={!newArrivalsOnly && category === item ? "active" : ""}
                onClick={() => chooseCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="filter-button"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal size={17} /> Filters{" "}
            <ChevronDown className={filtersOpen ? "rotated" : ""} size={16} />
          </button>
        </div>
        {filtersOpen && (
          <div className="filter-panel">
            <label>
              Collection
              <select
                value={collection}
                onChange={(e) => {
                  setNewArrivalsOnly(false);
                  setCollection(e.target.value);
                }}
              >
                <option>All collections</option>
                <option>Everyday</option>
                <option>Luxury</option>
                <option>Statement</option>
              </select>
            </label>
            <label>
              Maximum price <b>{formatPKR(maxPrice)}</b>
              <input
                type="range"
                min="2500"
                max="5500"
                step="100"
                value={maxPrice}
                onChange={(e) => {
                  setNewArrivalsOnly(false);
                  setMaxPrice(Number(e.target.value));
                }}
              />
            </label>
            <label>
              Size
              <select>
                <option>All sizes</option>
                <option>Mini</option>
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </label>
            <button
              onClick={() => {
                showAllProducts();
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="product-grid">
          {filtered.map((product) => (
            <article className="product-card" key={product.id}>
              <button
                className="product-image"
                onClick={() => openProduct(product)}
                aria-label={`View ${product.name}`}
              >
                <OptimizedProductImage
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                />
                {product.badge && (
                  <span className="product-badge">{product.badge}</span>
                )}
              </button>
              <button
                className={`heart-button ${wishlist.includes(product.id) ? "saved" : ""}`}
                aria-label={
                  wishlist.includes(product.id)
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                title="Wishlist"
                onClick={() => toggleWishlist(product.id)}
              >
                <Heart
                  size={18}
                  fill={wishlist.includes(product.id) ? "currentColor" : "none"}
                />
              </button>
              <div
                className="product-info"
                onClick={() => openProduct(product)}
              >
                <p>
                  {product.collection} · {product.category}
                </p>
                <h3>{product.name}</h3>
                <div>
                  <span>{formatPKR(product.price)}</span>
                  {product.compareAt && (
                    <del>{formatPKR(product.compareAt)}</del>
                  )}
                </div>
                <div
                  className="swatches"
                  aria-label={`${productVariants(product).length} available colours`}
                >
                  {productVariants(product).map((variant) => (
                    <i
                      key={variant.id}
                      style={{ background: variant.colorHex }}
                      title={variant.color}
                    />
                  ))}
                  <small>
                    {productVariants(product).length}{" "}
                    {productVariants(product).length === 1
                      ? "colour"
                      : "colours"}
                  </small>
                </div>
              </div>
              <button
                className="quick-add"
                disabled={product.stock === 0}
                onClick={() => addToCart(product)}
              >
                {product.stock === 0 ? "Sold out" : "Quick add"}{" "}
                {product.stock > 0 && <Plus size={16} />}
              </button>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <Search size={32} />
            <h3>No styles match those filters.</h3>
            <p>Try a different category or a higher price limit.</p>
            <button
              className="secondary-button"
              onClick={() => {
                showAllProducts();
              }}
            >
              Show all bags
            </button>
          </div>
        )}
      </section>

      {page === "home" && <section className="story" id="story">
        <div className="story-visual">
          <OptimizedProductImage
            src="/images/trevo-hero.png"
            alt="Trevo handbags arranged in a calm boutique-inspired setting"
          />
        </div>
        <div className="story-copy">
          <p className="eyebrow">The Trevo point of view</p>
          <h2>
            Style that feels
            <br />
            <em>like you.</em>
          </h2>
          <p>
            Trevo began with one clear idea: beautiful everyday pieces should
            feel special without feeling out of reach. We choose versatile
            silhouettes, considered colours and polished details for women who
            carry a lot—and do it with confidence.
          </p>
          <a
            href="https://www.instagram.com/trevo_pk/"
            target="_blank"
            rel="noreferrer"
          >
            <Camera size={17} /> Follow @trevo_pk
          </a>
        </div>
      </section>}

      {page === "home" && <section className="newsletter">
        <p className="eyebrow">Trevo notes</p>
        <h2>New drops, before everyone else.</h2>
        <p>Join for collection previews, styling ideas and private offers.</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="Your email address"
          />
          <button>
            Join the list <ArrowRight size={17} />
          </button>
        </form>
      </section>}

      <footer>
        <div className="footer-brand">
          <TrevoBrand light />
          <p>
            Modern handbags for everyday confidence.
            <br />
            Designed for Pakistan, selected with care.
          </p>
        </div>
        <div>
          <h3>Shop</h3>
          <a href="/new-arrivals">New arrivals</a>
          <a href="/bags?category=Luxury%20Collection">Luxury collection</a>
          <a href="/bags?category=Tote%20Bags">Totes</a>
          <a href="/bags?category=Crossbody">Crossbody</a>
          <a href="/bags?category=Box%20Bags">Box bags</a>
        </div>
        <div>
          <h3>Help</h3>
          <a href="/?account=1">My account</a>
          <a href="/?bag=1">Delivery & checkout</a>
          <a
            href={`https://wa.me/${WhatsAppNumber}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp support
          </a>
          <a href="mailto:hello@trevopk.com">hello@trevopk.com</a>
        </div>
        <div>
          <h3>Follow Trevo</h3>
          <div className="social-links">
            <a
              href="https://www.instagram.com/trevo_pk/"
              target="_blank"
              rel="noreferrer"
              aria-label="Trevo on Instagram"
            >
              <Camera aria-hidden="true" /> Instagram
            </a>
            <a
              href="https://web.facebook.com/profile.php?id=61578912687234"
              target="_blank"
              rel="noreferrer"
              aria-label="Trevo on Facebook"
            >
              <span className="facebook-icon" aria-hidden="true">f</span> Facebook
            </a>
            <a
              href="https://www.tiktok.com/@trevo_pk"
              target="_blank"
              rel="noreferrer"
              aria-label="Trevo on TikTok"
            >
              <Music2 aria-hidden="true" /> TikTok
            </a>
            <a
              href={`https://wa.me/${WhatsAppNumber}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Contact Trevo on WhatsApp"
            >
              <MessageCircle aria-hidden="true" /> WhatsApp
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Trevo. All rights reserved.</span>
          <div className="legal-links" aria-label="Store policies">
            <a href="/privacy">Privacy</a>
            <span aria-hidden="true">·</span>
            <a href="/terms">Terms</a>
            <span aria-hidden="true">·</span>
            <a href="/returns">Returns</a>
          </div>
        </div>
      </footer>

      {legalPanel && (
        <>
          <div className="backdrop legal-backdrop" onClick={() => setLegalPanel(null)} />
          <section
            className="legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-title"
          >
            <button
              className="modal-close"
              aria-label="Close policy"
              onClick={() => setLegalPanel(null)}
            >
              <X />
            </button>
            <p className="eyebrow">Trevo customer care</p>
            <h2 id="legal-title">{legalContent[legalPanel].title}</h2>
            <p className="legal-intro">{legalContent[legalPanel].introduction}</p>
            <ul>
              {legalContent[legalPanel].points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <a
              className="primary-button legal-whatsapp"
              href={`https://wa.me/${WhatsAppNumber}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} /> Contact on WhatsApp
            </a>
          </section>
        </>
      )}

      {menuOpen && (
        <>
          <div className="backdrop" onClick={closeOverlays} />
          <aside className="mobile-menu" aria-label="Mobile menu">
            <div>
              <TrevoBrand />
              <button
                className="icon-button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </button>
            </div>
            <nav>
              {[
                ["New arrivals", "/new-arrivals"],
                ["All bags", "/bags"],
                ["Luxury collection", "/bags?category=Luxury%20Collection"],
                ["Tote bags", "/bags?category=Tote%20Bags"],
                ["Crossbody", "/bags?category=Crossbody"],
                ["Box bags", "/bags?category=Box%20Bags"],
                ["Our story", "/our-story"],
                ["Contact us", "/contact"],
              ].map(([item, href]) => (
                <a key={item} href={href}>
                  {item}<ArrowRight size={18} />
                </a>
              ))}
            </nav>
            <div className="mobile-menu-actions">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen(true);
                }}
              >
                <UserRound /> My account
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setWishlistOpen(true);
                }}
              >
                <Heart /> Wishlist ({wishlist.length})
              </button>
            </div>
          </aside>
        </>
      )}

      {cartOpen && (
        <>
          <div className="backdrop" onClick={() => setCartOpen(false)} />
          <aside className="drawer cart-drawer">
            <div className="drawer-header">
              <div>
                <p>Your shopping bag</p>
                <span>
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label="Close cart"
                onClick={() => setCartOpen(false)}
              >
                <X />
              </button>
            </div>
            {cart.length ? (
              <>
                <div className="drawer-scroll">
                  {cart.map((line) => (
                    <div
                      className="cart-line"
                      key={`${line.product.id}-${line.color}`}
                    >
                      <OptimizedProductImage src={productVariants(line.product).find((variant) => variant.color === line.color)?.images[0] || line.product.images[0]} alt="" />
                      <div>
                        <p>{line.product.collection}</p>
                        <h3>{line.product.name}</h3>
                        <span>
                          {line.color} · {line.product.sizes[0]}
                        </span>
                        <div className="quantity">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() =>
                              updateQuantity(line.product.id, line.color, -1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <b>{line.quantity}</b>
                          <button
                            aria-label="Increase quantity"
                            onClick={() =>
                              updateQuantity(line.product.id, line.color, 1)
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <strong>
                        {formatPKR(line.product.price * line.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="drawer-checkout">
                  <div className="delivery-callout">
                    <PackageCheck size={18} />
                    <span>
                      <b>Flat nationwide delivery</b>
                      <small>Only Rs. 100 on every order.</small>
                    </span>
                  </div>
                  <div className="total-row">
                    <span>Subtotal</span>
                    <strong>{formatPKR(subtotal)}</strong>
                  </div>
                  <small>
                    Delivery and payment details are selected at checkout.
                  </small>
                  <button
                    className="primary-button full"
                    onClick={() => {
                      setCartOpen(false);
                      startCheckout();
                    }}
                  >
                    Checkout now <ArrowRight size={17} />
                  </button>
                  <a
                    className="whatsapp-button"
                    href={whatsappMessage()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Checkout via WhatsApp
                  </a>
                  <button
                    className="continue-button"
                    onClick={() => setCartOpen(false)}
                  >
                    Continue shopping
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-drawer">
                <ShoppingBag size={38} />
                <h2>Your bag is waiting.</h2>
                <p>
                  Explore our latest silhouettes and choose something made for
                  your everyday.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setCartOpen(false);
                    scrollToShop();
                  }}
                >
                  Discover the collection
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {wishlistOpen && (
        <>
          <div className="backdrop" onClick={() => setWishlistOpen(false)} />
          <aside className="drawer">
            <div className="drawer-header">
              <div>
                <p>Your wishlist</p>
                <span>{wishlist.length} saved</span>
              </div>
              <button
                className="icon-button"
                aria-label="Close wishlist"
                onClick={() => setWishlistOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="drawer-scroll wishlist-list">
              {wishlist
                .map((id) => storeProducts.find((item) => item.id === id))
                .filter(Boolean)
                .map(
                  (product) =>
                    product && (
                      <div className="wishlist-line" key={product.id}>
                        <OptimizedProductImage src={product.images[0]} alt="" />
                        <div>
                          <p>{product.collection}</p>
                          <h3>{product.name}</h3>
                          <strong>{formatPKR(product.price)}</strong>
                          <button
                            onClick={() => {
                              addToCart(product);
                              setWishlistOpen(false);
                            }}
                          >
                            Add to bag
                          </button>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Remove"
                          onClick={() => toggleWishlist(product.id)}
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ),
                )}
              {!wishlist.length && (
                <div className="empty-drawer">
                  <Heart size={38} />
                  <h2>Save what you love.</h2>
                  <p>Tap the heart on any bag to keep it close.</p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {accountOpen && (
        <>
          <div className="backdrop" onClick={() => setAccountOpen(false)} />
          <aside className="drawer account-drawer">
            <div className="drawer-header">
              <div>
                <p>My Trevo</p>
                <span>Customer account</span>
              </div>
              <button
                className="icon-button"
                aria-label="Close account"
                onClick={() => setAccountOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="account-scroll">
              <div className="account-card">
              <div className="account-icon">
                <UserRound />
              </div>
              {!authReady ? (
                <p className="account-loading">Checking your account…</p>
              ) : accountUser ? (
                <div className="account-signed-in">
                  <p className="eyebrow">Signed in</p>
                  <h2>{accountUser.displayName || authName || "Welcome back"}</h2>
                  <p>{accountUser.email}</p>
                  {authNotice && (
                    <div className={`auth-notice ${authNotice.kind}`} role="status">
                      {authNotice.text}
                    </div>
                  )}
                  <button
                    className="secondary-button full"
                    disabled={authBusy}
                    onClick={() => void signOutCustomer()}
                  >
                    Sign out
                  </button>
                  <small>Your name and email will be ready at checkout.</small>
                </div>
              ) : accountMode === "welcome" ? (
                <>
                  <h2>Welcome to Trevo</h2>
                  <p>
                    Sign in for faster checkout and keep your customer details
                    ready for your next order.
                  </p>
                  {authNotice && (
                    <div className={`auth-notice ${authNotice.kind}`} role="status">
                      {authNotice.text}
                    </div>
                  )}
                  <button
                    className="primary-button full"
                    onClick={() => {
                      setAccountMode("signin");
                      setAuthNotice(null);
                    }}
                  >
                    Continue with email
                  </button>
                  <button
                    className="secondary-button full"
                    onClick={() => {
                      setAccountMode("register");
                      setAuthNotice(null);
                    }}
                  >
                    Create an account
                  </button>
                  <small>Guest checkout is always available.</small>
                </>
              ) : (
                <form
                  className="account-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitCustomerAuth();
                  }}
                >
                  <button
                    type="button"
                    className="account-back"
                    onClick={() => {
                      setAccountMode("welcome");
                      setAuthNotice(null);
                    }}
                  >
                    <ChevronLeft /> Back
                  </button>
                  <h2>
                    {accountMode === "register"
                      ? "Create your account"
                      : "Sign in to Trevo"}
                  </h2>
                  {accountMode === "register" && (
                    <label>
                      Full name
                      <input
                        required
                        autoComplete="name"
                        value={authName}
                        onChange={(event) => setAuthName(event.target.value)}
                        placeholder="Your full name"
                      />
                    </label>
                  )}
                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete={
                        accountMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </label>
                  {authNotice && (
                    <div className={`auth-notice ${authNotice.kind}`} role="status">
                      {authNotice.text}
                    </div>
                  )}
                  <button className="primary-button full" disabled={authBusy}>
                    {authBusy
                      ? "Please wait…"
                      : accountMode === "register"
                        ? "Create account"
                        : "Sign in"}
                  </button>
                  {accountMode === "signin" && (
                    <button
                      type="button"
                      className="forgot-password"
                      disabled={authBusy}
                      onClick={() => void resetCustomerPassword()}
                    >
                      Forgot password?
                    </button>
                  )}
                </form>
              )}
              </div>
              <div className="account-benefits">
                <p>
                  <Check /> Faster checkout
                </p>
                <p>
                  <Check /> Secure email and password sign-in
                </p>
                <p>
                  <Check /> Guest checkout remains available
                </p>
              </div>
            </div>
          </aside>
        </>
      )}

      {selectedProduct && (
        <>
          <div
            className="backdrop product-backdrop"
            onClick={() => setSelectedProduct(null)}
          />
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedProduct.name}
          >
            <button
              className="modal-close"
              aria-label="Close product"
              onClick={() => setSelectedProduct(null)}
            >
              <X />
            </button>
            <div className="gallery">
              <OptimizedProductImage
                src={currentSlide?.image || selectedProduct.images[0]}
                alt={`${selectedProduct.name} view ${activeImage + 1}`}
              />
              {gallerySlides.length > 1 && (
                <>
                  <button
                    className="gallery-prev"
                    aria-label="Previous photo"
                    onClick={() => moveGallery(-1)}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="gallery-next"
                    aria-label="Next photo"
                    onClick={() => moveGallery(1)}
                  >
                    <ChevronRight />
                  </button>
                  <div className="thumbs">
                    {gallerySlides.map((slide, index) => (
                      <button
                        key={`${slide.variantId}-${index}-${slide.image}`}
                        className={index === activeImage ? "active" : ""}
                        aria-label={`View image ${index + 1}`}
                        onClick={() => { setActiveImage(index); setSelectedColor(slide.color); }}
                      >
                        <OptimizedProductImage src={slide.image} alt="" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="product-detail">
              <p className="eyebrow">{selectedProduct.collection} collection</p>
              <h2>{selectedProduct.name}</h2>
              <div className="detail-price">
                <strong>{formatPKR(selectedProduct.price)}</strong>
                {selectedProduct.compareAt && (
                  <del>{formatPKR(selectedProduct.compareAt)}</del>
                )}
              </div>
              <p className="detail-copy">{selectedProduct.description}</p>
              <p className="colour-disclaimer">
                Product colour may vary slightly from the original product online.
              </p>
              <div className="detail-meta">
                <span>
                  <b>Material</b>
                  {selectedProduct.material}
                </span>
                <span>
                  <b>Availability</b>
                  {selectedStock === 0
                    ? "Sold out"
                    : selectedStock <= 5
                      ? `Only ${selectedStock} left`
                      : "In stock"}
                </span>
                <span>
                  <b>SKU</b>
                  {selectedProduct.sku}
                </span>
              </div>
              <div className="colour-select">
                <div>
                  <b>Colour</b>
                  <span>{selectedColor}</span>
                </div>
                <div>
                  {productVariants(selectedProduct).map((variant) => (
                    <button
                      key={variant.id}
                      className={selectedColor === variant.color ? "active" : ""}
                      title={variant.color}
                      aria-label={variant.color}
                      onClick={() => chooseVariant(variant)}
                      style={{ background: variant.colorHex }}
                    />
                  ))}
                </div>
              </div>
              <button
                className="primary-button full"
                disabled={selectedStock === 0}
                onClick={() => addToCart(selectedProduct, selectedColor)}
              >
                {selectedStock === 0
                  ? "Currently sold out"
                  : `Add to bag · ${formatPKR(selectedProduct.price)}`}
              </button>
              <button
                className="buy-now"
                disabled={selectedStock === 0}
                onClick={() => {
                  addToCart(selectedProduct, selectedColor, false);
                  startCheckout(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                Buy now
              </button>
              <div className="detail-assurance">
                <span>
                  <PackageCheck /> Nationwide tracked delivery
                </span>
                <span>
                  <ShieldCheck /> Secure order processing
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {checkoutOpen && (
        <>
          <div
            className="backdrop"
            onClick={() => {
              if (!submitting) setCheckoutOpen(false);
            }}
          />
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
          >
            {orderNumber ? (
              <div className="order-success">
                <div>
                  <Check />
                </div>
                <p className="eyebrow">Order received</p>
                <h2>Thank you, {checkout.name.split(" ")[0]}.</h2>
                <p>
                  Your order <b>{orderNumber}</b> is now in the Trevo admin
                  panel. JazzCash and EasyPaisa payments use <b>0300 7041451</b>
                  . Ask on WhatsApp for bank-transfer instructions.
                </p>
                <a
                  className="primary-button full"
                  href={`https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent(`Assalam-o-Alaikum, I just placed Trevo order ${orderNumber}. Please confirm it and share bank-transfer details if required.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Confirm on WhatsApp
                </a>
                <button
                  className="continue-button"
                  onClick={() => {
                    setOrderNumber("");
                    setCheckout(initialCheckout);
                    setCheckoutOpen(false);
                  }}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="checkout-head">
                  <div>
                    <p className="eyebrow">Secure checkout</p>
                    <h2>Delivery details</h2>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Close checkout"
                    onClick={() => setCheckoutOpen(false)}
                  >
                    <X />
                  </button>
                </div>
                <div className="checkout-layout">
                  <form id="checkout-form" onSubmit={submitOrder}>
                    <div className="form-grid">
                      <label>
                        Full name
                        <input
                          required
                          autoComplete="name"
                          value={checkout.name}
                          onChange={(e) =>
                            setCheckout({ ...checkout, name: e.target.value })
                          }
                          placeholder="Your full name"
                        />
                      </label>
                      <label>
                        Email address
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          value={checkout.email}
                          onChange={(e) =>
                            setCheckout({ ...checkout, email: e.target.value })
                          }
                          placeholder="name@example.com"
                        />
                      </label>
                      <label>
                        Phone / WhatsApp
                        <input
                          required
                          inputMode="tel"
                          pattern="[+0-9 -]{10,18}"
                          autoComplete="tel"
                          value={checkout.phone}
                          onChange={(e) =>
                            setCheckout({ ...checkout, phone: e.target.value })
                          }
                          placeholder="03XX XXXXXXX"
                        />
                      </label>
                      <label>
                        City
                        <input
                          required
                          autoComplete="address-level2"
                          value={checkout.city}
                          onChange={(e) =>
                            setCheckout({ ...checkout, city: e.target.value })
                          }
                          placeholder="e.g. Lahore"
                        />
                      </label>
                      <label className="wide">
                        Complete address
                        <textarea
                          required
                          autoComplete="street-address"
                          value={checkout.address}
                          onChange={(e) =>
                            setCheckout({
                              ...checkout,
                              address: e.target.value,
                            })
                          }
                          placeholder="House, street, area and nearest landmark"
                        />
                      </label>
                      <label className="wide">
                        Order note <span>(optional)</span>
                        <input
                          value={checkout.notes}
                          onChange={(e) =>
                            setCheckout({ ...checkout, notes: e.target.value })
                          }
                          placeholder="Colour preference, gift note or delivery instruction"
                        />
                      </label>
                    </div>
                    <fieldset>
                      <legend>Delivery method</legend>
                      <label
                        className={`choice-card ${checkout.delivery === "standard" ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="delivery"
                          checked={checkout.delivery === "standard"}
                          onChange={() =>
                            setCheckout({ ...checkout, delivery: "standard" })
                          }
                        />
                        <span>
                          <b>Flat nationwide delivery</b>
                          <small>Tracked delivery across Pakistan</small>
                        </span>
                        <strong>Rs. 100</strong>
                      </label>
                    </fieldset>
                    <fieldset>
                      <legend>Payment method</legend>
                      <label
                        className={`choice-card ${checkout.payment === "advance" ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={checkout.payment === "advance"}
                          onChange={() =>
                            setCheckout({ ...checkout, payment: "advance" })
                          }
                        />
                        <span>
                          <b>Advance payment</b>
                          <small>
                            JazzCash, EasyPaisa or bank transfer · No extra fee
                          </small>
                        </span>
                        <strong>Recommended</strong>
                      </label>
                      <label
                        className={`choice-card ${checkout.payment === "cod" ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={checkout.payment === "cod"}
                          onChange={() =>
                            setCheckout({ ...checkout, payment: "cod" })
                          }
                        />
                        <span>
                          <b>Cash on delivery</b>
                          <small>No advance payment required</small>
                        </span>
                        <strong>COD</strong>
                      </label>
                    </fieldset>
                  </form>
                  <aside className="order-summary">
                    <h3>Order summary</h3>
                    {cart.map((line) => (
                      <div
                        className="summary-line"
                        key={`${line.product.id}-${line.color}`}
                      >
                        <div>
                          <OptimizedProductImage src={productVariants(line.product).find((variant) => variant.color === line.color)?.images[0] || line.product.images[0]} alt="" />
                          <b>{line.quantity}</b>
                        </div>
                        <span>
                          {line.product.name}
                          <small>{line.color}</small>
                        </span>
                        <strong>
                          {formatPKR(line.product.price * line.quantity)}
                        </strong>
                      </div>
                    ))}
                    <div className="summary-totals">
                      <p>
                        <span>Subtotal</span>
                        <b>{formatPKR(subtotal)}</b>
                      </p>
                      <p>
                        <span>Delivery</span>
                        <b>{formatPKR(shipping)}</b>
                      </p>
                      <p>
                        <span>Total</span>
                        <b>{formatPKR(total)}</b>
                      </p>
                    </div>
                    <div className="payment-instructions">
                      <b>JazzCash & EasyPaisa</b>
                      <span>0300 7041451</span>
                      <a
                        href={`https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent("Assalam-o-Alaikum Trevo, please share the bank-transfer instructions for my order.")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get bank-transfer instructions on WhatsApp
                      </a>
                    </div>
                    {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
                    <button
                      form="checkout-form"
                      className="primary-button full"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Submitting securely…"
                        : `Place order · ${formatPKR(total)}`}
                    </button>
                    <small className="privacy-note">
                      By placing your order, you agree to Trevo&apos;s terms.
                      Trevo does not request card PINs, OTPs or wallet
                      passwords.
                    </small>
                  </aside>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function Home() {
  return <Storefront page="home" />;
}
