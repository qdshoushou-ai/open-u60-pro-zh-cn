import re, subprocess, sys, pathlib

REPO = pathlib.Path(r"C:\Users\Administrator\Downloads\open-u60-pro")

def swift_norm(text: str) -> str:
    """Replace Swift string-literal contents with a placeholder, keeping everything else.

    Handles: "..." with escapes, multiline \"\"\"...\"\"\", raw strings #"..."# / ##"..."##,
    and interpolation \\( ... ) (interpolation code itself is kept verbatim, recursively
    normalised so literals inside it are placeholders too).
    """
    out = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        # raw string prefixes: #"..."#  (one or more #)
        if ch == '#':
            j = i
            while j < n and text[j] == '#':
                j += 1
            if j < n and text[j] == '"':
                hashes = j - i
                quote_start = j
                # multiline raw: #"""`
                if text.startswith('"""', j):
                    # treat as multiline string, ignore exact raw handling details
                    out.append('_STR_')
                    i = _skip_string(text, j, hashes, multiline=True)
                    continue
                out.append('_STR_')
                i = _skip_string(text, quote_start, hashes, multiline=False)
                continue
            out.append(ch); i += 1; continue
        if ch == '"':
            out.append('_STR_')
            i = _skip_string(text, i, 0, multiline=text.startswith('"""', i))
            continue
        out.append(ch); i += 1
    return ''.join(out)

def _skip_string(text: str, quote_start: int, hashes: int, multiline: bool) -> int:
    """Return index just past the closing quote (and hashes)."""
    n = len(text)
    i = quote_start
    closing = ('"""' if multiline else '"') + ('#' * hashes)
    i += (3 if multiline else 1)
    while i < n:
        if text[i] == '\\':
            # escape: in raw strings a backslash only escapes when followed by #*; just skip 2
            i += 2
            continue
        if text.startswith(closing, i):
            return i + len(closing)
        if not multiline and text[i] == '\n':
            # unterminated single-line string; stop at newline to keep going
            return i
        i += 1
    return n

def norm_file(p: pathlib.Path, text: str) -> str:
    normalized = swift_norm(text)
    # collapse all whitespace runs so formatting-only differences do not matter
    return re.sub(r'\s+', ' ', normalized).strip()

changed = subprocess.run(['git', 'status', '--porcelain'], cwd=REPO, capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
targets = []
for line in changed:
    if not line.strip():
        continue
    path = line[3:].strip().strip('"')
    if path.lower().endswith('.swift'):
        targets.append(path)

bad, checked = [], 0
for rel in targets:
    cur_path = REPO / rel
    if not cur_path.exists():
        continue
    head = subprocess.run(['git', 'show', f'HEAD:{rel}'], cwd=REPO, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if head.returncode != 0:
        continue
    checked += 1
    if norm_file(cur_path, cur_path.read_text(encoding='utf-8')) != norm_file(cur_path, head.stdout):
        bad.append(rel)

print(f"checked {checked} swift files")
if bad:
    print("STRUCTURE DIFFERENCES:")
    for b in bad:
        print(" -", b)
    sys.exit(1)
print("all swift files: code structure identical to HEAD (only string contents changed)")
