"""立绘分层：把一张整图拆成「身体层 + 手臂层」，用于真正的抬手 / 举兵器动作。

为什么必须拆：整张位图没有骨骼，裁一块来转一定在切边漏馅（上一版试过，腰际出现接缝）。

两种素材分别处理（脚本自动识别）：
  · 黑底图（男版，靠 CSS mix-blend-mode:screen 去底）：手臂区在身体层涂黑即可 ——
    黑在 screen 混合下本来就是全透明，等于零成本、零瑕疵的"挖洞"。
  · 透明底图（女版，带 alpha）：身体层要把手臂区真正擦掉并补底。
    补底用「洞内两边界像素做水平线性过渡 + 上下邻行平均」——
    显示尺寸只有 60~94px（原图 373px，缩 4 倍），这种补法肉眼看不出。

产出：
  <名>_body.png   身体层（手臂已移除）
  <名>_arm.png    手臂层（只有手臂，其余透明 / 黑）
  assets/hero_rig.js   每个图层的肩关节位置（图片坐标系百分比），供 CSS transform-origin 用
"""
import glob
import json
import os
import sys

from PIL import Image, ImageChops, ImageFilter

ARM_TOP = 0.20        # 手臂带的起（相对人物高）
ARM_BOT = 0.74        # 手臂带的止（腰际，再往下就是衣摆）
ARM_W = 0.24          # 单侧手臂占人物宽度的比例
FEATHER = 5           # 边缘羽化半径（px）：让旋转时不会出现硬切边


def figure_box(im):
    """人物外接框：透明底看 alpha，黑底看"非黑"亮度"""
    if has_alpha(im):
        return im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    g = im.convert('L')
    return g.point(lambda v: 255 if v > 40 else 0).getbbox()


def has_alpha(im):
    """四角全透明 => 透明底素材；否则按黑底处理"""
    if im.mode != 'RGBA':
        return False
    a = im.getchannel('A')
    w, h = im.size
    for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)):
        if a.getpixel(p) > 8:
            return False
    return True


def _runs(px_row, y, w, opaque):
    """一行的连续实心段 [(x0, x1)]（含端点）"""
    out, s = [], None
    for x in range(w):
        if opaque(x, y):
            if s is None:
                s = x
        elif s is not None:
            out.append((s, x - 1))
            s = None
    if s is not None:
        out.append((s, w - 1))
    return [r for r in out if r[1] - r[0] >= 2]


def arm_mask(im):
    """手臂掩膜：每行取人物轮廓最外侧的 ARM_W 宽度（左右各一条带）

    不猜骨头位置。人物在手臂带内的每行轮廓里，最外侧那部分就是袖子/手臂 ——
    关键是它是**贴着轮廓外沿**取的，所以旋转抬臂时让出的位置多半是背景，
    身体层几乎不需要补底（这是这套拆法能干净的根本原因）。
    """
    w, h = im.size
    bb = figure_box(im)
    x0, y0, x1, y1 = bb
    fw, fh = x1 - x0, y1 - y0
    cut = int(fw * ARM_W)
    if has_alpha(im):
        a = im.getchannel('A').load()
        opaque = lambda x, y: a[x, y] > 24
    else:
        g = im.convert('L').load()
        opaque = lambda x, y: g[x, y] > 40
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(y0 + int(fh * ARM_TOP), y0 + int(fh * ARM_BOT)):
        xs = [x for x in range(x0, x1 + 1) if opaque(x, y)]
        if len(xs) < 10:
            continue
        for x in range(xs[0], min(xs[0] + cut, xs[-1]) + 1):
            mp[x, y] = 255
        for x in range(max(xs[-1] - cut, xs[0]), xs[-1] + 1):
            mp[x, y] = 255
    # 上下再收一点：肩关节与腰际各做一小段渐变，免得旋转时顶出一条硬边
    m = m.filter(ImageFilter.GaussianBlur(FEATHER))
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if not opaque(x, y):
                mp[x, y] = 0
    return m, bb


def inpaint(im, mask):
    """手臂区内侧那点衣料用「扩散补底」：反复模糊 + 把已知像素贴回去

    之前按行做水平线性过渡，结果是整齐的横向条纹（每行一个色）——
    扩散没有方向性，不会留下条带。
    """
    w, h = im.size
    out = im.convert('RGB')
    known = out.copy()
    keep = Image.eval(mask, lambda v: 255 - v)
    for _ in range(14):
        out = out.filter(ImageFilter.GaussianBlur(7))
        out.paste(known, (0, 0), keep)       # 已知区域不许被模糊污染
    if im.mode == 'RGBA':
        out = out.convert('RGBA')
        out.putalpha(im.getchannel('A'))
    return out


def split_one(src, dst_body=None, dst_arm=None, verbose=True):
    im = Image.open(src)
    im = im.convert('RGBA') if has_alpha(im.convert('RGBA')) else im.convert('RGB')
    alpha_mode = im.mode == 'RGBA'
    mask, bb = arm_mask(im)
    base = os.path.splitext(src)[0]
    body = dst_body or (base + '_body.png')
    arm = dst_arm or (base + '_arm.png')
    w, h = im.size

    # 手臂层：原图 × 掩膜（羽化边让旋转时是软边而不是硬切）
    if alpha_mode:
        arm_im = im.copy()
        arm_im.putalpha(ImageChops.multiply(im.getchannel('A'), mask))
    else:
        dark = Image.new('RGB', (w, h), (0, 0, 0))
        arm_im = Image.composite(im.convert('RGB'), dark, mask)
    arm_im.save(arm)

    # 身体层：挖掉手臂
    if alpha_mode:
        a = im.getchannel('A')
        hole = Image.composite(mask, Image.new('L', (w, h), 0), a)
        body_im = inpaint(im, hole)
        # 身体层保留原本的 alpha（不挖透明洞）：手臂抬起时露出的是补好的衣料，
        # 而不是一个能看穿背景的窟窿。静止时手臂层正好盖在补底之上。
        body_im.putalpha(a)
    else:
        body_im = Image.composite(Image.new('RGB', (w, h), (0, 0, 0)), im.convert('RGB'), mask)
    body_im.save(body)

    # 肩关节：手臂带上沿、人物水平中心（图片坐标百分比，给 CSS transform-origin）
    x0, y0, x1, y1 = bb
    rig = [round((x0 + x1) / 2.0 / w * 100, 2),
           round((y0 + (y1 - y0) * (ARM_TOP + 0.02)) / h * 100, 2)]
    if verbose:
        print("%s  %s  alpha=%s  shoulder=(%.1f%%, %.1f%%)"
              % (os.path.basename(src), im.size, alpha_mode, rig[0], rig[1]), flush=True)
    return rig


def main():
    pats = sys.argv[1:] or ['assets/hero_*.png']
    files = []
    for p in pats:
        files += sorted(glob.glob(p))
    files = [f for f in files if '_body' not in f and '_arm' not in f]
    rig = {}
    for f in files:
        key = os.path.splitext(os.path.basename(f))[0].replace('hero_', '')
        rig[key] = split_one(f)
    js = ("/* 由 _split.py 生成：各立绘「手臂层」的肩关节位置（图片坐标百分比）。\n"
          "   figure-motion 抬手时以它为 transform-origin 旋转手臂层。 */\n"
          "window.HERO_RIG = " + json.dumps(rig, indent=2, sort_keys=True) + ";\n")
    open('assets/hero_rig.js', 'w', encoding='utf-8').write(js)
    print("rig ->", len(rig), "entries")


if __name__ == '__main__':
    main()
