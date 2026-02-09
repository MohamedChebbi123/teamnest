from dotenv import load_dotenv
import httpx
import os
from fastapi import HTTPException


async def verify_recaptcha(token: str):
    load_dotenv()

    secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
    
    if not secret_key:
        raise HTTPException(
            status_code=500, 
            detail="reCAPTCHA secret key not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": secret_key,
                    "response": token
                },
                timeout=10.0
            )
            
            result = response.json()        
            if not result.get("success"):
                error_codes = result.get('error-codes', [])
                raise HTTPException(
                    status_code=400, 
                    detail=f"reCAPTCHA verification failed: {', '.join(error_codes) if error_codes else 'Please try again.'}"
                )
            return result
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=500, 
            detail="reCAPTCHA verification timeout. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"reCAPTCHA verification error: {str(e)}"
        )
