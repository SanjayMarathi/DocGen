from django.urls import path
from .views import register, login_user, logout_user, profile

urlpatterns = [
    path("register/", register),
    path("login/", login_user),
    path("logout/", logout_user),
    path("profile/", profile),
]
