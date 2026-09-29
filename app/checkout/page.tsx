"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  User,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";

import { auth, db } from "@/app/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

type CartItem = {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  salePrice?: number;
  quantity?: number;
  image?: string;
  images?: string[];
  size?: string;
  color?: string;
};

const PAYMENT_NUMBER = "01616818494";

const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

const DISTRICTS: Record<string, string[]> = {
  Dhaka: [
    "Dhaka",
    "Narayanganj",
    "Gazipur",
    "Tangail",
    "Munshiganj",
    "Manikganj",
    "Narsingdi",
    "Faridpur",
    "Gopalganj",
    "Madaripur",
    "Rajbari",
    "Shariatpur",
    "Kishoreganj",
  ],

  Chattogram: [
    "Chattogram",
    "Cumilla",
    "Cox's Bazar",
    "Feni",
    "Noakhali",
    "Lakshmipur",
    "Chandpur",
    "Brahmanbaria",
    "Rangamati",
    "Khagrachhari",
    "Bandarban",
  ],

  Rajshahi: [
    "Rajshahi",
    "Bogura",
    "Pabna",
    "Sirajganj",
    "Natore",
    "Naogaon",
    "Chapainawabganj",
    "Joypurhat",
  ],

  Khulna: [
    "Khulna",
    "Jashore",
    "Satkhira",
    "Bagerhat",
    "Jhenaidah",
    "Magura",
    "Narail",
    "Kushtia",
    "Chuadanga",
    "Meherpur",
  ],

  Barishal: [
    "Barishal",
    "Bhola",
    "Patuakhali",
    "Pirojpur",
    "Jhalokathi",
    "Barguna",
  ],

  Sylhet: [
    "Sylhet",
    "Moulvibazar",
    "Habiganj",
    "Sunamganj",
  ],

  Rangpur: [
    "Rangpur",
    "Dinajpur",
    "Kurigram",
    "Gaibandha",
    "Nilphamari",
    "Lalmonirhat",
    "Panchagarh",
    "Thakurgaon",
  ],

  Mymensingh: [
    "Mymensingh",
    "Jamalpur",
    "Netrokona",
    "Sherpur",
  ],
};

