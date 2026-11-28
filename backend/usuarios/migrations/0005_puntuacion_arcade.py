from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('usuarios', '0004_solicitudes_resenas_notificaciones_trabajos_fotos'),
    ]

    operations = [
        migrations.CreateModel(
            name='PuntuacionArcade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('puntuacion', models.PositiveIntegerField()),
                ('servicios_completados', models.PositiveSmallIntegerField()),
                ('duracion_segundos', models.PositiveSmallIntegerField()),
                ('modo', models.CharField(choices=[('normal', 'Turno normal'), ('diario', 'Reto diario')], default='normal', max_length=8)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='puntuaciones_arcade', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-puntuacion', 'creado']},
        ),
        migrations.AddIndex(
            model_name='puntuacionarcade',
            index=models.Index(fields=['modo', '-creado'], name='arcade_modo_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='puntuacionarcade',
            index=models.Index(fields=['usuario', 'modo', '-puntuacion'], name='arcade_usuario_modo_idx'),
        ),
        migrations.AddConstraint(
            model_name='puntuacionarcade',
            constraint=models.CheckConstraint(condition=models.Q(('puntuacion__lte', 100000)), name='arcade_puntuacion_max_100k'),
        ),
        migrations.AddConstraint(
            model_name='puntuacionarcade',
            constraint=models.CheckConstraint(condition=models.Q(('servicios_completados__lte', 50)), name='arcade_servicios_max_50'),
        ),
        migrations.AddConstraint(
            model_name='puntuacionarcade',
            constraint=models.CheckConstraint(condition=models.Q(('duracion_segundos__gte', 1), ('duracion_segundos__lte', 180)), name='arcade_duracion_1_a_180'),
        ),
    ]
