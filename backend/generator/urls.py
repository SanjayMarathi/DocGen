from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    register_user, 
    get_user_info, 
    connection_status,
    generate_documentation, 
    get_history, 
    delete_history, 
    download_pdf, 
    download_docx
)

urlpatterns = [
    # Auth
    path("register/", register_user),
    path("login/", TokenObtainPairView.as_view()),
    path("user/", get_user_info),
    
    # System
    path("status/", connection_status),
    
    # Core
    path("generate/", generate_documentation),
    path("history/", get_history),
    path("history/<int:pk>/delete/", delete_history),
    
    # Downloads
    path("pdf/", download_pdf),
    path("docx/", download_docx),
]
