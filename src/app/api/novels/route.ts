import { NextResponse } from "next/server";
import { getAllNovels } from "@/lib/novels";

export async function GET() {
  const novels = await getAllNovels();
  return NextResponse.json({ novels });
}
