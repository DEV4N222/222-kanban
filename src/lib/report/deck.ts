import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { LOGO_PNG, TITLE_BACKGROUND_JPEG } from "./assets";
import type { ReportCard, SprintReportData } from "./data";
import type { ExecutiveSummary } from "./summary";

// Recreates the 222 Solutions "Client Introduction" template: 13.33" × 7.5",
// Urbanist throughout, black / white / 222 crimson with greys; a dark dotted
// title slide, white content slides with "222 Solutions", logo, a thin rule,
// kicker, caps title, numbered columns and a confidential footer; and a black
// closing slide with numbered next steps.

const FONT = "Urbanist";
const CRIMSON = "BE2448";
const BLACK = "000000";
const WHITE = "FFFFFF";
const GREY = "6B6B6E";
const LIGHT_GREY = "A6A6A8";
const DARK_GREY = "3A3A3C";
const RULE = "E3E3E5";

const MARGIN_X = 0.89;
const CONTENT_W = 11.56;

const TITLE = "TITLE";
const CONTENT = "CONTENT";
const CLOSING = "CLOSING";

type Slide = PptxGenJS.Slide;

export async function buildSprintDeck(data: SprintReportData, summary: ExecutiveSummary): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.author = "222 Kanban";
  pres.company = "222 Solutions";
  pres.title = `${data.boardName} — ${data.sprint.name} sprint report`;

  defineLayouts(pres);

  const dates = `${format(new Date(data.sprint.start_date), "d MMM")} – ${format(new Date(data.sprint.end_date), "d MMM yyyy")}`;
  let page = 1;
  const next = () => String(++page).padStart(2, "0");

  // ── 1. Title ────────────────────────────────────────────────────────────
  pres.addSection({ title: "Introduction" });
  const title = pres.addSlide({ masterName: TITLE, sectionTitle: "Introduction" });
  text(title, `SPRINT REPORT · ${data.boardName.toUpperCase()}`, { x: 2.15, y: 1.2, w: 9, h: 0.3, fontSize: 14, bold: true, color: CRIMSON });
  const nameSize = data.sprint.name.length > 30 ? 40 : data.sprint.name.length > 16 ? 52 : 64;
  text(title, data.sprint.name.toUpperCase(), { x: 2.15, y: 1.75, w: 9.8, h: 1.81, fontSize: nameSize, bold: true, color: WHITE, valign: "top", fit: "shrink" });
  text(title, data.sprint.goal ? `${dates}\nGoal: ${data.sprint.goal}` : dates, { x: 2.15, y: 3.8, w: 9.8, h: 1.4, fontSize: 22, color: WHITE, valign: "top" });
  text(title, `CONFIDENTIAL · GENERATED ${format(new Date(data.generatedAt), "d MMMM yyyy").toUpperCase()}`, { x: 2.15, y: 6.08, w: 9, h: 0.26, fontSize: 10, color: LIGHT_GREY });

  // ── 2. Executive summary ────────────────────────────────────────────────
  pres.addSection({ title: "Summary" });
  const exec = contentSlide(pres, "Summary", "Sprint report – Executive summary", "EXECUTIVE SUMMARY", next());
  text(exec, summary.headline, { x: MARGIN_X, y: 2.72, w: CONTENT_W, h: 0.42, fontSize: 20, bold: true, color: BLACK });
  text(exec, summary.summary, { x: MARGIN_X, y: 3.18, w: CONTENT_W, h: 1.15, fontSize: 16, color: BLACK, valign: "top" });

  const t = data.totals;
  const paceDetail =
    t.averageDays !== null && t.previousAverageDays !== null
      ? `${t.previousAverageDays} days in ${t.previousSprintName}`
      : "From leaving the backlog to done";
  numberedColumns(exec, 4.5, [
    { value: `${t.completed}/${t.inSprint}`, label: "CARDS COMPLETED", detail: t.completionRate !== null ? `${t.completionRate}% of the sprint` : "No cards in the sprint" },
    { value: t.averageDays !== null ? `${t.averageDays}d` : "—", label: "AVERAGE TIME TO DONE", detail: paceDetail },
    { value: String(t.carriedOver), label: "CARRIED OVER", detail: t.carriedOver ? "Not finished this sprint" : "Nothing left open" },
    { value: String(t.contributors), label: "CONTRIBUTORS", detail: "People who completed cards" },
  ]);
  if (summary.aiWritten) {
    text(exec, "Summary written by AI from the sprint's cards and figures.", { x: MARGIN_X, y: 6.42, w: 8, h: 0.24, fontSize: 10, color: LIGHT_GREY });
  }

  // ── 3. Highlights ───────────────────────────────────────────────────────
  if (summary.highlights.length > 0) {
    const hl = contentSlide(pres, "Summary", "Sprint report – Highlights", "WHAT WE DELIVERED", next());
    const items = summary.highlights.slice(0, 4);
    const colW = CONTENT_W / items.length;
    items.forEach((item, i) => {
      const x = MARGIN_X + i * colW;
      if (i > 0) divider(hl, x - 0.17, 2.95, 2.6, BLACK);
      text(hl, String(i + 1).padStart(2, "0"), { x, y: 3.0, w: colW - 0.4, h: 0.5, fontSize: 32, bold: true, color: CRIMSON });
      text(hl, item, { x, y: 3.65, w: colW - 0.4, h: 1.9, fontSize: 16, color: BLACK, valign: "top" });
    });
  }

  // ── 4. Completed cards ──────────────────────────────────────────────────
  pres.addSection({ title: "Delivery" });
  cardTableSlides(pres, next, "Sprint report – Delivery", "COMPLETED CARDS", data.completedCards, "No cards were completed in this sprint.", [
    { header: "Card", w: 5.9, get: (c) => c.title },
    { header: "Owner", w: 2.1, get: (c) => c.owner },
    { header: "Labels", w: 2.2, get: (c) => c.labels.join(", ") || "—" },
    { header: "Completed", w: 1.36, get: (c) => (c.completedAt ? format(new Date(c.completedAt), "d MMM") : "—") },
  ]);

  // ── 5–8. Analytics ──────────────────────────────────────────────────────
  pres.addSection({ title: "Analytics" });

  const burn = contentSlide(pres, "Analytics", "Sprint report – Analytics", "BURNDOWN", next());
  if (data.burndown.length > 0) {
    burn.addChart(
      pres.ChartType.line,
      [
        { name: "Remaining", labels: data.burndown.map((p) => p.date), values: data.burndown.map((p) => p.remaining) },
        { name: "Ideal", labels: data.burndown.map((p) => p.date), values: data.burndown.map((p) => p.ideal) },
      ],
      {
        ...chartFrame(),
        chartColors: [CRIMSON, LIGHT_GREY],
        lineSize: 2,
        lineDataSymbol: "none",
        showLegend: true,
        legendPos: "b",
        legendFontFace: FONT,
        legendFontSize: 11,
        legendColor: GREY,
        valAxisMinVal: 0,
      }
    );
    const first = data.burndown[0].remaining;
    const last = data.burndown[data.burndown.length - 1].remaining;
    sideStats(burn, [
      { value: String(first), label: "CARDS AT THE START" },
      { value: String(last), label: "STILL OPEN AT THE END" },
    ]);
  } else {
    emptyNote(burn, "No burndown data for this sprint yet.");
  }

  const cfd = contentSlide(pres, "Analytics", "Sprint report – Analytics", "CUMULATIVE FLOW", next());
  if (data.cfd.dates.length > 0 && data.cfd.series.length > 0) {
    cfd.addChart(
      pres.ChartType.area,
      data.cfd.series.map((s) => ({ name: s.name, labels: data.cfd.dates, values: s.values })),
      {
        ...chartFrame(),
        barGrouping: "standard",
        chartColors: stageColors(data.cfd.series.length),
        showLegend: true,
        legendPos: "b",
        legendFontFace: FONT,
        legendFontSize: 11,
        legendColor: GREY,
        valAxisMinVal: 0,
      }
    );
    text(cfd, "How to read it", { x: 9.75, y: 2.85, w: 2.7, h: 0.3, fontSize: 14, bold: true, color: BLACK });
    text(
      cfd,
      "Each band counts the cards that have reached that stage or beyond. Wide bands mean work is piling up in a stage; bands rising together mean work is flowing.",
      { x: 9.75, y: 3.25, w: 2.7, h: 2.4, fontSize: 13, color: GREY, valign: "top" }
    );
  } else {
    emptyNote(cfd, "No activity recorded during this sprint yet.");
  }

  const team = contentSlide(pres, "Analytics", "Sprint report – Analytics", "TEAM CONTRIBUTIONS", next());
  if (data.leaderboard.length > 0) {
    // Horizontal bar charts draw the first category at the bottom; reverse so
    // the top contributor is at the top.
    const entries = data.leaderboard.slice(0, 10).reverse();
    team.addChart(
      pres.ChartType.bar,
      [{ name: "Cards completed", labels: entries.map((e) => e.name), values: entries.map((e) => e.completed) }],
      {
        ...chartFrame(),
        barDir: "bar",
        chartColors: [CRIMSON],
        showValue: true,
        dataLabelPosition: "outEnd",
        dataLabelFontFace: FONT,
        dataLabelFontSize: 11,
        dataLabelColor: GREY,
        valAxisHidden: true,
        valGridLine: { style: "none" },
        showLegend: false,
      }
    );
    const top = data.leaderboard.filter((e) => e.completed === data.leaderboard[0].completed);
    sideStats(team, [
      { value: String(data.leaderboard[0].completed), label: top.length > 1 ? "MOST CARDS (TIED)" : "MOST CARDS COMPLETED", detail: top.map((e) => e.name).join(" & ") },
    ]);
  } else {
    emptyNote(team, "No cards have been completed in this sprint yet.");
  }

  const pace = contentSlide(pres, "Analytics", "Sprint report – Analytics", "SQUAD CADENCE", next());
  const measured = data.cadence.filter((p) => p.averageDays !== null);
  if (measured.length > 0) {
    pace.addChart(
      pres.ChartType.bar,
      [{ name: "Average days to done", labels: measured.map((p) => p.sprint), values: measured.map((p) => p.averageDays ?? 0) }],
      {
        ...chartFrame(),
        barDir: "col",
        chartColors: [CRIMSON],
        showValue: true,
        dataLabelPosition: "outEnd",
        dataLabelFormatCode: '0.0"d"',
        dataLabelFontFace: FONT,
        dataLabelFontSize: 11,
        dataLabelColor: GREY,
        showLegend: false,
        valAxisMinVal: 0,
      }
    );
    sideStats(pace, [
      { value: t.averageDays !== null ? `${t.averageDays}d` : "—", label: `AVERAGE IN ${data.sprint.name.toUpperCase()}` },
      ...(t.previousAverageDays !== null
        ? [{ value: `${t.previousAverageDays}d`, label: `AVERAGE IN ${(t.previousSprintName ?? "").toUpperCase()}` }]
        : []),
    ]);
    text(pace, "Days from a card leaving the Backlog until it reaches Done, averaged per sprint.", { x: 9.75, y: 6.0, w: 2.7, h: 0.5, fontSize: 10, color: LIGHT_GREY, valign: "top" });
  } else {
    emptyNote(pace, "Squad cadence appears once cards in a sprint reach a Done column.");
  }

  // ── 9. Carried over ─────────────────────────────────────────────────────
  if (data.carriedOverCards.length > 0) {
    pres.addSection({ title: "Carry-over" });
    cardTableSlides(pres, next, "Sprint report – Carry-over", "CARRIED OVER", data.carriedOverCards, "", [
      { header: "Card", w: 6.4, get: (c) => c.title },
      { header: "Where it is", w: 2.6, get: (c) => c.column || "—" },
      { header: "Owner", w: 2.56, get: (c) => c.owner },
    ]);
  }

  // ── 10. Retro story ─────────────────────────────────────────────────────
  if (data.retro) {
    pres.addSection({ title: "Retrospective" });
    const retro = contentSlide(pres, "Retrospective", "Sprint report – Retrospective", "RETRO STORY", next());
    if (data.retro.themes.length > 0) {
      text(retro, data.retro.themes.map((th) => th.toUpperCase()).join("  ·  "), { x: MARGIN_X, y: 2.72, w: CONTENT_W, h: 0.3, fontSize: 12, bold: true, color: CRIMSON });
    }
    text(retro, data.retro.story.replace(/\n\s*\n/g, "\n\n"), { x: MARGIN_X, y: 3.15, w: 10.5, h: 3.4, fontSize: 15, color: BLACK, valign: "top", fit: "shrink" });
  }

  // ── 11. Next steps ──────────────────────────────────────────────────────
  pres.addSection({ title: "Next steps" });
  const close = pres.addSlide({ masterName: CLOSING, sectionTitle: "Next steps" });
  text(close, "NEXT STEPS", { x: MARGIN_X, y: 0.89, w: 7.06, h: 0.3, fontSize: 14, bold: true, color: CRIMSON });
  text(close, "INTO THE NEXT SPRINT", { x: MARGIN_X, y: 1.38, w: 9, h: 0.67, fontSize: 44, bold: true, color: WHITE });
  const steps = summary.nextSteps.slice(0, 3);
  const stepW = CONTENT_W / Math.max(steps.length, 1);
  steps.forEach((step, i) => {
    const x = MARGIN_X + i * stepW;
    if (i > 0) divider(close, x - 0.17, 3.31, 1.73, DARK_GREY);
    text(close, String(i + 1), { x, y: 3.31, w: stepW - 0.4, h: 0.69, fontSize: 48, bold: true, color: CRIMSON });
    text(close, step, { x, y: 4.09, w: stepW - 0.4, h: 1.2, fontSize: 16, color: WHITE, valign: "top" });
  });
  text(close, `${data.boardName} · ${data.sprint.name} · generated from 222 Kanban`, { x: MARGIN_X, y: 6.08, w: 11.9, h: 0.34, fontSize: 16, color: WHITE });
  text(close, next(), { x: 11.9, y: 6.82, w: 0.6, h: 0.26, fontSize: 12, color: LIGHT_GREY, align: "right" });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}

