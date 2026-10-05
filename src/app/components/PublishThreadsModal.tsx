"use client";

import { useEffect, useState } from "react";

export interface RenderSlide {
  title: string;
  content: string;
  badge?: string;
  highlight?: string;
  sourceName?: string;
}

export interface PublishThreadsModalProps {
  slides: RenderSlide[];
  onClose: () => void;
}

const STORAGE_KEYS = {
  THREADS_USER_ID: "threads_carousel_user_id",
  THREADS_ACCESS_TOKEN: "threads_carousel_access_token",
};

export function PublishThreadsModal({ slides, onClose }: PublishThreadsModalProps) {
  const [userId, setUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [caption, setCaption] = useState("");
  const [step, setStep] = useState<"config" | "publishing" | "done" | "error">(
    "config"
  );
  const [publishStatus, setPublishStatus] = useState<string>("");
  const [postId, setPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load saved credentials on mount
    setUserId(localStorage.getItem(STORAGE_KEYS.THREADS_USER_ID) || "");
    setAccessToken(localStorage.getItem(STORAGE_KEYS.THREADS_ACCESS_TOKEN) || "");
    setCaption(
      `Tech Radar — ${slides.length} slide IT terpanas minggu ini. Swipe buat insight ringkas! ✨\n\nSource: Hacker News & Dev.to\n#techradar #itnews #indonesia`
    );
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleConfigSave = async () => {
    if (!userId.trim()) {
      setError("Threads User ID (angka) required.");
      return;
    }
    if (!accessToken.trim()) {
      setError("Access Token required.");
      return;
    }
    localStorage.setItem(STORAGE_KEYS.THREADS_USER_ID, userId.trim());
    localStorage.setItem(STORAGE_KEYS.THREADS_ACCESS_TOKEN, accessToken.trim());
    setError(null);
    setStep("publishing");
    await publishCarousel();
  };

  const publishCarousel = async () => {
    setPublishStatus("Generating & saving carousel images...");
    let publicUrls: string[] = [];
    try {
      // Generate PNG + save to public/generated (hosted on our VPS)
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, savePublic: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal render");
      publicUrls = json.publicUrls || json.slides;
      setPublishStatus(`Published ${publicUrls.length} slides → saving to Threads...`);

      // Create carousel container + publish
      const publishRes = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: publicUrls,
          caption: caption.trim(),
          userId: userId.trim(),
          accessToken: accessToken.trim(),
        }),
      });
      const publishJson = await publishRes.json();
      if (!publishRes.ok || !publishJson.success) {
        throw new Error(publishJson.error || "Gagal publish ke Threads");
      }
      setPostId(publishJson.postId);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal publish ke Threads");
      setStep("error");
    }
  };

  const close = () => {
    setError(null);
    setStep("config");
    onClose();
  };

  const isConfigEmpty = !userId.trim() || !accessToken.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">Publish ke Threads</h2>
          <button
            onClick={close}
            className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Config step */}
          {step === "config" && (
            <>
              <p className="text-xs text-slate-600">
                {slides.length} slide carousel siap dipublish. Akun Threads lu harus sudah dikonfigurasi.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Threads User ID (angka)
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. 2898535190"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="eyJhbGc... (long-lived token)"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Cara dapat:{" "}
                    <span className="font-medium">Meta Developer App</span> → tambah
                    product <span className="font-medium">Threads</span> → Generate
                    User Access Token
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caption (max 500 karakter)
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tulis caption Threads kamu..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all resize-none"
                  />
                  <p className="mt-1 text-xs text-slate-500 text-right">
                    {caption.length} / 500
                  </p>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleConfigSave}
                disabled={isConfigEmpty}
                className="mt-6 w-full h-10 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya →
              </button>
            </>
          )}

          {/* Publishing step */}
          {step === "publishing" && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-[#2563eb] border-t-transparent animate-spin" />
              </div>
              <p className="text-center font-bold text-slate-900">Publishing to Threads...</p>
              <p className="text-center text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                {publishStatus}
              </p>
            </>
          )}

          {/* Done step */}
          {step === "done" && postId && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">
                  ✓
                </div>
              </div>
              <p className="text-center font-bold text-slate-900">Berhasil dipublish!</p>
              <p className="text-center text-xs text-slate-500 mt-1">
                Caption: &ldquo;{caption.slice(0, 60)}{caption.length > 60 ? "…" : ""}&rdquo;
              </p>
              <a
                href={`https://www.threads.net/@${userId}/post/${postId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-4 text-center text-sm font-semibold text-[#2563eb] hover:underline"
              >
                Lihat post di Threads →
              </a>
            </>
          )}

          {/* Error step */}
          {step === "error" && (
            <>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
                {error}
              </p>
              <button
                onClick={close}
                className="mt-4 w-full h-9 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
