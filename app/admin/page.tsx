"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileUp,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { formatPKR, products } from "../../lib/catalog";

type Tab = "Overview" | "Products" | "Orders" | "Customers" | "Payments";
type AdminOrder = {
  id: string;
  customer: string;
  phone: string;
  city: string;
  total: number;
  items: number;
  status: "New" | "Confirmed" | "Packed" | "Shipped" | "Delivered";
  payment: "Paid" | "Advance pending" | "COD advance due";
  date: string;
};

const initialOrders: AdminOrder[] = [
  { id: "TRV-260720-1842", customer: "Ayesha Khan", phone: "923001234567", city: "Lahore", total: 4380, items: 1, status: "New", payment: "Advance pending", date: "Today, 11:42 AM" },
  { id: "TRV-260720-1751", customer: "Maham Ali", phone: "923118765432", city: "Islamabad", total: 7080, items: 2, status: "Confirmed", payment: "Paid", date: "Today, 10:18 AM" },
  { id: "TRV-260719-1690", customer: "Sana Riaz", phone: "923224445555", city: "Faisalabad", total: 3790, items: 1, status: "Packed", payment: "COD advance due", date: "Yesterday, 5:02 PM" },
  { id: "TRV-260719-1584", customer: "Iqra Ahmed", phone: "923339991122", city: "Karachi", total: 8880, items: 2, status: "Shipped", payment: "Paid", date: "Yesterday, 1:37 PM" },
  { id: "TRV-260718-1420", customer: "Fatima Noor", phone: "923007770099", city: "Multan", total: 3040, items: 1, status: "Delivered", payment: "Paid", date: "18 Jul, 4:10 PM" },
];

