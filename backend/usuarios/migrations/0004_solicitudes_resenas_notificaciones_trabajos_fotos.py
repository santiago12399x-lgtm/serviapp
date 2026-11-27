from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0003_alter_usuario_managers'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilprofesional',
            name='foto_perfil',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='perfiles/',
                validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])],
            ),
        ),
        migrations.CreateModel(
            name='TrabajoProfesional',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=100)),
                ('descripcion', models.CharField(blank=True, max_length=400)),
                ('foto', models.ImageField(upload_to='trabajos/', validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])])),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('perfil', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trabajos', to='usuarios.perfilprofesional')),
            ],
            options={'ordering': ['-creado', '-id']},
        ),
        migrations.CreateModel(
            name='SolicitudServicio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('servicio', models.CharField(max_length=120)),
                ('descripcion', models.TextField(max_length=2000)),
                ('ubicacion', models.CharField(max_length=180)),
                ('fecha_solicitada', models.DateTimeField()),
                ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('aceptada', 'Aceptada'), ('rechazada', 'Rechazada'), ('completada', 'Completada'), ('cancelada', 'Cancelada')], default='pendiente', max_length=12)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('actualizado', models.DateTimeField(auto_now=True)),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='solicitudes_enviadas', to=settings.AUTH_USER_MODEL)),
                ('profesional', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='solicitudes_recibidas', to='usuarios.perfilprofesional')),
            ],
            options={'ordering': ['-creado', '-id']},
        ),
        migrations.CreateModel(
            name='Resena',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('calificacion', models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])),
                ('comentario', models.TextField(blank=True, max_length=1000)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('solicitud', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='resena', to='usuarios.solicitudservicio')),
            ],
            options={'ordering': ['-creado', '-id']},
        ),
        migrations.CreateModel(
            name='Notificacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('nueva_solicitud', 'Nueva solicitud'), ('solicitud_aceptada', 'Solicitud aceptada'), ('solicitud_rechazada', 'Solicitud rechazada'), ('solicitud_completada', 'Solicitud completada'), ('solicitud_cancelada', 'Solicitud cancelada'), ('nueva_resena', 'Nueva reseña')], max_length=24)),
                ('mensaje', models.CharField(max_length=240)),
                ('leida', models.BooleanField(default=False)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('solicitud', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notificaciones', to='usuarios.solicitudservicio')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-creado', '-id']},
        ),
    ]
