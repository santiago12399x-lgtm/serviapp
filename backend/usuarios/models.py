from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models


VALIDAR_FOTO = FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])


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
    latitud = models.DecimalField(max_digits=8, decimal_places=5, null=True, blank=True)
    longitud = models.DecimalField(max_digits=8, decimal_places=5, null=True, blank=True)
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
    foto_perfil = models.ImageField(
        upload_to='perfiles/',
        blank=True,
        null=True,
        validators=[VALIDAR_FOTO],
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['usuario__first_name', 'usuario__last_name', 'id']

    def __str__(self):
        return f'{self.oficio} - {self.usuario.email}'


class TrabajoProfesional(models.Model):
    perfil = models.ForeignKey(
        PerfilProfesional,
        on_delete=models.CASCADE,
        related_name='trabajos',
    )
    titulo = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=400, blank=True)
    foto = models.ImageField(upload_to='trabajos/', validators=[VALIDAR_FOTO])
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'{self.titulo} - {self.perfil.oficio}'


class SolicitudServicio(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        ACEPTADA = 'aceptada', 'Aceptada'
        RECHAZADA = 'rechazada', 'Rechazada'
        COMPLETADA = 'completada', 'Completada'
        CANCELADA = 'cancelada', 'Cancelada'

    cliente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='solicitudes_enviadas',
    )
    profesional = models.ForeignKey(
        PerfilProfesional,
        on_delete=models.CASCADE,
        related_name='solicitudes_recibidas',
    )
    servicio = models.CharField(max_length=120)
    descripcion = models.TextField(max_length=2000)
    ubicacion = models.CharField(max_length=180)
    fecha_solicitada = models.DateTimeField()
    estado = models.CharField(
        max_length=12,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'{self.servicio} ({self.get_estado_display()})'


class Resena(models.Model):
    solicitud = models.OneToOneField(
        SolicitudServicio,
        on_delete=models.CASCADE,
        related_name='resena',
    )
    calificacion = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comentario = models.TextField(max_length=1000, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'{self.calificacion}/5 - {self.solicitud.servicio}'


class Notificacion(models.Model):
    class Tipo(models.TextChoices):
        NUEVA_SOLICITUD = 'nueva_solicitud', 'Nueva solicitud'
        SOLICITUD_ACEPTADA = 'solicitud_aceptada', 'Solicitud aceptada'
        SOLICITUD_RECHAZADA = 'solicitud_rechazada', 'Solicitud rechazada'
        SOLICITUD_COMPLETADA = 'solicitud_completada', 'Solicitud completada'
        SOLICITUD_CANCELADA = 'solicitud_cancelada', 'Solicitud cancelada'
        NUEVA_RESENA = 'nueva_resena', 'Nueva reseña'

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones',
    )
    solicitud = models.ForeignKey(
        SolicitudServicio,
        on_delete=models.SET_NULL,
        related_name='notificaciones',
        blank=True,
        null=True,
    )
    tipo = models.CharField(max_length=24, choices=Tipo.choices)
    mensaje = models.CharField(max_length=240)
    leida = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'{self.usuario.email}: {self.mensaje}'
