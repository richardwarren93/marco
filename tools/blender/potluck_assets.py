"""Render the Potluck sprite set from one miniature room.

Run inside Blender (via the MCP bridge, or `blender -b -P tools/blender/potluck_assets.py`).

WHY THIS EXISTS
---------------
The scene's artwork was drawn with Pixi's Graphics API: ellipses and rounded
rectangles standing in for a dining room. That reads as a greybox, and no
amount of better circles fixes it, because the problem is not the shapes — it
is that a flat ellipse is not a table seen from anywhere.

Modelling the room once and rendering it through a fixed ORTHOGRAPHIC camera
solves the thing the spec actually asks for: every asset is authored for the
same camera angle, by construction, rather than by squashing each sprite by
eye and hoping they agree. Shadows are cast by real geometry. Scale is shared
because everything is measured in the same room.

Each piece is rendered alone, on transparent film, into public/potluck/.

ORIENTATION
-----------
Blender Z is up. The camera sits at a three-quarter angle and never moves, so
a chair rendered now and a chair rendered next month line up.
"""

import json
import math
import os

import bpy  # type: ignore
from mathutils import Vector  # type: ignore

# ── where the sprites land ──────────────────────────────────────────────────
# Relative to the repo root; Next serves public/ at /.
OUT = os.path.join(os.getcwd(), "public", "potluck")

# ── the one camera ──────────────────────────────────────────────────────────
# 55° off vertical rather than the 54.736° of true isometric: a touch more
# top-down, which is what reads as "looking into a dollhouse" rather than
# "looking at a chart". 45° around Z puts two faces of everything in view.
CAM_PITCH = math.radians(55.0)
CAM_YAW = math.radians(45.0)
CAM_DISTANCE = 12.0
RES = 512

# ── palette, matched to the app's own ───────────────────────────────────────
def srgb(hex_str, alpha=1.0):
    """#RRGGBB → linear RGBA, because Blender works in linear light."""
    h = hex_str.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, alpha)

INK = srgb("#171410")
PAPER = srgb("#FBF7EE")
CREAM = srgb("#EFE5D2")
WOOD = srgb("#B5793A")
WOOD_DARK = srgb("#8A5726")
LIME = srgb("#C4EE45")
BUTTER = srgb("#FFD84D")
TOMATO = srgb("#E5462E")
LAV = srgb("#C9B8FF")
PINK = srgb("#FF4D9D")
LEAF = srgb("#4E7A3A")
TERRACOTTA = srgb("#C2673F")


# ── scene plumbing ──────────────────────────────────────────────────────────

