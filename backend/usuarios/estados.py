from django.db import models


class EstadoSolicitud(models.TextChoices):
    PENDIENTE = 'pendiente', 'Pendiente'
    ACEPTADA = 'aceptada', 'Aceptada'
    RECHAZADA = 'rechazada', 'Rechazada'
    COMPLETADA = 'completada', 'Completada'
    CANCELADA = 'cancelada', 'Cancelada'


class EstadoContrato(models.TextChoices):
    ACTIVO = 'activo', 'Activo'
    EN_CAMINO = 'en_camino', 'En camino'
    EN_PROCESO = 'en_proceso', 'En proceso'
    FINALIZADO = 'finalizado', 'Finalizado'
    CANCELADO = 'cancelado', 'Cancelado'
    EN_DISPUTA = 'en_disputa', 'En disputa'


TRANSICIONES_SOLICITUD = {
    'profesional': {
        EstadoSolicitud.PENDIENTE: frozenset({EstadoSolicitud.ACEPTADA, EstadoSolicitud.RECHAZADA}),
        EstadoSolicitud.ACEPTADA: frozenset({EstadoSolicitud.COMPLETADA}),
    },
    'cliente': {
        EstadoSolicitud.PENDIENTE: frozenset({EstadoSolicitud.CANCELADA}),
        EstadoSolicitud.ACEPTADA: frozenset({EstadoSolicitud.CANCELADA}),
    },
}


def transiciones_solicitud_para(usuario, solicitud):
    """Devuelve los destinos permitidos o None si la persona no participa."""
    if solicitud.profesional.usuario_id == usuario.pk:
        rol = 'profesional'
    elif solicitud.cliente_id == usuario.pk:
        rol = 'cliente'
    else:
        return None
    return TRANSICIONES_SOLICITUD[rol].get(solicitud.estado, frozenset())