// ── Layouts ──────────────────────────────────────────────────────────────

function defineLayouts(pres: PptxGenJS) {
  pres.defineSlideMaster({
    title: TITLE,
    background: { data: TITLE_BACKGROUND_JPEG },
    objects: [{ image: { data: LOGO_PNG, x: 11.69, y: 1.2, w: 0.31, h: 0.31 } }],
  });

  pres.defineSlideMaster({
    title: CONTENT,
    background: { color: WHITE },
    objects: [
      { text: { text: "222 Solutions", options: { ...base(), x: MARGIN_X, y: 0.75, w: 3, h: 0.3, fontSize: 14, bold: true, color: BLACK } } },
      { image: { data: LOGO_PNG, x: 12.0, y: 0.67, w: 0.44, h: 0.44 } },
      { line: { x: MARGIN_X, y: 1.26, w: CONTENT_W, h: 0, line: { color: BLACK, width: 0.75 } } },
      { text: { text: "222 SOLUTIONS · CONFIDENTIAL", options: { ...base(), x: MARGIN_X, y: 6.82, w: 4, h: 0.26, fontSize: 12, color: GREY } } },
    ],
  });

  pres.defineSlideMaster({
    title: CLOSING,
    background: { color: BLACK },
    objects: [
      { image: { data: LOGO_PNG, x: 10.56, y: 0.89, w: 1, h: 1 } },
      { text: { text: "222 SOLUTIONS · CONFIDENTIAL", options: { ...base(), x: MARGIN_X, y: 6.82, w: 4, h: 0.26, fontSize: 12, color: LIGHT_GREY } } },
    ],
  });
}

