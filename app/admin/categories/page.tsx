"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type CategoryType = "main" | "category" | "subcategory";

type Category = {
  id: string;
  name: string;
  type: CategoryType;

  // Parent information
  parentId?: string;
  parentCategoryId?: string;

  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("main");

  // For Category → Main
  const [mainParentId, setMainParentId] = useState("");

  // For Subcategory → Category
  const [categoryParentId, setCategoryParentId] = useState("");

  const [active, setActive] = useState(true);

  const [openMain, setOpenMain] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // --------------------------------------------------
  // LOAD
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        await loadCategories();
      } catch (error) {
        console.error("Category loading error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function loadCategories() {
    const snapshot = await getDocs(collection(db, "categories"));

    const data = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Category[];

    setCategories(data);
  }

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const mainCategories = useMemo(
    () => categories.filter((item) => item.type === "main"),
    [categories]
  );

  const normalCategories = useMemo(
    () => categories.filter((item) => item.type === "category"),
    [categories]
  );

  const subCategories = useMemo(
    () => categories.filter((item) => item.type === "subcategory"),
    [categories]
  );

  function getCategoriesUnderMain(mainId: string) {
    return normalCategories.filter(
      (item) =>
        item.parentId === mainId ||
        item.parentCategoryId === mainId
    );
  }

  function getSubcategoriesUnderCategory(categoryId: string) {
    return subCategories.filter(
      (item) =>
        item.parentId === categoryId ||
        item.parentCategoryId === categoryId
    );
  }

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  function openAddForm() {
    setEditingId(null);
    setName("");
    setType("main");
    setMainParentId("");
    setCategoryParentId("");
    setActive(true);
    setShowForm(true);
  }

  function openEditForm(item: Category) {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setActive(item.active !== false);

    if (item.type === "category") {
      setMainParentId(item.parentId || item.parentCategoryId || "");
      setCategoryParentId("");
    } else if (item.type === "subcategory") {
      setCategoryParentId(
        item.parentId || item.parentCategoryId || ""
      );
      setMainParentId("");
    } else {
      setMainParentId("");
      setCategoryParentId("");
    }

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setType("main");
    setMainParentId("");
    setCategoryParentId("");
    setActive(true);
  }

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  async function saveCategory() {
    const cleanName = name.trim();

    if (!cleanName) {
      alert("Category name দিন");
      return;
    }

    if (type === "category" && !mainParentId) {
      alert("আগে Main Category select করুন");
      return;
    }

    if (type === "subcategory" && !categoryParentId) {
      alert("আগে Category select করুন");
      return;
    }

    setSaving(true);

    try {
      // Prevent same name under same parent
      const duplicate = categories.find((item) => {
        if (item.id === editingId) return false;

        if (
          item.name.trim().toLowerCase() !==
          cleanName.toLowerCase()
        ) {
          return false;
        }

        if (type === "main") {
          return item.type === "main";
        }

        if (type === "category") {
          return (
            item.type === "category" &&
            (item.parentId === mainParentId ||
              item.parentCategoryId === mainParentId)
          );
        }

        return (
          item.type === "subcategory" &&
          (item.parentId === categoryParentId ||
            item.parentCategoryId === categoryParentId)
        );
      });

      if (duplicate) {
        alert("এই নামের Category একই জায়গায় আগে থেকেই আছে।");
        setSaving(false);
        return;
      }

      const categoryData = {
        name: cleanName,
        type,

        parentId:
          type === "main"
            ? ""
            : type === "category"
            ? mainParentId
            : categoryParentId,

        parentCategoryId:
          type === "main"
            ? ""
            : type === "category"
            ? mainParentId
            : categoryParentId,

        active,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(db, "categories", editingId),
          categoryData
        );

        alert("Category successfully updated ✅");
      } else {
        await addDoc(collection(db, "categories"), {
          ...categoryData,
          createdAt: serverTimestamp(),
        });

        alert("Category successfully added ✅");
      }

      closeForm();
      await loadCategories();
    } catch (error) {
      console.error("Category save error:", error);
      alert(
        "Operation failed. Firestore Rules check করুন।"
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function deleteCategory(id: string) {
    const item = categories.find((x) => x.id === id);

    if (!item) return;

    const children = categories.filter(
      (x) =>
        x.parentId === id ||
        x.parentCategoryId === id
    );

    if (children.length > 0) {
      alert(
        "এই Category-এর নিচে child category আছে। আগে child category delete করুন।"
      );
      return;
    }

    const confirmDelete = confirm(
      `"${item.name}" delete করতে চান?`
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "categories", id));
      await loadCategories();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete করা যায়নি।");
    }
  }

  // --------------------------------------------------
  // ACTIVE / INACTIVE
  // --------------------------------------------------

  async function toggleActive(item: Category) {
    try {
      await updateDoc(doc(db, "categories", item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
      });

      await loadCategories();
    } catch (error) {
      console.error("Status change error:", error);
      alert("Status change করা যায়নি।");
    }
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-4 text-sm text-gray-400 transition hover:text-white"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold md:text-4xl">
              Categories Management
            </h1>

            <p className="mt-2 text-gray-400">
              Main → Category → Subcategory manage করুন।
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black transition hover:bg-yellow-400"
          >
            + Add Category
          </button>
        </div>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-gray-400">
              Main Categories
            </p>

            <p className="mt-2 text-3xl font-bold">
              {mainCategories.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-gray-400">
              Categories
            </p>

            <p className="mt-2 text-3xl font-bold">
              {normalCategories.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-gray-400">
              Subcategories
            </p>

            <p className="mt-2 text-3xl font-bold">
              {subCategories.length}
            </p>
          </div>
        </div>

        {/* FORM */}
        {showForm && (
          <div className="mb-8 rounded-3xl border border-yellow-500/20 bg-white/[0.04] p-6 md:p-8">

            <div className="mb-7 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingId
                    ? "Edit / Rename Category"
                    : "Add New Category"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Main → Category → Subcategory
                </p>
              </div>

              <button
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

              {/* TYPE */}
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(e) => {
                    const value =
                      e.target.value as CategoryType;

                    setType(value);

                    if (value === "main") {
                      setMainParentId("");
                      setCategoryParentId("");
                    }

                    if (value === "category") {
                      setCategoryParentId("");
                    }

                    if (value === "subcategory") {
                      setMainParentId("");
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-500"
                >
                  <option value="main">
                    Main Category
                  </option>

                  <option value="category">
                    Category
                  </option>

                  <option value="subcategory">
                    Subcategory
                  </option>
                </select>
              </div>

              {/* MAIN PARENT */}
              {type === "category" && (
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Main Category
                  </label>

                  <select
                    value={mainParentId}
                    onChange={(e) =>
                      setMainParentId(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="">
                      Select Main Category
                    </option>

                    {mainCategories.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CATEGORY PARENT */}
              {type === "subcategory" && (
                <div>
                  <label className="mb-2 block text-sm text-gray-300">
                    Parent Category
                  </label>

                  <select
                    value={categoryParentId}
                    onChange={(e) =>
                      setCategoryParentId(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="">
                      Select Category
                    </option>

                    {normalCategories.map((item) => {
                      const mainParent =
                        mainCategories.find(
                          (main) =>
                            main.id ===
                            (item.parentId ||
                              item.parentCategoryId)
                        );

                      return (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {mainParent
                            ? `${mainParent.name} → `
                            : ""}
                          {item.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* NAME */}
              <div
                className={
                  type === "main"
                    ? "md:col-span-2"
                    : ""
                }
              >
                <label className="mb-2 block text-sm text-gray-300">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder={
                    type === "main"
                      ? "Example: Fashion"
                      : type === "category"
                      ? "Example: Shirt"
                      : "Example: T-Shirt"
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-yellow-500"
                />
              </div>

              {/* STATUS */}
              {editingId && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-4 md:col-span-2">
                  <div>
                    <p className="font-medium">
                      Category Status
                    </p>

                    <p className="text-sm text-gray-500">
                      Inactive করলে website-এ দেখানো হবে না।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActive(!active)
                    }
                    className={`relative h-7 w-14 rounded-full transition ${
                      active
                        ? "bg-yellow-500"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        active
                          ? "left-8"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* BUTTONS */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeForm}
                className="rounded-xl border border-white/10 px-6 py-3 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                onClick={saveCategory}
                disabled={saving}
                className="rounded-xl bg-yellow-500 px-7 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update / Rename"
                  : "Save Category"}
              </button>
            </div>
          </div>
        )}

        {/* CATEGORY STRUCTURE */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-8">

          <div className="mb-7">
            <h2 className="text-2xl font-bold">
              Category Structure
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Main → Category → Subcategory
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">
              Loading categories...
            </div>
          ) : mainCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <div className="mb-4 text-5xl">
                📂
              </div>

              <h3 className="text-xl font-semibold">
                No Main Categories Yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                প্রথমে একটি Main Category তৈরি করুন।
              </p>

              <button
                onClick={openAddForm}
                className="mt-6 rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400"
              >
                + Create Main Category
              </button>
            </div>
          ) : (
            <div className="space-y-4">

              {mainCategories.map((main) => {
                const childCategories =
                  getCategoriesUnderMain(main.id);

                const isMainOpen =
                  openMain === main.id;

                return (
                  <div
                    key={main.id}
                    className="rounded-2xl border border-white/10 bg-black/30"
                  >

                    {/* MAIN */}
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

                      <button
                        onClick={() =>
                          setOpenMain(
                            isMainOpen
                              ? null
                              : main.id
                          )
                        }
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-xl">
                          📁
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            {main.name}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Main Category
                            </span>

                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                main.active
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {main.active
                                ? "Active"
                                : "Inactive"}
                            </span>

                            <span className="text-xs text-gray-500">
                              {childCategories.length}{" "}
                              Category
                            </span>
                          </div>
                        </div>

                        <span className="ml-auto text-gray-400">
                          {isMainOpen ? "⌃" : "⌄"}
                        </span>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            openEditForm(main)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() =>
                            toggleActive(main)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                        >
                          {main.active
                            ? "Disable"
                            : "Enable"}
                        </button>

                        <button
                          onClick={() =>
                            deleteCategory(main.id)
                          }
                          className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* CATEGORY LEVEL */}
                    {isMainOpen && (
                      <div className="border-t border-white/10 px-4 py-4 md:px-6">

                        {childCategories.length ===
                        0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">
                            এই Main Category-এর কোনো Category নেই।
                          </div>
                        ) : (
                          <div className="space-y-3">

                            {childCategories.map(
                              (category) => {
                                const children =
                                  getSubcategoriesUnderCategory(
                                    category.id
                                  );

                                const isCategoryOpen =
                                  openCategory ===
                                  category.id;

                                return (
                                  <div
                                    key={category.id}
                                    className="rounded-xl border border-white/10 bg-white/[0.03]"
                                  >

                                    {/* CATEGORY */}
                                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">

                                      <button
                                        onClick={() =>
                                          setOpenCategory(
                                            isCategoryOpen
                                              ? null
                                              : category.id
                                          )
                                        }
                                        className="flex min-w-0 items-center gap-3 text-left"
                                      >
                                        <span className="text-lg">
                                          📂
                                        </span>

                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">
                                              {category.name}
                                            </span>

                                            <span
                                              className={`rounded-full px-2 py-1 text-[10px] ${
                                                category.active
                                                  ? "bg-green-500/10 text-green-400"
                                                  : "bg-red-500/10 text-red-400"
                                              }`}
                                            >
                                              {category.active
                                                ? "Active"
                                                : "Inactive"}
                                            </span>
                                          </div>

                                          <p className="mt-1 text-xs text-gray-500">
                                            {children.length}{" "}
                                            Subcategory
                                          </p>
                                        </div>

                                        <span className="ml-auto text-gray-400">
                                          {isCategoryOpen
                                            ? "⌃"
                                            : "⌄"}
                                        </span>
                                      </button>

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          onClick={() =>
                                            openEditForm(
                                              category
                                            )
                                          }
                                          className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                        >
                                          ✏️ Edit
                                        </button>

                                        <button
                                          onClick={() =>
                                            toggleActive(
                                              category
                                            )
                                          }
                                          className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                        >
                                          {category.active
                                            ? "Disable"
                                            : "Enable"}
                                        </button>

                                        <button
                                          onClick={() =>
                                            deleteCategory(
                                              category.id
                                            )
                                          }
                                          className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>

                                    {/* SUBCATEGORY */}
                                    {isCategoryOpen && (
                                      <div className="border-t border-white/10 px-4 py-3">

                                        {children.length ===
                                        0 ? (
                                          <div className="p-4 text-sm text-gray-500">
                                            কোনো Subcategory নেই।
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {children.map(
                                              (sub) => (
                                                <div
                                                  key={
                                                    sub.id
                                                  }
                                                  className="flex flex-col gap-3 rounded-lg bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-gray-500">
                                                      └─
                                                    </span>

                                                    <span>
                                                      {sub.name}
                                                    </span>

                                                    <span
                                                      className={`rounded-full px-2 py-1 text-[10px] ${
                                                        sub.active
                                                          ? "bg-green-500/10 text-green-400"
                                                          : "bg-red-500/10 text-red-400"
                                                      }`}
                                                    >
                                                      {sub.active
                                                        ? "Active"
                                                        : "Inactive"}
                                                    </span>
                                                  </div>

                                                  <div className="flex flex-wrap gap-2">
                                                    <button
                                                      onClick={() =>
                                                        openEditForm(
                                                          sub
                                                        )
                                                      }
                                                      className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                                    >
                                                      ✏️ Edit
                                                    </button>

                                                    <button
                                                      onClick={() =>
                                                        toggleActive(
                                                          sub
                                                        )
                                                      }
                                                      className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                                    >
                                                      {sub.active
                                                        ? "Disable"
                                                        : "Enable"}
                                                    </button>

                                                    <button
                                                      onClick={() =>
                                                        deleteCategory(
                                                          sub.id
                                                        )
                                                      }
                                                      className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}