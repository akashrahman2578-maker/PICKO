"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  Package,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Product = {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  discountType?: string;
  discountValue?: number;
  discountActive?: boolean;
  stock?: number;
  description?: string;
  images?: string[];
  active?: boolean;
};

type CartItem = {
  productId: string;
  name: string;
  image?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  stock?: number;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const productId = String(params.id || "");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  // --------------------------------
  // LOAD PRODUCT
  // --------------------------------

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const productRef = doc(
          db,
          "products",
          productId
        );

        const snapshot = await getDoc(productRef);

        if (!snapshot.exists()) {
          setProduct(null);
          return;
        }

        const data = snapshot.data();

        setProduct({
          id: snapshot.id,
          name: String(data.name || "Unnamed Product"),
          price: Number(data.price || 0),
          salePrice:
            typeof data.salePrice === "number"
              ? data.salePrice
              : undefined,
          discountType: data.discountType,
          discountValue:
            typeof data.discountValue === "number"
              ? data.discountValue
              : undefined,
          discountActive:
            data.discountActive === true,
          stock:
            typeof data.stock === "number"
              ? data.stock
              : undefined,
          description:
            typeof data.description === "string"
              ? data.description
              : "",
          images: Array.isArray(data.images)
            ? data.images
            : [],
          active: data.active !== false,
        });
      } catch (error) {
        console.error(
          "Product loading error:",
          error
        );
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  // --------------------------------
  // PRICE
  // --------------------------------

  const finalPrice = useMemo(() => {
    if (!product) return 0;

    if (
      product.discountActive === true &&
      typeof product.salePrice === "number"
    ) {
      return product.salePrice;
    }

    if (typeof product.salePrice === "number") {
      return product.salePrice;
    }

    return product.price;
  }, [product]);

  const totalPrice = finalPrice * quantity;

  // --------------------------------
  // IMAGES
  // --------------------------------

  const images =
    product?.images && product.images.length > 0
      ? product.images
      : [];

  // --------------------------------
  // STOCK
  // --------------------------------

  const outOfStock =
    product?.stock !== undefined &&
    product.stock <= 0;

  // --------------------------------
  // ADD TO CART
  // --------------------------------

  const addToCart = () => {
    if (!product) return;

    if (outOfStock) {
      alert("এই product বর্তমানে stock out.");
      return;
    }

    if (
      product.stock !== undefined &&
      quantity > product.stock
    ) {
      alert(
        `শুধু ${product.stock} টি product available আছে।`
      );
      return;
    }

    try {
      const savedCart =
        localStorage.getItem("picko_cart");

      let cart: CartItem[] = [];

      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);

          if (Array.isArray(parsed)) {
            cart = parsed;
          }
        } catch {
          cart = [];
        }
      }

      const existingIndex = cart.findIndex(
        (item) =>
          item.productId === product.id
      );

      if (existingIndex !== -1) {
        const oldItem = cart[existingIndex];

        const newQuantity =
          oldItem.quantity + quantity;

        if (
          product.stock !== undefined &&
          newQuantity > product.stock
        ) {
          alert(
            `শুধু ${product.stock} টি product available আছে।`
          );
          return;
        }

        cart[existingIndex] = {
          ...oldItem,
          quantity: newQuantity,
        };
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          image: images[0] || "",
          price: product.price,
          salePrice:
            typeof product.salePrice === "number"
              ? product.salePrice
              : undefined,
          quantity,
          stock: product.stock,
        });
      }

      localStorage.setItem(
        "picko_cart",
        JSON.stringify(cart)
      );

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      alert("Product cart-এ যোগ হয়েছে!");
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      alert(
        "Cart-এ product যোগ করতে সমস্যা হয়েছে।"
      );
    }
  };

  // --------------------------------
  // BUY NOW
  // --------------------------------

  const buyNow = () => {
    if (!product) return;

    if (outOfStock) {
      alert("এই product বর্তমানে stock out.");
      return;
    }

    if (
      product.stock !== undefined &&
      quantity > product.stock
    ) {
      alert(
        `শুধু ${product.stock} টি product available আছে।`
      );
      return;
    }

    try {
      const buyNowItem: CartItem = {
        productId: product.id,
        name: product.name,
        image: images[0] || "",
        price: product.price,
        salePrice:
          typeof product.salePrice === "number"
            ? product.salePrice
            : undefined,
        quantity,
        stock: product.stock,
      };

      /*
       * Buy Now করলে শুধু এই product-টাই
       * checkout-এ যাবে।
       */
      localStorage.setItem(
        "picko_cart",
        JSON.stringify([buyNowItem])
      );

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      // সরাসরি Checkout
      router.push("/checkout");
    } catch (error) {
      console.error(
        "Buy Now error:",
        error
      );

      alert(
        "Checkout-এ যেতে সমস্যা হয়েছে।"
      );
    }
  };

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="font-medium text-slate-600">
            Product loading হচ্ছে...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------
  // PRODUCT NOT FOUND
  // --------------------------------

  if (!product || product.active === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <Package
            size={60}
            className="mx-auto mb-5 text-slate-300"
          />

          <h1 className="text-2xl font-black text-slate-900">
            Product পাওয়া যায়নি
          </h1>

          <p className="mt-3 text-slate-500">
            Product টি বর্তমানে available নেই।
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-800"
          >
            Home-এ যান
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------
  // MAIN PAGE
  // --------------------------------

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="font-black text-slate-900">
            Picko Shop
          </div>

          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <ShoppingCart size={18} />
            Cart
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* ========================= */}
          {/* PRODUCT IMAGE */}
          {/* ========================= */}

          <section>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100">
                {images.length > 0 ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package
                      size={80}
                      className="text-slate-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* IMAGE GALLERY */}
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() =>
                      setSelectedImage(index)
                    }
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === index
                        ? "border-slate-900"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${
                        index + 1
                      }`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ========================= */}
          {/* PRODUCT INFORMATION */}
          {/* ========================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {/* BADGES */}
            <div className="flex flex-wrap items-center gap-2">
              {product.discountActive === true &&
                typeof product.discountValue ===
                  "number" &&
                product.discountValue > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-black text-red-600">
                    {product.discountType ===
                    "percentage"
                      ? `${product.discountValue}% OFF`
                      : "SALE"}
                  </span>
                )}

              {!outOfStock && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={14} />
                  In Stock
                </span>
              )}
            </div>

            {/* NAME */}
            <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900 md:text-4xl">
              {product.name}
            </h1>

            {/* PRICE */}
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black text-slate-900">
                ৳{finalPrice.toLocaleString("en-US")}
              </span>

              {finalPrice < product.price && (
                <span className="mb-1 text-lg font-medium text-slate-400 line-through">
                  ৳{product.price.toLocaleString(
                    "en-US"
                  )}
                </span>
              )}
            </div>

            {/* STOCK */}
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">
                  Stock
                </span>

                <span
                  className={`text-sm font-black ${
                    outOfStock
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {outOfStock
                    ? "Out of Stock"
                    : product.stock !== undefined
                    ? `${product.stock} available`
                    : "Available"}
                </span>
              </div>
            </div>

            {/* DESCRIPTION */}
            {product.description && (
              <div className="mt-7">
                <h2 className="text-lg font-black text-slate-900">
                  Product Details
                </h2>

                <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                  {product.description}
                </p>
              </div>
            )}

            {/* QUANTITY */}
            {!outOfStock && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-slate-800">
                  Quantity
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        Math.max(1, quantity - 1)
                      )
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-100"
                  >
                    <Minus size={19} />
                  </button>

                  <div className="flex h-12 min-w-16 items-center justify-center rounded-xl bg-slate-100 px-5 font-black text-slate-900">
                    {quantity}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        product.stock !== undefined &&
                        quantity >= product.stock
                      ) {
                        alert(
                          `শুধু ${product.stock} টি product available আছে।`
                        );
                        return;
                      }

                      setQuantity(
                        (current) => current + 1
                      );
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-100"
                  >
                    <Plus size={19} />
                  </button>
                </div>
              </div>
            )}

            {/* TOTAL */}
            {!outOfStock && (
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="font-semibold text-slate-500">
                  Product Total
                </span>

                <span className="text-2xl font-black text-slate-900">
                  ৳{totalPrice.toLocaleString("en-US")}
                </span>
              </div>
            )}

            {/* ========================= */}
            {/* BUY + CART BUTTON */}
            {/* ========================= */}

            {!outOfStock && (
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* ADD CART */}
                <button
                  type="button"
                  onClick={addToCart}
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-5 py-4 text-base font-black text-slate-900 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  <ShoppingCart size={21} />
                  Add to Cart
                </button>

                {/* BUY NOW */}
                <button
                  type="button"
                  onClick={buyNow}
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-base font-black text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  <Zap size={21} />
                  Buy Now
                </button>
              </div>
            )}

            {/* OUT OF STOCK */}
            {outOfStock && (
              <div className="mt-7 rounded-2xl bg-red-50 p-5 text-center">
                <p className="font-black text-red-600">
                  এই product বর্তমানে Stock Out
                </p>
              </div>
            )}

            {/* DELIVERY */}
            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <Truck
                  size={20}
                  className="text-slate-700"
                />

                <h3 className="font-black text-slate-900">
                  Delivery Information
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    Inside Dhaka
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Delivery Charge: ৳80
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    Outside Dhaka
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Delivery Charge: ৳150
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}