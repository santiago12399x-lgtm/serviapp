from django.urls import path
from .views import (
    DetalleProfesionalPublicoView,
    ListaProfesionalesView,
    LoginView,
    MiPerfilProfesionalView,
    PerfilUsuarioView,
    RegistroUsuarioView,
)
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro'),

    path('token/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilUsuarioView.as_view(), name='perfil'),
    path('perfil-profesional/', MiPerfilProfesionalView.as_view(), name='mi-perfil-profesional'),
    path('profesionales/', ListaProfesionalesView.as_view(), name='lista-profesionales'),
    path('profesionales/<int:pk>/', DetalleProfesionalPublicoView.as_view(), name='detalle-profesional'),
]
