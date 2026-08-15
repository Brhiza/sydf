from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import zipfile
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image


CARD_QUALITY = 92
GENERAL_QUALITY = 92

GROUP_FILES: dict[str, tuple[str, ...]] = {
    "banner": ("banner.webp",),
    "shengbei": ("ritual/shengbei-yang.webp", "ritual/shengbei-yin.webp"),
    "liuyao": ("ritual/coin-heads.webp", "ritual/coin-tails.webp", "ritual/shell.webp"),
    "xiaoliuren": tuple(f"xiaoliuren/{name}.webp" for name in (
        "da-an", "liu-lian", "su-xi", "chi-kou", "xiao-ji", "kong-wang",
    )),
    "fortune-status": tuple(f"fortune-status/{name}.webp" for name in (
        "da-ji", "ji", "xiao-ji", "ping", "xiao-xiong", "xiong", "da-xiong",
    )),
    "tarot": tuple([*(f"cards/tarot/{number:03d}.webp" for number in range(78)), "cards/tarot/back.webp"]),
    "lenormand": tuple(f"cards/lenormand/{number:02d}.webp" for number in range(1, 37)),
    "oracle": tuple(f"cards/oracle/{number:02d}.webp" for number in range(1, 61)),
    "hexagrams": tuple(f"cards/hexagrams/{number:02d}.webp" for number in range(1, 65)),
    "ssgw": tuple(f"cards/ssgw/{number:02d}.webp" for number in range(1, 93)),
}


def numeric_prefix(name: str) -> int:
    match = re.match(r"^(\d+)", Path(name).name)
    if not match:
        raise ValueError(f"文件名缺少数字编号：{name}")
    return int(match.group(1))


