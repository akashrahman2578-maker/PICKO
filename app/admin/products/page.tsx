"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const CLOUD_NAME = "szcz5ehz";
const UPLOAD_PRESET = "picko_shop";

type CategoryType = "main" | "category" | "subcategory";

type Category = {
  id: string;
  name: string;
  type?: CategoryType;

  parentId?: string | null;
  parentCategoryId?: string | null;

  active?: boolean;
};

type Product = {
  id: string;

  name: string;

  mainCategoryId: string;
  mainCategoryName: string;

  categoryId: string;
  categoryName: string;

  subcategoryId: string;
  subcategoryName: string;

  /* Old fields support */
  category?: string;
  subCategory?: string;

  price: number;

  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  salePrice: number;
  discountActive: boolean;

  discountStartDate: string;
  discountEndDate: string;

  stock: number;

  description: string;

  images: string[];

  active: boolean;

  createdAt?: unknown;
};

const emptyForm = {
  name: "",

  mainCategoryId: "",
  categoryId: "",
  subcategoryId: "",

  price: "",

  discountType: "none" as
    | "none"
    | "percentage"
    | "fixed",

  discountValue: "",

  discountActive: true,

  discountStartDate: "",
  discountEndDate: "",

  stock: "",

  description: "",

  images: [] as string[],

  active: true,
};

