import random
from app.schemas.muse import TarotCard

MAJOR_ARCANA = [
    {
        "name": "愚者 The Fool",
        "meaning": "新的开始，冒险精神，纯真无畏。",
        "reversed": "鲁莽行事，缺乏计划，恐惧未知。需要三思而后行。",
    },
    {
        "name": "魔术师 The Magician",
        "meaning": "创造力，意志力，资源充沛。",
        "reversed": "能力被浪费，欺骗，缺乏专注。需要重新审视自己的目标。",
    },
    {
        "name": "女祭司 The High Priestess",
        "meaning": "直觉，潜意识，内在智慧。",
        "reversed": "忽视直觉，信息隐藏，内心混乱。需要静下心来倾听内心。",
    },
    {
        "name": "女皇 The Empress",
        "meaning": "丰饶，母性，自然之美。",
        "reversed": "创造力受阻，过度依赖，忽视自我。需要照顾好自己。",
    },
    {
        "name": "皇帝 The Emperor",
        "meaning": "权威，结构，稳定的力量。",
        "reversed": "控制欲过强，僵化，独断。需要学会放手和信任他人。",
    },
    {
        "name": "教皇 The Hierophant",
        "meaning": "传统，信仰，精神指引。",
        "reversed": "打破常规，叛逆，个人信念。适合尝试新的思考方式。",
    },
    {
        "name": "恋人 The Lovers",
        "meaning": "爱情，选择，和谐统一。",
        "reversed": "内心冲突，价值观不合，逃避选择。需要直面内心的真实想法。",
    },
    {
        "name": "战车 The Chariot",
        "meaning": "胜利，意志，克服障碍。",
        "reversed": "方向迷失，缺乏控制，挫败感。需要重新找到前进的动力。",
    },
    {
        "name": "力量 Strength",
        "meaning": "内在力量，勇气，耐心。",
        "reversed": "自我怀疑，软弱，缺乏自信。记住你比想象中更强大。",
    },
    {
        "name": "隐者 The Hermit",
        "meaning": "内省，孤独，寻找真理。",
        "reversed": "逃避社交，过度孤立，固执己见。适当走出去看看世界。",
    },
    {
        "name": "命运之轮 Wheel of Fortune",
        "meaning": "命运转折，循环，机遇。",
        "reversed": "抗拒变化，运气低迷，错失良机。顺其自然，转机即将到来。",
    },
    {
        "name": "正义 Justice",
        "meaning": "公平，真相，因果报应。",
        "reversed": "不公正，逃避责任，偏见。需要诚实地审视自己的行为。",
    },
    {
        "name": "倒吊人 The Hanged Man",
        "meaning": "牺牲，放下，新视角。",
        "reversed": "无谓的牺牲，拖延，顽固不化。换个角度看问题会有新发现。",
    },
    {
        "name": "死神 Death",
        "meaning": "结束与新生，转变，放下过去。",
        "reversed": "抗拒改变，停滞不前，无法放下。是时候勇敢地迎接变化了。",
    },
    {
        "name": "节制 Temperance",
        "meaning": "平衡，耐心，适度。",
        "reversed": "失衡，过度，缺乏耐心。需要在生活中找到平衡点。",
    },
    {
        "name": "恶魔 The Devil",
        "meaning": "束缚，欲望，物质主义。",
        "reversed": "挣脱束缚，觉醒，重获自由。你有能力摆脱困境。",
    },
    {
        "name": "塔 The Tower",
        "meaning": "突变，破坏，觉醒。",
        "reversed": "逃避灾难，恐惧改变，延迟的冲击。主动改变比被动承受更好。",
    },
    {
        "name": "星星 The Star",
        "meaning": "希望，灵感，宁静。",
        "reversed": "失去信心，绝望，与内在断连。希望就在前方，不要放弃。",
    },
    {
        "name": "月亮 The Moon",
        "meaning": "幻象，直觉，潜意识。",
        "reversed": "释放恐惧，走出迷茫，真相浮现。迷雾正在散去。",
    },
    {
        "name": "太阳 The Sun",
        "meaning": "快乐，成功，活力。",
        "reversed": "暂时的阴霾，乐观受挫，延迟的成功。阳光总会再次照耀。",
    },
    {
        "name": "审判 Judgement",
        "meaning": "觉醒，重生，更高的召唤。",
        "reversed": "自我怀疑，逃避评估，拒绝成长。倾听内心的召唤吧。",
    },
    {
        "name": "世界 The World",
        "meaning": "完成，成就，圆满。",
        "reversed": "未完成的事业，缺乏闭合，延迟的成功。坚持下去，终点就在眼前。",
    },
]

