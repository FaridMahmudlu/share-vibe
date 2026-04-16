import re

# Read old index.css (contains App & Admin design)
with open('old_index.css', 'r', encoding='utf-8') as f:
    old_css = f.read()

# Read new index.css (contains MainPage design)
with open('src/index.css', 'r', encoding='utf-8') as f:
    new_css = f.read()

# 1. Flip the colors in the @theme block
old_css = re.sub(r'--color-cafe-900:\s*#fffaf4;', r'--color-cafe-900: #1a0f0a;', old_css)
old_css = re.sub(r'--color-cafe-800:\s*#f7eee1;', r'--color-cafe-800: #291b12;', old_css)
old_css = re.sub(r'--color-cafe-700:\s*#dfcfba;', r'--color-cafe-700: #4a3424;', old_css)
old_css = re.sub(r'--color-cafe-100:\s*#6c5544;', r'--color-cafe-100: #dcc5b6;', old_css)
old_css = re.sub(r'--color-cafe-50:\s*#291b12;', r'--color-cafe-50: #f3ebe2;', old_css)
old_css = re.sub(r'--color-accent:\s*#c97a43;', r'--color-accent: #d48f6b;', old_css)

# 2. Update body background to dark
old_css = old_css.replace('linear-gradient(180deg, #fffdf9 0%, #f8f0e6 44%, #f2e5d8 100%)', 'linear-gradient(135deg, #1e120b 0%, #0d0704 100%)')
old_css = old_css.replace('rgba(255, 255, 255, 0.5)', 'rgba(0, 0, 0, 0.5)')
old_css = old_css.replace('rgba(255, 255, 255, 0.55)', 'rgba(0, 0, 0, 0.55)')

# 3. Update components to dark glass with light highlights
# section-shell
old_css = old_css.replace('linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 240, 228, 0.82))', 'linear-gradient(180deg, rgba(42, 27, 19, 0.7), rgba(30, 18, 11, 0.6))')
old_css = old_css.replace('box-shadow: 0 28px 65px rgba(80, 58, 42, 0.12)', 'box-shadow: 0 28px 65px rgba(0, 0, 0, 0.4)')
old_css = old_css.replace('border: 1px solid rgba(255, 255, 255, 0.68)', 'border: 1px solid rgba(255, 255, 255, 0.1)')
old_css = old_css.replace('backdrop-filter: blur(24px)', 'backdrop-filter: blur(32px)')
old_css = old_css.replace('linear-gradient(90deg, transparent, rgba(201, 122, 67, 0.24), transparent)', 'linear-gradient(90deg, transparent, rgba(212, 143, 107, 0.4), transparent)')

# section-pill
old_css = old_css.replace('background: rgba(255, 255, 255, 0.78);', 'background: rgba(42, 27, 19, 0.6);')
old_css = old_css.replace('color: rgba(41, 27, 18, 0.72);', 'color: rgba(243, 235, 226, 0.9);')
old_css = old_css.replace('border: 1px solid rgba(201, 122, 67, 0.18)', 'border: 1px solid rgba(212, 143, 107, 0.25)')

# glass-card
old_css = old_css.replace('border: 1px solid rgba(223, 207, 186, 0.92);', 'border: 1px solid rgba(255, 255, 255, 0.08);')
old_css = old_css.replace('background: rgba(255, 255, 255, 0.78);', 'background: rgba(255, 255, 255, 0.04);')

# dropdown-trigger
old_css = old_css.replace('border: 1px solid rgba(223, 207, 186, 0.95);', 'border: 1px solid rgba(255, 255, 255, 0.1);')
old_css = old_css.replace('linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 240, 228, 0.9));', 'linear-gradient(180deg, rgba(42, 27, 19, 0.8), rgba(30, 18, 11, 0.7));')
old_css = old_css.replace('color: rgba(89, 63, 46, 0.86);', 'color: rgba(243, 235, 226, 0.9);') # dropdown-trigger-icon color
old_css = old_css.replace('background: linear-gradient(135deg, rgba(201, 122, 67, 0.16), rgba(255, 255, 255, 0.88));', 'background: linear-gradient(135deg, rgba(212, 143, 107, 0.3), rgba(255, 255, 255, 0.1));') # icon bg
old_css = old_css.replace('color: rgba(52, 36, 26, 0.92);', 'color: rgba(243, 235, 226, 0.92);') # dropdown-label color
old_css = old_css.replace('color: rgba(105, 79, 60, 0.66);', 'color: rgba(220, 197, 182, 0.66);') # hint
old_css = old_css.replace('color: rgba(105, 79, 60, 0.7);', 'color: rgba(220, 197, 182, 0.7);') # chevron

