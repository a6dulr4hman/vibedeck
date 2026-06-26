"""Two-phase icon management (spec section 3).

Phase 1: the Director emits a short lowercase *keyword* for each icon concept
(e.g. "database", "security", "growth") instead of choosing from a 711-item
list. Keeping the giant list out of the prompt slashes reasoning time.

Phase 2: this module resolves the keyword to an exact lucide-react icon name
(PascalCase) via a curated keyword map + substring fallback. No second LLM call
is required because the resolution table fits in code. The frontend maps the
resolved name to a lucide component (and falls back to Sparkles if unknown).
"""

DEFAULT_ICON = "Sparkles"

# keyword -> lucide PascalCase name. Order: more specific keys first.
_KEYWORD_MAP = {
    "encryption": "Lock", "privacy": "Lock", "password": "Lock", "lock": "Lock",
    "security": "ShieldCheck", "secure": "ShieldCheck", "protection": "ShieldCheck",
    "shield": "ShieldCheck", "compliance": "ShieldCheck", "trust": "ShieldCheck",
    "risk": "AlertTriangle", "warning": "AlertTriangle", "threat": "ShieldAlert",
    "vulnerability": "ShieldAlert",
    "database": "Database", "data": "Database", "storage": "Database",
    "server": "Server", "infrastructure": "Server", "backend": "Server",
    "hosting": "Server",
    "cloud": "Cloud", "saas": "Cloud",
    "network": "Network", "grid": "Network", "connection": "Network",
    "mesh": "Network", "integration": "Workflow", "pipeline": "Workflow",
    "automation": "Workflow", "workflow": "Workflow", "orchestration": "Workflow",
    "speed": "Zap", "fast": "Zap", "performance": "Zap", "realtime": "Zap",
    "real-time": "Zap", "instant": "Zap", "latency": "Gauge", "power": "Zap",
    "energy": "Zap", "electric": "Zap",
    "growth": "TrendingUp", "increase": "TrendingUp", "scale": "TrendingUp",
    "revenue": "TrendingUp", "expansion": "TrendingUp", "momentum": "TrendingUp",
    "decline": "TrendingDown", "reduce": "TrendingDown", "savings": "TrendingDown",
    "analytics": "BarChart3", "metrics": "BarChart3", "stats": "BarChart3",
    "chart": "BarChart3", "insights": "LineChart", "forecast": "LineChart",
    "prediction": "LineChart", "dashboard": "Gauge", "monitor": "Gauge",
    "target": "Target", "goal": "Target", "mission": "Target", "focus": "Target",
    "objective": "Target",
    "ai": "Brain", "ml": "Brain", "model": "Brain", "intelligence": "Brain",
    "brain": "Brain", "reasoning": "Brain", "learning": "Brain",
    "robot": "Bot", "bot": "Bot", "agent": "Bot", "assistant": "Bot",
    "team": "Users", "people": "Users", "customers": "Users", "community": "Users",
    "audience": "Users", "users": "Users", "collaboration": "Users",
    "user": "User", "person": "User", "account": "User", "profile": "User",
    "money": "DollarSign", "revenue$": "DollarSign", "finance": "DollarSign",
    "pricing": "DollarSign", "funding": "DollarSign", "cost": "DollarSign",
    "investment": "DollarSign", "roi": "DollarSign", "profit": "DollarSign",
    "payment": "CreditCard", "card": "CreditCard", "billing": "CreditCard",
    "wallet": "Wallet", "cart": "ShoppingCart", "ecommerce": "ShoppingCart",
    "shopping": "ShoppingCart",
    "time": "Clock", "clock": "Clock", "hours": "Clock", "schedule": "Calendar",
    "calendar": "Calendar", "deadline": "Calendar",
    "global": "Globe", "world": "Globe", "market": "Globe", "geographic": "Globe",
    "international": "Globe", "earth": "Globe",
    "rocket": "Rocket", "launch": "Rocket", "startup": "Rocket", "boost": "Rocket",
    "idea": "Lightbulb", "innovation": "Lightbulb", "insight": "Lightbulb",
    "creative": "Palette", "design": "Palette",
    "success": "CheckCircle2", "done": "CheckCircle2", "check": "CheckCircle2",
    "complete": "CheckCircle2", "verified": "CheckCircle2", "quality": "Award",
    "code": "Code", "engineering": "Code", "developer": "Code", "api": "Code",
    "software": "Code", "terminal": "Terminal",
    "settings": "Settings", "config": "Settings", "control": "Settings",
    "search": "Search", "discover": "Search", "find": "Search",
    "email": "Mail", "mail": "Mail", "contact": "Mail",
    "message": "MessageSquare", "chat": "MessageSquare", "communication": "MessageSquare",
    "support": "MessageSquare",
    "award": "Award", "win": "Trophy", "achievement": "Trophy", "trophy": "Trophy",
    "leader": "Crown", "premium": "Crown", "best": "Crown",
    "star": "Star", "rating": "Star", "favorite": "Star",
    "heart": "Heart", "love": "Heart", "health": "Heart", "care": "Heart",
    "wellness": "Heart",
    "file": "FileText", "document": "FileText", "report": "FileText",
    "paper": "FileText", "pdf": "FileText", "content": "FileText",
    "layers": "Layers", "stack": "Layers", "architecture": "Layers",
    "structure": "Layers", "platform": "Layers",
    "package": "Package", "product": "Package", "box": "Package",
    "feature": "Boxes", "modules": "Boxes", "components": "Boxes",
    "mobile": "Smartphone", "phone": "Smartphone", "app": "Smartphone",
    "device": "Smartphone", "desktop": "Monitor", "web": "Monitor",
    "eye": "Eye", "vision": "Eye", "visibility": "Eye", "observability": "Eye",
    "monitoring": "Eye",
    "key": "Key", "access": "Key", "auth": "Fingerprint", "identity": "Fingerprint",
    "biometric": "Fingerprint",
    "gift": "Gift", "reward": "Gift", "bonus": "Gift",
    "map": "MapPin", "location": "MapPin", "place": "MapPin",
    "leaf": "Leaf", "green": "Leaf", "sustainability": "Leaf", "eco": "Leaf",
    "environment": "Leaf", "carbon": "Leaf",
    "battery": "Battery", "charge": "Battery", "plug": "Plug",
    "factory": "Factory", "industry": "Factory", "manufacturing": "Factory",
    "truck": "Truck", "logistics": "Truck", "delivery": "Truck", "shipping": "Truck",
    "supply": "Truck",
    "plane": "Plane", "travel": "Plane", "flight": "Plane",
    "car": "Car", "vehicle": "Car", "transport": "Car",
    "recycle": "Recycle",
    "research": "Microscope", "science": "Microscope", "lab": "FlaskConical",
    "experiment": "FlaskConical", "chemistry": "FlaskConical",
    "dna": "Dna", "bio": "Dna", "biotech": "Dna", "genetics": "Dna",
    "medicine": "Pill", "pharma": "Pill", "drug": "Pill", "medical": "Stethoscope",
    "doctor": "Stethoscope", "clinical": "Stethoscope",
    "legal": "Scale", "justice": "Scale", "balance": "Scale", "law": "Gavel",
    "regulation": "Gavel", "policy": "Gavel",
    "education": "GraduationCap", "learn": "GraduationCap", "training": "GraduationCap",
    "student": "GraduationCap", "school": "GraduationCap",
    "book": "BookOpen", "knowledge": "BookOpen", "guide": "BookOpen",
    "puzzle": "Puzzle", "solution": "Puzzle", "fit": "Puzzle",
    "satellite": "Satellite", "space": "Satellite", "iot": "Radar",
    "radar": "Radar", "detection": "Radar", "sensor": "Radar",
    "share": "Share2", "social": "Share2", "viral": "Share2",
    "upload": "Upload", "download": "Download", "sync": "RefreshCw",
    "refresh": "RefreshCw", "update": "RefreshCw", "loop": "Repeat",
    "flag": "Flag", "milestone": "Flag", "phase": "Flag",
    "calendar$": "Calendar", "fire": "Flame", "hot": "Flame", "trending": "Flame",
    "filter": "Filter", "notification": "Bell", "alert": "Bell",
    "camera": "Camera", "photo": "Image", "image": "Image", "video": "Video",
    "audio": "Music", "music": "Music", "voice": "Mic", "mic": "Mic",
    "link": "Link", "url": "Link", "wifi": "Wifi", "internet": "Wifi",
    "compass": "Compass", "direction": "Compass", "strategy": "Compass",
    "infinite": "Infinity", "scalable": "Infinity", "unlimited": "Infinity",
    "tag": "Tag", "label": "Tag", "category": "Tag",
    "briefcase": "Briefcase", "business": "Briefcase", "enterprise": "Building2",
    "company": "Building2", "office": "Building2", "organization": "Building2",
    "cpu": "Cpu", "chip": "Cpu", "compute": "Cpu", "hardware": "Cpu",
    "processor": "Cpu", "gpu": "Cpu",
    "layout": "LayoutGrid", "grid": "LayoutGrid", "organize": "LayoutGrid",
    "tool": "Wrench", "maintenance": "Wrench", "build": "Hammer",
    "git": "GitBranch", "version": "GitBranch", "branch": "GitBranch",
}


def resolve_icon(keyword):
    """Phase-2 resolution: keyword/description -> lucide PascalCase name."""
    if not isinstance(keyword, str) or not keyword.strip():
        return DEFAULT_ICON
    raw = keyword.strip()

    # Already a valid-looking PascalCase lucide name? keep it.
    if raw[0].isupper() and " " not in raw and raw.isalnum():
        return raw

    text = raw.lower().replace("_", " ").replace("-", " ").strip()

    # exact word match
    for word in text.split():
        if word in _KEYWORD_MAP:
            return _KEYWORD_MAP[word]
    # substring match
    for kw, icon in _KEYWORD_MAP.items():
        clean = kw.rstrip("$")
        if clean in text:
            return icon
    return DEFAULT_ICON
