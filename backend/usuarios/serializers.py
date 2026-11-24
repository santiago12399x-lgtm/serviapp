from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import PerfilProfesional, Usuario


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
            'disponibilidad',
            'tarifa_desde',
            'telefono_publico',
            'creado',
            'actualizado',
        ]
        read_only_fields = ['id', 'creado', 'actualizado']


class PerfilProfesionalPublicoSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()
    categoria_nombre = serializers.CharField(source='get_categoria_display', read_only=True)

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
            'disponibilidad',
            'tarifa_desde',
            'telefono',
        ]

    def get_nombre(self, obj):
        nombre = f'{obj.usuario.first_name} {obj.usuario.last_name}'.strip()
        return nombre or 'Profesional ServiApp'

    def get_telefono(self, obj):
        if not obj.telefono_publico:
            return ''
        return obj.usuario.telefono
