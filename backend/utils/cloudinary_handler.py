import os  
import re
import cloudinary  
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status  
from dotenv import load_dotenv  


load_dotenv()

cloudinary.config(    
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),    
    api_key=os.getenv("CLOUDINARY_API_KEY"),    
    api_secret=os.getenv("CLOUDINARY_API_SECRET") 
)

def upload_user_profile_image(file: UploadFile) -> str:
    if not (file.filename.lower().endswith(".png") or  file.filename.lower().endswith(".jpg") or file.filename.lower().endswith(".jpeg")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Image extension must be png, jpeg, or jpg" )

    try:
        result = cloudinary.uploader.upload(file.file)
        return result.get("secure_url")  
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Failed to upload file")

def upload_organization_picture(file: UploadFile) -> str:
    if not (file.filename.lower().endswith(".png") or  file.filename.lower().endswith(".jpg") or file.filename.lower().endswith(".jpeg")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Image extension must be png, jpeg, or jpg" )

    try:
        result = cloudinary.uploader.upload(file.file)
        return result.get("secure_url")  
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Failed to upload file")


def upload_chat_file_from_base64(file_name: str, file_base64: str, mime_type: str | None = None) -> str:
    if not file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_name is required")

    if not file_base64:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_base64 is required")

    data_uri = file_base64.strip()
    if not data_uri.startswith("data:"):
        safe_mime = mime_type or "application/octet-stream"
        data_uri = f"data:{safe_mime};base64,{data_uri}"

    if not re.match(r"^data:[^;]+;base64,", data_uri):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 file payload")

    try:
        result = cloudinary.uploader.upload(
            data_uri,
            resource_type="auto",
            folder="teamnest/chat_files",
            public_id=f"{os.path.splitext(file_name)[0]}_{os.urandom(4).hex()}",
            overwrite=False,
        )
        secure_url = result.get("secure_url")
        if not secure_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to upload file")
        return secure_url
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to upload file")