import { NextResponse } from "next/server";
import { getChipContent } from "@/lib/chip-lookup";

export async function GET() {
  const testChips = [
    "W001-FRAMEWORK-168HOUR",
    "IMSG-MESSAGETEMPLATECHIP-4ff4bc",
    "ASSESS-INSIGHT-001",
  ];

  const results = testChips.map(chip_id => ({
    chip_id,
    hasContent: !!getChipContent(chip_id),
    contentLength: getChipContent(chip_id).length,
    contentPreview: getChipContent(chip_id).substring(0, 200),
  }));

  return NextResponse.json({ results });
}
