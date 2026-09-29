"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  UserPlus,
  Phone,
  ArrowLeft,
  CheckCircle2,
  LogIn,
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

export default function LoginPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Previously saved login information
    try {
      const saved = localStorage.getItem("picko_saved_login");

      if (saved) {
        const data = JSON.parse(saved);

        if (data.phone) {
          setPhone(data.phone);
        }

        if (data.password) {
          setPassword(data.password);
        }
      }
    } catch (error) {
      console.error("Saved login read error:", error);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      setError("Please enter your mobile number.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setError("Please enter a valid Bangladesh mobile number.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoggingIn(true);

    try {
      const authEmail = phoneToAuthEmail(phone);

      await signInWithEmailAndPassword(
        auth,
        authEmail,
        password
      );

      // Remember login information
      localStorage.setItem(
        "picko_saved_login",
        JSON.stringify({
          phone: cleanPhone,
          password: password,
        })
      );

      setSuccess("Login successful! Welcome to Picko Shop.");

      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: any) {
      console.error(err);

      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
      ) {
        setError("Mobile number or password is incorrect.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many attempts. Please wait a little and try again."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      setSuccess("Google Login successful!");

      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: any) {
      console.error(err);

      if (err?.code === "auth/popup-closed-by-user") {
        setError("Google Login cancelled.");
      } else if (err?.code === "auth/popup-blocked") {
        setError(
          "Popup was blocked. Please allow popups for this website."
        );
      } else {
        setError("Google Login failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#d4a72c]/20 blur-2xl animate-pulse" />

            <Loader2
              size={38}
              className="relative animate-spin text-[#d4a72c]"
            />
          </div>

          <p className="text-xs text-gray-500 animate-pulse">
            Checking Picko Shop...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10 text-white">

      {/* Animated background glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#d4a72c]/10 blur-[120px] animate-pulse" />

      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#d4a72c]/10 blur-[120px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d4a72c]/5 animate-[spin_20s_linear_infinite]" />

      {/* Main card */}
      <div className="relative w-full max-w-md animate-[fadeIn_0.7s_ease-out]">

        <div className="relative overflow-hidden rounded-[30px] border border-[#d4a72c]/20 bg-[#0b0b0b]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">

          {/* Top shine */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4a72c]/70 to-transparent" />

          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#d4a72c]/20 blur-2xl animate-pulse" />

              <Image
                src="/picko-logo.png"
                alt="Picko Shop"
                width={190}
                height={95}
                priority
                className="relative w-[155px] object-contain transition duration-500 hover:scale-105 sm:w-[175px]"
              />
            </div>
          </div>

          {/* Heading */}
          <div className="mt-5 text-center">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-[#d4a72c]">
              WELCOME TO
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Picko Shop
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Login করে shopping শুরু করুন
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400 animate-[fadeIn_0.3s_ease-out]">
              <CheckCircle2 size={19} />
              <span>{success}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[shake_0.35s_ease-in-out]">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loggingIn}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 text-sm font-bold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Google Login হচ্ছে...
              </>
            ) : (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-lg font-bold">
                  G
                </span>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />

            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600">
              OR
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin}>

            {/* Mobile */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Mobile Number
              </label>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-1 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

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
            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Password
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-1 transition duration-300 focus-within:border-[#d4a72c]/60 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_25px_rgba(212,167,44,0.08)]">

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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            {/* Forgot */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setError(
                    "Password reset system আমরা পরের ধাপে সেট করব।"
                  );
                }}
                className="text-xs font-medium text-[#d4a72c] transition hover:text-[#e4bd50] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Continue */}
            <button
              type="submit"
              disabled={loggingIn}
              className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4a72c] via-[#e1b83e] to-[#d4a72c] py-3.5 text-sm font-bold text-black shadow-lg shadow-[#d4a72c]/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d4a72c]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingIn ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  Login হচ্ছে...
                </>
              ) : (
                <>
                  <LogIn
                    size={18}
                    className="transition group-hover:translate-x-0.5"
                  />
                  Continue
                </>
              )}
            </button>
          </form>

          {/* Register */}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-gray-300 transition duration-300 hover:-translate-y-0.5 hover:border-[#d4a72c]/40 hover:bg-[#d4a72c]/5 hover:text-[#d4a72c]"
          >
            <UserPlus size={18} />
            Create New Account
          </button>

          {/* Security */}
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-gray-600">
            <ShieldCheck
              size={15}
              className="text-[#d4a72c]"
            />
            Secure & Protected
          </div>

          {/* Terms */}
          <p className="mt-5 text-center text-[10px] leading-5 text-gray-700">
            By continuing, you agree to Picko Shop's
            <br />
            Terms of Service & Privacy Policy.
          </p>
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