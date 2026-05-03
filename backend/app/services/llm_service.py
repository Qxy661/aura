import json
import base64
import os
import time
import logging
import httpx
from functools import wraps
from typing import Union
from openai import OpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        # Aggressively bypass any system proxy
        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("HTTPS_PROXY", None)
        os.environ.pop("http_proxy", None)
        os.environ.pop("https_proxy", None)
        os.environ.pop("ALL_PROXY", None)
        os.environ.pop("all_proxy", None)
        os.environ["NO_PROXY"] = "*"

        http_client = httpx.Client(
            proxy=None,
            verify=False,
            follow_redirects=True,
            timeout=120.0,
        )
        _client = OpenAI(
            api_key=settings.llm_api_key or "not-set",
            base_url=settings.llm_base_url,
            timeout=120.0,
            http_client=http_client,
        )
    return _client


def with_retry(max_retries: int = 3, base_delay: float = 1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"{func.__name__} attempt {attempt + 1} failed: {e}, retrying in {delay}s")
                        time.sleep(delay)
                    else:
                        logger.error(f"{func.__name__} failed after {max_retries} attempts: {e}")
            raise last_exception
        return wrapper
    return decorator


def _parse_json_response(text: str, fallback: Union[dict, list, None] = None) -> Union[dict, list]:
    try:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return fallback if fallback is not None else {}


@with_retry(max_retries=3)
def summarize_text(text: str) -> dict:
    """Summarize text and extract key points using LLM."""
    if not text or not text.strip():
        return {"summary": "内容为空", "key_points": "", "relevance_score": 0.0}

    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一个学术论文分析助手。请对以下内容进行分析，返回 JSON 格式：\n"
                    '{"summary": "一句话总结", "key_points": "要点1; 要点2; 要点3", "relevance_score": 8.5}\n'
                    "relevance_score 范围 0-10，表示对 AI/LLM 研究者的相关性。"
                ),
            },
            {"role": "user", "content": text[:3000]},
        ],
        temperature=0.3,
        max_tokens=8000,
        extra_body={"reasoning_effort": "low"},
    )
    content = response.choices[0].message.content
    if not content:
        return {"summary": "AI 未返回内容", "key_points": "", "relevance_score": 0.0}

    result = _parse_json_response(content, {"summary": content[:200], "key_points": "", "relevance_score": 5.0})
    if isinstance(result, dict):
        return result
    return {"summary": content[:200], "key_points": "", "relevance_score": 5.0}


@with_retry(max_retries=3)
def generate_investment_report(holdings: list, insights: list) -> str:
    """Generate investment review report based on holdings and collected insights."""
    holdings_text = "\n".join(
        f"- {h.name}({h.code}): 成本价 {h.cost_price}, 份额 {h.shares}, 类型 {h.asset_type}"
        for h in holdings
    )
    insights_text = "\n".join(
        f"- [{i.source}] {i.content}" for i in insights
    ) or "本周暂无收集的观点。"

    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一位客观理性的投资分析师。请根据用户的持仓数据和本周收集的市场观点，"
                    "生成一份简洁的投资复盘报告。报告应包含：\n"
                    "1. 持仓概况分析\n"
                    "2. 市场情绪与持仓匹配度\n"
                    "3. 风险提示\n"
                    "4. 建议（2-3条）\n"
                    "保持客观，不要给出具体买卖建议。用中文回复。"
                ),
            },
            {
                "role": "user",
                "content": f"【持仓数据】\n{holdings_text}\n\n【本周收集的观点】\n{insights_text}",
            },
        ],
        temperature=0.5,
        max_tokens=8000,
        extra_body={"reasoning_effort": "low"},
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("AI 未返回报告内容")
    return content


@with_retry(max_retries=3)
def analyze_quote(content: str, author: str, book_title: str) -> dict:
    """Generate AI summary and analysis for a book excerpt."""
    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一位博学的文学与哲学分析师。请对以下书籍摘录进行深度分析。\n"
                    "返回JSON格式：\n"
                    '{"summary": "用一两句话概括这段话的核心含义", '
                    '"analysis": "深度分析（150-200字），包括：\\n1. 这段话的深层含义\\n2. 在当代生活中的启示\\n3. 与其他思想的关联"}\n'
                    "分析要有深度，避免泛泛而谈。用中文回复。"
                ),
            },
            {
                "role": "user",
                "content": f"书名：{book_title}\n作者：{author}\n\n摘录内容：\n{content}",
            },
        ],
        temperature=0.5,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )
    text = response.choices[0].message.content
    if not text:
        return {"summary": "AI 未返回分析", "analysis": ""}

    result = _parse_json_response(text, {"summary": text[:200], "analysis": ""})
    if isinstance(result, dict):
        return result
    return {"summary": text[:200], "analysis": ""}


