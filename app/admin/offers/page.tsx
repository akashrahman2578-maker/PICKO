 "use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

type Coupon = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt?: unknown;
};

const emptyForm = {
  code: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "",
  startDate: "",
  endDate: "",
  active: true,
};

export default function OffersPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [message, setMessage] = useState("");

  // =========================
  // ADMIN AUTH
  // =========================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsCheckingAuth(true);

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (
          !adminSnap.exists() ||
          adminSnap.data().role !== "admin" ||
          adminSnap.data().active !== true
        ) {
          window.location.href = "/";
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error(error);
        window.location.href = "/";
      } finally {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // =========================
  // LOAD COUPONS
  // =========================
  useEffect(() => {
    if (!isAdmin) return;

    loadCoupons();
  }, [isAdmin]);

  async function loadCoupons() {
    try {
      setLoadingCoupons(true);

      const snapshot = await getDocs(
        collection(db, "coupons")
      );

      const list: Coupon[] = snapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          code: data.code || "",
          discountType:
            data.discountType || "percentage",
          discountValue: Number(
            data.discountValue || 0
          ),
          minOrderAmount: Number(
            data.minOrderAmount || 0
          ),
          maxDiscountAmount: Number(
            data.maxDiscountAmount || 0
          ),
          usageLimit: Number(
            data.usageLimit || 0
          ),
          perUserLimit: Number(
            data.perUserLimit || 0
          ),
          usedCount: Number(
            data.usedCount || 0
          ),
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          active: data.active !== false,
          createdAt: data.createdAt,
        };
      });

      setCoupons(list);
    } catch (error) {
      console.error(error);
      setMessage(
        "Coupon load করতে সমস্যা হয়েছে।"
      );
    } finally {
      setLoadingCoupons(false);
    }
  }

  // =========================
  // FORM UPDATE
  // =========================
  function updateForm(
    key: keyof typeof emptyForm,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  // =========================
  // VALIDATION
  // =========================
  function validateForm() {
    const code = form.code.trim().toUpperCase();

    const discountValue = Number(
      form.discountValue || 0
    );

    const minOrderAmount = Number(
      form.minOrderAmount || 0
    );

    const maxDiscountAmount = Number(
      form.maxDiscountAmount || 0
    );

    const usageLimit = Number(
      form.usageLimit || 0
    );

    const perUserLimit = Number(
      form.perUserLimit || 0
    );

    if (!code) {
      throw new Error(
        "Coupon code দিন।"
      );
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error(
        "Coupon code-এ শুধু A-Z, 0-9, _ অথবা - ব্যবহার করুন।"
      );
    }

    if (discountValue <= 0) {
      throw new Error(
        "Discount value 0-এর বেশি হতে হবে।"
      );
    }

    if (
      form.discountType === "percentage" &&
      discountValue > 100
    ) {
      throw new Error(
        "Percentage discount 100%-এর বেশি হতে পারবে না।"
      );
    }

    if (minOrderAmount < 0) {
      throw new Error(
        "Minimum order amount সঠিক দিন।"
      );
    }

    if (maxDiscountAmount < 0) {
      throw new Error(
        "Maximum discount amount সঠিক দিন।"
      );
    }

    if (usageLimit < 0) {
      throw new Error(
        "Usage limit সঠিক দিন।"
      );
    }

    if (perUserLimit < 0) {
      throw new Error(
        "Per user limit সঠিক দিন।"
      );
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) <
        new Date(form.startDate)
    ) {
      throw new Error(
        "End date, Start date-এর পরে হতে হবে।"
      );
    }

    return {
      code,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
    };
  }

  // =========================
  // ADD / UPDATE
  // =========================
  async function saveCoupon() {
    try {
      setLoading(true);
      setMessage("");

      const data = validateForm();

      const couponData = {
        code: data.code,

        discountType:
          form.discountType,

        discountValue:
          data.discountValue,

        minOrderAmount:
          data.minOrderAmount,

        maxDiscountAmount:
          data.maxDiscountAmount,

        usageLimit:
          data.usageLimit,

        perUserLimit:
          data.perUserLimit,

        startDate:
          form.startDate,

        endDate:
          form.endDate,

        active:
          form.active,

        updatedAt:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(db, "coupons", editingId),
          couponData
        );

        setMessage(
          "Coupon সফলভাবে update হয়েছে।"
        );
      } else {
        await addDoc(
          collection(db, "coupons"),
          {
            ...couponData,
            usedCount: 0,
            createdAt: serverTimestamp(),
          }
        );

        setMessage(
          "Coupon সফলভাবে তৈরি হয়েছে।"
        );
      }

      resetForm();
      await loadCoupons();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Coupon save করতে সমস্যা হয়েছে।"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // EDIT
  // =========================
  function editCoupon(coupon: Coupon) {
    setEditingId(coupon.id);

    setForm({
      code: coupon.code,

      discountType:
        coupon.discountType,

      discountValue:
        String(coupon.discountValue),

      minOrderAmount:
        String(coupon.minOrderAmount),

      maxDiscountAmount:
        String(coupon.maxDiscountAmount),

      usageLimit:
        String(coupon.usageLimit),

      perUserLimit:
        String(coupon.perUserLimit),

      startDate:
        coupon.startDate,

      endDate:
        coupon.endDate,

      active:
        coupon.active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // DELETE
  // =========================
  async function deleteCoupon(
    couponId: string
  ) {
    const confirmed = window.confirm(
      "এই coupon permanently delete করতে চান?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "coupons", couponId)
      );

      setCoupons((previous) =>
        previous.filter(
          (coupon) =>
            coupon.id !== couponId
        )
      );

      setMessage(
        "Coupon delete হয়েছে।"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Coupon delete করতে সমস্যা হয়েছে।"
      );
    }
  }

  // =========================
  // ACTIVE / INACTIVE
  // =========================
  async function toggleCoupon(
    coupon: Coupon
  ) {
    try {
      await updateDoc(
        doc(db, "coupons", coupon.id),
        {
          active: !coupon.active,
          updatedAt: serverTimestamp(),
        }
      );

      setCoupons((previous) =>
        previous.map((item) =>
          item.id === coupon.id
            ? {
                ...item,
                active: !item.active,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Coupon status change করতে সমস্যা হয়েছে।"
      );
    }
  }

  // =========================
  // RESET
  // =========================
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // =========================
  // SEARCH
  // =========================
  const filteredCoupons = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return coupons;
    }

    return coupons.filter(
      (coupon) =>
        coupon.code
          .toLowerCase()
          .includes(value)
    );
  }, [coupons, search]);

  // =========================
  // LOADING
  // =========================
  if (isCheckingAuth || loadingCoupons) {
    return (
      <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-white/60">
            Loading Offers & Coupons...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // =========================
  // UI
  // =========================
  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-6 md:px-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

          <div>
            <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase">
              Picko Shop
            </p>

            <h1 className="text-3xl md:text-4xl font-bold mt-1">
              Offers & Coupons
            </h1>

            <p className="text-white/50 mt-2">
              Discount coupon এবং promotional offer এখান থেকে manage করুন।
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <p className="text-white/40 text-xs">
              Total Coupons
            </p>

            <p className="text-2xl font-bold text-yellow-400">
              {coupons.length}
            </p>
          </div>

        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        {/* FORM */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-7 mb-10">

          <div className="flex items-center justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {editingId
                  ? "Edit Coupon"
                  : "Create Coupon"}
              </h2>

              <p className="text-white/40 text-sm mt-1">
                Customer checkout-এ এই coupon ব্যবহার করতে পারবে।
              </p>
            </div>

            {editingId && (
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
              >
                Cancel Edit
              </button>
            )}

          </div>

          {/* COUPON CODE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-sm text-white/60 mb-2">
                Coupon Code *
              </label>

              <input
                value={form.code}
                onChange={(e) =>
                  updateForm(
                    "code",
                    e.target.value
                      .toUpperCase()
                  )
                }
                placeholder="যেমন: PICKO20"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 uppercase"
              />

              <p className="text-white/30 text-xs mt-2">
                Example: PICKO20, SAVE100
              </p>
            </div>

            {/* ACTIVE */}
            <div className="flex items-end pb-1">

              <label className="flex items-center gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    updateForm(
                      "active",
                      e.target.checked
                    )
                  }
                  className="w-5 h-5 accent-yellow-400"
                />

                <span>
                  Coupon Active
                </span>

              </label>

            </div>

          </div>

          {/* DISCOUNT */}
          <div className="mt-6 border border-white/10 rounded-2xl p-5">

            <h3 className="font-bold text-lg mb-5">
              Discount Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Discount Type *
                </label>

                <select
                  value={form.discountType}
                  onChange={(e) =>
                    updateForm(
                      "discountType",
                      e.target.value
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                >
                  <option value="percentage">
                    Percentage (%)
                  </option>

                  <option value="fixed">
                    Fixed Amount (৳)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Discount Value *
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.discountValue}
                  onChange={(e) =>
                    updateForm(
                      "discountValue",
                      e.target.value
                    )
                  }
                  placeholder={
                    form.discountType ===
                    "percentage"
                      ? "20"
                      : "200"
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />
              </div>

            </div>

            {/* MAX DISCOUNT */}
            <div className="mt-5">

              <label className="block text-sm text-white/60 mb-2">
                Maximum Discount Amount (৳)
              </label>

              <input
                type="number"
                min="0"
                value={
                  form.maxDiscountAmount
                }
                onChange={(e) =>
                  updateForm(
                    "maxDiscountAmount",
                    e.target.value
                  )
                }
                placeholder="যেমন: 500"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
              />

              <p className="text-white/30 text-xs mt-2">
                Percentage coupon-এর maximum discount limit। 0 দিলে unlimited।
              </p>

            </div>

          </div>

          {/* ORDER SETTINGS */}
          <div className="mt-6 border border-white/10 rounded-2xl p-5">

            <h3 className="font-bold text-lg mb-5">
              Order & Usage Limits
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Minimum Order Amount (৳)
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.minOrderAmount
                  }
                  onChange={(e) =>
                    updateForm(
                      "minOrderAmount",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />

                <p className="text-white/30 text-xs mt-2">
                  0 = কোনো minimum নেই
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Total Usage Limit
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.usageLimit
                  }
                  onChange={(e) =>
                    updateForm(
                      "usageLimit",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />

                <p className="text-white/30 text-xs mt-2">
                  0 = unlimited
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Per User Limit
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.perUserLimit
                  }
                  onChange={(e) =>
                    updateForm(
                      "perUserLimit",
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />

                <p className="text-white/30 text-xs mt-2">
                  0 = unlimited
                </p>
              </div>

            </div>

          </div>

          {/* DATE */}
          <div className="mt-6 border border-white/10 rounded-2xl p-5">

            <h3 className="font-bold text-lg mb-5">
              Coupon Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Start Date
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.startDate
                  }
                  onChange={(e) =>
                    updateForm(
                      "startDate",
                      e.target.value
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  End Date
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.endDate
                  }
                  onChange={(e) =>
                    updateForm(
                      "endDate",
                      e.target.value
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />
              </div>

            </div>

            <p className="text-white/30 text-xs mt-3">
              Date খালি রাখলে coupon-এর নির্দিষ্ট expiry থাকবে না।
            </p>

          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3 mt-7">

            <button
              onClick={saveCoupon}
              disabled={loading}
              className="flex-1 bg-yellow-400 text-black font-bold rounded-xl py-3.5 hover:bg-yellow-300 transition disabled:opacity-40"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "💾 Update Coupon"
                : "🎟️ Create Coupon"}
            </button>

            <button
              onClick={resetForm}
              className="sm:w-40 bg-white/10 hover:bg-white/15 rounded-xl py-3.5 transition"
            >
              Clear
            </button>

          </div>

        </section>

        {/* COUPON LIST */}
        <section>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

            <div>
              <h2 className="text-2xl font-bold">
                All Coupons
              </h2>

              <p className="text-white/40 text-sm mt-1">
                {filteredCoupons.length}টি coupon পাওয়া গেছে।
              </p>
            </div>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search coupon..."
              className="w-full md:w-80 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 uppercase"
            />

          </div>

          {filteredCoupons.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-10 text-center">

              <div className="text-5xl mb-4">
                🎟️
              </div>

              <h3 className="text-xl font-bold">
                No Coupons Found
              </h3>

              <p className="text-white/40 mt-2">
                এখনো কোনো coupon তৈরি করা হয়নি।
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {filteredCoupons.map(
                (coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl p-5"
                  >

                    {/* CODE */}
                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="text-white/40 text-xs uppercase">
                          Coupon Code
                        </p>

                        <h3 className="text-2xl font-black text-yellow-400 tracking-wider mt-1">
                          {coupon.code}
                        </h3>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          coupon.active
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {coupon.active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>

                    </div>

                    {/* DISCOUNT */}
                    <div className="mt-5 bg-black/30 rounded-xl p-4">

                      <p className="text-white/40 text-xs">
                        Discount
                      </p>

                      <p className="text-xl font-bold mt-1">
                        {coupon.discountType ===
                        "percentage"
                          ? `${coupon.discountValue}% OFF`
                          : `৳${coupon.discountValue} OFF`}
                      </p>

                      {coupon.maxDiscountAmount >
                        0 && (
                        <p className="text-white/40 text-xs mt-1">
                          Max discount: ৳
                          {coupon.maxDiscountAmount}
                        </p>
                      )}

                    </div>

                    {/* DETAILS */}
                    <div className="space-y-2 mt-4 text-sm">

                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">
                          Min Order
                        </span>

                        <span>
                          {coupon.minOrderAmount >
                          0
                            ? `৳${coupon.minOrderAmount}`
                            : "No minimum"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">
                          Used
                        </span>

                        <span>
                          {coupon.usedCount}
                          {coupon.usageLimit >
                            0 &&
                            ` / ${coupon.usageLimit}`}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">
                          Per User
                        </span>

                        <span>
                          {coupon.perUserLimit >
                          0
                            ? coupon.perUserLimit
                            : "Unlimited"}
                        </span>
                      </div>

                    </div>

                    {/* DATE */}
                    {(coupon.startDate ||
                      coupon.endDate) && (
                      <div className="mt-4 text-xs text-white/40 bg-white/5 rounded-xl p-3">

                        {coupon.startDate && (
                          <p>
                            Start:{" "}
                            {new Date(
                              coupon.startDate
                            ).toLocaleString()}
                          </p>
                        )}

                        {coupon.endDate && (
                          <p className="mt-1">
                            End:{" "}
                            {new Date(
                              coupon.endDate
                            ).toLocaleString()}
                          </p>
                        )}

                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="grid grid-cols-2 gap-2 mt-5">

                      <button
                        onClick={() =>
                          editCoupon(coupon)
                        }
                        className="bg-white/10 hover:bg-white/15 rounded-xl py-2.5 text-sm transition"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteCoupon(
                            coupon.id
                          )
                        }
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl py-2.5 text-sm transition"
                      >
                        🗑️ Delete
                      </button>

                      <button
                        onClick={() =>
                          toggleCoupon(
                            coupon
                          )
                        }
                        className={`col-span-2 rounded-xl py-2.5 text-sm transition ${
                          coupon.active
                            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                        }`}
                      >
                        {coupon.active
                          ? "✓ Active — Click to Deactivate"
                          : "○ Inactive — Click to Activate"}
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}