from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import os
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def simple_send(email: str, verification_code: str) -> bool:
    try:
        print(f"Attempting to send email to: {email}")
        print(f"Verification code: {verification_code}")
        
        html = f"""
        <p>Hi 👋 thanks for registering!</p>
        <p>Your verification code is: <b>{verification_code}</b></p>
        """

        message = MessageSchema(
            subject="Verify your account",
            recipients=[email],   
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        print(f"Email sent successfully to: {email}")
        return True
        
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        raise e

async def send_password_reset_code(email: str, verification_code: str) -> bool:
    try:
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

        message = MessageSchema(
            subject="Reset Your Password",
            recipients=[email],   
            body=html,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        return True
        
    except Exception as e:
        print(f"Password reset email sending failed: {str(e)}")
        raise e