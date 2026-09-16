"""
由母版图生成各平台图标资源。

  assets/icon-source.png (母版，方形、满幅)
      ├─ public/icon.ico                       Windows（build-sea.mjs 注入 exe）
      └─ android/app/src/main/res/mipmap-*/    安卓启动图标
          + values/ic_launcher_background.xml  自适应图标的背景色

为什么必须有这个脚本：public/icon.ico 曾经被直接替换成一张 PNG，
文件名虽然还是 .ico，但 Windows 打包时 resedit 按 ICO 结构解析会失败——
而 build-sea.mjs 里那步包在 try/catch 中，构建照常成功、只是 exe 悄悄用回默认图标，
很难发现。母版与派生资源分开后，改图标只需替换 assets/icon-source.png 再跑一次。

用法: python installer/build-icons.py
"""
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / 'assets' / 'icon-source.png'
ICO_OUT = ROOT / 'public' / 'icon.ico'
ANDROID_RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

# Windows 图标通常覆盖到 256；对齐原来那版的帧集合
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

# 各密度的 1dp 对应像素倍数
DENSITIES = {
    'mdpi': 1,
    'hdpi': 1.5,
    'xhdpi': 2,
    'xxhdpi': 3,
    'xxxhdpi': 4,
}

LEGACY_DP = 48        # 传统启动图标边长
FOREGROUND_DP = 108   # 自适应前景层画布边长
SAFE_DP = 72          # 保证在各厂商遮罩下可见的安全区边长


def load_master() -> Image.Image:
    """读母版。若母版本身就是多帧 ICO，取像素最多的一帧。"""
    im = Image.open(MASTER)
    sizes = im.info.get('sizes')
    if sizes:
        biggest = max(sizes, key=lambda s: s[0] * s[1])
        im.size = biggest
    return im.convert('RGBA')


def sample_background(im: Image.Image) -> tuple[int, int, int]:
    """取左上角作为背景色（母版是满幅平底，角落一定是底色）"""
    r, g, b, _ = im.getpixel((2, 2))
    return (r, g, b)


def flatten(im: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    """把半透明像素合成到背景色上"""
    canvas = Image.new('RGB', im.size, bg)
    canvas.paste(im, (0, 0), im)
    return canvas


def content_bbox(flat: Image.Image, bg: tuple[int, int, int], threshold: int = 28):
    """找出与背景色明显不同的区域，即 logo 实际占位

    逐像素取「最大通道差」，与背景的色相差异不会被亮度平均掉。
    用 PIL 的 C 实现（difference + lighter + getbbox），2048² 母版下也是毫秒级。
    """
    bg_img = Image.new('RGB', flat.size, bg)
    r, g, b = ImageChops.difference(flat, bg_img).split()
    diff = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mask = diff.point(lambda v: 255 if v > threshold else 0)
    return mask.getbbox() or (0, 0, flat.width, flat.height)


def fit_into(im: Image.Image, box: int) -> Image.Image:
    """等比缩放到最长边等于 box"""
    scale = box / max(im.size)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    return im.resize(size, Image.LANCZOS)


def build_ico(src: Image.Image) -> None:
    """Windows 用多帧 ICO。必须写成真正的 ICO 容器，不能只是一张改名的 PNG。"""
    src.save(ICO_OUT, format='ICO', sizes=[(s, s) for s in ICO_SIZES])
    print(f'  {ICO_OUT.relative_to(ROOT)}  {ICO_OUT.stat().st_size / 1024:.0f} KB  '
          f'({len(ICO_SIZES)} 帧)')


def build_android(src: Image.Image, bg: tuple[int, int, int]) -> None:
    flat = flatten(src, bg)
    bbox = content_bbox(flat, bg)
    logo = flat.crop(bbox)
    print(f'  logo 内容区 {bbox}（{logo.width}x{logo.height}）')

    for name, factor in DENSITIES.items():
        out_dir = ANDROID_RES / f'mipmap-{name}'
        out_dir.mkdir(parents=True, exist_ok=True)

        # 传统图标：整图满幅（含自带底色），系统负责加圆角/圆形遮罩
        legacy_px = round(LEGACY_DP * factor)
        legacy = flat.resize((legacy_px, legacy_px), Image.LANCZOS)
        legacy.save(out_dir / 'ic_launcher.png')
        legacy.save(out_dir / 'ic_launcher_round.png')

        # 自适应前景：logo 居中放进安全区，其余留透明。
        # 自适应图标画布是 108dp、只有中间 72dp 保证可见，
        # 不缩进安全区的话圆角/圆形遮罩会切掉 logo 边缘。
        canvas_px = round(FOREGROUND_DP * factor)
        safe_px = round(SAFE_DP * factor)
        scaled = fit_into(logo, safe_px)
        canvas = Image.new('RGBA', (canvas_px, canvas_px), (0, 0, 0, 0))
        canvas.paste(
            scaled,
            ((canvas_px - scaled.width) // 2, (canvas_px - scaled.height) // 2),
        )
        canvas.save(out_dir / 'ic_launcher_foreground.png')

    # 自适应背景色与启动图底色都跟随母版底色，两层同色，
    # 视觉上只剩 logo，也避免抠图产生的边缘光晕
    hex_bg = '#%02X%02X%02X' % bg
    (ANDROID_RES / 'values' / 'ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<resources>\n'
        f'    <color name="ic_launcher_background">{hex_bg}</color>\n'
        '</resources>\n',
        encoding='utf-8',
    )
    print(f'  安卓图标 5 个密度，背景色 {hex_bg}')


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f'缺少母版: {MASTER}')
    src = load_master()
    bg = sample_background(src)
    print(f'母版 {src.size}，背景色 rgb{bg}')
    build_ico(src)
    build_android(src, bg)


if __name__ == '__main__':
    main()
