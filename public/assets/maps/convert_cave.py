#!/usr/bin/env python3

import json
import sys
from pathlib import Path


# Output format, based on cave_1(1).json.
# No reference JSON file is needed.
OUTPUT_TEMPLATE = {
    "label": "cave_1",
    "title": "DUEL CAVE",
    "physics": {"gravity": 0.003},
    "numPlayers": 2,
    "duration": 600,
    "mode": "ffa",
    "scale": 1,
    "playerRespawnTime": 120,
    "itemRespawnTime": 600,
    "offset": {"x": -262, "y": -193},
    "objects": [],
    "decor": [],
}


# Tiled property values used by the maps.
# In the current maps, properties.type = 1 means a static obstacle.
PROPERTY_TYPE_MAP = {
    1: "staticObstacle",
}


def find_layer(layers, *names):
    """Recursively find the first layer whose name matches one of names."""
    wanted = set(names)

    for layer in layers:
        if layer.get("name") in wanted:
            return layer

        nested = layer.get("layers")
        if nested:
            found = find_layer(nested, *names)
            if found is not None:
                return found

    return None


def properties_dict(obj):
    """Return Tiled properties as a normal dict.

    Supports both:
      "properties": {"type": 1, "label": "..."}
    and Tiled's list form:
      "properties": [{"name": "type", "value": 1}, ...]
    """
    props = obj.get("properties", {})

    if isinstance(props, dict):
        return props

    if isinstance(props, list):
        return {
            item["name"]: item.get("value")
            for item in props
            if isinstance(item, dict) and "name" in item
        }

    return {}


def infer_type(obj, props):
    """Infer the output type when Tiled's object type is empty."""
    object_type = obj.get("type")

    if object_type:
        return object_type

    # Spawn objects are identified by their template.
    template = str(obj.get("template", "")).lower()
    if Path(template).stem.lower() == "spawn":
        return "spawnPoint"

    property_type = props.get("type")

    # The map also contains a named helper object called 'corner'.
    # Keep it as an explicit object type when no other type information exists.
    if property_type is None and str(obj.get('name', '')).lower() == 'corner':
        return 'corner'

    # If Tiled explicitly stores a string type in properties, use it.
    if isinstance(property_type, str) and property_type:
        return property_type

    # Map numeric Tiled type properties to the output format.
    if property_type in PROPERTY_TYPE_MAP:
        return PROPERTY_TYPE_MAP[property_type]

    # A zone can also be identified by its zoneType property.
    if props.get("zoneType") is not None:
        return "zone"

    # pickupType/label are pickup-specific properties.
    if props.get("pickupType") is not None or props.get("label") is not None:
        return "pickup"

    # Plain rectangular objects in the platforms layer are static obstacles.
    if "width" in obj and "height" in obj:
        return "staticObstacle"

    raise ValueError(
        f'Cannot infer type for object id={obj.get("id")}. '
        f'Object type is empty and properties.type={property_type!r} '
        f'has no mapping.'
    )


def convert_object(obj):
    props = properties_dict(obj)
    inferred_type = infer_type(obj, props)

    result = {
        "id": obj["id"],
        "x": obj["x"],
        "y": obj["y"],
        "type": inferred_type,
    }

    if inferred_type == "zone":
        result["hitbox"] = {
            "width": obj["width"],
            "height": obj["height"],
        }
        profile_type = props.get("zoneType")
        if profile_type is None:
            raise ValueError(f'Zone object id={obj.get("id")} has no properties.zoneType')
        result["profile"] = {
            "type": profile_type,
            "factor": 0.2,
        }
        return result

    for key in ("width", "height"):
        if key in obj:
            result[key] = obj[key]

    for key in ("pickupType", "label"):
        if key in props and props[key] is not None:
            result[key] = props[key]

    return result


def write_json(objects, output_file):
    """Write the converted format with one object per line."""
    result = dict(OUTPUT_TEMPLATE)
    result["objects"] = objects

    with Path(output_file).open("w", encoding="utf-8") as f:
        f.write("{\n")
        f.write(f'  "label": {json.dumps(result["label"], ensure_ascii=False)},\n')
        f.write(f'  "title": {json.dumps(result["title"], ensure_ascii=False)},\n')
        f.write(
            f'  "physics": {json.dumps(result["physics"], ensure_ascii=False, separators=(", ", ": "))},\n'
        )
        f.write(f'  "numPlayers": {result["numPlayers"]},\n')
        f.write(f'  "duration": {result["duration"]},\n')
        f.write(f'  "mode": {json.dumps(result["mode"], ensure_ascii=False)},\n')
        f.write(f'  "scale": {result["scale"]},\n')
        f.write(f'  "playerRespawnTime": {result["playerRespawnTime"]},\n')
        f.write(f'  "itemRespawnTime": {result["itemRespawnTime"]},\n')
        f.write(
            f'  "offset": {json.dumps(result["offset"], ensure_ascii=False, separators=(", ", ": "))},\n'
        )
        f.write('  "objects": [\n')

        for index, obj in enumerate(objects):
            comma = "," if index < len(objects) - 1 else ""
            f.write(
                "    "
                + json.dumps(obj, ensure_ascii=False, separators=(", ", ": "))
                + comma
                + "\n"
            )

        f.write("  ],\n")
        f.write('  "decor": []\n')
        f.write("}\n")


def convert(input_file, output_file):
    with Path(input_file).open(encoding="utf-8") as f:
        source = json.load(f)

    # The actual Tiled layer is named "platforms".
    # "platform" is also accepted in case the layer is renamed.
    platform_layer = find_layer(source.get("layers", []), "platforms", "platform")

    if platform_layer is None:
        raise ValueError('Layer "platforms" (or "platform") not found')

    objects = [
        convert_object(obj)
        for obj in platform_layer.get("objects", [])
    ]

    write_json(objects, output_file)
    print(f"Converted {len(objects)} objects -> {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_cave.py input_tiled.json output.json")
        sys.exit(1)

    try:
        convert(sys.argv[1], sys.argv[2])
    except (OSError, json.JSONDecodeError, ValueError, KeyError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
