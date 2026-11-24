from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import PerfilProfesional, Usuario
from .serializers import (
    LoginTokenObtainPairSerializer,
    PerfilProfesionalPublicoSerializer,
    PerfilProfesionalSerializer,
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


class MiPerfilProfesionalView(APIView):
    permission_classes = [IsAuthenticated]

    def _validar_profesional(self, request):
        if not request.user.es_trabajador:
            raise PermissionDenied('Esta función es solo para cuentas profesionales.')

    def get(self, request):
        self._validar_profesional(request)
        perfil = get_object_or_404(PerfilProfesional, usuario=request.user)
        return Response(PerfilProfesionalSerializer(perfil).data)

    def post(self, request):
        self._validar_profesional(request)
        if PerfilProfesional.objects.filter(usuario=request.user).exists():
            return Response(
                {'detail': 'Ya existe un perfil profesional para esta cuenta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PerfilProfesionalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perfil = serializer.save(usuario=request.user)
        return Response(
            PerfilProfesionalSerializer(perfil).data,
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        return self._actualizar(request, partial=False)

    def patch(self, request):
        return self._actualizar(request, partial=True)

    def _actualizar(self, request, partial):
        self._validar_profesional(request)
        perfil = get_object_or_404(PerfilProfesional, usuario=request.user)
        serializer = PerfilProfesionalSerializer(
            perfil,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        perfil = serializer.save()
        return Response(PerfilProfesionalSerializer(perfil).data)


class ListaProfesionalesView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PerfilProfesionalPublicoSerializer

    def get_queryset(self):
        queryset = PerfilProfesional.objects.select_related('usuario').filter(
            usuario__es_trabajador=True,
        )
        categoria = self.request.query_params.get('categoria', '').strip()
        ubicacion = self.request.query_params.get('ubicacion', '').strip()
        busqueda = self.request.query_params.get('q', '').strip()

        if categoria and categoria != 'all':
            queryset = queryset.filter(categoria=categoria)
        if ubicacion:
            queryset = queryset.filter(ubicacion__icontains=ubicacion)
        if busqueda:
            queryset = queryset.filter(
                Q(oficio__icontains=busqueda)
                | Q(servicios__icontains=busqueda)
                | Q(descripcion__icontains=busqueda)
                | Q(ubicacion__icontains=busqueda)
                | Q(usuario__first_name__icontains=busqueda)
                | Q(usuario__last_name__icontains=busqueda)
            )
        return queryset


class DetalleProfesionalPublicoView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PerfilProfesionalPublicoSerializer
    queryset = PerfilProfesional.objects.select_related('usuario').filter(
        usuario__es_trabajador=True,
    )
