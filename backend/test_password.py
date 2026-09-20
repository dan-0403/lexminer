from app.core.jwt import JWTManager

payload = {
    "user_id": 1,
    "email": "admin@legalai.com",
    "role": "admin",
}

access = JWTManager.create_access_token(
    payload
)

refresh = JWTManager.create_refresh_token(
    payload
)

print("Access Token:")
print(access)

print()

print("Refresh Token:")
print(refresh)

print()

decoded = JWTManager.verify_access_token(
    access
)

print(decoded)