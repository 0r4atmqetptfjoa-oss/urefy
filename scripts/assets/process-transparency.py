#!/usr/bin/env python3
"""
process-transparency.py - Professional Asset Transparency & De-fringing Pipeline

Features:
1. Removes uniform or edge-connected background colors (auto-detected or specified).
2. Flood-fills from image perimeters to protect enclosed internal shapes/text.
3. Applies sub-pixel smooth edge feathering via signed distance transform and smoothstep.
4. Performs color de-fringing / de-contamination by propagating pure interior colors
   into semi-transparent edge pixels, completely eliminating white/dark halos.
5. Crops to true non-zero alpha bounding box.
6. Adds controlled percentage optical padding (with optional square canvas centering).
7. Saves clean PNG with 100% genuine alpha and runs automated verification.
"""

import sys
import os
import argparse
import json
from typing import Tuple, Optional, Dict, Any, Union

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, label

# Import verify-alpha module for self-testing
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
try:
    import verify_alpha
except ImportError:
    verify_alpha = None


def parse_color(color_str: str) -> Optional[np.ndarray]:
    """Parses a color string (hex '#FFFFFF', RGB '255,255,255', or name 'white')."""
    if not color_str or color_str.lower() == "auto":
        return None

    color_str = color_str.strip().lower()
    named_colors = {
        "white": np.array([255, 255, 255], dtype=np.float32),
        "black": np.array([0, 0, 0], dtype=np.float32),
        "gray": np.array([128, 128, 128], dtype=np.float32),
        "lightgray": np.array([211, 211, 211], dtype=np.float32),
        "transparent": None,
    }
    if color_str in named_colors:
        return named_colors[color_str]

    if color_str.startswith("#"):
        hex_val = color_str.lstrip("#")
        if len(hex_val) == 3:
            hex_val = "".join([c * 2 for c in hex_val])
        if len(hex_val) == 6:
            r = int(hex_val[0:2], 16)
            g = int(hex_val[2:4], 16)
            b = int(hex_val[4:6], 16)
            return np.array([r, g, b], dtype=np.float32)

    if "," in color_str:
        parts = [int(p.strip()) for p in color_str.split(",") if p.strip()]
        if len(parts) >= 3:
            return np.array(parts[:3], dtype=np.float32)

    raise ValueError(f"Unrecognized color specification: '{color_str}'")


