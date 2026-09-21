"""Generate crisp compact 8-column architecture poster with dedicated Agentic AI stage.

Renders at SCALE then Lanczos-downsamples. Icons are rasterized from SVG at
exact paste size via resvg (no intermediate resize) to avoid jagged logos.
"""
from __future__ import annotations

import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SVG_DIR = ROOT / "arch-icons"
ICON_CACHE = ROOT / "arch-icons-png"
OUT = ROOT / "e2e-data-ai-architecture-poster.png"
RASTERIZE = ROOT / "rasterize_icon.cjs"

# Compact LinkedIn-friendly size; drawn at SCALE then Lanczos-downsampled
W = 2400
SCALE = 2

GOLD = (242, 191, 51)
GOLD_DARK = (217, 153, 13)
DARK = (30, 30, 32)
MUTED = (102, 102, 107)
WHITE = (255, 255, 255)
BG = (247, 247, 250)
BORDER = (217, 217, 222)
CARD_BG = (251, 251, 253)
AGENTIC_BG = (255, 252, 242)
AGENTIC_BORDER = (230, 190, 80)


def S(v: float | int) -> int:
    return int(round(v * SCALE))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, S(size))
        except OSError:
            continue
    return ImageFont.load_default()


@lru_cache(maxsize=128)
def load_icon(key: str, pixel_size: int) -> Image.Image:
    """Rasterize SVG at exact pixel size with resvg for clean antialiasing."""
    svg = SVG_DIR / f"{key}.svg"
    canvas = Image.new("RGBA", (pixel_size, pixel_size), (0, 0, 0, 0))
    if not svg.exists():
        png = ICON_CACHE / f"{key}.png"
        if png.exists():
            icon = Image.open(png).convert("RGBA")
            icon = icon.resize((pixel_size, pixel_size), Image.Resampling.LANCZOS)
            canvas.paste(icon, (0, 0), icon)
        return canvas

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        render_size = max(8, int(pixel_size * 0.82))
        subprocess.run(
            ["node", str(RASTERIZE), str(svg), str(render_size), str(tmp_path)],
            check=True,
            capture_output=True,
        )
        icon = Image.open(tmp_path).convert("RGBA")
        ox = (pixel_size - icon.width) // 2
        oy = (pixel_size - icon.height) // 2
        canvas.paste(icon, (ox, oy), icon)
    except (subprocess.CalledProcessError, OSError, FileNotFoundError):
        png = ICON_CACHE / f"{key}.png"
        if png.exists():
            icon = Image.open(png).convert("RGBA").resize(
                (pixel_size, pixel_size), Image.Resampling.LANCZOS
            )
            canvas.paste(icon, (0, 0), icon)
    finally:
        tmp_path.unlink(missing_ok=True)
    return canvas


