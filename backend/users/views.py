from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from .serializers import RegisterSerializer
# Create your views here.

@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "User created"})
    return Response(serializer.errors, status=400)


@api_view(["POST"])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)
        return Response({"message": "Logged in"})
    return Response({"error": "Invalid credentials"}, status=401)


@api_view(["POST"])
def logout_user(request):
    logout(request)
    return Response({"message": "Logged out"})


@api_view(["GET"])
def profile(request):
    if request.user.is_authenticated:
        return Response({
            "username": request.user.username,
            "email": request.user.email
        })
    return Response({"error": "Not logged in"}, status=401)
