#!/usr/bin/env python3
"""Minimal relay-export helper for the companion repository.

Usage:
    python relay_export_helper.py relay-export <handoff_path>

Validates the handoff file, computes hashes, and outputs a relay-export JSON
to stdout.  Exits non-zero with a stable error code on any failure.
"""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HANDOFF_PATTERN = re.compile(
    r"^\.agents?/review_handoffs/"
    r"(?:(?:pr-(?P<pr>[1-9][0-9]*))|(?:review-(?P<review_id>[a-z0-9][a-z0-9-]*)))/"
    r"(?P<stream>[a-z0-9][a-z0-9-]*)/"
    r"round-(?P<round>0[1-9]|[1-9][0-9]+)-"
    r"(?P<kind>review-request|review-fix|evidence-amendment|human-decision)"
    r"\.md$"
)

HEADER_FIELDS = (
    "Package kind",
    "Review stream",
    "Effective round",
    "Target PR",
    "Review scope",
)

REMOTE_PREFERENCE = ("origin", "github", "upstream", "agent", "gitee")


def fail(code: str) -> None:
    print(code, file=sys.stderr)
    sys.exit(1)


def git(*args: str, cwd: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=15,
    )
    if result.returncode != 0:
        fail("GIT_ERROR")
    return result.stdout.strip()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def canonical_json(obj: object) -> str:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True, ensure_ascii=False)


def parse_header(text: str, field: str) -> str:
    matches = re.findall(rf"^{re.escape(field)}[：:]\s*(.*?)\s*$", text, re.MULTILINE)
    if len(matches) != 1 or not matches[0].strip():
        fail("HANDOFF_HEADER_INVALID")
    return matches[0].strip().strip("`").strip()


def parse_remote_repository(remote_url: str) -> str | None:
    value = remote_url.strip().removesuffix(".git")
    match = re.search(r"(?:^git@[^:]+:|^https?://[^/]+/|^ssh://[^/]+/)([^/]+/[^/]+)$", value)
    if not match or not re.fullmatch(r"[^/\s]+/[^/\s]+", match.group(1)):
        return None
    return match.group(1)