# Minor Arcana - selected cards for variety
MINOR_ARCANA = [
    {"name": "权杖王牌 Ace of Wands", "meaning": "新的灵感，创造力爆发，充满热情。", "reversed": "创意枯竭，拖延，方向不明。需要重新点燃内心的火焰。"},
    {"name": "权杖骑士 Knight of Wands", "meaning": "行动力，冒险，追求梦想。", "reversed": "冲动行事，缺乏耐心，半途而废。先想清楚再行动。"},
    {"name": "权杖王后 Queen of Wands", "meaning": "自信，魅力，独立自主。", "reversed": "嫉妒，控制欲，自我中心。需要学会欣赏他人的光芒。"},
    {"name": "圣杯王牌 Ace of Cups", "meaning": "新的感情，情感丰盛，心灵满足。", "reversed": "情感空虚，压抑，错失爱情。打开心扉，爱会找到你。"},
    {"name": "圣杯骑士 Knight of Cups", "meaning": "浪漫，理想主义，追求美好。", "reversed": "不切实际，情感操控，逃避现实。脚踏实地才能走得更远。"},
    {"name": "圣杯王后 Queen of Cups", "meaning": "温柔，直觉，情感智慧。", "reversed": "情绪化，依赖他人，忽视自我。先照顾好自己的心。"},
    {"name": "宝剑王牌 Ace of Swords", "meaning": "清晰的思维，真相，新的见解。", "reversed": "思维混乱，误解，缺乏方向。需要理清思路再做决定。"},
    {"name": "宝剑骑士 Knight of Swords", "meaning": "果断，勇敢，追求真理。", "reversed": "鲁莽，言语伤人，急躁。慢一点，话说出口前先想想。"},
    {"name": "宝剑王后 Queen of Swords", "meaning": "独立，理性，公正判断。", "reversed": "冷漠，苛刻，过于严厉。试着多一些温柔和理解。"},
    {"name": "金币王牌 Ace of Pentacles", "meaning": "新的机会，财富，物质稳定。", "reversed": "错失机会，财务不稳定，缺乏规划。是时候认真对待财务了。"},
    {"name": "金币骑士 Knight of Pentacles", "meaning": "勤奋，可靠，稳步前进。", "reversed": "懒惰，停滞，缺乏动力。给自己设定一个小目标开始行动。"},
    {"name": "金币王后 Queen of Pentacles", "meaning": "富足，务实，照顾他人。", "reversed": "过度牺牲，忽视自我需求，物质焦虑。你也值得被照顾。"},
    {"name": "星币十 Ten of Pentacles", "meaning": "财富，家族，长期成就。", "reversed": "家庭矛盾，财务不稳定，缺乏安全感。与家人好好沟通。"},
    {"name": "圣杯十 Ten of Cups", "meaning": "幸福，家庭和谐，情感满足。", "reversed": "家庭不和，期望落空，情感疏离。珍惜身边的人。"},
    {"name": "宝剑十 Ten of Swords", "meaning": "结束，背叛，触底反弹。", "reversed": "无法放手，抗拒结束，自我折磨。最坏的已经过去，新的开始在等你。"},
    {"name": "权杖十 Ten of Wands", "meaning": "重担，责任，努力奋斗。", "reversed": "过度负担，学会委托，精简任务。不必一个人扛下所有。"},
]


def draw_card() -> TarotCard:
    """Draw a random tarot card with specific upright/reversed meaning."""
    all_cards = MAJOR_ARCANA + MINOR_ARCANA
    card = random.choice(all_cards)
    is_reversed = random.random() < 0.3  # 30% chance reversed

    if is_reversed:
        meaning = f"(逆位) {card.get('reversed', card['meaning'])}"
    else:
        meaning = f"(正位) {card['meaning']}"

    return TarotCard(
        name=card["name"],
        meaning=meaning,
        image_url="",
        is_reversed=is_reversed,
    )


def get_tarot_reading(card_name: str, is_reversed: bool, mood: str = "") -> str:
    """Generate a personalized tarot reading using LLM, optionally linked to mood."""
    from app.services.llm_service import get_client, get_effective_llm_config

    mood_map = {
        "happy": "开心", "calm": "平静", "inspired": "灵感迸发",
        "sad": "有点emo", "anxious": "焦虑", "neutral": "一般",
    }
    mood_desc = mood_map.get(mood, "未知") if mood else ""

    prompt_parts = [f"用户抽到了塔罗牌：{card_name}（{'逆位' if is_reversed else '正位'}）"]
    if mood_desc:
        prompt_parts.append(f"用户当前心情：{mood_desc}")

    response = get_client().chat.completions.create(
        model=get_effective_llm_config()["model"],
        messages=[
            {
                "role": "system",
                "content": (
                    "你是一位温暖的塔罗解读师。请根据用户抽到的塔罗牌和当前心情，给出个性化的解读。\n"
                    "要求：\n"
                    "1. 2-3句话，简洁温暖\n"
                    "2. 如果有心情信息，将牌义与心情结合给出建议\n"
                    "3. 语气像一只贴心的小狗，温暖而有智慧\n"
                    "4. 用中文回复"
                ),
            },
            {"role": "user", "content": "\n".join(prompt_parts)},
        ],
        temperature=0.7,
        max_tokens=200,
        extra_body={"reasoning_effort": "low"},
    )

    return response.choices[0].message.content or "小狗暂时读不懂这张牌，但相信你会找到答案~"
