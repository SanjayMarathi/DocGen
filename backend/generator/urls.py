from django.urls import path
from .views import generate_documentation, download_pdf, connection_status

urlpatterns = [
    path("generate/", generate_documentation),
    path("pdf/", download_pdf),
    path("status/", connection_status),
]
