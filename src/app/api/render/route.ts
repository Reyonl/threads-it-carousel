import { NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import React from "react";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const slides = Array.isArray(body?.slides) ? body.slides : null;
    const theme = body?.theme ?? {};
    if (!slides || slides.length === 0) {
      return NextResponse.json(
        { success: false, error: "slides kosong — pilih minimal 1 berita." },
        { status: 400 }
      );
    }
    if (slides.length > 12) {
      return NextResponse.json(
        { success: false, error: "Maksimal 12 slide per carousel." },
        { status: 400 }
      );
    }

    const cleanHex = (v: unknown, fallback: string) =>
      typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
    const cleanText = (v: unknown, max = 300) =>
      typeof v === "string" ? v.slice(0, max) : "";

    // Default light clean theme
    const activeTheme = {
      primary: cleanHex(theme?.primary, "#2563eb"),
      background: cleanHex(theme?.background, "#ffffff"),
      text: cleanHex(theme?.text, "#0f172a"),
      subtext: "#64748b",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
    };

    // Load font — try Bold for 700/800 weights, fallback to Regular
    const fontRegularPath = path.join(process.cwd(), "public/fonts/Inter-Regular.ttf");
    const fontBoldTtf = path.join(process.cwd(), "public/fonts/Inter-Bold.ttf");
    const fontBoldWoff = path.join(process.cwd(), "public/fonts/Inter-Bold.woff");
    let fontRegular: Buffer | null = null;
    let fontBold: Buffer | null = null;
    if (fs.existsSync(fontRegularPath)) fontRegular = fs.readFileSync(fontRegularPath);
    if (fs.existsSync(fontBoldTtf)) fontBold = fs.readFileSync(fontBoldTtf);
    else if (fs.existsSync(fontBoldWoff)) fontBold = fs.readFileSync(fontBoldWoff);
    if (!fontRegular) {
      const res = await fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff"
      );
      fontRegular = Buffer.from(await res.arrayBuffer());
    }
    // If no bold file, reuse regular for bold weights (satori needs entry)

    const renderedImages: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const raw = slides[i] as Record<string, unknown>;
      const slide = {
        title: cleanText(raw.title, 120) || "Untitled",
        content: cleanText(raw.content, 320) || "",
        badge: raw.badge ? cleanText(raw.badge, 30).toUpperCase() : undefined,
        highlight: raw.highlight ? cleanText(raw.highlight, 160) : undefined,
        sourceName: raw.sourceName ? cleanText(raw.sourceName, 40) : undefined,
      };
      const isCover = i === 0;
      const isClosing = i === slides.length - 1;

      // 1080x1350 for Instagram / Threads portrait ratio (4:5)
      const element = React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            backgroundColor: activeTheme.background,
            padding: "80px 70px",
            fontFamily: "Inter, sans-serif",
            color: activeTheme.text,
            boxSizing: "border-box",
          },
        },
        // Top Bar / Header
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: `2px solid ${activeTheme.border}`,
              paddingBottom: "30px",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "26px",
                fontWeight: "700",
                color: activeTheme.primary,
                letterSpacing: "-0.5px",
              },
            },
            "TECH RADAR // DEV INSIGHTS"
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "22px",
                fontWeight: "600",
                color: activeTheme.subtext,
                backgroundColor: activeTheme.cardBg,
                padding: "8px 16px",
                borderRadius: "20px",
                border: `1px solid ${activeTheme.border}`,
              },
            },
            `${i + 1} / ${slides.length}`
          )
        ),
        // Main Content Area
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "36px",
              margin: "auto 0",
            },
          },
          slide.badge &&
            React.createElement(
              "span",
              {
                style: {
                  alignSelf: "flex-start",
                  fontSize: "20px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  color: activeTheme.primary,
                  backgroundColor: `${activeTheme.primary}15`,
                  padding: "8px 16px",
                  borderRadius: "8px",
                },
              },
              slide.badge
            ),
          React.createElement(
            "h1",
            {
              style: {
                fontSize: isCover ? "56px" : "46px",
                fontWeight: "800",
                lineHeight: "1.25",
                margin: 0,
                color: activeTheme.text,
                letterSpacing: "-1px",
              },
            },
            slide.title
          ),
          React.createElement(
            "p",
            {
              style: {
                fontSize: "26px",
                lineHeight: "1.6",
                margin: 0,
                color: activeTheme.subtext,
              },
            },
            slide.content
          ),
          slide.highlight &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  borderLeft: `6px solid ${activeTheme.primary}`,
                  backgroundColor: activeTheme.cardBg,
                  padding: "24px 30px",
                  borderRadius: "0 12px 12px 0",
                  fontSize: "24px",
                  fontWeight: "600",
                  color: activeTheme.text,
                  lineHeight: "1.5",
                },
              },
              slide.highlight
            )
        ),
        // Footer Area
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: `2px solid ${activeTheme.border}`,
              paddingTop: "30px",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "22px",
                fontWeight: "600",
                color: activeTheme.subtext,
              },
            },
            slide.sourceName ? `Source: ${slide.sourceName}` : "@reyonlau_"
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "22px",
                fontWeight: "700",
                color: activeTheme.primary,
              },
            },
            isClosing ? "Save & Follow ✨" : "Swipe Next ➔"
          )
        )
      );

      const svg = await satori(element, {
        width: 1080,
        height: 1350,
        fonts: [
          { name: "Inter", data: fontRegular!, weight: 400, style: "normal" },
          { name: "Inter", data: (fontBold ?? fontRegular)!, weight: 700, style: "normal" },
          { name: "Inter", data: (fontBold ?? fontRegular)!, weight: 800, style: "normal" },
        ],
      });

      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
      renderedImages.push(base64);
    }

    // Optional: save to public/generated for external consumers like Threads API
    const savePublic = Boolean(body?.savePublic);
    const publicUrls: string[] = [];
    if (savePublic) {
      const generatedDir = path.join(process.cwd(), "public", "generated");
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      const host = request.headers.get("host") || "3.26.6.38";
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const batchId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      for (let i = 0; i < renderedImages.length; i++) {
        const rawBase64 = renderedImages[i].replace(/^data:image\/png;base64,/, "");
        const filename = `slide_${batchId}_${i + 1}.png`;
        const filePath = path.join(generatedDir, filename);
        fs.writeFileSync(filePath, Buffer.from(rawBase64, "base64"));
        publicUrls.push(`${protocol}://${host}/generated/${filename}`);
      }
    }

    return NextResponse.json({
      success: true,
      slides: renderedImages,
      ...(savePublic ? { publicUrls } : {}),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to render carousel";
    console.error("Rendering error:", error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
