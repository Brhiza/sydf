from __future__ import annotations

import csv
import os
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DECK = ROOT / "public" / "ShiYue-Tarot-Deck"
ARTWORK = DECK / "artwork"
CARDS = DECK / "cards"
ASSETS = DECK / "assets"
MANIFEST = DECK / "牌序清单.tsv"
TEMPLATE = DECK / "000-The Fool-愚者.psd"
FRAME = ASSETS / "PSD母版-边框.png"
MASK = ASSETS / "PSD母版-遮罩.png"
PHOTOSHOP = Path(r"D:\software\Photoshop\Adobe Photoshop 2024\Photoshop.exe")
ROMAN_NUMERALS = ("", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI")


def escape_js(value: str) -> str:
    return value.replace("\\", "/").replace('"', '\\"')


def build_base(artwork_path: Path, output_path: Path) -> None:
    build_base_image(artwork_path).save(output_path, "PNG", optimize=True)


def build_base_image(artwork_path: Path) -> Image.Image:
    with Image.open(artwork_path) as source, Image.open(MASK) as mask_source, Image.open(FRAME) as frame_source:
        artwork = source.convert("RGBA").resize((1024, 1536), Image.Resampling.LANCZOS)
        mask = mask_source.convert("RGBA").getchannel("A")
        clipped = Image.new("RGBA", artwork.size)
        clipped.paste(artwork, (0, 0), mask)
        clipped.alpha_composite(frame_source.convert("RGBA"))
        return clipped


def traditional_number(index: int) -> str:
    if index == 0:
        return "0"
    if index <= 21:
        return ROMAN_NUMERALS[index]

    rank = (index - 22) % 14 + 1
    return ROMAN_NUMERALS[rank] if rank <= 10 else ""


def build_text_script(cards: list[tuple[Path, Path, str, str, str]]) -> str:
    jobs = ",\n".join(
        '{{base:"{}",output:"{}",traditional:"{}",shiyue:"{}",number:"{}"}}'.format(
            escape_js(str(base_path)),
            escape_js(str(output_path)),
            escape_js(traditional_name),
            escape_js(shiyue_name),
            escape_js(number),
        )
        for base_path, output_path, traditional_name, shiyue_name, number in cards
    )
    return f'''#target photoshop
app.displayDialogs = DialogModes.NO;
var jobs = [{jobs}];
function addText(name, contents, size, baselineY) {{
  var layer = document.artLayers.add();
  layer.name = name;
  layer.kind = LayerKind.TEXT;
  var text = layer.textItem;
  text.kind = TextType.POINTTEXT;
  text.contents = contents;
  text.font = "SourceHanSerifCN-Bold";
  text.size = new UnitValue(size, "pt");
  text.justification = Justification.CENTER;
  text.position = [new UnitValue(516, "px"), new UnitValue(baselineY, "px")];
  var color = new SolidColor();
  color.rgb.red = 105; color.rgb.green = 70; color.rgb.blue = 62;
  text.color = color;
}}
for (var index = 0; index < jobs.length; index += 1) {{
  var job = jobs[index];
  var document = app.open(new File(job.base));
  if (job.number) addText("传统编号", job.number, 34, 1372);
  addText(job.traditional, job.traditional, 68, 1467);
  addText(job.shiyue, job.shiyue, 36, 1507);
  var options = new PNGSaveOptions();
  options.compression = 6;
  options.interlaced = false;
  document.saveAs(new File(job.output), options, true, Extension.LOWERCASE);
  document.close(SaveOptions.DONOTSAVECHANGES);
}}
'''


def build_number_overlay_script(overlays: list[tuple[str, Path]]) -> str:
    jobs = ",\n".join(
        '{{number:"{}",output:"{}"}}'.format(escape_js(number), escape_js(str(output_path)))
        for number, output_path in overlays
    )
    return f'''#target photoshop
app.displayDialogs = DialogModes.NO;
var jobs = [{jobs}];
function addNumber(contents) {{
  var layer = document.artLayers.add();
  layer.name = "传统编号";
  layer.kind = LayerKind.TEXT;
  var text = layer.textItem;
  text.kind = TextType.POINTTEXT;
  text.contents = contents;
  text.font = "SourceHanSerifCN-Bold";
  text.size = new UnitValue(34, "pt");
  text.justification = Justification.CENTER;
  text.position = [new UnitValue(516, "px"), new UnitValue(1372, "px")];
  var color = new SolidColor();
  color.rgb.red = 105; color.rgb.green = 70; color.rgb.blue = 62;
  text.color = color;
}}
for (var index = 0; index < jobs.length; index += 1) {{
  var job = jobs[index];
  var document = app.documents.add(1024, 1536, 72, "number", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
  addNumber(job.number);
  var options = new PNGSaveOptions();
  options.compression = 1;
  options.interlaced = false;
  document.saveAs(new File(job.output), options, true, Extension.LOWERCASE);
  document.close(SaveOptions.DONOTSAVECHANGES);
}}
'''


def run_photoshop_script(script: str, temp_dir: Path) -> None:
    script_path = temp_dir / "build.jsx"
    script_path.write_text(script, encoding="utf-8", newline="\n")
    powershell_path = temp_dir / "run-photoshop.ps1"
    powershell_path.write_text(
        "$ErrorActionPreference='Stop'\n"
        "$app=New-Object -ComObject Photoshop.Application\n"
        "$app.Visible=$false\n"
        f"$app.DoJavaScriptFile('{str(script_path).replace("'", "''")}') | Out-Null\n"
        "$app.Quit()\n",
        encoding="utf-8",
        newline="\n",
    )
    completed = os.spawnl(
        os.P_WAIT,
        str(Path(os.environ["SystemRoot"]) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"),
        "powershell.exe",
        "-NoProfile",
        "-File",
        str(powershell_path),
    )
    if completed != 0:
        raise RuntimeError(f"Photoshop 合成失败，退出码：{completed}")


def add_numbers_to_existing_cards(rows: list[list[str]], artwork_files: list[Path]) -> None:
    with tempfile.TemporaryDirectory(prefix="shiyue-tarot-numbers-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        distinct_numbers = list(dict.fromkeys(traditional_number(index) for index in range(78)))
        overlays = [(number, temp_dir / f"number-{index:02d}.png") for index, number in enumerate(distinct_numbers) if number]
        run_photoshop_script(build_number_overlay_script(overlays), temp_dir)
        overlay_by_number = {number: path for number, path in overlays}

        for index, row in enumerate(rows):
            _, _, _, output_name = row[:4]
            card_path = CARDS / output_name
            if not card_path.exists():
                raise FileNotFoundError(f"缺少待增加编号的牌面：{card_path}")

            # 先用无字画芯恢复编号所在的小区域，使此模式可安全重复执行。
            base = build_base_image(artwork_files[index])
            with Image.open(card_path) as card_source:
                card = card_source.convert("RGBA")
                card.paste(base.crop((430, 1320, 600, 1408)), (430, 1320))
                number = traditional_number(index)
                if number:
                    with Image.open(overlay_by_number[number]) as overlay_source:
                        card.alpha_composite(overlay_source.convert("RGBA"))
                card.save(card_path, "PNG", compress_level=6)

    print("已在现有 78 张牌面上增加传统编号")


def main() -> None:
    required = (TEMPLATE, FRAME, MASK, MANIFEST, PHOTOSHOP)
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("缺少 PSD 母版、提取资源或 Photoshop：" + "、".join(missing))

    with MANIFEST.open("r", encoding="utf-8", newline="") as manifest:
        rows = list(csv.reader(manifest, delimiter="\t"))[1:]
    if len(rows) != 78:
        raise ValueError("牌序清单必须正好包含 78 张牌")

    limit = int(os.environ.get("SHIYUE_TAROT_LIMIT", "78"))
    output_dir = Path(os.environ.get("SHIYUE_TAROT_OUTPUT", str(CARDS)))
    output_dir.mkdir(parents=True, exist_ok=True)
    artwork_files = sorted(ARTWORK.glob("*.png"))
    if len(artwork_files) != 78:
        raise ValueError("画芯目录必须正好包含 78 张牌")

    if os.environ.get("SHIYUE_TAROT_NUMBERS_ONLY") == "1":
        add_numbers_to_existing_cards(rows, artwork_files)
        return

    with tempfile.TemporaryDirectory(prefix="shiyue-tarot-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        jobs: list[tuple[Path, Path, str, str, str]] = []
        for index, row in enumerate(rows[:limit]):
            number, traditional_name, shiyue_name, output_name = row[:4]
            artwork_path = artwork_files[index]
            if not artwork_path.name.startswith(number + "-"):
                raise ValueError(f"第 {number} 张牌的清单与画芯顺序不匹配")
            base_path = temp_dir / f"{number}-base.png"
            output_path = output_dir / output_name
            build_base(artwork_path, base_path)
            jobs.append((base_path, output_path, traditional_name, shiyue_name, traditional_number(index)))

        run_photoshop_script(build_text_script(jobs), temp_dir)

    print(f"已按 PSD 母版生成 {min(limit, 78)} 张时月塔罗牌")


if __name__ == "__main__":
    main()
