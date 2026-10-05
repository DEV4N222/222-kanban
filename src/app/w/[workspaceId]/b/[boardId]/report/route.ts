import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSprintReportData } from "@/lib/report/data";
import { writeExecutiveSummary } from "@/lib/report/summary";
import { buildSprintDeck } from "@/lib/report/deck";

export const runtime = "nodejs";
// The AI summary can take a little while.
export const maxDuration = 60;

// GET /w/:workspaceId/b/:boardId/report?sprint=:sprintId → sprint report (.pptx)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; boardId: string }> }
) {
  const { workspaceId, boardId } = await params;
  const sprintId = request.nextUrl.searchParams.get("sprint");
  if (!sprintId) {
    return NextResponse.json({ error: "Choose a sprint for the report." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to download reports." }, { status: 401 });
  }

  let step = "loading the sprint's data";
  try {
    // Everything is read with the signed-in user's permissions, so a board
    // they can't see comes back as not found.
    const data = await loadSprintReportData(workspaceId, boardId, sprintId);
    if (!data) {
      return NextResponse.json({ error: "That sprint or board wasn't found." }, { status: 404 });
    }

    step = "writing the executive summary";
    const summary = await writeExecutiveSummary(data);
    step = "building the slides";
    const deck = await buildSprintDeck(data, summary);
    const fileName = `${data.boardName} - ${data.sprint.name} - Sprint report.pptx`.replace(/[\\/:*?"<>|]+/g, "-");

    return new NextResponse(new Uint8Array(deck), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`[report] failed while ${step}`, error);
    // Internal tool: show the actual reason so a failure can be diagnosed.
    const reason = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed while ${step}: ${reason.slice(0, 300)}` },
      { status: 500 }
    );
  }
}
