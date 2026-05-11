import { NextRequest, NextResponse } from "next/server";
import { readHighlights, saveHighlights } from "@/lib/highlights";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "缺少 slug" }, { status: 400 });
  const data = await readHighlights(slug);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const { slug, categories, terms } = await request.json();
    if (!slug) return NextResponse.json({ error: "缺少 slug" }, { status: 400 });

    const data = await readHighlights(slug);
    if (categories) data.categories = { ...data.categories, ...categories };
    if (terms) data.terms = { ...data.terms, ...terms };

    await saveHighlights(slug, data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const term = request.nextUrl.searchParams.get("term");
  const category = request.nextUrl.searchParams.get("category");
  if (!slug) return NextResponse.json({ error: "缺少 slug" }, { status: 400 });

  const data = await readHighlights(slug);

  if (term) {
    delete data.terms[term];
  }

  if (category) {
    // 删除分类及其下所有词
    delete data.categories[category];
    for (const [t, c] of Object.entries(data.terms)) {
      if (c === category) delete data.terms[t];
    }
  }

  await saveHighlights(slug, data);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  try {
    const { slug, category, color, style } = await request.json();
    if (!slug || !category) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    const data = await readHighlights(slug);
    data.categories[category] = {
      color: color || '#FEF3C7',
      style: style || 'bg',
    };
    await saveHighlights(slug, data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