export default function ProductsPage() {
  const [userLoading, setUserLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  /* =====================================================
     ADMIN AUTH CHECK
  ====================================================== */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, async (user) => {
        try {
          setUserLoading(true);

          if (!user) {
            setIsAdmin(false);
            window.location.href = "/login";
            return;
          }

          const adminRef = doc(
            db,
            "admins",
            user.uid
          );

          const adminSnap =
            await getDoc(adminRef);

          if (
            !adminSnap.exists() ||
            adminSnap.data().role !== "admin" ||
            adminSnap.data().active !== true
          ) {
            setIsAdmin(false);
            window.location.href = "/";
            return;
          }

          setIsAdmin(true);
        } catch (error) {
          console.error(error);

          setIsAdmin(false);

          window.location.href = "/";
        } finally {
          setUserLoading(false);
        }
      });

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOAD DATA
  ====================================================== */

  useEffect(() => {
    if (!isAdmin) return;

    loadData();
  }, [isAdmin]);

  async function loadData() {
    try {
      setLoadingData(true);

      const [
        categorySnap,
        productSnap,
      ] = await Promise.all([
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "products")),
      ]);

      const categoryList: Category[] =
        categorySnap.docs.map((item) => {
          const data = item.data();

          let type: CategoryType =
            data.type || "category";

          /*
           Old category data support.

           Old system:
           parentId = empty => main
           parentId = another category => subcategory
          */

          if (!data.type) {
            if (!data.parentId) {
              type = "main";
            } else {
              type = "subcategory";
            }
          }

          return {
            id: item.id,

            name: data.name || "",

            type,

            parentId:
              data.parentId ??
              data.parentCategoryId ??
              null,

            parentCategoryId:
              data.parentCategoryId ??
              data.parentId ??
              null,

            active:
              data.active !== false,
          };
        });

      const productList: Product[] =
        productSnap.docs.map((item) => {
          const data = item.data();

          const price =
            Number(data.price || 0);

          const discountType =
            data.discountType || "none";

          const discountValue =
            Number(data.discountValue || 0);

          let salePrice =
            Number(
              data.salePrice ?? price
            );

          if (
            data.salePrice === undefined ||
            data.salePrice === null
          ) {
            salePrice =
              calculateSalePrice(
                price,
                discountType,
                discountValue
              );
          }

          return {
            id: item.id,

            name: data.name || "",

            mainCategoryId:
              data.mainCategoryId || "",

            mainCategoryName:
              data.mainCategoryName || "",

            categoryId:
              data.categoryId || "",

            categoryName:
              data.categoryName || "",

            subcategoryId:
              data.subcategoryId ||
              data.subCategoryId ||
              "",

            subcategoryName:
              data.subcategoryName ||
              data.subCategoryName ||
              "",

            category:
              data.category || "",

            subCategory:
              data.subCategory || "",

            price,

            discountType,

            discountValue,

            salePrice,

            discountActive:
              data.discountActive !== false,

            discountStartDate:
              data.discountStartDate || "",

            discountEndDate:
              data.discountEndDate || "",

            stock:
              Number(data.stock || 0),

            description:
              data.description || "",

            images:
              Array.isArray(data.images)
                ? data.images
                : data.image
                ? [data.image]
                : [],

            active:
              data.active !== false,

            createdAt:
              data.createdAt,
          };
        });

      setCategories(categoryList);

      setProducts(productList);
    } catch (error) {
      console.error(error);

      setMessage(
        "Data load করতে সমস্যা হয়েছে।"
      );
    } finally {
      setLoadingData(false);
    }
  }

  /* =====================================================
     SALE PRICE CALCULATOR
  ====================================================== */

  function calculateSalePrice(
    price: number,
    discountType:
      | "none"
      | "percentage"
      | "fixed",
    discountValue: number
  ) {
    if (!price || price <= 0) {
      return 0;
    }

    if (
      discountType === "none" ||
      !discountValue ||
      discountValue <= 0
    ) {
      return price;
    }

    if (
      discountType === "percentage"
    ) {
      const value = Math.min(
        100,
        Math.max(0, discountValue)
      );

      return Math.max(
        0,
        Math.round(
          (
            price -
            price * (value / 100)
          ) * 100
        ) / 100
      );
    }

    if (
      discountType === "fixed"
    ) {
      return Math.max(
        0,
        Math.round(
          (price - discountValue) * 100
        ) / 100
      );
    }

    return price;
  }

  /* =====================================================
     CATEGORY HIERARCHY
  ====================================================== */

  const mainCategories =
    useMemo(() => {
      return categories
        .filter(
          (category) =>
            (
              category.type === "main" ||
              (!category.type &&
                !category.parentId)
            ) &&
            category.active !== false
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "bn"
          )
        );
    }, [categories]);

  const normalCategories =
    useMemo(() => {
      if (!form.mainCategoryId) {
        return [];
      }

      return categories
        .filter(
          (category) =>
            category.type ===
              "category" &&
            (
              category.parentId ===
                form.mainCategoryId ||
              category.parentCategoryId ===
                form.mainCategoryId
            ) &&
            category.active !== false
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "bn"
          )
        );
    }, [
      categories,
      form.mainCategoryId,
    ]);

  const subcategories =
    useMemo(() => {
      if (!form.categoryId) {
        return [];
      }

      return categories
        .filter(
          (category) =>
            category.type ===
              "subcategory" &&
            (
              category.parentId ===
                form.categoryId ||
              category.parentCategoryId ===
                form.categoryId
            ) &&
            category.active !== false
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "bn"
          )
        );
    }, [
      categories,
      form.categoryId,
    ]);

  /* =====================================================
     FORM UPDATE
  ====================================================== */

  function updateForm(
    key: keyof typeof emptyForm,
    value:
      | string
      | boolean
      | string[]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* =====================================================
     MAIN CATEGORY CHANGE
  ====================================================== */

  function handleMainCategoryChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,

      mainCategoryId: value,

      categoryId: "",

      subcategoryId: "",
    }));
  }

  /* =====================================================
     CATEGORY CHANGE
  ====================================================== */

  function handleCategoryChange(
    value: string
  ) {
    setForm((previous) => ({
      ...previous,

      categoryId: value,

      subcategoryId: "",
    }));
  }

  /* =====================================================
     IMAGE UPLOAD
  ====================================================== */

  async function uploadImages(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    const availableSlots =
      6 - form.images.length;

    if (availableSlots <= 0) {
      setMessage(
        "সর্বোচ্চ 6টি ছবি দেওয়া যাবে।"
      );
      return;
    }

    if (
      files.length > availableSlots
    ) {
      setMessage(
        `আর সর্বোচ্চ ${availableSlots}টি ছবি দেওয়া যাবে।`
      );
      return;
    }

    for (const file of files) {
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setMessage(
          "শুধু image file upload করা যাবে।"
        );
        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        setMessage(
          "একটি image সর্বোচ্চ 10MB হতে পারবে।"
        );
        return;
      }
    }

    try {
      setUploading(true);

      setMessage("");

      const uploadedUrls: string[] =
        [];

      for (const file of files) {
        const data =
          new FormData();

        data.append(
          "file",
          file
        );

        data.append(
          "upload_preset",
          UPLOAD_PRESET
        );

        const response =
          await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: data,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Cloudinary upload failed"
          );
        }

        const result =
          await response.json();

        uploadedUrls.push(
          result.secure_url
        );
      }

      setForm((previous) => ({
        ...previous,

        images: [
          ...previous.images,
          ...uploadedUrls,
        ],
      }));

      setMessage(
        "ছবি সফলভাবে upload হয়েছে।"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "ছবি upload করতে সমস্যা হয়েছে।"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  function removeImage(
    index: number
  ) {
    setForm((previous) => ({
      ...previous,

      images:
        previous.images.filter(
          (_, imageIndex) =>
            imageIndex !== index
        ),
    }));
  }

  /* =====================================================
     DISCOUNT VALIDATION
  ====================================================== */

  function getDiscountData() {
    const price =
      Number(form.price || 0);

    const discountValue =
      Number(
        form.discountValue || 0
      );

    if (price <= 0) {
      throw new Error(
        "Regular price সঠিকভাবে দিন।"
      );
    }

    if (
      form.discountType ===
      "percentage"
    ) {
      if (
        discountValue < 0 ||
        discountValue > 100
      ) {
        throw new Error(
          "Percentage discount 0 থেকে 100 এর মধ্যে হতে হবে।"
        );
      }
    }

    if (
      form.discountType ===
      "fixed"
    ) {
      if (discountValue < 0) {
        throw new Error(
          "Fixed discount negative হতে পারবে না।"
        );
      }

      if (
        discountValue >= price
      ) {
        throw new Error(
          "Fixed discount regular price-এর চেয়ে কম হতে হবে।"
        );
      }
    }

    const salePrice =
      calculateSalePrice(
        price,
        form.discountType,
        discountValue
      );

    return {
      price,
      discountValue,
      salePrice,
    };
  }

  /* =====================================================
     SAVE PRODUCT
  ====================================================== */

  async function saveProduct() {
    try {
      setLoading(true);

      setMessage("");

      if (!form.name.trim()) {
        throw new Error(
          "Product name দিন।"
        );
      }

      if (!form.mainCategoryId) {
        throw new Error(
          "Main Category select করুন।"
        );
      }

      if (!form.categoryId) {
        throw new Error(
          "Category select করুন।"
        );
      }

      if (!form.subcategoryId) {
        throw new Error(
          "Subcategory select করুন।"
        );
      }

      if (
        form.images.length === 0
      ) {
        throw new Error(
          "কমপক্ষে 1টি product image দিন।"
        );
      }

      const selectedMain =
        categories.find(
          (item) =>
            item.id ===
            form.mainCategoryId
        );

      const selectedCategory =
        categories.find(
          (item) =>
            item.id ===
            form.categoryId
        );

      const selectedSubcategory =
        categories.find(
          (item) =>
            item.id ===
            form.subcategoryId
        );

      if (!selectedMain) {
        throw new Error(
          "Main Category পাওয়া যায়নি।"
        );
      }

      if (!selectedCategory) {
        throw new Error(
          "Category পাওয়া যায়নি।"
        );
      }

      if (!selectedSubcategory) {
        throw new Error(
          "Subcategory পাওয়া যায়নি।"
        );
      }

      const discountData =
        getDiscountData();

      const productData = {
        name:
          form.name.trim(),

        /*
         * NEW 3 LEVEL SYSTEM
         */

        mainCategoryId:
          selectedMain.id,

        mainCategoryName:
          selectedMain.name,

        categoryId:
          selectedCategory.id,

        categoryName:
          selectedCategory.name,

        subcategoryId:
          selectedSubcategory.id,

        subcategoryName:
          selectedSubcategory.name,

        /*
         * OLD FIELD SUPPORT
         */

        category:
          selectedCategory.name,

        subCategory:
          selectedSubcategory.name,

        price:
          discountData.price,

        discountType:
          form.discountType,

        discountValue:
          form.discountType ===
          "none"
            ? 0
            : discountData.discountValue,

        salePrice:
          form.discountType ===
          "none"
            ? discountData.price
            : discountData.salePrice,

        discountActive:
          form.discountType !==
          "none"
            ? form.discountActive
            : false,

        discountStartDate:
          form.discountStartDate,

        discountEndDate:
          form.discountEndDate,

        stock:
          Number(form.stock || 0),

        description:
          form.description.trim(),

        images:
          form.images,

        active:
          form.active,

        updatedAt:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "products",
            editingId
          ),
          productData
        );

        setMessage(
          "Product সফলভাবে update হয়েছে।"
        );
      } else {
        await addDoc(
          collection(
            db,
            "products"
          ),
          {
            ...productData,

            createdAt:
              serverTimestamp(),
          }
        );

        setMessage(
          "Product সফলভাবে add হয়েছে।"
        );
      }

      resetForm();

      await loadData();
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMessage(
          error.message
        );
      } else {
        setMessage(
          "Product save করতে সমস্যা হয়েছে।"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     EDIT PRODUCT
  ====================================================== */

  function editProduct(
    product: Product
  ) {
    setEditingId(product.id);

    /*
     * Old product হলে
     * main category বের করার চেষ্টা
     */

    let mainId =
      product.mainCategoryId ||
      "";

    let categoryId =
      product.categoryId ||
      "";

    let subcategoryId =
      product.subcategoryId ||
      "";

    /*
     * যদি old product-এ
     * subcategoryId থাকে,
     * তার parent থেকে category
     * এবং category-এর parent থেকে main
     * বের করা হবে।
     */

    if (subcategoryId) {
      const sub =
        categories.find(
          (item) =>
            item.id ===
            subcategoryId
        );

      if (sub) {
        categoryId =
          categoryId ||
          sub.parentId ||
          sub.parentCategoryId ||
          "";
      }
    }

    if (categoryId) {
      const category =
        categories.find(
          (item) =>
            item.id ===
            categoryId
        );

      if (category) {
        mainId =
          mainId ||
          category.parentId ||
          category.parentCategoryId ||
          "";
      }
    }

    /*
     * Safety fallback:
     * category itself main হলে
     */

    if (!mainId && categoryId) {
      const possibleMain =
        categories.find(
          (item) =>
            item.id ===
            categoryId &&
            item.type === "main"
        );

      if (possibleMain) {
        mainId =
          possibleMain.id;

        categoryId = "";
      }
    }

    setForm({
      name:
        product.name,

      mainCategoryId:
        mainId,

      categoryId,

      subcategoryId,

      price:
        String(product.price),

      discountType:
        product.discountType,

      discountValue:
        product.discountType ===
        "none"
          ? ""
          : String(
              product.discountValue
            ),

      discountActive:
        product.discountActive,

      discountStartDate:
        product.discountStartDate,

      discountEndDate:
        product.discountEndDate,

      stock:
        String(product.stock),

      description:
        product.description,

      images:
        product.images,

      active:
        product.active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =====================================================
     DELETE PRODUCT
  ====================================================== */

  async function deleteProduct(
    productId: string
  ) {
    const confirmed =
      window.confirm(
        "এই product permanently delete করতে চান?"
      );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(
          db,
          "products",
          productId
        )
      );

      setProducts(
        (previous) =>
          previous.filter(
            (product) =>
              product.id !==
              productId
          )
      );

      setMessage(
        "Product delete হয়েছে।"
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Product delete করতে সমস্যা হয়েছে।"
      );
    }
  }

  /* =====================================================
     ACTIVE / INACTIVE
  ====================================================== */

  async function toggleProduct(
    product: Product
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "products",
          product.id
        ),
        {
          active:
            !product.active,

          updatedAt:
            serverTimestamp(),
        }
      );

      setProducts(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              product.id
                ? {
                    ...item,
                    active:
                      !item.active,
                  }
                : item
          )
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Status change করতে সমস্যা হয়েছে।"
      );
    }
  }

  /* =====================================================
     RESET
  ====================================================== */

  function resetForm() {
    setForm(emptyForm);

    setEditingId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  /* =====================================================
     SEARCH
  ====================================================== */

  const filteredProducts =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return products;
      }

      return products.filter(
        (product) => {
          return (
            product.name
              .toLowerCase()
              .includes(value) ||

            product.mainCategoryName
              .toLowerCase()
              .includes(value) ||

            product.categoryName
              .toLowerCase()
              .includes(value) ||

            product.subcategoryName
              .toLowerCase()
              .includes(value)
          );
        }
      );
    }, [
      products,
      search,
    ]);

  /* =====================================================
     PRICE PREVIEW
  ====================================================== */

  if (
    userLoading ||
    loadingData
  ) {
    return (
      <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-white/60">
            Loading Products...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const previewPrice =
    Number(
      form.price || 0
    );

  const previewDiscount =
    Number(
      form.discountValue || 0
    );

  const previewSalePrice =
    form.discountType ===
    "none"
      ? previewPrice
      : calculateSalePrice(
          previewPrice,
          form.discountType,
          previewDiscount
        );

  /* =====================================================
     UI
  ====================================================== */

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase">
              Picko Shop
            </p>

            <h1 className="text-3xl md:text-4xl font-bold mt-1">
              Product Management
            </h1>

            <p className="text-white/50 mt-2">
              Product, image, category,
              price, discount এবং stock
              সব এখান থেকে manage করুন।
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <p className="text-white/40 text-xs">
              Total Products
            </p>

            <p className="text-2xl font-bold text-yellow-400">
              {products.length}
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* MESSAGE */}

        {message && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        {/* PRODUCT FORM */}

        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-7">

          <div className="flex items-center justify-between gap-4 mb-6">

            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                {editingId
                  ? "Edit Product"
                  : "Add New Product"}
              </h2>

              <p className="text-white/40 text-sm mt-1">
                Main Category → Category
                → Subcategory অনুযায়ী
                product add করুন।
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

          {/* BASIC INFO */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* NAME */}

            <div>
              <label className="block text-sm text-white/60 mb-2">
                Product Name *
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  updateForm(
                    "name",
                    e.target.value
                  )
                }
                placeholder="যেমন: Premium Cotton T-Shirt"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
              />
            </div>

            {/* STOCK */}

            <div>
              <label className="block text-sm text-white/60 mb-2">
                Stock
              </label>

              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  updateForm(
                    "stock",
                    e.target.value
                  )
                }
                placeholder="0"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
              />
            </div>

            {/* MAIN CATEGORY */}

            <div>
              <label className="block text-sm text-white/60 mb-2">
                Main Category *
              </label>

              <select
                value={
                  form.mainCategoryId
                }
                onChange={(e) =>
                  handleMainCategoryChange(
                    e.target.value
                  )
                }
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
              >
                <option value="">
                  Select Main Category
                </option>

                {mainCategories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>

              {!mainCategories.length && (
                <p className="text-red-400 text-xs mt-2">
                  আগে Admin → Categories
                  থেকে Main Category
                  তৈরি করুন।
                </p>
              )}
            </div>

            {/* CATEGORY */}

            <div>
              <label className="block text-sm text-white/60 mb-2">
                Category *
              </label>

              <select
                value={
                  form.categoryId
                }
                onChange={(e) =>
                  handleCategoryChange(
                    e.target.value
                  )
                }
                disabled={
                  !form.mainCategoryId
                }
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 disabled:opacity-40"
              >
                <option value="">
                  Select Category
                </option>

                {normalCategories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>

              {form.mainCategoryId &&
                !normalCategories.length && (
                  <p className="text-yellow-400/70 text-xs mt-2">
                    এই Main Category-এর
                    অধীনে এখনো কোনো
                    Category নেই।
                  </p>
                )}
            </div>

            {/* SUBCATEGORY */}

            <div className="md:col-span-2">
              <label className="block text-sm text-white/60 mb-2">
                Subcategory *
              </label>

              <select
                value={
                  form.subcategoryId
                }
                onChange={(e) =>
                  updateForm(
                    "subcategoryId",
                    e.target.value
                  )
                }
                disabled={
                  !form.categoryId
                }
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 disabled:opacity-40"
              >
                <option value="">
                  Select Subcategory
                </option>

                {subcategories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>

              {form.categoryId &&
                !subcategories.length && (
                  <p className="text-yellow-400/70 text-xs mt-2">
                    এই Category-এর অধীনে
                    এখনো কোনো Subcategory
                    নেই।
                  </p>
                )}
            </div>

          </div>

          {/* SELECTED PATH PREVIEW */}

          {(form.mainCategoryId ||
            form.categoryId ||
            form.subcategoryId) && (
            <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">

              <p className="text-xs text-yellow-400/70 uppercase tracking-wider">
                Product Category Path
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">

                <span className="px-3 py-1.5 rounded-lg bg-white/10">
                  {mainCategories.find(
                    (item) =>
                      item.id ===
                      form.mainCategoryId
                  )?.name ||
                    "Main"}
                </span>

                <span className="text-yellow-400">
                  →
                </span>

                <span className="px-3 py-1.5 rounded-lg bg-white/10">
                  {normalCategories.find(
                    (item) =>
                      item.id ===
                      form.categoryId
                  )?.name ||
                    "Category"}
                </span>

                <span className="text-yellow-400">
                  →
                </span>

                <span className="px-3 py-1.5 rounded-lg bg-white/10">
                  {subcategories.find(
                    (item) =>
                      item.id ===
                      form.subcategoryId
                  )?.name ||
                    "Subcategory"}
                </span>

              </div>
            </div>
          )}

          {/* PRICE + DISCOUNT */}

          <div className="mt-6 border border-white/10 rounded-2xl p-5">

            <div className="mb-5">
              <h3 className="font-bold text-lg">
                Price & Discount
              </h3>

              <p className="text-white/40 text-sm mt-1">
                Regular price-এর উপর
                automatic sale price
                তৈরি হবে।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* REGULAR PRICE */}

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Regular Price (৳) *
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    updateForm(
                      "price",
                      e.target.value
                    )
                  }
                  placeholder="1000"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                />
              </div>

              {/* DISCOUNT TYPE */}

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Discount Type
                </label>

                <select
                  value={
                    form.discountType
                  }
                  onChange={(e) =>
                    updateForm(
                      "discountType",
                      e.target.value
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                >
                  <option value="none">
                    No Discount
                  </option>

                  <option value="percentage">
                    Percentage (%)
                  </option>

                  <option value="fixed">
                    Fixed Amount (৳)
                  </option>
                </select>
              </div>

              {/* DISCOUNT VALUE */}

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Discount Value
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.discountValue
                  }
                  disabled={
                    form.discountType ===
                    "none"
                  }
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
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 disabled:opacity-40"
                />
              </div>

            </div>

            {/* DISCOUNT ACTIVE */}

            {form.discountType !==
              "none" && (
              <div className="mt-5">

                <label className="flex items-center gap-3 cursor-pointer">

                  <input
                    type="checkbox"
                    checked={
                      form.discountActive
                    }
                    onChange={(e) =>
                      updateForm(
                        "discountActive",
                        e.target.checked
                      )
                    }
                    className="w-5 h-5 accent-yellow-400"
                  />

                  <span>
                    Discount Active
                  </span>

                </label>

              </div>
            )}

            {/* DATES */}

            {form.discountType !==
              "none" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Discount Start Date
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.discountStartDate
                    }
                    onChange={(e) =>
                      updateForm(
                        "discountStartDate",
                        e.target.value
                      )
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Discount End Date
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.discountEndDate
                    }
                    onChange={(e) =>
                      updateForm(
                        "discountEndDate",
                        e.target.value
                      )
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
                  />
                </div>

              </div>
            )}

            {/* PRICE PREVIEW */}

            {previewPrice > 0 && (
              <div className="mt-5 bg-black/30 rounded-2xl p-5">

                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Price Preview
                </p>

                <div className="flex items-center gap-4 mt-2 flex-wrap">

                  {form.discountType !==
                    "none" && (
                    <span className="text-white/40 line-through text-lg">
                      ৳
                      {previewPrice.toFixed(
                        2
                      )}
                    </span>
                  )}

                  <span className="text-2xl font-bold text-yellow-400">
                    ৳
                    {previewSalePrice.toFixed(
                      2
                    )}
                  </span>

                  {form.discountType ===
                    "percentage" &&
                    previewDiscount >
                      0 && (
                      <span className="bg-red-500/15 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
                        -{previewDiscount}%
                      </span>
                    )}

                  {form.discountType ===
                    "fixed" &&
                    previewDiscount >
                      0 && (
                      <span className="bg-red-500/15 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
                        -৳
                        {previewDiscount}
                      </span>
                    )}

                </div>
              </div>
            )}

          </div>

          {/* DESCRIPTION */}

          <div className="mt-6">

            <label className="block text-sm text-white/60 mb-2">
              Description
            </label>

            <textarea
              value={
                form.description
              }
              onChange={(e) =>
                updateForm(
                  "description",
                  e.target.value
                )
              }
              rows={5}
              placeholder="Product সম্পর্কে বিস্তারিত লিখুন..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60 resize-none"
            />

          </div>

          {/* IMAGES */}

          <div className="mt-6 border border-white/10 rounded-2xl p-5">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

              <div>
                <h3 className="font-bold text-lg">
                  Product Images
                </h3>

                <p className="text-white/40 text-sm mt-1">
                  Phone Gallery থেকে
                  সর্বোচ্চ 6টি ছবি select
                  করুন।
                </p>
              </div>

              <span className="text-sm text-white/50">
                {form.images.length}/6
              </span>

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={uploadImages}
              className="hidden"
            />

            <button
              type="button"
              disabled={
                uploading ||
                form.images.length >=
                  6
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition disabled:opacity-40"
            >
              {uploading
                ? "Uploading..."
                : "📸 Choose From Gallery"}
            </button>

            {form.images.length >
              0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-5">

                {form.images.map(
                  (
                    image,
                    index
                  ) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black"
                    >

                      <img
                        src={image}
                        alt={`Product ${
                          index + 1
                        }`}
                        className="w-full h-full object-cover"
                      />

                      {index ===
                        0 && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full">
                          MAIN
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            index
                          )
                        }
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white hover:bg-red-500 transition"
                      >
                        ×
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* ACTIVE */}

          <div className="mt-6">

            <label className="flex items-center gap-3 cursor-pointer">

              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(e) =>
                  updateForm(
                    "active",
                    e.target.checked
                  )
                }
                className="w-5 h-5 accent-yellow-400"
              />

              <span>
                Product Active
              </span>

            </label>

          </div>

          {/* BUTTONS */}

          <div className="flex flex-col sm:flex-row gap-3 mt-7">

            <button
              type="button"
              disabled={
                loading ||
                uploading
              }
              onClick={
                saveProduct
              }
              className="flex-1 bg-yellow-400 text-black font-bold rounded-xl py-3.5 hover:bg-yellow-300 transition disabled:opacity-40"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "💾 Update Product"
                : "➕ Add Product"}
            </button>

            <button
              type="button"
              onClick={
                resetForm
              }
              className="sm:w-40 bg-white/10 hover:bg-white/15 rounded-xl py-3.5 transition"
            >
              Clear
            </button>

          </div>

        </section>

        {/* PRODUCT LIST */}

        <section>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

            <div>
              <h2 className="text-2xl font-bold">
                All Products
              </h2>

              <p className="text-white/40 text-sm mt-1">
                {filteredProducts.length}
                টি product পাওয়া গেছে।
              </p>
            </div>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search product..."
              className="w-full md:w-80 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-400/60"
            />

          </div>

          {filteredProducts.length ===
          0 ? (
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-10 text-center">

              <div className="text-5xl mb-4">
                📦
              </div>

              <h3 className="text-xl font-bold">
                No Products Found
              </h3>

              <p className="text-white/40 mt-2">
                এখনো কোনো product add
                করা হয়নি।
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

              {filteredProducts.map(
                (product) => (
                  <div
                    key={
                      product.id
                    }
                    className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
                  >

                    {/* IMAGE */}

                    <div className="aspect-square bg-black relative">

                      {product.images?.[0] ? (
                        <img
                          src={
                            product.images[0]
                          }
                          alt={
                            product.name
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          No Image
                        </div>
                      )}

                      {!product.active && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          INACTIVE
                        </span>
                      )}

                      {product.discountType !==
                        "none" &&
                        product.discountActive && (
                          <span className="absolute top-3 right-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                            SALE
                          </span>
                        )}

                    </div>

                    {/* INFO */}

                    <div className="p-4">

                      <h3 className="font-bold text-lg line-clamp-2">
                        {product.name}
                      </h3>

                      {/* CATEGORY PATH */}

                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">

                        {product.mainCategoryName && (
                          <>
                            <span className="text-yellow-400">
                              {product.mainCategoryName}
                            </span>

                            <span className="text-white/20">
                              /
                            </span>
                          </>
                        )}

                        <span className="text-white/50">
                          {product.categoryName ||
                            product.category}
                        </span>

                        {(product.subcategoryName ||
                          product.subCategory) && (
                          <>
                            <span className="text-white/20">
                              /
                            </span>

                            <span className="text-white/40">
                              {product.subcategoryName ||
                                product.subCategory}
                            </span>
                          </>
                        )}

                      </div>

                      {/* PRICE */}

                      <div className="mt-3 flex items-center gap-2 flex-wrap">

                        {product.discountType !==
                          "none" &&
                          product.discountActive && (
                            <span className="text-white/35 line-through text-sm">
                              ৳
                              {product.price.toFixed(
                                2
                              )}
                            </span>
                          )}

                        <span className="text-yellow-400 font-bold text-xl">
                          ৳
                          {(
                            product.discountType !==
                              "none" &&
                            product.discountActive
                              ? product.salePrice
                              : product.price
                          ).toFixed(
                            2
                          )}
                        </span>

                      </div>

                      {/* DISCOUNT */}

                      {product.discountType !==
                        "none" &&
                        product.discountActive && (
                          <p className="text-red-400 text-xs mt-1">

                            {product.discountType ===
                            "percentage"
                              ? `${product.discountValue}% OFF`
                              : `৳${product.discountValue} OFF`}

                          </p>
                        )}

                      {/* STOCK */}

                      <p className="text-white/40 text-sm mt-2">
                        Stock:{" "}
                        <span className="text-white">
                          {product.stock}
                        </span>
                      </p>

                      {/* ACTIONS */}

                      <div className="grid grid-cols-2 gap-2 mt-4">

                        <button
                          onClick={() =>
                            editProduct(
                              product
                            )
                          }
                          className="bg-white/10 hover:bg-white/15 rounded-xl py-2.5 text-sm transition"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteProduct(
                              product.id
                            )
                          }
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl py-2.5 text-sm transition"
                        >
                          🗑️ Delete
                        </button>

                        <button
                          onClick={() =>
                            toggleProduct(
                              product
                            )
                          }
                          className={`col-span-2 rounded-xl py-2.5 text-sm transition ${
                            product.active
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                          }`}
                        >
                          {product.active
                            ? "✓ Active — Click to Deactivate"
                            : "○ Inactive — Click to Activate"}
                        </button>

                      </div>

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