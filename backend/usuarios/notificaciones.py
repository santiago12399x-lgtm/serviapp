from .models import Notificacion, PreferenciaNotificacion


def crear_notificacion(*, usuario, tipo, titulo, mensaje, destino=Notificacion.Destino.SOLICITUDES, solicitud=None):
    preferencia = PreferenciaNotificacion.objects.filter(usuario=usuario, tipo=tipo).only('activada').first()
    if preferencia is not None and not preferencia.activada:
        return None

    return Notificacion.objects.create(
        usuario=usuario,
        solicitud=solicitud,
        titulo=titulo,
        tipo=tipo,
        mensaje=mensaje,
        destino=destino,
    )
