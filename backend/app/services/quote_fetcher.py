import random
from sqlalchemy.orm import Session
from app.models.muse import Quote

CURATED_BOOK_EXCERPTS = [
    # 哲学 — 沉思录
    {"content": "你所拥有的最不可饶恕的浪费，就是你还没有发挥出来的潜力。你欠自己的，是一个还没有成为的自己。", "author": "马可·奥勒留", "book_title": "沉思录"},
    {"content": "所有的外物都只是你对它们的判断。改变你的判断，它们就改变了。你不必改变世界，只需改变你看待世界的方式。", "author": "马可·奥勒留", "book_title": "沉思录"},
    {"content": "清晨当你不情愿地醒来时，让这个念头伴随你：我醒来是为了去做一个真正的人所做的事。", "author": "马可·奥勒留", "book_title": "沉思录"},
    # 哲学 — 道德经
    {"content": "知人者智，自知者明。胜人者有力，自胜者强。知足者富，强行者有志。", "author": "老子", "book_title": "道德经"},
    {"content": "天下难事必作于易，天下大事必作于细。是以圣人终不为大，故能成其大。", "author": "老子", "book_title": "道德经"},
    # 哲学 — 庄子
    {"content": "井蛙不可以语于海者，拘于虚也；夏虫不可以语于冰者，笃于时也；曲士不可以语于束者，束于教也。", "author": "庄子", "book_title": "庄子·秋水"},
    {"content": "吾生也有涯，而知也无涯。以有涯随无涯，殆已。", "author": "庄子", "book_title": "庄子·养生主"},
    # 哲学 — 传习录
    {"content": "知是行之始，行是知之成。知而不行，只是未知。", "author": "王阳明", "book_title": "传习录"},
    {"content": "你未看此花时，此花与汝同归于寂。你来看此花时，则此花颜色一时明白起来。", "author": "王阳明", "book_title": "传习录"},
    # 心理学 — 活出生命的意义
    {"content": "人所拥有的任何东西，都可以被剥夺，唯独人性最后的自由——也就是在任何境遇中选择自己态度和行为方式的自由——不能被剥夺。", "author": "维克多·弗兰克尔", "book_title": "活出生命的意义"},
    {"content": "那些有理由活下去的人，几乎能承受任何一种活法。", "author": "维克多·弗兰克尔", "book_title": "活出生命的意义"},
    # 心理学 — 思考，快与慢
    {"content": "我们对自己认为熟知的事物确信不疑，我们显然无法了解自己的无知程度，无法确切了解自己所生活的这个世界的不确定性。", "author": "丹尼尔·卡尼曼", "book_title": "思考，快与慢"},
    {"content": "懒惰是人类本性的深层特征。我们的大脑倾向于用最少的努力去完成任务。", "author": "丹尼尔·卡尼曼", "book_title": "思考，快与慢"},
    # 文学 — 局外人
    {"content": "我知道这世界我无处容身，只是，你凭什么审判我的灵魂。", "author": "阿尔贝·加缪", "book_title": "局外人"},
    {"content": "人生在世，永远也不该演戏作假。", "author": "阿尔贝·加缪", "book_title": "局外人"},
    # 文学 — 西西弗神话
    {"content": "攀登山顶的拼搏本身足以充实一颗人心。应当想象西西弗是幸福的。", "author": "阿尔贝·加缪", "book_title": "西西弗神话"},
    # 文学 — 变形记
    {"content": "一天早晨，格里高尔·萨姆沙从不安的睡梦中醒来，发现自己躺在床上变成了一只巨大的甲虫。", "author": "弗兰兹·卡夫卡", "book_title": "变形记"},
    # 文学 — 呐喊
    {"content": "希望是本无所谓有，无所谓无的。这正如地上的路；其实地上本没有路，走的人多了，也便成了路。", "author": "鲁迅", "book_title": "呐喊"},
    {"content": "从来如此，便对么？", "author": "鲁迅", "book_title": "狂人日记"},
    # 文学 — 苏轼
    {"content": "人生如逆旅，我亦是行人。", "author": "苏轼", "book_title": "临江仙·送钱穆父"},
    {"content": "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", "author": "苏轼", "book_title": "定风波"},
    # 商业/思维 — 穷查理宝典
    {"content": "如果我知道我会死在哪里，那我就永远不去那个地方。", "author": "查理·芒格", "book_title": "穷查理宝典"},
    {"content": "反过来想，总是反过来想。许多难题只有反过来想才能得到最好的解决。", "author": "查理·芒格", "book_title": "穷查理宝典"},
    # 商业/思维 — 反脆弱
    {"content": "风会熄灭蜡烛，却能使火越烧越旺。你要成为火，渴望风的吹拂。", "author": "纳西姆·塔勒布", "book_title": "反脆弱"},
    {"content": "有些事情能从冲击中受益，当暴露在波动、随机、混乱和压力中时，它们反而能茁壮成长。这就是反脆弱。", "author": "纳西姆·塔勒布", "book_title": "反脆弱"},
    # 商业/思维 — 黑天鹅
    {"content": "我们的世界是由极端事件主导的，是由未知和不太可能发生的事情主导的，而我们却把时间花在讨论已知和重复发生的事情上。", "author": "纳西姆·塔勒布", "book_title": "黑天鹅"},
    # 哲学 — 查拉图斯特拉
    {"content": "每一个不曾起舞的日子，都是对生命的辜负。", "author": "弗里德里希·尼采", "book_title": "查拉图斯特拉如是说"},
    {"content": "你必须先学会爱自己，才能正确地爱别人。", "author": "弗里德里希·尼采", "book_title": "查拉图斯特拉如是说"},
    # 哲学 — 作为意志和表象的世界
    {"content": "人生就是在痛苦和无聊之间像钟摆一样来回摆动。", "author": "叔本华", "book_title": "作为意志和表象的世界"},
    {"content": "要么庸俗，要么孤独。", "author": "叔本华", "book_title": "人生的智慧"},
    # 文学 — 小王子
    {"content": "真正重要的东西，用眼睛是看不见的，只有用心才能看得清。", "author": "安托万·德·圣-埃克苏佩里", "book_title": "小王子"},
    {"content": "如果你驯服了我，我们就彼此需要了。对我来说，你就是世界上独一无二的。", "author": "安托万·德·圣-埃克苏佩里", "book_title": "小王子"},
    # 文学 — 百年孤独
    {"content": "过去都是假的，回忆是一条没有归途的路，以往的一切春天都无法复原。", "author": "加西亚·马尔克斯", "book_title": "百年孤独"},
    # 哲学 — 存在与时间
    {"content": "人是被抛入这个世界的。他被抛入的可能性之中，必须在可能性中筹划自己的存在。", "author": "马丁·海德格尔", "book_title": "存在与时间"},
    # 商业 — 创新者的窘境
    {"content": "最好的管理者做出的合理且被数据支持的决策，恰恰可能是他们失败的原因。", "author": "克莱顿·克里斯坦森", "book_title": "创新者的窘境"},
    # 文学 — 瓦尔登湖
    {"content": "大多数人都生活在平静的绝望中。", "author": "亨利·大卫·梭罗", "book_title": "瓦尔登湖"},
    {"content": "我步入丛林，因为我希望生活得有意义。我希望活得深刻，汲取生命中所有的精华。", "author": "亨利·大卫·梭罗", "book_title": "瓦尔登湖"},
    # 哲学 — 论语
    {"content": "学而不思则罔，思而不学则殆。", "author": "孔子", "book_title": "论语"},
    {"content": "己所不欲，勿施于人。", "author": "孔子", "book_title": "论语"},
    # 心理学 — 人类简史
    {"content": "金钱是有史以来最成功的故事，是唯一一个所有人都相信的故事。", "author": "尤瓦尔·赫拉利", "book_title": "人类简史"},
    {"content": "我们在石器时代的情感、中世纪的制度和上帝般的技术之间挣扎。", "author": "尤瓦尔·赫拉利", "book_title": "人类简史"},
]


def fetch_quotes(db: Session) -> int:
    """Seed curated book excerpts into the database. Returns count of new quotes."""
    existing = db.query(Quote).filter(Quote.shown_date == None).count()
    if existing >= 10:
        return 0

    # Shuffle to add variety on each seed
    items = CURATED_BOOK_EXCERPTS.copy()
    random.shuffle(items)

    new_count = 0
    for item in items:
        if db.query(Quote).filter(Quote.content == item["content"]).first():
            continue

        quote = Quote(
            content=item["content"],
            author=item["author"],
            book_title=item["book_title"],
        )
        db.add(quote)
        new_count += 1

    db.commit()
    return new_count
