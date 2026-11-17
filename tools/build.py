"""Build one self-contained HTML game from readable source files.

The game has no external JS/images to fail at startup; the original character sprite
is embedded locally and all terrain art is generated with canvas pixels.
"""
from pathlib import Path
import base64
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'src'
template=(src/'index.template.html').read_text('utf-8')
parts={
'__INLINE_STYLES__':(src/'style.css').read_text('utf-8'),
'__INLINE_WORLD__':(src/'world.js').read_text('utf-8'),
'__INLINE_LIBRARY__':(src/'library.js').read_text('utf-8'),
'__INLINE_VISUALS__':(src/'visuals.js').read_text('utf-8'),
'__INLINE_COMMITMENTS__':(src/'commitments.js').read_text('utf-8'),
'__INLINE_COGNITION__':(src/'cognition.js').read_text('utf-8'),
'__INLINE_APP__':(src/'app.js').read_text('utf-8'),
'__SPRITE_DATA__':'data:image/png;base64,'+(src/'tavi-sprite-base64.txt').read_text('utf-8').strip()
}
for old,new in parts.items():
 assert old in template, f'Missing template marker: {old}'
 template=template.replace(old,new)
assert not any(marker in template for marker in parts)
assert '<script src=' not in template
(ROOT/'game'/'index.html').write_text(template,'utf-8')
print('Built game/index.html,',len(template),'bytes; no external runtime assets required')