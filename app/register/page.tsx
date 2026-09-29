"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import {
  Loader2,
  Eye,
  EyeOff,
  Phone,
  Lock,
  User,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

const PHONE_EMAIL_DOMAIN = "@customer.pickoshop.local";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("880")) {
    return digits.substring(3);
  }

  if (digits.startsWith("0")) {
    return digits.substring(1);
  }

  return digits;
}

function phoneToAuthEmail(phone: string) {
  const clean = normalizePhone(phone);
  return `${clean}${PHONE_EMAIL_DOMAIN}`;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanPhone = normalizePhone(phone);
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setError(
        "Please enter a valid Bangladesh mobile number."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Phone number is converted into an internal
       * Firebase email identifier.
       *
       * Customer never sees or needs this email.
       */
      const authEmail =
        phoneToAuthEmail(cleanPhone);

      // Create Firebase account
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          authEmail,
          password
        );

      const firebaseUser = credential.user;

      // Save display name
      await updateProfile(firebaseUser, {
        displayName: cleanName,
      });

      // Save customer information in Firestore
      await setDoc(
        doc(db, "users", firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          name: cleanName,
          phone: "+880" + cleanPhone,
          role: "customer",
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      /*
       * Save login information so the Login form
       * can automatically show it next time.
       */
      localStorage.setItem(
        "picko_saved_login",
        JSON.stringify({
          phone: cleanPhone,
          password: password,
        })
      );

      /*
       * Immediately sign out.
       *
       * User specifically wants:
       * Registration → Login page
       * Then press Continue → Homepage
       */
      await auth.signOut();

      setSuccess(
        "Account created successfully! Login page-এ নেওয়া হচ্ছে..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (err: any) {
      console.error(err);

      if (
        err?.code === "auth/email-already-in-use"
      ) {
        setError(
          "এই mobile number দিয়ে account already আছে। Login করুন।"
        );
      } else if (
        err?.code === "auth/weak-password"
      ) {
        setError(
          "Password আরও strong করুন।"
        );
      } else {
        setError(
          "Account তৈরি করা যায়নি। আবার চেষ্টা করুন।"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(
        auth,
        provider
      );

      if (result.user) {
        const firebaseUser = result.user;

        if (!firebaseUser.displayName && name.trim()) {
          await updateProfile(firebaseUser, {
            displayName: name.trim(),
          });
        }

        await setDoc(
          doc(db, "users", firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              name.trim() ||
              "Picko Customer",
            email: firebaseUser.email || "",
            phone: "",
            role: "customer",
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        router.push("/");
      }
    } catch (err: any) {
      console.error(err);

      if (
        err?.code ===
        "auth/popup-closed-by-user"
      ) {
        setError(
          "Google registration cancelled."
        );
      } else if (
        err?.code === "auth/popup-blocked"
      ) {
        setError(
          "Popup blocked. Please allow popups."
        );
      } else {
        setError(
          "Google registration failed. Please try again."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10 text-white">

      {/* Background animation */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[430px] w-[430px] rounded-full bg-[#d4a72c]/10 blur-[120px] animate-pulse" />

      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[430px] w-[430px] rounded-full bg-[#d4a72c]/10 blur-[120px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative w-full max-w-md animate-[fadeIn_0.7s_ease-out]">

        {/* Card */}
        <div className="relative overflow-hidden rounded-[30px] border border-[#d4a72c]/20 bg-[#0b0b0b]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">

          {/* Top shine */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4a72c]/70 to-transparent" />

          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#d4a72c]/20 blur-2xl animate-pulse" />

              <Image
                src="/picko-logo.png"
                alt="Picko Shop"
                width={190}
                height={95}
                priority
                className="relative w-[145px] object-contain transition duration-500 hover:scale-105 sm:w-[165px]"
              />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-[#d4a72c]">
              PICKO SHOP
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Create Account
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Mobile number দিয়ে সহজে account খুলুন
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-[fadeIn_0.3s_ease-out]">
              <CheckCircle2 size={19} />
              <span>{success}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[shake_0.35s_ease-in-out]">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white text-sm font-bold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Connecting...
              </>
            ) : (
              <>
                <span className="text-lg font-bold">
                  G
                </span>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-600">
              OR MOBILE
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Form */}
          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >

            {/* Name */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Full Name
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

                <User
                  size={18}
                  className="text-gray-600"
                />

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-700"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Mobile Number
              </label>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

                <div className="flex items-center gap-1 border-r border-white/10 py-2 pr-3 text-sm text-gray-400">
                  🇧🇩
                  <span>+880</span>
                </div>

                <Phone
                  size={18}
                  className="text-gray-600"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="1XXXXXXXXX"
                  maxLength={11}
                  autoComplete="tel"
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-700"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Password
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

                <Lock
                  size={18}
                  className="text-gray-600"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-700"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="text-gray-600 transition hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Confirm Password
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

                <Lock
                  size={18}
                  className="text-gray-600"
                />

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-gray-700"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="text-gray-600 transition hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-2xl border border-[#d4a72c]/10 bg-[#d4a72c]/[0.04] p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d4a72c]/10">
                  <ShieldCheck
                    size={16}
                    className="text-[#d4a72c]"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-200">
                    Quick & Easy
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    শুধু mobile number ও password
                    দিয়েই account খুলতে পারবেন।
                    Registration শেষে Login page-এ
                    চলে যাবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Create Account */}
            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4a72c] via-[#e1b83e] to-[#d4a72c] text-sm font-bold text-black shadow-lg shadow-[#d4a72c]/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d4a72c]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus
                    size={18}
                    className="transition group-hover:scale-110"
                  />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login */}
          <div className="mt-7 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="font-semibold text-[#d4a72c] transition hover:text-[#e4bd50] hover:underline"
              >
                Login
              </button>
            </p>
          </div>

          {/* Security */}
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <ShieldCheck
                size={15}
                className="text-[#d4a72c]"
              />
              <span>Secure & Private</span>
              <span>•</span>
              <span>Picko Shop</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mx-auto mt-5 flex items-center gap-2 text-xs text-gray-600 transition hover:text-gray-300"
        >
          <ArrowLeft size={14} />
          Back to Picko Shop
        </button>

        <p className="mt-4 text-center text-[10px] leading-5 text-gray-700">
          By creating an account, you agree to Picko
          Shop's Terms of Service & Privacy Policy.
        </p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
      `}</style>
    </main>
  );
}