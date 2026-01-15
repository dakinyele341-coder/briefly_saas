from huggingface_hub import HfApi
from gradio import Interface
import gradio as gr

# This is a placeholder app.py for Hugging Face Spaces
# The actual FastAPI app is in backend/main.py

def greet(name):
    return f"Hello {name}!"

demo = Interface(fn=greet, inputs="text", outputs="text")

if __name__ == "__main__":
    demo.launch()
