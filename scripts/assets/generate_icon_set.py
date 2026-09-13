"""
generate_icon_set.py - Python module alias for generate-icon-set.py
"""

import sys
import os
import importlib.util

current_dir = os.path.dirname(os.path.abspath(__file__))
hyphen_script = os.path.join(current_dir, "generate-icon-set.py")

spec = importlib.util.spec_from_file_location("generate_icon_set_module", hyphen_script)
mod = importlib.util.module_from_spec(spec)
sys.modules["generate_icon_set_module"] = mod
spec.loader.exec_module(mod)

generate_icon_set = mod.generate_icon_set
generate_single_icon = mod.generate_single_icon
generate_maskable_icon = mod.generate_maskable_icon
render_svg_to_png = mod.render_svg_to_png
STANDARD_SIZES = mod.STANDARD_SIZES

__all__ = [
    "generate_icon_set",
    "generate_single_icon",
    "generate_maskable_icon",
    "render_svg_to_png",
    "STANDARD_SIZES",
]
