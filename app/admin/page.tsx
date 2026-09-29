"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

type MenuItem = {
  name: string;
  icon: string;
  path?: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);

  const [pendingOrders, setPendingOrders] = useState(0);
  const [deliveredOrders, setDeliveredOrders] = useState(0);
  const [revenue, setRevenue] = useState(0);

  const [mobileMenu, setMobileMenu] = useState(false);

  /* =========================
     ADMIN AUTHENTICATION
  ========================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
          router.replace("/");
          return;
        }

        const adminData = adminSnap.data();

        if (
          adminData.role !== "admin" ||
          adminData.active !== true
        ) {
          router.replace("/");
          return;
        }

        setAdminName(adminData.name || "Admin");
        setLoading(false);
      } catch (error) {
        console.error("Admin verification error:", error);
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  /* =========================
     REALTIME PRODUCTS
  ========================= */

  useEffect(() => {
    if (loading) return;

    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProductsCount(snapshot.size);
      },
      (error) => {
        console.error("Products realtime error:", error);
      }
    );

    return () => unsubscribe();
  }, [loading]);

  /* =========================
     REALTIME CUSTOMERS
  ========================= */

  useEffect(() => {
    if (loading) return;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        let customerCount = 0;

        snapshot.forEach((item) => {
          const data = item.data();

          if (
            data.role === "customer" ||
            !data.role
          ) {
            customerCount++;
          }
        });

        setCustomersCount(customerCount);
      },
      (error) => {
        console.error("Customers realtime error:", error);
      }
    );

    return () => unsubscribe();
  }, [loading]);

  /* =========================
     REALTIME COUPONS
  ========================= */

  useEffect(() => {
    if (loading) return;

    const unsubscribe = onSnapshot(
      collection(db, "coupons"),
      (snapshot) => {
        setCouponsCount(snapshot.size);
      },
      (error) => {
        console.error("Coupons realtime error:", error);
      }
    );

    return () => unsubscribe();
  }, [loading]);

  /* =========================
     REALTIME ORDERS
  ========================= */

  useEffect(() => {
    if (loading) return;

    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        let pending = 0;
        let delivered = 0;
        let totalRevenue = 0;

        snapshot.forEach((item) => {
          const data = item.data();

          const status =
            data.orderStatus ||
            data.deliveryStatus ||
            "Pending";

          if (
            status === "Pending" ||
            status === "Confirmed" ||
            status === "Processing" ||
            status === "Shipped"
          ) {
            pending++;
          }

          if (status === "Delivered") {
            delivered++;
          }

          if (
            status !== "Cancelled" &&
            status !== "Rejected"
          ) {
            const amount = Number(
              data.totalAmount || 0
            );

            if (!isNaN(amount)) {
              totalRevenue += amount;
            }
          }
        });

        setOrdersCount(snapshot.size);
        setPendingOrders(pending);
        setDeliveredOrders(delivered);
        setRevenue(totalRevenue);
      },
      (error) => {
        console.error("Orders realtime error:", error);
      }
    );

    return () => unsubscribe();
  }, [loading]);

  /* =========================
     MENU
  ========================= */

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      icon: "📊",
    },
    {
      name: "Products",
      icon: "📦",
      path: "/admin/products",
    },
    {
      name: "Categories",
      icon: "🗂️",
      path: "/admin/categories",
    },
    {
      name: "Orders",
      icon: "🛒",
      path: "/admin/orders",
    },
    {
      name: "Customers",
      icon: "👥",
      path: "/admin/customers",
    },
    {
      name: "Payments",
      icon: "💳",
    },
    {
      name: "Offers & Coupons",
      icon: "🎟️",
      path: "/admin/offers",
    },
    {
      name: "Homepage",
      icon: "🏠",
      path: "/admin/homepage",
    },
    {
      name: "QR Payment",
      icon: "🔳",
    },
    {
      name: "Delivery",
      icon: "🚚",
    },
    {
      name: "Reviews",
      icon: "⭐",
    },
    {
      name: "Notifications",
      icon: "🔔",
    },
    {
      name: "Settings",
      icon: "⚙️",
    },
  ];

  /* =========================
     MENU CLICK
  ========================= */

  const handleMenuClick = (item: MenuItem) => {
    setActiveMenu(item.name);
    setMobileMenu(false);

    if (item.path) {
      router.push(item.path);
    }
  };

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <div className="text-center animate-pulse">

          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20"></div>

            <div className="absolute inset-0 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin"></div>
          </div>

          <h2 className="text-xl font-bold">
            Picko Shop
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Checking Admin Access...
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">

      {/* =========================
          MOBILE TOPBAR
      ========================= */}

      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0d0d0d]/95 backdrop-blur-xl border-b border-white/10 z-[60] flex items-center justify-between px-4">

        <div className="flex items-center gap-3">

          <img
            src="/picko-logo.png"
            alt="Picko Shop"
            className="w-24 h-auto object-contain"
          />

        </div>

        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg"
        >
          {mobileMenu ? "✕" : "☰"}
        </button>

      </div>

      {/* =========================
          MOBILE OVERLAY
      ========================= */}

      {mobileMenu && (
        <div
          onClick={() => setMobileMenu(false)}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        />
      )}

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        className={`
          fixed left-0 top-0 bottom-0
          w-72 bg-[#0d0d0d]
          border-r border-white/10
          z-50
          flex flex-col
          transition-transform duration-300
          lg:translate-x-0
          ${
            mobileMenu
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* LOGO */}

        <div className="h-24 flex items-center px-7 border-b border-white/10">

          <img
            src="/picko-logo.png"
            alt="Picko Shop"
            className="w-32 h-auto object-contain"
          />

        </div>

        {/* ADMIN */}

        <div className="px-5 py-5 border-b border-white/10">

          <div className="flex items-center gap-3">

            <div className="relative">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-yellow-500/10">
                {adminName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0d0d0d]"></span>

            </div>

            <div className="min-w-0">

              <p className="font-bold text-white truncate">
                {adminName}
              </p>

              <p className="text-xs text-green-400 mt-1">
                ● Administrator
              </p>

            </div>

          </div>

        </div>

        {/* MENU */}

        <nav className="flex-1 overflow-y-auto px-4 py-5">

          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-600 px-3 mb-3">
            Management
          </p>

          <div className="space-y-1">

            {menuItems.map((item) => (

              <button
                key={item.name}
                onClick={() =>
                  handleMenuClick(item)
                }
                className={`
                  relative
                  w-full
                  flex items-center gap-3
                  px-4 py-3
                  rounded-xl
                  text-sm
                  transition-all duration-200
                  group
                  ${
                    activeMenu === item.name
                      ? "bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/10"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >

                {activeMenu === item.name && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-black/70" />
                )}

                <span
                  className={`
                    text-lg
                    transition-transform
                    ${
                      activeMenu === item.name
                        ? "scale-110"
                        : "group-hover:scale-110"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span>
                  {item.name}
                </span>

                {item.path && (
                  <span
                    className={`
                      ml-auto text-xs
                      ${
                        activeMenu === item.name
                          ? "opacity-60"
                          : "opacity-0 group-hover:opacity-50"
                      }
                    `}
                  >
                    →
                  </span>
                )}

              </button>

            ))}

          </div>

        </nav>

        {/* LOGOUT */}

        <div className="p-4 border-t border-white/10">

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/20 transition-all duration-200 text-sm"
          >
            🚪 Logout
          </button>

        </div>

      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">

        {/* TOPBAR */}

        <header className="h-24 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl hidden lg:flex items-center justify-between px-10 sticky top-0 z-30">

          <div>

            <p className="text-[11px] text-gray-600 uppercase tracking-[0.25em]">
              Picko Shop
            </p>

            <h1 className="text-2xl font-black mt-1">
              {activeMenu}
            </h1>

          </div>

          <div className="flex items-center gap-4">

            <button
              className="relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              🔔

              {pendingOrders > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                  {pendingOrders > 99
                    ? "99+"
                    : pendingOrders}
                </span>
              )}

            </button>

            <div className="w-11 h-11 rounded-xl bg-yellow-500 text-black flex items-center justify-center font-black shadow-lg shadow-yellow-500/10">
              {adminName
                .charAt(0)
                .toUpperCase()}
            </div>

          </div>

        </header>

        {/* =========================
            DASHBOARD CONTENT
        ========================= */}

        <section className="p-5 sm:p-7 lg:p-10">

          {/* WELCOME */}

          <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-[#111] to-[#0d0d0d] p-6 sm:p-8 mb-8">

            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-yellow-500/10 blur-3xl animate-pulse"></div>

            <div className="relative">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                <div>

                  <p className="text-yellow-400 text-sm font-semibold">
                    Welcome back 👋
                  </p>

                  <h2 className="text-3xl sm:text-4xl font-black mt-2">
                    {adminName}
                  </h2>

                  <p className="text-gray-500 mt-2 text-sm sm:text-base">
                    Manage your Picko Shop from one powerful dashboard.
                  </p>

                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 w-fit">

                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>

                  <span className="text-xs text-green-400 font-semibold">
                    LIVE SYSTEM
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* =========================
              MAIN STATS
          ========================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

            {/* PRODUCTS */}

            <button
              onClick={() =>
                router.push("/admin/products")
              }
              className="group text-left bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300"
            >

              <div className="flex items-start justify-between">

                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  📦
                </div>

                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  LIVE
                </span>

              </div>

              <p className="text-gray-500 text-sm mt-5">
                Total Products
              </p>

              <h3 className="text-3xl font-black mt-2">
                {productsCount}
              </h3>

              <p className="text-xs text-gray-600 mt-2">
                Click to manage products →
              </p>

            </button>

            {/* ORDERS */}

            <button
              onClick={() =>
                router.push("/admin/orders")
              }
              className="group text-left bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300"
            >

              <div className="flex items-start justify-between">

                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  🛒
                </div>

                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  LIVE
                </span>

              </div>

              <p className="text-gray-500 text-sm mt-5">
                Total Orders
              </p>

              <h3 className="text-3xl font-black mt-2">
                {ordersCount}
              </h3>

              <p className="text-xs text-gray-600 mt-2">
                {pendingOrders} active orders
              </p>

            </button>

            {/* CUSTOMERS */}

            <button
              onClick={() =>
                router.push("/admin/customers")
              }
              className="group text-left bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300"
            >

              <div className="flex items-start justify-between">

                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  👥
                </div>

                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  LIVE
                </span>

              </div>

              <p className="text-gray-500 text-sm mt-5">
                Customers
              </p>

              <h3 className="text-3xl font-black mt-2">
                {customersCount}
              </h3>

              <p className="text-xs text-gray-600 mt-2">
                Registered customers →
              </p>

            </button>

            {/* COUPONS */}

            <button
              onClick={() =>
                router.push("/admin/offers")
              }
              className="group text-left bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300"
            >

              <div className="flex items-start justify-between">

                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  🎟️
                </div>

                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  LIVE
                </span>

              </div>

              <p className="text-gray-500 text-sm mt-5">
                Coupons
              </p>

              <h3 className="text-3xl font-black mt-2">
                {couponsCount}
              </h3>

              <p className="text-xs text-gray-600 mt-2">
                Manage offers →
              </p>

            </button>

          </div>

          {/* =========================
              BUSINESS SUMMARY
          ========================= */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

            {/* REVENUE */}

            <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-gray-500 text-sm">
                    Total Order Value
                  </p>

                  <h3 className="text-3xl font-black mt-2">
                    ৳{revenue.toLocaleString()}
                  </h3>

                </div>

                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-2xl">
                  💰
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">

                <div className="bg-white/[0.03] rounded-xl p-4">

                  <p className="text-xs text-gray-600">
                    Active Orders
                  </p>

                  <p className="text-xl font-bold text-yellow-400 mt-1">
                    {pendingOrders}
                  </p>

                </div>

                <div className="bg-white/[0.03] rounded-xl p-4">

                  <p className="text-xs text-gray-600">
                    Delivered
                  </p>

                  <p className="text-xl font-bold text-green-400 mt-1">
                    {deliveredOrders}
                  </p>

                </div>

              </div>

            </div>

            {/* SYSTEM */}

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">

              <div className="flex items-center justify-between mb-5">

                <h2 className="font-bold">
                  System Status
                </h2>

                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>

              </div>

              <div className="space-y-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Authentication
                  </span>

                  <span className="text-xs text-green-400">
                    ✓ Connected
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Firestore
                  </span>

                  <span className="text-xs text-green-400">
                    ✓ Live
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Products
                  </span>

                  <span className="text-xs text-green-400">
                    ✓ Syncing
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-500">
                    Orders
                  </span>

                  <span className="text-xs text-green-400">
                    ✓ Realtime
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* =========================
              QUICK ACTIONS
          ========================= */}

          <div className="mb-8">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2 className="text-xl font-black">
                  Quick Actions
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  Quickly manage your store
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

              {/* PRODUCTS */}

              <button
                onClick={() =>
                  router.push("/admin/products")
                }
                className="text-left bg-[#111] border border-white/10 hover:border-yellow-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
              >

                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">
                  📦
                </div>

                <h3 className="font-bold group-hover:text-yellow-400 transition">
                  Manage Products
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  Add, edit and manage products.
                </p>

                <p className="text-xs text-yellow-500/70 mt-4">
                  Open Products →
                </p>

              </button>

              {/* CATEGORIES */}

              <button
                onClick={() =>
                  router.push("/admin/categories")
                }
                className="text-left bg-[#111] border border-white/10 hover:border-yellow-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
              >

                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">
                  🗂️
                </div>

                <h3 className="font-bold group-hover:text-yellow-400 transition">
                  Manage Categories
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  Manage categories and subcategories.
                </p>

                <p className="text-xs text-yellow-500/70 mt-4">
                  Open Categories →
                </p>

              </button>

              {/* HOMEPAGE */}

              <button
                onClick={() =>
                  router.push("/admin/homepage")
                }
                className="text-left bg-[#111] border border-white/10 hover:border-yellow-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">
                  🏠
                </div>

                <h3 className="font-bold group-hover:text-yellow-400 transition">
                  Homepage
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  Manage homepage banners and sections.
                </p>

                <p className="text-xs text-yellow-500/70 mt-4">
                  Open Homepage →
                </p>
              </button>

              {/* OFFERS */}

              <button
                onClick={() =>
                  router.push("/admin/offers")
                }
                className="text-left bg-[#111] border border-white/10 hover:border-yellow-500/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group"
              >

                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">
                  🎟️
                </div>

                <h3 className="font-bold group-hover:text-yellow-400 transition">
                  Offers & Coupons
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  Create and manage discount coupons.
                </p>

                <p className="text-xs text-yellow-500/70 mt-4">
                  Open Offers →
                </p>

              </button>

            </div>

          </div>

          {/* =========================
              MANAGEMENT OVERVIEW
          ========================= */}

          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-xl font-black">
                  Store Management
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  All major systems are connected to the admin panel.
                </p>

              </div>

              <span className="hidden sm:block px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">
                Picko Shop
              </span>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              {[
                {
                  title: "Products",
                  icon: "📦",
                  path: "/admin/products",
                },
                {
                  title: "Categories",
                  icon: "🗂️",
                  path: "/admin/categories",
                },
                {
                  title: "Orders",
                  icon: "🛒",
                  path: "/admin/orders",
                },
                {
                  title: "Customers",
                  icon: "👥",
                  path: "/admin/customers",
                },
              ].map((item) => (

                <button
                  key={item.title}
                  onClick={() =>
                    router.push(item.path)
                  }
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-yellow-500/20 rounded-xl p-4 text-left transition-all duration-200"
                >

                  <div className="text-xl">
                    {item.icon}
                  </div>

                  <p className="text-sm font-semibold mt-3">
                    {item.title}
                  </p>

                  <p className="text-[10px] text-green-400 mt-1">
                    ● Connected
                  </p>

                </button>

              ))}

            </div>

          </div>

        </section>

      </main>

      {/* =========================
          ANIMATION
      ========================= */}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        section > * {
          animation: fadeUp 0.45s ease-out both;
        }
      `}</style>

    </div>
  );
}