def pick_engine():
    """EEVEE under whichever name this Blender calls it; Cycles if neither."""
    available = {item.identifier for item in
                 bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        if name in available:
            return name
    return "CYCLES"


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = pick_engine()
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True          # the sprites need alpha
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"  # keep the palette honest

    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 64

    cam_data = bpy.data.cameras.new("PotluckCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 4.0
    cam = bpy.data.objects.new("PotluckCam", cam_data)
    scene.collection.objects.link(cam)

    # Spherical placement, then aim at the origin.
    #
    # The sign on y matters and is easy to get wrong: the first version put the
    # camera at azimuth -45 degrees and rotated it for +45, so it pointed into
    # empty space and every one of the twelve renders came out fully
    # transparent. They were all exactly 56717 bytes, which is the only reason
    # it was caught — twelve different scenes cannot produce identical files.
    #
    # A camera at rotation (0,0,0) looks down -Z. Rotating X by the polar angle
    # tilts it up toward the horizon, and rotating Z by (azimuth + 90) swings
    # it round. The position has to use the SAME azimuth.
    cam.location = Vector((
        CAM_DISTANCE * math.sin(CAM_PITCH) * math.cos(CAM_YAW),
        CAM_DISTANCE * math.sin(CAM_PITCH) * math.sin(CAM_YAW),
        CAM_DISTANCE * math.cos(CAM_PITCH),
    ))
    cam.rotation_euler = (CAM_PITCH, 0.0, CAM_YAW + math.radians(90))
    scene.camera = cam

    # Warm key, cool fill, and a soft top light so nothing goes black.
    key = bpy.data.lights.new("Key", type="AREA")
    key.energy = 900
    key.size = 6
    key.color = (1.0, 0.92, 0.80)
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (4.5, -4.5, 7.0)
    key_obj.rotation_euler = (math.radians(42), 0, math.radians(45))
    scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 260
    fill.size = 8
    fill.color = (0.82, 0.88, 1.0)
    fill_obj = bpy.data.objects.new("Fill", fill)
    fill_obj.location = (-5.0, 3.0, 4.0)
    fill_obj.rotation_euler = (math.radians(60), 0, math.radians(-120))
    scene.collection.objects.link(fill_obj)

    world = bpy.data.worlds.new("PotluckWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.95, 0.93, 0.88, 1.0)
    bg.inputs[1].default_value = 0.55
    scene.world = world

    return cam


def mat(name, colour, roughness=0.75):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = roughness
    return m


def gingham(name):
    """A checked cloth, procedurally — no texture file to ship or lose."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    checker = nt.nodes.new("ShaderNodeTexChecker")
    checker.inputs["Color1"].default_value = PAPER
    checker.inputs["Color2"].default_value = TOMATO
    checker.inputs["Scale"].default_value = 28.0
    nt.links.new(checker.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.9
    return m


def shade(obj, material, smooth=True, bevel=0.012):
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


# ── the pieces ──────────────────────────────────────────────────────────────
# Each returns a list of objects. Measured in metres so the room is coherent:
# the table is 1.1m across, a chair seat is 0.45m up, a plate is 0.22m.

def build_floor():
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.4, depth=0.12, location=(0, 0, -0.06))
    disc = bpy.context.active_object
    disc.name = "Floor"
    shade(disc, mat("FloorWood", WOOD_DARK, 0.8), bevel=0.02)
    return [disc]


def build_rug():
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.55, depth=0.02, location=(0, 0, 0.012))
    rug = bpy.context.active_object
    rug.name = "Rug"
    shade(rug, mat("RugWool", LAV, 0.95), bevel=0.006)
    return [rug]


def build_table():
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.55, depth=0.06, location=(0, 0, 0.72))
    top = bpy.context.active_object
    top.name = "TableTop"
    shade(top, mat("TableWood", WOOD, 0.6), bevel=0.016)

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.09, depth=0.70, location=(0, 0, 0.35))
    stem = bpy.context.active_object
    stem.name = "TableStem"
    shade(stem, mat("TableStem", WOOD_DARK, 0.7), bevel=0.01)

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.32, depth=0.05, location=(0, 0, 0.025))
    foot = bpy.context.active_object
    foot.name = "TableFoot"
    shade(foot, mat("TableFoot", WOOD_DARK, 0.7), bevel=0.012)
    return [top, stem, foot]


def build_cloth():
    """A cloth over the table: a cone frustum, so it drapes rather than floats."""
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=0.62, radius2=0.58,
                                    depth=0.26, location=(0, 0, 0.63))
    cloth = bpy.context.active_object
    cloth.name = "Tablecloth"
    shade(cloth, gingham("Gingham"), bevel=0.0)
    return [cloth]


def build_chair():
    """Dimensions that agree with each other.

    The first version had a seat 0.21m across with legs at plus/minus 0.16m,
    so the legs stood OUTSIDE the seat they were meant to hold up, at 0.022m
    radius over a 0.44m drop. It rendered as four spindles with a plank
    hovering between them. Seat half-width, leg inset and backrest offset now
    all come from one number.
    """
    HALF = 0.21
    SEAT_Z = 0.45
    LEG_INSET = HALF - 0.04

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, SEAT_Z))
    seat = bpy.context.active_object
    seat.name = "ChairSeat"
    seat.scale = (HALF * 2, HALF * 2, 0.05)
    shade(seat, mat("ChairWood", WOOD, 0.65), bevel=0.014)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, HALF - 0.02, SEAT_Z + 0.24))
    back = bpy.context.active_object
    back.name = "ChairBack"
    back.scale = (HALF * 2, 0.04, 0.46)
    shade(back, mat("ChairBackWood", WOOD, 0.65), bevel=0.014)

    legs = []
    for i, (x, y) in enumerate([(-LEG_INSET, -LEG_INSET), (LEG_INSET, -LEG_INSET),
                                (-LEG_INSET, LEG_INSET), (LEG_INSET, LEG_INSET)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.028, depth=SEAT_Z, location=(x, y, SEAT_Z / 2))
        leg = bpy.context.active_object
        leg.name = f"ChairLeg{i}"
        shade(leg, mat(f"ChairLeg{i}Wood", WOOD_DARK, 0.7), bevel=0.006)
        legs.append(leg)
    return [seat, back, *legs]


def build_plate():
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.11, depth=0.012, location=(0, 0, 0.006))
    plate = bpy.context.active_object
    plate.name = "Plate"
    shade(plate, mat("Porcelain", PAPER, 0.35), bevel=0.004)
    return [plate]


def build_cloche():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.11, location=(0, 0, 0.012))
    dome = bpy.context.active_object
    dome.name = "Cloche"
    # Flatten and keep only the upper half, so it sits ON the plate.
    dome.scale = (1.0, 1.0, 0.72)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(plane_co=(0, 0, 0.012), plane_no=(0, 0, 1), clear_inner=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    shade(dome, mat("ClocheMetal", CREAM, 0.3), bevel=0.0)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.018, location=(0, 0, 0.095))
    knob = bpy.context.active_object
    knob.name = "ClocheKnob"
    shade(knob, mat("ClocheKnob", CREAM, 0.3), bevel=0.0)
    return [dome, knob]


def build_food():
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.11, depth=0.012, location=(0, 0, 0.006))
    plate = bpy.context.active_object
    plate.name = "FoodPlate"
    shade(plate, mat("FoodPorcelain", PAPER, 0.35), bevel=0.004)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.072, location=(0, 0, 0.03))
    heap = bpy.context.active_object
    heap.name = "FoodHeap"
    heap.scale = (1.0, 1.0, 0.52)
    shade(heap, mat("FoodBody", BUTTER, 0.8), bevel=0.0)
    return [plate, heap]


def build_candle():
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.03, depth=0.22, location=(0, 0, 0.11))
    stick = bpy.context.active_object
    stick.name = "Candle"
    shade(stick, mat("Wax", PAPER, 0.5), bevel=0.006)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.022, location=(0, 0, 0.245))
    flame = bpy.context.active_object
    flame.name = "Flame"
    flame.scale = (1.0, 1.0, 1.9)
    flame_mat = mat("Flame", BUTTER, 0.4)
    bsdf = flame_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Emission Color"].default_value = BUTTER
    bsdf.inputs["Emission Strength"].default_value = 4.0
    shade(flame, flame_mat, bevel=0.0)
    return [stick, flame]


def build_plant():
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.10, radius2=0.13, depth=0.16, location=(0, 0, 0.08))
    pot = bpy.context.active_object
    pot.name = "Pot"
    shade(pot, mat("Terracotta", TERRACOTTA, 0.85), bevel=0.008)

    leaves = []
    for i in range(7):
        angle = (math.pi * 2 * i) / 7
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.06,
                                             location=(math.cos(angle) * 0.06, math.sin(angle) * 0.06, 0.22 + (i % 3) * 0.03))
        leaf = bpy.context.active_object
        leaf.name = f"Leaf{i}"
        leaf.scale = (0.5, 0.5, 1.5)
        leaf.rotation_euler = (math.radians(18) * math.cos(angle), math.radians(18) * math.sin(angle), 0)
        shade(leaf, mat(f"Leaf{i}Mat", LEAF, 0.85), bevel=0.0)
        leaves.append(leaf)
    return [pot, *leaves]


def build_flowers():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.045, depth=0.13, location=(0, 0, 0.065))
    vase = bpy.context.active_object
    vase.name = "Vase"
    shade(vase, mat("Glass", CREAM, 0.25), bevel=0.006)

    blooms = []
    for i, colour in enumerate([PINK, BUTTER, LAV, TOMATO]):
        angle = (math.pi * 2 * i) / 4
        x, y = math.cos(angle) * 0.045, math.sin(angle) * 0.045
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=0.14, location=(x * 0.5, y * 0.5, 0.19))
        stem = bpy.context.active_object
        stem.name = f"Stem{i}"
        shade(stem, mat(f"Stem{i}Mat", LEAF, 0.9), bevel=0.0)

        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.032, location=(x, y, 0.27))
        bloom = bpy.context.active_object
        bloom.name = f"Bloom{i}"
        bloom.scale = (1.0, 1.0, 0.62)
        shade(bloom, mat(f"Bloom{i}Mat", colour, 0.8), bevel=0.0)
        blooms += [stem, bloom]
    return [vase, *blooms]


# The horizontal direction the camera looks FROM. A face has to point along
# this, or it is turned away from the only camera that will ever see it.
FACE_X = math.cos(CAM_YAW)
FACE_Y = math.sin(CAM_YAW)


def facing(offset_out, offset_side, z):
    """A point on the camera-facing side of the head.

    The first guest had its eyes at a fixed -Y, which faces due south while
    the camera stands at 45 degrees — so it rendered the back of a head with
    one eye creeping round the edge. Everything on a face is now placed
    relative to the camera direction instead of a world axis.
    """
    side_x, side_y = -FACE_Y, FACE_X
    return (FACE_X * offset_out + side_x * offset_side,
            FACE_Y * offset_out + side_y * offset_side,
            z)


def build_guest():
    """Big head, small body, facing the camera.

    Still the weakest piece in the set, and the file should say so rather than
    only a chat message: geometry under a real camera flatters furniture and
    does nothing for a face. This has arms, hair, shoes and an expression now,
    which lifts it from a chess pawn to a toy — but an illustrator would still
    beat it, and that gap is the honest limit of this pipeline.
    """
    HEAD_Z = 0.60
    HEAD_R = 0.185

    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=18, radius=HEAD_R, location=(0, 0, HEAD_Z))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (1.0, 1.0, 0.92)          # a touch wider than tall
    shade(head, mat("Skin", srgb("#F6D9BD"), 0.6), bevel=0.0)

    # Hair as a cap over the top half, pushed back off the face.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=18, radius=HEAD_R * 1.04,
                                         location=facing(-0.012, 0, HEAD_Z + 0.028))
    hair = bpy.context.active_object
    hair.name = "Hair"
    hair.scale = (1.0, 1.0, 0.78)
    shade(hair, mat("Hair", srgb("#5A3A24"), 0.85), bevel=0.0)

    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.175, radius2=0.115, depth=0.36,
                                    location=(0, 0, 0.235))
    body = bpy.context.active_object
    body.name = "Body"
    shade(body, mat("Jumper", LIME, 0.85), bevel=0.012)

    parts = [head, hair, body]

    # Arms, angled slightly out so the silhouette is not a cone.
    for i, side in enumerate((-1, 1)):
        side_x, side_y = -FACE_Y * side, FACE_X * side
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.038, depth=0.24,
                                            location=(side_x * 0.165, side_y * 0.165, 0.30))
        arm = bpy.context.active_object
        arm.name = f"Arm{i}"
        arm.rotation_euler = (math.radians(14) * FACE_Y * side, math.radians(-14) * FACE_X * side, 0)
        shade(arm, mat(f"Arm{i}Mat", LIME, 0.85), bevel=0.01)
        parts.append(arm)

    # Shoes.
    for i, side in enumerate((-1, 1)):
        side_x, side_y = -FACE_Y * side, FACE_X * side
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.055,
                                            location=(side_x * 0.062 + FACE_X * 0.03,
                                                      side_y * 0.062 + FACE_Y * 0.03, 0.045))
        shoe = bpy.context.active_object
        shoe.name = f"Shoe{i}"
        shoe.scale = (1.0, 1.0, 0.55)
        shade(shoe, mat(f"Shoe{i}Mat", srgb("#3A332B"), 0.7), bevel=0.0)
        parts.append(shoe)

    # Eyes, on the side of the head the camera can actually see.
    for i, side in enumerate((-1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, radius=0.026,
                                             location=facing(HEAD_R * 0.86, side * 0.068, HEAD_Z + 0.012))
        eye = bpy.context.active_object
        eye.name = f"Eye{i}"
        eye.scale = (0.72, 0.72, 1.0)
        shade(eye, mat(f"Eye{i}Mat", INK, 0.35), bevel=0.0)
        parts.append(eye)

    # A mouth: a small flattened sphere sunk into the face.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.042,
                                         location=facing(HEAD_R * 0.84, 0, HEAD_Z - 0.072))
    mouth = bpy.context.active_object
    mouth.name = "Mouth"
    mouth.scale = (0.9, 0.9, 0.34)
    shade(mouth, mat("Mouth", srgb("#B4524A"), 0.5), bevel=0.0)
    parts.append(mouth)

    # Cheeks, which is most of what makes a round face read as friendly.
    for i, side in enumerate((-1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.034,
                                             location=facing(HEAD_R * 0.82, side * 0.105, HEAD_Z - 0.03))
        cheek = bpy.context.active_object
        cheek.name = f"Cheek{i}"
        cheek.scale = (0.8, 0.8, 0.5)
        shade(cheek, mat(f"Cheek{i}Mat", srgb("#F2A8A0"), 0.9), bevel=0.0)
        parts.append(cheek)

    return parts


PIECES = {
    "floor": build_floor,
    "rug": build_rug,
    "table": build_table,
    "cloth": build_cloth,
    "chair": build_chair,
    "plate": build_plate,
    "cloche": build_cloche,
    "food": build_food,
    "candle": build_candle,
    "plant": build_plant,
    "flowers": build_flowers,
    "guest": build_guest,
}


def clear_startup_scene():
    """Only in background mode, and only then.

    `blender -b -P` opens the DEFAULT startup file — a cube, a camera and a
    light — and that cube would render into every single sprite. In background
    mode the startup file is scratch, so emptying it is free.

    Run through the MCP bridge instead and this does nothing, because that is
    somebody's open Blender and clearing it would be unforgivable.
    """
    if not bpy.app.background:
        return
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def wipe():
    """Clear only what this script made, by collection — never the file."""
    existing = bpy.data.collections.get("PotluckAssets")
    if existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(existing)
    col = bpy.data.collections.new("PotluckAssets")
    bpy.context.scene.collection.children.link(col)
    return col


MARGIN = 1.10


def frame_on(objs, cam):
    """Fit the camera to these objects and report how wide the frame is.

    Two things here are deliberate.

    The camera is MOVED to centre the subject rather than always aimed at the
    world origin. A table's visual centre is most of a metre above the floor,
    so aiming at the origin left every sprite shoved into one corner with dead
    space opposite it.

    And the frame width is RETURNED, because fitting each sprite tightly
    destroys relative scale: a candle and a dining table would both fill 512
    pixels and the set would have no sense of size left in it. The manifest
    records each sprite's width in metres so the renderer can size them
    against each other rather than against their own frames.
    """
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(c) for obj in objs for c in obj.bound_box]

    # Measured in the camera's own axes, not the world's.
    right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
    up = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
    xs = [c.dot(right) for c in corners]
    ys = [c.dot(up) for c in corners]

    span = max(max(xs) - min(xs), max(ys) - min(ys)) * MARGIN
    cam.data.ortho_scale = span

    mid_r = (max(xs) + min(xs)) / 2
    mid_u = (max(ys) + min(ys)) / 2
    base = Vector((
        CAM_DISTANCE * math.sin(CAM_PITCH) * math.cos(CAM_YAW),
        CAM_DISTANCE * math.sin(CAM_PITCH) * math.sin(CAM_YAW),
        CAM_DISTANCE * math.cos(CAM_PITCH),
    ))
    cam.location = base + right * (mid_r - base.dot(right)) + up * (mid_u - base.dot(up))
    return span


def render_piece(name, builder, cam, col):
    objs = builder()
    for obj in objs:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)

    span = frame_on(objs, cam)
    bpy.context.scene.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)

    for obj in objs:
        bpy.data.objects.remove(obj, do_unlink=True)
    return span


def main():
    os.makedirs(OUT, exist_ok=True)
    clear_startup_scene()
    cam = setup_scene()
    col = wipe()
    manifest = {
        "pixels": RES,
        "pitch_deg": round(math.degrees(CAM_PITCH), 3),
        "yaw_deg": round(math.degrees(CAM_YAW), 3),
        "sprites": {},
    }
    for name, builder in PIECES.items():
        span = render_piece(name, builder, cam, col)
        manifest["sprites"][name] = {"metres": round(span, 4)}
        print(f"rendered {name} ({span:.3f}m across)")
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"done -> {OUT}")


if __name__ == "__main__":
    main()
