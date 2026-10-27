"""Validate the step-1 planning contract/fixtures without network or generation.

Requires Python 3.10+ and jsonschema. Does not validate rendered output or facts.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from jsonschema import Draft202012Validator, ValidationError


ROOT = Path(__file__).resolve().parent


def read_json(relative_path: str) -> dict[str, Any]:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def validate_semantics(board: dict[str, Any], source: dict[str, Any]) -> None:
    known_source_id = source["sourceVersionId"]
    if set(board["sourceVersionIds"]) != {known_source_id}:
        raise ValueError("Fixture must reference its supplied source version only")

    block_ids = [block["id"] for block in source["blocks"]]
    if len(block_ids) != len(set(block_ids)):
        raise ValueError("Source block IDs must be unique")
    known_blocks = set(block_ids)
    scene_ids = [scene["id"] for scene in board["scenes"]]
    if len(scene_ids) != len(set(scene_ids)):
        raise ValueError("Scene IDs must be unique")

    target_ms = board["targetDurationSeconds"] * 1000
    estimated_ms = sum(scene["estimatedDurationMs"] for scene in board["scenes"])
    if not target_ms * 0.9 <= estimated_ms <= target_ms * 1.1:
        raise ValueError("Estimated scene sum must be within 10% of target")

    for scene in board["scenes"]:
        if not scene["narration"].strip() or not scene["onScreenTitle"].strip():
            raise ValueError("Narration and title must contain non-whitespace text")
        if scene["template"] == "title":
            if scene["visualItems"] or scene["highlightIndex"] is not None:
                raise ValueError("Title template does not use process items")
        elif scene["template"] == "process":
            highlight = scene["highlightIndex"]
            if highlight is None or highlight >= len(scene["visualItems"]):
                raise ValueError("Process highlight must address an existing item")
        elif not scene["visualItems"] or scene["highlightIndex"] is not None:
            raise ValueError("Recap needs items and no active process highlight")

        if scene["needsReview"] and not scene["reviewNotes"]:
            raise ValueError("Review flags require a reason")
        for ref in scene["sourceRefs"]:
            if ref["sourceVersionId"] != known_source_id:
                raise ValueError("Scene reference has an unknown source version")
            if ref["blockId"] not in known_blocks:
                raise ValueError("Scene reference has an unknown source block")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", action="store_true", help="Save validation-report.json")
    parser.add_argument("--fixture", choices=("planning", "uber"), default="planning",
                        help="Select an independent authored test fixture (default: planning)")
    args = parser.parse_args()

    schema = read_json("contracts/storyboard.schema.json")
    fixture_path = "fixtures/uber" if args.fixture == "uber" else "fixtures"
    source = read_json(f"{fixture_path}/source.fixture.json")
    board = read_json(f"{fixture_path}/storyboard.fixture.json")
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)

    def validate(candidate: dict[str, Any]) -> None:
        validator.validate(candidate)
        validate_semantics(candidate, source)

    validate(board)
    cases: list[tuple[str, Callable[[dict[str, Any]], None]]] = [
        ("unknown_template", lambda value: value["scenes"][0].update(template="execute_code")),
        ("extra_executable_field", lambda value: value["scenes"][0].update(renderCode="not allowed")),
        ("wrong_output_dimensions", lambda value: value["output"].update(width=1920)),
        ("missing_narration", lambda value: value["scenes"][0].pop("narration")),
        ("unknown_source_block", lambda value: value["scenes"][0]["sourceRefs"][0].update(blockId="missing")),
        ("unknown_source_version", lambda value: value["scenes"][0]["sourceRefs"][0].update(sourceVersionId="missing")),
        ("duplicate_scene_id", lambda value: value["scenes"][1].update(id=value["scenes"][0]["id"])),
        ("duration_sum_out_of_range", lambda value: [scene.update(estimatedDurationMs=12000) for scene in value["scenes"]]),
        ("invalid_highlight", lambda value: value["scenes"][3].update(visualItems=["Only one item"])),
        ("unexplained_review_flag", lambda value: value["scenes"][0].update(needsReview=True)),
        ("missing_source_references", lambda value: value["scenes"][0].update(sourceRefs=[])),
        ("blank_narration", lambda value: value["scenes"][0].update(narration=" ")),
    ]
    rejected: list[str] = []
    for name, mutate in cases:
        candidate = copy.deepcopy(board)
        mutate(candidate)
        try:
            validate(candidate)
        except (ValidationError, ValueError):
            rejected.append(name)
        else:
            raise AssertionError(f"Malformed case unexpectedly accepted: {name}")

    words = sum(len(re.findall(r"\b[\w'-]+\b", scene["narration"])) for scene in board["scenes"])
    report = {
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "Planning schema and authored fixtures only; no rendering, AI, device or billing verification",
        "schemaValid": True,
        "fixtureValid": True,
        "fixture": args.fixture,
        "sceneCount": len(board["scenes"]),
        "templates": sorted({scene["template"] for scene in board["scenes"]}),
        "estimatedDurationSeconds": sum(scene["estimatedDurationMs"] for scene in board["scenes"]) / 1000,
        "narrationWordCount": words,
        "rejectedMalformedCases": rejected,
        "negativeCaseCount": len(rejected),
        "runtimeValidation": "not_run",
    }
    if args.report:
        report_path = ROOT / "fixtures/uber/validation-report.json" if args.fixture == "uber" else ROOT / "validation-report.json"
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
