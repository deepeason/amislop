from PIL import Image
import sys

def check_transparency(img_path):
    try:
        img = Image.open(img_path)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            # Check if there are any pixels with alpha < 255
            alpha = img.convert('RGBA').getchannel('A')
            bbox = alpha.point(lambda p: p < 255 and 255).getbbox()
            if bbox:
                print(f"TRUE_TRANSPARENCY: Image has alpha channel and transparent pixels.")
                return True
            else:
                print(f"FALSE_TRANSPARENCY: Image has alpha channel but all pixels are opaque.")
                return False
        else:
            print(f"FALSE_TRANSPARENCY: Image has no alpha channel (Mode: {img.mode}).")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    check_transparency(sys.argv[1])
