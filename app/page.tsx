"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Menu,
  Minus,
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
import { formatPKR, products, type Product } from "../lib/catalog";

type CartLine = { product: Product; quantity: number; color: string };
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

export default function Home() {
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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [checkout, setCheckout] = useState<CheckoutFields>(initialCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("trevo-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("trevo-wishlist") || "[]"));
    } catch {
      // Invalid device-local data is safely ignored.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("trevo-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("trevo-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const open = cartOpen || wishlistOpen || accountOpen || checkoutOpen || !!selectedProduct || menuOpen;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, wishlistOpen, accountOpen, checkoutOpen, selectedProduct, menuOpen]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query || `${product.name} ${product.category} ${product.collection} ${product.colors.join(" ")}`.toLowerCase().includes(query);
      const matchesCategory = category === "All bags" || product.category === category;
      const matchesCollection = collection === "All collections" || product.collection === collection;
      return matchesQuery && matchesCategory && matchesCollection && product.price <= maxPrice;
    });
  }, [search, category, collection, maxPrice]);

  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shipping = checkout.delivery === "urgent" ? 500 : subtotal >= 1500 ? 0 : 250;
  const total = subtotal + shipping;
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  const closeOverlays = () => {
    setCartOpen(false);
    setWishlistOpen(false);
    setAccountOpen(false);
    setCheckoutOpen(false);
    setSelectedProduct(null);
    setMenuOpen(false);
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveImage(0);
    setSelectedColor(product.colors[0]);
  };

  const addToCart = (product: Product, color = product.colors[0], open = true) => {
    if (product.stock < 1) return;
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id && line.color === color);
      if (existing) {
        return current.map((line) => line === existing ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line);
      }
      return [...current, { product, quantity: 1, color }];
    });
    setSelectedProduct(null);
    if (open) setCartOpen(true);
  };

  const toggleWishlist = (id: string) => {
    setWishlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const updateQuantity = (id: string, color: string, amount: number) => {
    setCart((current) => current
      .map((line) => line.product.id === id && line.color === color
        ? { ...line, quantity: Math.max(0, Math.min(line.product.stock, line.quantity + amount)) }
        : line)
      .filter((line) => line.quantity > 0));
  };

  const whatsappMessage = () => {
    const lines = cart.map((line) => `• ${line.product.name} (${line.color}) x${line.quantity} — ${formatPKR(line.product.price * line.quantity)}`);
    const message = [
      "Assalam-o-Alaikum Trevo, I would like to place this order:",
      "",
      ...lines,
      "",
      `Subtotal: ${formatPKR(subtotal)}`,
      `Delivery: ${checkout.delivery === "urgent" ? "Urgent" : "Standard"} — ${shipping === 0 ? "Free" : formatPKR(shipping)}`,
      `Total: ${formatPKR(total)}`,
      `Payment: ${checkout.payment === "advance" ? "Advance payment" : "Cash on delivery (Rs. 200 advance required)"}`,
      "",
      checkout.payment === "advance" ? "Please confirm the payment details. I need bank details via WhatsApp if I choose bank transfer." : "Please confirm availability and the COD advance payment details.",
    ].join("\n");
    return `https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent(message)}`;
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length) return;
    setSubmitting(true);
    const generated = `TRV-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      orderNumber: generated,
      customer: checkout,
      items: cart.map((line) => ({ productId: line.product.id, sku: line.product.sku, name: line.product.name, color: line.color, quantity: line.quantity, unitPrice: line.product.price })),
      subtotal,
      shipping,
      total,
      paymentStatus: checkout.payment === "advance" ? "pending_advance" : "cod_advance_required",
    };
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Order service unavailable");
    } catch {
      localStorage.setItem("trevo-last-order", JSON.stringify({ ...payload, status: "received", createdAt: new Date().toISOString() }));
    }
    setOrderNumber(generated);
    setCart([]);
    setSubmitting(false);
  };

  const scrollToShop = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <div className="announcement">
        <span>Complimentary standard delivery on orders Rs. 1,500+</span>
        <span className="announcement-separator">•</span>
        <span>Advance payment has no extra fee</span>
      </div>

      <header className="site-header">
        <button className="icon-button mobile-only" aria-label="Open menu" title="Menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
        <a className="brand" href="#top" aria-label="Trevo home">TREVO<span>Effortless style</span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#new">New arrivals</a>
          <button onClick={() => { setCategory("Luxury Collection"); scrollToShop(); }}>Luxury</button>
          <button onClick={() => { setCategory("Tote Bags"); scrollToShop(); }}>Totes</button>
          <button onClick={() => { setCategory("Crossbody"); scrollToShop(); }}>Crossbody</button>
          <button onClick={() => { setCategory("Box Bags"); scrollToShop(); }}>Box bags</button>
          <a href="#story">Our story</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-trigger" aria-label="Search products" title="Search" onClick={scrollToShop}><Search size={19} /></button>
          <button className="icon-button desktop-action" aria-label="Open account" title="Account" onClick={() => setAccountOpen(true)}><UserRound size={19} /></button>
          <button className="icon-button desktop-action badge-wrap" aria-label={`Wishlist with ${wishlist.length} items`} title="Wishlist" onClick={() => setWishlistOpen(true)}><Heart size={19} />{wishlist.length > 0 && <b>{wishlist.length}</b>}</button>
          <button className="bag-button badge-wrap" aria-label={`Cart with ${count} items`} title="Shopping bag" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>Bag</span>{count > 0 && <b>{count}</b>}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <img src="/images/trevo-hero.png" alt="Trevo collection of sage, taupe and blush handbags in a refined studio setting" />
        <div className="hero-content">
          <p className="eyebrow">The signature edit · 2026</p>
          <h1>Designed to be<br />carried <em>your way.</em></h1>
          <p>Thoughtful silhouettes for work, weekends and every version of you.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={scrollToShop}>Shop the collection <ArrowRight size={17} /></button>
            <button className="text-button" onClick={() => { setCollection("Luxury"); scrollToShop(); }}>Explore the luxury edit</button>
          </div>
        </div>
        <div className="hero-note"><Sparkles size={15} /><span>Small drops. Distinctive details.<br /><b>Made for everyday confidence.</b></span></div>
      </section>

      <section className="service-strip" aria-label="Store benefits">
        <div><PackageCheck /><span><b>Nationwide delivery</b><small>Tracked across Pakistan</small></span></div>
        <div><ShieldCheck /><span><b>Secure checkout</b><small>Your information stays protected</small></span></div>
        <div><Check /><span><b>7-day support</b><small>Easy help with eligible returns</small></span></div>
      </section>

      <section className="editorial-intro" id="new">
        <p className="eyebrow">New season, considered style</p>
        <h2>The bags you&apos;ll reach for<br /><em>again and again.</em></h2>
        <p>From polished work totes to compact crossbodies, each Trevo piece is selected for beautiful form and everyday function.</p>
      </section>

      <section className="shop-section" id="shop">
        <div className="shop-heading">
          <div><p className="eyebrow">Curated for you</p><h2>Shop all bags</h2></div>
          <p>{filtered.length} styles</p>
        </div>
        <div className="shop-toolbar">
          <div className="search-box"><Search size={18} /><input aria-label="Search products" placeholder="Search by style, colour or collection" value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button aria-label="Clear search" title="Clear" onClick={() => setSearch("")}><X size={16} /></button>}</div>
          <div className="quick-categories">
            {["All bags", "Luxury Collection", "Tote Bags", "Crossbody", "Box Bags"].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <button className="filter-button" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={17} /> Filters <ChevronDown className={filtersOpen ? "rotated" : ""} size={16} /></button>
        </div>
        {filtersOpen && <div className="filter-panel">
          <label>Collection<select value={collection} onChange={(e) => setCollection(e.target.value)}><option>All collections</option><option>Everyday</option><option>Luxury</option><option>Statement</option></select></label>
          <label>Maximum price <b>{formatPKR(maxPrice)}</b><input type="range" min="2500" max="5500" step="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label>
          <label>Size<select><option>All sizes</option><option>Mini</option><option>Small</option><option>Medium</option><option>Large</option></select></label>
          <button onClick={() => { setCategory("All bags"); setCollection("All collections"); setMaxPrice(5500); setSearch(""); }}>Reset filters</button>
        </div>}
        <div className="product-grid">
          {filtered.map((product) => (
            <article className="product-card" key={product.id}>
              <button className="product-image" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}>
                <img src={product.images[0]} alt={product.name} loading="lazy" />
                {product.badge && <span className="product-badge">{product.badge}</span>}
              </button>
              <button className={`heart-button ${wishlist.includes(product.id) ? "saved" : ""}`} aria-label={wishlist.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"} title="Wishlist" onClick={() => toggleWishlist(product.id)}><Heart size={18} fill={wishlist.includes(product.id) ? "currentColor" : "none"} /></button>
              <div className="product-info" onClick={() => openProduct(product)}>
                <p>{product.collection} · {product.category}</p>
                <h3>{product.name}</h3>
                <div><span>{formatPKR(product.price)}</span>{product.compareAt && <del>{formatPKR(product.compareAt)}</del>}</div>
                <div className="swatches" aria-label={`${product.colors.length} available ${product.colors.length === 1 ? "colour" : "colours"}`}>{product.colors.map((color, index) => <i key={color} style={{ background: ["#939174", "#272622", "#e8e1d4", "#b98688", "#9f826a"][index % 5] }} title={color} />)}<small>{product.colors.length} {product.colors.length === 1 ? "colour" : "colours"}</small></div>
              </div>
              <button className="quick-add" disabled={product.stock === 0} onClick={() => addToCart(product)}>{product.stock === 0 ? "Sold out" : "Quick add"} {product.stock > 0 && <Plus size={16} />}</button>
            </article>
          ))}
        </div>
        {!filtered.length && <div className="empty-state"><Search size={32} /><h3>No styles match those filters.</h3><p>Try a different category or a higher price limit.</p><button className="secondary-button" onClick={() => { setCategory("All bags"); setCollection("All collections"); setMaxPrice(5500); setSearch(""); }}>Show all bags</button></div>}
      </section>

      <section className="story" id="story">
        <div className="story-visual"><img src="/images/trevo-hero.png" alt="Trevo handbags arranged in a calm boutique-inspired setting" /></div>
        <div className="story-copy"><p className="eyebrow">The Trevo point of view</p><h2>Style that feels<br /><em>like you.</em></h2><p>Trevo began with one clear idea: beautiful everyday pieces should feel special without feeling out of reach. We choose versatile silhouettes, considered colours and polished details for women who carry a lot—and do it with confidence.</p><a href="https://www.instagram.com/trevo_pk/" target="_blank" rel="noreferrer"><Camera size={17} /> Follow @trevo_pk</a></div>
      </section>

      <section className="newsletter"><p className="eyebrow">Trevo notes</p><h2>New drops, before everyone else.</h2><p>Join for collection previews, styling ideas and private offers.</p><form onSubmit={(event) => event.preventDefault()}><input type="email" required aria-label="Email address" placeholder="Your email address" /><button>Join the list <ArrowRight size={17} /></button></form></section>

      <footer>
        <div className="footer-brand"><a className="brand light" href="#top">TREVO<span>Effortless style</span></a><p>Modern handbags for everyday confidence.<br />Designed for Pakistan, selected with care.</p></div>
        <div><h3>Shop</h3><a href="#shop">New arrivals</a><a href="#shop">Luxury collection</a><a href="#shop">Totes</a><a href="#shop">Crossbody</a><a href="#shop">Box bags</a></div>
        <div><h3>Help</h3><button onClick={() => setAccountOpen(true)}>My account</button><button onClick={() => setCartOpen(true)}>Delivery & checkout</button><a href={`https://wa.me/${WhatsAppNumber}`} target="_blank" rel="noreferrer">WhatsApp support</a><a href="mailto:hello@trevopk.com">hello@trevopk.com</a></div>
        <div><h3>Follow Trevo</h3><a href="https://www.instagram.com/trevo_pk/" target="_blank" rel="noreferrer">Instagram · @trevo_pk</a><a href="https://web.facebook.com/profile.php?id=61578912687234" target="_blank" rel="noreferrer">Facebook</a></div>
        <div className="footer-bottom"><span>© 2026 Trevo. All rights reserved.</span><span>Privacy · Terms · Returns</span></div>
      </footer>

      {menuOpen && <><div className="backdrop" onClick={closeOverlays} /><aside className="mobile-menu" aria-label="Mobile menu"><div><a className="brand" href="#top">TREVO<span>Effortless style</span></a><button className="icon-button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button></div><nav>{["New arrivals", "Luxury collection", "Tote bags", "Crossbody", "Box bags", "Our story"].map((item) => <button key={item} onClick={() => { if (item.toLowerCase().includes("luxury")) setCategory("Luxury Collection"); if (item.toLowerCase().includes("tote")) setCategory("Tote Bags"); if (item.toLowerCase().includes("crossbody")) setCategory("Crossbody"); if (item.toLowerCase().includes("box")) setCategory("Box Bags"); setMenuOpen(false); item === "Our story" ? document.getElementById("story")?.scrollIntoView() : scrollToShop(); }}>{item}<ArrowRight size={18} /></button>)}</nav><div className="mobile-menu-actions"><button onClick={() => { setMenuOpen(false); setAccountOpen(true); }}><UserRound /> My account</button><button onClick={() => { setMenuOpen(false); setWishlistOpen(true); }}><Heart /> Wishlist ({wishlist.length})</button></div></aside></>}

      {cartOpen && <><div className="backdrop" onClick={() => setCartOpen(false)} /><aside className="drawer cart-drawer"><div className="drawer-header"><div><p>Your shopping bag</p><span>{count} {count === 1 ? "item" : "items"}</span></div><button className="icon-button" aria-label="Close cart" onClick={() => setCartOpen(false)}><X /></button></div>{cart.length ? <><div className="drawer-scroll">{cart.map((line) => <div className="cart-line" key={`${line.product.id}-${line.color}`}><img src={line.product.images[0]} alt="" /><div><p>{line.product.collection}</p><h3>{line.product.name}</h3><span>{line.color} · {line.product.sizes[0]}</span><div className="quantity"><button aria-label="Decrease quantity" onClick={() => updateQuantity(line.product.id, line.color, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button aria-label="Increase quantity" onClick={() => updateQuantity(line.product.id, line.color, 1)}><Plus size={14} /></button></div></div><strong>{formatPKR(line.product.price * line.quantity)}</strong></div>)}</div><div className="drawer-checkout"><div className="delivery-callout"><PackageCheck size={18} /><span>{subtotal >= 1500 ? <><b>You unlocked free standard delivery.</b><small>Urgent delivery is always charged separately.</small></> : <><b>{formatPKR(1500 - subtotal)} away from free delivery.</b><small>Standard delivery is Rs. 250.</small></>}</span></div><div className="total-row"><span>Subtotal</span><strong>{formatPKR(subtotal)}</strong></div><small>Delivery and payment details are selected at checkout.</small><button className="primary-button full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Checkout now <ArrowRight size={17} /></button><a className="whatsapp-button" href={whatsappMessage()} target="_blank" rel="noreferrer">Checkout via WhatsApp</a><button className="continue-button" onClick={() => setCartOpen(false)}>Continue shopping</button></div></> : <div className="empty-drawer"><ShoppingBag size={38} /><h2>Your bag is waiting.</h2><p>Explore our latest silhouettes and choose something made for your everyday.</p><button className="primary-button" onClick={() => { setCartOpen(false); scrollToShop(); }}>Discover the collection</button></div>}</aside></>}

      {wishlistOpen && <><div className="backdrop" onClick={() => setWishlistOpen(false)} /><aside className="drawer"><div className="drawer-header"><div><p>Your wishlist</p><span>{wishlist.length} saved</span></div><button className="icon-button" aria-label="Close wishlist" onClick={() => setWishlistOpen(false)}><X /></button></div><div className="drawer-scroll wishlist-list">{wishlist.map((id) => products.find((item) => item.id === id)).filter(Boolean).map((product) => product && <div className="wishlist-line" key={product.id}><img src={product.images[0]} alt="" /><div><p>{product.collection}</p><h3>{product.name}</h3><strong>{formatPKR(product.price)}</strong><button onClick={() => { addToCart(product); setWishlistOpen(false); }}>Add to bag</button></div><button className="icon-button" aria-label="Remove" onClick={() => toggleWishlist(product.id)}><X size={17} /></button></div>)}{!wishlist.length && <div className="empty-drawer"><Heart size={38} /><h2>Save what you love.</h2><p>Tap the heart on any bag to keep it close.</p></div>}</div></aside></>}

      {accountOpen && <><div className="backdrop" onClick={() => setAccountOpen(false)} /><aside className="drawer"><div className="drawer-header"><div><p>My Trevo</p><span>Account & order history</span></div><button className="icon-button" aria-label="Close account" onClick={() => setAccountOpen(false)}><X /></button></div><div className="account-card"><div className="account-icon"><UserRound /></div><h2>Welcome to Trevo</h2><p>Sign in to see your orders, save delivery details and keep your wishlist on every device.</p><button className="primary-button full">Continue with email</button><button className="secondary-button full">Create an account</button><small>Guest checkout is always available.</small></div><div className="account-benefits"><p><Check /> Faster checkout</p><p><Check /> Order history and tracking</p><p><Check /> Wishlist synced across devices</p></div></aside></>}

      {selectedProduct && <><div className="backdrop product-backdrop" onClick={() => setSelectedProduct(null)} /><section className="product-modal" role="dialog" aria-modal="true" aria-label={selectedProduct.name}><button className="modal-close" aria-label="Close product" onClick={() => setSelectedProduct(null)}><X /></button><div className="gallery"><img src={selectedProduct.images[activeImage]} alt={`${selectedProduct.name} view ${activeImage + 1}`} />{selectedProduct.images.length > 1 && <><button className="gallery-prev" aria-label="Previous photo" onClick={() => setActiveImage((activeImage - 1 + selectedProduct.images.length) % selectedProduct.images.length)}><ChevronLeft /></button><button className="gallery-next" aria-label="Next photo" onClick={() => setActiveImage((activeImage + 1) % selectedProduct.images.length)}><ChevronRight /></button><div className="thumbs">{selectedProduct.images.map((image, index) => <button key={image} className={index === activeImage ? "active" : ""} aria-label={`View image ${index + 1}`} onClick={() => setActiveImage(index)}><img src={image} alt="" /></button>)}</div></>}</div><div className="product-detail"><p className="eyebrow">{selectedProduct.collection} collection</p><h2>{selectedProduct.name}</h2><div className="detail-price"><strong>{formatPKR(selectedProduct.price)}</strong>{selectedProduct.compareAt && <del>{formatPKR(selectedProduct.compareAt)}</del>}</div><p className="detail-copy">{selectedProduct.description}</p><div className="detail-meta"><span><b>Material</b>{selectedProduct.material}</span><span><b>Availability</b>{selectedProduct.stock === 0 ? "Sold out" : selectedProduct.stock <= 5 ? `Only ${selectedProduct.stock} left` : "In stock"}</span><span><b>SKU</b>{selectedProduct.sku}</span></div><div className="colour-select"><div><b>Colour</b><span>{selectedColor}</span></div><div>{selectedProduct.colors.map((color, index) => <button key={color} className={selectedColor === color ? "active" : ""} title={color} aria-label={color} onClick={() => setSelectedColor(color)} style={{ background: ["#939174", "#272622", "#e8e1d4", "#b98688", "#9f826a"][index % 5] }} />)}</div></div><button className="primary-button full" disabled={selectedProduct.stock === 0} onClick={() => addToCart(selectedProduct, selectedColor)}>{selectedProduct.stock === 0 ? "Currently sold out" : `Add to bag · ${formatPKR(selectedProduct.price)}`}</button><button className="buy-now" disabled={selectedProduct.stock === 0} onClick={() => { addToCart(selectedProduct, selectedColor, false); setSelectedProduct(null); setCheckoutOpen(true); }}>Buy now</button><div className="detail-assurance"><span><PackageCheck /> Nationwide tracked delivery</span><span><ShieldCheck /> Secure order processing</span></div></div></section></>}

      {checkoutOpen && <><div className="backdrop" onClick={() => { if (!submitting) setCheckoutOpen(false); }} /><section className="checkout-modal" role="dialog" aria-modal="true" aria-label="Checkout">{orderNumber ? <div className="order-success"><div><Check /></div><p className="eyebrow">Order received</p><h2>Thank you, {checkout.name.split(" ")[0]}.</h2><p>Your order <b>{orderNumber}</b> is now in the Trevo admin panel. JazzCash and EasyPaisa payments use <b>0300 7041451</b>. Ask on WhatsApp for bank-transfer instructions.</p><a className="primary-button full" href={`https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent(`Assalam-o-Alaikum, I just placed Trevo order ${orderNumber}. Please confirm it and share bank-transfer details if required.`)}`} target="_blank" rel="noreferrer">Confirm on WhatsApp</a><button className="continue-button" onClick={() => { setOrderNumber(""); setCheckout(initialCheckout); setCheckoutOpen(false); }}>Continue shopping</button></div> : <><div className="checkout-head"><div><p className="eyebrow">Secure checkout</p><h2>Delivery details</h2></div><button className="icon-button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><X /></button></div><div className="checkout-layout"><form id="checkout-form" onSubmit={submitOrder}><div className="form-grid"><label>Full name<input required autoComplete="name" value={checkout.name} onChange={(e) => setCheckout({ ...checkout, name: e.target.value })} placeholder="Your full name" /></label><label>Email address<input required type="email" autoComplete="email" value={checkout.email} onChange={(e) => setCheckout({ ...checkout, email: e.target.value })} placeholder="name@example.com" /></label><label>Phone / WhatsApp<input required inputMode="tel" pattern="[+0-9 -]{10,18}" autoComplete="tel" value={checkout.phone} onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })} placeholder="03XX XXXXXXX" /></label><label>City<input required autoComplete="address-level2" value={checkout.city} onChange={(e) => setCheckout({ ...checkout, city: e.target.value })} placeholder="e.g. Lahore" /></label><label className="wide">Complete address<textarea required autoComplete="street-address" value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} placeholder="House, street, area and nearest landmark" /></label><label className="wide">Order note <span>(optional)</span><input value={checkout.notes} onChange={(e) => setCheckout({ ...checkout, notes: e.target.value })} placeholder="Colour preference, gift note or delivery instruction" /></label></div><fieldset><legend>Delivery method</legend><label className={`choice-card ${checkout.delivery === "standard" ? "selected" : ""}`}><input type="radio" name="delivery" checked={checkout.delivery === "standard"} onChange={() => setCheckout({ ...checkout, delivery: "standard" })} /><span><b>Standard delivery</b><small>3–5 working days · Free above Rs. 1,500</small></span><strong>{subtotal >= 1500 ? "FREE" : "Rs. 250"}</strong></label><label className={`choice-card ${checkout.delivery === "urgent" ? "selected" : ""}`}><input type="radio" name="delivery" checked={checkout.delivery === "urgent"} onChange={() => setCheckout({ ...checkout, delivery: "urgent" })} /><span><b>Urgent delivery</b><small>1–2 working days · Never included in free shipping</small></span><strong>Rs. 500</strong></label></fieldset><fieldset><legend>Payment method</legend><label className={`choice-card ${checkout.payment === "advance" ? "selected" : ""}`}><input type="radio" name="payment" checked={checkout.payment === "advance"} onChange={() => setCheckout({ ...checkout, payment: "advance" })} /><span><b>Advance payment</b><small>JazzCash, EasyPaisa or bank transfer · No extra fee</small></span><strong>Recommended</strong></label><label className={`choice-card ${checkout.payment === "cod" ? "selected" : ""}`}><input type="radio" name="payment" checked={checkout.payment === "cod"} onChange={() => setCheckout({ ...checkout, payment: "cod" })} /><span><b>Cash on delivery</b><small>Rs. 200 security advance required before dispatch</small></span><strong>COD</strong></label></fieldset></form><aside className="order-summary"><h3>Order summary</h3>{cart.map((line) => <div className="summary-line" key={`${line.product.id}-${line.color}`}><div><img src={line.product.images[0]} alt="" /><b>{line.quantity}</b></div><span>{line.product.name}<small>{line.color}</small></span><strong>{formatPKR(line.product.price * line.quantity)}</strong></div>)}<div className="summary-totals"><p><span>Subtotal</span><b>{formatPKR(subtotal)}</b></p><p><span>Delivery</span><b>{shipping === 0 ? "Free" : formatPKR(shipping)}</b></p><p><span>Total</span><b>{formatPKR(total)}</b></p></div><div className="payment-instructions"><b>JazzCash & EasyPaisa</b><span>0300 7041451</span><a href={`https://wa.me/${WhatsAppNumber}?text=${encodeURIComponent("Assalam-o-Alaikum Trevo, please share the bank-transfer instructions for my order.")}`} target="_blank" rel="noreferrer">Get bank-transfer instructions on WhatsApp</a></div>{checkout.payment === "cod" && <div className="advance-note"><ShieldCheck /><span><b>Advance required: Rs. 200</b><small>Pay to the same JazzCash/EasyPaisa number before dispatch. It is tracked against your order.</small></span></div>}<button form="checkout-form" className="primary-button full" disabled={submitting}>{submitting ? "Submitting securely…" : `Place order · ${formatPKR(total)}`}</button><small className="privacy-note">By placing your order, you agree to Trevo&apos;s terms. Trevo does not request card PINs, OTPs or wallet passwords.</small></aside></div></>}</section></>}
    </main>
  );
}
