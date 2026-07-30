# Upstream bug: ste-lint.py misses em dashes on Windows

Found while testing this repository against the original linter. Not yet
reported. Report it after the first public commit here, with a link back.

**Where:** `videos/ep01-the-cure-for-ai-slop/ste-lint.py`, line 89, in
https://github.com/woosal1337/blog

## The bug

The code opens the file with no encoding argument.

```python
for f in exp:
    with open(f) as fh: r = lint(fh.read())
```

Python picks the encoding from `locale.getpreferredencoding()`. On Linux and
macOS that is UTF-8, so the linter works. On a normal Windows install it is
cp1252. The em dash is not in cp1252, so the read either raises
`UnicodeDecodeError` or returns the wrong characters.

The count then fails silently:

```python
em = raw.count("—") + raw.count("–")
```

## Why it matters

Em dash detection is the headline check. The episode makes the em dash the
visible marker of AI slop, and `em_dash(slop-marker)` is its own field in the
output. On Windows that field reads 0 for every file, whatever the file
contains.

The same read affects `MARKETING`, `BANNED`, and every other check, but those
lists are ASCII, so the damage is limited to the non-ASCII characters. The
curly apostrophe in the contraction regex (`['’]`) has the same problem.

## Reproduction

Windows 11, Python 3, default locale. A markdown file with one U+2014 em dash
inside a blockquote:

```
$ python ste-lint.py README.md
README.md    words=1066 total= 14 per100w=  1.31 em_dash= 0
```

Reading the same file with an explicit encoding:

```
em_dash=1
```

## Fix

One argument:

```python
with open(f, encoding="utf-8") as fh: r = lint(fh.read())
```

`run-openai.py` writes output files and has the same exposure. Worth a check for
`open(` calls without an encoding across the directory.

## What we did here

`packages/clean-writing-lint` reads UTF-8 always. A test counts an em dash in
a UTF-8 file, so the bug cannot come back.
