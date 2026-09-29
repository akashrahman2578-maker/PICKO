"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

type OrderItem = {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
};

type Order = {
  id: string;
  orderId?: string;

  customerName?: string;
  customerPhone?: string;

  division?: string;
  district?: string;
  upazila?: string;
  area?: string;
  address?: string;
  note?: string;

  items?: OrderItem[];

  subtotal?: number;
  deliveryCharge?: number;
  totalAmount?: number;

  paymentMethod?: string;
  paymentNumber?: string;
  transactionId?: string;
  paymentStatus?: string;

  orderStatus?: string;
  deliveryStatus?: string;

  createdAt?: any;
  statusUpdatedAt?: any;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  // ==========================================
  // AUTH
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        setChecking(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  // ==========================================
  // REALTIME ORDERS
  // ==========================================
  useEffect(() => {
    if (!user?.uid) return;

    setOrdersLoading(true);

    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderList: Order[] =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];

        orderList.sort((a, b) => {
          const aTime =
            a.createdAt?.seconds ||
            a.createdAt?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.seconds ||
            b.createdAt?.toMillis?.() ||
            0;

          return bTime - aTime;
        });

        setOrders(orderList);
        setOrdersLoading(false);
      },
      (error) => {
        console.error(
          "Realtime orders error:",
          error
        );

        setOrders([]);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  // ==========================================
  // IMPORTANT:
  // ORDER STATUS IS NOW PRIMARY
  // ==========================================
  const getOrderStatus = (order: Order) => {
    return (
      order.orderStatus ||
      order.deliveryStatus ||
      "Pending"
    );
  };

  // ==========================================
  // ORDER STATISTICS
  // ==========================================
  const stats = useMemo(() => {
    const pending = orders.filter((order) => {
      const status =
        getOrderStatus(order).toLowerCase();

      return (
        status === "pending" ||
        status === "confirmed" ||
        status === "processing" ||
        status === "shipped"
      );
    }).length;

    const delivered = orders.filter((order) => {
      return (
        getOrderStatus(order).toLowerCase() ===
        "delivered"
      );
    }).length;

    return {
      total: orders.length,
      pending,
      delivered,
    };
  }, [orders]);

  // ==========================================
  // LOADING
  // ==========================================
  if (checking || !user) {
    return (
      <main className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="text-center animate-pulse">

          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20" />

            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />

            <div className="absolute inset-3 rounded-full bg-yellow-400/10 blur-md animate-pulse" />
          </div>

          <p className="text-gray-500 text-sm mt-5">
            Loading profile...
          </p>

        </div>
      </main>
    );
  }

  const displayName =
    user.displayName || "Picko User";

  const email =
    user.email || "Google Account";

  const photo = user.photoURL;

  return (
    <main className="min-h-screen bg-[#070707] text-white px-4 py-8 relative overflow-hidden">

      {/* =====================================
          BACKGROUND ANIMATION
      ====================================== */}

      <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div
        className="absolute top-[45%] -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDelay: "1.5s" }}
      />

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-72 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative max-w-6xl mx-auto">

        {/* =====================================
            HEADER
        ====================================== */}

        <div className="flex items-center justify-between mb-8 animate-[fadeIn_.5s_ease-out]">

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 group"
          >
            <span className="text-xl group-hover:-translate-x-1 transition-transform duration-300">
              ←
            </span>

            <span className="text-sm">
              Back to Shop
            </span>
          </button>

          <div className="flex items-center gap-3">

            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600">
                Welcome Back
              </p>

              <p className="text-sm text-gray-300">
                {displayName}
              </p>
            </div>

            <img
              src="/picko-logo.png"
              alt="Picko Shop"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* =====================================
            PROFILE HERO
        ====================================== */}

        <section className="rounded-[28px] border border-yellow-500/20 bg-gradient-to-br from-[#151515] via-[#101010] to-[#0b0b0b] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 animate-[fadeUp_.6s_ease-out]">

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* PROFILE IMAGE */}

            <div className="relative">

              <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full animate-pulse" />

              {photo ? (
                <img
                  src={photo}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="relative w-28 h-28 rounded-full object-cover border-4 border-yellow-500/30 shadow-xl hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="relative w-28 h-28 rounded-full bg-yellow-500/10 border-4 border-yellow-500/20 flex items-center justify-center text-4xl hover:scale-105 transition-transform duration-500">
                  👤
                </div>
              )}

              <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-green-500 border-4 border-[#101010] shadow-lg shadow-green-500/40 animate-pulse" />

            </div>

            {/* USER INFO */}

            <div className="flex-1 text-center sm:text-left">

              <p className="text-yellow-400 text-xs font-semibold tracking-[0.28em] uppercase mb-2">
                PICKO MEMBER
              </p>

              <h1 className="text-3xl sm:text-4xl font-bold">
                {displayName}
              </h1>

              <p className="text-gray-400 mt-2 break-all">
                {email}
              </p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">

                <span className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs animate-pulse">
                  ● Account Active
                </span>

                {user.providerData.some(
                  (provider) =>
                    provider.providerId ===
                    "google.com"
                ) && (
                  <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs">
                    Google Account
                  </span>
                )}

              </div>
            </div>

            {/* SHOP BUTTON */}

            <button
              onClick={() => router.push("/")}
              className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-yellow-500/10"
            >
              🛍️ Shop Now
            </button>

          </div>
        </section>

        {/* =====================================
            ORDER STATS
        ====================================== */}

        <section className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">

          <StatCard
            number={stats.total}
            label="Total Orders"
            className="border-white/10"
          />

          <StatCard
            number={stats.pending}
            label="Active Orders"
            className="border-yellow-500/10"
            numberClass="text-yellow-400"
          />

          <StatCard
            number={stats.delivered}
            label="Delivered"
            className="border-green-500/10"
            numberClass="text-green-400"
          />

        </section>

        {/* =====================================
            MY ORDERS
        ====================================== */}

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] overflow-hidden animate-[fadeUp_.8s_ease-out]">

          {/* TITLE */}

          <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center text-xl animate-pulse">
                📦
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  My Orders
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Your latest orders & delivery updates
                </p>
              </div>

            </div>

            {orders.length > 0 && (
              <button
                onClick={() => router.push("/orders")}
                className="text-sm text-yellow-400 hover:text-yellow-300 hover:translate-x-1 transition-all duration-300"
              >
                View All Orders →
              </button>
            )}

          </div>

          {/* ORDER CONTENT */}

          <div className="p-4 sm:p-6">

            {ordersLoading ? (

              <div className="py-12 text-center">

                <div className="relative w-12 h-12 mx-auto">

                  <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20" />

                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />

                </div>

                <p className="text-gray-500 text-sm mt-5">
                  Loading your orders...
                </p>

              </div>

            ) : orders.length === 0 ? (

              <div className="py-12 text-center animate-[fadeUp_.5s_ease-out]">

                <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/10 flex items-center justify-center text-4xl mx-auto hover:scale-110 transition-transform duration-500">
                  🛍️
                </div>

                <h3 className="text-lg font-semibold mt-5">
                  No orders yet
                </h3>

                <p className="text-gray-500 text-sm mt-2">
                  Your orders will appear here after you place an order.
                </p>

                <button
                  onClick={() => router.push("/")}
                  className="mt-6 px-6 py-3 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Start Shopping →
                </button>

              </div>

            ) : (

              <div className="space-y-3">

                {orders.slice(0, 5).map(
                  (order, index) => {

                    /*
                     * IMPORTANT FIX:
                     * orderStatus FIRST
                     * deliveryStatus SECOND
                     */
                    const status =
                      getOrderStatus(order);

                    const statusLower =
                      status.toLowerCase();

                    let statusClass =
                      "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";

                    let statusIcon = "⏳";

                    if (
                      statusLower ===
                      "delivered"
                    ) {
                      statusClass =
                        "bg-green-500/10 border-green-500/20 text-green-400";

                      statusIcon = "✓";
                    } else if (
                      statusLower ===
                        "cancelled" ||
                      statusLower ===
                        "canceled" ||
                      statusLower ===
                        "rejected"
                    ) {
                      statusClass =
                        "bg-red-500/10 border-red-500/20 text-red-400";

                      statusIcon = "✕";
                    } else if (
                      statusLower ===
                        "shipped" ||
                      statusLower ===
                        "out for delivery"
                    ) {
                      statusClass =
                        "bg-blue-500/10 border-blue-500/20 text-blue-400";

                      statusIcon = "🚚";
                    } else if (
                      statusLower ===
                        "confirmed" ||
                      statusLower ===
                        "processing"
                    ) {
                      statusClass =
                        "bg-purple-500/10 border-purple-500/20 text-purple-400";

                      statusIcon = "⚙";
                    }

                    const orderDate =
                      order.createdAt?.toDate
                        ? order.createdAt.toDate()
                        : null;

                    const itemCount =
                      order.items?.reduce(
                        (total, item) =>
                          total +
                          (item.quantity || 1),
                        0
                      ) || 0;

                    return (
                      <div
                        key={order.id}
                        style={{
                          animationDelay: `${index * 100}ms`,
                        }}
                        className="group rounded-2xl border border-white/10 bg-black/20 hover:bg-white/[0.035] hover:border-yellow-500/20 hover:-translate-y-1 transition-all duration-300 p-4 animate-[fadeUp_.5s_ease-out_both]"
                      >

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                          {/* LEFT */}

                          <div className="flex items-start gap-4 min-w-0">

                            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              📦
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="font-semibold">
                                  Order #
                                  {order.orderId ||
                                    order.id
                                      .slice(
                                        0,
                                        8
                                      )
                                      .toUpperCase()}
                                </p>

                                <span
                                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusClass} ${
                                    statusLower ===
                                    "delivered"
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                >
                                  {statusIcon}{" "}
                                  {status}
                                </span>

                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">

                                <span>
                                  {itemCount} item
                                  {itemCount !==
                                  1
                                    ? "s"
                                    : ""}
                                </span>

                                {orderDate && (
                                  <span>
                                    {orderDate.toLocaleDateString(
                                      "en-BD",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )}
                                  </span>
                                )}

                                <span>
                                  {order.paymentMethod ||
                                    "COD"}
                                </span>

                              </div>

                            </div>
                          </div>

                          {/* RIGHT */}

                          <div className="flex items-center justify-between sm:justify-end gap-4">

                            <div className="text-left sm:text-right">

                              <p className="text-xs text-gray-500">
                                Total
                              </p>

                              <p className="font-bold text-yellow-400">
                                ৳
                                {Number(
                                  order.totalAmount ||
                                    0
                                ).toLocaleString()}
                              </p>

                            </div>

                            <button
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 hover:scale-105 active:scale-95 text-sm font-semibold transition-all duration-300"
                            >
                              👁 View
                            </button>

                          </div>

                        </div>
                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>
        </section>

        {/* =====================================
            ACCOUNT OPTIONS
        ====================================== */}

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <OptionCard
            icon="❤️"
            title="Wishlist"
            description="Your saved favorite products"
            color="pink"
            onClick={() =>
              router.push("/wishlist")
            }
          />

          <OptionCard
            icon="🛒"
            title="My Cart"
            description="View products added to cart"
            color="blue"
            onClick={() =>
              router.push("/cart")
            }
          />

          <OptionCard
            icon="👤"
            title="Personal Information"
            description="Manage your account information"
            color="purple"
            onClick={() =>
              router.push("/profile/edit")
            }
          />

          <OptionCard
            icon="📍"
            title="Delivery Address"
            description="Manage your delivery addresses"
            color="green"
            onClick={() =>
              router.push("/profile/address")
            }
          />

          <OptionCard
            icon="⚙️"
            title="Settings"
            description="Manage your account settings"
            color="gray"
            onClick={() =>
              router.push("/settings")
            }
          />

          <OptionCard
            icon="🛍️"
            title="Continue Shopping"
            description="Explore more products from Picko Shop"
            color="yellow"
            onClick={() =>
              router.push("/")
            }
          />

        </section>

        {/* =====================================
            ACCOUNT INFORMATION
        ====================================== */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 animate-[fadeUp_1s_ease-out]">

          <h2 className="text-lg font-semibold mb-5">
            Account Information
          </h2>

          <div className="space-y-4">

            <InfoRow
              label="Name"
              value={displayName}
            />

            <InfoRow
              label="Email"
              value={email}
            />

            <InfoRow
              label="Customer ID"
              value={user.uid}
            />

            <InfoRow
              label="Login Provider"
              value="Google"
              valueClass="text-yellow-400"
            />

          </div>
        </section>

        {/* =====================================
            LOGOUT
        ====================================== */}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full mt-6 h-12 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-semibold hover:bg-red-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50"
        >
          {loggingOut
            ? "Logging out..."
            : "Logout"}
        </button>

        {/* FOOTER */}

        <div className="text-center mt-8 pb-5">

          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Picko Shop
          </p>

          <p className="text-xs text-gray-700 mt-1">
            Premium shopping experience
          </p>

        </div>

      </div>

      {/* =====================================
          ORDER MODAL
      ====================================== */}

      {selectedOrder && (

        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_.25s_ease-out]"
          onClick={() =>
            setSelectedOrder(null)
          }
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-yellow-500/20 bg-[#111111] shadow-2xl animate-[modalIn_.35s_ease-out]"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 bg-[#111111]/95 backdrop-blur border-b border-white/10 p-5 flex items-center justify-between">

              <div>

                <p className="text-xs text-yellow-400 uppercase tracking-widest">
                  Order Details
                </p>

                <h2 className="text-xl font-bold mt-1">
                  #
                  {selectedOrder.orderId ||
                    selectedOrder.id
                      .slice(0, 10)
                      .toUpperCase()}
                </h2>

              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:rotate-90 transition-all duration-300 text-xl"
              >
                ×
              </button>

            </div>

            <div className="p-5 space-y-5">

              {/* STATUS */}

              <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.04] p-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs text-gray-500">
                      Order Status
                    </p>

                    <p className="font-bold text-yellow-400 mt-1">
                      {getOrderStatus(
                        selectedOrder
                      )}
                    </p>

                  </div>

                  <div className="text-3xl animate-bounce">
                    {getOrderStatus(
                      selectedOrder
                    ).toLowerCase() ===
                    "delivered"
                      ? "✅"
                      : getOrderStatus(
                            selectedOrder
                          ).toLowerCase() ===
                          "shipped"
                        ? "🚚"
                        : "⏳"}
                  </div>

                </div>

              </div>

              {/* PRODUCTS */}

              <div>

                <h3 className="font-semibold mb-3">
                  Ordered Products
                </h3>

                <div className="space-y-2">

                  {(selectedOrder.items ||
                    []).map(
                    (item, index) => (

                      <div
                        key={`${item.productId || item.id || index}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-3 hover:bg-white/[0.06] transition-all duration-300"
                      >

                        <div className="flex items-center gap-3 min-w-0">

                          {item.image ? (
                            <img
                              src={item.image}
                              alt={
                                item.name ||
                                "Product"
                              }
                              className="w-14 h-14 rounded-xl object-cover bg-white/5 hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                              🛍️
                            </div>
                          )}

                          <div className="min-w-0">

                            <p className="font-medium text-sm truncate">
                              {item.name ||
                                "Product"}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              Qty:{" "}
                              {item.quantity ||
                                1}
                            </p>

                          </div>

                        </div>

                        <p className="text-yellow-400 font-semibold text-sm whitespace-nowrap">
                          ৳
                          {(
                            Number(
                              item.price || 0
                            ) *
                            Number(
                              item.quantity ||
                                1
                            )
                          ).toLocaleString()}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </div>

              {/* DELIVERY INFORMATION */}

              <div>

                <h3 className="font-semibold mb-3">
                  Delivery Information
                </h3>

                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 space-y-3">

                  <InfoRow
                    label="Name"
                    value={
                      selectedOrder.customerName ||
                      displayName
                    }
                  />

                  <InfoRow
                    label="Phone"
                    value={
                      selectedOrder.customerPhone ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Division"
                    value={
                      selectedOrder.division ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="District"
                    value={
                      selectedOrder.district ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Upazila"
                    value={
                      selectedOrder.upazila ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Area"
                    value={
                      selectedOrder.area ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Address"
                    value={
                      selectedOrder.address ||
                      "-"
                    }
                  />

                  {selectedOrder.note && (
                    <InfoRow
                      label="Note"
                      value={
                        selectedOrder.note
                      }
                    />
                  )}

                </div>

              </div>

              {/* PAYMENT */}

              <div>

                <h3 className="font-semibold mb-3">
                  Payment Information
                </h3>

                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 space-y-3">

                  <InfoRow
                    label="Method"
                    value={
                      selectedOrder.paymentMethod ||
                      "Cash on Delivery"
                    }
                  />

                  <InfoRow
                    label="Payment Status"
                    value={
                      selectedOrder.paymentStatus ||
                      "Pending"
                    }
                  />

                  {selectedOrder.transactionId && (
                    <InfoRow
                      label="Transaction ID"
                      value={
                        selectedOrder.transactionId
                      }
                    />
                  )}

                </div>

              </div>

              {/* PRICE SUMMARY */}

              <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.03] p-4">

                <h3 className="font-semibold mb-4">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span>
                      ৳
                      {Number(
                        selectedOrder.subtotal ||
                          0
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Delivery Charge
                    </span>

                    <span>
                      ৳
                      {Number(
                        selectedOrder.deliveryCharge ||
                          0
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex justify-between">

                    <span className="font-semibold">
                      Total
                    </span>

                    <span className="text-xl font-bold text-yellow-400">
                      ৳
                      {Number(
                        selectedOrder.totalAmount ||
                          0
                      ).toLocaleString()}
                    </span>

                  </div>

                </div>

              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-full h-12 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
              >
                Done
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =====================================
          ANIMATION KEYFRAMES
      ====================================== */}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

    </main>
  );
}

/* ==========================================
   STAT CARD
========================================== */

function StatCard({
  number,
  label,
  className = "",
  numberClass = "text-white",
}: {
  number: number;
  label: string;
  className?: string;
  numberClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white/[0.03] p-4 sm:p-5 text-center hover:-translate-y-1 hover:bg-white/[0.05] transition-all duration-300 ${className}`}
    >
      <div
        className={`text-2xl sm:text-3xl font-bold ${numberClass}`}
      >
        {number}
      </div>

      <p className="text-xs sm:text-sm text-gray-500 mt-1">
        {label}
      </p>
    </div>
  );
}

/* ==========================================
   OPTION CARD
========================================== */

function OptionCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    pink:
      "hover:border-pink-500/30 hover:bg-pink-500/[0.05]",
    blue:
      "hover:border-blue-500/30 hover:bg-blue-500/[0.05]",
    purple:
      "hover:border-purple-500/30 hover:bg-purple-500/[0.05]",
    green:
      "hover:border-green-500/30 hover:bg-green-500/[0.05]",
    gray:
      "hover:border-gray-500/30 hover:bg-gray-500/[0.05]",
    yellow:
      "hover:border-yellow-500/30 hover:bg-yellow-500/[0.08]",
  };

  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colors[color]}`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
        {icon}
      </div>

      <h2 className="font-semibold text-lg">
        {title}
      </h2>

      <p className="text-gray-500 text-sm mt-1">
        {description}
      </p>
    </button>
  );
}

/* ==========================================
   INFO ROW
========================================== */

function InfoRow({
  label,
  value,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500 shrink-0">
        {label}
      </span>

      <span
        className={`text-sm text-right break-all ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}