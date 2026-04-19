import asyncio

from google.cloud import vision


async def ocr_receipt(image_bytes: bytes) -> str:
    """
    Sends image bytes to Google Cloud Vision OCR.
    Returns the full raw text detected on the receipt.
    """

    def _sync_ocr() -> str:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.text_detection(image=image)
        if response.error.message:
            raise RuntimeError(f"Vision API error: {response.error.message}")
        texts = response.text_annotations
        if not texts:
            return ""
        return texts[0].description

    return await asyncio.to_thread(_sync_ocr)
