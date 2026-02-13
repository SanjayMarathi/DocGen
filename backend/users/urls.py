from django.urls import path
from .views import register, login_user, logout_user, profile,login_view
from rest_framework_simplejwt.views import TokenRefreshView
urlpatterns = [
    path("register/", register),
    path("login/", login_user),
    path("logout/", logout_user),
    path("profile/", profile),
    path("api/login/", login_view),
    path("api/token/refresh/", TokenRefreshView.as_view()),
]
