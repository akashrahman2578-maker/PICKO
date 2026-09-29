"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Search,
  ShoppingBag,
  User,
  Heart,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Truck,
  Headphones,
  Flame,
  Zap,
  Star,
  PackageCheck,
  Sparkles,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";

import {
  collection,
  onSnapshot,
  doc,
} from "firebase/firestore";

import { db } from "@/app/lib/firebase";

/* =====================================================
   TYPES
===================================================== */

type Product = {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  discountType?: "none" | "percentage" | "fixed";
  discountValue?: number;
  discountActive?: boolean;
  stock?: number;
  soldCount?: number;
  description?: string;
  images?: string[];
  active?: boolean;

  mainCategoryId?: string;
  mainCategoryName?: string;

  category?: string;
  categoryId?: string;
  categoryName?: string;

  subCategory?: string;
  subCategoryId?: string;
  subcategory?: string;
  subcategoryId?: string;

  featured?: boolean;
  isFeatured?: boolean;

  rating?: number;
  averageRating?: number;
  reviewCount?: number;
};

type Category = {
  id: string;
  name: string;
  title?: string;
  type?: "main" | "category" | "subcategory";
  active?: boolean;
  image?: string;
  icon?: string;

  sortOrder?: number;

  parentId?: string;
  parentCategoryId?: string;
  parent?: string;
  parentName?: string;

  subCategories?: string[];
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

/* =====================================================
   CONSTANTS
===================================================== */

const CART_KEY = "picko_cart";
const WISHLIST_KEY = "picko_wishlist";

const WHATSAPP_NUMBER = "8801616818494";

const WHATSAPP_URL =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` +
  encodeURIComponent(
    "আসসালামু আলাইকুম, Picko Shop Customer Support-এর সাথে যোগাযোগ করতে চাই।"
  );

/* =====================================================
   HELPERS
===================================================== */

function getProductPrice(product: Product) {
  if (
    product.discountActive &&
    typeof product.salePrice === "number" &&
    product.salePrice > 0
  ) {
    return product.salePrice;
  }

  return Number(product.price || 0);
}

function getRating(product: Product) {
  const value =
    typeof product.averageRating === "number"
      ? product.averageRating
      : typeof product.rating === "number"
        ? product.rating
        : 0;

  return Math.max(0, Math.min(5, value));
}

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getCategoryName(category: Category) {
  return (
    category.name ||
    category.title ||
    "Category"
  );
}

/* =====================================================
   HOME
===================================================== */

export default function Home() {
  const router = useRouter();

  /* =====================================================
     STATE
  ====================================================== */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [cartCount, setCartCount] =
    useState(0);

  const [wishlist, setWishlist] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [selectedSubCategory, setSelectedSubCategory] =
    useState("all");

  const [heroIndex, setHeroIndex] =
    useState(0);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [categoryDrawer, setCategoryDrawer] =
    useState(false);

  const [openMainCategory, setOpenMainCategory] =
    useState<string | null>(null);

  const [promoIndex, setPromoIndex] =
    useState(0);

  /* =====================================================
     HOMEPAGE ADMIN CONTROL
  ===================================================== */

  const [homepageSettings, setHomepageSettings] = useState({
    hero: true,
    featured: true,
    categories: true,
    offers: true,
    products: true,
  });

  /* =====================================================
     BANGLA PROMOTIONAL BANNERS
     10 SECOND ROTATION
  ====================================================== */

  const promotionalBanners = [
    {
      title:
        "পিকো শপে স্বাগতম — আপনার পছন্দ, আমাদের দায়িত্ব",
      text:
        "আপনার পছন্দের পণ্য এখন আরও সহজে খুঁজে নিন।",
    },
    {
      title:
        "নতুন পণ্য ও আকর্ষণীয় অফার",
      text:
        "আজই আপনার পছন্দের পণ্যটি দেখে নিন।",
    },
    {
      title:
        "দ্রুত ডেলিভারি, সহজ অর্ডার",
      text:
        "Picko Shop থেকে নিশ্চিন্তে shopping করুন।",
    },
    {
      title:
        "Customer Support দরকার?",
      text:
        "WhatsApp-এ সরাসরি আমাদের সাথে যোগাযোগ করুন।",
    },
  ];

  /* =====================================================
     PROMOTIONAL BANNER TIMER
     EVERY 10 SECONDS
  ====================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setPromoIndex((previous) => {
        if (
          previous >=
          promotionalBanners.length - 1
        ) {
          return 0;
        }

        return previous + 1;
      });
    }, 10000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /* =====================================================
     LOAD HOMEPAGE SETTINGS - REALTIME
  ====================================================== */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "homepageSettings", "main"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setHomepageSettings({
            hero: data.hero !== false,
            featured: data.featured !== false,
            categories: data.categories !== false,
            offers: data.offers !== false,
            products: data.products !== false,
          });
        }
      },
      (error) => {
        console.error("Homepage settings loading error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOAD PRODUCTS - REALTIME
  ====================================================== */

  useEffect(() => {
    setLoadingProducts(true);

    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productList: Product[] =
          snapshot.docs
            .map((item) => {
              const data = item.data();

              return {
                id: item.id,

                name:
                  data.name ||
                  "Unnamed Product",

                price:
                  Number(data.price || 0),

                salePrice:
                  typeof data.salePrice ===
                  "number"
                    ? data.salePrice
                    : undefined,

                discountType:
                  data.discountType ||
                  "none",

                discountValue:
                  Number(
                    data.discountValue || 0
                  ),

                discountActive:
                  data.discountActive === true,

                stock:
                  Number(data.stock || 0),

                soldCount:
                  Number(
                    data.soldCount || 0
                  ),

                description:
                  data.description || "",

                images:
                  Array.isArray(data.images)
                    ? data.images
                    : [],

                active:
                  data.active !== false,

                category:
                  data.category ||
                  data.categoryName ||
                  "",

                categoryId:
                  data.categoryId ||
                  "",

                categoryName:
                  data.categoryName ||
                  data.category ||
                  "",

                subCategory:
                  data.subCategory ||
                  data.subcategory ||
                  "",

                subCategoryId:
                  data.subCategoryId ||
                  data.subcategoryId ||
                  "",

                subcategory:
                  data.subcategory ||
                  data.subCategory ||
                  "",

                subcategoryId:
                  data.subcategoryId ||
                  data.subCategoryId ||
                  "",

                featured:
                  data.featured === true,

                isFeatured:
                  data.isFeatured === true,

                rating:
                  typeof data.rating ===
                  "number"
                    ? data.rating
                    : Number(
                        data.rating || 0
                      ),

                averageRating:
                  typeof data.averageRating ===
                  "number"
                    ? data.averageRating
                    : Number(
                        data.averageRating || 0
                      ),

                reviewCount:
                  Number(
                    data.reviewCount || 0
                  ),
              };
            })
            .filter(
              (product) =>
                product.active !== false
            );

        setProducts(productList);
        setLoadingProducts(false);
      },
      (error) => {
        console.error(
          "Product realtime loading error:",
          error
        );

        setLoadingProducts(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* =====================================================
     LOAD CATEGORIES - REALTIME
  ====================================================== */

  useEffect(() => {
    setLoadingCategories(true);

    const unsubscribe = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const list: Category[] =
          snapshot.docs
            .map((item) => {
              const data = item.data();

              return {
                id: item.id,

                name:
                  data.name ||
                  data.title ||
                  "Category",

                title:
                  data.title || "",

                active:
                  data.active !== false,

                image:
                  data.image || "",

                icon:
                  data.icon || "",

                sortOrder:
                  Number(
                    data.sortOrder || 0
                  ),

                parentId:
                  data.parentId || "",

                parentCategoryId:
                  data.parentCategoryId ||
                  "",

                parent:
                  data.parent || "",

                parentName:
                  data.parentName || "",

                subCategories:
                  Array.isArray(
                    data.subCategories
                  )
                    ? data.subCategories
                    : [],
              };
            })
            .filter(
              (category) =>
                category.active !== false
            );

        list.sort((a, b) => {
          const sortA =
            Number(a.sortOrder || 0);

          const sortB =
            Number(b.sortOrder || 0);

          if (sortA !== sortB) {
            return sortA - sortB;
          }

          return getCategoryName(a).localeCompare(
            getCategoryName(b),
            "bn"
          );
        });

        setCategories(list);
        setLoadingCategories(false);
      },
      (error) => {
        console.error(
          "Category realtime loading error:",
          error
        );

        setLoadingCategories(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* =====================================================
     LOAD WISHLIST
  ====================================================== */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          WISHLIST_KEY
        );

      if (saved) {
        const list = JSON.parse(saved);

        if (Array.isArray(list)) {
          setWishlist(list);
        }
      }
    } catch {
      setWishlist([]);
    }
  }, []);

  /* =====================================================
     CART COUNT
  ====================================================== */

  const updateCartCount = () => {
    try {
      const saved =
        localStorage.getItem(
          CART_KEY
        );

      if (!saved) {
        setCartCount(0);
        return;
      }

      const cart: CartItem[] =
        JSON.parse(saved);

      if (!Array.isArray(cart)) {
        setCartCount(0);
        return;
      }

      const count = cart.reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0),
        0
      );

      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();

    const handleCartUpdate = () => {
      updateCartCount();
    };

    window.addEventListener(
      "cartUpdated",
      handleCartUpdate
    );

    window.addEventListener(
      "storage",
      handleCartUpdate
    );

    return () => {
      window.removeEventListener(
        "cartUpdated",
        handleCartUpdate
      );

      window.removeEventListener(
        "storage",
        handleCartUpdate
      );
    };
  }, []);

  /* =====================================================
     WISHLIST
  ====================================================== */

  const toggleWishlist = (
    productId: string
  ) => {
    try {
      let updated: string[];

      if (wishlist.includes(productId)) {
        updated = wishlist.filter(
          (id) => id !== productId
        );
      } else {
        updated = [
          ...wishlist,
          productId,
        ];
      }

      setWishlist(updated);

      localStorage.setItem(
        WISHLIST_KEY,
        JSON.stringify(updated)
      );

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );
    } catch (error) {
      console.error(
        "Wishlist error:",
        error
      );
    }
  };

  /* =====================================================
     ADD TO CART
  ====================================================== */

  const addToCart = (
    product: Product
  ) => {
    try {
      const saved =
        localStorage.getItem(
          CART_KEY
        );

      let cart: CartItem[] = saved
        ? JSON.parse(saved)
        : [];

      if (!Array.isArray(cart)) {
        cart = [];
      }

      const finalSalePrice =
        product.discountActive &&
        typeof product.salePrice ===
          "number" &&
        product.salePrice > 0
          ? product.salePrice
          : undefined;

      const existingIndex =
        cart.findIndex(
          (item) =>
            item.productId ===
            product.id
        );

      const maxStock =
        product.stock &&
        product.stock > 0
          ? product.stock
          : 99;

      if (existingIndex !== -1) {
        const existing =
          cart[existingIndex];

        cart[existingIndex] = {
          ...existing,

          quantity: Math.min(
            Number(
              existing.quantity || 0
            ) + 1,
            maxStock
          ),
        };
      } else {
        cart.push({
          productId: product.id,

          name: product.name,

          image:
            product.images?.[0] ||
            "",

          price: product.price,

          salePrice:
            finalSalePrice,

          quantity: 1,

          stock: product.stock,
        });
      }

      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      updateCartCount();

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      alert(
        "পণ্যটি Cart-এ যোগ হয়েছে ✓"
      );
    } catch (error) {
      console.error(
        "Add cart error:",
        error
      );
    }
  };

  /* =====================================================
     BUY NOW
  ====================================================== */

  const buyNow = (
    product: Product
  ) => {
    try {
      const finalSalePrice =
        product.discountActive &&
        typeof product.salePrice ===
          "number" &&
        product.salePrice > 0
          ? product.salePrice
          : undefined;

      const item: CartItem = {
        productId: product.id,

        name: product.name,

        image:
          product.images?.[0] ||
          "",

        price: product.price,

        salePrice:
          finalSalePrice,

        quantity: 1,

        stock: product.stock,
      };

      localStorage.setItem(
        CART_KEY,
        JSON.stringify([item])
      );

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      router.push("/checkout");
    } catch (error) {
      console.error(
        "Buy now error:",
        error
      );
    }
  };

  /* =====================================================
     3-LEVEL CATEGORY HIERARCHY
     Main → Category → Subcategory
  ====================================================== */

  const categoryHierarchy = useMemo(() => {
    const mainList: Category[] = [];
    const categoryList: Category[] = [];
    const subcategoryList: Category[] = [];

    const childMap = new Map<string, Category[]>();

    categories.forEach((category) => {
      const parentId =
        category.parentId ||
        category.parentCategoryId ||
        "";

      let type = category.type;

      // Old data compatibility
      if (!type) {
        type = parentId ? "subcategory" : "main";
      }

      if (category.active === false) return;

      if (type === "main") {
        mainList.push(category);
      } else if (type === "category") {
        categoryList.push(category);
      } else {
        subcategoryList.push(category);
      }

      if (parentId) {
        const existing = childMap.get(parentId) || [];

        if (!existing.some((item) => item.id === category.id)) {
          existing.push(category);
        }

        childMap.set(parentId, existing);
      }
    });

    const sortCategories = (items: Category[]) => {
      return items.sort((a, b) => {
        const sortA = Number(a.sortOrder || 0);
        const sortB = Number(b.sortOrder || 0);

        if (sortA !== sortB) return sortA - sortB;

        return getCategoryName(a).localeCompare(
          getCategoryName(b),
          "bn"
        );
      });
    };

    sortCategories(mainList);
    sortCategories(categoryList);
    sortCategories(subcategoryList);

    childMap.forEach((children, parentId) => {
      childMap.set(parentId, sortCategories(children));
    });

    return {
      mainCategories: mainList,
      categories: categoryList,
      subcategories: subcategoryList,
      childMap,
    };
  }, [categories]);

  const mainCategories =
    categoryHierarchy.mainCategories;

  const normalCategories =
    categoryHierarchy.categories;

  const allSubcategories =
    categoryHierarchy.subcategories;

  const getChildren = (categoryId: string) => {
    return categoryHierarchy.childMap.get(categoryId) || [];
  };

  const getMainForCategory = (categoryId: string) => {
    let current = categories.find((item) => item.id === categoryId);
    let guard = 0;

    while (current && guard < 5) {
      const type = current.type ||
        ((current.parentId || current.parentCategoryId)
          ? "subcategory"
          : "main");

      if (type === "main") return current;

      const parentId =
        current.parentId || current.parentCategoryId || "";

      if (!parentId) return current;

      current = categories.find((item) => item.id === parentId);
      guard++;
    }

    return undefined;
  };

  /* =====================================================
     CATEGORY PRODUCT MATCHING
  ====================================================== */

  const productBelongsToMain = (
    product: Product,
    main: Category
  ) => {
    const mainId = normalize(product.mainCategoryId);

    if (mainId && mainId === normalize(main.id)) {
      return true;
    }

    const productCategoryId = normalize(product.categoryId);
    const productSubId = normalize(
      product.subCategoryId || product.subcategoryId
    );

    const category = categories.find(
      (item) => normalize(item.id) === productCategoryId
    );

    const subcategory = categories.find(
      (item) => normalize(item.id) === productSubId
    );

    const categoryMain = category
      ? getMainForCategory(category.id)
      : undefined;

    const subMain = subcategory
      ? getMainForCategory(subcategory.id)
      : undefined;

    return (
      normalize(categoryMain?.id) === normalize(main.id) ||
      normalize(subMain?.id) === normalize(main.id)
    );
  };

  const productBelongsToCategory = (
    product: Product,
    category: Category
  ) => {
    const categoryId = normalize(product.categoryId);
    const categoryName = normalize(
      product.categoryName || product.category
    );

    return (
      categoryId === normalize(category.id) ||
      categoryName === normalize(getCategoryName(category))
    );
  };

  const productBelongsToSubCategory = (
    product: Product,
    subCategory: Category
  ) => {
    const subId = normalize(
      product.subCategoryId || product.subcategoryId
    );

    const subName = normalize(
      product.subCategory || product.subcategory
    );

    return (
      subId === normalize(subCategory.id) ||
      subName === normalize(getCategoryName(subCategory))
    );
  };

  /* =====================================================
     BEST SELLING
  ====================================================== */

  const bestSellingProducts =
    useMemo(() => {
      return [...products]
        .sort((a, b) => {
          const soldDifference =
            Number(b.soldCount || 0) -
            Number(a.soldCount || 0);

          if (soldDifference !== 0) {
            return soldDifference;
          }

          return getRating(b) - getRating(a);
        })
        .slice(0, 8);
    }, [products]);

  /* =====================================================
     BEST SELLER HERO TIMER
  ====================================================== */

  useEffect(() => {
    if (bestSellingProducts.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setHeroIndex((previous) => {
        if (previous >= bestSellingProducts.length - 1) {
          return 0;
        }

        return previous + 1;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [bestSellingProducts.length]);

  const heroProduct =
    bestSellingProducts.length > 0
      ? bestSellingProducts[
          heroIndex % bestSellingProducts.length
        ]
      : null;

  /* =====================================================
     FILTER PRODUCTS
  ====================================================== */

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !text ||
        product.name.toLowerCase().includes(text) ||
        product.description?.toLowerCase().includes(text);

      if (!matchesSearch) return false;

      if (selectedCategory === "all") {
        return true;
      }

      const selected = categories.find(
        (category) => category.id === selectedCategory
      );

      if (!selected) return true;

      const selectedType =
        selected.type ||
        ((selected.parentId || selected.parentCategoryId)
          ? "subcategory"
          : "main");

      if (selectedSubCategory !== "all") {
        const sub = categories.find(
          (category) => category.id === selectedSubCategory
        );

        return sub
          ? productBelongsToSubCategory(product, sub)
          : false;
      }

      if (selectedType === "main") {
        return productBelongsToMain(product, selected);
      }

      if (selectedType === "category") {
        return productBelongsToCategory(product, selected);
      }

      return productBelongsToSubCategory(product, selected);
    });
  }, [
    products,
    categories,
    search,
    selectedCategory,
    selectedSubCategory,
  ]);

  /* =====================================================
     FEATURED PRODUCTS
  ====================================================== */

  const featuredProducts = useMemo(() => {
    const featured = products.filter(
      (product) =>
        product.featured === true ||
        product.isFeatured === true
    );

    if (featured.length > 0) {
      return featured.slice(0, 8);
    }

    return bestSellingProducts;
  }, [products, bestSellingProducts]);

  /* =====================================================
     SELECT MAIN CATEGORY
  ====================================================== */

  const selectMainCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory("all");
    setOpenMainCategory(categoryId);

    setCategoryDrawer(false);
    setMobileMenu(false);

    setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  /* =====================================================
     SELECT CATEGORY
  ====================================================== */

  const selectCategory = (
    mainId: string,
    categoryId: string
  ) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory("all");
    setOpenMainCategory(mainId);

    setCategoryDrawer(false);
    setMobileMenu(false);

    setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  /* =====================================================
     SELECT SUBCATEGORY
  ====================================================== */

  const selectSubCategory = (
    categoryId: string,
    subCategoryId: string
  ) => {
    const category = categories.find(
      (item) => item.id === categoryId
    );

    const main = category
      ? getMainForCategory(category.id)
      : undefined;

    setSelectedCategory(categoryId);
    setSelectedSubCategory(subCategoryId);

    if (main) {
      setOpenMainCategory(main.id);
    }

    setCategoryDrawer(false);
    setMobileMenu(false);

    setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  /* =====================================================
     CLEAR CATEGORY
  ====================================================== */

  const clearCategory = () => {
    setSelectedCategory("all");
    setSelectedSubCategory("all");
    setOpenMainCategory(null);
  };

  /* =====================================================
     PRODUCT CARD
  ====================================================== */

  const ProductCard = ({
    product,
  }: {
    product: Product;
  }) => {
    const finalPrice =
      getProductPrice(product);

    const hasDiscount =
      product.discountActive ===
        true &&
      typeof product.salePrice ===
        "number" &&
      product.salePrice <
        product.price;

    const outOfStock =
      typeof product.stock ===
        "number" &&
      product.stock <= 0;

    const wished =
      wishlist.includes(
        product.id
      );

    const rating =
      getRating(product);

    const reviewCount =
      Number(
        product.reviewCount || 0
      );

    return (
      <div className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] transition duration-500 hover:-translate-y-1 hover:border-[#d4a72c]/50 hover:shadow-2xl hover:shadow-[#d4a72c]/5">

        {/* IMAGE */}

        <div className="relative aspect-square overflow-hidden bg-white/[0.03]">

          <Link
            href={`/product/${product.id}`}
            className="absolute inset-0 z-0"
          >

            {product.images?.[0] ? (
              <Image
                src={
                  product.images[0]
                }
                alt={
                  product.name
                }
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag
                  size={42}
                  strokeWidth={1}
                  className="text-gray-600"
                />
              </div>
            )}

          </Link>

          {/* SALE */}

          {hasDiscount && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#d4a72c] px-2.5 py-1 text-[10px] font-black text-black shadow-lg">
              {product.discountType ===
              "percentage"
                ? `${product.discountValue}% OFF`
                : "SALE"}
            </span>
          )}

          {/* BEST SELLER */}

          {(product.soldCount || 0) >=
            5 && (
            <span className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">
              <Flame size={11} />
              BEST SELLER
            </span>
          )}

          {/* WISHLIST */}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              toggleWishlist(
                product.id
              );
            }}
            className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition ${
              wished
                ? "border-red-500/50 bg-red-500/20 text-red-400"
                : "border-white/10 bg-black/60 text-white/70 hover:border-[#d4a72c]/50 hover:text-[#d4a72c]"
            }`}
            aria-label="Wishlist"
          >
            <Heart
              size={16}
              fill={
                wished
                  ? "currentColor"
                  : "none"
              }
            />
          </button>

        </div>

        {/* INFO */}

        <div className="p-3.5">

          <Link
            href={`/product/${product.id}`}
            className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 transition hover:text-[#d4a72c]"
          >
            {product.name}
          </Link>

          {/* RATING */}

          <div className="mt-2 flex items-center gap-1.5">

            <div className="flex items-center gap-0.5 text-[#d4a72c]">

              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <Star
                    key={star}
                    size={12}
                    fill={
                      star <=
                      Math.round(
                        rating
                      )
                        ? "currentColor"
                        : "none"
                    }
                  />
                )
              )}

            </div>

            {rating > 0 ? (
              <span className="text-[10px] text-gray-400">
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-[10px] text-gray-600">
                No rating
              </span>
            )}

            {reviewCount >
              0 && (
              <span className="text-[10px] text-gray-600">
                ({reviewCount})
              </span>
            )}

          </div>

          {/* PRICE */}

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <span className="text-lg font-black text-[#d4a72c]">
              ৳
              {finalPrice.toLocaleString(
                "en-BD"
              )}
            </span>

            {hasDiscount && (
              <span className="text-xs text-gray-500 line-through">
                ৳
                {product.price.toLocaleString(
                  "en-BD"
                )}
              </span>
            )}

          </div>

          {/* STOCK */}

          <div className="mt-2 flex items-center justify-between">

            {outOfStock ? (
              <span className="text-[10px] font-semibold text-red-400">
                Out of Stock
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-green-500">
                ✓ In Stock
              </span>
            )}

            {(product.soldCount ||
              0) > 0 && (
              <span className="text-[10px] text-gray-600">
                {product.soldCount} sold
              </span>
            )}

          </div>

          {/* BUTTONS */}

          <div className="mt-3 space-y-2">

            <button
              disabled={outOfStock}
              onClick={() =>
                buyNow(product)
              }
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-black transition ${
                outOfStock
                  ? "cursor-not-allowed bg-white/5 text-gray-600"
                  : "bg-[#d4a72c] text-black hover:bg-[#e7c45b]"
              }`}
            >
              <Zap size={14} />

              {outOfStock
                ? "Sold Out"
                : "Buy Now"}
            </button>

            <div className="grid grid-cols-2 gap-2">

              <Link
                href={`/product/${product.id}`}
                className="flex items-center justify-center rounded-xl border border-white/10 px-2 py-2.5 text-[10px] font-bold transition hover:border-[#d4a72c] hover:text-[#d4a72c]"
              >
                View
              </Link>

              <button
                disabled={outOfStock}
                onClick={() =>
                  addToCart(product)
                }
                className={`rounded-xl px-2 py-2.5 text-[10px] font-bold transition ${
                  outOfStock
                    ? "cursor-not-allowed bg-white/5 text-gray-600"
                    : "border border-[#d4a72c]/50 bg-[#d4a72c]/10 text-[#d4a72c] hover:bg-[#d4a72c] hover:text-black"
                }`}
              >
                {outOfStock
                  ? "Sold Out"
                  : "Add Cart"}
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  };

  /* =====================================================
     CURRENT MAIN CATEGORY
  ====================================================== */

  const currentMainCategory =
    mainCategories.find(
      (category) =>
        category.id ===
        selectedCategory
    );

  const currentSubCategories =
    currentMainCategory
      ? getChildren(
          currentMainCategory.id
        )
      : [];

  /* =====================================================
     RETURN
  ====================================================== */

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* =====================================================
          BANGLA PROMOTIONAL BANNER
          10 SECOND
      ====================================================== */}

      <section className="relative overflow-hidden border-b border-[#d4a72c]/30 bg-[#d4a72c] text-black">

        <div
          key={promoIndex}
          className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-center px-4 py-3 text-center animate-[pickoBanner_1s_ease-out]"
        >

          <div>

            <p className="text-sm font-black sm:text-base">
              ✨{" "}
              {
                promotionalBanners[
                  promoIndex
                ].title
              }{" "}
              ✨
            </p>

            <p className="mt-0.5 text-[10px] font-semibold sm:text-xs">
              {
                promotionalBanners[
                  promoIndex
                ].text
              }
            </p>

          </div>

        </div>

        {/* BANNER DOTS */}

        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1.5">

          {promotionalBanners.map(
            (_, index) => (
              <button
                key={index}
                onClick={() =>
                  setPromoIndex(index)
                }
                className={`h-1 rounded-full transition-all ${
                  index === promoIndex
                    ? "w-5 bg-black"
                    : "w-1.5 bg-black/30"
                }`}
              />
            )
          )}

        </div>

      </section>

      {/* =====================================================
          HOT SALES BAR
      ====================================================== */}

      {heroProduct && (
        <div className="border-b border-[#d4a72c]/15 bg-[#0a0a0a]">

          <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2.5">

            <Link
              href={`/product/${heroProduct.id}`}
              className="flex max-w-full items-center gap-2 text-xs sm:text-sm"
            >

              <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 font-bold text-red-400">
                <Flame size={13} />
                HOT
              </span>

              <span className="truncate text-gray-400">

                <b className="text-white">
                  {heroProduct.name}
                </b>

                {Number(
                  heroProduct.soldCount ||
                    0
                ) > 0 && (
                  <>
                    {" "}
                    — ইতিমধ্যে{" "}
                    <b className="text-[#d4a72c]">
                      {
                        heroProduct.soldCount
                      } জন
                    </b>{" "}
                    কিনেছেন
                  </>
                )}

              </span>

              <span className="hidden shrink-0 items-center gap-1 text-[#d4a72c] sm:flex">
                দেখুন
                <ChevronRight size={14} />
              </span>

            </Link>

          </div>

        </div>
      )}

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl">

        <div className="mx-auto flex min-h-[74px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">

          {/* MOBILE MENU */}

          <button
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
            className="rounded-xl border border-white/10 p-2.5 lg:hidden"
            aria-label="Menu"
          >
            {mobileMenu ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>

          {/* LOGO */}

          <Link
            href="/"
            className="shrink-0"
          >
            <Image
              src="/picko-logo.png"
              alt="Picko Shop"
              width={150}
              height={70}
              priority
              className="h-auto w-[100px] object-contain sm:w-[120px] lg:w-[140px]"
            />
          </Link>

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-6 lg:flex">

            <Link
              href="/"
              className="text-sm font-semibold text-[#d4a72c]"
            >
              হোম
            </Link>

            <button
              onClick={() =>
                setCategoryDrawer(true)
              }
              className="text-sm text-gray-300 transition hover:text-[#d4a72c]"
            >
              ক্যাটাগরি
            </button>

            <a
              href="#products"
              className="text-sm text-gray-300 transition hover:text-[#d4a72c]"
            >
              শপ
            </a>

            <a
              href="#best-selling"
              className="text-sm text-gray-300 transition hover:text-[#d4a72c]"
            >
              Best Seller
            </a>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-300 transition hover:text-[#25D366]"
            >
              <MessageCircle
                size={15}
              />
              যোগাযোগ
            </a>

          </nav>

          {/* HEADER SEARCH */}

          <div className="relative ml-auto hidden min-w-0 flex-1 md:block md:max-w-[330px] lg:ml-5">

            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              onFocus={() => {
                document
                  .getElementById(
                    "products"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
              placeholder="পণ্য Search করুন..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-9 text-xs text-white outline-none transition placeholder:text-gray-600 focus:border-[#d4a72c]/60"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={15} />
              </button>
            )}

          </div>

          {/* ACTIONS */}

          <div className="flex items-center gap-1 sm:gap-2">

            {/* MOBILE SEARCH */}

            <button
              onClick={() => {
                document
                  .getElementById(
                    "mobile-search"
                  )
                  ?.classList.toggle(
                    "hidden"
                  );
              }}
              className="rounded-xl p-2.5 text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* WISHLIST */}

            <button
              onClick={() =>
                document
                  .getElementById(
                    "products"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
              className="relative hidden rounded-xl p-2.5 text-gray-300 transition hover:bg-white/10 hover:text-red-400 sm:block"
              aria-label="Wishlist"
            >

              <Heart
                size={20}
                fill={
                  wishlist.length > 0
                    ? "currentColor"
                    : "none"
                }
              />

              {wishlist.length >
                0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}

            </button>

            {/* CART */}

            <Link
              href="/cart"
              className="relative rounded-xl p-2.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Cart"
            >

              <ShoppingBag size={20} />

              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d4a72c] px-1 text-[9px] font-bold text-black">
                {cartCount}
              </span>

            </Link>

            {/* PROFILE */}

            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 pr-2 transition hover:border-[#d4a72c]/50 sm:pr-3"
            >

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a72c] text-black">
                <User size={17} />
              </div>

              <span className="hidden text-xs font-medium sm:block">
                Profile
              </span>

            </Link>

          </div>

        </div>

        {/* MOBILE SEARCH */}

        <div
          id="mobile-search"
          className="hidden border-t border-white/10 bg-[#080808] p-3 md:hidden"
        >

          <div className="relative">

            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="পণ্যের নাম দিয়ে Search করুন..."
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-9 text-sm text-white outline-none focus:border-[#d4a72c]/60"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <X size={16} />
              </button>
            )}

          </div>

        </div>

        {/* MOBILE NAV */}

        {mobileMenu && (
          <div className="border-t border-white/10 bg-[#080808] p-4 lg:hidden">

            <div className="space-y-2">

              <button
                onClick={() => {
                  setMobileMenu(
                    false
                  );

                  setCategoryDrawer(
                    true
                  );
                }}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4a72c]"
              >
                <span>
                  📂 ক্যাটাগরি
                </span>

                <ChevronRight
                  size={16}
                />
              </button>

              <a
                href="#products"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="block rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4a72c]"
              >
                🛍️ সকল পণ্য
              </a>

              <a
                href="#best-selling"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="block rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4a72c]"
              >
                🔥 Best Seller
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#25D366]"
              >
                <MessageCircle
                  size={17}
                />
                Customer Support
              </a>

              <Link
                href="/profile"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="block rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4a72c]"
              >
                👤 My Profile
              </Link>

              <Link
                href="/cart"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="block rounded-xl px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4a72c]"
              >
                🛒 My Cart
              </Link>

            </div>

          </div>
        )}

      </header>

      {/* =====================================================
          3-LEVEL CATEGORY SIDE DRAWER
          Main → Category → Subcategory
      ====================================================== */}

      {categoryDrawer && (
        <>
          <button
            aria-label="Close category menu"
            onClick={() => setCategoryDrawer(false)}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />

          <aside className="fixed left-0 top-0 z-[90] h-full w-[340px] max-w-[90vw] overflow-y-auto border-r border-white/10 bg-[#090909] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#090909] px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4a72c]">
                  Picko Shop
                </p>
                <h2 className="mt-1 text-lg font-black">
                  ক্যাটাগরি
                </h2>
              </div>

              <button
                onClick={() => setCategoryDrawer(false)}
                className="rounded-xl border border-white/10 p-2 text-gray-400 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <button
              onClick={() => {
                clearCategory();
                setCategoryDrawer(false);
                setTimeout(() => {
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className={`m-3 flex w-[calc(100%-24px)] items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                selectedCategory === "all"
                  ? "border-[#d4a72c]/50 bg-[#d4a72c]/10 text-[#d4a72c]"
                  : "border-white/10 bg-white/[0.03] text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                🛍️ সব পণ্য
              </span>
              <span className="text-[10px] text-gray-500">
                {products.length}
              </span>
            </button>

            <div className="space-y-2 px-3 pb-8">
              {loadingCategories ? (
                [1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl bg-white/5"
                  />
                ))
              ) : mainCategories.length === 0 ? (
                <div className="rounded-xl border border-white/10 p-5 text-center text-xs text-gray-500">
                  কোনো Main Category পাওয়া যায়নি।
                </div>
              ) : (
                mainCategories.map((main) => {
                  const mainChildren = getChildren(main.id).filter(
                    (item) =>
                      (item.type ||
                        ((item.parentId || item.parentCategoryId)
                          ? "subcategory"
                          : "main")) === "category"
                  );

                  const mainOpen =
                    openMainCategory === main.id;

                  return (
                    <div
                      key={main.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                    >
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            setOpenMainCategory(
                              mainOpen ? null : main.id
                            );
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 text-lg">
                            {main.image ? (
                              <Image
                                src={main.image}
                                alt={getCategoryName(main)}
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              main.icon || "📦"
                            )}
                          </div>

                          <span className="truncate text-sm font-bold text-gray-200 hover:text-[#d4a72c]">
                            {getCategoryName(main)}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            selectMainCategory(main.id)
                          }
                          className="px-3 py-4 text-[11px] font-bold text-gray-500 hover:text-[#d4a72c]"
                        >
                          সব
                        </button>

                        {mainChildren.length > 0 && (
                          <button
                            onClick={() =>
                              setOpenMainCategory(
                                mainOpen ? null : main.id
                              )
                            }
                            className="px-3 py-4 text-gray-500 hover:text-[#d4a72c]"
                          >
                            {mainOpen ? (
                              <ChevronDown size={17} />
                            ) : (
                              <ChevronRight size={17} />
                            )}
                          </button>
                        )}
                      </div>

                      {mainOpen && mainChildren.length > 0 && (
                        <div className="border-t border-white/10 bg-black/20 px-3 py-2">
                          {mainChildren.map((category) => {
                            const subChildren = getChildren(category.id).filter(
                              (item) =>
                                (item.type ||
                                  ((item.parentId || item.parentCategoryId)
                                    ? "subcategory"
                                    : "main")) === "subcategory"
                            );

                            return (
                              <div
                                key={category.id}
                                className="mb-2 overflow-hidden rounded-lg border border-white/5"
                              >
                                <button
                                  onClick={() =>
                                    selectCategory(
                                      main.id,
                                      category.id
                                    )
                                  }
                                  className={`flex w-full items-center justify-between px-3 py-3 text-left text-xs font-bold transition ${
                                    selectedCategory === category.id &&
                                    selectedSubCategory === "all"
                                      ? "bg-[#d4a72c]/10 text-[#d4a72c]"
                                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                                  }`}
                                >
                                  <span>
                                    └ {getCategoryName(category)}
                                  </span>

                                  <span className="text-[10px] text-gray-600">
                                    {subChildren.length > 0
                                      ? `${subChildren.length}টি`
                                      : "→"}
                                  </span>
                                </button>

                                {subChildren.length > 0 && (
                                  <div className="border-t border-white/5 bg-white/[0.02] px-2 py-1">
                                    {subChildren.map((sub) => (
                                      <button
                                        key={sub.id}
                                        onClick={() =>
                                          selectSubCategory(
                                            category.id,
                                            sub.id
                                          )
                                        }
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${
                                          selectedSubCategory === sub.id
                                            ? "bg-[#d4a72c]/10 text-[#d4a72c]"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                      >
                                        <span>
                                          └─ {getCategoryName(sub)}
                                        </span>
                                        <ChevronRight size={13} />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}

      {/* =====================================================
          HERO / BEST SELLING SLIDER
      ====================================================== */}

      {homepageSettings.hero && (
        <section className="relative overflow-hidden border-b border-white/10">

        <div className="pointer-events-none absolute left-1/2 top-[-250px] h-[650px] w-[800px] -translate-x-1/2 rounded-full bg-[#d4a72c]/10 blur-[150px]" />

        {heroProduct ? (

          <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">

            {/* HERO TEXT */}

            <div className="relative z-10 order-2 lg:order-1">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4a72c]/30 bg-[#d4a72c]/10 px-4 py-2 text-xs font-semibold text-[#e7c45b]">

                <Flame
                  size={14}
                />

                BEST SELLING PRODUCT

              </div>

              <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">

                {heroProduct.name}

              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">

                {heroProduct.description ||
                  "Picko Shop-এর জনপ্রিয় পণ্যটি এখনই দেখে নিন।"}

              </p>

              {/* RATING */}

              <div className="mt-5 flex flex-wrap items-center gap-3">

                <div className="flex items-center gap-1">

                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <Star
                        key={star}
                        size={17}
                        className="text-[#d4a72c]"
                        fill={
                          star <=
                          Math.round(
                            getRating(
                              heroProduct
                            )
                          )
                            ? "currentColor"
                            : "none"
                        }
                      />
                    )
                  )}

                </div>

                <span className="text-sm font-bold text-[#d4a72c]">
                  {getRating(
                    heroProduct
                  ) > 0
                    ? getRating(
                        heroProduct
                      ).toFixed(1)
                    : "নতুন"}
                </span>

                {Number(
                  heroProduct.reviewCount ||
                    0
                ) > 0 && (
                  <span className="text-xs text-gray-500">
                    (
                    {
                      heroProduct.reviewCount
                    }{" "}
                    reviews)
                  </span>
                )}

              </div>

              {/* PRICE */}

              <div className="mt-5 flex flex-wrap items-center gap-4">

                <span className="text-3xl font-black text-[#d4a72c] sm:text-4xl">

                  ৳
                  {getProductPrice(
                    heroProduct
                  ).toLocaleString(
                    "en-BD"
                  )}

                </span>

                {heroProduct.discountActive &&
                  heroProduct.salePrice &&
                  heroProduct.salePrice <
                    heroProduct.price && (
                    <span className="text-lg text-gray-500 line-through">

                      ৳
                      {heroProduct.price.toLocaleString(
                        "en-BD"
                      )}

                    </span>
                  )}

              </div>

              {/* SALES */}

              <div className="mt-5 flex flex-wrap gap-3">

                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-400">
                  ✓ Trusted Product
                </span>

                {Number(
                  heroProduct.soldCount ||
                    0
                ) > 0 && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                    🔥{" "}
                    {
                      heroProduct.soldCount
                    }+ Sold
                  </span>
                )}

              </div>

              {/* ACTION */}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                <button
                  onClick={() =>
                    buyNow(heroProduct)
                  }
                  disabled={
                    Number(
                      heroProduct.stock ||
                        0
                    ) <= 0
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#d4a72c] px-7 py-4 text-sm font-black text-black transition hover:bg-[#e7c45b] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-600"
                >
                  <Zap size={18} />

                  {Number(
                    heroProduct.stock ||
                      0
                  ) <= 0
                    ? "Sold Out"
                    : "এখনই কিনুন"}

                </button>

                <Link
                  href={`/product/${heroProduct.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-7 py-4 text-sm font-semibold transition hover:border-[#d4a72c] hover:text-[#d4a72c]"
                >
                  বিস্তারিত দেখুন
                  <ChevronRight
                    size={18}
                  />
                </Link>

              </div>

              {/* SLIDER DOTS */}

              {bestSellingProducts.length >
                1 && (
                <div className="mt-8 flex items-center gap-2">

                  {bestSellingProducts
                    .map(
                      (
                        item,
                        index
                      ) => (
                        <button
                          key={
                            item.id
                          }
                          onClick={() =>
                            setHeroIndex(
                              index
                            )
                          }
                          className={`h-1.5 rounded-full transition-all ${
                            index ===
                            heroIndex %
                              bestSellingProducts.length
                              ? "w-8 bg-[#d4a72c]"
                              : "w-2 bg-white/20"
                          }`}
                        />
                      )
                    )}

                  <span className="ml-2 text-[10px] text-gray-600">
                    প্রতি ৫ সেকেন্ড
                  </span>

                </div>
              )}

            </div>

            {/* HERO IMAGE */}

            <div className="relative order-1 flex min-h-[330px] items-center justify-center lg:order-2 lg:min-h-[470px]">

              <div className="absolute h-[300px] w-[300px] rounded-full bg-[#d4a72c]/10 blur-3xl sm:h-[420px] sm:w-[420px]" />

              <div className="relative h-[330px] w-[330px] overflow-hidden rounded-[35px] border border-[#d4a72c]/25 bg-white/[0.04] shadow-2xl shadow-black/50 sm:h-[430px] sm:w-[430px]">

                {heroProduct.images?.[0] ? (
                  <Image
                    key={
                      heroProduct.id
                    }
                    src={
                      heroProduct.images[0]
                    }
                    alt={
                      heroProduct.name
                    }
                    fill
                    priority
                    sizes="(max-width: 640px) 85vw, 50vw"
                    className="object-cover animate-[pickoZoom_5s_ease-in-out]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">

                    <ShoppingBag
                      size={70}
                      strokeWidth={1}
                      className="text-gray-600"
                    />

                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5 right-5">

                  <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-[10px] uppercase tracking-widest text-gray-500">
                          Picko Shop
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          Customer Favorite
                        </p>

                      </div>

                      <div className="flex items-center gap-1 text-[#d4a72c]">

                        <Star
                          size={14}
                          fill="currentColor"
                        />

                        <span className="text-xs font-bold">
                          {getRating(
                            heroProduct
                          ) > 0
                            ? getRating(
                                heroProduct
                              ).toFixed(1)
                            : "Popular"}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        ) : (

          <div className="mx-auto max-w-7xl px-4 py-24 text-center">

            <Sparkles
              size={50}
              className="mx-auto text-[#d4a72c]"
            />

            <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
              Picko Shop
            </h1>

            <p className="mt-4 text-gray-500">
              আপনার পছন্দের শপিং শুরু হোক
              Picko Shop-এ।
            </p>

            <a
              href="#products"
              className="mt-7 inline-flex rounded-xl bg-[#d4a72c] px-7 py-3 font-bold text-black"
            >
              Shopping শুরু করুন
            </a>

          </div>
        )}

      </section>
      )}

      {/* =====================================================
          QUICK BENEFITS
      ====================================================== */}

      <section className="border-b border-white/10 bg-[#090909]">

        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">

          <div className="border-b border-r border-white/10 p-5 md:border-b-0">

            <Truck
              size={24}
              className="text-[#d4a72c]"
            />

            <h3 className="mt-3 text-sm font-bold">
              দ্রুত ডেলিভারি
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              নিরাপদে পণ্য পৌঁছে দেওয়ার
              চেষ্টা
            </p>

          </div>

          <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">

            <ShieldCheck
              size={24}
              className="text-[#d4a72c]"
            />

            <h3 className="mt-3 text-sm font-bold">
              নিরাপদ অর্ডার
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              সহজ ও নিরাপদ shopping
            </p>

          </div>

          <div className="border-r border-white/10 p-5">

            <PackageCheck
              size={24}
              className="text-[#d4a72c]"
            />

            <h3 className="mt-3 text-sm font-bold">
              Quality Product
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              পছন্দের পণ্য সহজে খুঁজুন
            </p>

          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 transition hover:bg-[#25D366]/5"
          >

            <MessageCircle
              size={24}
              className="text-[#25D366]"
            />

            <h3 className="mt-3 text-sm font-bold">
              Customer Support
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-gray-500">
              WhatsApp-এ সরাসরি যোগাযোগ
            </p>

          </a>

        </div>

      </section>

      {/* =====================================================
          CATEGORIES
      ====================================================== */}

      {homepageSettings.categories && (
        <section
          id="categories"
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
        >

        <div className="mb-7 flex items-end justify-between">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4a72c]">
              Explore
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              ক্যাটাগরি
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              একটি main category নির্বাচন করুন।
              Subcategory আলাদা করে পরে দেখাবে।
            </p>

          </div>

          <button
            onClick={() => {
              clearCategory();

              document
                .getElementById(
                  "products"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                });
            }}
            className="hidden items-center gap-1 text-xs text-gray-400 hover:text-[#d4a72c] sm:flex"
          >
            সব পণ্য
            <ChevronRight
              size={15}
            />
          </button>

        </div>

        {/* CATEGORY CARDS */}

        {loadingCategories ? (

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">

            {[
              1, 2, 3, 4, 5, 6,
            ].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-white/5"
              />
            ))}

          </div>

        ) : mainCategories.length ===
          0 ? (

          <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-10 text-center">

            <div className="text-4xl">
              📂
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Admin Panel → Categories থেকে
              category যোগ করুন।
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">

            {/* ALL */}

            <button
              onClick={() => {
                clearCategory();
              }}
              className={`group rounded-2xl border p-4 text-left transition ${
                selectedCategory ===
                "all"
                  ? "border-[#d4a72c]/50 bg-[#d4a72c]/10"
                  : "border-white/10 bg-[#0b0b0b] hover:border-[#d4a72c]/30"
              }`}
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4a72c]/10 text-xl">
                🛍️
              </div>

              <p className="mt-3 text-sm font-bold">
                সব পণ্য
              </p>

              <p className="mt-1 text-[10px] text-gray-500">
                {products.length} products
              </p>

            </button>

            {/* MAIN CATEGORY ONLY */}

            {mainCategories.map(
              (category) => {
                const children =
                  getChildren(
                    category.id
                  );

                const selected =
                  selectedCategory ===
                  category.id;

                return (
                  <button
                    key={
                      category.id
                    }
                    onClick={() =>
                      selectMainCategory(
                        category.id
                      )
                    }
                    className={`group rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-[#d4a72c]/50 bg-[#d4a72c]/10"
                        : "border-white/10 bg-[#0b0b0b] hover:border-[#d4a72c]/30"
                    }`}
                  >

                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-xl">

                      {category.image ? (
                        <Image
                          src={
                            category.image
                          }
                          alt={getCategoryName(
                            category
                          )}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        category.icon ||
                        "📦"
                      )}

                    </div>

                    <p className="mt-3 line-clamp-1 text-sm font-bold">
                      {getCategoryName(
                        category
                      )}
                    </p>

                    <div className="mt-1 flex items-center justify-between">

                      <span className="text-[10px] text-gray-500">
                        {children.length >
                        0
                          ? `${children.length} subcategory`
                          : "Shop now"}
                      </span>

                      <ChevronRight
                        size={13}
                        className="text-gray-600 transition group-hover:text-[#d4a72c]"
                      />

                    </div>

                  </button>
                );
              }
            )}

          </div>

        )}

        {/* =====================================================
            SELECTED MAIN CATEGORY SUBCATEGORIES
        ====================================================== */}

        {currentMainCategory &&
          currentSubCategories.length >
            0 && (
            <div className="mt-6 rounded-2xl border border-[#d4a72c]/20 bg-[#d4a72c]/5 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[10px] uppercase tracking-wider text-[#d4a72c]">
                    Subcategory
                  </p>

                  <h3 className="mt-1 text-sm font-black">
                    {
                      getCategoryName(
                        currentMainCategory
                      )
                    }
                  </h3>

                </div>

                <button
                  onClick={() => {
                    setCategoryDrawer(
                      true
                    );

                    setOpenMainCategory(
                      currentMainCategory.id
                    );
                  }}
                  className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-gray-400 hover:text-[#d4a72c]"
                >
                  Menu
                  <Menu
                    size={13}
                  />
                </button>

              </div>

              <div className="mt-4 flex flex-wrap gap-2">

                <button
                  onClick={() => {
                    setSelectedSubCategory(
                      "all"
                    );
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                    selectedSubCategory ===
                    "all"
                      ? "border-[#d4a72c]/50 bg-[#d4a72c] text-black"
                      : "border-white/10 bg-black/20 text-gray-300 hover:border-[#d4a72c]/40"
                  }`}
                >
                  সব{" "}
                  {
                    getCategoryName(
                      currentMainCategory
                    )
                  }
                </button>

                {currentSubCategories.map(
                  (sub) => (
                    <button
                      key={
                        sub.id
                      }
                      onClick={() =>
                        selectSubCategory(
                          currentMainCategory.id,
                          sub.id
                        )
                      }
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                        selectedSubCategory ===
                        sub.id
                          ? "border-[#d4a72c]/50 bg-[#d4a72c] text-black"
                          : "border-white/10 bg-black/20 text-gray-300 hover:border-[#d4a72c]/40"
                      }`}
                    >
                      {
                        getCategoryName(
                          sub
                        )
                      }
                    </button>
                  )
                )}

              </div>

            </div>
          )}

      </section>
      )}

      {/* =====================================================
          FEATURED
      ====================================================== */}

      {homepageSettings.featured &&
        featuredProducts.length > 0 && (
        <section className="border-y border-white/10 bg-[#090909] py-14">

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="mb-7 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Sparkles
                    size={18}
                    className="text-[#d4a72c]"
                  />

                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4a72c]">
                    Featured
                  </p>

                </div>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  আপনার জন্য বাছাই করা
                </h2>

              </div>

              <span className="hidden text-xs text-gray-600 sm:block">
                Picko Shop
              </span>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">

              {featuredProducts
                .slice(0, 8)
                .map(
                  (product) => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                    />
                  )
                )}

            </div>

          </div>

        </section>
      )}

      {/* =====================================================
          ALL PRODUCTS
      ====================================================== */}

      {homepageSettings.products && (
        <section
          id="products"
          className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
        >

        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4a72c]">
              Shop
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">

              {selectedSubCategory !==
              "all"
                ? "Subcategory Products"
                : selectedCategory !==
                    "all"
                  ? currentMainCategory
                    ? getCategoryName(
                        currentMainCategory
                      )
                    : "Category Products"
                  : "সকল পণ্য"}

            </h2>

            <p className="mt-2 text-sm text-gray-500">

              {loadingProducts
                ? "পণ্য লোড হচ্ছে..."
                : `${filteredProducts.length}টি পণ্য পাওয়া গেছে`}

            </p>

          </div>

        </div>

        {/* ACTIVE CATEGORY */}

        {selectedCategory !==
          "all" && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4a72c]/20 bg-[#d4a72c]/5 px-4 py-3">

            <div className="flex flex-wrap items-center gap-2">

              <span className="text-xs text-[#d4a72c]">
                Category:
              </span>

              <span className="text-xs font-bold">
                {currentMainCategory
                  ? getCategoryName(
                      currentMainCategory
                    )
                  : ""}
              </span>

              {selectedSubCategory !==
                "all" && (
                <>
                  <span className="text-gray-600">
                    /
                  </span>

                  <span className="text-xs font-bold text-[#d4a72c]">
                    {
                      currentSubCategories.find(
                        (sub) =>
                          sub.id ===
                          selectedSubCategory
                      )
                        ?.name
                    }
                  </span>
                </>
              )}

            </div>

            <button
              onClick={() =>
                clearCategory()
              }
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕ Clear
            </button>

          </div>
        )}

        {/* SEARCH RESULT */}

        {search && (
          <div className="mb-5 rounded-xl border border-white/10 bg-[#0b0b0b] px-4 py-3 text-xs text-gray-400">

            Search result for:

            <span className="ml-2 font-bold text-[#d4a72c]">
              "{search}"
            </span>

          </div>
        )}

        {/* LOADING */}

        {loadingProducts && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">

            {[
              1, 2, 3, 4,
              5, 6, 7, 8,
            ].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]"
              >

                <div className="aspect-square animate-pulse bg-white/5" />

                <div className="space-y-3 p-4">

                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />

                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />

                  <div className="h-9 animate-pulse rounded-xl bg-white/5" />

                </div>

              </div>
            ))}

          </div>
        )}

        {/* EMPTY */}

        {!loadingProducts &&
          filteredProducts.length ===
            0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] px-6 py-20 text-center">

              <Search
                size={48}
                strokeWidth={1}
                className="mx-auto text-gray-600"
              />

              <h3 className="mt-5 text-xl font-bold">
                কোনো পণ্য পাওয়া যায়নি
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                অন্য product name অথবা
                category দিয়ে চেষ্টা করুন।
              </p>

              <button
                onClick={() => {
                  setSearch("");

                  clearCategory();
                }}
                className="mt-6 rounded-xl bg-[#d4a72c] px-6 py-3 text-xs font-bold text-black"
              >
                সব পণ্য দেখুন
              </button>

            </div>
          )}

        {/* PRODUCT GRID */}

        {!loadingProducts &&
          filteredProducts.length >
            0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">

              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                  />
                )
              )}

            </div>
          )}

      </section>
      )}

      {/* =====================================================
          BEST SELLING
      ====================================================== */}

      {bestSellingProducts.length >
        0 && (
        <section
          id="best-selling"
          className="border-y border-red-500/10 bg-[#080808] py-14"
        >

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            <div className="mb-7 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Flame
                    size={19}
                    className="text-red-400"
                  />

                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                    Trending
                  </p>

                </div>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  🔥 সবচেয়ে বেশি বিক্রি হচ্ছে
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Sold Count অনুযায়ী automatic ranking
                </p>

              </div>

              <div className="hidden items-center gap-2 text-xs text-gray-600 sm:flex">
                <Flame
                  size={14}
                />
                Live Sales Ranking
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">

              {bestSellingProducts
                .slice(0, 8)
                .map(
                  (product) => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                    />
                  )
                )}

            </div>

          </div>

        </section>
      )}

      {/* =====================================================
          TRUST SECTION
      ====================================================== */}

      <section className="border-t border-white/10 bg-[#090909] py-16">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4a72c]">
              Why Picko Shop
            </p>

            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              কেন Picko Shop?
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              সহজ shopping, সুন্দর experience
              এবং customer-এর সুবিধাকে
              সামনে রেখে Picko Shop তৈরি করা
              হচ্ছে।
            </p>

          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">

              <ShieldCheck
                size={28}
                className="text-[#d4a72c]"
              />

              <h3 className="mt-5 font-bold">
                নিরাপদ Shopping
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                আপনার order information
                যতটা সম্ভব সহজ ও নিরাপদ
                রাখার জন্য system তৈরি করা
                হচ্ছে।
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">

              <Truck
                size={28}
                className="text-[#d4a72c]"
              />

              <h3 className="mt-5 font-bold">
                Delivery Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Order থেকে delivery পর্যন্ত
                customer experience আরও
                সহজ করার জন্য system রাখা
                হচ্ছে।
              </p>

            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              id="contact"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-[#25D366]/40 hover:bg-[#25D366]/5"
            >

              <MessageCircle
                size={28}
                className="text-[#25D366]"
              />

              <h3 className="mt-5 font-bold">
                Customer Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                কোনো সমস্যা হলে WhatsApp-এ
                সরাসরি আমাদের সাথে যোগাযোগ করুন।
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-black text-black">
                WhatsApp করুন
                <ChevronRight
                  size={14}
                />
              </div>

            </a>

          </div>

        </div>

      </section>

      {/* =====================================================
          FUTURE READY CTA
      ====================================================== */}

      <section className="border-t border-[#d4a72c]/20 bg-[#050505] py-16">

        <div className="mx-auto max-w-4xl px-4 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4a72c]/20 bg-[#d4a72c]/10">

            <Sparkles
              size={28}
              className="text-[#d4a72c]"
            />

          </div>

          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            আপনার পছন্দের পণ্যটি
            আজই খুঁজে নিন
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500">
            Picko Shop-এ নতুন product,
            offer এবং popular collection
            ধীরে ধীরে আরও যোগ করা হবে।
          </p>

          <a
            href="#products"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d4a72c] px-7 py-3.5 text-sm font-black text-black transition hover:bg-[#e7c45b]"
          >
            Shopping শুরু করুন
            <ChevronRight
              size={17}
            />
          </a>

        </div>

      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/10 bg-[#050505]">

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          <div className="grid gap-10 md:grid-cols-4">

            {/* BRAND */}

            <div>

              <Link href="/">
                <Image
                  src="/picko-logo.png"
                  alt="Picko Shop"
                  width={130}
                  height={60}
                  className="w-[120px] object-contain"
                />
              </Link>

              <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
                আপনার পছন্দের পণ্য, সুন্দর
                shopping experience —
                Picko Shop।
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                Picko Shop Online
              </div>

            </div>

            {/* SHOP */}

            <div>

              <h4 className="text-sm font-bold">
                Shop
              </h4>

              <div className="mt-4 space-y-3 text-sm text-gray-500">

                <a
                  href="#products"
                  className="block hover:text-[#d4a72c]"
                >
                  সকল পণ্য
                </a>

                <a
                  href="#best-selling"
                  className="block hover:text-[#d4a72c]"
                >
                  Best Seller
                </a>

                <button
                  onClick={() =>
                    setCategoryDrawer(
                      true
                    )
                  }
                  className="block text-left hover:text-[#d4a72c]"
                >
                  Categories
                </button>

              </div>

            </div>

            {/* ACCOUNT */}

            <div>

              <h4 className="text-sm font-bold">
                Account
              </h4>

              <div className="mt-4 space-y-3 text-sm text-gray-500">

                <Link
                  href="/profile"
                  className="block hover:text-[#d4a72c]"
                >
                  My Profile
                </Link>

                <Link
                  href="/cart"
                  className="block hover:text-[#d4a72c]"
                >
                  My Cart
                </Link>

                <Link
                  href="/login"
                  className="block hover:text-[#d4a72c]"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="block hover:text-[#d4a72c]"
                >
                  Register
                </Link>

              </div>

            </div>

            {/* SUPPORT */}

            <div>

              <h4 className="text-sm font-bold">
                Help & Support
              </h4>

              <div className="mt-4 space-y-3 text-sm text-gray-500">

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#25D366]"
                >
                  <MessageCircle
                    size={15}
                  />
                  যোগাযোগ / Customer Support
                </a>

                <span className="block">
                  Delivery Information
                </span>

                <span className="block">
                  Return Policy
                </span>

                <span className="block">
                  Privacy Policy
                </span>

              </div>

            </div>

          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-center text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:text-left">

            <p>
              ©{" "}
              {new Date().getFullYear()}{" "}
              Picko Shop.
              সর্বস্বত্ব সংরক্ষিত।
            </p>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 transition hover:text-[#25D366] sm:justify-start"
            >
              <MessageCircle
                size={13}
              />
              Customer Support
            </a>

          </div>

        </div>

      </footer>

      {/* =====================================================
          FLOATING WHATSAPP
      ====================================================== */}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Customer Support WhatsApp"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-xs font-black text-black shadow-2xl shadow-black/40 transition hover:scale-105 hover:bg-[#35e777]"
      >

        <MessageCircle
          size={20}
        />

        <span className="hidden sm:inline">
          Customer Support
        </span>

      </a>

      {/* =====================================================
          ANIMATION
      ====================================================== */}

      <style jsx global>{`

        @keyframes pickoZoom {
          0% {
            transform: scale(1.12);
          }

          100% {
            transform: scale(1);
          }
        }

        @keyframes pickoBanner {
          0% {
            opacity: 0;
            transform: scale(1.03);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

      `}</style>

    </main>
  );
}