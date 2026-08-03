"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeDollarSign, CheckCircle2, CircleDollarSign, Edit3,
  Download, ExternalLink, LayoutDashboard, LogOut, Menu, MessageCircle, Package,
  Plus, Search, ShoppingBag, Trash2, Users, X,
} from "lucide-react";
import {
  formatPKR, normalizeProduct, productVariants, products as catalogProducts,
  type Product, type ProductVariant,
} from "../../lib/catalog";

type Tab = "Overview" | "Products" | "Orders" | "Customers" | "Payments";
type AdminOrder = {
  dbId: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  city: string;
  total: number;
  items: number;
  status: "New" | "Confirmed" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
  payment: "Paid" | "Advance pending" | "Cash on delivery" | "Refunded";
  paymentStatus: string;
  advanceAmount: number;
  date: string;
};

type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  registeredAccount: boolean;
  emailVerified: boolean;
  totalOrders: number;
  totalSpent: number;
  accountCreatedAt: string;
  lastLoginAt: string;
};

type VariantDraft = { id?: string; color: string; colorHex: string; stock: string; images: string[] };
type ProductDraft = {
  id?: string; name: string; sku: string; price: string; compareAt: string;
  category: Product["category"]; collection: Product["collection"];
  description: string; material: string; variants: VariantDraft[];
};

const newVariant = (): VariantDraft => ({ color: "", colorHex: "#8f8b72", stock: "0", images: ["", "", "", "", "", ""] });
const emptyDraft = (): ProductDraft => ({
  name: "", sku: "", price: "", compareAt: "", category: "Crossbody",
  collection: "Everyday", description: "", material: "", variants: [newVariant()],
});

const statusLabel: Record<string, AdminOrder["status"]> = {
  new: "New", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled",
};
const statusValue: Record<AdminOrder["status"], string> = {
  New: "new", Confirmed: "confirmed", Packed: "packed", Shipped: "shipped",
  Delivered: "delivered", Cancelled: "cancelled",
};

function mapOrder(order: Record<string, unknown>): AdminOrder {
  const paymentStatus = String(order.paymentStatus || "pending_advance");
  return {
    dbId: String(order.id), orderNumber: String(order.orderNumber),
    customer: String(order.customerName || "Guest"), email: String(order.customerEmail || ""),
    phone: String(order.customerPhone || "").replace(/^0/, "92"), city: String(order.city || ""),
    total: Number(order.total || 0),
    items: Array.isArray(order.items) ? order.items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity || 0), 0) : 0,
    status: statusLabel[String(order.status)] || "New",
    payment: paymentStatus === "paid" ? "Paid" : paymentStatus === "refunded" ? "Refunded" : paymentStatus === "cod" || paymentStatus === "cod_advance_required" ? "Cash on delivery" : "Advance pending",
    paymentStatus, advanceAmount: Number(order.advanceAmount || 0),
    date: order.createdAt ? new Date(String(order.createdAt)).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "",
  };
}

function draftFromProduct(product: Product): ProductDraft {
  return {
    id: product.id, name: product.name, sku: product.sku, price: String(product.price),
    compareAt: product.compareAt ? String(product.compareAt) : "", category: product.category,
    collection: product.collection, description: product.description, material: product.material,
    variants: productVariants(product).map((variant) => ({ ...variant, stock: String(variant.stock), images: [...variant.images, "", "", "", "", "", ""].slice(0, 6) })),
  };
}

