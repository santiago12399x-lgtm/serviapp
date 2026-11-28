from django.urls import path
from .views import (
    CambiarSolicitudServicioView,
    ClasificacionArcadeView,
    CrearResenaView,
    DetalleProfesionalPublicoView,
    EliminarTrabajoView,
    ListaProfesionalesView,
    LoginView,
    MarcarNotificacionLeidaView,
    MiPerfilProfesionalView,
    MisTrabajosView,
    NotificacionesView,
    PerfilUsuarioView,
    PuntuacionesArcadeView,
    PreferenciasNotificacionesView,
    RegistroUsuarioView,
    SolicitudesServicioView,
    TrabajosProfesionalPublicosView,
)
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('arcade/puntuaciones/', PuntuacionesArcadeView.as_view(), name='puntuaciones-arcade'),
    path('arcade/clasificacion/', ClasificacionArcadeView.as_view(), name='clasificacion-arcade'),
    path('registro/', RegistroUsuarioView.as_view(), name='registro'),

    path('token/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilUsuarioView.as_view(), name='perfil'),
    path('perfil-profesional/', MiPerfilProfesionalView.as_view(), name='mi-perfil-profesional'),
    path('profesionales/', ListaProfesionalesView.as_view(), name='lista-profesionales'),
    path('profesionales/<int:pk>/', DetalleProfesionalPublicoView.as_view(), name='detalle-profesional'),
    path('profesionales/<int:perfil_id>/trabajos/', TrabajosProfesionalPublicosView.as_view(), name='trabajos-profesional-publicos'),
    path('perfil-profesional/trabajos/', MisTrabajosView.as_view(), name='mis-trabajos-profesionales'),
    path('perfil-profesional/trabajos/<int:pk>/', EliminarTrabajoView.as_view(), name='eliminar-trabajo-profesional'),
    path('solicitudes/', SolicitudesServicioView.as_view(), name='solicitudes-servicio'),
    path('solicitudes/<int:pk>/', CambiarSolicitudServicioView.as_view(), name='cambiar-solicitud-servicio'),
    path('resenas/', CrearResenaView.as_view(), name='crear-resena'),
    path('notificaciones/', NotificacionesView.as_view(), name='notificaciones'),
    path('notificaciones/preferencias/', PreferenciasNotificacionesView.as_view(), name='preferencias-notificaciones'),
    path('notificaciones/<int:pk>/', MarcarNotificacionLeidaView.as_view(), name='marcar-notificacion-leida'),
]
