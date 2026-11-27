from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Notificacion,
    PerfilProfesional,
    Resena,
    SolicitudServicio,
    TrabajoProfesional,
    Usuario,
)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):

    model = Usuario

    ordering = ('email',)

    list_display = ('email', 'first_name', 'last_name', 'es_trabajador', 'is_staff')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información personal', {'fields': ('first_name', 'last_name', 'telefono')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Tipo de usuario', {'fields': ('es_trabajador',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )


@admin.register(PerfilProfesional)
class PerfilProfesionalAdmin(admin.ModelAdmin):
    list_display = ('oficio', 'categoria', 'ubicacion', 'usuario', 'actualizado')
    list_filter = ('categoria', 'telefono_publico')
    search_fields = ('oficio', 'servicios', 'ubicacion', 'usuario__email')


@admin.register(TrabajoProfesional)
class TrabajoProfesionalAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'perfil', 'creado')
    search_fields = ('titulo', 'perfil__oficio', 'perfil__usuario__email')


@admin.register(SolicitudServicio)
class SolicitudServicioAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'cliente', 'profesional', 'estado', 'fecha_solicitada')
    list_filter = ('estado',)
    search_fields = ('servicio', 'cliente__email', 'profesional__usuario__email')


@admin.register(Resena)
class ResenaAdmin(admin.ModelAdmin):
    list_display = ('solicitud', 'calificacion', 'creado')
    list_filter = ('calificacion',)


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo', 'leida', 'creado')
    list_filter = ('tipo', 'leida')
    search_fields = ('usuario__email', 'mensaje')