def ensure_clean_directory(path: Path, allowed_parent: Path) -> None:
    resolved = path.resolve()
    parent = allowed_parent.resolve()
    if resolved.parent != parent:
        raise ValueError(f"拒绝清理非主题输出目录：{resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)
    resolved.mkdir(parents=True, exist_ok=True)


def save_webp(image: Image.Image, target: Path, quality: int = GENERAL_QUALITY) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    converted = image.convert("RGBA" if image.mode in {"RGBA", "LA"} else "RGB")
    converted.save(target, "WEBP", quality=quality, method=6)
    converted.close()


def convert_file(source: Path, target: Path, quality: int = GENERAL_QUALITY) -> None:
    with Image.open(source) as image:
        save_webp(image, target, quality)


def convert_bytes(data: bytes, target: Path, quality: int = CARD_QUALITY) -> None:
    with Image.open(io.BytesIO(data)) as image:
        save_webp(image, target, quality)


def indexed_files(folder: Path, expected: int) -> list[Path]:
    files = sorted(
        (item for item in folder.iterdir() if item.is_file() and item.suffix.lower() in {".png", ".webp", ".jpg", ".jpeg"}),
        key=lambda item: numeric_prefix(item.name),
    )
    numbers = [numeric_prefix(item.name) for item in files]
    expected_numbers = list(range(0 if numbers and numbers[0] == 0 else 1, (0 if numbers and numbers[0] == 0 else 1) + expected))
    if numbers != expected_numbers:
        raise ValueError(f"{folder} 编号不完整：预期 {expected_numbers[0]}–{expected_numbers[-1]}，实际 {numbers}")
    return files


def zip_images(zip_path: Path, expected: int, start: int) -> list[tuple[int, bytes]]:
    with zipfile.ZipFile(zip_path) as archive:
        entries = [
            entry
            for entry in archive.infolist()
            if not entry.is_dir() and Path(entry.filename).suffix.lower() in {".png", ".webp", ".jpg", ".jpeg"}
        ]
        numbered = sorted(((numeric_prefix(entry.filename), entry) for entry in entries), key=lambda item: item[0])
        numbers = [number for number, _ in numbered]
        expected_numbers = list(range(start, start + expected))
        if numbers != expected_numbers:
            raise ValueError(f"{zip_path.name} 编号不完整：预期 {expected_numbers[0]}–{expected_numbers[-1]}，实际 {numbers}")
        return [(number, archive.read(entry)) for number, entry in numbered]


def convert_numbered_files(files: Iterable[Path], target: Path, digits: int, start: int) -> None:
    for offset, source in enumerate(files):
        convert_file(source, target / f"{start + offset:0{digits}d}.webp", CARD_QUALITY)


def convert_numbered_zip(zip_path: Path, target: Path, expected: int, digits: int, start: int) -> None:
    for number, data in zip_images(zip_path, expected, start):
        convert_bytes(data, target / f"{number:0{digits}d}.webp", CARD_QUALITY)


def crop_sheet(source: Path, target: Path, boxes: dict[str, tuple[int, int, int, int]]) -> None:
    with Image.open(source) as sheet:
        for name, box in boxes.items():
            crop = sheet.crop(box)
            save_webp(crop, target / f"{name}.webp", CARD_QUALITY)
            crop.close()


def chroma_key_green(image: Image.Image) -> Image.Image:
    pixels = np.asarray(image.convert("RGBA")).copy()
    red = pixels[:, :, 0].astype(np.int16)
    green = pixels[:, :, 1].astype(np.int16)
    blue = pixels[:, :, 2].astype(np.int16)
    green_screen = (green > 90) & (green > red * 1.18) & (green > blue * 1.18) & ((green - np.maximum(red, blue)) > 34)
    pixels[green_screen, :3] = 0
    pixels[green_screen, 3] = 0
    return Image.fromarray(pixels, "RGBA")


def crop_green_screen_sheet(source: Path, target: Path, boxes: dict[str, tuple[int, int, int, int]]) -> None:
    with Image.open(source) as sheet:
        for name, box in boxes.items():
            keyed = chroma_key_green(sheet.crop(box))
            visible = keyed.getbbox()
            if not visible:
                raise ValueError(f"{source.name} 的 {name} 裁切区域没有有效内容")
            trimmed = keyed.crop(visible)
            save_webp(trimmed, target / f"{name}.webp", CARD_QUALITY)
            trimmed.close()
            keyed.close()


def write_manifest(theme_root: Path, *, theme_id: str, name: str, complete_groups: list[str], inherits: str | None = None) -> None:
    manifest = {
        "id": theme_id,
        "name": name,
        "inherits": inherits,
        "completeGroups": complete_groups,
        "cardStyle": {"frame": False, "textBakedIntoImage": False, "cornerRadius": "ui"},
    }
    (theme_root / "theme.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_yue(project_root: Path, output_root: Path, tarot_zip: Path) -> None:
    source = project_root / "theme-sources/月"
    target = output_root / "yue"
    ensure_clean_directory(target, output_root)

    with zipfile.ZipFile(tarot_zip) as archive:
        tarot_entries = sorted(
            (
                (numeric_prefix(entry.filename), entry)
                for entry in archive.infolist()
                if "/cards/" in entry.filename.replace("\\", "/") and Path(entry.filename).suffix.lower() == ".png"
            ),
            key=lambda item: item[0],
        )
        numbers = [number for number, _ in tarot_entries]
        if numbers != list(range(78)):
            raise ValueError(f"月塔罗编号不完整：{numbers}")
        for number, entry in tarot_entries:
            convert_bytes(archive.read(entry), target / "cards" / "tarot" / f"{number:03d}.webp")
        back = next((entry for entry in archive.infolist() if "078-Card Back" in entry.filename), None)
        if not back:
            raise ValueError("月塔罗压缩包缺少牌背 078-Card Back")
        convert_bytes(archive.read(back), target / "cards" / "tarot" / "back.webp")

    convert_numbered_files(indexed_files(source / "cards/lenormand", 36), target / "cards/lenormand", 2, 1)
    convert_numbered_files(indexed_files(source / "cards/shiyue-oracle", 60), target / "cards/oracle", 2, 1)
    convert_numbered_files(indexed_files(source / "cards/hexagrams", 64), target / "cards/hexagrams", 2, 1)
    convert_numbered_files(indexed_files(source / "cards/ssgw", 92), target / "cards/ssgw", 2, 1)

    for item in (source / "xiaoliuren").glob("*.webp"):
        convert_file(item, target / "xiaoliuren" / item.name)
    for item in (source / "fortune-status").glob("*.webp"):
        convert_file(item, target / "fortune-status" / item.name)

    shared = {
        "zhanbu.png": "banner.webp",
        "shengbei-yang.webp": "ritual/shengbei-yang.webp",
        "shengbei-yin.webp": "ritual/shengbei-yin.webp",
        "liuyao-coin-heads-transparent.webp": "ritual/coin-heads.webp",
        "liuyao-coin-tails-transparent.webp": "ritual/coin-tails.webp",
        "liuyao-shell-transparent.webp": "ritual/shell.webp",
    }
    for source_name, target_name in shared.items():
        convert_file(source / source_name, target / target_name)

    write_manifest(
        target,
        theme_id="yue",
        name="月",
        complete_groups=["banner", "shengbei", "liuyao", "xiaoliuren", "fortune-status", "tarot", "lenormand", "oracle", "hexagrams", "ssgw"],
    )


def build_shi(project_root: Path, output_root: Path) -> None:
    source = project_root / "theme-sources/时"
    target = output_root / "shi"
    ensure_clean_directory(target, output_root)

    zip_specs = [
        ("01-塔罗牌-78张-1024x1536-无框画芯-复审重制版.zip", "tarot", 78, 3, 0),
        ("02-雷诺曼-36张-1024x1536-无框画芯-复审重制版.zip", "lenormand", 36, 2, 1),
        ("03-时月神谕-60张-1024x1536-无框画芯-复审重制版.zip", "oracle", 60, 2, 1),
        ("04-六十四卦-64张-1024x1536-无框画芯-复审重制版.zip", "hexagrams", 64, 2, 1),
        ("05-三山国王九十二灵签-92张-1024x1536-无框画芯-复审重制版.zip", "ssgw", 92, 2, 1),
    ]
    for zip_name, group, count, digits, start in zip_specs:
        convert_numbered_zip(source / zip_name, target / "cards" / group, count, digits, start)

    card_back = source / "ChatGPT Image 2026年8月15日 18_19_14.png"
    convert_file(card_back, target / "cards/tarot/back.webp", CARD_QUALITY)

    xlr_boxes = {
        "da-an": (62, 13, 486, 538),
        "liu-lian": (513, 13, 938, 538),
        "su-xi": (966, 13, 1391, 538),
        "chi-kou": (62, 548, 486, 1075),
        "xiao-ji": (513, 548, 938, 1075),
        "kong-wang": (966, 548, 1391, 1075),
    }
    fortune_boxes = {
        "da-ji": (19, 38, 356, 552),
        "ji": (362, 38, 699, 552),
        "xiao-ji": (706, 38, 1043, 552),
        "ping": (1048, 38, 1386, 552),
        "xiao-xiong": (174, 571, 511, 1092),
        "xiong": (529, 571, 870, 1092),
        "da-xiong": (895, 571, 1231, 1092),
    }
    crop_sheet(source / "小六壬图-1448x1086.png", target / "xiaoliuren", xlr_boxes)
    crop_sheet(source / "吉凶图-1402x1122.png", target / "fortune-status", fortune_boxes)

    convert_file(source / "zhanbu.png", target / "banner.webp")
    crop_green_screen_sheet(
        source / "1786806940229.png",
        target / "ritual",
        {
            "shengbei-yang": (140, 170, 629, 1044),
            "shengbei-yin": (625, 170, 1135, 1044),
        },
    )
    crop_green_screen_sheet(
        source / "1786806995493.png",
        target / "ritual",
        {
            "shell": (302, 8, 967, 748),
            "coin-heads": (137, 769, 628, 1216),
            "coin-tails": (624, 769, 1118, 1216),
        },
    )

    write_manifest(
        target,
        theme_id="shi",
        name="时",
        complete_groups=["banner", "shengbei", "liuyao", "xiaoliuren", "fortune-status", "tarot", "lenormand", "oracle", "hexagrams", "ssgw"],
    )


def build_mo(project_root: Path, output_root: Path) -> None:
    source = project_root / "theme-sources/墨"
    target = output_root / "mo"
    ensure_clean_directory(target, output_root)

    xlr_boxes = {
        "da-an": (128, 15, 495, 507),
        "liu-lian": (570, 15, 938, 507),
        "su-xi": (1011, 15, 1378, 507),
        "chi-kou": (128, 522, 495, 1014),
        "xiao-ji": (570, 522, 938, 1014),
        "kong-wang": (1011, 522, 1378, 1014),
    }
    fortune_boxes = {
        "da-ji": (18, 14, 376, 507),
        "ji": (400, 14, 758, 507),
        "xiao-ji": (780, 14, 1138, 507),
        "ping": (1160, 14, 1518, 507),
        "xiao-xiong": (198, 522, 558, 1016),
        "xiong": (590, 522, 950, 1016),
        "da-xiong": (981, 522, 1341, 1016),
    }
    crop_sheet(source / "ChatGPT Image 2026年8月15日 22_27_00.png", target / "xiaoliuren", xlr_boxes)
    crop_sheet(source / "ChatGPT Image 2026年8月15日 22_27_09.png", target / "fortune-status", fortune_boxes)
    write_manifest(target, theme_id="mo", name="墨", complete_groups=["xiaoliuren", "fortune-status"], inherits="yue")


def validate_output(output_root: Path) -> None:
    manifests: dict[str, dict[str, object]] = {}
    for root in sorted(item for item in output_root.iterdir() if item.is_dir()):
        manifest_path = root / "theme.json"
        if not manifest_path.is_file():
            raise ValueError(f"主题目录缺少 theme.json：{root.name}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        theme_id = manifest.get("id")
        if theme_id != root.name:
            raise ValueError(f"{root.name}/theme.json 的 id 必须为 {root.name}")
        groups = manifest.get("completeGroups")
        if not isinstance(groups, list) or any(group not in GROUP_FILES for group in groups):
            raise ValueError(f"{root.name}/theme.json 的 completeGroups 无效：{groups}")
        for group in groups:
            missing = [relative for relative in GROUP_FILES[group] if not (root / relative).is_file()]
            if missing:
                raise ValueError(f"{root.name}/{group} 缺少资源：{missing}")
        manifests[root.name] = manifest

    if "yue" not in manifests:
        raise ValueError("主题输出必须包含作为最终回退的月主题")
    for theme_id, manifest in manifests.items():
        inherited = manifest.get("inherits")
        if inherited is not None and inherited not in manifests:
            raise ValueError(f"{theme_id} 继承了不存在的主题：{inherited}")

        visited: set[str] = set()
        current: str | None = theme_id
        while current is not None:
            if current in visited:
                raise ValueError(f"主题继承出现循环：{theme_id}")
            visited.add(current)
            parent = manifests[current].get("inherits")
            current = parent if isinstance(parent, str) else None
    print("主题资源生成并校验完成。")


def main() -> None:
    builders = {
        "yue": build_yue,
        "shi": build_shi,
        "mo": build_mo,
    }
    parser = argparse.ArgumentParser(description="生成可直接用于网站的占卜主题资源。")
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--yue-tarot-zip", type=Path)
    parser.add_argument("--themes", nargs="+", choices=builders, default=list(builders))
    args = parser.parse_args()

    project_root = args.project_root.resolve()
    output_root = project_root / "public/divination-themes"
    output_root.mkdir(parents=True, exist_ok=True)
    if "yue" in args.themes:
        if args.yue_tarot_zip is None:
            parser.error("重建月主题时必须提供 --yue-tarot-zip")
        build_yue(project_root, output_root, args.yue_tarot_zip.resolve())
    if "shi" in args.themes:
        build_shi(project_root, output_root)
    if "mo" in args.themes:
        build_mo(project_root, output_root)
    validate_output(output_root)


if __name__ == "__main__":
    main()
