from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://app:app@db:5432/fa_tickets"
    backend_port: int = 8000
    auth_token: str = ""  # when set, API requires X-Auth-Token header to match

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = ""


settings = Settings()
