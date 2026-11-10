from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario
from .serializers import (
    LoginTokenObtainPairSerializer,
    RegistroUsuarioSerializer,
    UsuarioSerializer,
)


class RegistroUsuarioView(generics.CreateAPIView):

    queryset = Usuario.objects.all()
    serializer_class = RegistroUsuarioSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenObtainPairSerializer


class PerfilUsuarioView(generics.RetrieveAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
