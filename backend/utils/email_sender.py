import logging
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
MAIL_FROM = os.getenv("MAIL_FROM", "onboarding@resend.dev")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "TeamNest")


async def _send(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY is not set")
        raise RuntimeError("RESEND_API_KEY is not set")

    payload = {
        "from": f"{MAIL_FROM_NAME} <{MAIL_FROM}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(RESEND_API_URL, json=payload, headers=headers)

    if resp.status_code >= 400:
        logger.error("Resend API error: %s %s", resp.status_code, resp.text)
        resp.raise_for_status()
    return True


async def simple_send(email: str, verification_code: str) -> bool:
    html = f"""
    <p>Hi 👋 thanks for registering!</p>
    <p>Your verification code is: <b>{verification_code}</b></p>
    """
    return await _send(email, "Verify your account", html)


async def send_password_reset_code(email: str, verification_code: str) -> bool:
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E7FD8;">Password Reset Request</h2>
        <p>Hi 👋</p>
        <p>We received a request to reset your password. Use the verification code below to reset your password:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2E7FD8; letter-spacing: 8px; margin: 0;">{verification_code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message, please do not reply.
        </p>
    </div>
    """
    return await _send(email, "Reset Your Password", html)
