"use client";

import { useEffect, useMemo, useState } from "react";

import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Eye,
  Hash,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  WalletCards,
  X,
  Sparkles,
  CircleDollarSign,
  Box,
  Activity,
} from "lucide-react";

import { auth, db } from "@/app/lib/firebase";

type OrderItem = {
  id?: string;
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number;
  salePrice?: number;
  image?: string;
  images?: string[];
  size?: string;
  color?: string;
};

type Order = {
  id: string;
  orderId?: string;

  userId?: string;
  userEmail?: string;

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
  updatedAt?: any;
  statusUpdatedAt?: any;

  statusHistory?: {
    status?: string;
    changedAt?: string;
    changedBy?: string;
  }[];

  salesCountApplied?: boolean;
};

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PAYMENT_STATUSES = [
  "Pending",
  "Paid",
  "Failed",
  "Refunded",
];

/* =====================================================
   HELPERS
===================================================== */

function getOrderStatus(order: Order) {
  return order.orderStatus || order.deliveryStatus || "Pending";
}

function getPaymentStatus(order: Order) {
  if (!order.paymentStatus && order.paymentMethod === "COD") {
    return "Paid";
  }

  return order.paymentStatus || "Pending";
}

function money(value: any) {
  return Number(value || 0).toLocaleString("en-BD");
}

function getDate(value: any) {
  if (!value) return "—";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString("en-BD");
    }

    return new Date(value).toLocaleString("en-BD");
  } catch {
    return "—";
  }
}

function getProductId(item: OrderItem) {
  return item.productId || item.id || "";
}

/* =====================================================
   STATUS COLORS
===================================================== */

function orderStatusClass(status: string) {
  switch (status) {
    case "Delivered":
      return "border-green-500/30 bg-green-500/10 text-green-400";

    case "Confirmed":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";

    case "Processing":
      return "border-purple-500/30 bg-purple-500/10 text-purple-400";

    case "Shipped":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-400";

    case "Cancelled":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    default:
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }
}

function paymentStatusClass(status: string) {
  switch (status) {
    case "Paid":
      return "border-green-500/30 bg-green-500/10 text-green-400";

    case "Failed":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    case "Refunded":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";

    default:
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  }
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon: Icon,
  delay,
}: {
  title: string;
  value: number;
  icon: any;
  delay: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.06]"
      style={{
        animation: `fadeUp 0.5s ease-out ${delay} both`,
      }}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl transition-all duration-500 group-hover:bg-purple-500/20" />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight">
            {value}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN
