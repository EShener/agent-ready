#!/usr/bin/env python3
"""Render the README demo GIF for agent-ready.

This is an optional marketing asset script. It requires Pillow locally, but the
published CLI remains zero-dependency at runtime.
"""

from __future__ import annotations

import math
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets" / "agent-ready-pr-comment.gif"
WIDTH = 980
HEIGHT = 560
FRAMES = 72
FRAME_MS = 70


COLORS = {
    "bg": "#f6f8fa",
    "panel": "#ffffff",
    "border": "#d0d7de",
    "muted": "#57606a",
    "text": "#24292f",
    "subtle": "#6e7781",
    "blue": "#0969da",
    "blue_bg": "#ddf4ff",
    "green": "#1a7f37",
    "green_bg": "#dafbe1",
    "yellow": "#9a6700",
    "yellow_bg": "#fff8c5",
    "red": "#cf222e",
    "dark": "#0d1117",
    "code": "#f6f8fa",
}


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if mono:
        candidates.extend(
            [
                "/System/Library/Fonts/SFNSMono.ttf",
                "/System/Library/Fonts/Menlo.ttc",
                "/System/Library/Fonts/Supplemental/Courier New.ttf",
            ]
        )
    elif bold:
        candidates.extend(
            [
                "/System/Library/Fonts/SFNS.ttf",
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
            ]
        )
    else:
        candidates.extend(
            [
                "/System/Library/Fonts/SFNS.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
            ]
        )

    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except OSError:
                continue
    return ImageFont.load_default()


F = {
    "title": font(23, bold=True),
    "h1": font(20, bold=True),
    "h2": font(16, bold=True),
    "body": font(14),
    "small": font(12),
    "tiny": font(10),
    "mono": font(12, mono=True),
    "mono_bold": font(12, bold=True, mono=True),
}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 3


def blend(a: str, b: str, amount: float) -> tuple[int, int, int]:
    ar, ag, ab = hex_to_rgb(a)
    br, bg, bb = hex_to_rgb(b)
    return (
        round(ar + (br - ar) * amount),
        round(ag + (bg - ag) * amount),
        round(ab + (bb - ab) * amount),
    )


def shadow_card(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int = 12) -> None:
    x1, y1, x2, y2 = xy
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    layer_draw.rounded_rectangle((x1, y1 + 5, x2, y2 + 8), radius=radius, fill=(27, 31, 36, 30))
    blurred = layer.filter(ImageFilter.GaussianBlur(8))
    draw._image.alpha_composite(blurred)
    draw.rounded_rectangle(xy, radius=radius, fill=COLORS["panel"], outline=COLORS["border"], width=1)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, fill: str = "text", f: str = "body") -> None:
    draw.text(xy, value, fill=COLORS.get(fill, fill), font=F[f])


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], label: str, fill: str, fg: str, pad: int = 9) -> int:
    x, y = xy
    bbox = draw.textbbox((0, 0), label, font=F["small"])
    width = bbox[2] - bbox[0] + pad * 2
    height = 24
    draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=fill, outline=blend(fill, fg, 0.22))
    draw.text((x + pad, y + 5), label, fill=fg, font=F["small"])
    return width


def progress(draw: ImageDraw.ImageDraw, active: int) -> None:
    labels = ["scan", "score", "comment", "ready"]
    x = 648
    y = 91
    for index, label in enumerate(labels):
        is_done = index < active
        is_active = index == active
        color = COLORS["green"] if is_done else COLORS["blue"] if is_active else COLORS["border"]
        draw.ellipse((x, y, x + 16, y + 16), fill=color)
        if index < len(labels) - 1:
            draw.line((x + 18, y + 8, x + 74, y + 8), fill=COLORS["green"] if is_done else COLORS["border"], width=3)
        draw.text((x - 4, y + 22), label, fill=COLORS["muted"], font=F["tiny"])
        x += 78


