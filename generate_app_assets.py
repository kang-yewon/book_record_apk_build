import os
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "C:/Windows/Fonts/seguiemj.ttf"
IVORY_BG = "#FAF7F2"

res_base = "android/app/src/main/res"

densities = {
    "mdpi": {"icon": 48, "foreground": 108},
    "hdpi": {"icon": 72, "foreground": 162},
    "xhdpi": {"icon": 96, "foreground": 216},
    "xxhdpi": {"icon": 144, "foreground": 324},
    "xxxhdpi": {"icon": 192, "foreground": 432},
}

def create_icon(size, is_round=False, transparent_bg=False):
    # Render at 4x for high quality antialiasing
    scale = 4
    canvas_size = size * scale
    
    if transparent_bg:
        img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (canvas_size, canvas_size), IVORY_BG)
        
    draw = ImageDraw.Draw(img)
    
    # Emoji size: about 62% of canvas
    font_size = int(canvas_size * 0.62)
    font = ImageFont.truetype(FONT_PATH, font_size)
    
    # Center text
    center = canvas_size // 2
    draw.text((center, center), "\U0001F4D6", font=font, anchor="mm", embedded_color=True)
    
    if is_round:
        # Create circle mask
        mask = Image.new("L", (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, canvas_size - 1, canvas_size - 1), fill=255)
        
        round_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        round_img.paste(img, (0, 0), mask)
        img = round_img

    # Resize down with Lanczos
    return img.resize((size, size), Image.Resampling.LANCZOS)

def create_splash(width, height):
    img = Image.new("RGBA", (width, height), IVORY_BG)
    draw = ImageDraw.Draw(img)
    
    # Size based on smaller dimension
    icon_dim = int(min(width, height) * 0.32)
    font = ImageFont.truetype(FONT_PATH, icon_dim)
    draw.text((width // 2, height // 2), "\U0001F4D6", font=font, anchor="mm", embedded_color=True)
    return img

print("Generating Android mipmap icons...")
for dens, sizes in densities.items():
    folder = os.path.join(res_base, f"mipmap-{dens}")
    os.makedirs(folder, exist_ok=True)
    
    # Standard icon (square)
    icon = create_icon(sizes["icon"], is_round=False)
    icon.save(os.path.join(folder, "ic_launcher.png"), "PNG")
    
    # Round icon
    round_icon = create_icon(sizes["icon"], is_round=True)
    round_icon.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
    
    # Adaptive foreground (transparent background)
    fg = create_icon(sizes["foreground"], is_round=False, transparent_bg=True)
    fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")

print("Generating Splash screens...")
splash_folders = [
    ("drawable", 480, 800),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280),
    ("drawable-port-xxhdpi", 960, 1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720),
    ("drawable-land-xxhdpi", 1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280),
]

for folder_name, w, h in splash_folders:
    target_dir = os.path.join(res_base, folder_name)
    os.makedirs(target_dir, exist_ok=True)
    splash = create_splash(w, h)
    splash.save(os.path.join(target_dir, "splash.png"), "PNG")

print("Generating web icons...")
web_icon = create_icon(192, is_round=False)
web_icon.save("public/icon.png", "PNG")
web_icon_512 = create_icon(512, is_round=False)
web_icon_512.save("public/icon-512.png", "PNG")

print("Done generating all app assets!")
