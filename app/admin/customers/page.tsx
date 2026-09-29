"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

type Customer = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role?: string;
  createdAt?: any;
};

type OrderItem = {
  name?: string;
  title?: string;
  quantity?: number;
  price?: number;
  image?: string;
};

type Order = {
  id: string;
  userId?: string;
  userEmail?: string;

  customerName?: string;
  customerPhone?: string;

  paymentMethod?: string;
  paymentNumber?: string;
  transactionId?: string;
  paymentStatus?: string;

  orderStatus?: string;
  deliveryStatus?: string;

  subtotal?: number;
  deliveryCharge?: number;
  totalAmount?: number;

  division?: string;
  district?: string;
  upazila?: string;
  area?: string;
  address?: string;
  note?: string;

  items?: OrderItem[];

  createdAt?: any;
  updatedAt?: any;
};

const getTime = (value: any) => {
  try {
    if (!value) return 0;

    if (typeof value?.toMillis === "function") {
      return value.toMillis();
    }

    if (typeof value?.seconds === "number") {
      return value.seconds * 1000;
    }

    const time = new Date(value).getTime();

    return Number.isNaN(time) ? 0 : time;
  } catch {
    return 0;
  }
};

const money = (value: any) => {
  const number = Number(value || 0);

  return `৳${number.toLocaleString("en-BD")}`;
};

const normalize = (value: any) => {
  return String(value || "")
    .toLowerCase()
    .trim();
};

const getStatus = (order: Order) => {
  return (
    order.deliveryStatus ||
    order.orderStatus ||
    "Pending"
  );
};

const getPaymentMethod = (order: Order) => {
  return order.paymentMethod || "COD";
};

const getPaymentIcon = (method: string) => {
  const value = method.toLowerCase();

  if (value.includes("bkash")) return "💗";
  if (value.includes("nagad")) return "🟠";
  if (value.includes("rocket")) return "🟣";
  if (value.includes("upay")) return "🟢";
  if (value.includes("cod")) return "💵";

  return "💳";
};