@with_retry(max_retries=3)
def generate_quotes(count: int = 3) -> list:
    """Use LLM to generate new book quotes/inspirational excerpts."""
    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一位博学的文学爱好者。请生成几条有深度的书摘金句，来自中外经典文学、哲学、心理学、科学等领域的知名作品。\n"
                    "返回JSON数组格式：\n"
                    '[{"content": "金句内容", "author": "作者", "book_title": "书名"}]\n'
                    "要求：\n"
                    "1. 金句要有思想深度和启发性\n"
                    "2. 来源要真实可查\n"
                    "3. 中英文均可，优先中文\n"
                    "4. 只返回JSON数组，不要其他文字"
                ),
            },
            {
                "role": "user",
                "content": f"请生成{count}条优质书摘金句。",
            },
        ],
        temperature=0.8,
        max_tokens=8000,
        extra_body={"reasoning_effort": "low"},
    )
    text = response.choices[0].message.content
    if not text:
        return []

    result = _parse_json_response(text, [])
    if isinstance(result, list):
        return result
    return []


@with_retry(max_retries=3)
def generate_mood_advice(mood: str, recent_moods: list) -> str:
    """Generate caring advice based on current mood and mood history."""
    mood_map = {
        "happy": "开心 😊",
        "calm": "平静 😌",
        "inspired": "灵感迸发 ✨",
        "sad": "有点 emo 😢",
        "anxious": "焦虑 😰",
        "neutral": "一般 😐",
    }
    mood_desc = mood_map.get(mood, mood)
    history_text = "、".join(mood_map.get(m, m) for m in recent_moods[-7:]) if recent_moods else "暂无记录"

    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一只温暖的AI小狗助手，善于倾听和共情。用户当前的心情状态如下，请给出温暖、有建设性的生活建议。\n"
                    "要求：\n"
                    "1. 语气温柔可爱，像一只贴心的小狗\n"
                    "2. 建议具体可执行（如深呼吸、散步、听音乐等）\n"
                    "3. 2-3句话即可，不要太长\n"
                    "4. 如果用户连续多天心情不好，要特别关心\n"
                    "5. 用中文回复"
                ),
            },
            {
                "role": "user",
                "content": f"当前心情：{mood_desc}\n最近心情记录：{history_text}",
            },
        ],
        temperature=0.7,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )
    content = response.choices[0].message.content
    return content or "🐶 汪！无论什么心情，小狗都陪在你身边~"


@with_retry(max_retries=3)
def extract_holdings_from_image(image_bytes: bytes, media_type: str) -> list:
    """Use LLM vision to extract fund holdings from a screenshot."""
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = get_client().chat.completions.create(
        model=get_settings().llm_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一个基金持仓识别助手。用户会发送基金APP的截图，"
                    "你需要从中提取所有基金持仓信息。返回JSON数组格式：\n"
                    '[{"name": "基金名称", "code": "基金代码", "cost_price": 成本价数字, "shares": 份额数字, "asset_type": "fund"}]\n'
                    "注意：\n"
                    "1. cost_price是每份成本价（净值），shares是持有份额\n"
                    "2. 如果截图中显示的是持有金额而非份额，shares填金额，cost_price填1\n"
                    "3. 如果看不清某个字段，用合理估计值\n"
                    "4. asset_type默认为fund，如果是股票则为stock\n"
                    "5. 只返回JSON数组，不要其他文字"
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{b64_image}"
                        },
                    },
                    {
                        "type": "text",
                        "text": "请识别这张截图中的所有基金持仓信息。",
                    },
                ],
            },
        ],
        temperature=0.1,
        max_tokens=8000,
        extra_body={"reasoning_effort": "low"},
    )

    text = response.choices[0].message.content
    if not text:
        raise ValueError("AI 未返回识别结果，请重试")

    result = _parse_json_response(text, None)
    if result is None:
        raise ValueError("AI 返回的内容无法解析，请重试或手动添加")
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and result.get("name"):
        return [result]
    return []
