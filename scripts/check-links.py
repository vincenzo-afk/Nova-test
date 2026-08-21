#!/usr/bin/env python3
"""
Link-integrity checker for the NOVA documentation repository.

Scans every .md file under the repo root for inline-code-span references
to other .md files (the `docs/xxx/yyy.md` style used throughout this
repository) and reports:

  1. BROKEN     - a referenced path does not resolve to a real file.
  2. AMBIGUOUS  - a bare filename (no directory) matches more than one
                  real file elsewhere in the repo, so the reference is
                  genuinely unclear about which file it means.
  3. MALFORMED  - a line has an odd number of backticks, which usually
                  means an inline code span (often a file path) has been
                  split across a line-wrap and needs rejoining.

Exit code is non-zero if any BROKEN or AMBIGUOUS references are found,
so this can be wired into CI (see docs/26-system-reference/11-documentation-lint-ci.md).

Usage:
    python3 scripts/check-links.py [repo_root]
"""
import re
import os
import sys
from collections import defaultdict

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."

    md_files = []
    all_files_by_basename = defaultdict(list)
    for dirpath, dirs, files in os.walk(root):
        if '.git' in dirpath:
            continue
        for f in files:
            p = os.path.normpath(os.path.join(dirpath, f))
            all_files_by_basename[f].append(p)
            if f.endswith('.md'):
                md_files.append(p)

    broken = []
    ambiguous = []
    malformed = []

    path_pat = re.compile(r'`(/?[A-Za-z0-9][A-Za-z0-9._/-]*\.md)`')

    for mf in md_files:
        with open(mf, encoding='utf-8', errors='replace') as fh:
            lines = fh.readlines()

        in_fence = False
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('```'):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            if line.count('`') % 2 == 1:
                malformed.append((mf, i + 1, line.rstrip('\n')))

        text = ''.join(lines)
        for m in path_pat.finditer(text):
            ref = m.group(1)
            line_no = text[:m.start()].count('\n') + 1
            rp = ref[1:] if ref.startswith('/') else ref
            candidate = os.path.normpath(os.path.join(root, rp))
            if os.path.isfile(candidate):
                continue
            if '/' not in ref:
                samedir = os.path.normpath(os.path.join(os.path.dirname(mf), ref))
                if os.path.isfile(samedir):
                    continue
                matches = all_files_by_basename.get(ref, [])
                if len(matches) == 1:
                    continue
                elif len(matches) > 1:
                    ambiguous.append((mf, line_no, ref, matches))
                    continue
                else:
                    broken.append((mf, line_no, ref, "no file with this basename exists anywhere"))
                    continue
            else:
                base = os.path.basename(ref)
                matches = all_files_by_basename.get(base, [])
                reason = f"path not found; basename matches elsewhere: {matches}" if matches else "no file with this basename exists anywhere"
                broken.append((mf, line_no, ref, reason))

    print(f"Scanned {len(md_files)} markdown files under '{root}'.\n")

    print(f"=== MALFORMED (odd backtick count — possible line-wrapped span) ({len(malformed)}) ===")
    for mf, ln, l in malformed:
        print(f"{mf}:{ln}: {l.strip()[:120]}")

    print(f"\n=== BROKEN PATH REFERENCES ({len(broken)}) ===")
    for mf, ln, ref, reason in broken:
        print(f"{mf}:{ln}: `{ref}` -> {reason}")

    print(f"\n=== AMBIGUOUS BARE REFERENCES ({len(ambiguous)}) ===")
    for mf, ln, ref, matches in ambiguous:
        print(f"{mf}:{ln}: `{ref}` -> candidates: {matches}")

    total_hard_failures = len(broken) + len(ambiguous)
    print(f"\n{'PASS' if total_hard_failures == 0 else 'FAIL'}: "
          f"{total_hard_failures} broken/ambiguous reference(s), {len(malformed)} malformed line(s).")
    return 1 if total_hard_failures > 0 else 0

if __name__ == "__main__":
    sys.exit(main())
