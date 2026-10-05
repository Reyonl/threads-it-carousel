"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { ITNews } from "@/types";

interface RenderSlide {
  title: string;
  content: string;
  badge?: string;
  highlight?: string;
  sourceName?: string;
}

function buildSlides(news: ITNews[]): RenderSlide[] {
  if (news.length === 0) return [];
  const cover: RenderSlide = {
    title: "Tech Radar — Weekly IT Digest",
    content: `${news.length} berita terpanas dunia IT minggu ini. Swipe untuk insight ringkas yang siap kamu share di Threads & Instagram.`,
    badge: "✦ EDISI TERBARU",
    highlight: "Dikurasi dari Hacker News & Dev.to — ringkas, relevan, siap posting.",
    sourceName: "threads-it-carousel",
  };
  const points: RenderSlide[] = news.map((n) => ({
    title: n.title,
    content: n.summary.slice(0, 220),
    badge: n.source.toUpperCase(),
    sourceName: n.source,
    highlight: n.points ? `▲ ${n.points} points  •  💬 ${n.comments ?? 0} comments` : undefined,
  }));
  const closing: RenderSlide = {
    title: "Suka rangkuman ini?",
    content: "Save & share carousel ini. Follow untuk digest IT mingguan — tanpa clickbait, cuma insight yang kepake.",
    badge: "FOLLOW & SAVE",
    highlight: "Mau request topik? DM @reyonlau_",
    sourceName: "@reyonlau_",
  };
  return [cover, ...points, closing];
}