const menu: { tab: Tab; icon: React.ReactNode }[] = [
  { tab: "Overview", icon: <LayoutDashboard /> },
  { tab: "Products", icon: <Package /> },
  { tab: "Orders", icon: <ShoppingBag /> },
  { tab: "Customers", icon: <Users /> },
  { tab: "Payments", icon: <CircleDollarSign /> },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/orders")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { orders?: Array<Record<string, unknown>> }) => {
        if (!data.orders?.length) return;
        setOrders(data.orders.map((order) => ({
          id: String(order.orderNumber),
          customer: String(order.customerName),
          phone: String(order.customerPhone).replace(/^0/, "92"),
          city: String(order.city),
          total: Number(order.total),
          items: Array.isArray(order.items) ? order.items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity || 0), 0) : 1,
          status: ({ new: "New", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped", delivered: "Delivered" }[String(order.status)] || "New") as AdminOrder["status"],
          payment: order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "cod_advance_required" ? "COD advance due" : "Advance pending",
          date: new Date(String(order.createdAt)).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
        })));
      })
      .catch(() => undefined);
  }, []);

  const matchingOrders = useMemo(() => orders.filter((order) => `${order.id} ${order.customer} ${order.city}`.toLowerCase().includes(query.toLowerCase())), [orders, query]);
  const lowStock = products.filter((product) => product.stock <= 5);

  const changeStatus = (id: string, status: AdminOrder["status"]) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    showToast(`Order ${id} updated to ${status}.`);
  };

  const markPaid = (id: string) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, payment: "Paid" } : order));
    showToast(`Payment recorded for ${id}.`);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const selectTab = (value: Tab) => {
    setTab(value);
    setSideOpen(false);
    setQuery("");
  };

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${sideOpen ? "open" : ""}`}>
        <div className="admin-brand"><a href="/">TREVO<span>Admin studio</span></a><button aria-label="Close menu" onClick={() => setSideOpen(false)}><X /></button></div>
        <nav>{menu.map((item) => <button key={item.tab} className={tab === item.tab ? "active" : ""} onClick={() => selectTab(item.tab)}>{item.icon}<span>{item.tab}</span>{item.tab === "Orders" && <b>3</b>}</button>)}</nav>
        <div className="sidebar-lower"><a href="/setup"><Settings /><span>Store setup</span></a><a href="/"><ArrowLeft /><span>View webstore</span></a></div>
        <div className="admin-user"><div>FH</div><span><b>Fatima Hussain</b><small>Store owner</small></span><MoreHorizontal /></div>
      </aside>
      {sideOpen && <div className="admin-side-backdrop" onClick={() => setSideOpen(false)} />}

      <section className="admin-main">
        <header className="admin-header"><div><button className="admin-menu-button" aria-label="Open admin menu" onClick={() => setSideOpen(true)}><Menu /></button><p>{tab}</p><span>Manage your Trevo store</span></div><div className="admin-header-actions"><div className="admin-search"><Search /><input placeholder="Search orders, products…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="admin-notification" aria-label="Notifications"><Bell /><b>3</b></button><a href="/" target="_blank">Open store <ExternalLink /></a></div></header>

        {tab === "Overview" && <div className="admin-content">
          <section className="admin-welcome"><div><p>Monday, 20 July</p><h1>Good afternoon, Fatima.</h1><span>Here&apos;s what&apos;s happening with Trevo today.</span></div><button onClick={() => setAddOpen(true)}><Plus /> Add product</button></section>
          <section className="metric-grid">
            <article><div className="metric-icon sage"><BadgeDollarSign /></div><p>Revenue</p><h2>Rs. 78,420</h2><span className="positive"><TrendingUp /> 18.4% this month</span></article>
            <article><div className="metric-icon rose"><ShoppingBag /></div><p>Orders</p><h2>28</h2><span className="positive"><TrendingUp /> 6 more than last week</span></article>
            <article><div className="metric-icon gold"><CircleDollarSign /></div><p>Pending advance</p><h2>Rs. 2,600</h2><span className="warning"><AlertTriangle /> 4 orders need action</span></article>
            <article><div className="metric-icon blue"><Users /></div><p>Customers</p><h2>156</h2><span>12 new this month</span></article>
          </section>
          <div className="admin-split">
            <section className="admin-card revenue-card"><div className="card-title"><div><h2>Sales performance</h2><p>Revenue during the last 7 days</p></div><button>Last 7 days <ChevronDown /></button></div><div className="revenue-total"><strong>Rs. 31,850</strong><span><TrendingUp /> 12.6%</span></div><div className="bar-chart" aria-label="Seven day revenue bar chart">{[44, 68, 51, 77, 61, 92, 73].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small></div>)}</div></section>
            <section className="admin-card low-stock-card"><div className="card-title"><div><h2>Low stock alerts</h2><p>Restock before these sell out</p></div><button onClick={() => selectTab("Products")}>View all</button></div>{lowStock.map((product) => <div className="stock-row" key={product.id}><img src={product.images[0]} alt="" /><span><b>{product.name}</b><small>{product.sku}</small></span><strong className={product.stock <= 3 ? "critical" : ""}>{product.stock} left</strong><button aria-label={`Edit ${product.name}`}><Edit3 /></button></div>)}</section>
          </div>
          <section className="admin-card recent-orders"><div className="card-title"><div><h2>Recent orders</h2><p>Latest orders from web and WhatsApp checkout</p></div><button onClick={() => selectTab("Orders")}>View all orders <ArrowLeft /></button></div><OrdersTable orders={orders.slice(0, 4)} onStatus={changeStatus} onPaid={markPaid} /></section>
        </div>}

        {tab === "Products" && <div className="admin-content"><section className="page-title"><div><h1>Products</h1><p>{products.length} products · {products.reduce((sum, product) => sum + product.stock, 0)} units in stock</p></div><div><button className="outline-admin-button" onClick={() => setImportOpen(true)}><FileUp /> Import CSV</button><button className="solid-admin-button" onClick={() => setAddOpen(true)}><Plus /> Add product</button></div></section><section className="admin-card product-table-card"><table className="admin-table"><thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Inventory</th><th>Status</th><th /></tr></thead><tbody>{products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())).map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.images[0]} alt="" /><span><b>{product.name}</b><small>{product.sku}</small></span></div></td><td>{product.collection}</td><td>{formatPKR(product.price)}</td><td><b>{product.stock}</b> units</td><td><span className={`table-status ${product.stock <= 3 ? "danger" : product.stock <= 5 ? "pending" : "success"}`}>{product.stock <= 3 ? "Low stock" : "Active"}</span></td><td><button className="table-icon"><Edit3 /></button><button className="table-icon danger-icon"><Trash2 /></button></td></tr>)}</tbody></table></section></div>}

        {tab === "Orders" && <div className="admin-content"><section className="page-title"><div><h1>Orders</h1><p>Track, confirm and fulfil every Trevo order.</p></div><button className="outline-admin-button"><Download /> Export orders</button></section><section className="order-tabs"><button className="active">All <b>{orders.length}</b></button><button>New <b>{orders.filter((order) => order.status === "New").length}</b></button><button>In progress</button><button>Shipped</button><button>Delivered</button></section><section className="admin-card recent-orders"><OrdersTable orders={matchingOrders} onStatus={changeStatus} onPaid={markPaid} /></section></div>}

        {tab === "Customers" && <div className="admin-content"><section className="page-title"><div><h1>Customers</h1><p>Order history and customer communication in one place.</p></div><button className="outline-admin-button"><Download /> Export customers</button></section><section className="customer-grid">{orders.map((order, index) => <article className="admin-card customer-card" key={order.id}><div className={`customer-avatar c${index}`}>{order.customer.split(" ").map((name) => name[0]).join("")}</div><h2>{order.customer}</h2><p>{order.city}, Pakistan</p><div><span><b>{index + 1}</b>Orders</span><span><b>{formatPKR(order.total)}</b>Spent</span></div><a href={`https://wa.me/${order.phone}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp customer</a></article>)}</section></div>}

        {tab === "Payments" && <div className="admin-content"><section className="page-title"><div><h1>Payments & advance tracking</h1><p>See paid, pending and COD-security amounts clearly.</p></div><button className="outline-admin-button"><Download /> Export ledger</button></section><section className="metric-grid compact"><article><p>Total collected</p><h2>Rs. 78,420</h2><span className="positive"><CheckCircle2 /> Reconciled</span></article><article><p>Advance pending</p><h2>Rs. 2,600</h2><span className="warning">4 orders</span></article><article><p>COD security held</p><h2>Rs. 1,400</h2><span>7 active orders</span></article><article><p>Refunds</p><h2>Rs. 0</h2><span>No pending refunds</span></article></section><section className="admin-card recent-orders"><div className="card-title"><div><h2>Payment ledger</h2><p>Update an order as soon as payment proof is verified.</p></div></div><OrdersTable orders={matchingOrders} onStatus={changeStatus} onPaid={markPaid} paymentOnly /></section></div>}
      </section>

      {importOpen && <AdminModal title="Import product CSV" onClose={() => setImportOpen(false)}><div className="upload-zone"><FileUp /><h3>Choose your product CSV</h3><p>Use the included template. Images can be public links or uploaded separately.</p><label><input type="file" accept=".csv" onChange={() => showToast("CSV selected. Connect Firebase to import live products.")} />Select CSV file</label></div><div className="import-checks"><p><CheckCircle2 /> SKU and product names are required</p><p><CheckCircle2 /> Multiple colours use a vertical bar: Sage|Black</p><p><CheckCircle2 /> Prices should be numbers without Rs.</p></div><button className="solid-admin-button full" onClick={() => { setImportOpen(false); showToast("CSV validation complete — 6 sample rows ready."); }}>Validate and import</button></AdminModal>}
      {addOpen && <AdminModal title="Add a new product" onClose={() => setAddOpen(false)}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); setAddOpen(false); showToast("Product draft saved."); }}><label>Product name<input required placeholder="e.g. Luna Shoulder Bag" /></label><div><label>SKU<input required placeholder="TRV-SHB-007" /></label><label>Price (PKR)<input required type="number" placeholder="3990" /></label></div><div><label>Category<select><option>Shoulder Bags</option><option>Tote Bags</option><option>Crossbody</option><option>Top Handle</option></select></label><label>Opening stock<input required type="number" placeholder="10" /></label></div><label>Description<textarea required placeholder="Describe the bag, material and useful details." /></label><button className="solid-admin-button full">Save product</button></form></AdminModal>}
      {toast && <div className="admin-toast"><CheckCircle2 /> {toast}</div>}
    </main>
  );
}

