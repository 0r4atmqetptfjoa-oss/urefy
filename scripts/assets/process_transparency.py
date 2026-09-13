"""
process_transparency.py - Python module alias for process-transparency.py
"""

import sys
import os
import importlib.util

current_dir = os.path.dirname(os.path.abspath(__file__))
hyphen_script = os.path.join(current_dir, "process-transparency.py")

spec = importlib.util.spec_from_file_location("process_transparency_module", hyphen_script)
mod = importlib.util.module_from_spec(spec)
sys.modules["process_transparency_module"] = mod
spec.loader.exec_module(mod)

process_transparency = mod.process_transparency
remove_background = mod.remove_background
crop_to_alpha_bounding_box = mod.crop_to_alpha_bounding_box
add_optical_padding = mod.add_optical_padding
detect_background_color = mod.detect_background_color
parse_color = mod.parse_color

__all__ = [
    "process_transparency",
    "remove_background",
    "crop_to_alpha_bounding_box",
    "add_optical_padding",
    "detect_background_color",
    "parse_color",
]
