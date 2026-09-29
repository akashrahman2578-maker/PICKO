"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/app/lib/firebase";

type HomepageSettings = {
  hero: boolean;
  featured: boolean;
  categories: boolean;
  offers: boolean;
  products: boolean;

  announcementEnabled: boolean;
  announcementText: string;

  heroTitle: string;
  heroSubtitle: string;

  featuredTitle: string;
  featuredSubtitle: string;

  categoriesTitle: string;
  categoriesSubtitle: string;

  productsTitle: string;
  productsSubtitle: string;

  updatedAt?: unknown;
};

const DEFAULT_SETTINGS: HomepageSettings = {
  hero: true,
  featured: true,
  categories: true,
  offers: true,
  products: true,

  announcementEnabled: true,
  announcementText:
    "পিকো শপে স্বাগতম — আপনার পছন্দ, আমাদের দায়িত্ব",

  heroTitle:
    "আপনার পছন্দের পণ্য এখন Picko Shop-এ",

  heroSubtitle:
    "সহজে খুঁজুন, সহজে অর্ডার করুন এবং দ্রুত ডেলিভারি পান।",

  featuredTitle:
    "Featured Products",

  featuredSubtitle:
    "আমাদের নির্বাচিত জনপ্রিয় পণ্যগুলো দেখুন।",

  categoriesTitle:
    "Shop by Category",

  categoriesSubtitle:
    "আপনার পছন্দের category বেছে নিন।",

  productsTitle:
    "All Products",

  productsSubtitle:
    "Picko Shop-এর সব পণ্য একসাথে দেখুন।",
};