// ── Building blocks ──────────────────────────────────────────────────────

function base(): PptxGenJS.TextPropsOptions {
  return { fontFace: FONT, margin: 0, isTextBox: true };
}

function text(slide: Slide, value: string, options: PptxGenJS.TextPropsOptions) {
  slide.addText(value, { ...base(), valign: "middle", ...options });
}

function divider(slide: Slide, x: number, y: number, h: number, color: string) {
  slide.addShape("line", { x, y, w: 0, h, line: { color, width: 0.75 } });
}

function contentSlide(pres: PptxGenJS, section: string, kicker: string, title: string, pageNo: string): Slide {
  const slide = pres.addSlide({ masterName: CONTENT, sectionTitle: section });
  text(slide, kicker, { x: MARGIN_X, y: 1.4, w: 11.9, h: 0.34, fontSize: 16, color: BLACK });
  text(slide, title, { x: MARGIN_X, y: 1.99, w: 11.9, h: 0.58, fontSize: 36, bold: true, color: BLACK });
  text(slide, pageNo, { x: 11.9, y: 6.82, w: 0.6, h: 0.26, fontSize: 12, color: GREY, align: "right" });
  return slide;
}

function numberedColumns(slide: Slide, y: number, items: { value: string; label: string; detail: string }[]) {
  const colW = CONTENT_W / items.length;
  items.forEach((item, i) => {
    const x = MARGIN_X + i * colW;
    if (i > 0) divider(slide, x - 0.17, y - 0.1, 1.75, BLACK);
    text(slide, item.value, { x, y, w: colW - 0.4, h: 0.55, fontSize: 32, bold: true, color: CRIMSON });
    text(slide, item.label, { x, y: y + 0.62, w: colW - 0.4, h: 0.3, fontSize: 14, bold: true, color: BLACK });
    text(slide, item.detail, { x, y: y + 0.98, w: colW - 0.4, h: 0.55, fontSize: 12, color: GREY, valign: "top" });
  });
}