# dropdown-menu
old_css = old_css.replace('border: 1px solid rgba(223, 207, 186, 0.96);', 'border: 1px solid rgba(255, 255, 255, 0.12);')
old_css = old_css.replace('linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 243, 235, 0.95));', 'linear-gradient(180deg, rgba(42, 27, 19, 0.98), rgba(30, 18, 11, 0.95));')
old_css = old_css.replace('color: rgba(52, 36, 26, 0.86);', 'color: rgba(243, 235, 226, 0.86);') # dropdown option
old_css = old_css.replace('color: rgba(43, 28, 19, 0.96);', 'color: rgba(255, 255, 255, 0.96);') # active color

# hover and active tweaks
old_css = old_css.replace('background: rgba(201, 122, 67, 0.12);', 'background: rgba(212, 143, 107, 0.2);')

# stat-card
old_css = old_css.replace('border: 1px solid rgba(255, 255, 255, 0.72);', 'border: 1px solid rgba(255, 255, 255, 0.08);')
old_css = old_css.replace('background: rgba(255, 255, 255, 0.82);', 'background: rgba(255, 255, 255, 0.05);')
old_css = old_css.replace('color: rgba(108, 85, 68, 0.65);', 'color: rgba(220, 197, 182, 0.65);') # stat-label

# header-nav-link
old_css = old_css.replace('border: 1px solid rgba(223, 207, 186, 0.72);', 'border: 1px solid rgba(255, 255, 255, 0.1);')
old_css = old_css.replace('background: rgba(255, 255, 255, 0.58);', 'background: rgba(255, 255, 255, 0.05);')
old_css = old_css.replace('color: rgba(41, 27, 18, 0.7);', 'color: rgba(243, 235, 226, 0.7);')

# icon-button
old_css = old_css.replace('border: 1px solid rgba(223, 207, 186, 0.92);', 'border: 1px solid rgba(255, 255, 255, 0.1);')
old_css = old_css.replace('background: rgba(255, 255, 255, 0.8);', 'background: rgba(255, 255, 255, 0.08);')
old_css = old_css.replace('color: rgba(108, 85, 68, 0.82);', 'color: rgba(220, 197, 182, 0.82);')

# gallery-card
old_css = old_css.replace('border: 1px solid rgba(255, 255, 255, 0.72);', 'border: 1px solid rgba(255, 255, 255, 0.1);')
old_css = old_css.replace('linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 239, 227, 0.84))', 'linear-gradient(180deg, rgba(42, 27, 19, 0.8), rgba(30, 18, 11, 0.7))')

# gallery-media
old_css = old_css.replace('linear-gradient(180deg, rgba(237, 225, 210, 0.8), rgba(223, 207, 186, 0.95))', 'linear-gradient(180deg, rgba(42, 27, 19, 0.8), rgba(20, 10, 5, 0.6))')

# gallery-like-button
old_css = old_css.replace('border: 1px solid rgba(130, 101, 80, 0.18);', 'border: 1px solid rgba(255, 255, 255, 0.15);')
old_css = old_css.replace('background: rgba(255, 255, 255, 0.86);', 'background: rgba(0, 0, 0, 0.3);')
old_css = old_css.replace('color: rgba(83, 62, 47, 0.86);', 'color: rgba(243, 235, 226, 0.86);')

# Finally append the new_css BUT remove the :root variables from new_css since we already have them!
new_css = re.sub(r'/\* Root variables.*?}', '', new_css, flags=re.DOTALL)

final_css = old_css + "\n\n/* --- Landing Page Styles --- */\n\n" + new_css

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(final_css)
