from google.auth.transport import requests
from google.oauth2 import id_token

from fastapi import HTTPException

from app.core.config import settings


class GoogleAuthService:

    @staticmethod
    def verify_google_token(
        credential: str,
    ):

        try:

            user_info = id_token.verify_oauth2_token(

                credential,

                requests.Request(),

                settings.GOOGLE_CLIENT_ID,

            )

            if user_info["aud"] != settings.GOOGLE_CLIENT_ID:

                raise HTTPException(

                    status_code=401,

                    detail="Invalid audience."

                )

            if user_info["iss"] not in [

                "accounts.google.com",

                "https://accounts.google.com",

            ]:

                raise HTTPException(

                    status_code=401,

                    detail="Invalid issuer."

                )

            if not user_info.get("email_verified"):

                raise HTTPException(

                    status_code=401,

                    detail="Google email is not verified."

                )

            return {

                "google_id": user_info["sub"],

                "email": user_info["email"],

                "first_name": user_info.get("given_name"),

                "last_name": user_info.get("family_name"),

                "full_name": user_info["name"],

                "profile_picture": user_info.get("picture"),

            }

        except Exception:

            raise HTTPException(

                status_code=401,

                detail="Invalid Google token."

            )