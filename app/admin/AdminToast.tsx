"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ToastType = "success" | "error" | "info";

const toneClasses: Record<ToastType, string> = {
  success: "border-emerald-300/40 bg-emerald-500/20 text-emerald-100",
  error: "border-rose-300/40 bg-rose-500/20 text-rose-100",
  info: "border-sky-300/40 bg-sky-500/20 text-sky-100",
};

const ADMIN_SCROLL_KEY = "admin:scrollY";
const ADMIN_SCROLL_SAVED_AT_KEY = "admin:scrollSavedAt";

function safeSessionGet(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function safeSessionRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

function cleanupScrollLocks() {
  try {
    const body = document.body;
    // Defensive cleanup in case an older build left body locked.
    if (body.style.position === "fixed") {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
    }
    if (body.dataset.adminScrollLock) {
      delete body.dataset.adminScrollLock;
    }
  } catch {
    // ignore in non-browser edge-cases
  }
}

export default function AdminToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const toastPayload = useMemo(() => {
    const message = searchParams.get("toast");
    const typeParam = searchParams.get("toastType");
    const type: ToastType = typeParam === "error" || typeParam === "info" ? typeParam : "success";
    return message ? { message, type } : null;
  }, [searchParams]);

  useEffect(() => {
    cleanupScrollLocks();
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      safeSessionSet(ADMIN_SCROLL_KEY, String(window.scrollY));
      safeSessionSet(ADMIN_SCROLL_SAVED_AT_KEY, String(Date.now()));
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      cleanupScrollLocks();
    };
  }, []);

  useLayoutEffect(() => {
    const raw = safeSessionGet(ADMIN_SCROLL_KEY);
    const savedAtRaw = safeSessionGet(ADMIN_SCROLL_SAVED_AT_KEY);
    cleanupScrollLocks();
    if (!raw) {
      return;
    }

    const savedAt = Number(savedAtRaw ?? 0);
    const age = Date.now() - (Number.isFinite(savedAt) ? savedAt : 0);
    // Ignore stale values (e.g. old tab/session).
    if (age > 15000) {
      safeSessionRemove(ADMIN_SCROLL_KEY);
      safeSessionRemove(ADMIN_SCROLL_SAVED_AT_KEY);
      return;
    }

    const y = Number(raw);
    safeSessionRemove(ADMIN_SCROLL_KEY);
    safeSessionRemove(ADMIN_SCROLL_SAVED_AT_KEY);
    if (!Number.isFinite(y)) {
      return;
    }

    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    const target = Math.max(0, y);
    window.scrollTo(0, target);
    // Second pass after layout settles.
    window.requestAnimationFrame(() => {
      window.scrollTo(0, target);
      document.documentElement.style.scrollBehavior = previousBehavior;
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!toastPayload) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("toast");
      nextParams.delete("toastType");
      const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [pathname, router, searchParams, toastPayload]);

  if (!toastPayload) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] sm:right-6">
      <div
        className={`max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${toneClasses[toastPayload.type]}`}
        role="status"
        aria-live="polite"
      >
        {toastPayload.message}
      </div>
    </div>
  );
}