export default function Home() {
  const [news, setNews] = useState<ITNews[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rendered, setRendered] = useState<string[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingRender, setLoadingRender] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("all");
  const [limit, setLimit] = useState(6);
  const [activePreview, setActivePreview] = useState(0);

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?limit=${limit}&source=${source}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal fetch");
      setNews(json.data);
      setSelectedIds(new Set(json.data.map((n: ITNews) => n.id)));
      setRendered([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal fetch");
    } finally {
      setLoadingNews(false);
    }
  }, [limit, source]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNews();
  }, [fetchNews]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedNews = news.filter((n) => selectedIds.has(n.id));

  const handleGenerate = async () => {
    if (selectedNews.length === 0) {
      setError("Pilih minimal 1 berita dulu.");
      return;
    }
    setLoadingRender(true);
    setError(null);
    try {
      const slides = buildSlides(selectedNews);
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, theme: { primary: "#2563eb", background: "#ffffff", text: "#0f172a" } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal render");
      setRendered(json.slides);
      setActivePreview(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal render");
    } finally {
      setLoadingRender(false);
    }
  };

  const handleDownloadZip = async () => {
    if (rendered.length === 0) return;
    const zip = new JSZip();
    rendered.forEach((base64, i) => {
      const data = base64.split(",")[1];
      zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, data, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `threads-carousel-${new Date().toISOString().slice(0, 10)}.zip`);
  };

  const handleDownloadOne = (base64: string, idx: number) => {
    const a = document.createElement("a");
    a.href = base64;
    a.download = `slide-${String(idx + 1).padStart(2, "0")}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center text-white font-black text-sm">TI</div>
            <div>
              <p className="font-bold leading-none tracking-tight">threads-it-carousel</p>
              <p className="text-xs text-slate-500">IT news → IG/Threads carousel (1080×1350)</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold">satori + resvg</span>
            <span className="px-3 py-1.5 rounded-full border border-slate-200 bg-white font-medium">1080×1350 PNG</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        {/* Left: Controls + News */}
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-bold text-sm tracking-wide text-slate-700">SUMBER BERITA</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium">
                <option value="all">All — HN + Dev.to</option>
                <option value="hacker-news">Hacker News only</option>
                <option value="dev-to">Dev.to only</option>
              </select>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium">
                <option value={4}>4 berita</option>
                <option value={6}>6 berita</option>
                <option value={8}>8 berita</option>
              </select>
              <button
                onClick={fetchNews}
                disabled={loadingNews}
                className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
              >
                {loadingNews ? "Memuat..." : "Refresh berita"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={loadingRender || selectedNews.length === 0}
                className="h-10 px-5 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {loadingRender ? "Merender..." : `Generate carousel (${selectedNews.length})`}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pilih berita yang mau masuk carousel. Cover + closing otomatis dibuat. Klik Generate untuk render PNG 1080×1350.
            </p>
            {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          </div>

          {/* News List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm">BERITA TERKINI</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">{news.length} items • {selectedNews.length} dipilih</span>
                {news.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedIds(new Set(news.map((n) => n.id)))} className="h-7 px-2.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50">Pilih semua</button>
                    <button onClick={() => setSelectedIds(new Set())} className="h-7 px-2.5 rounded-full border border-slate-200 bg-white text-[11px] font-semibold hover:bg-slate-50">Kosongkan</button>
                  </div>
                )}
              </div>
            </div>
            {loadingNews ? (
              <div className="p-5 space-y-3" aria-busy="true" aria-label="Memuat berita">
                {[0,1,2].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-4 h-4 rounded bg-slate-200 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-4 w-full rounded bg-slate-200" />
                      <div className="h-3 w-3/4 rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">Belum ada berita.</p>
                <button onClick={fetchNews} className="mt-3 h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold">Coba Refresh</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {news.map((item) => {
                  const checked = selectedIds.has(item.id);
                  return (
                    <label key={item.id} className={`flex gap-4 p-5 cursor-pointer hover:bg-slate-50 ${checked ? "bg-blue-50/50" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelect(item.id)} className="mt-1 w-4 h-4 accent-[#2563eb]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold tracking-widest px-2 py-1 rounded-full bg-slate-900 text-white">{item.source}</span>
                          {item.points !== undefined && <span className="text-xs text-slate-500">▲ {item.points} • {item.comments ?? 0} komen</span>}
                        </div>
                        <p className="mt-2 font-semibold leading-snug line-clamp-2">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.summary}</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#2563eb] hover:underline">
                          Buka sumber →
                        </a>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">PREVIEW CAROUSEL</h3>
              {rendered.length > 0 && (
                <button onClick={handleDownloadZip} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black">
                  Download ZIP ({rendered.length} PNG)
                </button>
              )}
            </div>

            {rendered.length === 0 ? (
              <div className="mt-4 aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg">🖼️</div>
                <p className="mt-3 font-semibold">Belum ada preview</p>
                <p className="mt-1 text-sm text-slate-500 max-w-[28ch]">Pilih berita di kiri lalu klik Generate. PNG 1080×1350 siap upload ke Threads / Instagram.</p>
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/5] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rendered[activePreview]} alt={`Slide ${activePreview + 1}`} className="w-full h-full object-contain bg-white" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 backdrop-blur px-3 py-1.5 rounded-full">
                    <button onClick={() => setActivePreview((p) => Math.max(0, p - 1))} disabled={activePreview === 0} className="w-7 h-7 rounded-full bg-white text-slate-900 text-xs disabled:opacity-40" aria-label="Previous slide">‹</button>
                    <span className="text-xs font-bold text-white px-1">{activePreview + 1} / {rendered.length}</span>
                    <button onClick={() => setActivePreview((p) => Math.min(rendered.length - 1, p + 1))} disabled={activePreview === rendered.length - 1} className="w-7 h-7 rounded-full bg-white text-slate-900 text-xs disabled:opacity-40" aria-label="Next slide">›</button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Slide navigation">
                  {rendered.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePreview(idx)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold border ${idx === activePreview ? "bg-[#2563eb] text-white border-[#2563eb]" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                      aria-label={`Show slide ${idx + 1}`}
                      aria-current={idx === activePreview ? "true" : undefined}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDownloadOne(rendered[activePreview], activePreview)}
                  className="mt-3 w-full h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50"
                >
                  Download slide {activePreview + 1} (PNG)
                </button>
              </>
            )}
          </div>

          {rendered.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {rendered.map((src, idx) => (
                <button key={idx} onClick={() => setActivePreview(idx)} className={`rounded-xl overflow-hidden border-2 ${idx === activePreview ? "border-[#2563eb]" : "border-slate-200"} bg-white`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`thumb ${idx + 1}`} className="w-full aspect-[4/5] object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-slate-500">Built with Next.js + satori + resvg — 1080×1350 • by Reyon</footer>
    </div>
  );
}