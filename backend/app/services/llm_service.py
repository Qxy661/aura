import json
import base64
import os
import time
import logging
import httpx
from functools import wraps
from typing import Union
from openai import OpenAI
from app.config import get_effective_llm_config

logger = logging.getLogger(__name__)

_client_cache = {}  # key: (api_key, base_url) -> OpenAI


def _bypass_proxy():
    """Aggressively bypass any system proxy."""
    for var in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        os.environ.pop(var, None)
    os.environ["NO_PROXY"] = "*"


def get_client(api_key: str = None, base_url: str = None) -> OpenAI:
    """Get or create an OpenAI client, cached by (api_key, base_url)."""
    cfg = get_effective_llm_config()
    key = api_key or cfg["api_key"]
    url = base_url or cfg["base_url"]
    cache_key = (key, url)

    if cache_key not in _client_cache:
        _bypass_proxy()
        http_client = httpx.Client(proxy=None, verify=False, follow_redirects=True, timeout=120.0)
        _client_cache[cache_key] = OpenAI(
            api_key=key or "not-set",
            base_url=url,
            timeout=120.0,
            http_client=http_client,
        )
    return _client_cache[cache_key]


def test_llm_connection(api_key: str = None, base_url: str = None, model: str = None) -> dict:
    """Test LLM connection and return status + latency."""
    cfg = get_effective_llm_config()
    key = api_key or cfg["api_key"]
    url = base_url or cfg["base_url"]
    mdl = model or cfg["model"]

    if not key or key == "not-set":
        return {"ok": False, "error": "API Key 未设置", "latency_ms": 0}

    start = time.time()
    try:
        client = get_client(api_key=key, base_url=url)
        resp = client.chat.completions.create(
            model=mdl,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )
        latency = int((time.time() - start) * 1000)
        content = resp.choices[0].message.content or ""
        return {"ok": True, "latency_ms": latency, "model": mdl, "sample": content[:50]}
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        return {"ok": False, "error": str(e)[:200], "latency_ms": latency}


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
        model=get_effective_llm_config()["model"],
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
        model=get_effective_llm_config()["model"],
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
        model=get_effective_llm_config()["model"],
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
        model=get_effective_llm_config()["model"],
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
        model=get_effective_llm_config()["model"],
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
        model=get_effective_llm_config()["model"],
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


@with_retry(max_retries=2)
def evaluate_user_relevance(articles: list, research_profile: str) -> list:
    """Batch evaluate articles for personal relevance. Returns list of {id, score, reason}."""
    if not articles:
        return []

    articles_text = "\n".join(
        f"[ID:{a.id}] {a.title}\n摘要: {(a.abstract or '')[:200]}"
        for a in articles[:10]
    )

    response = get_client().chat.completions.create(
        model=get_effective_llm_config()["model"],
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一个科研论文推荐助手。根据用户的研究方向，评估每篇论文的个人相关性。\n"
                    f"用户研究方向：{research_profile}\n\n"
                    "返回JSON数组：\n"
                    '[{"id": 论文ID, "score": 0-10的相关性评分, "reason": "一句话理由"}]\n'
                    "评分标准：\n"
                    "0-3: 不太相关\n4-6: 有一定关联\n7-8: 高度相关\n9-10: 核心研究方向\n"
                    "只返回JSON数组。"
                ),
            },
            {"role": "user", "content": articles_text},
        ],
        temperature=0.3,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )

    text = response.choices[0].message.content or "[]"
    result = _parse_json_response(text, [])
    return result if isinstance(result, list) else []


@with_retry(max_retries=2)
def find_paper_connections(articles: list) -> list:
    """Find connections between papers. Returns list of {source_id, target_id, type, strength}."""
    if len(articles) < 2:
        return []

    articles_text = "\n".join(
        f"[ID:{a.id}] {a.title}\n作者: {a.authors}\n关键词: {a.key_points or a.tags}"
        for a in articles[:30]
    )

    response = get_client().chat.completions.create(
        model=get_effective_llm_config()["model"],
        messages=[
            {
                "role": "system",
                "content": (
                    "分析以下论文之间的关联关系。找出有共同作者、相似主题或方法论关联的论文对。\n"
                    "返回JSON数组：\n"
                    '[{"source_id": ID1, "target_id": ID2, "type": "author|keyword|topic", "strength": 0.0-1.0}]\n'
                    "strength 说明：0.3-0.5 弱关联，0.5-0.7 中等关联，0.7-1.0 强关联\n"
                    "最多返回20个关联。只返回JSON数组。"
                ),
            },
            {"role": "user", "content": articles_text},
        ],
        temperature=0.3,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )

    text = response.choices[0].message.content or "[]"
    result = _parse_json_response(text, [])
    return result if isinstance(result, list) else []


@with_retry(max_retries=2)
def chat_with_paper(title: str, abstract: str, summary: str, full_text: str, message: str, history: list) -> str:
    """Chat with a paper — ask questions about its content."""
    context = f"论文标题: {title}\n摘要: {abstract or '无'}\nAI总结: {summary or '无'}"
    if full_text:
        # Truncate full text to fit context window
        context += f"\n\n论文全文:\n{full_text[:15000]}"

    messages = [
        {
            "role": "system",
            "content": (
                "你是一个科研论文解读助手。用户正在阅读一篇论文，你可以基于论文的标题、摘要和AI总结来回答问题。\n"
                "要求：\n"
                "1. 基于已有信息回答，如果信息不足请如实说明\n"
                "2. 可以解释概念、分析方法、讨论意义\n"
                "3. 可以建议用户进一步阅读的方向\n"
                "4. 用中文回复，简洁专业"
            ),
        },
        {"role": "user", "content": context},
    ]

    # Add conversation history
    for msg in history[-10:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    messages.append({"role": "user", "content": message})

    response = get_client().chat.completions.create(
        model=get_effective_llm_config()["model"],
        messages=messages,
        temperature=0.5,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )

    return response.choices[0].message.content or "抱歉，AI 未能生成回复。"
