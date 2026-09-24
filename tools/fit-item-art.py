"""把行囊/装备的实物图标规整成「填满画布」的方形图标。

为什么不直接调 CSS 尺寸：这些图是 256×256 的正方形画布，但实物只占其中一块 ——
剑是竖长条，只占画布宽度的 18%，于是 32px 的格子里剑身只有 6px 宽，
看起来就是"一根线"。放大 CSS 尺寸会同时撑大留白，格子反而更空。

做法（可重复执行，跑第二遍结果不变）：
  1. 按 alpha 裁到实物外框；
  2. 特别细长的实物（剑）转成斜置 —— 方形格子里斜放比竖放占的面积大得多，
     这也正是游戏道具图标的通行画法；
  3. 四周留 4% 边距，补成正方形，缩回 256×256。
"""
import glob
import os

from PIL import Image

MAX_RATIO = 2.2      # 高宽比超过这个值就算"细长"，转斜置
ANGLE = -38          # 逆时针多少度（负值＝右上到左下，符合持械习惯）
PAD = 0.04           # 四周留白比例
SIZE = 256


def fit(path, out=None):
    im = Image.open(path).convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    if im.height > im.width * MAX_RATIO:                 # 竖长剑 → 斜置
        im = im.rotate(ANGLE, resample=Image.BICUBIC, expand=True)
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
    side = int(max(im.width, im.height) * (1 + PAD * 2))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    dst = out or path
    canvas.save(dst)
    return canvas.size, (im.width, im.height)


SKIP = {'it_boots.png'}   # 战靴的 AI 图抠图失败（只剩一块绿斑）→ 继续用矢量兜底


def main():
    files = sorted(glob.glob('assets/it_*.png')) + sorted(glob.glob('_gen/it_*.png'))
    seen = set()
    for f in files:
        name = os.path.basename(f)
        if name in seen or name in SKIP:
            continue
        seen.add(name)
        dst = os.path.join('assets', name)
        if f.startswith('_gen') and os.path.exists(dst):
            continue                       # assets 里已有就不覆盖
        print("%-18s -> %s  content=%s" % (name, fit(f, dst), dst), flush=True)


main()