export default function CheckoutPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<FirebaseUser | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [division, setDivision] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [upazila, setUpazila] =
    useState("");

  const [area, setArea] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [note, setNote] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("COD");

  const [transactionId, setTransactionId] =
    useState("");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [successOrderId, setSuccessOrderId] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(user);
        }
      );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOAD CART
  ===================================================== */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "picko_cart"
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Cart loading error:",
        error
      );
    }
  }, []);

  /* =====================================================
     SUBTOTAL
  ===================================================== */

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => {
        const price =
          Number(
            item.salePrice ??
              item.price ??
              0
          );

        const quantity =
          Number(
            item.quantity || 1
          );

        return (
          sum +
          price * quantity
        );
      },
      0
    );
  }, [cart]);

  /* =====================================================
     DELIVERY CHARGE
  ===================================================== */

  const deliveryCharge = useMemo(() => {
    if (!division) {
      return 0;
    }

    if (
      division === "Dhaka" &&
      district === "Dhaka"
    ) {
      return 80;
    }

    return 150;
  }, [division, district]);

  const totalAmount =
    subtotal + deliveryCharge;

  /* =====================================================
     DISTRICTS
  ===================================================== */

  const availableDistricts =
    division
      ? DISTRICTS[division] || []
      : [];

  /* =====================================================
     PAYMENT CHANGE
  ===================================================== */

  const handlePaymentChange = (
    method: string
  ) => {
    setPaymentMethod(method);

    if (method === "COD") {
      setTransactionId("");
    }
  };

  /* =====================================================
     PLACE ORDER
  ===================================================== */

  const placeOrder = async () => {
    setErrorMessage("");

    if (cart.length === 0) {
      setErrorMessage(
        "আপনার cart খালি।"
      );
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage(
        "Customer name দিন।"
      );
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage(
        "Customer phone number দিন।"
      );
      return;
    }

    if (!division) {
      setErrorMessage(
        "Division select করুন।"
      );
      return;
    }

    if (!district) {
      setErrorMessage(
        "District select করুন।"
      );
      return;
    }

    /*
     * Address optional
     */

    /*
     * Online payment হলে Transaction ID লাগবে।
     */

    if (
      paymentMethod !== "COD" &&
      !transactionId.trim()
    ) {
      setErrorMessage(
        "Transaction ID দিন।"
      );
      return;
    }

    try {
      setPlacingOrder(true);

      /*
       * Random Firestore document ID
       */
      const orderRef = doc(
        collection(db, "orders")
      );

      /*
       * Counter document
       *
       * orderCounters/main
       */
      const counterRef = doc(
        db,
        "orderCounters",
        "main"
      );

      /*
       * IMPORTANT:
       * Transaction ব্যবহার করা হয়েছে।
       *
       * এতে একই সময়ে multiple customer
       * order করলেও duplicate Order ID হওয়ার
       * সম্ভাবনা থাকে না।
       */

      const generatedOrderId =
        await runTransaction(
          db,
          async (transaction) => {
            const counterSnapshot =
              await transaction.get(
                counterRef
              );

            let nextNumber = 1001;

            if (
              counterSnapshot.exists()
            ) {
              const data =
                counterSnapshot.data();

              nextNumber = Math.max(
                1001,
                Number(
                  data.nextNumber ||
                    1001
                )
              );
            }

            const displayOrderId =
              `#PS${nextNumber}`;

            /*
             * Next number save
             */
            transaction.set(
              counterRef,
              {
                nextNumber:
                  nextNumber + 1,
                updatedAt:
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            /*
             * Order save
             */

            transaction.set(
              orderRef,
              {
                orderId:
                  displayOrderId,

                userId:
                  currentUser?.uid ||
                  "",

                userEmail:
                  currentUser?.email ||
                  "",

                customerName:
                  customerName.trim(),

                customerPhone:
                  customerPhone.trim(),

                division,

                district,

                upazila:
                  upazila.trim(),

                area:
                  area.trim(),

                address:
                  address.trim(),

                note:
                  note.trim(),

                items: cart.map(
                  (item) => ({
                    id:
                      item.id ||
                      item.productId ||
                      "",

                    productId:
                      item.productId ||
                      item.id ||
                      "",

                    name:
                      item.name ||
                      "Product",

                    price:
                      Number(
                        item.price || 0
                      ),

                    salePrice:
                      Number(
                        item.salePrice ??
                          item.price ??
                          0
                      ),

                    quantity:
                      Number(
                        item.quantity ||
                          1
                      ),

                    image:
                      item.image ||
                      item.images?.[0] ||
                      "",

                    images:
                      item.images ||
                      [],

                    size:
                      item.size || "",

                    color:
                      item.color || "",
                  })
                ),

                subtotal,

                deliveryCharge,

                totalAmount,

                paymentMethod,

                paymentNumber:
                  paymentMethod === "COD"
                    ? ""
                    : PAYMENT_NUMBER,

                transactionId:
                  paymentMethod === "COD"
                    ? ""
                    : transactionId.trim(),

                /*
                 * COD = Paid
                 * Online = Pending
                 */

                paymentStatus:
                  paymentMethod === "COD"
                    ? "Paid"
                    : "Pending",

                orderStatus:
                  "Pending",

                deliveryStatus:
                  "Pending",

                salesCountApplied:
                  false,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp(),
              }
            );

            return displayOrderId;
          }
        );

      /*
       * Cart clear
       */

      localStorage.removeItem(
        "picko_cart"
      );

      setCart([]);

      /*
       * Success Order ID
       */

      setSuccessOrderId(
        generatedOrderId
      );

    } catch (error) {
      console.error(
        "Place order error:",
        error
      );

      setErrorMessage(
        "Order place করা যায়নি। আবার চেষ্টা করুন।"
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  /* =====================================================
     SUCCESS SCREEN
  ===================================================== */

  if (successOrderId) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-10 text-white">

        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">

          <div className="w-full rounded-3xl border border-green-500/20 bg-white/[0.03] p-7 text-center shadow-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">

              <CheckCircle2
                size={45}
                className="text-green-400"
              />

            </div>

            <h1 className="mt-6 text-2xl font-black">
              Order Successfully Placed!
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              আপনার order সফলভাবে নেওয়া হয়েছে।
            </p>

            <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

              <p className="text-xs text-gray-500">
                Your Order ID
              </p>

              <p className="mt-2 text-3xl font-black tracking-wider text-purple-400">
                {successOrderId}
              </p>

            </div>

            <p className="mt-5 text-sm text-gray-400">
              Picko Shop থেকে আপনার সাথে
              ফোনে যোগাযোগ করা হবে।
            </p>

            <button
              onClick={() =>
                router.push(
                  "/profile"
                )
              }
              className="mt-6 w-full rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-black transition hover:bg-purple-500"
            >
              My Orders দেখুন
            </button>

            <button
              onClick={() =>
                router.push("/")
              }
              className="mt-3 w-full rounded-xl border border-white/10 px-5 py-3.5 text-sm font-bold text-gray-400 transition hover:text-white"
            >
              Continue Shopping
            </button>

          </div>

        </div>

      </main>
    );
  }

  /* =====================================================
     MAIN CHECKOUT
  ===================================================== */

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-6 flex items-center gap-3">

          <button
            onClick={() =>
              router.back()
            }
            className="rounded-xl border border-white/10 p-2.5 text-gray-400 transition hover:text-white"
          >
            <ArrowLeft
              size={19}
            />
          </button>

          <div>

            <h1 className="text-2xl font-black">
              Checkout
            </h1>

            <p className="text-xs text-gray-600">
              Complete your order
            </p>

          </div>

        </div>

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* LEFT */}

          <div className="space-y-5">

            {/* CUSTOMER */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <User
                    size={19}
                    className="text-purple-400"
                  />
                </div>

                <div>
                  <h2 className="font-black">
                    Customer Information
                  </h2>

                  <p className="text-xs text-gray-600">
                    আপনার contact information
                  </p>
                </div>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Customer Name *
                  </label>

                  <input
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(
                        e.target.value
                      )
                    }
                    placeholder="আপনার নাম"
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Phone Number *
                  </label>

                  <div className="relative">

                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      value={
                        customerPhone
                      }
                      onChange={(e) =>
                        setCustomerPhone(
                          e.target.value
                        )
                      }
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-xl border border-white/10 bg-white py-3 pl-11 pr-4 text-sm text-black outline-none focus:border-purple-500"
                    />

                  </div>
                </div>

              </div>

            </section>

            {/* DELIVERY */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <MapPin
                    size={19}
                    className="text-red-400"
                  />
                </div>

                <div>
                  <h2 className="font-black">
                    Delivery Information
                  </h2>

                  <p className="text-xs text-gray-600">
                    কোথায় product পাঠাব?
                  </p>
                </div>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                {/* DIVISION */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Division *
                  </label>

                  <select
                    value={division}
                    onChange={(e) => {
                      setDivision(
                        e.target.value
                      );
                      setDistrict("");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  >

                    <option value="">
                      Select Division
                    </option>

                    {DIVISIONS.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}

                  </select>
                </div>

                {/* DISTRICT */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    District *
                  </label>

                  <select
                    value={district}
                    onChange={(e) =>
                      setDistrict(
                        e.target.value
                      )
                    }
                    disabled={!division}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none disabled:bg-gray-300 focus:border-purple-500"
                  >

                    <option value="">
                      Select District
                    </option>

                    {availableDistricts.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}

                  </select>
                </div>

                {/* UPAZILA */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Upazila / Thana
                  </label>

                  <input
                    value={upazila}
                    onChange={(e) =>
                      setUpazila(
                        e.target.value
                      )
                    }
                    placeholder="Upazila / Thana"
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  />
                </div>

                {/* AREA */}

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Area
                  </label>

                  <input
                    value={area}
                    onChange={(e) =>
                      setArea(
                        e.target.value
                      )
                    }
                    placeholder="Area / বাজার"
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  />
                </div>

                {/* ADDRESS */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Full Address
                    <span className="ml-2 text-gray-700">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) =>
                      setAddress(
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="বাসা/বাড়ি/রোড/ল্যান্ডমার্ক..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  />

                </div>

                {/* NOTE */}

                <div className="md:col-span-2">

                  <label className="mb-2 block text-xs font-bold text-gray-500">
                    Order Note
                    <span className="ml-2 text-gray-700">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    value={note}
                    onChange={(e) =>
                      setNote(
                        e.target.value
                      )
                    }
                    rows={2}
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-purple-500"
                  />

                </div>

              </div>

            </section>

            {/* PAYMENT */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <CreditCard
                    size={19}
                    className="text-green-400"
                  />
                </div>

                <div>
                  <h2 className="font-black">
                    Payment Method
                  </h2>

                  <p className="text-xs text-gray-600">
                    Payment method select করুন
                  </p>
                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {/* COD */}

                <button
                  type="button"
                  onClick={() =>
                    handlePaymentChange(
                      "COD"
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                    paymentMethod ===
                    "COD"
                      ? "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10">

                      <Banknote
                        size={22}
                        className="text-green-400"
                      />

                    </div>

                    <div>

                      <p className="font-black">
                        Cash on Delivery
                      </p>

                      <p className="text-xs text-gray-500">
                        পণ্য হাতে পেয়ে টাকা দিন
                      </p>

                    </div>

                  </div>

                  {paymentMethod ===
                    "COD" && (
                    <div className="absolute right-3 top-3">

                      <CheckCircle2
                        size={19}
                        className="text-green-400"
                      />

                    </div>
                  )}

                </button>

                {/* BKASH */}

                <button
                  type="button"
                  onClick={() =>
                    handlePaymentChange(
                      "bKash"
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                    paymentMethod ===
                    "bKash"
                      ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10">

                      <Smartphone
                        size={22}
                        className="text-pink-400"
                      />

                    </div>

                    <div>

                      <p className="font-black">
                        bKash
                      </p>

                      <p className="text-xs text-gray-500">
                        {PAYMENT_NUMBER}
                      </p>

                    </div>

                  </div>

                  {paymentMethod ===
                    "bKash" && (
                    <div className="absolute right-3 top-3">

                      <CheckCircle2
                        size={19}
                        className="text-pink-400"
                      />

                    </div>
                  )}

                </button>

                {/* NAGAD */}

                <button
                  type="button"
                  onClick={() =>
                    handlePaymentChange(
                      "Nagad"
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                    paymentMethod ===
                    "Nagad"
                      ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10">

                      <Smartphone
                        size={22}
                        className="text-orange-400"
                      />

                    </div>

                    <div>

                      <p className="font-black">
                        Nagad
                      </p>

                      <p className="text-xs text-gray-500">
                        {PAYMENT_NUMBER}
                      </p>

                    </div>

                  </div>

                  {paymentMethod ===
                    "Nagad" && (
                    <div className="absolute right-3 top-3">

                      <CheckCircle2
                        size={19}
                        className="text-orange-400"
                      />

                    </div>
                  )}

                </button>

                {/* ROCKET */}

                <button
                  type="button"
                  onClick={() =>
                    handlePaymentChange(
                      "Rocket"
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                    paymentMethod ===
                    "Rocket"
                      ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">

                      <Smartphone
                        size={22}
                        className="text-purple-400"
                      />

                    </div>

                    <div>

                      <p className="font-black">
                        Rocket
                      </p>

                      <p className="text-xs text-gray-500">
                        {PAYMENT_NUMBER}
                      </p>

                    </div>

                  </div>

                  {paymentMethod ===
                    "Rocket" && (
                    <div className="absolute right-3 top-3">

                      <CheckCircle2
                        size={19}
                        className="text-purple-400"
                      />

                    </div>
                  )}

                </button>

                {/* UPAY */}

                <button
                  type="button"
                  onClick={() =>
                    handlePaymentChange(
                      "Upay"
                    )
                  }
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 sm:col-span-2 ${
                    paymentMethod ===
                    "Upay"
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">

                      <Smartphone
                        size={22}
                        className="text-blue-400"
                      />

                    </div>

                    <div>

                      <p className="font-black">
                        Upay
                      </p>

                      <p className="text-xs text-gray-500">
                        {PAYMENT_NUMBER}
                      </p>

                    </div>

                  </div>

                  {paymentMethod ===
                    "Upay" && (
                    <div className="absolute right-3 top-3">

                      <CheckCircle2
                        size={19}
                        className="text-blue-400"
                      />

                    </div>
                  )}

                </button>

              </div>

              {/* ONLINE PAYMENT */}

              {paymentMethod !==
                "COD" && (
                <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">

                  <p className="text-sm font-black text-yellow-400">
                    {paymentMethod} Payment
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    এই নম্বরে টাকা পাঠিয়ে
                    Transaction ID নিচে দিন:
                  </p>

                  <p className="mt-2 text-lg font-black tracking-wider text-white">
                    {PAYMENT_NUMBER}
                  </p>

                  <input
                    value={
                      transactionId
                    }
                    onChange={(e) =>
                      setTransactionId(
                        e.target.value
                      )
                    }
                    placeholder="Transaction ID"
                    className="mt-4 w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-mono text-black outline-none focus:border-yellow-500"
                  />

                </div>
              )}

              {/* COD INFO */}

              {paymentMethod ===
                "COD" && (
                <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">

                  <p className="text-sm font-black text-green-400">
                    Cash on Delivery
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Delivery পাওয়ার সময়
                    cash payment করবেন।
                  </p>

                </div>
              )}

            </section>

          </div>

          {/* RIGHT */}

          <div>

            <div className="sticky top-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5 flex items-center gap-3">

                <ShoppingBag
                  size={20}
                  className="text-purple-400"
                />

                <h2 className="font-black">
                  Order Summary
                </h2>

              </div>

              <div className="space-y-3">

                {cart.map(
                  (item, index) => {

                    const price =
                      Number(
                        item.salePrice ??
                          item.price ??
                          0
                      );

                    const quantity =
                      Number(
                        item.quantity ||
                          1
                      );

                    return (
                      <div
                        key={`${item.id || item.productId || "item"}-${index}`}
                        className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3"
                      >

                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">

                          {item.image ||
                          item.images?.[0] ? (
                            <img
                              src={
                                item.image ||
                                item
                                  .images?.[0]
                              }
                              alt={
                                item.name ||
                                "Product"
                              }
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ShoppingBag
                                size={17}
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

                          <p className="mt-1 text-[10px] text-gray-500">
                            Qty:{" "}
                            {quantity}
                          </p>

                        </div>

                        <p className="text-sm font-black text-purple-400">
                          ৳
                          {(
                            price *
                            quantity
                          ).toLocaleString(
                            "en-BD"
                          )}
                        </p>

                      </div>
                    );
                  }
                )}

              </div>

              <div className="my-5 border-t border-white/10" />

              <div className="space-y-3">

                <div className="flex justify-between text-sm text-gray-500">

                  <span>
                    Subtotal
                  </span>

                  <span>
                    ৳
                    {subtotal.toLocaleString(
                      "en-BD"
                    )}
                  </span>

                </div>

                <div className="flex justify-between text-sm text-gray-500">

                  <span>
                    Delivery
                  </span>

                  <span>
                    ৳
                    {deliveryCharge.toLocaleString(
                      "en-BD"
                    )}
                  </span>

                </div>

                <div className="flex justify-between border-t border-white/10 pt-4">

                  <span className="font-black">
                    Total
                  </span>

                  <span className="text-2xl font-black text-purple-400">
                    ৳
                    {totalAmount.toLocaleString(
                      "en-BD"
                    )}
                  </span>

                </div>

              </div>

              <button
                onClick={
                  placeOrder
                }
                disabled={
                  placingOrder ||
                  cart.length === 0
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {placingOrder ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Placing Order...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={18}
                    />

                    Place Order
                  </>
                )}

              </button>

              <p className="mt-3 text-center text-[10px] leading-4 text-gray-600">
                Order confirm করার আগে
                আপনার information ঠিক আছে
                কিনা দেখে নিন।
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}