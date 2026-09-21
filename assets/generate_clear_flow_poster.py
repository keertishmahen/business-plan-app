"""Generate clear-arrow E2E architecture poster (component-level connectors)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).with_name("e2e-data-ai-architecture-poster.png")
W, H = 2800, 1600


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, box, fill, outline, radius=14, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw: ImageDraw.ImageDraw, x1, y1, x2, y2, color=(201, 146, 38), width=4):
    draw.line((x1, y1, x2, y2), fill=color, width=width)
    # arrow head at (x2, y2)
    import math

    angle = math.atan2(y2 - y1, x2 - x1)
    size = 14
    left = (
        x2 - size * math.cos(angle - 0.45),
        y2 - size * math.sin(angle - 0.45),
    )
    right = (
        x2 - size * math.cos(angle + 0.45),
        y2 - size * math.sin(angle + 0.45),
    )
    draw.polygon([(x2, y2), left, right], fill=color)


def label_edge(draw, text, x, y, f):
    draw.text((x, y), text, fill=(90, 90, 95), font=f)


def node(draw, box, title, sub, fill, title_f, sub_f, outline=(180, 180, 185)):
    rounded(draw, box, fill, outline)
    x0, y0, x1, y1 = box
    draw.text((x0 + 14, y0 + 12), title, fill=(30, 30, 30), font=title_f)
    if sub:
        draw.text((x0 + 14, y0 + 38), sub, fill=(95, 95, 100), font=sub_f)
    # return center-right / center-left / top / bottom anchors
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    return {
        "R": (x1, cy),
        "L": (x0, cy),
        "T": (cx, y0),
        "B": (cx, y1),
        "box": box,
    }


def main():
    img = Image.new("RGB", (W, H), (250, 250, 252))
    d = ImageDraw.Draw(img)
    title_f = font(40, True)
    body_f = font(16)
    lane_f = font(14, True)
    node_f = font(15, True)
    sub_f = font(12)
    small_f = font(12)
    legend_f = font(15, True)

    d.text((40, 28), "End-to-end data and AI architecture", fill=(30, 30, 30), font=title_f)
    d.text(
        (40, 82),
        "Follow the arrows: sources → ingestion → medallion → knowledge graph → RAG / agents → serving → consumers",
        fill=(95, 95, 100),
        font=body_f,
    )

    # Top bars
    rounded(d, (40, 120, 2760, 168), (255, 236, 189), (232, 163, 2))
    d.text((58, 134), "Orchestration  ·  Airflow  ·  Dagster", fill=(30, 30, 30), font=body_f)
    rounded(d, (40, 180, 2760, 228), (198, 250, 246), (90, 216, 204))
    d.text(
        (58, 194),
        "Metadata / governance  ·  Data Catalog  ·  dbt tests",
        fill=(30, 30, 30),
        font=body_f,
    )

    y0 = 280
    # Lane titles
    for label, x in [
        ("Sources", 40),
        ("Ingestion", 320),
        ("Transform", 620),
        ("Semantic + AI", 1000),
        ("Access", 1580),
        ("Consumers", 2100),
    ]:
        d.text((x, y0 - 28), label, fill=(110, 110, 115), font=lane_f)

    # Nodes
    srcDB = node(d, (40, y0, 240, y0 + 70), "Customer DB", "MySQL / OLTP", (255, 242, 214), node_f, sub_f)
    srcCRM = node(d, (40, y0 + 110, 240, y0 + 180), "CRM / SaaS", "Salesforce-like", (255, 242, 214), node_f, sub_f)
    srcApp = node(d, (40, y0 + 220, 240, y0 + 290), "Mobile / events", "Apps + streams", (255, 242, 214), node_f, sub_f)

    batch = node(d, (320, y0, 520, y0 + 70), "dlt batch", "CSV / JSON", (205, 244, 211), node_f, sub_f)
    saas = node(d, (320, y0 + 110, 520, y0 + 180), "dlt SaaS sync", "API extract", (205, 244, 211), node_f, sub_f)
    stream = node(d, (320, y0 + 220, 520, y0 + 290), "dlt stream / CDC", "Events", (205, 244, 211), node_f, sub_f)

    catalog = node(d, (620, y0 - 30, 920, y0 + 30), "Data Catalog", "lineage + tests", (230, 220, 255), node_f, sub_f)
    landing = node(d, (620, y0 + 70, 920, y0 + 155), "Landing (bronze)", "raw files land here", (205, 244, 211), node_f, sub_f)
    clean = node(d, (620, y0 + 210, 920, y0 + 295), "Clean (dbt staging)", "typed + tested", (194, 229, 255), node_f, sub_f)
    curated = node(
        d,
        (620, y0 + 350, 920, y0 + 450),
        "Curated (dbt marts)",
        "Snowflake / BigQuery / Databricks",
        (220, 204, 255),
        node_f,
        sub_f,
    )

    kg = node(d, (1000, y0 + 140, 1220, y0 + 230), "Knowledge Graph", "Neo4j entities", (220, 204, 255), node_f, sub_f)
    rag = node(d, (1300, y0 + 140, 1520, y0 + 230), "Hybrid RAG", "vectors + graph", (194, 229, 255), node_f, sub_f)
    agents = node(
        d,
        (1600, y0 + 130, 1860, y0 + 230),
        "Agentic AI",
        "orchestrator + QA loop",
        (230, 204, 255),
        node_f,
        sub_f,
    )
    llm = node(d, (1940, y0 + 145, 2140, y0 + 215), "LLM", "generate + revise", (245, 230, 255), node_f, sub_f)

    bi = node(d, (1300, y0 + 340, 1500, y0 + 410), "BI / SQL", "analytics", (255, 224, 194), node_f, sub_f)
    api = node(d, (1540, y0 + 340, 1760, y0 + 410), "GraphRAG APIs", "semantic search", (255, 224, 194), node_f, sub_f)
    ml = node(d, (1800, y0 + 340, 2000, y0 + 410), "ML serving", "models", (255, 224, 194), node_f, sub_f)

    biz = node(d, (2220, y0 + 300, 2460, y0 + 360), "Business users", "", (255, 205, 194), node_f, sub_f)
    analyst = node(d, (2220, y0 + 390, 2460, y0 + 450), "Data analysts", "", (255, 205, 194), node_f, sub_f)
    scientist = node(d, (2220, y0 + 480, 2460, y0 + 540), "Data scientists", "", (255, 205, 194), node_f, sub_f)
    apps = node(d, (2220, y0 + 570, 2460, y0 + 630), "AI applications", "", (255, 205, 194), node_f, sub_f)

    # 1) Sources → ingestion
    arrow(d, *srcDB["R"], *batch["L"])
    label_edge(d, "CSV", 255, srcDB["R"][1] - 18, small_f)
    arrow(d, *srcCRM["R"], *saas["L"])
    label_edge(d, "API", 255, srcCRM["R"][1] - 18, small_f)
    arrow(d, *srcApp["R"], *stream["L"])
    label_edge(d, "events", 250, srcApp["R"][1] - 18, small_f)

    # 2) Ingestion → Landing (converge)
    arrow(d, *batch["R"], landing["L"][0], landing["L"][1] - 18)
    arrow(d, *saas["R"], *landing["L"])
    arrow(d, *stream["R"], landing["L"][0], landing["L"][1] + 18)

    # 3) Landing → Clean → Curated
    arrow(d, *landing["B"], *clean["T"], color=(70, 70, 75))
    label_edge(d, "dbt", 930, (landing["B"][1] + clean["T"][1]) // 2 - 8, small_f)
    arrow(d, *clean["B"], *curated["T"], color=(70, 70, 75))
    label_edge(d, "dbt", 930, (clean["B"][1] + curated["T"][1]) // 2 - 8, small_f)

    # 4) Catalog → zones (thin lines)
    for target in (landing, clean, curated):
        d.line((catalog["B"][0], catalog["B"][1], target["L"][0] + 40, target["T"][1]), fill=(135, 100, 200), width=2)

    # 5) Curated → KG → RAG → Agents → LLM
    arrow(d, *curated["R"], kg["L"][0], kg["L"][1] + 40)
    arrow(d, *kg["R"], *rag["L"])
    label_edge(d, "retrieve", 1230, kg["R"][1] - 18, small_f)
    arrow(d, *rag["R"], *agents["L"])
    arrow(d, *agents["R"], *llm["L"])

    # 6) Fan-out to access
    arrow(d, curated["R"][0], curated["R"][1] - 10, *bi["L"], color=(180, 120, 60))
    arrow(d, *rag["B"], api["L"][0], api["L"][1])
    arrow(d, agents["B"][0], agents["B"][1], *ml["L"], color=(180, 120, 60))

    # 7) Access → consumers
    arrow(d, *bi["R"], *biz["L"])
    arrow(d, *bi["R"], analyst["L"][0], analyst["L"][1] - 10)
    arrow(d, *api["R"], *analyst["L"])
    arrow(d, *api["R"], scientist["L"][0], scientist["L"][1] - 10)
    arrow(d, *ml["R"], *scientist["L"])
    arrow(d, *ml["R"], *apps["L"])
    arrow(d, *llm["B"], apps["L"][0], apps["L"][1] - 20, color=(140, 90, 200))

    # Agents note
    d.text(
        (1600, y0 + 250),
        "QA: Writer → Fact-Checker → Consistency → Critic",
        fill=(90, 70, 120),
        font=small_f,
    )

    # Footer legend
    rounded(d, (40, 1480, 2760, 1550), (255, 201, 67), (232, 163, 2), radius=12)
    d.text(
        (60, 1502),
        "Legend: Sources → dlt → Medallion (Landing → Clean → Curated) → Neo4j → Hybrid RAG → Agentic AI → LLM → APIs / consumers",
        fill=(30, 30, 30),
        font=legend_f,
    )

    img.save(OUT, "PNG")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
