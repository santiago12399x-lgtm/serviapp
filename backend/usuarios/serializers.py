from rest_framework import serializers
from .models import Usuario


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