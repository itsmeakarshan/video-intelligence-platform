import os
import json
import base64
import io
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

NOTEBOOK_PATH = os.path.join(PROJECT_ROOT, "ml/notebooks/02_model_comparison_and_evaluation.ipynb")

def main():
    # 1. Delete existing notebook file completely
    if os.path.exists(NOTEBOOK_PATH):
        os.remove(NOTEBOOK_PATH)
        print(f"Deleted old notebook: {NOTEBOOK_PATH}")

    # 2. Import generator and generate fresh notebook structure
    from ml.src.build_evaluation_notebook import generate_evaluation_notebook
    generate_evaluation_notebook()

    # 3. Read generated notebook JSON
    with open(NOTEBOOK_PATH, "r") as f:
        nb_data = json.load(f)

    # 4. Prepare execution environment
    exec_globals = {}

    for idx, cell in enumerate(nb_data["cells"]):
        if cell["cell_type"] == "code":
            cell_src = "".join(cell["source"])
            outputs = []
            
            # Intercept stdout & matplotlib plots
            old_stdout = sys.stdout
            captured_stdout = io.StringIO()
            sys.stdout = captured_stdout

            try:
                import matplotlib.pyplot as plt
                
                if not hasattr(plt, "_orig_subplots"):
                    plt._orig_subplots = plt.subplots

                cell_figs = []
                def custom_subplots(*args, **kwargs):
                    res = plt._orig_subplots(*args, **kwargs)
                    fig = res[0] if isinstance(res, tuple) else res
                    cell_figs.append(fig)
                    return res

                plt.subplots = custom_subplots
                plt.show = lambda *args, **kwargs: None

                exec(cell_src, exec_globals)

                if "plt" in exec_globals:
                    exec_globals["plt"].subplots = custom_subplots
                    exec_globals["plt"].show = lambda *args, **kwargs: None

                # Capture open matplotlib figures
                print(f"Cell {idx} captured {len(cell_figs)} figs", file=sys.__stdout__)
                for fig in cell_figs:
                    buf = io.BytesIO()
                    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                    buf.seek(0)
                    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
                    outputs.append({
                        "data": {
                            "image/png": img_b64,
                            "text/plain": ["<Figure size 1400x500 with 2 Axes>"]
                        },
                        "metadata": {},
                        "output_type": "display_data"
                    })
                
                plt.subplots = plt._orig_subplots
                plt.close('all')

                # Capture printed stdout
                stdout_str = captured_stdout.getvalue()
                if stdout_str:
                    outputs.append({
                        "name": "stdout",
                        "output_type": "stream",
                        "text": stdout_str.splitlines(keepends=True)
                    })

            except Exception as e:
                import traceback
                print(f"Cell {idx} error: {e}")
                traceback.print_exc()
                outputs.append({
                    "ename": type(e).__name__,
                    "evalue": str(e),
                    "output_type": "error",
                    "traceback": [str(e)]
                })
            finally:
                sys.stdout = old_stdout

            cell["execution_count"] = idx + 1
            cell["outputs"] = outputs

    # 5. Write back executed notebook with pre-rendered plots and tables
    with open(NOTEBOOK_PATH, "w") as f:
        json.dump(nb_data, f, indent=2)

    print(f"SUCCESS: Brand-new executed notebook with pre-baked plots created at: {NOTEBOOK_PATH}")

if __name__ == "__main__":
    main()