export default function AdminHomepagePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [adminName, setAdminName] =
    useState("Admin");

  const [settings, setSettings] =
    useState<HomepageSettings>(
      DEFAULT_SETTINGS
    );

  /* =====================================================
     ADMIN AUTH
  ====================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        try {
          const adminRef = doc(
            db,
            "admins",
            user.uid
          );

          const adminSnap =
            await getDoc(adminRef);

          if (!adminSnap.exists()) {
            router.replace("/");
            return;
          }

          const adminData =
            adminSnap.data();

          if (
            adminData.role !== "admin" ||
            adminData.active !== true
          ) {
            router.replace("/");
            return;
          }

          setAdminName(
            adminData.name || "Admin"
          );

          setLoading(false);
        } catch (error) {
          console.error(
            "Admin verification error:",
            error
          );

          router.replace("/");
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  /* =====================================================
     REALTIME HOMEPAGE SETTINGS
  ====================================================== */

  useEffect(() => {
    if (loading) return;

    const settingsRef = doc(
      db,
      "homepageSettings",
      "main"
    );

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSettings(DEFAULT_SETTINGS);
          return;
        }

        const data = snapshot.data();

        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        });
      },
      (error) => {
        console.error(
          "Homepage settings error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [loading]);

  /* =====================================================
     UPDATE FIELD
  ====================================================== */

  const updateSetting = <
    K extends keyof HomepageSettings
  >(
    key: K,
    value: HomepageSettings[K]
  ) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
  };

  /* =====================================================
     SAVE
  ====================================================== */

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await setDoc(
        doc(
          db,
          "homepageSettings",
          "main"
        ),
        {
          ...settings,
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Homepage save error:",
        error
      );

      alert(
        "Homepage settings save করা যায়নি।"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     RESET
  ====================================================== */

  const resetSettings = () => {
    const confirmed =
      window.confirm(
        "Homepage settings default অবস্থায় ফিরিয়ে আনবেন?"
      );

    if (!confirmed) return;

    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  };

  /* =====================================================
     LOGOUT
  ====================================================== */

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-yellow-500/20 border-t-yellow-400 animate-spin" />

          <p className="mt-5 text-yellow-400 font-semibold">
            Loading Homepage Manager...
          </p>

          <p className="text-gray-600 text-xs mt-2">
            Checking admin access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">

      {/* =================================================
          TOPBAR
      ================================================= */}

      <header className="sticky top-0 z-50 h-20 bg-[#0b0b0b]/95 backdrop-blur-xl border-b border-white/10">

        <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                router.push("/admin")
              }
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              ←
            </button>

            <div>

              <p className="text-[10px] uppercase tracking-[0.25em] text-gray-600">
                Picko Shop Admin
              </p>

              <h1 className="text-lg sm:text-xl font-black">
                Homepage Manager
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                window.open(
                  "/",
                  "_blank"
                )
              }
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              🌐 View Website
            </button>

            <div className="w-10 h-10 rounded-xl bg-yellow-500 text-black flex items-center justify-center font-black">
              {adminName
                .charAt(0)
                .toUpperCase()}
            </div>

          </div>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">

        {/* HEADER */}

        <div className="mb-8 animate-[fadeUp_.45s_ease-out]">

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">

            <div>

              <div className="flex items-center gap-2">

                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />

                <span className="text-xs text-green-400 font-semibold">
                  REALTIME CONNECTED
                </span>

              </div>

              <h2 className="text-3xl sm:text-4xl font-black mt-3">
                Homepage Control
              </h2>

              <p className="text-gray-500 mt-2 max-w-2xl">
                এখান থেকে Customer Website-এর
                Homepage-এর গুরুত্বপূর্ণ section
                চালু বা বন্ধ করতে এবং text পরিবর্তন
                করতে পারবে।
              </p>

            </div>

            <div className="flex gap-3">

              <button
                onClick={resetSettings}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
              >
                Reset
              </button>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50 transition shadow-lg shadow-yellow-500/10"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

          {saved && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-[fadeUp_.25s_ease-out]">
              ✓ Homepage settings successfully
              saved. Customer website will update
              automatically.
            </div>
          )}

        </div>

        {/* =================================================
            LIVE SECTION CONTROL
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-6">

          <div className="mb-6">

            <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">
              Homepage Sections
            </p>

            <h3 className="text-2xl font-black mt-2">
              Section Control
            </h3>

            <p className="text-sm text-gray-600 mt-1">
              OFF করলে customer website-এ
              সেই section আর দেখাবে না।
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <ToggleCard
              icon="🎬"
              title="Hero Section"
              description="Homepage-এর main hero / best selling area"
              enabled={settings.hero}
              onToggle={() =>
                updateSetting(
                  "hero",
                  !settings.hero
                )
              }
            />

            <ToggleCard
              icon="⭐"
              title="Featured Products"
              description="Featured product section"
              enabled={settings.featured}
              onToggle={() =>
                updateSetting(
                  "featured",
                  !settings.featured
                )
              }
            />

            <ToggleCard
              icon="🗂️"
              title="Categories"
              description="Category browsing section"
              enabled={settings.categories}
              onToggle={() =>
                updateSetting(
                  "categories",
                  !settings.categories
                )
              }
            />

            <ToggleCard
              icon="🎟️"
              title="Offers"
              description="Offers / promotional section"
              enabled={settings.offers}
              onToggle={() =>
                updateSetting(
                  "offers",
                  !settings.offers
                )
              }
            />

            <ToggleCard
              icon="📦"
              title="All Products"
              description="All products section"
              enabled={settings.products}
              onToggle={() =>
                updateSetting(
                  "products",
                  !settings.products
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            ANNOUNCEMENT
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-6">

          <div className="flex items-start justify-between gap-4 mb-6">

            <div>

              <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">
                Announcement
              </p>

              <h3 className="text-2xl font-black mt-2">
                Top Announcement
              </h3>

              <p className="text-sm text-gray-600 mt-1">
                Website-এর উপরের promotional
                message।
              </p>

            </div>

            <ToggleSwitch
              enabled={
                settings.announcementEnabled
              }
              onClick={() =>
                updateSetting(
                  "announcementEnabled",
                  !settings.announcementEnabled
                )
              }
            />

          </div>

          <label className="text-xs text-gray-500">
            Announcement Text
          </label>

          <input
            value={
              settings.announcementText
            }
            onChange={(event) =>
              updateSetting(
                "announcementText",
                event.target.value
              )
            }
            placeholder="Announcement লিখুন..."
            className="mt-2 w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-white outline-none focus:border-yellow-500/50 transition"
          />

        </section>

        {/* =================================================
            HERO TEXT
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-6">

          <SectionHeading
            icon="🎬"
            eyebrow="Hero"
            title="Hero Section Content"
            description="Homepage-এর প্রধান heading এবং subtitle।"
          />

          <div className="grid md:grid-cols-2 gap-5">

            <InputField
              label="Hero Title"
              value={settings.heroTitle}
              onChange={(value) =>
                updateSetting(
                  "heroTitle",
                  value
                )
              }
              placeholder="Hero title..."
            />

            <InputField
              label="Hero Subtitle"
              value={settings.heroSubtitle}
              onChange={(value) =>
                updateSetting(
                  "heroSubtitle",
                  value
                )
              }
              placeholder="Hero subtitle..."
            />

          </div>

        </section>

        {/* =================================================
            FEATURED
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-6">

          <SectionHeading
            icon="⭐"
            eyebrow="Featured"
            title="Featured Products Content"
            description="Featured product section-এর title ও subtitle।"
          />

          <div className="grid md:grid-cols-2 gap-5">

            <InputField
              label="Featured Title"
              value={
                settings.featuredTitle
              }
              onChange={(value) =>
                updateSetting(
                  "featuredTitle",
                  value
                )
              }
              placeholder="Featured Products"
            />

            <InputField
              label="Featured Subtitle"
              value={
                settings.featuredSubtitle
              }
              onChange={(value) =>
                updateSetting(
                  "featuredSubtitle",
                  value
                )
              }
              placeholder="Featured subtitle..."
            />

          </div>

        </section>

        {/* =================================================
            CATEGORIES
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-6">

          <SectionHeading
            icon="🗂️"
            eyebrow="Categories"
            title="Category Section Content"
            description="Customer homepage-এর category section।"
          />

          <div className="grid md:grid-cols-2 gap-5">

            <InputField
              label="Categories Title"
              value={
                settings.categoriesTitle
              }
              onChange={(value) =>
                updateSetting(
                  "categoriesTitle",
                  value
                )
              }
              placeholder="Shop by Category"
            />

            <InputField
              label="Categories Subtitle"
              value={
                settings.categoriesSubtitle
              }
              onChange={(value) =>
                updateSetting(
                  "categoriesSubtitle",
                  value
                )
              }
              placeholder="Category subtitle..."
            />

          </div>

        </section>

        {/* =================================================
            PRODUCTS
        ================================================= */}

        <section className="bg-[#111] border border-white/10 rounded-3xl p-5 sm:p-7 mb-8">

          <SectionHeading
            icon="📦"
            eyebrow="Products"
            title="Products Section Content"
            description="All Products section-এর title ও subtitle।"
          />

          <div className="grid md:grid-cols-2 gap-5">

            <InputField
              label="Products Title"
              value={
                settings.productsTitle
              }
              onChange={(value) =>
                updateSetting(
                  "productsTitle",
                  value
                )
              }
              placeholder="All Products"
            />

            <InputField
              label="Products Subtitle"
              value={
                settings.productsSubtitle
              }
              onChange={(value) =>
                updateSetting(
                  "productsSubtitle",
                  value
                )
              }
              placeholder="Products subtitle..."
            />

          </div>

        </section>

        {/* =================================================
            PREVIEW
        ================================================= */}

        <section className="bg-gradient-to-br from-yellow-500/10 via-[#111] to-[#111] border border-yellow-500/20 rounded-3xl p-6 sm:p-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

            <div>

              <p className="text-yellow-400 text-xs uppercase tracking-widest font-bold">
                Live Preview
              </p>

              <h3 className="text-2xl font-black mt-2">
                Homepage Status
              </h3>

              <p className="text-gray-500 text-sm mt-2">
                নিচের status-গুলো Firestore-এর
                current settings অনুযায়ী।
              </p>

            </div>

            <button
              onClick={() =>
                window.open(
                  "/",
                  "_blank"
                )
              }
              className="px-5 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition"
            >
              Open Customer Website →
            </button>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-7">

            <StatusPill
              title="Hero"
              enabled={settings.hero}
            />

            <StatusPill
              title="Featured"
              enabled={settings.featured}
            />

            <StatusPill
              title="Categories"
              enabled={settings.categories}
            />

            <StatusPill
              title="Offers"
              enabled={settings.offers}
            />

            <StatusPill
              title="Products"
              enabled={settings.products}
            />

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 text-xs text-gray-600">

          <p>
            Picko Shop Admin • Homepage Manager
          </p>

          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 transition"
          >
            Logout
          </button>

        </div>

      </main>

      {/* =================================================
          ANIMATION
      ================================================= */}

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: #333 transparent;
        }
      `}</style>

    </div>
  );
}

/* =====================================================
   TOGGLE CARD
===================================================== */

function ToggleCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`
        group
        rounded-2xl
        border
        p-5
        transition-all
        duration-300
        ${
          enabled
            ? "border-green-500/20 bg-green-500/[0.04]"
            : "border-white/10 bg-black/20 opacity-70"
        }
      `}
    >

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-4 min-w-0">

          <div className="w-12 h-12 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-105 transition">
            {icon}
          </div>

          <div className="min-w-0">

            <h4 className="font-bold">
              {title}
            </h4>

            <p className="text-xs text-gray-600 mt-1">
              {description}
            </p>

          </div>

        </div>

        <ToggleSwitch
          enabled={enabled}
          onClick={onToggle}
        />

      </div>

      <div className="mt-4">

        <span
          className={`
            text-[10px]
            px-2.5
            py-1
            rounded-full
            ${
              enabled
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }
          `}
        >
          {enabled
            ? "● VISIBLE ON WEBSITE"
            : "● HIDDEN FROM WEBSITE"}
        </span>

      </div>

    </div>
  );
}

/* =====================================================
   TOGGLE
===================================================== */

function ToggleSwitch({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle"
      className={`
        relative
        w-12
        h-7
        rounded-full
        transition-all
        duration-300
        shrink-0
        ${
          enabled
            ? "bg-green-500"
            : "bg-gray-700"
        }
      `}
    >

      <span
        className={`
          absolute
          top-1
          w-5
          h-5
          rounded-full
          bg-white
          shadow-md
          transition-all
          duration-300
          ${
            enabled
              ? "left-6"
              : "left-1"
          }
        `}
      />

    </button>
  );
}

/* =====================================================
   SECTION HEADING
===================================================== */

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">

      <div className="flex items-center gap-2">

        <span className="text-xl">
          {icon}
        </span>

        <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">
          {eyebrow}
        </span>

      </div>

      <h3 className="text-2xl font-black mt-2">
        {title}
      </h3>

      <p className="text-sm text-gray-600 mt-1">
        {description}
      </p>

    </div>
  );
}

/* =====================================================
   INPUT
===================================================== */

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>

      <label className="text-xs text-gray-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-white outline-none focus:border-yellow-500/50 transition"
      />

    </div>
  );
}

/* =====================================================
   STATUS PILL
===================================================== */

function StatusPill({
  title,
  enabled,
}: {
  title: string;
  enabled: boolean;
}) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-3 text-center">

      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p
        className={`text-xs font-bold mt-2 ${
          enabled
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {enabled
          ? "✓ ON"
          : "✕ OFF"}
      </p>

    </div>
  );
}