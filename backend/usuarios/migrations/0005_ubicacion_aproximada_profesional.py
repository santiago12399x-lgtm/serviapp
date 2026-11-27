from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0004_solicitudes_resenas_notificaciones_trabajos_fotos'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfilprofesional',
            name='latitud',
            field=models.DecimalField(blank=True, decimal_places=5, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name='perfilprofesional',
            name='longitud',
            field=models.DecimalField(blank=True, decimal_places=5, max_digits=8, null=True),
        ),
    ]
