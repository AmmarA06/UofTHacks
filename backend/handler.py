"""
Standalone FastAPI server for Grounding DINO inference
Use this with RunPod's pre-built PyTorch template (no Docker build needed!)

Usage:
1. SSH into RunPod pod
2. Install: pip install transformers torch torchvision opencv-python-headless numpy fastapi uvicorn pillow
3. Copy this file to the pod
4. Run: python handler_grounding_dino.py
"""

from fastapi import FastAPI
import uvicorn
import base64
import cv2
import numpy as np
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
from typing import Dict
import torch
import io

app = FastAPI(title="Grounding DINO Detector")

# Global model instance
model = None
processor = None
device = None
current_classes = []


def load_model(model_name="IDEA-Research/grounding-dino-tiny"):
    """Load Grounding DINO model"""
    global model, processor, device
    print(f"Loading Grounding DINO model: {model_name}...")

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    processor = AutoProcessor.from_pretrained(model_name)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(model_name).to(device)

    print("✓ Model loaded")
    return model


@app.post("/run")
async def detect(request: Dict):
    """
    Grounding DINO detection endpoint
    Compatible with RunPod serverless format
    """
    global model, processor, device, current_classes

    try:
        # Load model on first request
        if model is None:
            model_name = request.get("input", {}).get("model", "IDEA-Research/grounding-dino-tiny")
            load_model(model_name)

        # Parse input
        input_data = request.get("input", {})
        image_b64 = input_data.get("image")
        classes = input_data.get("classes", [])
        confidence = input_data.get("confidence", 0.15)

        if not image_b64 or not classes:
            return {"error": "Missing image or classes"}

        # Decode image
        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(img_rgb)

        # Create text prompt from classes
        text = ". ".join(classes) + "."

        # Process inputs
        inputs = processor(images=pil_image, text=text, return_tensors="pt").to(device)

        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)

        # Post-process results - simpler API without thresholds
        results = processor.post_process_grounded_object_detection(
            outputs,
            inputs.input_ids,
            target_sizes=[pil_image.size[::-1]]  # (height, width)
        )

        detections = []

        if len(results) > 0:
            result = results[0]
            boxes = result["boxes"].cpu().numpy()
            scores = result["scores"].cpu().numpy()
            labels = result["labels"]

            for box, score, label in zip(boxes, scores, labels):
                # Apply confidence threshold manually
                if float(score) < confidence:
                    continue

                # box is in [x_min, y_min, x_max, y_max] format
                x1, y1, x2, y2 = box
                x = int(x1)
                y = int(y1)
                w = int(x2 - x1)
                h = int(y2 - y1)
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                # Find class_id from label text
                class_name = label.lower()
                class_id = -1
                for i, cls in enumerate(classes):
                    if cls.lower() in class_name or class_name in cls.lower():
                        class_id = i
                        class_name = classes[i]
                        break

                if class_id == -1:
                    # Use the detected label as-is if no exact match
                    class_id = len(classes)

                detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": float(score),
                    "bbox": (x, y, w, h),
                    "center": (cx, cy)
                })

        return {"detections": detections, "num_detections": len(detections)}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


@app.get("/")
async def root():
    """Health check endpoint"""
    model_info = "grounding-dino-tiny"
    return {"status": "ready", "model": model_info, "device": device or "unknown"}


if __name__ == "__main__":
    print("=" * 70)
    print("Grounding DINO FastAPI Server")
    print("=" * 70)
    print("Starting server on port 8000...")
    print("Endpoint: http://0.0.0.0:8000/run")
    print("=" * 70)

    # Pre-load model
    load_model()

    # Run server
    uvicorn.run(app, host="0.0.0.0", port=8000)