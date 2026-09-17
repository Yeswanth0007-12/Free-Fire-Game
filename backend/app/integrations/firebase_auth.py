import logging
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app_initialized = False


def get_firebase_app():
    global _firebase_app_initialized
    if not _firebase_app_initialized:
        try:
            if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
                # Private key might contain escaped newlines
                private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
                cred_dict = {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key": private_key,
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_app_initialized = True
                logger.info("Firebase Admin initialized with provided service account credentials.")
            elif settings.FIREBASE_PROJECT_ID:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
                _firebase_app_initialized = True
                logger.info("Firebase Admin initialized with Application Default Credentials.")
        except Exception as e:
            logger.warning(f"Firebase Admin initialization deferred or failed: {e}. Fallback enabled: {settings.FIREBASE_AUTH_MOCK}")
            _firebase_app_initialized = False
    return firebase_admin


def verify_firebase_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies Firebase ID token from mobile client (Google or Facebook federated auth).
    Returns decoded token dictionary with uid, email, name, picture, and sign_in_provider.
    """
    if not id_token:
        return None

    # Development & test mock token handling
    if settings.FIREBASE_AUTH_MOCK and (id_token.startswith("mock_") or id_token.startswith("test_") or settings.APP_ENV == "development"):
        if id_token.startswith("mock_") or id_token.startswith("test_"):
            parts = id_token.split(":")
            provider = parts[1] if len(parts) > 1 else "google.com"
            email = parts[2] if len(parts) > 2 else f"player_{id_token}@igniteff.test"
            name = parts[3] if len(parts) > 3 else "Ignite Player"
            return {
                "uid": f"fb_uid_{id_token}",
                "email": email,
                "name": name,
                "picture": "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150",
                "firebase": {
                    "sign_in_provider": provider
                },
                "email_verified": True
            }

    # Authoritative verification via Firebase Admin SDK
    try:
        get_firebase_app()
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        # If in debug mode with mock enabled, allow structured mock
        if settings.DEBUG and settings.FIREBASE_AUTH_MOCK:
            logger.warning("Falling back to dev token simulation under debug mode.")
            return {
                "uid": f"dev_uid_{abs(hash(id_token)) % 1000000}",
                "email": "devplayer@igniteff.com",
                "name": "Dev Esports Player",
                "picture": None,
                "firebase": {
                    "sign_in_provider": "google.com"
                },
                "email_verified": True
            }
        return None