function OrdersTable({ orders, onStatus, onPaid, paymentOnly = false }: { orders: AdminOrder[]; onStatus: (id: string, status: AdminOrder["status"]) => void; onPaid: (id: string) => void; paymentOnly?: boolean }) {
  return <div className="table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th>{!paymentOnly && <th>Status</th>}<th>Payment</th><th>Total</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.id}</b><small>{order.date}</small></td><td><b>{order.customer}</b><small>{order.city} · {order.items} item{order.items > 1 ? "s" : ""}</small></td>{!paymentOnly && <td><select className={`order-select s-${order.status.toLowerCase()}`} value={order.status} onChange={(event) => onStatus(order.id, event.target.value as AdminOrder["status"])}><option>New</option><option>Confirmed</option><option>Packed</option><option>Shipped</option><option>Delivered</option></select></td>}<td><span className={`payment-badge ${order.payment === "Paid" ? "paid" : "due"}`}>{order.payment}</span></td><td><b>{formatPKR(order.total)}</b></td><td><div className="row-actions">{order.payment !== "Paid" && <button title="Mark payment received" onClick={() => onPaid(order.id)}><CircleDollarSign /></button>}<a href={`https://wa.me/${order.phone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${order.customer.split(" ")[0]}, this is Trevo regarding order ${order.id}.`)}`} target="_blank" rel="noreferrer" title="Message on WhatsApp"><MessageCircle /></a><button title="View order"><Eye /></button></div></td></tr>)}</tbody></table>{!orders.length && <div className="admin-empty"><Search /><h3>No matching orders.</h3><p>Try a customer name, city or order number.</p></div>}</div>;
}

function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <><div className="admin-modal-backdrop" onClick={onClose} /><section className="admin-modal"><div><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X /></button></div>{children}</section></>;
}