def resolve_remote_repository(repo_root: str) -> str:
    names = [name for name in git("remote", cwd=repo_root).splitlines() if name]
    ordered_names = [
        *[name for name in REMOTE_PREFERENCE if name in names],
        *sorted(name for name in names if name not in REMOTE_PREFERENCE),
    ]
    for name in ordered_names:
        result = subprocess.run(
            ["git", "remote", "get-url", name],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            continue
        repository = parse_remote_repository(result.stdout)
        if repository is not None:
            return repository
    fail("REMOTE_SLUG_INVALID")
    raise AssertionError("unreachable")


def optional_header(text: str, field: str) -> str | None:
    matches = re.findall(rf"^{re.escape(field)}[：:]\s*(.*?)\s*$", text, re.MULTILINE)
    if len(matches) > 1:
        fail("HANDOFF_HEADER_INVALID")
    return matches[0].strip().strip("`").strip() if matches else None


def resolve_handoff(repo_root: Path, handoff_path: str) -> Path:
    abs_path = repo_root / handoff_path
    if abs_path.is_symlink():
        fail("HANDOFF_PATH_SYMLINK")
    try:
        resolved = abs_path.resolve(strict=False)
        resolved.relative_to(repo_root.resolve())
    except (OSError, RuntimeError, ValueError):
        fail("HANDOFF_PATH_ESCAPE")
    return resolved


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] != "relay-export":
        fail("USAGE_ERROR")

    handoff_path = sys.argv[2].replace("\\", "/")
    repo_root = str(Path.cwd().resolve())

    # 1. Validate path pattern
    m = HANDOFF_PATTERN.match(handoff_path)
    if not m:
        fail("HANDOFF_PATH_INVALID")

    target_kind = "pr" if m.group("pr") else "commit"
    pr_number = int(m.group("pr")) if m.group("pr") else None
    target_id = f"pr-{pr_number}" if pr_number is not None else f"review-{m.group('review_id')}"
    stream = m.group("stream")
    round_num = int(m.group("round"))
    kind = m.group("kind")

    # 2. Verify file exists and is tracked
    abs_path = resolve_handoff(Path(repo_root), handoff_path)
    if not abs_path.is_file():
        fail("HANDOFF_NOT_FOUND")

    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", "--", handoff_path],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if tracked.returncode != 0 or not tracked.stdout.strip():
        fail("HANDOFF_NOT_TRACKED")

    # 3. Verify worktree matches HEAD (no uncommitted changes)
    diff = subprocess.run(
        ["git", "diff", "--quiet", "HEAD", "--", handoff_path],
        cwd=repo_root,
        capture_output=True,
    )
    if diff.returncode != 0:
        fail("HANDOFF_DIRTY_WORKTREE")
    head_blob = subprocess.run(
        ["git", "show", f"HEAD:{handoff_path}"],
        cwd=repo_root,
        capture_output=True,
    )
    if head_blob.returncode != 0:
        fail("HANDOFF_HEAD_BLOB_MISSING")
    # Verify worktree identity through Git's clean filter so that EOL
    # normalization (core.autocrlf, .gitattributes) is respected while
    # real content drift -- even hidden by --assume-unchanged -- is caught.
    head_oid = subprocess.run(
        ["git", "rev-parse", f"HEAD:{handoff_path}"],
        cwd=repo_root, capture_output=True, text=True,
    )
    worktree_oid = subprocess.run(
        ["git", "hash-object", "--path", handoff_path, str(abs_path)],
        cwd=repo_root, capture_output=True, text=True,
    )
    if (head_oid.returncode != 0 or worktree_oid.returncode != 0
            or head_oid.stdout.strip() != worktree_oid.stdout.strip()):
        fail("HANDOFF_DIRTY_WORKTREE")
    # Use the committed blob as canonical bytes for hashing and parsing.
    canonical_bytes = head_blob.stdout

    # 4. Preserve the committed bytes for identity; decode only for header parsing
    handoff_sha = hashlib.sha256(canonical_bytes).hexdigest()
    try:
        content = canonical_bytes.decode("utf-8")
    except UnicodeDecodeError:
        fail("HANDOFF_ENCODING_INVALID")

    # 5. Extract and validate all stable identity headers from the handoff body
    headers = {field: parse_header(content, field) for field in HEADER_FIELDS if field != "Target PR"}
    target_pr_header = optional_header(content, "Target PR")
    target_kind_header = optional_header(content, "Target kind")
    target_id_header = optional_header(content, "Target ID")
    if target_kind_header is not None and target_kind_header != target_kind:
        fail("HANDOFF_PATH_HEADER_MISMATCH")
    if target_id_header is not None and target_id_header != target_id:
        fail("HANDOFF_PATH_HEADER_MISMATCH")
    if target_kind == "commit":
        if target_kind_header != "commit" or target_id_header is None or target_pr_header is not None:
            fail("HANDOFF_HEADER_INVALID")
    else:
        if target_pr_header is None:
            fail("HANDOFF_HEADER_INVALID")
        target_match = re.fullmatch(r"#([1-9][0-9]*)", target_pr_header)
        if not target_match:
            fail("HANDOFF_HEADER_INVALID")
        if int(target_match.group(1)) != pr_number:
            fail("HANDOFF_PATH_HEADER_MISMATCH")
    if headers["Review stream"] != stream:
        fail("HANDOFF_PATH_HEADER_MISMATCH")
    if headers["Package kind"] != kind:
        fail("HANDOFF_PATH_HEADER_MISMATCH")
    round_match = re.fullmatch(r"([1-9][0-9]*)(?:\s*/\s*5)?", headers["Effective round"])
    if not round_match or int(round_match.group(1)) != round_num:
        fail("HANDOFF_PATH_HEADER_MISMATCH")

    scope_raw = re.sub(r"\s+", " ", headers["Review scope"])
    normalized_scope = [s.strip() for s in re.split(r"[,;；]", scope_raw) if s.strip()]
    if not normalized_scope:
        fail("SCOPE_EMPTY")

    if not normalized_scope:
        fail("SCOPE_EMPTY")

    scope_sha = sha256_text(canonical_json(normalized_scope))

    # 6. Get git metadata
    head_sha = git("rev-parse", "HEAD", cwd=repo_root)
    branch = git("rev-parse", "--abbrev-ref", "HEAD", cwd=repo_root)
    if branch == "HEAD":
        fail("DETACHED_HEAD")
    full_ref = f"refs/heads/{branch}"

    # 7. Determine repository slug from the canonical configured remote
    repository = resolve_remote_repository(repo_root)

    # 8. Output relay-export JSON
    export = {
        "schema_version": {"major": 1, "minor": 0 if target_kind == "pr" else 1},
        "repository": repository,
        "target_kind": target_kind,
        "target_id": target_id,
        "target_pr": pr_number,
        "handoff_path": handoff_path,
        "handoff_sha256": handoff_sha,
        "full_ref": full_ref,
        "reviewed_head": head_sha,
        "review_stream": stream,
        "effective_round": round_num,
        "package_kind": kind,
        "normalized_scope": normalized_scope,
        "scope_sha256": scope_sha,
    }
    print(json.dumps(export, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
