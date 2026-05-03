import io
import re
import logging
import httpx
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text content from PDF bytes."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        full_text = "\n\n".join(pages)
        # Clean up excessive whitespace
        full_text = re.sub(r'\n{3,}', '\n\n', full_text)
        full_text = re.sub(r' {2,}', ' ', full_text)
        return full_text.strip()
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def download_arxiv_pdf(arxiv_id: str) -> bytes:
    """Download PDF from arxiv by ID (e.g. '2301.07041')."""
    url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=60.0)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        logger.error(f"Failed to download arxiv PDF {arxiv_id}: {e}")
        raise


def get_arxiv_id_from_url(url: str) -> str:
    """Extract arxiv ID from URL like https://arxiv.org/abs/2301.07041."""
    match = re.search(r'arxiv\.org/(?:abs|pdf)/(\d+\.\d+)', url)
    if match:
        return match.group(1)
    return ""


def fetch_and_extract_full_text(url: str) -> str:
    """Download PDF from arxiv URL and extract text."""
    arxiv_id = get_arxiv_id_from_url(url)
    if not arxiv_id:
        logger.warning(f"Not an arxiv URL: {url}")
        return ""

    try:
        pdf_bytes = download_arxiv_pdf(arxiv_id)
        text = extract_text_from_pdf_bytes(pdf_bytes)
        # Truncate to reasonable size for LLM context
        if len(text) > 50000:
            text = text[:50000] + "\n\n[...文本过长，已截断...]"
        return text
    except Exception as e:
        logger.error(f"fetch_and_extract_full_text failed: {e}")
        return ""
