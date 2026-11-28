from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


TIPOS_NOTIFICACION = [
    ('nueva_solicitud', 'Nueva solicitud'),
    ('solicitud_aceptada', 'Solicitud aceptada'),
    ('solicitud_rechazada', 'Solicitud rechazada'),
    ('solicitud_completada', 'Solicitud completada'),
    ('solicitud_cancelada', 'Solicitud cancelada'),
    ('nueva_resena', 'Nueva reseña'),
    ('contrato_generado', 'Contrato generado'),
    ('mensaje_nuevo', 'Mensaje nuevo'),
    ('recordatorio_servicio', 'Recordatorio de servicio'),
    ('reporte_gestionado', 'Reporte gestionado'),
    ('disputa_resuelta', 'Disputa resuelta'),
]


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0006_merge_arcade_location'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacion',
            name='titulo',
            field=models.CharField(default='Notificación', max_length=120),
        ),
        migrations.AddField(
            model_name='notificacion',
            name='destino',
            field=models.CharField(
                choices=[('solicitudes', 'Solicitudes')],
                default='solicitudes',
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name='notificacion',
            name='tipo',
            field=models.CharField(choices=TIPOS_NOTIFICACION, max_length=24),
        ),
        migrations.CreateModel(
            name='PreferenciaNotificacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=TIPOS_NOTIFICACION, max_length=24)),
                ('activada', models.BooleanField(default=True)),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='preferencias_notificacion',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.AddConstraint(
            model_name='preferencianotificacion',
            constraint=models.UniqueConstraint(
                fields=('usuario', 'tipo'),
                name='notificacion_preferencia_usuario_tipo_unica',
            ),
        ),
    ]
