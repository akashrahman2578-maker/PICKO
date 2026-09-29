"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CartItem = {
  productId: string;
  name: string;
  image?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  stock?: number;
};

const CART_KEY = "picko_cart";

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (error) {
      console.error("Cart loading error:", error);
    }

    setLoaded(true);
  }, []);

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));

    window.dispatchEvent(new Event("cartUpdated"));
  };

  const increaseQuantity = (productId: string) => {
    const updated = cart.map((item) => {
      if (item.productId !== productId) return item;

      const maxStock =
        typeof item.stock === "number" && item.stock > 0
          ? item.stock
          : 99;

      return {
        ...item,
        quantity: Math.min(item.quantity + 1, maxStock),
      };
    });

    saveCart(updated);
  };

  const decreaseQuantity = (productId: string) => {
    const updated = cart
      .map((item) => {
        if (item.productId !== productId) return item;

        return {
          ...item,
          quantity: item.quantity - 1,
        };
      })
      .filter((item) => item.quantity > 0);

    saveCart(updated);
  };

  const removeItem = (productId: string) => {
    const updated = cart.filter(
      (item) => item.productId !== productId
    );

    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getItemPrice = (item: CartItem) => {
    return typeof item.salePrice === "number" &&
      item.salePrice > 0
      ? item.salePrice
      : item.price;
  };

  const subtotal = cart.reduce(
    (total, item) =>
      total + getItemPrice(item) * item.quantity,
    0
  );

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent" />
          <p className="text-sm text-gray-500">
            Loading your cart...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#171717]">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          <Link href="/" className="flex items-center">
            <img
              src="/picko-logo.png"
              alt="Picko Shop"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-black hover:text-white"
          >
            ← Continue Shopping
          </Link>

        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* TITLE */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#b28a1e]">
            Picko Shop
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Shopping Cart
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {totalItems === 0
              ? "Your cart is currently empty."
              : `${totalItems} item${totalItems > 1 ? "s" : ""} in your cart`}
          </p>
        </div>

        {/* EMPTY CART */}
        {cart.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-white px-6 py-20 text-center shadow-sm">

            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#faf6e8] text-4xl">
              🛒
            </div>

            <h2 className="text-2xl font-black">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Looks like you haven't added anything to your cart yet.
              Explore our products and find something you love.
            </p>

            <Link
              href="/"
              className="mt-8 inline-flex rounded-full bg-black px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#d4af37] hover:text-black"
            >
              Start Shopping →
            </Link>

          </div>
        ) : (

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

            {/* CART ITEMS */}
            <div className="space-y-4">

              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-5 py-4">
                <p className="font-bold">
                  Cart Items
                </p>

                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-red-500 transition hover:text-red-700"
                >
                  Clear Cart
                </button>
              </div>

              {cart.map((item) => {
                const finalPrice = getItemPrice(item);
                const hasDiscount =
                  typeof item.salePrice === "number" &&
                  item.salePrice > 0 &&
                  item.salePrice < item.price;

                return (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-4">

                      {/* IMAGE */}
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#f5f5f5]">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl">
                            📦
                          </div>
                        )}
                      </div>

                      {/* INFO */}
                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div>
                            <h2 className="line-clamp-2 text-base font-bold sm:text-lg">
                              {item.name}
                            </h2>

                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-lg font-black">
                                ৳{finalPrice.toLocaleString()}
                              </span>

                              {hasDiscount && (
                                <span className="text-xs text-gray-400 line-through">
                                  ৳{item.price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* REMOVE */}
                          <button
                            onClick={() =>
                              removeItem(item.productId)
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
                            aria-label="Remove item"
                          >
                            ✕
                          </button>

                        </div>

                        {/* QUANTITY */}
                        <div className="mt-5 flex items-center justify-between">

                          <div className="flex items-center rounded-full border border-black/10">

                            <button
                              onClick={() =>
                                decreaseQuantity(item.productId)
                              }
                              className="flex h-9 w-9 items-center justify-center text-lg font-bold transition hover:bg-black hover:text-white"
                            >
                              −
                            </button>

                            <span className="flex h-9 min-w-10 items-center justify-center border-x border-black/10 px-3 text-sm font-bold">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                increaseQuantity(item.productId)
                              }
                              className="flex h-9 w-9 items-center justify-center text-lg font-bold transition hover:bg-black hover:text-white"
                            >
                              +
                            </button>

                          </div>

                          <p className="text-sm font-bold text-gray-500">
                            ৳{(
                              finalPrice * item.quantity
                            ).toLocaleString()}
                          </p>

                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* SUMMARY */}
            <div className="lg:sticky lg:top-28 lg:self-start">

              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">

                <h2 className="text-xl font-black">
                  Order Summary
                </h2>

                <div className="mt-6 space-y-4">

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Items
                    </span>
                    <span className="font-semibold">
                      {totalItems}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Subtotal
                    </span>
                    <span className="font-semibold">
                      ৳{subtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Delivery
                    </span>
                    <span className="font-semibold">
                      Calculated at checkout
                    </span>
                  </div>

                  <div className="border-t border-black/10 pt-5">

                    <div className="flex items-center justify-between">

                      <span className="text-lg font-black">
                        Total
                      </span>

                      <span className="text-2xl font-black">
                        ৳{subtotal.toLocaleString()}
                      </span>

                    </div>

                  </div>

                </div>

                {/* CHECKOUT */}
                <Link
                  href="/checkout"
                  className="mt-7 flex w-full items-center justify-center rounded-full bg-black px-6 py-4 text-sm font-bold text-white transition hover:bg-[#d4af37] hover:text-black"
                >
                  Proceed to Checkout →
                </Link>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl bg-[#faf9f6] p-3 text-center">
                    <div className="text-lg">🔒</div>
                    <p className="mt-1 text-[11px] font-semibold text-gray-500">
                      Secure Checkout
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#faf9f6] p-3 text-center">
                    <div className="text-lg">🚚</div>
                    <p className="mt-1 text-[11px] font-semibold text-gray-500">
                      Fast Delivery
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Picko Shop. All rights reserved.
        </div>
      </footer>

    </main>
  );
}