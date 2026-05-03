from app.database import SessionLocal
from app.models.research import ResearchField

PREDEFINED_FIELDS = [
    {"name": "低空经济", "name_en": "Low-altitude Economy", "keywords": "low altitude economy,urban air mobility,UAM,air taxi,eVTOL,low-altitude airspace", "icon": "🚁", "sort_order": 1, "is_active": True},
    {"name": "无人机", "name_en": "Drones/UAV", "keywords": "UAV,unmanned aerial vehicle,drone,quadrotor,multi-robot systems,autonomous flight", "icon": "🛸", "sort_order": 2, "is_active": False},
    {"name": "自动化", "name_en": "Automation", "keywords": "automation,control systems,robotics,industrial automation,PID control,model predictive control", "icon": "🤖", "sort_order": 3, "is_active": False},
    {"name": "人工智能", "name_en": "AI/LLM", "keywords": "machine learning,large language model,AI agent,deep learning,reinforcement learning", "icon": "🧠", "sort_order": 4, "is_active": False},
    {"name": "飞控", "name_en": "Flight Control", "keywords": "flight control,autopilot,flight dynamics,attitude control,PID tuning,flight controller,drone flight control,attitude estimation,IMU sensor", "icon": "✈️", "sort_order": 5, "is_active": True},
    {"name": "计算机视觉", "name_en": "Computer Vision", "keywords": "computer vision,image recognition,object detection,visual SLAM,image segmentation", "icon": "👁️", "sort_order": 6, "is_active": False},
    {"name": "物联网", "name_en": "IoT", "keywords": "Internet of Things,IoT,embedded systems,sensor network,edge computing", "icon": "📡", "sort_order": 7, "is_active": False},
]


def seed_research_fields():
    """Populate research_fields table, adding any missing fields."""
    db = SessionLocal()
    try:
        existing = {f.name for f in db.query(ResearchField.name).all()}
        for item in PREDEFINED_FIELDS:
            if item["name"] not in existing:
                db.add(ResearchField(**item))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
