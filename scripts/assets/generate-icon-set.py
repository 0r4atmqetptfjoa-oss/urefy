#!/usr/bin/env python3
"""
generate-icon-set.py - Complete PWA & Web App Icon Generation & Verification Pipeline

Generates:
1. Exact square icon sizes:
   16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024.
2. Maskable icon variants (with 10% safe zone padding and theme background).
3. Standard web aliases (favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png,
   android-chrome-192x192.png, android-chrome-512x512.png, favicon.ico).
4. Web App Manifest icon descriptor (icons-manifest.json).
5. Programmatic alpha verification for each generated standard icon output.
"""

import sys
import os
import argparse
import json
import shutil
import subprocess
import tempfile
from typing import List, Tuple, Dict, Any, Optional

import numpy as np
from PIL import Image

# Import local sibling modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
try:
    import verify_alpha
except ImportError:
    verify_alpha = None

try:
    import process_transparency
except ImportError:
    process_transparency = None

# Exact sizes required
STANDARD_SIZES: List[int] = [16, 24, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024]


def parse_bg_color(color_str: str) -> Tuple[int, int, int, int]:
    """Parses color string to RGBA tuple."""
    if not color_str:
        return (11, 14, 20, 255)  # UREfy dark theme #0B0E14 default

    color_str = color_str.strip().lower()
    if color_str == "transparent":
        return (0, 0, 0, 0)
    if color_str == "white":
        return (255, 255, 255, 255)
    if color_str == "black":
        return (0, 0, 0, 255)

    if color_str.startswith("#"):
        hex_val = color_str.lstrip("#")
        if len(hex_val) == 3:
            hex_val = "".join([c * 2 for c in hex_val])
        if len(hex_val) == 6:
            r = int(hex_val[0:2], 16)
            g = int(hex_val[2:4], 16)
            b = int(hex_val[4:6], 16)
            return (r, g, b, 255)
        if len(hex_val) == 8:
            r = int(hex_val[0:2], 16)
            g = int(hex_val[2:4], 16)
            b = int(hex_val[4:6], 16)
            a = int(hex_val[6:8], 16)
            return (r, g, b, a)

    if "," in color_str:
        parts = [int(p.strip()) for p in color_str.split(",") if p.strip()]
        if len(parts) == 3:
            return (parts[0], parts[1], parts[2], 255)
        if len(parts) >= 4:
            return (parts[0], parts[1], parts[2], parts[3])

    return (11, 14, 20, 255)


def render_svg_to_png(svg_path: str, output_png: str, size: int = 2048) -> bool:
    """Renders an SVG file to a high-resolution PNG using Node and Sharp."""
    render_script = os.path.join(current_dir, "render-svg.mjs")
    root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))

    cmd = ["node", render_script, svg_path, output_png, str(size), str(size)]
    res = subprocess.run(cmd, cwd=root_dir, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"SVG rendering failed: {res.stderr or res.stdout}")
    return True


def create_centered_square_image(img: Image.Image) -> Image.Image:
    """Ensures image is square by centering it on a transparent square canvas."""
    w, h = img.size
    if w == h:
        return img.convert("RGBA")

    max_dim = max(w, h)
    square_img = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    offset_x = (max_dim - w) // 2
    offset_y = (max_dim - h) // 2
    square_img.paste(img.convert("RGBA"), (offset_x, offset_y))
    return square_img


def generate_single_icon(master_img: Image.Image, size: int, output_path: str) -> None:
    """Resamples master image to target square size using Lanczos resampling."""
    resized = master_img.resize((size, size), resample=Image.Resampling.LANCZOS)
    resized.save(output_path, format="PNG", optimize=True)


