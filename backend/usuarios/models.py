from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UsuarioManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El correo es obligatorio')

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractUser):

    username = None

    email = models.EmailField(unique=True)

    telefono = models.CharField(max_length=15, blank=True)

    es_trabajador = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'

    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UsuarioManager()


class PerfilProfesional(models.Model):
    CATEGORIAS = [
        ('hogar', 'Hogar'),
        ('limpieza', 'Limpieza'),
        ('tecnologia', 'Tecnología'),
        ('belleza', 'Belleza'),
        ('automovil', 'Automóvil'),
        ('educacion', 'Educación'),
        ('otros', 'Otros'),
    ]

    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name='perfil_profesional',
    )
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    oficio = models.CharField(max_length=100)
    servicios = models.TextField(help_text='Describe los servicios que ofreces.')
    descripcion = models.TextField()
    experiencia_anios = models.PositiveSmallIntegerField(default=0)
    ubicacion = models.CharField(max_length=120)
    disponibilidad = models.CharField(max_length=180)
    tarifa_desde = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    telefono_publico = models.BooleanField(
        default=False,
        help_text='Permite mostrar al público el teléfono de la cuenta.',
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['usuario__first_name', 'usuario__last_name', 'id']

    def __str__(self):
        return f'{self.oficio} - {self.usuario.email}'
