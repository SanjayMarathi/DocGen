from django.urls import path
from .views import generate_documentation, download_pdf

urlpatterns = [
    path("generate/", generate_documentation),
    path("pdf/", download_pdf),
]