def draw_browser(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((34, 28, 946, 518), radius=15, fill=COLORS["panel"], outline=COLORS["border"])
    draw.rectangle((35, 67, 945, 68), fill=COLORS["border"])
    for i, color in enumerate(["#ff5f57", "#ffbd2e", "#28c840"]):
        draw.ellipse((54 + i * 20, 47, 66 + i * 20, 59), fill=color)
    draw.rounded_rectangle((144, 42, 844, 61), radius=9, fill=COLORS["bg"], outline="#eaeef2")
    text(draw, (164, 45), "github.com/acme/webapp/pull/42", "muted", "small")


def draw_pr_header(draw: ImageDraw.ImageDraw, scene: int) -> None:
    draw.text((68, 91), "Add AI-ready repo instructions", fill=COLORS["text"], font=F["title"])
    pill(draw, (68, 126), "Open", COLORS["green_bg"], COLORS["green"])
    text(draw, (130, 130), "bigo wants to merge 3 commits into main", "muted", "small")
    tabs = ["Conversation", "Commits", "Checks", "Files changed"]
    x = 68
    for tab in tabs:
        active = tab == "Conversation"
        draw.text((x, 165), tab, fill=COLORS["text"] if active else COLORS["muted"], font=F["small"])
        if active:
            draw.line((x, 185, x + 82, 185), fill="#fd8c73", width=3)
        x += 112
    progress(draw, min(scene + 1, 3))


def draw_sidebar(draw: ImageDraw.ImageDraw, scene: int) -> None:
    shadow_card(draw, (698, 206, 910, 405), radius=10)
    text(draw, (718, 224), "Checks", "text", "h2")
    status = "Queued" if scene == 0 else "Passing"
    status_color = COLORS["yellow"] if scene == 0 else COLORS["green"]
    status_bg = COLORS["yellow_bg"] if scene == 0 else COLORS["green_bg"]
    pill(draw, (718, 252), status, status_bg, status_color)
    items = [
        ("agent-ready", "72/100 before" if scene < 2 else "100/100 ready"),
        ("test", "passed"),
        ("lint", "passed"),
    ]
    y = 292
    for name, value in items:
        draw.ellipse((718, y + 3, 728, y + 13), fill=COLORS["green"] if scene > 0 or name != "agent-ready" else COLORS["yellow"])
        text(draw, (738, y), name, "text", "small")
        text(draw, (828, y), value, "muted", "small")
        y += 31


def draw_matrix(draw: ImageDraw.ImageDraw, x: int, y: int, ready: bool) -> None:
    agents = ["Codex", "Cursor", "Copilot", "Claude", "Gemini"]
    for index, agent in enumerate(agents):
        ay = y + index * 21
        color = COLORS["green"] if ready or index == 0 else COLORS["yellow"]
        label = "ready" if ready or index == 0 else "missing"
        draw.ellipse((x, ay + 5, x + 9, ay + 14), fill=color)
        text(draw, (x + 18, ay), agent, "text", "small")
        text(draw, (x + 120, ay), label, "muted", "small")


def draw_comment(draw: ImageDraw.ImageDraw, scene: int, slide: float) -> None:
    top = round(218 + (1 - slide) * 22)
    shadow_card(draw, (72, top, 660, top + 270), radius=12)
    draw.ellipse((92, top + 22, 128, top + 58), fill=COLORS["dark"])
    text(draw, (139, top + 22), "agent-ready bot", "text", "h2")
    text(draw, (139, top + 45), "commented just now", "muted", "small")
    if scene == 0:
        pill(draw, (488, top + 22), "running", COLORS["yellow_bg"], COLORS["yellow"])
        text(draw, (102, top + 86), "Scanning repository instructions...", "text", "h2")
        draw.rounded_rectangle((102, top + 126, 612, top + 140), radius=7, fill="#eaeef2")
        draw.rounded_rectangle((102, top + 126, 372, top + 140), radius=7, fill=COLORS["blue"])
        text(draw, (102, top + 166), "Detecting commands, agent docs, CI, and stale references.", "muted", "small")
        return

    ready = scene == 2
    score = "100/100 (A)" if ready else "72/100 (C)"
    compat = "5/5 ready" if ready else "1/5 ready"
    status = "ready" if ready else "needs work"
    pill(draw, (504, top + 22), status, COLORS["green_bg"] if ready else COLORS["yellow_bg"], COLORS["green"] if ready else COLORS["yellow"])
    text(draw, (102, top + 82), "Agent Ready", "text", "h1")
    text(draw, (102, top + 114), f"Score: {score}", "green" if ready else "yellow", "h2")
    text(draw, (242, top + 116), f"Agent compatibility: {compat}", "text", "small")
    draw.line((102, top + 146, 620, top + 146), fill=COLORS["border"], width=1)
    draw_matrix(draw, 102, top + 158, ready)
    if ready:
        text(draw, (380, top + 171), "No readiness fixes needed.", "green", "h2")
        text(draw, (380, top + 203), "PR comment updated automatically", "muted", "small")
        text(draw, (380, top + 226), "comment: true", "blue", "mono_bold")
    else:
        text(draw, (380, top + 164), "Top fixes", "text", "h2")
        fixes = [
            "+25 missing-agents-md",
            "+10 missing-test-command",
            "+8 missing-ci",
        ]
        for i, fix in enumerate(fixes):
            text(draw, (380, top + 193 + i * 24), fix, "muted", "mono")


def draw_headline(draw: ImageDraw.ImageDraw, scene: int) -> None:
    labels = [
        ("Run the Action", "agent-ready scans every pull request"),
        ("Post the summary", "score, compatibility, and top fixes in one comment"),
        ("Update after fixes", "one bot comment stays current instead of spamming"),
    ]
    title, subtitle = labels[scene]
    text(draw, (72, 196), title, "text", "h2")
    text(draw, (230, 199), subtitle, "muted", "small")


def frame(index: int) -> Image.Image:
    t = index / (FRAMES - 1)
    scene = min(2, int(t * 3))
    local = (t * 3) - scene
    slide = ease(local)
    bg = blend("#f6f8fa", "#eef6ff", 0.35 + 0.25 * math.sin(t * math.pi))
    image = Image.new("RGBA", (WIDTH, HEIGHT), bg + (255,))
    draw = ImageDraw.Draw(image)
    draw_browser(draw)
    draw_pr_header(draw, scene)
    draw_sidebar(draw, scene)
    draw_comment(draw, scene, slide)
    draw_headline(draw, scene)
    return image.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames = [frame(index) for index in range(FRAMES)]
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
