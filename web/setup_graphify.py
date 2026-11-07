import sys, os, subprocess

def main():
    os.makedirs("graphify-out", exist_ok=True)
    try:
        import graphify
        py = sys.executable
        print(f"Found graphify in {py}")
    except ImportError:
        print("Installing graphifyy...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "graphifyy", "-q"])
        import graphify
        py = sys.executable

    with open("graphify-out/.graphify_python", "w", encoding="utf-8") as f:
        f.write(py)
    root = os.path.abspath(".")
    with open("graphify-out/.graphify_root", "w", encoding="utf-8") as f:
        f.write(root)
    print("GRAPHIFY_READY")

if __name__ == "__main__":
    main()