def generate_maskable_icon(
    master_img: Image.Image,
    size: int,
    output_path: str,
    bg_color: Tuple[int, int, int, int] = (11, 14, 20, 255),
    safe_zone_ratio: float = 0.80
) -> None:
    """
    Generates a maskable icon variant.
    The graphic is scaled down to fit within the safe zone (safe_zone_ratio = 80%),
    providing 10% padding on each side to prevent OS cropping from cutting off the logo.
    """
    canvas = Image.new("RGBA", (size, size), bg_color)
    safe_size = int(round(size * safe_zone_ratio))
    safe_size = max(safe_size, 1)

    resized_graphic = master_img.resize((safe_size, safe_size), resample=Image.Resampling.LANCZOS)

    offset = (size - safe_size) // 2
    canvas.paste(resized_graphic, (offset, offset), mask=resized_graphic)
    canvas.save(output_path, format="PNG", optimize=True)


def generate_icon_set(
    master_input: str,
    output_dir: str,
    clean_transparency_first: bool = False,
    maskable_bg: str = "#0B0E14",
    generate_ico: bool = True,
    generate_aliases: bool = True,
    sizes: Optional[List[int]] = None,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    Main icon generation pipeline.
    """
    if sizes is None:
        sizes = STANDARD_SIZES

    os.makedirs(output_dir, exist_ok=True)
    temp_files: List[str] = []

    # Step 1: Ingest master (SVG or PNG)
    _, ext = os.path.splitext(master_input.lower())
    if ext == ".svg":
        # Render high-resolution master PNG via Sharp (librsvg)
        master_png = os.path.join(output_dir, "_master_temp_2048.png")
        temp_files.append(master_png)
        render_svg_to_png(master_input, master_png, size=2048)
        loaded_img = Image.open(master_png)
    else:
        loaded_img = Image.open(master_input)

    # Step 2: Clean transparency if requested
    if clean_transparency_first and process_transparency is not None:
        cleaned_master_path = os.path.join(output_dir, "_master_cleaned.png")
        temp_files.append(cleaned_master_path)
        loaded_img, _ = process_transparency.process_transparency(
            loaded_img,
            output_path=cleaned_master_path,
            crop=True,
            padding=0.08,
            square=True
        )

    # Ensure master is centered square RGBA
    master_square = create_centered_square_image(loaded_img)
    bg_rgba = parse_bg_color(maskable_bg)

    manifest_icons: List[Dict[str, Any]] = []
    generated_files: List[str] = []
    verification_results: Dict[str, Any] = {}

    if verbose:
        print(f"Generating icons from master ({master_square.width}x{master_square.height}) into: {output_dir}")

    # Step 3: Generate standard square icons & verify alpha
    for s in sizes:
        icon_name = f"icon-{s}x{s}.png"
        icon_path = os.path.join(output_dir, icon_name)
        generate_single_icon(master_square, s, icon_path)
        generated_files.append(icon_name)

        manifest_icons.append({
            "src": icon_name,
            "sizes": f"{s}x{s}",
            "type": "image/png",
            "purpose": "any"
        })

        # Programmatic alpha verification
        if verify_alpha is not None:
            v_report = verify_alpha.verify_alpha_image(icon_path)
            verification_results[icon_name] = {
                "size": f"{s}x{s}",
                "passed": v_report.passed,
                "transparent_pct": v_report.alpha_stats.get("transparent_pct", 0),
                "semi_pct": v_report.alpha_stats.get("semi_pct", 0),
                "checkerboard": v_report.checkerboard_detected,
                "halos": v_report.halo_detected,
                "errors": v_report.errors
            }

    # Step 4: Generate maskable icon variants (with 10% safe zone padding)
    for s in sizes:
        maskable_name = f"icon-maskable-{s}x{s}.png"
        maskable_path = os.path.join(output_dir, maskable_name)
        generate_maskable_icon(master_square, s, maskable_path, bg_color=bg_rgba, safe_zone_ratio=0.80)
        generated_files.append(maskable_name)

        manifest_icons.append({
            "src": maskable_name,
            "sizes": f"{s}x{s}",
            "type": "image/png",
            "purpose": "maskable"
        })

    # Step 5: Web convenience aliases
    if generate_aliases:
        alias_map = {
            "favicon-16x16.png": "icon-16x16.png",
            "favicon-32x32.png": "icon-32x32.png",
            "apple-touch-icon.png": "icon-180x180.png",
            "apple-touch-icon-152x152.png": "icon-152x152.png",
            "android-chrome-192x192.png": "icon-192x192.png",
            "android-chrome-512x512.png": "icon-512x512.png",
            "icon-192.png": "icon-192x192.png",
            "icon-512.png": "icon-512x512.png",
            "icon-maskable-192.png": "icon-maskable-192x192.png",
            "icon-maskable-512.png": "icon-maskable-512x512.png",
            "maskable-icon-192x192.png": "icon-maskable-192x192.png",
            "maskable-icon-512x512.png": "icon-maskable-512x512.png",
        }
        for alias, src_name in alias_map.items():
            src_path = os.path.join(output_dir, src_name)
            dst_path = os.path.join(output_dir, alias)
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)
                generated_files.append(alias)

    # Step 6: Generate favicon.ico (containing 16, 32, 48)
    if generate_ico:
        ico_path = os.path.join(output_dir, "favicon.ico")
        ico_base = master_square.resize((48, 48), resample=Image.Resampling.LANCZOS)
        ico_base.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        generated_files.append("favicon.ico")

    # Step 7: Output icons-manifest.json
    manifest_path = os.path.join(output_dir, "icons-manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"icons": manifest_icons}, f, indent=2)
    generated_files.append("icons-manifest.json")

    # Clean up temporary master files
    for tmp in temp_files:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass

    total_verified = len(verification_results)
    passed_verified = sum(1 for v in verification_results.values() if v.get("passed", False))

    summary = {
        "master_input": master_input,
        "output_directory": output_dir,
        "sizes_generated": sizes,
        "total_files_created": len(generated_files),
        "standard_icons_count": len(sizes),
        "maskable_icons_count": len(sizes),
        "verification_summary": {
            "total_tested": total_verified,
            "passed": passed_verified,
            "failed": total_verified - passed_verified
        },
        "verification_details": verification_results
    }

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="generate-icon-set.py - Complete high-precision PWA and web icon set generator"
    )
    parser.add_argument("master", help="Path to high-resolution master SVG or clean transparent PNG")
    parser.add_argument("-o", "--output-dir", default="icons", help="Output directory (default: ./icons)")
    parser.add_argument("--clean-first", action="store_true", help="Run transparency cleaning pipeline on master first")
    parser.add_argument("--maskable-bg", default="#0B0E14", help="Background color for maskable icons (default: '#0B0E14')")
    parser.add_argument("--no-ico", action="store_true", help="Skip favicon.ico generation")
    parser.add_argument("--no-aliases", action="store_true", help="Skip standard web alias generation")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON summary")

    args = parser.parse_args()

    try:
        summary = generate_icon_set(
            master_input=args.master,
            output_dir=args.output_dir,
            clean_transparency_first=args.clean_first,
            maskable_bg=args.maskable_bg,
            generate_ico=not args.no_ico,
            generate_aliases=not args.no_aliases,
            verbose=not args.json
        )
    except Exception as e:
        if args.json:
            print(json.dumps({"success": False, "error": str(e)}))
        else:
            print(f"[ERROR] Icon generation failed: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        summary["success"] = True
        print(json.dumps(summary, indent=2))
    else:
        print("============================================================")
        print(f"Icon Set Generation Complete!")
        print(f"Output Directory:    {summary['output_directory']}")
        print(f"Total Files Created: {summary['total_files_created']}")
        print(f"Standard Icon Sizes: {summary['sizes_generated']}")
        print(f"Maskable Icons:      {summary['maskable_icons_count']} variants (safe-zone 80%)")
        v_sum = summary["verification_summary"]
        v_status = "[PASS]" if v_sum["failed"] == 0 else "[FAIL]"
        print(f"Alpha Verification:  {v_status} ({v_sum['passed']}/{v_sum['total_tested']} icons verified genuine alpha)")
        print("============================================================")

    v_sum = summary.get("verification_summary", {})
    if v_sum.get("failed", 0) > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
