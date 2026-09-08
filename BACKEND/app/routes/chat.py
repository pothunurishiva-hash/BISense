from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import generate_ai_response
from app.services.agent_service import build_agent_plan


router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    language: str = "English"


@router.post("")
def chat(request: ChatRequest):
    message = request.message.strip()

    if not message:
        return {
            "answer": "Please enter a question.",
            "language": request.language,
            "agent": {
                "intent": "general",
                "confidence": 0.0,
                "plan": [],
            },
            "source": {
                "standard": "",
                "title": "",
                "source_name": "",
                "source_url": "",
            },
        }

    agent_plan = build_agent_plan(message)

    ai_result = generate_ai_response(
        message=message,
        language=request.language,
    )

    return {
        "answer": ai_result.get("answer", ""),
        "language": ai_result.get("language", request.language),
        "source": ai_result.get(
            "source",
            {
                "standard": "",
                "title": "",
                "source_name": "",
                "source_url": "",
            },
        ),
        "agent": agent_plan,
    }