/** Big-number callouts in the right-hand column beside a chart. */
function sideStats(slide: Slide, stats: { value: string; label: string; detail?: string }[]) {
  stats.forEach((s, i) => {
    const y = 2.85 + i * 1.55;
    text(slide, s.value, { x: 9.75, y, w: 2.7, h: 0.6, fontSize: 32, bold: true, color: CRIMSON });
    text(slide, s.label, { x: 9.75, y: y + 0.65, w: 2.7, h: 0.3, fontSize: 12, bold: true, color: BLACK, fit: "shrink" });
    if (s.detail) text(slide, s.detail, { x: 9.75, y: y + 1.0, w: 2.7, h: 0.5, fontSize: 12, color: GREY, valign: "top" });
  });
}

function emptyNote(slide: Slide, message: string) {
  text(slide, message, { x: MARGIN_X, y: 3.2, w: CONTENT_W, h: 0.4, fontSize: 16, color: GREY });
}

function chartFrame(): PptxGenJS.IChartOpts {
  return {
    x: MARGIN_X,
    y: 2.75,
    w: 8.5,
    h: 3.75,
    catAxisLabelColor: GREY,
    catAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 11,
    catAxisLineShow: true,
    catAxisLineColor: RULE,
    valAxisLabelColor: GREY,
    valAxisLabelFontFace: FONT,
    valAxisLabelFontSize: 11,
    valAxisLineShow: false,
    valGridLine: { color: RULE, size: 0.75 },
    catGridLine: { style: "none" },
  };
}