===================================================== */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [updatingOrder, setUpdatingOrder] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState("");
  const [deletingOrder, setDeletingOrder] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     REALTIME ORDERS
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        list.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredOrders = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchable = [
        order.orderId,
        order.id,
        order.customerName,
        order.customerPhone,
        order.userEmail,
        order.transactionId,
        order.paymentMethod,
        order.division,
        order.district,
        order.upazila,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchMatch =
        !queryText || searchable.includes(queryText);

      const orderMatch =
        orderFilter === "All" ||
        getOrderStatus(order) === orderFilter;

      const paymentMatch =
        paymentFilter === "All" ||
        getPaymentStatus(order) === paymentFilter;

      return searchMatch && orderMatch && paymentMatch;
    });
  }, [orders, search, orderFilter, paymentFilter]);

  /* =====================================================
     STATS
  ===================================================== */

  const stats = useMemo(() => {
    return {
      total: orders.length,

      pending: orders.filter(
        (o) => getOrderStatus(o) === "Pending"
      ).length,

      confirmed: orders.filter(
        (o) => getOrderStatus(o) === "Confirmed"
      ).length,

      delivered: orders.filter(
        (o) => getOrderStatus(o) === "Delivered"
      ).length,

      paid: orders.filter(
        (o) => getPaymentStatus(o) === "Paid"
      ).length,

      paymentPending: orders.filter(
        (o) => getPaymentStatus(o) === "Pending"
      ).length,
    };
  }, [orders]);

  /* =====================================================
     UPDATE ORDER STATUS
  ===================================================== */

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    if (!auth.currentUser) {
      alert("Admin login পাওয়া যায়নি।");
      return;
    }

    try {
      setUpdatingOrder(orderId);

      const orderRef = doc(db, "orders", orderId);

      const changedAt = new Date().toISOString();

      await runTransaction(db, async (transaction) => {
        /* -----------------------------------------------
           READ ORDER FIRST
        ------------------------------------------------ */

        const orderSnapshot =
          await transaction.get(orderRef);

        if (!orderSnapshot.exists()) {
          throw new Error("Order পাওয়া যায়নি।");
        }

        const orderData =
          orderSnapshot.data() as Order;

        const oldStatus =
          orderData.orderStatus ||
          orderData.deliveryStatus ||
          "Pending";

        const becomingDelivered =
          newStatus === "Delivered" &&
          oldStatus !== "Delivered";

        const alreadyApplied =
          orderData.salesCountApplied === true;

        const shouldApplySales =
          becomingDelivered &&
          !alreadyApplied;

        /* -----------------------------------------------
           PRODUCT QUANTITY
        ------------------------------------------------ */

        const quantities = new Map<string, number>();

        if (shouldApplySales) {
          const items = Array.isArray(orderData.items)
            ? orderData.items
            : [];

          for (const item of items) {
            const productId = getProductId(item);

            if (!productId) continue;

            const quantity = Number(
              item.quantity || 1
            );

            quantities.set(
              productId,
              (quantities.get(productId) || 0) +
                quantity
            );
          }
        }

        /* -----------------------------------------------
           READ PRODUCTS
        ------------------------------------------------ */

        const productUpdates: {
          ref: ReturnType<typeof doc>;
          soldCount: number;
        }[] = [];

        for (const [
          productId,
          quantity,
        ] of quantities) {
          const productRef = doc(
            db,
            "products",
            productId
          );

          const productSnapshot =
            await transaction.get(productRef);

          if (!productSnapshot.exists()) {
            continue;
          }

          const productData =
            productSnapshot.data();

          const currentSold = Number(
            productData.soldCount || 0
          );

          productUpdates.push({
            ref: productRef,
            soldCount:
              currentSold + quantity,
          });
        }

        /* -----------------------------------------------
           UPDATE ORDER
        ------------------------------------------------ */

        const orderUpdate: any = {
          orderStatus: newStatus,

          deliveryStatus: newStatus,

          updatedAt: serverTimestamp(),

          statusUpdatedAt:
            serverTimestamp(),

          statusHistory: arrayUnion({
            status: newStatus,
            changedAt,
            changedBy:
              auth.currentUser?.uid ||
              "admin",
          }),
        };

        if (shouldApplySales) {
          orderUpdate.salesCountApplied = true;
        }

        transaction.update(
          orderRef,
          orderUpdate
        );

        /* -----------------------------------------------
           UPDATE SOLD COUNT
        ------------------------------------------------ */

        for (const product of productUpdates) {
          transaction.update(
            product.ref,
            {
              soldCount:
                product.soldCount,

              updatedAt:
                serverTimestamp(),
            }
          );
        }
      });

      /* -----------------------------------------------
         INSTANT MODAL UPDATE
      ------------------------------------------------ */

      setSelectedOrder((previous) =>
        previous
          ? {
              ...previous,

              orderStatus: newStatus,

              deliveryStatus: newStatus,

              salesCountApplied:
                newStatus === "Delivered"
                  ? true
                  : previous.salesCountApplied,
            }
          : null
      );
    } catch (error) {
      console.error(error);

      alert(
        "Order status update করা যায়নি। Firebase Rules বা Admin permission check করো।"
      );
    } finally {
      setUpdatingOrder("");
    }
  };

  /* =====================================================
     PAYMENT STATUS
  ===================================================== */

  const updatePaymentStatus = async (
    orderId: string,
    status: string
  ) => {
    if (!auth.currentUser) {
      alert("Admin login পাওয়া যায়নি।");
      return;
    }

    try {
      setUpdatingPayment(orderId);

      await updateDoc(
        doc(db, "orders", orderId),
        {
          paymentStatus: status,

          paymentStatusUpdatedAt:
            serverTimestamp(),

          paymentStatusUpdatedBy:
            auth.currentUser.uid,

          updatedAt:
            serverTimestamp(),
        }
      );

      setSelectedOrder((previous) =>
        previous
          ? {
              ...previous,
              paymentStatus: status,
            }
          : null
      );
    } catch (error) {
      console.error(error);

      alert(
        "Payment status update করা যায়নি।"
      );
    } finally {
      setUpdatingPayment("");
    }
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const deleteOrder = async (
    orderId: string
  ) => {
    const confirmed = window.confirm(
      "এই order permanently delete করতে চান?"
    );

    if (!confirmed) return;

    try {
      setDeletingOrder(orderId);

      await deleteDoc(
        doc(db, "orders", orderId)
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error(error);

      alert("Order delete করা যায়নি।");
    } finally {
      setDeletingOrder("");
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
            <Loader2
              size={30}
              className="animate-spin text-purple-400"
            />
          </div>

          <p className="mt-4 text-sm font-bold text-gray-400">
            Orders loading...
          </p>

          <p className="mt-1 text-xs text-gray-600">
            Connecting to realtime database
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* BACKGROUND LIGHT */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-purple-600/10 blur-[100px] animate-pulse" />

        <div
          className="absolute right-0 top-[40%] h-80 w-80 rounded-full bg-blue-600/5 blur-[120px]"
          style={{
            animation:
              "floatBlob 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* HEADER */}

      <div
        className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center"
        style={{
          animation: "fadeUp 0.45s ease-out both",
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2 text-purple-400">
              <ShoppingBag size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Orders
              </h1>

              <p className="text-xs text-gray-500">
                Manage orders & payments
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="group flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-bold text-gray-400 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "animate-spin"
                : "transition-transform duration-500 group-hover:rotate-180"
            }
          />

          Refresh
        </button>
      </div>

      {/* LIVE INDICATOR */}

      <div
        className="mb-5 flex w-fit items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1.5 text-[10px] font-bold text-green-400"
        style={{
          animation: "fadeIn 0.7s ease-out both",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>

        LIVE ORDERS
      </div>

      {/* STATS */}

      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Orders"
          value={stats.total}
          icon={ShoppingBag}
          delay="0s"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock3}
          delay="0.05s"
        />

        <StatCard
          title="Confirmed"
          value={stats.confirmed}
          icon={CheckCircle2}
          delay="0.1s"
        />

        <StatCard
          title="Delivered"
          value={stats.delivered}
          icon={Truck}
          delay="0.15s"
        />

        <StatCard
          title="Paid"
          value={stats.paid}
          icon={CircleDollarSign}
          delay="0.2s"
        />

        <StatCard
          title="Payment Pending"
          value={stats.paymentPending}
          icon={WalletCards}
          delay="0.25s"
        />
      </div>

      {/* SEARCH */}

      <div
        className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl backdrop-blur-xl"
        style={{
          animation: "fadeUp 0.6s ease-out both",
        }}
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_210px_210px]">
          {/* SEARCH INPUT */}

          <div className="group relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-purple-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search #PS1001, customer, phone, transaction..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-700 focus:border-purple-500/40 focus:bg-purple-500/[0.03] focus:ring-2 focus:ring-purple-500/10"
            />
          </div>

          {/* ORDER FILTER */}

          <div className="relative">
            <select
              value={orderFilter}
              onChange={(e) =>
                setOrderFilter(e.target.value)
              }
              className="w-full appearance-none rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-purple-500/40"
            >
              <option value="All">
                All Order Status
              </option>

              {ORDER_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>

          {/* PAYMENT FILTER */}

          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value)
              }
              className="w-full appearance-none rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-purple-500/40"
            >
              <option value="All">
                All Payment Status
              </option>

              {PAYMENT_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}

      <div
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-2xl backdrop-blur-xl"
        style={{
          animation: "fadeUp 0.7s ease-out both",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.025]">
                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Order
                </th>

                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Customer
                </th>

                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Amount
                </th>

                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Payment
                </th>

                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Order Status
                </th>

                <th className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Date
                </th>

                <th className="px-4 py-4 text-right text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                      <Package
                        size={30}
                        className="text-gray-700"
                      />
                    </div>

                    <p className="mt-4 text-sm font-bold text-gray-400">
                      No orders found
                    </p>

                    <p className="mt-1 text-xs text-gray-700">
                      Try changing your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(
                  (order, index) => {
                    const displayId =
                      order.orderId ||
                      `#${order.id}`;

                    const paymentStatus =
                      getPaymentStatus(order);

                    const orderStatus =
                      getOrderStatus(order);

                    return (
                      <tr
                        key={order.id}
                        className="group border-b border-white/5 transition-all duration-300 hover:bg-purple-500/[0.025]"
                        style={{
                          animation: `fadeUp 0.4s ease-out ${
                            index * 0.025
                          }s both`,
                        }}
                      >
                        {/* ORDER */}

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2 text-purple-400 transition-all duration-300 group-hover:scale-110">
                              <Hash size={14} />
                            </div>

                            <div>
                              <p className="font-mono text-sm font-black text-purple-400">
                                {displayId}
                              </p>

                              <p className="mt-1 text-[10px] text-gray-600">
                                {order.items?.length || 0}{" "}
                                item(s)
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CUSTOMER */}

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold">
                            {order.customerName ||
                              "Unknown"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {order.customerPhone ||
                              "—"}
                          </p>
                        </td>

                        {/* AMOUNT */}

                        <td className="px-4 py-4">
                          <p className="font-black text-purple-400">
                            ৳{money(order.totalAmount)}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-600">
                            {order.paymentMethod ||
                              "—"}
                          </p>
                        </td>

                        {/* PAYMENT */}

                        <td className="px-4 py-4">
                          <select
                            value={paymentStatus}
                            disabled={
                              updatingPayment ===
                              order.id
                            }
                            onChange={(e) =>
                              updatePaymentStatus(
                                order.id,
                                e.target.value
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-bold outline-none transition-all duration-300 focus:ring-2 focus:ring-purple-500/10 ${paymentStatusClass(
                              paymentStatus
                            )}`}
                          >
                            {PAYMENT_STATUSES.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-[#111] text-white"
                                >
                                  {status}
                                </option>
                              )
                            )}
                          </select>

                          {updatingPayment ===
                            order.id && (
                            <Loader2
                              size={12}
                              className="mt-2 animate-spin text-purple-400"
                            />
                          )}

                          {order.transactionId && (
                            <p className="mt-2 max-w-[130px] truncate font-mono text-[9px] text-gray-600">
                              TXN:{" "}
                              {order.transactionId}
                            </p>
                          )}
                        </td>

                        {/* ORDER STATUS */}

                        <td className="px-4 py-4">
                          <select
                            value={orderStatus}
                            disabled={
                              updatingOrder ===
                              order.id
                            }
                            onChange={(e) =>
                              updateOrderStatus(
                                order.id,
                                e.target.value
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-bold outline-none transition-all duration-300 focus:ring-2 focus:ring-purple-500/10 ${orderStatusClass(
                              orderStatus
                            )}`}
                          >
                            {ORDER_STATUSES.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                  className="bg-[#111] text-white"
                                >
                                  {status}
                                </option>
                              )
                            )}
                          </select>

                          {updatingOrder ===
                            order.id && (
                            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-purple-400">
                              <Loader2
                                size={11}
                                className="animate-spin"
                              />
                              Updating...
                            </div>
                          )}
                        </td>

                        {/* DATE */}

                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-400">
                            {getDate(
                              order.createdAt
                            )}
                          </p>
                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="rounded-lg border border-white/10 bg-white/[0.02] p-2 text-gray-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400"
                              title="View order"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() =>
                                deleteOrder(
                                  order.id
                                )
                              }
                              disabled={
                                deletingOrder ===
                                order.id
                              }
                              className="rounded-lg border border-red-500/10 bg-red-500/[0.02] p-2 text-red-400 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500/10"
                              title="Delete order"
                            >
                              {deletingOrder ===
                              order.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESULT COUNT */}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Showing{" "}
          <span className="font-bold text-gray-400">
            {filteredOrders.length}
          </span>{" "}
          of{" "}
          <span className="font-bold text-gray-400">
            {orders.length}
          </span>{" "}
          orders
        </p>

        <div className="hidden items-center gap-2 text-[10px] text-gray-600 sm:flex">
          <Activity size={12} />
          Realtime database
        </div>
      </div>

      {/* =====================================================
         DETAILS MODAL
      ===================================================== */}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          style={{
            animation: "fadeIn 0.2s ease-out both",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
            style={{
              animation:
                "modalIn 0.3s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={14}
                    className="text-purple-400"
                  />

                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
                    Order Details
                  </p>
                </div>

                <h2 className="mt-1 font-mono text-xl font-black text-purple-400">
                  {selectedOrder.orderId ||
                    `#${selectedOrder.id}`}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="rounded-xl border border-white/10 bg-white/[0.02] p-2 text-gray-400 transition-all duration-300 hover:rotate-90 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-75px)] overflow-y-auto p-5">
              {/* STATUS */}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-purple-500/20">
                  <div className="mb-3 flex items-center gap-2">
                    <Truck
                      size={15}
                      className="text-purple-400"
                    />

                    <p className="text-xs font-bold text-gray-500">
                      Order Status
                    </p>
                  </div>

                  <select
                    value={getOrderStatus(
                      selectedOrder
                    )}
                    disabled={
                      updatingOrder ===
                      selectedOrder.id
                    }
                    onChange={(e) =>
                      updateOrderStatus(
                        selectedOrder.id,
                        e.target.value
                      )
                    }
                    className={`w-full rounded-xl border bg-[#111] px-4 py-3 text-sm font-bold outline-none transition-all ${orderStatusClass(
                      getOrderStatus(
                        selectedOrder
                      )
                    )}`}
                  >
                    {ORDER_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                          className="bg-[#111] text-white"
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>

                  {updatingOrder ===
                    selectedOrder.id && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-400">
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />
                      Updating order...
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-green-500/20">
                  <div className="mb-3 flex items-center gap-2">
                    <CreditCard
                      size={15}
                      className="text-green-400"
                    />

                    <p className="text-xs font-bold text-gray-500">
                      Payment Status
                    </p>
                  </div>

                  <select
                    value={getPaymentStatus(
                      selectedOrder
                    )}
                    disabled={
                      updatingPayment ===
                      selectedOrder.id
                    }
                    onChange={(e) =>
                      updatePaymentStatus(
                        selectedOrder.id,
                        e.target.value
                      )
                    }
                    className={`w-full rounded-xl border bg-[#111] px-4 py-3 text-sm font-bold outline-none transition-all ${paymentStatusClass(
                      getPaymentStatus(
                        selectedOrder
                      )
                    )}`}
                  >
                    {PAYMENT_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                          className="bg-[#111] text-white"
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>

                  {updatingPayment ===
                    selectedOrder.id && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-green-400">
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />
                      Updating payment...
                    </div>
                  )}
                </div>
              </div>

              {/* CUSTOMER */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-purple-500/20">
                <div className="mb-4 flex items-center gap-2">
                  <User
                    size={17}
                    className="text-purple-400"
                  />

                  <p className="font-black">
                    Customer Information
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-gray-600">
                      Name
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {selectedOrder.customerName ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-600">
                      Phone
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-bold">
                      <Phone
                        size={14}
                        className="text-gray-600"
                      />

                      {selectedOrder.customerPhone ||
                        "—"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-gray-600">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm text-gray-400">
                      {selectedOrder.userEmail ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* DELIVERY */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-red-500/20">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin
                    size={17}
                    className="text-red-400"
                  />

                  <p className="font-black">
                    Delivery Information
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-gray-600">
                      Division
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {selectedOrder.division ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-600">
                      District
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {selectedOrder.district ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-600">
                      Upazila
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {selectedOrder.upazila ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-600">
                      Area
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {selectedOrder.area ||
                        "—"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-gray-600">
                      Address
                    </p>

                    <p className="mt-1 rounded-xl border border-white/5 bg-black/20 p-3 text-sm text-gray-300">
                      {selectedOrder.address?.trim()
                        ? selectedOrder.address
                        : "Address দেওয়া হয়নি"}
                    </p>
                  </div>

                  {selectedOrder.note && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-gray-600">
                        Note
                      </p>

                      <p className="mt-1 rounded-xl border border-white/5 bg-black/20 p-3 text-sm text-gray-300">
                        {selectedOrder.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PAYMENT */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-yellow-500/20">
                <div className="mb-4 flex items-center gap-2">
                  <WalletCards
                    size={17}
                    className="text-yellow-400"
                  />

                  <p className="font-black">
                    Payment Information
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-gray-600">
                      Method
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {selectedOrder.paymentMethod ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-600">
                      Status
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-lg border px-3 py-1.5 text-xs font-bold ${paymentStatusClass(
                        getPaymentStatus(
                          selectedOrder
                        )
                      )}`}
                    >
                      {getPaymentStatus(
                        selectedOrder
                      )}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-gray-600">
                      Transaction ID
                    </p>

                    <p className="mt-1 break-all rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-sm text-yellow-400">
                      {selectedOrder.transactionId ||
                        "COD — No Transaction ID"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ITEMS */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:border-purple-500/20">
                <div className="mb-4 flex items-center gap-2">
                  <Box
                    size={17}
                    className="text-purple-400"
                  />

                  <p className="font-black">
                    Ordered Products
                  </p>
                </div>

                <div className="space-y-3">
                  {(selectedOrder.items || []).map(
                    (item, index) => {
                      const price = Number(
                        item.salePrice ??
                          item.price ??
                          0
                      );

                      const quantity = Number(
                        item.quantity || 1
                      );

                      return (
                        <div
                          key={`${item.productId || item.id || "item"}-${index}`}
                          className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/20 hover:bg-purple-500/[0.025]"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white transition-all duration-300 group-hover:scale-105">
                            {item.image ||
                            item.images?.[0] ? (
                              <img
                                src={
                                  item.image ||
                                  item.images?.[0]
                                }
                                alt={
                                  item.name ||
                                  "Product"
                                }
                                className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package
                                  size={18}
                                  className="text-gray-500"
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-bold">
                              {item.name ||
                                "Product"}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                              <span>
                                Qty: {quantity}
                              </span>

                              {item.size && (
                                <span>
                                  Size: {item.size}
                                </span>
                              )}

                              {item.color && (
                                <span>
                                  Color: {item.color}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-black text-purple-400">
                            ৳
                            {money(
                              price * quantity
                            )}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* TOTAL */}

              <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>

                    <span>
                      ৳
                      {money(
                        selectedOrder.subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>

                    <span>
                      ৳
                      {money(
                        selectedOrder.deliveryCharge
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-white/10 pt-4">
                    <span className="font-black">
                      Total
                    </span>

                    <span className="text-xl font-black text-purple-400">
                      ৳
                      {money(
                        selectedOrder.totalAmount
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* CREATED */}

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                <CalendarDays size={14} />

                {getDate(
                  selectedOrder.createdAt
                )}
              </div>

              {/* DELIVERED INFO */}

              {getOrderStatus(
                selectedOrder
              ) === "Delivered" && (
                <div
                  className="mt-4 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/[0.05] p-3 text-xs text-green-400"
                  style={{
                    animation:
                      "fadeUp 0.4s ease-out both",
                  }}
                >
                  <div className="rounded-full bg-green-500/10 p-1.5">
                    <CheckCircle2 size={15} />
                  </div>

                  <div>
                    <p className="font-bold">
                      Order Delivered
                    </p>

                    <p className="mt-0.5 text-[10px] text-green-400/60">
                      Product sold count update করা হয়েছে।
                    </p>
                  </div>
                </div>
              )}

              {/* DELETE */}

              <button
                onClick={() =>
                  deleteOrder(
                    selectedOrder.id
                  )
                }
                disabled={
                  deletingOrder ===
                  selectedOrder.id
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-sm font-bold text-red-400 transition-all duration-300 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/5"
              >
                {deletingOrder ===
                selectedOrder.id ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={17} />
                )}

                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
         ANIMATIONS
      ===================================================== */}

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
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floatBlob {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-20px, 25px, 0);
          }
        }

        ::selection {
          background: rgba(168, 85, 247, 0.25);
          color: white;
        }

        ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.35);
        }
      `}</style>
    </div>
  );
}