function csvCell(value: string | number | boolean | null | undefined) {
  let text = value == null ? "" : String(value);
  // Stop spreadsheet applications from treating product text as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [storeProducts, setStoreProducts] = useState<Product[]>(catalogProducts);
  const [query, setQuery] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3000); };

  const loadData = async () => {
    try {
      const [ordersResponse, productsResponse, customersResponse] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);
      if (ordersResponse.status === 401 || customersResponse.status === 401) { window.location.href = "/admin/login"; return; }
      const orderData = await ordersResponse.json();
      const productData = await productsResponse.json();
      const customerData = await customersResponse.json();
      if (ordersResponse.ok) setOrders((orderData.orders || []).map(mapOrder));
      if (customersResponse.ok) setCustomers(customerData.customers || []);
      if (productsResponse.ok) {
        const live = (productData.products || []).map((product: Product) => normalizeProduct(product));
        const hidden = new Set<string>(productData.inactiveIds || []);
        const liveIds = new Set(live.map((product: Product) => product.id));
        setStoreProducts([...live, ...catalogProducts.filter((product) => !liveIds.has(product.id) && !hidden.has(product.id))]);
      }
    } catch { showToast("Live store data could not be loaded."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadData(); }, []);

  const matchingProducts = useMemo(() => storeProducts.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [storeProducts, query]);
  const matchingOrders = useMemo(() => orders.filter((order) => `${order.orderNumber} ${order.customer} ${order.city}`.toLowerCase().includes(query.toLowerCase())), [orders, query]);
  const matchingCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.city}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const lowStock = storeProducts.filter((product) => product.stock <= 5);
  const paidRevenue = orders.filter((order) => order.payment === "Paid").reduce((sum, order) => sum + order.total, 0);
  const pendingAdvanceOrders = orders.filter((order) => order.paymentStatus === "pending_advance");
  const pendingAdvance = pendingAdvanceOrders.reduce((sum, order) => sum + order.advanceAmount, 0);
  const customerCount = customers.length;

  const patchOrder = async (order: AdminOrder, update: Record<string, string>) => {
    const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.dbId, ...update }) });
    if (!response.ok) { showToast("Order update failed."); return false; }
    return true;
  };

  const changeStatus = async (order: AdminOrder, status: AdminOrder["status"]) => {
    if (await patchOrder(order, { status: statusValue[status] })) {
      setOrders((current) => current.map((item) => item.dbId === order.dbId ? { ...item, status } : item));
      showToast(`${order.orderNumber} updated to ${status}.`);
    }
  };
  const markPaid = async (order: AdminOrder) => {
    if (await patchOrder(order, { paymentStatus: "paid" })) {
      setOrders((current) => current.map((item) => item.dbId === order.dbId ? { ...item, payment: "Paid", paymentStatus: "paid" } : item));
      showToast(`Payment recorded for ${order.orderNumber}.`);
    }
  };

  const openNew = () => { setDraft(emptyDraft()); setEditorOpen(true); };
  const openEdit = (product: Product) => { setDraft(draftFromProduct(product)); setEditorOpen(true); };

  const updateVariant = (index: number, update: Partial<VariantDraft>) => setDraft((current) => ({ ...current, variants: current.variants.map((variant, i) => i === index ? { ...variant, ...update } : variant) }));
  const updateImage = (variantIndex: number, imageIndex: number, value: string) => updateVariant(variantIndex, { images: draft.variants[variantIndex].images.map((image, i) => i === imageIndex ? value : image) });

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const variants = draft.variants.map((variant, index) => ({
      id: variant.id || `${draft.id || draft.sku.toLowerCase()}-variant-${index + 1}`,
      color: variant.color.trim(), colorHex: variant.colorHex, stock: Number(variant.stock),
      images: variant.images.map((image) => image.trim()).filter(Boolean),
    }));
    const uniqueImages = variants.flatMap((variant) => variant.images).filter((image, index, all) => all.indexOf(image) === index);
    if (!uniqueImages.length) { showToast("Add at least one product image."); return; }
    if (variants.some((variant) => !variant.color || !variant.images.length)) { showToast("Every variant needs a colour and at least one image."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/products", {
        method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft, price: Number(draft.price), compareAt: draft.compareAt ? Number(draft.compareAt) : null,
          sizes: ["One size"], variants, images: uniqueImages, colors: variants.map((variant) => variant.color),
          stock: variants.reduce((sum, variant) => sum + variant.stock, 0), active: true,
        }),
      });
      if (response.status === 401) { window.location.href = "/admin/login"; return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Product could not be saved.");
      const saved = normalizeProduct(data.product);
      setStoreProducts((current) => [saved, ...current.filter((product) => product.id !== saved.id)]);
      setEditorOpen(false); showToast(draft.id ? "Product updated on the store." : "Product added to the store.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Product could not be saved."); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Remove ${product.name} from the store?`)) return;
    const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    if (response.ok) { setStoreProducts((current) => current.filter((item) => item.id !== product.id)); showToast("Product removed from the store."); }
    else showToast("Product could not be deleted.");
  };

  const downloadProductsCsv = () => {
    const headings = [
      "Product ID", "SKU", "Product name", "Category", "Collection",
      "Price (PKR)", "Compare-at price (PKR)", "Status", "Total stock",
      "Sizes", "Description", "Material", "Variant number", "Variant ID",
      "Colour name", "Colour hex", "Colour stock", "Image 1", "Image 2",
      "Image 3", "Image 4", "Image 5", "Image 6", "All product image URLs",
    ];
    const rows = storeProducts.flatMap((product) =>
      productVariants(product).map((variant, variantIndex) => {
        const images = [...variant.images, "", "", "", "", "", ""].slice(0, 6);
        return [
          product.id, product.sku, product.name, product.category,
          product.collection, product.price, product.compareAt ?? "",
          product.active === false ? "Inactive" : "Active", product.stock,
          product.sizes.join(" | "), product.description, product.material,
          variantIndex + 1, variant.id, variant.color, variant.colorHex,
          variant.stock, ...images, product.images.join(" | "),
        ];
      }),
    );

    const csv = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `trevo-products-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${storeProducts.length} products with colour variants and image URLs.`);
  };

  const logout = async () => { await fetch("/api/admin/session", { method: "DELETE" }); window.location.href = "/admin/login"; };
  const menu: { tab: Tab; icon: React.ReactNode }[] = [
    { tab: "Overview", icon: <LayoutDashboard /> }, { tab: "Products", icon: <Package /> },
    { tab: "Orders", icon: <ShoppingBag /> }, { tab: "Customers", icon: <Users /> },
    { tab: "Payments", icon: <CircleDollarSign /> },
  ];

  return <main className="admin-shell">
    <aside className={`admin-sidebar ${sideOpen ? "open" : ""}`}>
      <div className="admin-brand"><a href="/">TREVO<span>Admin studio</span></a><button aria-label="Close menu" onClick={() => setSideOpen(false)}><X /></button></div>
      <nav>{menu.map((item) => <button key={item.tab} className={tab === item.tab ? "active" : ""} onClick={() => { setTab(item.tab); setQuery(""); setSideOpen(false); }}>{item.icon}<span>{item.tab}</span>{item.tab === "Orders" && orders.length > 0 && <b>{orders.length}</b>}</button>)}</nav>
      <div className="sidebar-lower"><a href="/"><ArrowLeft /><span>View webstore</span></a><button onClick={logout}><LogOut /><span>Sign out</span></button></div>
      <div className="admin-user"><div>FH</div><span><b>Fatima Hussain</b><small>Store owner</small></span></div>
    </aside>
    {sideOpen && <div className="admin-side-backdrop" onClick={() => setSideOpen(false)} />}
    <section className="admin-main">
      <header className="admin-header"><div><button className="admin-menu-button" aria-label="Open menu" onClick={() => setSideOpen(true)}><Menu /></button><p>{tab}</p><span>Live Trevo store management</span></div><div className="admin-header-actions"><div className="admin-search"><Search /><input placeholder="Search orders, products…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><a href="/" target="_blank">Open store <ExternalLink /></a></div></header>
      {loading ? <div className="admin-content"><div className="admin-card admin-empty"><Package /><h3>Loading live store data…</h3></div></div> : <>
        {tab === "Overview" && <div className="admin-content">
          <section className="admin-welcome"><div><p>Live overview</p><h1>Good day, Fatima.</h1><span>These figures come directly from your Trevo orders and products.</span></div><button onClick={openNew}><Plus /> Add product</button></section>
          <section className="metric-grid">
            <article><div className="metric-icon sage"><BadgeDollarSign /></div><p>Paid revenue</p><h2>{formatPKR(paidRevenue)}</h2><span>Verified paid orders</span></article>
            <article><div className="metric-icon rose"><ShoppingBag /></div><p>Orders</p><h2>{orders.length}</h2><span>{orders.filter((order) => order.status === "New").length} new</span></article>
            <article><div className="metric-icon gold"><CircleDollarSign /></div><p>Pending advance</p><h2>{formatPKR(pendingAdvance)}</h2><span>{pendingAdvanceOrders.length} need action</span></article>
            <article><div className="metric-icon blue"><Users /></div><p>Customers</p><h2>{customerCount}</h2><span>Accounts and order contacts</span></article>
          </section>
          <div className="admin-split"><section className="admin-card recent-orders"><div className="card-title"><div><h2>Recent orders</h2><p>Newest Firestore orders</p></div><button onClick={() => setTab("Orders")}>View all</button></div><OrdersTable orders={orders.slice(0, 5)} onStatus={changeStatus} onPaid={markPaid} /></section>
          <section className="admin-card low-stock-card"><div className="card-title"><div><h2>Low stock alerts</h2><p>Variant stock combined</p></div><button onClick={() => setTab("Products")}>View all</button></div>{lowStock.map((product) => <div className="stock-row" key={product.id}><img src={product.images[0]} alt="" /><span><b>{product.name}</b><small>{product.sku}</small></span><strong>{product.stock} left</strong><button onClick={() => openEdit(product)}><Edit3 /></button></div>)}{!lowStock.length && <div className="admin-empty"><CheckCircle2 /><p>No low-stock products.</p></div>}</section></div>
        </div>}
        {tab === "Products" && <div className="admin-content"><section className="page-title"><div><h1>Products</h1><p>{storeProducts.length} products · {storeProducts.reduce((sum, product) => sum + product.stock, 0)} total variant units</p></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="outline-admin-button" onClick={downloadProductsCsv} disabled={!storeProducts.length}><Download /> Download products CSV</button><button className="solid-admin-button" onClick={openNew}><Plus /> Add product</button></div></section><section className="admin-card product-table-card"><div className="table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Collection</th><th>Variants</th><th>Price</th><th>Inventory</th><th /></tr></thead><tbody>{matchingProducts.map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.images[0]} alt="" /><span><b>{product.name}</b><small>{product.sku}</small></span></div></td><td>{product.collection}</td><td>{productVariants(product).map((variant) => <span key={variant.id} title={variant.color} style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: variant.colorHex, border: "1px solid #bbb", marginRight: 5 }} />)}</td><td>{formatPKR(product.price)}</td><td><b>{product.stock}</b> units</td><td><button className="table-icon" title="Edit product" onClick={() => openEdit(product)}><Edit3 /></button><button className="table-icon danger-icon" title="Delete product" onClick={() => deleteProduct(product)}><Trash2 /></button></td></tr>)}</tbody></table></div></section></div>}
        {tab === "Orders" && <div className="admin-content"><section className="page-title"><div><h1>Orders</h1><p>{orders.length} real customer orders from Firestore.</p></div></section><section className="admin-card recent-orders"><OrdersTable orders={matchingOrders} onStatus={changeStatus} onPaid={markPaid} /></section></div>}
        {tab === "Customers" && <div className="admin-content"><section className="page-title"><div><h1>Customers</h1><p>Live sign-ups and checkout customers from Firestore.</p></div></section>{matchingCustomers.length ? <section className="customer-grid">{matchingCustomers.map((customer) => <article className="admin-card customer-card" key={customer.id}><div className="customer-avatar">{customer.name.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()}</div><h2>{customer.name}</h2><p>{customer.email || customer.city || "Trevo customer"}</p>{customer.registeredAccount && <span className="customer-account-badge">Signed-in account{customer.emailVerified ? " · Verified" : ""}</span>}<div><span><b>{customer.totalOrders}</b>Orders</span><span><b>{formatPKR(customer.totalSpent)}</b>Spent</span></div>{customer.phone ? <a href={`https://wa.me/${customer.phone.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp customer</a> : <a href={`mailto:${customer.email}`}><MessageCircle /> Email customer</a>}<small className="customer-last-seen">{customer.lastLoginAt ? `Last sign-in ${new Date(customer.lastLoginAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : customer.city ? `${customer.city}, Pakistan` : "No sign-in recorded"}</small></article>)}</section> : <section className="admin-card empty-state"><Users /><h3>No customers yet</h3><p>New sign-ups and checkout customers will appear here automatically.</p></section>}</div>}
        {tab === "Payments" && <div className="admin-content"><section className="page-title"><div><h1>Payments</h1><p>Payment status from live orders.</p></div></section><section className="metric-grid compact"><article><p>Paid revenue</p><h2>{formatPKR(paidRevenue)}</h2></article><article><p>Pending advance</p><h2>{formatPKR(pendingAdvance)}</h2></article><article><p>Paid orders</p><h2>{orders.filter((order) => order.payment === "Paid").length}</h2></article><article><p>COD orders</p><h2>{orders.filter((order) => order.paymentStatus === "cod").length}</h2></article></section><section className="admin-card recent-orders"><OrdersTable orders={matchingOrders} onStatus={changeStatus} onPaid={markPaid} paymentOnly /></section></div>}
      </>}
    </section>
    {editorOpen && <ProductEditor draft={draft} setDraft={setDraft} updateVariant={updateVariant} updateImage={updateImage} onSubmit={saveProduct} onClose={() => setEditorOpen(false)} saving={saving} />}
    {toast && <div className="admin-toast"><CheckCircle2 /> {toast}</div>}
  </main>;
}

