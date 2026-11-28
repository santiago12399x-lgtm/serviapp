from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import (
    Notificacion,
    PuntuacionArcade,
    PerfilProfesional,
    Resena,
    SolicitudServicio,
    TrabajoProfesional,
    Usuario,
)


class PuntuacionArcadeSerializer(serializers.ModelSerializer):
    puntuacion = serializers.IntegerField(min_value=0, max_value=100000)
    servicios_completados = serializers.IntegerField(min_value=0, max_value=50)
    duracion_segundos = serializers.IntegerField(min_value=1, max_value=180)

    class Meta:
        model = PuntuacionArcade
        fields = ['puntuacion', 'servicios_completados', 'duracion_segundos', 'modo']

    def validate(self, attrs):
        puntaje_maximo_razonable = attrs['servicios_completados'] * 2500 + 250
        if attrs['puntuacion'] > puntaje_maximo_razonable:
            raise serializers.ValidationError({
                'puntuacion': 'El puntaje no coincide con la cantidad de servicios reportada.'
            })
        return attrs


class RegistroUsuarioSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'email',
            'password',
            'first_name',
            'last_name',
            'telefono',
            'es_trabajador'
        ]

    def create(self, validated_data):
        return Usuario.objects.create_user(**validated_data)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'email', 'first_name', 'last_name', 'telefono', 'es_trabajador']


class LoginTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = UsuarioSerializer(self.user).data
        return data


class PerfilProfesionalSerializer(serializers.ModelSerializer):
    tarifa_desde = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        required=False,
        allow_null=True,
    )
    latitud = serializers.DecimalField(
        max_digits=8,
        decimal_places=5,
        min_value=-90,
        max_value=90,
        required=False,
        allow_null=True,
    )
    longitud = serializers.DecimalField(
        max_digits=8,
        decimal_places=5,
        min_value=-180,
        max_value=180,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PerfilProfesional
        fields = [
            'id',
            'categoria',
            'oficio',
            'servicios',
            'descripcion',
            'experiencia_anios',
            'ubicacion',
            'latitud',
            'longitud',
            'disponibilidad',
            'tarifa_desde',
            'telefono_publico',
            'foto_perfil',
            'creado',
            'actualizado',
        ]
        read_only_fields = ['id', 'creado', 'actualizado']

    def to_internal_value(self, data):
        # The profile form submits blank hidden inputs when the user removes
        # their map location. Normalize them to null before DecimalField parses.
        data = data.copy()
        for campo in ('latitud', 'longitud'):
            if data.get(campo) == '':
                data[campo] = None
        return super().to_internal_value(data)

    def validate_foto_perfil(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('La foto no puede superar 5 MB.')
        return value

    def validate(self, attrs):
        latitud = attrs.get('latitud', getattr(self.instance, 'latitud', None))
        longitud = attrs.get('longitud', getattr(self.instance, 'longitud', None))
        if (latitud is None) != (longitud is None):
            raise serializers.ValidationError('Selecciona ambas coordenadas de la ubicación aproximada.')
        for campo in ('latitud', 'longitud'):
            if attrs.get(campo) is not None:
                attrs[campo] = attrs[campo].quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return attrs


class TrabajoProfesionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrabajoProfesional
        fields = ['id', 'titulo', 'descripcion', 'foto', 'creado']
        read_only_fields = ['id', 'creado']

    def validate_foto(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('La foto no puede superar 5 MB.')
        return value


class ResenaPublicaSerializer(serializers.ModelSerializer):
    cliente = serializers.SerializerMethodField()

    class Meta:
        model = Resena
        fields = ['id', 'cliente', 'calificacion', 'comentario', 'creado']

    def get_cliente(self, obj):
        nombre = f'{obj.solicitud.cliente.first_name} {obj.solicitud.cliente.last_name}'.strip()
        return nombre or 'Cliente ServiApp'


class SolicitudServicioSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()
    profesional_nombre = serializers.SerializerMethodField()
    estado_nombre = serializers.CharField(source='get_estado_display', read_only=True)
    resena_publicada = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudServicio
        fields = [
            'id', 'cliente_nombre', 'profesional', 'profesional_nombre',
            'servicio', 'descripcion', 'ubicacion', 'fecha_solicitada',
            'estado', 'estado_nombre', 'creado', 'actualizado',
            'resena_publicada',
        ]
        read_only_fields = [
            'id', 'cliente_nombre', 'profesional_nombre', 'estado',
            'estado_nombre', 'creado', 'actualizado',
        ]

    def get_cliente_nombre(self, obj):
        nombre = f'{obj.cliente.first_name} {obj.cliente.last_name}'.strip()
        return nombre or 'Cliente ServiApp'

    def get_profesional_nombre(self, obj):
        nombre = f'{obj.profesional.usuario.first_name} {obj.profesional.usuario.last_name}'.strip()
        return nombre or 'Profesional ServiApp'

    def get_resena_publicada(self, obj):
        return Resena.objects.filter(solicitud=obj).exists()

    def validate_fecha_solicitada(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('Elige una fecha y hora futuras.')
        return value


class CrearResenaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resena
        fields = ['id', 'solicitud', 'calificacion', 'comentario', 'creado']
        read_only_fields = ['id', 'creado']

    def validate_calificacion(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('La calificación debe estar entre 1 y 5 estrellas.')
        return value


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'mensaje', 'solicitud', 'leida', 'creado']
        read_only_fields = fields


class PerfilProfesionalPublicoSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()
    categoria_nombre = serializers.CharField(source='get_categoria_display', read_only=True)
    resenas = serializers.SerializerMethodField()
    trabajos = TrabajoProfesionalSerializer(many=True, read_only=True)
    promedio_calificacion = serializers.SerializerMethodField()
    cantidad_resenas = serializers.SerializerMethodField()

    class Meta:
        model = PerfilProfesional
        fields = [
            'id',
            'nombre',
            'categoria',
            'categoria_nombre',
            'oficio',
            'servicios',
            'descripcion',
            'experiencia_anios',
            'ubicacion',
            'latitud',
            'longitud',
            'disponibilidad',
            'tarifa_desde',
            'telefono',
            'foto_perfil',
            'trabajos',
            'resenas',
            'promedio_calificacion',
            'cantidad_resenas',
        ]

    def get_nombre(self, obj):
        nombre = f'{obj.usuario.first_name} {obj.usuario.last_name}'.strip()
        return nombre or 'Profesional ServiApp'

    def get_telefono(self, obj):
        if not obj.telefono_publico:
            return ''
        return obj.usuario.telefono

    def _resenas_queryset(self, obj):
        return Resena.objects.filter(
            solicitud__profesional=obj,
            solicitud__estado=SolicitudServicio.Estado.COMPLETADA,
        ).select_related('solicitud__cliente').order_by('-creado')

    def get_resenas(self, obj):
        return ResenaPublicaSerializer(
            self._resenas_queryset(obj)[:10],
            many=True,
            context=self.context,
        ).data

    def get_promedio_calificacion(self, obj):
        from django.db.models import Avg
        promedio = self._resenas_queryset(obj).aggregate(promedio=Avg('calificacion'))['promedio']
        return round(promedio, 1) if promedio is not None else None

    def get_cantidad_resenas(self, obj):
        return self._resenas_queryset(obj).count()
