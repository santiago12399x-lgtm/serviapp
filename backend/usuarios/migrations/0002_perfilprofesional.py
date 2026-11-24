# Generated migration for professional profiles.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PerfilProfesional',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('categoria', models.CharField(choices=[('hogar', 'Hogar'), ('limpieza', 'Limpieza'), ('tecnologia', 'Tecnología'), ('belleza', 'Belleza'), ('automovil', 'Automóvil'), ('educacion', 'Educación'), ('otros', 'Otros')], max_length=20)),
                ('oficio', models.CharField(max_length=100)),
                ('servicios', models.TextField(help_text='Describe los servicios que ofreces.')),
                ('descripcion', models.TextField()),
                ('experiencia_anios', models.PositiveSmallIntegerField(default=0)),
                ('ubicacion', models.CharField(max_length=120)),
                ('disponibilidad', models.CharField(max_length=180)),
                ('tarifa_desde', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('telefono_publico', models.BooleanField(default=False, help_text='Permite mostrar al público el teléfono de la cuenta.')),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('actualizado', models.DateTimeField(auto_now=True)),
                ('usuario', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='perfil_profesional', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['usuario__first_name', 'usuario__last_name', 'id'],
            },
        ),
    ]
