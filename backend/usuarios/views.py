from rest_framework import generics
from .models import Usuario
from .serializers import RegistroUsuarioSerializer


class RegistroUsuarioView(generics.CreateAPIView):

    queryset = Usuario.objects.all()
    serializer_class = RegistroUsuarioSerializer