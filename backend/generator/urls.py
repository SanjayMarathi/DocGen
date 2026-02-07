from django.urls import path
from .views import generate_documentation, download_pdf, connection_status
from .auth_views import register, login

urlpatterns = [
    path("generate/", generate_documentation),
    path("pdf/", download_pdf),
    path("status/", connection_status),

    # authentication
    path("auth/register/", register),
    path("auth/login/", login),
]
