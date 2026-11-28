from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db.models import Max
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import (
    Notificacion,
    PuntuacionArcade,
    PerfilProfesional,
    Resena,
    SolicitudServicio,
    TrabajoProfesional,
    Usuario,
)
from .serializers import (
    CrearResenaSerializer,
    LoginTokenObtainPairSerializer,
    NotificacionSerializer,
    PuntuacionArcadeSerializer,
    PerfilProfesionalPublicoSerializer,
    PerfilProfesionalSerializer,
    RegistroUsuarioSerializer,
    SolicitudServicioSerializer,
    TrabajoProfesionalSerializer,
    UsuarioSerializer,
)


class PuntuacionesArcadeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'arcade_score'

    def post(self, request):
        serializer = PuntuacionArcadeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        puntuacion = serializer.save(usuario=request.user)
        return Response(
            {
                'id': puntuacion.id,
                'puntuacion': puntuacion.puntuacion,
                'modo': puntuacion.modo,
                'creado': puntuacion.creado,
            },
            status=status.HTTP_201_CREATED,
        )


class ClasificacionArcadeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        modo = request.query_params.get('modo', PuntuacionArcade.Modo.NORMAL)
        if modo not in PuntuacionArcade.Modo.values:
            return Response(
                {'modo': 'Usa "normal" o "diario".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        desde = timezone.now() - timedelta(days=7)
        mejores = (
            PuntuacionArcade.objects
            .filter(modo=modo, creado__gte=desde)
            .values('usuario_id', 'usuario__first_name')
            .annotate(mejor_puntaje=Max('puntuacion'))
            .order_by('-mejor_puntaje', 'usuario_id')[:10]
        )
        resultados = [
            {
                'puesto': puesto,
                'nombre': fila['usuario__first_name'] or 'Jugador ServiApp',
                'puntuacion': fila['mejor_puntaje'],
            }
            for puesto, fila in enumerate(mejores, start=1)
        ]
        return Response({'modo': modo, 'clasificacion': resultados})


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


class TrabajosProfesionalPublicosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = TrabajoProfesionalSerializer

    def get_queryset(self):
        perfil = get_object_or_404(
            PerfilProfesional,
            pk=self.kwargs['perfil_id'],
            usuario__es_trabajador=True,
        )
        return TrabajoProfesional.objects.filter(perfil=perfil)


class MisTrabajosView(APIView):
    permission_classes = [IsAuthenticated]

    def _perfil(self, request):
        if not request.user.es_trabajador:
            raise PermissionDenied('Solo una cuenta profesional puede administrar sus trabajos.')
        return get_object_or_404(PerfilProfesional, usuario=request.user)

    def get(self, request):
        perfil = self._perfil(request)
        trabajos = TrabajoProfesional.objects.filter(perfil=perfil)
        return Response(TrabajoProfesionalSerializer(trabajos, many=True, context={'request': request}).data)

    def post(self, request):
        perfil = self._perfil(request)
        serializer = TrabajoProfesionalSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        trabajo = serializer.save(perfil=perfil)
        return Response(
            TrabajoProfesionalSerializer(trabajo, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class EliminarTrabajoView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not request.user.es_trabajador:
            raise PermissionDenied('Solo una cuenta profesional puede administrar sus trabajos.')
        trabajo = get_object_or_404(TrabajoProfesional, pk=pk, perfil__usuario=request.user)
        trabajo.foto.delete(save=False)
        trabajo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SolicitudesServicioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.es_trabajador:
            perfil = PerfilProfesional.objects.filter(usuario=request.user).first()
            solicitudes = SolicitudServicio.objects.none() if not perfil else SolicitudServicio.objects.filter(profesional=perfil)
        else:
            solicitudes = SolicitudServicio.objects.filter(cliente=request.user)
        solicitudes = solicitudes.select_related('cliente', 'profesional__usuario')
        return Response(SolicitudServicioSerializer(solicitudes, many=True).data)

    def post(self, request):
        if request.user.es_trabajador:
            raise PermissionDenied('Las solicitudes solo pueden crearse desde una cuenta de cliente.')
        serializer = SolicitudServicioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perfil = serializer.validated_data['profesional']
        if perfil.usuario_id == request.user.id:
            raise PermissionDenied('No puedes solicitar un servicio a tu propia cuenta.')
        with transaction.atomic():
            solicitud = serializer.save(cliente=request.user)
            nombre = f'{request.user.first_name} {request.user.last_name}'.strip() or 'Un cliente'
            Notificacion.objects.create(
                usuario=perfil.usuario,
                solicitud=solicitud,
                tipo=Notificacion.Tipo.NUEVA_SOLICITUD,
                mensaje=f'{nombre} solicitó: {solicitud.servicio}.',
            )
        return Response(
            SolicitudServicioSerializer(solicitud).data,
            status=status.HTTP_201_CREATED,
        )


class CambiarSolicitudServicioView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        solicitud = get_object_or_404(
            SolicitudServicio.objects.select_related('cliente', 'profesional__usuario'),
            pk=pk,
        )
        nuevo_estado = request.data.get('estado')
        if request.user.id == solicitud.profesional.usuario_id:
            transiciones = {
                SolicitudServicio.Estado.PENDIENTE: {
                    SolicitudServicio.Estado.ACEPTADA,
                    SolicitudServicio.Estado.RECHAZADA,
                },
                SolicitudServicio.Estado.ACEPTADA: {SolicitudServicio.Estado.COMPLETADA},
            }
            destinatario = solicitud.cliente
        elif request.user.id == solicitud.cliente_id:
            transiciones = {
                SolicitudServicio.Estado.PENDIENTE: {SolicitudServicio.Estado.CANCELADA},
                SolicitudServicio.Estado.ACEPTADA: {SolicitudServicio.Estado.CANCELADA},
            }
            destinatario = solicitud.profesional.usuario
        else:
            raise PermissionDenied('No puedes modificar esta solicitud.')

        permitidos = transiciones.get(solicitud.estado, set())
        if nuevo_estado not in permitidos:
            return Response(
                {'detail': 'Ese cambio de estado no está permitido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        solicitud.estado = nuevo_estado
        solicitud.save(update_fields=['estado', 'actualizado'])
        tipos = {
            SolicitudServicio.Estado.ACEPTADA: Notificacion.Tipo.SOLICITUD_ACEPTADA,
            SolicitudServicio.Estado.RECHAZADA: Notificacion.Tipo.SOLICITUD_RECHAZADA,
            SolicitudServicio.Estado.COMPLETADA: Notificacion.Tipo.SOLICITUD_COMPLETADA,
            SolicitudServicio.Estado.CANCELADA: Notificacion.Tipo.SOLICITUD_CANCELADA,
        }
        Notificacion.objects.create(
            usuario=destinatario,
            solicitud=solicitud,
            tipo=tipos[nuevo_estado],
            mensaje=f'La solicitud "{solicitud.servicio}" ahora está {solicitud.get_estado_display().lower()}.',
        )
        return Response(SolicitudServicioSerializer(solicitud).data)


class CrearResenaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.es_trabajador:
            raise PermissionDenied('Solo los clientes pueden dejar reseñas.')
        serializer = CrearResenaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud = serializer.validated_data['solicitud']
        if solicitud.cliente_id != request.user.id:
            raise PermissionDenied('Solo puedes reseñar tus propias solicitudes.')
        if solicitud.estado != SolicitudServicio.Estado.COMPLETADA:
            return Response(
                {'detail': 'Solo puedes reseñar una solicitud completada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            resena = serializer.save()
            nombre = f'{request.user.first_name} {request.user.last_name}'.strip() or 'Un cliente'
            Notificacion.objects.create(
                usuario=solicitud.profesional.usuario,
                solicitud=solicitud,
                tipo=Notificacion.Tipo.NUEVA_RESENA,
                mensaje=f'{nombre} dejó una reseña sobre {solicitud.servicio}.',
            )
        return Response(
            CrearResenaSerializer(resena).data,
            status=status.HTTP_201_CREATED,
        )


class NotificacionesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notificaciones = Notificacion.objects.filter(usuario=request.user)
        return Response(NotificacionSerializer(notificaciones, many=True).data)

    def post(self, request):
        Notificacion.objects.filter(usuario=request.user, leida=False).update(leida=True)
        return Response({'detail': 'Notificaciones marcadas como leídas.'})


class MarcarNotificacionLeidaView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notificacion = get_object_or_404(Notificacion, pk=pk, usuario=request.user)
        notificacion.leida = True
        notificacion.save(update_fields=['leida'])
        return Response(NotificacionSerializer(notificacion).data)