def detect_background_color(
    img_rgb: np.ndarray,
    border_width: int = 2
) -> Tuple[np.ndarray, float]:
    """
    Auto-detects the background color by inspecting image borders and corners.
    Returns (bg_rgb, confidence_std).
    """
    h, w, _ = img_rgb.shape
    bw = min(border_width, h // 4, w // 4, 3)

    # Collect border pixels
    top = img_rgb[:bw, :].reshape(-1, 3)
    bottom = img_rgb[-bw:, :].reshape(-1, 3)
    left = img_rgb[:, :bw].reshape(-1, 3)
    right = img_rgb[:, -bw:].reshape(-1, 3)

    border_pixels = np.vstack([top, bottom, left, right]).astype(np.float32)
    median_color = np.median(border_pixels, axis=0)

    # Standard deviation across border
    diffs = np.linalg.norm(border_pixels - median_color, axis=1)
    std_diff = float(np.std(diffs))

    return median_color, std_diff


def remove_background(
    img_rgba: np.ndarray,
    target_bg: Optional[np.ndarray] = None,
    tolerance: float = 25.0,
    edge_connected: bool = True,
    feather_radius: float = 1.0,
    defringe: bool = True,
    defringe_blend: float = 1.0
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Core pipeline to remove background, apply edge feathering, and defringe colors.
    """
    h, w, c = img_rgba.shape
    rgb = img_rgba[:, :, :3].astype(np.float32)
    orig_alpha = img_rgba[:, :, 3].astype(np.float32) if c == 4 else np.full((h, w), 255.0, dtype=np.float32)

    stats: Dict[str, Any] = {}

    if target_bg is None:
        target_bg, bg_std = detect_background_color(rgb)
        stats["auto_bg_color"] = [int(round(x)) for x in target_bg]
        stats["auto_bg_std"] = round(bg_std, 2)
    else:
        stats["target_bg_color"] = [int(round(x)) for x in target_bg]

    # Calculate Euclidean color distance to background color
    color_dist = np.linalg.norm(rgb - target_bg, axis=-1)

    # Pixels matching candidate background
    is_candidate_bg = color_dist <= tolerance

    if edge_connected:
        # Only remove background connected to image borders
        lbl, num_features = label(is_candidate_bg)
        border_mask = np.zeros((h, w), dtype=bool)
        border_mask[0, :] = True
        border_mask[-1, :] = True
        border_mask[:, 0] = True
        border_mask[:, -1] = True

        border_labels = set(np.unique(lbl[border_mask & is_candidate_bg]))
        # Remove label 0 (which represents non-background pixels)
        border_labels.discard(0)

        bg_mask = np.isin(lbl, list(border_labels))
    else:
        bg_mask = is_candidate_bg

    fg_mask = ~bg_mask

    # If original image already had transparency, intersect foreground
    if np.any(orig_alpha < 250):
        fg_mask = fg_mask & (orig_alpha > 10)
        bg_mask = ~fg_mask

    # Compute signed distance for sub-pixel edge feathering
    if feather_radius > 0:
        d_fg = distance_transform_edt(fg_mask)
        d_bg = distance_transform_edt(bg_mask)
        signed_dist = d_fg - d_bg  # Positive inside foreground, negative in background

        r = max(feather_radius, 0.5)
        # Normalized distance in [0, 1] across transition zone [-r, +r]
        norm_dist = np.clip((signed_dist + r) / (2.0 * r), 0.0, 1.0)
        # Smoothstep S-curve
        feathered_alpha = 255.0 * (3.0 * norm_dist**2 - 2.0 * norm_dist**3)

        # Incorporate color distance ramp for anti-aliasing preservation
        t_low = max(0.0, tolerance - 10.0)
        t_high = tolerance + 10.0
        color_ramp = np.clip((color_dist - t_low) / (t_high - t_low), 0.0, 1.0)
        color_alpha = 255.0 * (3.0 * color_ramp**2 - 2.0 * color_ramp**3)

        # Combine transition smoothly
        edge_zone = (feathered_alpha > 0) & (feathered_alpha < 255)
        new_alpha = feathered_alpha.copy()
        new_alpha[edge_zone] = np.minimum(feathered_alpha[edge_zone], color_alpha[edge_zone])

        # If original had alpha, preserve minimum
        if np.any(orig_alpha < 250):
            new_alpha = np.minimum(new_alpha, orig_alpha)
    else:
        new_alpha = np.where(fg_mask, 255.0, 0.0)

    # De-fringing / De-contamination
    # Eliminates halos by propagating pure interior colors into semi-transparent edge pixels
    clean_rgb = rgb.copy()
    if defringe:
        core_opaque = (new_alpha >= 240.0)
        semi_edge = (new_alpha > 0.0) & (new_alpha < 240.0)

        if np.any(core_opaque) and np.any(semi_edge):
            _, indices = distance_transform_edt(~core_opaque, return_indices=True)
            nr = indices[0][semi_edge]
            nc = indices[1][semi_edge]

            interior_colors = rgb[nr, nc]

            # Inpaint pure interior color into semi-transparent edges
            if defringe_blend >= 1.0:
                clean_rgb[semi_edge] = interior_colors
            else:
                clean_rgb[semi_edge] = (
                    interior_colors * defringe_blend + clean_rgb[semi_edge] * (1.0 - defringe_blend)
                )

            stats["defringed_pixels"] = int(np.sum(semi_edge))
        else:
            stats["defringed_pixels"] = 0
    else:
        stats["defringed_pixels"] = 0

    clean_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    clean_rgba[:, :, :3] = np.clip(np.round(clean_rgb), 0, 255).astype(np.uint8)
    clean_rgba[:, :, 3] = np.clip(np.round(new_alpha), 0, 255).astype(np.uint8)

    stats["background_removed_pct"] = float(np.mean(clean_rgba[:, :, 3] == 0) * 100.0)
    stats["opaque_pct"] = float(np.mean(clean_rgba[:, :, 3] == 255) * 100.0)
    stats["semi_pct"] = float(np.mean((clean_rgba[:, :, 3] > 0) & (clean_rgba[:, :, 3] < 255)) * 100.0)

    return clean_rgba, stats


def crop_to_alpha_bounding_box(
    img_rgba: np.ndarray,
    alpha_threshold: int = 2
) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
    """
    Crops image to the tightest bounding box of non-zero alpha pixels.
    Returns (cropped_rgba, (min_x, min_y, max_x, max_y)).
    """
    alpha = img_rgba[:, :, 3]
    active_mask = alpha >= alpha_threshold

    if not np.any(active_mask):
        h, w = alpha.shape
        return img_rgba, (0, 0, w, h)

    rows = np.any(active_mask, axis=1)
    cols = np.any(active_mask, axis=0)

    min_y, max_y = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    min_x, max_x = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])

    cropped = img_rgba[min_y : max_y + 1, min_x : max_x + 1]
    bbox = (min_x, min_y, max_x + 1, max_y + 1)
    return cropped, bbox


def add_optical_padding(
    img_rgba: np.ndarray,
    padding_pct: float = 0.08,
    make_square: bool = True
) -> np.ndarray:
    """
    Adds controlled percentage optical padding around the cropped graphic.
    If make_square is True, centers the graphic within an exact square canvas.
    """
    h, w, c = img_rgba.shape

    if make_square:
        max_dim = max(w, h)
        pad_px = int(round(max_dim * padding_pct))
        target_size = max_dim + 2 * pad_px

        target_w = target_size
        target_h = target_size
    else:
        pad_x = int(round(w * padding_pct))
        pad_y = int(round(h * padding_pct))
        target_w = w + 2 * pad_x
        target_h = h + 2 * pad_y

    canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)

    offset_x = (target_w - w) // 2
    offset_y = (target_h - h) // 2

    canvas[offset_y : offset_y + h, offset_x : offset_x + w] = img_rgba
    return canvas


def process_transparency(
    image_input: Any,
    output_path: Optional[str] = None,
    bg_color: Optional[str] = "auto",
    tolerance: float = 25.0,
    edge_connected: bool = True,
    feather_radius: float = 1.0,
    defringe: bool = True,
    crop: bool = True,
    padding: float = 0.08,
    square: bool = True
) -> Tuple[Image.Image, Dict[str, Any]]:
    """
    High-level function to process transparency on an image and return (PIL.Image, report).
    """
    if isinstance(image_input, (str, bytes, os.PathLike)):
        input_path = str(image_input)
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        pil_img = Image.open(input_path)
    elif isinstance(image_input, Image.Image):
        input_path = getattr(image_input, "filename", "<PIL.Image>")
        pil_img = image_input
    else:
        raise TypeError(f"Unsupported input type: {type(image_input)}")

    orig_w, orig_h = pil_img.size
    img_rgba = np.array(pil_img.convert("RGBA"))

    target_bg = parse_color(bg_color)

    # 1. Background removal + feathering + defringing
    processed_rgba, stats = remove_background(
        img_rgba,
        target_bg=target_bg,
        tolerance=tolerance,
        edge_connected=edge_connected,
        feather_radius=feather_radius,
        defringe=defringe
    )

    # 2. Crop to true non-zero alpha bounding box
    if crop:
        cropped_rgba, bbox = crop_to_alpha_bounding_box(processed_rgba)
        stats["bbox"] = bbox
        stats["cropped_dimensions"] = [cropped_rgba.shape[1], cropped_rgba.shape[0]]
    else:
        cropped_rgba = processed_rgba
        stats["bbox"] = (0, 0, orig_w, orig_h)
        stats["cropped_dimensions"] = [orig_w, orig_h]

    # 3. Controlled optical padding
    if padding > 0 or square:
        final_rgba = add_optical_padding(cropped_rgba, padding_pct=padding, make_square=square)
    else:
        final_rgba = cropped_rgba

    stats["final_dimensions"] = [final_rgba.shape[1], final_rgba.shape[0]]
    out_pil = Image.fromarray(final_rgba, mode="RGBA")

    # Save to disk if requested
    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        out_pil.save(output_path, format="PNG", optimize=True)
        stats["output_file"] = output_path

        # Verify output with verify-alpha
        if verify_alpha is not None:
            report = verify_alpha.verify_alpha_image(out_pil)
            stats["verification"] = {
                "passed": report.passed,
                "checkerboard": report.checkerboard_detected,
                "halos": report.halo_detected,
                "errors": report.errors,
                "warnings": report.warnings
            }

    return out_pil, stats


def main():
    parser = argparse.ArgumentParser(
        description="process-transparency.py - Professional background removal, defringing, and padding"
    )
    parser.add_argument("input", help="Path to input image (PNG, JPG, WebP, etc.)")
    parser.add_argument("-o", "--output", help="Path to save clean output PNG")
    parser.add_argument("--bg-color", default="auto", help="Background color to remove ('auto', hex '#ffffff', '255,255,255', 'white')")
    parser.add_argument("--tolerance", type=float, default=25.0, help="Color distance tolerance (default: 25.0)")
    parser.add_argument("--global-removal", action="store_true", help="Remove color globally everywhere, not just edge-connected")
    parser.add_argument("--feather", type=float, default=1.0, help="Edge feather radius in pixels (default: 1.0)")
    parser.add_argument("--no-defringe", action="store_true", help="Disable color defringing / de-contamination")
    parser.add_argument("--no-crop", action="store_true", help="Disable cropping to non-zero alpha bounding box")
    parser.add_argument("--padding", type=float, default=0.08, help="Optical padding fraction (default: 0.08 = 8%%)")
    parser.add_argument("--no-square", action="store_true", help="Do not force square canvas aspect ratio")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON result")

    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    if not output_path:
        base, _ = os.path.splitext(input_path)
        output_path = f"{base}-clean.png"

    try:
        _, stats = process_transparency(
            image_input=input_path,
            output_path=output_path,
            bg_color=args.bg_color,
            tolerance=args.tolerance,
            edge_connected=not args.global_removal,
            feather_radius=args.feather,
            defringe=not args.no_defringe,
            crop=not args.no_crop,
            padding=args.padding,
            square=not args.no_square
        )
    except Exception as e:
        if args.json:
            print(json.dumps({"success": False, "error": str(e)}))
        else:
            print(f"[ERROR] Failed to process transparency: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        stats["success"] = True
        print(json.dumps(stats, indent=2))
    else:
        print("============================================================")
        print(f"Transparency Processing Complete: {output_path}")
        print(f"------------------------------------------------------------")
        print(f"Final Dimensions: {stats['final_dimensions'][0]}x{stats['final_dimensions'][1]} px (Square: {not args.no_square})")
        print(f"Bounding Box:     {stats['bbox']}")
        print(f"Defringed Pixels: {stats['defringed_pixels']}")
        print(f"Background Removed: {stats['background_removed_pct']:.1f}%")
        print(f"Opaque Pixels:      {stats['opaque_pct']:.1f}%")
        print(f"Semi-trans Edges:   {stats['semi_pct']:.1f}%")
        if "verification" in stats:
            v = stats["verification"]
            v_status = "[PASS]" if v["passed"] else "[FAIL]"
            print(f"Verification Check: {v_status} (Checkerboard: {v['checkerboard']}, Halos: {v['halos']})")
        print("============================================================")

    sys.exit(0)


if __name__ == "__main__":
    main()
