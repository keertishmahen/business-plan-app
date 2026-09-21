"""Create a zip archive with forward-slash paths for Azure Linux App Service."""
import os
import sys
import zipfile

def main():
    if len(sys.argv) < 3:
        print("Usage: make-linux-zip.py <source_dir> <output.zip>", file=sys.stderr)
        sys.exit(1)

    root = os.path.abspath(sys.argv[1])
    out = os.path.abspath(sys.argv[2])
    skip_dirs = {"node_modules", "data", "__pycache__"}
    skip_files = {".env"}

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]
            for name in filenames:
                if name in skip_files:
                    continue
                full = os.path.join(dirpath, name)
                arc = os.path.relpath(full, root).replace("\\", "/")
                zf.write(full, arc)

    print(out)

if __name__ == "__main__":
    main()
