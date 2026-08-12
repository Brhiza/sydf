from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT / "public" / "ShiYue-Tarot-Deck"
ARTWORK = DECK / "artwork"
CARDS = DECK / "cards"
ASSETS = DECK / "assets"
MANIFEST = DECK / "牌序清单.tsv"
FRAME = ASSETS / "079-Card Frame-边框.png"
BACK = ASSETS / "078-Card Back-牌背.png"
FONT_CANDIDATES = (
    Path(r"C:\Users\Administrator\AppData\Local\Microsoft\Windows\Fonts\SourceHanSansCN-Medium.otf"),
    Path(r"C:\Windows\Fonts\msyh.ttc"),
    Path(r"C:\Windows\Fonts\simhei.ttf"),
)

SHIYUE_NAMES = [
    "随云启程", "灵机在握", "月下玄知", "万物丰生", "天阙定疆", "传灯承道", "两心缔缘", "御风前行", "柔心驭兽", "孤灯寻真", "命轮流转",
    "天衡昭正", "倒悬悟道", "蝶蜕新生", "阴阳调和", "欲念成缚", "惊雷破阁", "星河赐愿", "月影迷津", "曦光普照", "天音唤醒", "四海归圆",
    "灵焰初燃", "登楼望野", "云帆启程", "华灯同庆", "群英竞辉", "凯歌荣归", "据峰而守", "流火传讯", "历战持关", "负薪远行", "探火灵童", "驰焰行者", "丹凰御火", "炎君执杖",
    "心泉初涌", "双盏同心", "花宴同欢", "临盏倦心", "空盏惜流", "莲庭旧梦", "幻莲千境", "辞盏远行", "心愿得偿", "阖家承欢", "捧露灵童", "献月使者", "澄心月主", "沧海怀仁",
    "月刃破晓", "闭目持衡", "心雨成伤", "松风止息", "争锋失和", "轻舟渡霭", "月下潜行", "缚丝困身", "长夜忧思", "万刃终局", "听风灵童", "逐电剑使", "霜华明断", "玄刃裁决",
    "天赐玉璧", "双璧回环", "众匠共筑", "怀璧固守", "雪夜寒门", "分玉施恩", "静候花实", "匠心琢玉", "兰庭自足", "世代承泽", "寻玉灵童", "躬耕守成", "厚土养华", "山河丰藏",
]


def centered_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill: tuple[int, int, int, int]) -> None:
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2 - box[1]), text, font=font, fill=fill)


def main() -> None:
    if not FRAME.exists() or not BACK.exists() or not MANIFEST.exists():
        raise FileNotFoundError("时月塔罗边框、牌背或牌序清单不完整")
    font_cn = next((path for path in FONT_CANDIDATES if path.exists()), None)
    if font_cn is None:
        raise FileNotFoundError("缺少可用的中文字体")

    rows = list(csv.reader(MANIFEST.read_text(encoding="utf-8").splitlines(), delimiter="\t"))
    if rows and rows[0][:2] == ["编号", "中文牌名"]:
        rebuilt_rows = []
        for index, artwork_path in enumerate(sorted(ARTWORK.glob("*.png"))):
            parts = artwork_path.stem.split("-", 2)
            if len(parts) != 3:
                raise ValueError(f"无法识别画芯文件名：{artwork_path.name}")
            rebuilt_rows.append([parts[0], parts[1], parts[2]])
        rows = rebuilt_rows
    if len(rows) != 78 or len(SHIYUE_NAMES) != 78:
        raise ValueError("牌序清单和时月牌名都必须正好包含 78 张牌")

    if not ARTWORK.exists():
        source_cards = sorted(CARDS.glob("*.png"))
        if len(source_cards) != 78:
            raise ValueError(f"应有 78 张无框画芯，实际为 {len(source_cards)} 张")
        CARDS.rename(ARTWORK)
    artwork_files = sorted(ARTWORK.glob("*.png"))
    if len(artwork_files) != 78:
        raise ValueError(f"应有 78 张无框画芯，实际为 {len(artwork_files)} 张")

    force = "--force" in sys.argv
    if CARDS.exists() and force:
        shutil.rmtree(CARDS)
    CARDS.mkdir(parents=True, exist_ok=True)

    frame = Image.open(FRAME).convert("RGBA").resize((1024, 1536), Image.Resampling.LANCZOS)
    title_font = ImageFont.truetype(str(font_cn), 46)
    shiyue_font = ImageFont.truetype(str(font_cn), 32)
    ink = (105, 70, 62, 255)
    manifest_rows: list[list[str]] = []

    for index, (row, artwork_path, shiyue_name) in enumerate(zip(rows, artwork_files, SHIYUE_NAMES, strict=True)):
        number, english_name, chinese_name = row[:3]
        if int(number) != index or not artwork_path.name.startswith(f"{index:03d}-"):
            raise ValueError(f"第 {index:03d} 张牌的清单或画芯顺序不匹配")
        with Image.open(artwork_path) as source:
            card = source.convert("RGBA").resize((1024, 1536), Image.Resampling.LANCZOS)
        card.alpha_composite(frame)
        draw = ImageDraw.Draw(card)
        centered_text(draw, (512, 1400), chinese_name, title_font, ink)
        centered_text(draw, (512, 1463), shiyue_name, shiyue_font, ink)
        output_name = f"{number}-{chinese_name}-{shiyue_name}.png"
        output_path = CARDS / output_name
        if force or not output_path.exists():
            card.convert("RGB").save(output_path, "PNG", optimize=True)
        manifest_rows.append([number, chinese_name, shiyue_name, output_name])

    with Image.open(BACK) as source:
        source.convert("RGB").save(DECK / "牌背.png", "PNG", optimize=True)
    with MANIFEST.open("w", encoding="utf-8", newline="\n") as manifest:
        manifest.write("编号\t中文牌名\t时月牌名\t文件名\n" + "\n".join("\t".join(row) for row in manifest_rows) + "\n")
    print(f"已生成 {len(manifest_rows)} 张时月塔罗牌面和 1 张牌背")


if __name__ == "__main__":
    main()
