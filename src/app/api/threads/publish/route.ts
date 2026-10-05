import { type NextRequest, NextResponse } from "next/server";

interface PublishRequestBody {
  slides: string[];
  caption?: string;
  userId?: string;
  accessToken?: string;
}

/**
 * POST /api/threads/publish
 *
 * 3-step Threads carousel publish flow:
 *   1. Create a child media container for each image (`is_carousel_item=true`).
 *   2. Create a parent CAROUSEL container referencing those children + caption.
 *   3. Publish the parent container (`threads_publish`).
 *
 * Body:
 * {
 *   slides: string[],        // public image URLs (required)
 *   caption?: string,        // caption text (optional, ≤500 chars)
 *   userId: string,          // Threads user id (numeric string)
 *   accessToken: string       // long-lived Threads user access token
 * }
 */
export async function POST(request: NextRequest) {
  // --- Parse + validate body -------------------------------------------------
  let body: PublishRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { slides, caption = "", userId, accessToken } = body || {};

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json(
      { success: false, error: "At least one slide (public imageUrl) is required." },
      { status: 400 }
    );
  }

  if (slides.length > 20) {
    return NextResponse.json(
      { success: false, error: "Threads carousel max is 20 slides." },
      { status: 400 }
    );
  }

  // Validate all image URLs are publicly reachable — Threads requires this.
  for (const imageUrl of slides) {
    if (typeof imageUrl !== "string" || !/^https?:\/\//.test(imageUrl)) {
      return NextResponse.json(
        { success: false, error: `Invalid imageUrl (must be http/https): ${imageUrl}` },
        { status: 400 }
      );
    }
  }

  if (caption.length > 500) {
    return NextResponse.json(
      { success: false, error: "Caption exceeds 500-character limit." },
      { status: 400 }
    );
  }

  const token = accessToken || process.env.THREADS_ACCESS_TOKEN;
  const user = userId || process.env.THREADS_USER_ID;

  if (!token || !user) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing Threads credentials. Provide userId + accessToken in the body or set THREADS_USER_ID / THREADS_ACCESS_TOKEN env vars.",
      },
      { status: 401 }
    );
  }

  const GRAPH = "https://graph.threads.net/v1.0";

  try {
    // --- Step 1: create child containers -------------------------------------
    const childIds: string[] = [];

    for (const imageUrl of slides) {
      const params = new URLSearchParams({
        media_type: "IMAGE",
        image_url: imageUrl,
        is_carousel_item: "true",
        access_token: token,
      });

      const res = await fetch(`${GRAPH}/${encodeURIComponent(user)}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await res.json();

      if (!res.ok || !data.id) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to create child container for ${imageUrl}: ${JSON.stringify(data?.error || res.statusText)}`,
          },
          { status: 502 }
        );
      }

      childIds.push(data.id);
    }

    // --- Step 2: create parent carousel container -------------------------
    const parent = new URLSearchParams({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      access_token: token,
    });

    if (caption.trim()) {
      parent.append("text", caption);
    }

    const parentRes = await fetch(`${GRAPH}/${encodeURIComponent(user)}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parent.toString(),
    });

    const parentData = await parentRes.json();

    if (!parentRes.ok || !parentData.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create carousel parent container: ${JSON.stringify(parentData?.error || parentRes.statusText)}`,
        },
        { status: 502 }
      );
    }

    const creationId = parentData.id;

    // --- Step 3: publish the carousel container ---------------------------
    const publish = new URLSearchParams({
      creation_id: creationId,
      access_token: token,
    });

    const pubRes = await fetch(`${GRAPH}/${encodeURIComponent(user)}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publish.toString(),
    });

    const pubData = await pubRes.json();

    if (!pubRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to publish carousel: ${JSON.stringify(pubData?.error || pubRes.statusText)}`,
        },
        { status: 502 }
      );
    }

    // Success — return post id + permalink if provided
    const postId = pubData.id || creationId;
    const permalink = pubData.permalink
      ? pubData.permalink
      : `https://www.threads.net/@${user}/post/${postId}`;

    return NextResponse.json({
      success: true,
      postId,
      permalink,
      childContainerIds: childIds,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Publish failed: ${msg}` },
      { status: 500 }
    );
  }
}