function ProductEditor({ draft, setDraft, updateVariant, updateImage, onSubmit, onClose, saving }: {
  draft: ProductDraft; setDraft: React.Dispatch<React.SetStateAction<ProductDraft>>;
  updateVariant: (index: number, update: Partial<VariantDraft>) => void;
  updateImage: (variantIndex: number, imageIndex: number, value: string) => void;
  onSubmit: (event: React.FormEvent) => void; onClose: () => void; saving: boolean;
}) {
  return <><div className="admin-modal-backdrop" onClick={onClose} /><section className="admin-modal"><div className="admin-modal-head"><h2>{draft.id ? "Edit product" : "Add a new product"}</h2><button onClick={onClose}><X /></button></div><form className="admin-form" onSubmit={onSubmit}>
    <label>Product name<input required value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} /></label>
    <div><label>SKU<input required value={draft.sku} onChange={(e) => setDraft((current) => ({ ...current, sku: e.target.value }))} /></label><label>Selling price (PKR)<input required min="0" type="number" value={draft.price} onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))} /></label></div>
    <label>Original price / Compare-at price (PKR)<input min="0" type="number" placeholder="Leave blank when the product is not on sale" value={draft.compareAt} onChange={(e) => setDraft((current) => ({ ...current, compareAt: e.target.value }))} /></label>
    <div><label>Category<select value={draft.category} onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value as Product["category"] }))}><option>Crossbody</option><option>Tote Bags</option><option>Box Bags</option><option>Luxury Collection</option></select></label><label>Collection<select value={draft.collection} onChange={(e) => setDraft((current) => ({ ...current, collection: e.target.value as Product["collection"] }))}><option>Everyday</option><option>Luxury</option><option>Statement</option></select></label></div>
    <label>Material<input value={draft.material} onChange={(e) => setDraft((current) => ({ ...current, material: e.target.value }))} /></label>
    <label>Description<textarea required minLength={10} value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} /></label>
    <div className="variant-editor-head"><b>Colour variants</b><button type="button" onClick={() => setDraft((current) => ({ ...current, variants: [...current.variants, newVariant()] }))}><Plus /> Add variant</button></div>
    {draft.variants.map((variant, variantIndex) => <section className="variant-editor" key={variant.id || variantIndex}><div className="variant-editor-head"><b>Colour {variantIndex + 1} of {draft.variants.length}</b>{draft.variants.length > 1 && <button type="button" onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, index) => index !== variantIndex) }))}><Trash2 /> Remove</button>}</div><div><label>Colour name<input required placeholder="Black" value={variant.color} onChange={(e) => updateVariant(variantIndex, { color: e.target.value })} /></label><label>Colour swatch<input required type="color" value={variant.colorHex} onChange={(e) => updateVariant(variantIndex, { colorHex: e.target.value })} /></label><label>Stock for this colour<input required min="0" type="number" value={variant.stock} onChange={(e) => updateVariant(variantIndex, { stock: e.target.value })} /></label></div><p>Paste 1–6 image URLs for this colour. One image is enough to save.</p><div className="variant-image-grid">{variant.images.map((image, imageIndex) => <label key={imageIndex}>Image {imageIndex + 1}<input type="url" placeholder="https://raw.githubusercontent.com/..." value={image} onChange={(e) => updateImage(variantIndex, imageIndex, e.target.value)} /></label>)}</div></section>)}
    <button className="outline-admin-button full" type="button" onClick={() => setDraft((current) => ({ ...current, variants: [...current.variants, newVariant()] }))}><Plus /> Add another colour (currently {draft.variants.length})</button>
    <button className="solid-admin-button full" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save product changes" : "Add product to store"}</button>
  </form></section></>;
}