def place_icon(
    overlay: Image.Image,
    od: ImageDraw.ImageDraw,
    key: str,
    size: int,
    x: int,
    y: int,
    pad: int = 0,
) -> int:
    """Draw soft plate + icon onto RGBA overlay; returns plate outer size."""
    pixel = S(size)
    icon = load_icon(key, pixel)
    plate = pixel + pad * 2
    od.rounded_rectangle(
        (x, y, x + plate, y + plate),
        radius=max(S(5), plate // 5),
        fill=(245, 246, 248, 255),
    )
    overlay.paste(icon, (x + pad, y + pad), icon)
    return plate


def chevron(draw: ImageDraw.ImageDraw, x: int, y: int, h: int = 36):
    w = S(22)
    draw.polygon([(x, y), (x + w, y + h // 2), (x, y + h)], fill=GOLD)


def column_inner_height(col: dict, card_h: int, spacing: int, title_block: int, bottom_pad: int) -> int:
    n = len(col["cards"])
    h = title_block
    if col.get("subtitle"):
        h += S(18)
    h += n * card_h + max(0, n - 1) * spacing
    h += bottom_pad
    return h


def main():
    if not SVG_DIR.exists():
        raise SystemExit(f"Missing SVG icons in {SVG_DIR}")
    if not RASTERIZE.exists():
        raise SystemExit(f"Missing {RASTERIZE}")

    title_f = font(28, True)
    sub_f = font(13)
    bar_f = font(12, True)
    col_f = font(12, True)
    subcol_f = font(10)
    card_f = font(11)
    foot_f = font(11, True)
    num_f = font(11, True)

    columns = [
        {
            "n": "1",
            "title": "Data Sources",
            "cards": [
                ("android", "Apps"),
                ("swagger", "APIs"),
                ("apachekafka", "Events"),
                ("json", "Files"),
            ],
        },
        {
            "n": "2",
            "title": "Ingestion",
            "cards": [
                ("dlt", "dlt pipelines"),
                ("bucket", "bronze raw landing"),
            ],
        },
        {
            "n": "3",
            "title": "Transform & Store",
            "cards": [
                ("bucket", "Landing zone"),
                ("dbt", "Clean zone (dbt)"),
                ("dbt", "Curated zone (dbt)"),
                ("snowflake", "Snowflake"),
                ("googlecloud", "BigQuery"),
                ("databricks", "Databricks"),
            ],
        },
        {
            "n": "4",
            "title": "Knowledge Graph",
            "cards": [
                ("neo4j", "Neo4j"),
                ("elasticsearch", "nodes & edges"),
            ],
        },
        {
            "n": "5",
            "title": "AI Intelligence",
            "cards": [
                ("openai", "Embeddings"),
                ("chromadb", "ChromaDB"),
                ("rag", "hybrid RAG"),
                ("openai", "LLM"),
            ],
        },
        {
            "n": "6",
            "title": "Agentic AI",
            "subtitle": "RAG → Market·Financial·SDG·Critique → QA",
            "highlight": True,
            "cards": [
                ("agentic", "Orchestrator"),
                ("users", "Specialists (parallel)"),
                ("rag", "Writer (synthesis)"),
                ("catalog", "Fact-Checker"),
                ("python", "Consistency"),
                ("ml", "Critic"),
            ],
        },
        {
            "n": "7",
            "title": "Serve",
            "cards": [
                ("rag", "GraphRAG"),
                ("swagger", "semantic search"),
                ("swagger", "REST APIs"),
            ],
        },
        {
            "n": "8",
            "title": "Consumers",
            "cards": [
                ("users", "Business users"),
                ("python", "Data engineers"),
                ("docker", "AI apps"),
            ],
        },
    ]

    # Compact packing metrics (logical px before SCALE)
    margin_l = 20
    gap_l = 10
    arrow_w_l = 20
    card_h_l = 46
    icon_sz_l = 36
    spacing_l = 6
    title_block_l = 40
    bottom_pad_l = 12
    foot_h_l = 44
    header_end_l = 168  # after metadata bar
    start_y_l = header_end_l + 12

    card_h = S(card_h_l)
    spacing = S(spacing_l)
    title_block = S(title_block_l)
    bottom_pad = S(bottom_pad_l)

    col_h = max(
        column_inner_height(c, card_h, spacing, title_block, bottom_pad) for c in columns
    )
    foot_top_l = start_y_l + (col_h // SCALE) + 12
    H = foot_top_l + foot_h_l + 16

    rw, rh = S(W), S(H)
    img = Image.new("RGB", (rw, rh), BG)
    overlay = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    od = ImageDraw.Draw(overlay)

    margin = S(margin_l)
    content_r = rw - margin

    d.text(
        (margin, S(14)),
        "Modern data stack  →  knowledge graph  →  AI serving",
        fill=DARK,
        font=title_f,
    )
    d.text(
        (margin, S(46)),
        "Sources to trusted answers — for builders and everyone who uses the results",
        fill=MUTED,
        font=sub_f,
    )

    # Top bars (compressed)
    d.rounded_rectangle(
        (margin, S(70), content_r, S(108)),
        radius=S(6),
        fill=(255, 237, 189),
        outline=GOLD_DARK,
        width=max(1, S(1)),
    )
    d.text((margin + S(12), S(82)), "Orchestration", fill=DARK, font=bar_f)
    ox = margin + S(130)
    for key, label in (("apacheairflow", "Airflow"), ("dagster", "Dagster")):
        place_icon(overlay, od, key, 22, ox, S(78), pad=S(3))
        d.text((ox + S(32), S(82)), label, fill=DARK, font=bar_f)
        ox += S(120)

    d.rounded_rectangle(
        (margin, S(116), content_r, S(154)),
        radius=S(6),
        fill=(199, 250, 245),
        outline=(89, 179, 166),
        width=max(1, S(1)),
    )
    d.text((margin + S(12), S(128)), "Metadata", fill=DARK, font=bar_f)
    mx = margin + S(100)
    for key, label in (("dbt", "dbt tests"), ("catalog", "catalog")):
        place_icon(overlay, od, key, 22, mx, S(124), pad=S(3))
        d.text((mx + S(32), S(128)), label, fill=DARK, font=bar_f)
        mx += S(130)

    n_cols = len(columns)
    gap = S(gap_l)
    arrow_w = S(arrow_w_l)
    start_x = margin
    start_y = S(start_y_l)
    foot_top = S(foot_top_l)
    usable = content_r - start_x - (n_cols - 1) * (gap + arrow_w)
    col_w = usable // n_cols
    icon_sz = icon_sz_l

    for i, col in enumerate(columns):
        x = start_x + i * (col_w + gap + arrow_w)
        highlight = col.get("highlight", False)
        fill = AGENTIC_BG if highlight else WHITE
        outline = AGENTIC_BORDER if highlight else BORDER

        d.rounded_rectangle(
            (x, start_y, x + col_w, start_y + col_h),
            radius=S(8),
            fill=fill,
            outline=outline,
            width=S(2),
        )

        cx, cy = x + S(18), start_y + S(18)
        r = S(10)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD)
        bb = d.textbbox((0, 0), col["n"], font=num_f)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        d.text((cx - tw / 2, cy - th / 2 - S(1)), col["n"], fill=DARK, font=num_f)
        d.text((x + S(34), start_y + S(10)), col["title"], fill=DARK, font=col_f)

        y = start_y + title_block
        if col.get("subtitle"):
            d.text((x + S(8), y - S(2)), col["subtitle"], fill=MUTED, font=subcol_f)
            y += S(18)

        for idx, (key, label) in enumerate(col["cards"]):
            d.rounded_rectangle(
                (x + S(6), y, x + col_w - S(6), y + card_h),
                radius=S(6),
                fill=WHITE if highlight else CARD_BG,
                outline=BORDER,
                width=max(1, S(1)),
            )
            ix = x + S(8)
            plate = place_icon(
                overlay,
                od,
                key,
                icon_sz,
                ix,
                y + (card_h - S(icon_sz) - S(6)) // 2,
                pad=S(3),
            )
            d.text(
                (ix + plate + S(6), y + (card_h - S(14)) // 2),
                label,
                fill=DARK,
                font=card_f,
            )

            if highlight and idx < len(col["cards"]) - 1:
                tick_x = x + col_w // 2
                d.line(
                    (tick_x, y + card_h + S(1), tick_x, y + card_h + spacing - S(1)),
                    fill=GOLD,
                    width=max(1, S(2)),
                )

            y += card_h + spacing

        if i < n_cols - 1:
            ax = x + col_w + (gap + arrow_w - S(22)) // 2
            ay = start_y + col_h // 2 - S(16)
            chevron(d, ax, ay, S(32))

    foot_h = S(foot_h_l)
    d.rounded_rectangle(
        (margin, foot_top, content_r, foot_top + foot_h),
        radius=S(8),
        fill=GOLD,
    )
    tip_x = content_r
    mid_y = foot_top + foot_h // 2
    d.polygon(
        [
            (tip_x - S(18), foot_top),
            (min(rw - S(2), tip_x + S(12)), mid_y),
            (tip_x - S(18), foot_top + foot_h),
        ],
        fill=GOLD,
    )
    d.text(
        (margin + S(12), foot_top + S(14)),
        "Sources → dlt → Warehouse → dbt → Neo4j → Embeddings → ChromaDB → Hybrid RAG → Agentic AI → GraphRAG / APIs",
        fill=DARK,
        font=foot_f,
    )

    merged = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    final = merged.resize((W, H), Image.Resampling.LANCZOS)
    final.save(OUT, "PNG", compress_level=2, dpi=(144, 144))
    print(f"Wrote {OUT} ({W}x{H}) from {rw}x{rh} supersample")


if __name__ == "__main__":
    main()
