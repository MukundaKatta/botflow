import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

const TEMPLATE_DIR = path.resolve(process.cwd(), "../../packages/templates");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const allowedTemplates = [
    "restaurant-order",
    "appointment-booking",
    "ecommerce-support",
    "lead-qualification",
    "event-rsvp",
  ];

  if (!allowedTemplates.includes(id)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const filePath = path.join(TEMPLATE_DIR, `${id}.json`);
    const content = await readFile(filePath, "utf-8");
    const template = JSON.parse(content);
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