function OrdersTable({ orders, onStatus, onPaid, paymentOnly = false }: { orders: AdminOrder[]; onStatus: (order: AdminOrder, status: AdminOrder["status"]) => void; onPaid: (order: AdminOrder) => void; paymentOnly?: boolean }) {
  return <div className="table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th>{!paymentOnly && <th>Status</th>}<th>Payment</th><th>Total</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.dbId}><td><b>{order.orderNumber}</b><small>{order.date}</small></td><td><b>{order.customer}</b><small>{order.city} · {order.items} item{order.items === 1 ? "" : "s"}</small></td>{!paymentOnly && <td><select className={`order-select s-${order.status.toLowerCase()}`} value={order.status} onChange={(event) => onStatus(order, event.target.value as AdminOrder["status"])}><option>New</option><option>Confirmed</option><option>Packed</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></td>}<td><span className={`payment-badge ${order.payment === "Paid" ? "paid" : "due"}`}>{order.payment}</span></td><td><b>{formatPKR(order.total)}</b></td><td><div className="row-actions">{order.payment !== "Paid" && <button title="Mark paid" onClick={() => onPaid(order)}><CircleDollarSign /></button>}<a href={`https://wa.me/${order.phone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${order.customer.split(" ")[0]}, this is Trevo regarding order ${order.orderNumber}.`)}`} target="_blank" rel="noreferrer"><MessageCircle /></a></div></td></tr>)}</tbody></table>{!orders.length && <div className="admin-empty"><Search /><h3>No live orders found.</h3><p>New customer orders will appear here automatically.</p></div>}</div>;
}
