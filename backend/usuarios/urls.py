from django.urls import path
from .views import LoginView, PerfilUsuarioView, RegistroUsuarioView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('registro/', RegistroUsuarioView.as_view(), name='registro'),

    path('token/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilUsuarioView.as_view(), name='perfil'),
]