export default function CustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [search, setSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [ordersLoading, setOrdersLoading] =
    useState(true);

  useEffect(() => {
    let unsubscribeCustomers: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        try {
          const adminSnap = await getDoc(
            doc(db, "admins", user.uid)
          );

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

          /* =========================
             CUSTOMERS REALTIME
          ========================== */

          unsubscribeCustomers = onSnapshot(
            collection(db, "users"),
            (snapshot) => {
              const list: Customer[] =
                snapshot.docs.map((item) => ({
                  id: item.id,
                  ...item.data(),
                }));

              list.sort(
                (a, b) =>
                  getTime(b.createdAt) -
                  getTime(a.createdAt)
              );

              setCustomers(list);
              setLoading(false);
            },
            (error) => {
              console.error(
                "Customers error:",
                error
              );

              setLoading(false);
            }
          );

          /* =========================
             ORDERS REALTIME
          ========================== */

          unsubscribeOrders = onSnapshot(
            collection(db, "orders"),
            (snapshot) => {
              const list: Order[] =
                snapshot.docs.map((item) => ({
                  id: item.id,
                  ...item.data(),
                }));

              list.sort(
                (a, b) =>
                  getTime(b.createdAt) -
                  getTime(a.createdAt)
              );

              setOrders(list);
              setOrdersLoading(false);
            },
            (error) => {
              console.error(
                "Orders error:",
                error
              );

              setOrdersLoading(false);
            }
          );
        } catch (error) {
          console.error(error);
          router.replace("/");
        }
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeCustomers) {
        unsubscribeCustomers();
      }

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, [router]);

  /* =========================
     DATE FORMAT
  ========================== */

  const formatDate = (createdAt: any) => {
    try {
      if (!createdAt) return "—";

      const date = createdAt?.toDate
        ? createdAt.toDate()
        : new Date(createdAt);

      if (isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleDateString("en-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (createdAt: any) => {
    try {
      if (!createdAt) return "—";

      const date = createdAt?.toDate
        ? createdAt.toDate()
        : new Date(createdAt);

      if (isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleString("en-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  /* =========================
     CUSTOMER ORDERS
  ========================== */

  const getCustomerOrders = (
    customer: Customer
  ) => {
    return orders.filter((order) => {
      const sameUser =
        !!customer.id &&
        order.userId === customer.id;

      const sameEmail =
        !!customer.email &&
        normalize(order.userEmail) ===
          normalize(customer.email);

      const samePhone =
        !!customer.phone &&
        normalize(order.customerPhone) ===
          normalize(customer.phone);

      return (
        sameUser ||
        sameEmail ||
        samePhone
      );
    });
  };

  /* =========================
     CUSTOMER SEARCH
  ========================== */

  const filteredCustomers = useMemo(() => {
    const text = normalize(search);

    if (!text) {
      return customers;
    }

    return customers.filter((customer) => {
      const customerOrders =
        getCustomerOrders(customer);

      const customerFields = [
        customer.name,
        customer.email,
        customer.phone,
        customer.id,
      ];

      const customerMatched =
        customerFields.some((field) =>
          normalize(field).includes(text)
        );

      const orderMatched =
        customerOrders.some((order) => {
          const orderFields = [
            order.id,
            order.customerName,
            order.customerPhone,
            order.userEmail,
            order.paymentMethod,
            order.transactionId,
            order.paymentNumber,
          ];

          return orderFields.some((field) =>
            normalize(field).includes(text)
          );
        });

      return (
        customerMatched ||
        orderMatched
      );
    });
  }, [customers, orders, search]);

  /* =========================
     GLOBAL STATS
  ========================== */

  const totalCustomers = customers.length;

  const googleCustomers = customers.filter(
    (customer) => !!customer.email
  ).length;

  const mobileCustomers = customers.filter(
    (customer) => !!customer.phone
  ).length;

  const totalCustomerOrders =
    orders.length;

  const totalOnlinePayments =
    orders.filter((order) => {
      const method = normalize(
        order.paymentMethod
      );

      return (
        method.includes("bkash") ||
        method.includes("nagad") ||
        method.includes("rocket") ||
        method.includes("upay")
      );
    }).length;

  const deliveredOrders = orders.filter(
    (order) =>
      normalize(getStatus(order)) ===
      "delivered"
  ).length;

  /* =========================
     CUSTOMER SUMMARY
  ========================== */

  const getCustomerSummary = (
    customer: Customer
  ) => {
    const customerOrders =
      getCustomerOrders(customer);

    const totalSpent =
      customerOrders.reduce(
        (sum, order) =>
          sum + Number(order.totalAmount || 0),
        0
      );

    const delivered =
      customerOrders.filter(
        (order) =>
          normalize(getStatus(order)) ===
          "delivered"
      ).length;

    const pending =
      customerOrders.filter((order) => {
        const status = normalize(
          getStatus(order)
        );

        return (
          status === "pending" ||
          status === "processing" ||
          status === "confirmed"
        );
      }).length;

    const cancelled =
      customerOrders.filter((order) => {
        const status = normalize(
          getStatus(order)
        );

        return (
          status === "cancelled" ||
          status === "canceled" ||
          status === "rejected"
        );
      }).length;

    return {
      orders: customerOrders,
      totalSpent,
      delivered,
      pending,
      cancelled,
    };
  };

  /* =========================
     CUSTOMER LEVEL
  ========================== */

  const getCustomerLevel = (
    totalSpent: number
  ) => {
    if (totalSpent >= 50000) {
      return {
        label: "VIP",
        icon: "👑",
      };
    }

    if (totalSpent >= 20000) {
      return {
        label: "Gold",
        icon: "⭐",
      };
    }

    if (totalSpent >= 10000) {
      return {
        label: "Regular+",
        icon: "💎",
      };
    }

    return {
      label: "Customer",
      icon: "👤",
    };
  };

  /* =========================
     LOADING
  ========================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-yellow-400 text-sm">
            Loading Customers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* =========================
          TOP BAR
      ========================== */}

      <header className="h-24 bg-[#0d0d0d] border-b border-white/10 flex items-center justify-between px-5 md:px-10">

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              router.push("/admin")
            }
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            ←
          </button>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Picko Shop Admin
            </p>

            <h1 className="text-2xl font-bold mt-1">
              Customer Center
            </h1>
          </div>

        </div>

        <div className="flex items-center gap-4">

          <div className="hidden md:flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live Data
          </div>

          <img
            src="/picko-logo.png"
            alt="Picko"
            className="w-28 object-contain"
          />

        </div>

      </header>

      <main className="p-5 md:p-10">

        {/* =========================
            STATS
        ========================== */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

          <div className="bg-[#111] border border-white/10 rounded-2xl p-5">

            <p className="text-gray-500 text-xs uppercase">
              Customers
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {totalCustomers}
            </h2>

          </div>

          <div className="bg-[#111] border border-green-500/20 rounded-2xl p-5">

            <p className="text-gray-500 text-xs uppercase">
              Google
            </p>

            <h2 className="text-3xl font-bold text-green-400 mt-2">
              {googleCustomers}
            </h2>

          </div>

          <div className="bg-[#111] border border-yellow-500/20 rounded-2xl p-5">

            <p className="text-gray-500 text-xs uppercase">
              Mobile
            </p>

            <h2 className="text-3xl font-bold text-yellow-400 mt-2">
              {mobileCustomers}
            </h2>

          </div>

          <div className="bg-[#111] border border-blue-500/20 rounded-2xl p-5">

            <p className="text-gray-500 text-xs uppercase">
              Orders
            </p>

            <h2 className="text-3xl font-bold text-blue-400 mt-2">
              {totalCustomerOrders}
            </h2>

          </div>

          <div className="bg-[#111] border border-purple-500/20 rounded-2xl p-5">

            <p className="text-gray-500 text-xs uppercase">
              Online Payments
            </p>

            <h2 className="text-3xl font-bold text-purple-400 mt-2">
              {totalOnlinePayments}
            </h2>

          </div>

        </div>

        {/* =========================
            SEARCH
        ========================== */}

        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-6">

          <div className="flex flex-col md:flex-row gap-4">

            <div className="relative flex-1">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                🔎
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search Name, Mobile, Email, Order ID or Transaction ID..."
                className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-yellow-500/60"
              />

            </div>

            {search && (
              <button
                onClick={() => setSearch("")}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                Clear Search
              </button>
            )}

          </div>

          <div className="flex flex-wrap gap-2 mt-4">

            <span className="text-xs text-gray-500">
              Search supports:
            </span>

            <span className="text-xs bg-pink-500/10 text-pink-300 px-2 py-1 rounded-lg">
              bKash TXN
            </span>

            <span className="text-xs bg-orange-500/10 text-orange-300 px-2 py-1 rounded-lg">
              Nagad TXN
            </span>

            <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded-lg">
              Rocket TXN
            </span>

            <span className="text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded-lg">
              Upay TXN
            </span>

            <span className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded-lg">
              Order ID
            </span>

          </div>

        </div>

        {/* =========================
            RESULT HEADER
        ========================== */}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">

          <div>

            <h2 className="text-xl font-bold">
              All Customers
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredCustomers.length} customer
              {filteredCustomers.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>

          </div>

          <div className="text-xs text-gray-500">
            {ordersLoading
              ? "Loading orders..."
              : `${deliveredOrders} delivered orders`}
          </div>

        </div>

        {/* =========================
            CUSTOMER TABLE
        ========================== */}

        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">

          {filteredCustomers.length === 0 ? (

            <div className="py-24 text-center">

              <div className="text-5xl mb-4">
                👥
              </div>

              <h3 className="text-xl font-semibold">
                {search
                  ? "No Matching Customer"
                  : "No Customers Found"}
              </h3>

              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                {search
                  ? "Try searching with customer name, mobile, Order ID or payment Transaction ID."
                  : "Registered customers will appear here."}
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead className="bg-white/[0.03]">

                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">

                    <th className="px-5 py-4">
                      Customer
                    </th>

                    <th className="px-5 py-4">
                      Contact
                    </th>

                    <th className="px-5 py-4">
                      Orders
                    </th>

                    <th className="px-5 py-4">
                      Spending
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Joined
                    </th>

                    <th className="px-5 py-4">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredCustomers.map(
                    (customer) => {

                      const summary =
                        getCustomerSummary(
                          customer
                        );

                      const level =
                        getCustomerLevel(
                          summary.totalSpent
                        );

                      return (
                        <tr
                          key={customer.id}
                          className="border-t border-white/5 hover:bg-white/[0.025] transition"
                        >

                          {/* CUSTOMER */}

                          <td className="px-5 py-5">

                            <div className="flex items-center gap-3">

                              {customer.photoURL ? (

                                <img
                                  src={
                                    customer.photoURL
                                  }
                                  alt=""
                                  className="w-12 h-12 rounded-full object-cover border border-white/10"
                                />

                              ) : (

                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 text-black flex items-center justify-center font-bold text-lg">
                                  {(
                                    customer.name ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                              )}

                              <div>

                                <div className="flex items-center gap-2">

                                  <p className="font-semibold">
                                    {customer.name ||
                                      "Unknown User"}
                                  </p>

                                  {summary.totalSpent >=
                                    20000 && (
                                    <span className="text-xs">
                                      {level.icon}
                                    </span>
                                  )}

                                </div>

                                <p className="text-xs text-gray-600 mt-1">
                                  ID:{" "}
                                  {customer.id.slice(
                                    0,
                                    12
                                  )}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* CONTACT */}

                          <td className="px-5 py-5">

                            <p className="text-sm">
                              {customer.phone ||
                                "No mobile"}
                            </p>

                            <p className="text-xs text-gray-500 mt-1 break-all max-w-[220px]">
                              {customer.email ||
                                "No email"}
                            </p>

                          </td>

                          {/* ORDERS */}

                          <td className="px-5 py-5">

                            <p className="font-bold">
                              {summary.orders.length}
                            </p>

                            <div className="flex gap-2 mt-2 text-[11px]">

                              <span className="text-green-400">
                                ✓{" "}
                                {summary.delivered}
                              </span>

                              <span className="text-yellow-400">
                                ⏳{" "}
                                {summary.pending}
                              </span>

                              <span className="text-red-400">
                                ✕{" "}
                                {summary.cancelled}
                              </span>

                            </div>

                          </td>

                          {/* SPENDING */}

                          <td className="px-5 py-5">

                            <p className="font-bold text-yellow-400">
                              {money(
                                summary.totalSpent
                              )}
                            </p>

                            <p className="text-[11px] text-gray-500 mt-1">
                              {level.label}
                            </p>

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-5">

                            {summary.orders.length >
                            0 ? (

                              <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400">
                                ● Active Buyer
                              </span>

                            ) : (

                              <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 text-gray-400">
                                ● Registered
                              </span>

                            )}

                          </td>

                          {/* JOINED */}

                          <td className="px-5 py-5">

                            <p className="text-sm text-gray-400">
                              {formatDate(
                                customer.createdAt
                              )}
                            </p>

                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-5">

                            <button
                              onClick={() =>
                                setSelectedCustomer(
                                  customer
                                )
                              }
                              className="px-4 py-2 rounded-lg bg-yellow-500 text-black text-xs font-bold hover:bg-yellow-400 transition"
                            >
                              View Customer
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </main>

      {/* =====================================================
          CUSTOMER DETAILS MODAL
      ====================================================== */}

      {selectedCustomer && (() => {

        const summary =
          getCustomerSummary(
            selectedCustomer
          );

        const level =
          getCustomerLevel(
            summary.totalSpent
          );

        return (
          <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              setSelectedCustomer(null)
            }
          >

            <div
              className="w-full max-w-5xl max-h-[92vh] bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* MODAL HEADER */}

              <div className="p-5 md:p-7 border-b border-white/10 flex items-center justify-between">

                <div>

                  <p className="text-xs text-gray-500 uppercase tracking-widest">
                    Customer Management
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    Customer Details
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setSelectedCustomer(
                      null
                    )
                  }
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  ✕
                </button>

              </div>

              <div className="p-5 md:p-7 overflow-y-auto max-h-[calc(92vh-100px)]">

                {/* PROFILE TOP */}

                <div className="bg-black border border-white/10 rounded-2xl p-5 md:p-6 mb-6">

                  <div className="flex flex-col md:flex-row md:items-center gap-5">

                    {selectedCustomer.photoURL ? (

                      <img
                        src={
                          selectedCustomer.photoURL
                        }
                        alt=""
                        className="w-24 h-24 rounded-full object-cover border-2 border-yellow-500 mx-auto md:mx-0"
                      />

                    ) : (

                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 text-black flex items-center justify-center text-4xl font-bold mx-auto md:mx-0">
                        {(
                          selectedCustomer.name ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                    )}

                    <div className="flex-1 text-center md:text-left">

                      <div className="flex flex-col md:flex-row md:items-center gap-2">

                        <h3 className="text-2xl font-bold">
                          {selectedCustomer.name ||
                            "Unknown User"}
                        </h3>

                        <span className="text-xs bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                          {level.icon}{" "}
                          {level.label}
                        </span>

                      </div>

                      <p className="text-sm text-gray-500 mt-2">
                        Customer ID:{" "}
                        {selectedCustomer.id}
                      </p>

                    </div>

                  </div>

                </div>

                {/* SUMMARY CARDS */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

                  <div className="bg-black border border-white/10 rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Total Orders
                    </p>

                    <p className="text-2xl font-bold mt-2">
                      {summary.orders.length}
                    </p>

                  </div>

                  <div className="bg-black border border-green-500/20 rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Delivered
                    </p>

                    <p className="text-2xl font-bold text-green-400 mt-2">
                      {summary.delivered}
                    </p>

                  </div>

                  <div className="bg-black border border-yellow-500/20 rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Pending
                    </p>

                    <p className="text-2xl font-bold text-yellow-400 mt-2">
                      {summary.pending}
                    </p>

                  </div>

                  <div className="bg-black border border-blue-500/20 rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Total Spent
                    </p>

                    <p className="text-xl font-bold text-blue-400 mt-2">
                      {money(
                        summary.totalSpent
                      )}
                    </p>

                  </div>

                </div>

                {/* CUSTOMER INFO */}

                <div className="mb-8">

                  <h3 className="text-lg font-bold mb-4">
                    👤 Customer Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="bg-black rounded-xl p-4 border border-white/5">

                      <p className="text-xs text-gray-500">
                        Email
                      </p>

                      <p className="mt-1 break-all">
                        {selectedCustomer.email ||
                          "Not provided"}
                      </p>

                    </div>

                    <div className="bg-black rounded-xl p-4 border border-white/5">

                      <p className="text-xs text-gray-500">
                        Mobile
                      </p>

                      <p className="mt-1">
                        {selectedCustomer.phone ||
                          "Not provided"}
                      </p>

                    </div>

                    <div className="bg-black rounded-xl p-4 border border-white/5">

                      <p className="text-xs text-gray-500">
                        Customer ID
                      </p>

                      <p className="mt-1 text-xs text-gray-400 break-all">
                        {selectedCustomer.id}
                      </p>

                    </div>

                    <div className="bg-black rounded-xl p-4 border border-white/5">

                      <p className="text-xs text-gray-500">
                        Joined
                      </p>

                      <p className="mt-1">
                        {formatDate(
                          selectedCustomer.createdAt
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                {/* ORDER HISTORY */}

                <div>

                  <div className="flex items-center justify-between mb-4">

                    <h3 className="text-lg font-bold">
                      📦 Order History
                    </h3>

                    <span className="text-xs text-gray-500">
                      {summary.orders.length} orders
                    </span>

                  </div>

                  {summary.orders.length ===
                  0 ? (

                    <div className="bg-black border border-white/10 rounded-xl p-10 text-center">

                      <div className="text-4xl mb-3">
                        🛍️
                      </div>

                      <p className="text-gray-400">
                        No orders found for this
                        customer.
                      </p>

                    </div>

                  ) : (

                    <div className="space-y-3">

                      {summary.orders.map(
                        (order) => {

                          const status =
                            getStatus(order);

                          return (
                            <div
                              key={order.id}
                              className="bg-black border border-white/10 rounded-xl p-4 hover:border-yellow-500/30 transition"
                            >

                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                                <div>

                                  <div className="flex flex-wrap items-center gap-2">

                                    <p className="font-semibold">
                                      Order #
                                      {order.id.slice(
                                        0,
                                        12
                                      )}
                                    </p>

                                    <span
                                      className={`text-[11px] px-2.5 py-1 rounded-full ${
                                        normalize(
                                          status
                                        ) ===
                                        "delivered"
                                          ? "bg-green-500/10 text-green-400"
                                          : normalize(
                                              status
                                            ) ===
                                            "cancelled"
                                          ? "bg-red-500/10 text-red-400"
                                          : "bg-yellow-500/10 text-yellow-400"
                                      }`}
                                    >
                                      {status}
                                    </span>

                                  </div>

                                  <p className="text-xs text-gray-500 mt-2">
                                    {formatDateTime(
                                      order.createdAt
                                    )}
                                  </p>

                                </div>

                                <div className="flex items-center gap-5">

                                  <div>

                                    <p className="text-xs text-gray-500">
                                      Payment
                                    </p>

                                    <p className="text-sm mt-1">
                                      {getPaymentIcon(
                                        getPaymentMethod(
                                          order
                                        )
                                      )}{" "}
                                      {getPaymentMethod(
                                        order
                                      )}
                                    </p>

                                  </div>

                                  <div>

                                    <p className="text-xs text-gray-500">
                                      Amount
                                    </p>

                                    <p className="font-bold text-yellow-400 mt-1">
                                      {money(
                                        order.totalAmount
                                      )}
                                    </p>

                                  </div>

                                  <button
                                    onClick={() =>
                                      setSelectedOrder(
                                        order
                                      )
                                    }
                                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs"
                                  >
                                    Details
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

              </div>

            </div>

          </div>
        );
      })()}

      {/* =====================================================
          ORDER DETAILS MODAL
      ====================================================== */}

      {selectedOrder && (

        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() =>
            setSelectedOrder(null)
          }
        >

          <div
            className="w-full max-w-2xl max-h-[90vh] bg-[#111] border border-white/10 rounded-3xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="p-6 border-b border-white/10 flex items-center justify-between">

              <div>

                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  Order Details
                </p>

                <h2 className="text-xl font-bold mt-1">
                  #{selectedOrder.id}
                </h2>

              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>

            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">

              {/* STATUS */}

              <div className="grid grid-cols-2 gap-3 mb-5">

                <div className="bg-black rounded-xl p-4">

                  <p className="text-xs text-gray-500">
                    Order Status
                  </p>

                  <p className="mt-2 font-semibold">
                    {selectedOrder.orderStatus ||
                      "Pending"}
                  </p>

                </div>

                <div className="bg-black rounded-xl p-4">

                  <p className="text-xs text-gray-500">
                    Delivery Status
                  </p>

                  <p className="mt-2 font-semibold text-yellow-400">
                    {getStatus(
                      selectedOrder
                    )}
                  </p>

                </div>

              </div>

              {/* PAYMENT */}

              <div className="mb-5">

                <h3 className="font-bold mb-3">
                  💳 Payment Information
                </h3>

                <div className="bg-black rounded-xl border border-white/10 overflow-hidden">

                  <div className="p-4 border-b border-white/5">

                    <p className="text-xs text-gray-500">
                      Payment Method
                    </p>

                    <p className="mt-1 font-semibold">
                      {getPaymentIcon(
                        getPaymentMethod(
                          selectedOrder
                        )
                      )}{" "}
                      {getPaymentMethod(
                        selectedOrder
                      )}
                    </p>

                  </div>

                  <div className="p-4 border-b border-white/5">

                    <p className="text-xs text-gray-500">
                      Payment Number
                    </p>

                    <p className="mt-1">
                      {selectedOrder.paymentNumber ||
                        "—"}
                    </p>

                  </div>

                  <div className="p-4 border-b border-white/5">

                    <p className="text-xs text-gray-500">
                      Transaction ID
                    </p>

                    <p className="mt-1 text-yellow-400 font-mono font-semibold break-all">
                      {selectedOrder.transactionId ||
                        "No Transaction ID"}
                    </p>

                  </div>

                  <div className="p-4">

                    <p className="text-xs text-gray-500">
                      Payment Status
                    </p>

                    <p className="mt-1">
                      {selectedOrder.paymentStatus ||
                        "Pending"}
                    </p>

                  </div>

                </div>

              </div>

              {/* CUSTOMER CONTACT */}

              <div className="mb-5">

                <h3 className="font-bold mb-3">
                  👤 Customer Contact
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  <div className="bg-black rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Name
                    </p>

                    <p className="mt-1">
                      {selectedOrder.customerName ||
                        "—"}
                    </p>

                  </div>

                  <div className="bg-black rounded-xl p-4">

                    <p className="text-xs text-gray-500">
                      Mobile
                    </p>

                    <p className="mt-1">
                      {selectedOrder.customerPhone ||
                        "—"}
                    </p>

                  </div>

                  <div className="bg-black rounded-xl p-4 md:col-span-2">

                    <p className="text-xs text-gray-500">
                      Email
                    </p>

                    <p className="mt-1 break-all">
                      {selectedOrder.userEmail ||
                        "—"}
                    </p>

                  </div>

                </div>

              </div>

              {/* DELIVERY */}

              <div className="mb-5">

                <h3 className="font-bold mb-3">
                  📍 Delivery Address
                </h3>

                <div className="bg-black rounded-xl p-4">

                  <p className="text-sm text-gray-300">
                    {[
                      selectedOrder.area,
                      selectedOrder.upazila,
                      selectedOrder.district,
                      selectedOrder.division,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>

                  {selectedOrder.address && (
                    <p className="text-sm text-gray-400 mt-2">
                      {selectedOrder.address}
                    </p>
                  )}

                </div>

              </div>

              {/* ORDER AMOUNT */}

              <div>

                <h3 className="font-bold mb-3">
                  💰 Order Summary
                </h3>

                <div className="bg-black rounded-xl p-4 space-y-3">

                  <div className="flex justify-between text-sm">

                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span>
                      {money(
                        selectedOrder.subtotal
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between text-sm">

                    <span className="text-gray-500">
                      Delivery
                    </span>

                    <span>
                      {money(
                        selectedOrder.deliveryCharge
                      )}
                    </span>

                  </div>

                  <div className="border-t border-white/10 pt-3 flex justify-between">

                    <span className="font-semibold">
                      Total
                    </span>

                    <span className="font-bold text-yellow-400 text-lg">
                      {money(
                        selectedOrder.totalAmount
                      )}
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}