/** Workflow stages run from light grey (first) to 222 crimson (last, usually Done). */
function stageColors(n: number): string[] {
  const greys = ["D9D9DB", LIGHT_GREY, GREY, DARK_GREY, "1F1F21"];
  if (n <= 1) return [CRIMSON];
  const before = n - 1;
  return [...Array.from({ length: before }, (_, i) => greys[Math.round((i * (greys.length - 1)) / Math.max(before - 1, 1))]), CRIMSON];
}

const ROWS_PER_SLIDE = 9;

function cardTableSlides(
  pres: PptxGenJS,
  next: () => string,
  kicker: string,
  title: string,
  cards: ReportCard[],
  emptyMessage: string,
  columns: { header: string; w: number; get: (c: ReportCard) => string }[]
) {
  const section = kicker.replace("Sprint report – ", "");
  if (cards.length === 0) {
    const slide = contentSlide(pres, section, kicker, title, next());
    emptyNote(slide, emptyMessage);
    return;
  }

  const pages = Math.ceil(cards.length / ROWS_PER_SLIDE);
  for (let p = 0; p < pages; p++) {
    const rows = cards.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE);
    const slide = contentSlide(pres, section, pages > 1 ? `${kicker} (${p + 1} of ${pages})` : kicker, title, next());
    const cell = (value: string, header = false): PptxGenJS.TableCell => ({
      text: value,
      options: {
        fontFace: FONT,
        fontSize: header ? 12 : 13,
        bold: header,
        color: header ? GREY : BLACK,
        valign: "middle",
        margin: [0.04, 0.08, 0.04, 0],
        border: [
          { type: "none" },
          { type: "none" },
          { type: "solid", color: header ? BLACK : RULE, pt: header ? 0.75 : 0.5 },
          { type: "none" },
        ],
      },
    });
    slide.addTable(
      [columns.map((c) => cell(c.header.toUpperCase(), true)), ...rows.map((card) => columns.map((c) => cell(c.get(card))))],
      { x: MARGIN_X, y: 2.75, w: CONTENT_W, colW: columns.map((c) => c.w), rowH: 0.36, autoPage: false }
    );
  }
}
