import random
from app.schemas.muse import TarotCard

MAJOR_ARCANA = [
    {"name": "愚者 The Fool", "meaning": "新的开始，冒险精神，纯真无畏。"},
    {"name": "魔术师 The Magician", "meaning": "创造力，意志力，资源充沛。"},
    {"name": "女祭司 The High Priestess", "meaning": "直觉，潜意识，内在智慧。"},
    {"name": "女皇 The Empress", "meaning": "丰饶，母性，自然之美。"},
    {"name": "皇帝 The Emperor", "meaning": "权威，结构，稳定的力量。"},
    {"name": "教皇 The Hierophant", "meaning": "传统，信仰，精神指引。"},
    {"name": "恋人 The Lovers", "meaning": "爱情，选择，和谐统一。"},
    {"name": "战车 The Chariot", "meaning": "胜利，意志，克服障碍。"},
    {"name": "力量 Strength", "meaning": "内在力量，勇气，耐心。"},
    {"name": "隐者 The Hermit", "meaning": "内省，孤独，寻找真理。"},
    {"name": "命运之轮 Wheel of Fortune", "meaning": "命运转折，循环，机遇。"},
    {"name": "正义 Justice", "meaning": "公平，真相，因果报应。"},
    {"name": "倒吊人 The Hanged Man", "meaning": "牺牲，放下，新视角。"},
    {"name": "死神 Death", "meaning": "结束与新生，转变，放下过去。"},
    {"name": "节制 Temperance", "meaning": "平衡，耐心，适度。"},
    {"name": "恶魔 The Devil", "meaning": "束缚，欲望，物质主义。"},
    {"name": "塔 The Tower", "meaning": "突变，破坏，觉醒。"},
    {"name": "星星 The Star", "meaning": "希望，灵感，宁静。"},
    {"name": "月亮 The Moon", "meaning": "幻象，直觉，潜意识。"},
    {"name": "太阳 The Sun", "meaning": "快乐，成功，活力。"},
    {"name": "审判 Judgement", "meaning": "觉醒，重生，更高的召唤。"},
    {"name": "世界 The World", "meaning": "完成，成就，圆满。"},
]


def draw_card() -> TarotCard:
    """Draw a random tarot card with upright or reversed meaning."""
    card = random.choice(MAJOR_ARCANA)
    is_reversed = random.random() < 0.3  # 30% chance reversed

    if is_reversed:
        meaning = f"(逆位) {card['meaning']} — 当前能量受阻，需要反思内在的阻力。"
    else:
        meaning = f"(正位) {card['meaning']}"

    return TarotCard(
        name=card["name"],
        meaning=meaning,
        image_url="",
        is_reversed=is_reversed,
    )
