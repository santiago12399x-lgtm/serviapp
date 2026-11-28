from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import PerfilProfesional, PuntuacionArcade, Usuario


class AutenticacionTests(TestCase):
    def setUp(self):
        self.password = 'ClaveSegura!2026'
        self.usuario = Usuario.objects.create_user(
            email='profesional@example.com',
            password=self.password,
            first_name='Ana',
            last_name='Pérez',
            es_trabajador=True,
        )
        self.client = APIClient()

    def test_login_emite_tokens_y_devuelve_el_rol(self):
        respuesta = self.client.post(
            '/api/usuarios/token/',
            {'email': self.usuario.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('access', respuesta.data)
        self.assertIn('refresh', respuesta.data)
        self.assertEqual(respuesta.data['usuario']['id'], self.usuario.id)
        self.assertTrue(respuesta.data['usuario']['es_trabajador'])
        self.assertNotIn('password', respuesta.data['usuario'])

    def test_perfil_requiere_jwt_y_devuelve_datos_publicos(self):
        sin_token = self.client.get('/api/usuarios/perfil/')
        self.assertEqual(sin_token.status_code, 401)

        login = self.client.post(
            '/api/usuarios/token/',
            {'email': self.usuario.email, 'password': self.password},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        perfil = self.client.get('/api/usuarios/perfil/')

        self.assertEqual(perfil.status_code, 200)
        self.assertEqual(perfil.data['email'], self.usuario.email)
        self.assertTrue(perfil.data['es_trabajador'])
        self.assertNotIn('password', perfil.data)

    def test_refresh_emite_un_nuevo_access_token(self):
        login = self.client.post(
            '/api/usuarios/token/',
            {'email': self.usuario.email, 'password': self.password},
            format='json',
        )
        respuesta = self.client.post(
            '/api/usuarios/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('access', respuesta.data)


class PerfilProfesionalTests(TestCase):
    def setUp(self):
        self.profesional = Usuario.objects.create_user(
            email='profesional2@example.com',
            password='ClaveSegura!2026',
            first_name='Laura',
            last_name='Gómez',
            telefono='3001234567',
            es_trabajador=True,
        )
        self.cliente = Usuario.objects.create_user(
            email='cliente@example.com',
            password='ClaveSegura!2026',
            first_name='Carlos',
            es_trabajador=False,
        )
        self.client = APIClient()
        self.url = '/api/usuarios/perfil-profesional/'
        self.datos = {
            'categoria': 'hogar',
            'oficio': 'Plomería',
            'servicios': 'Reparación de grifos y tuberías',
            'descripcion': 'Atención residencial con experiencia.',
            'experiencia_anios': 5,
            'ubicacion': 'Bogotá, Chapinero',
            'disponibilidad': 'Lunes a sábado',
            'tarifa_desde': '45000.00',
            'telefono_publico': False,
        }

    def test_profesional_crea_consulta_y_edita_su_perfil(self):
        self.client.force_authenticate(user=self.profesional)

        creada = self.client.post(self.url, self.datos, format='json')
        self.assertEqual(creada.status_code, 201)
        self.assertEqual(PerfilProfesional.objects.count(), 1)

        consulta = self.client.get(self.url)
        self.assertEqual(consulta.status_code, 200)
        self.assertEqual(consulta.data['oficio'], 'Plomería')

        actualizada = self.client.patch(
            self.url,
            {'ubicacion': 'Bogotá, Teusaquillo'},
            format='json',
        )
        self.assertEqual(actualizada.status_code, 200)
        self.assertEqual(actualizada.data['ubicacion'], 'Bogotá, Teusaquillo')

    def test_usuario_no_profesional_no_puede_crear_perfil(self):
        self.client.force_authenticate(user=self.cliente)
        respuesta = self.client.post(self.url, self.datos, format='json')
        self.assertEqual(respuesta.status_code, 403)

    def test_el_perfil_nuevo_se_asocia_siempre_a_la_cuenta_autenticada(self):
        self.client.force_authenticate(user=self.profesional)
        datos_con_dueno = {**self.datos, 'usuario': self.cliente.id}
        respuesta = self.client.post(self.url, datos_con_dueno, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(
            PerfilProfesional.objects.get().usuario_id,
            self.profesional.id,
        )

    def test_no_se_puede_crear_un_segundo_perfil_para_la_misma_cuenta(self):
        PerfilProfesional.objects.create(usuario=self.profesional, **self.datos)
        self.client.force_authenticate(user=self.profesional)
        respuesta = self.client.post(self.url, self.datos, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_busqueda_publica_filtra_por_categoria_ubicacion_y_texto(self):
        PerfilProfesional.objects.create(usuario=self.profesional, **self.datos)

        categoria = self.client.get('/api/usuarios/profesionales/?categoria=hogar')
        ubicacion = self.client.get('/api/usuarios/profesionales/?ubicacion=Chapinero')
        texto = self.client.get('/api/usuarios/profesionales/?q=grifos')

        self.assertEqual(categoria.status_code, 200)
        self.assertEqual(len(categoria.data), 1)
        self.assertEqual(len(ubicacion.data), 1)
        self.assertEqual(len(texto.data), 1)

    def test_api_publica_no_expone_email_ni_telefono_sin_consentimiento(self):
        perfil = PerfilProfesional.objects.create(usuario=self.profesional, **self.datos)

        respuesta = self.client.get(f'/api/usuarios/profesionales/{perfil.id}/')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['nombre'], 'Laura Gómez')
        self.assertEqual(respuesta.data['telefono'], '')
        self.assertNotIn('email', respuesta.data)

        perfil.telefono_publico = True
        perfil.save(update_fields=['telefono_publico', 'actualizado'])
        respuesta_con_telefono = self.client.get(
            f'/api/usuarios/profesionales/{perfil.id}/'
        )
        self.assertEqual(respuesta_con_telefono.data['telefono'], '3001234567')


class PuntuacionesArcadeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.jugador = Usuario.objects.create_user(
            email='jugador@example.com', password='ClaveSegura!2026', first_name='Ada', last_name='Lovelace'
        )
        self.otro_jugador = Usuario.objects.create_user(
            email='jugador2@example.com', password='ClaveSegura!2026', first_name='Grace', last_name='Hopper'
        )
        self.client = APIClient()
        self.url = '/api/usuarios/arcade/puntuaciones/'

    def test_guardar_puntaje_exige_autenticacion_y_lo_asocia_al_usuario(self):
        datos = {
            'puntuacion': 1200,
            'servicios_completados': 3,
            'duracion_segundos': 90,
            'modo': 'normal',
        }
        anonimo = self.client.post(self.url, datos, format='json')
        self.assertEqual(anonimo.status_code, 401)

        self.client.force_authenticate(user=self.jugador)
        guardado = self.client.post(self.url, datos, format='json')
        self.assertEqual(guardado.status_code, 201)
        self.assertEqual(PuntuacionArcade.objects.get().usuario, self.jugador)

    def test_rechaza_puntajes_fuera_de_rango_o_incoherentes(self):
        self.client.force_authenticate(user=self.jugador)
        casos_invalidos = [
            {'puntuacion': 100001, 'servicios_completados': 3, 'duracion_segundos': 90, 'modo': 'normal'},
            {'puntuacion': 8000, 'servicios_completados': 1, 'duracion_segundos': 90, 'modo': 'normal'},
            {'puntuacion': 100, 'servicios_completados': 1, 'duracion_segundos': 181, 'modo': 'normal'},
            {'puntuacion': 5000, 'servicios_completados': 8, 'duracion_segundos': 20, 'modo': 'normal'},
            {'puntuacion': 1, 'servicios_completados': 0, 'duracion_segundos': 90, 'modo': 'normal'},
            {'puntuacion': 100, 'servicios_completados': 1, 'duracion_segundos': 90, 'modo': 'otro'},
        ]
        for datos in casos_invalidos:
            with self.subTest(datos=datos):
                respuesta = self.client.post(self.url, datos, format='json')
                self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(PuntuacionArcade.objects.count(), 0)

    def test_limita_envios_a_diez_por_minuto_por_usuario(self):
        self.client.force_authenticate(user=self.jugador)
        datos = {
            'puntuacion': 900,
            'servicios_completados': 2,
            'duracion_segundos': 90,
            'modo': 'normal',
        }
        for _ in range(10):
            self.assertEqual(self.client.post(self.url, datos, format='json').status_code, 201)
        limitada = self.client.post(self.url, datos, format='json')
        self.assertEqual(limitada.status_code, 429)

    def test_clasificacion_es_publica_semanal_y_muestra_mejor_puntaje_por_jugador(self):
        PuntuacionArcade.objects.create(
            usuario=self.jugador, puntuacion=900, servicios_completados=2, duracion_segundos=100
        )
        PuntuacionArcade.objects.create(
            usuario=self.jugador, puntuacion=1400, servicios_completados=3, duracion_segundos=120
        )
        antigua = PuntuacionArcade.objects.create(
            usuario=self.jugador, puntuacion=3000, servicios_completados=5, duracion_segundos=100,
        )
        PuntuacionArcade.objects.filter(pk=antigua.pk).update(creado=timezone.now() - timedelta(days=8))
        PuntuacionArcade.objects.create(
            usuario=self.otro_jugador, puntuacion=1100, servicios_completados=2, duracion_segundos=80,
            modo=PuntuacionArcade.Modo.DIARIO,
        )

        respuesta = self.client.get('/api/usuarios/arcade/clasificacion/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['clasificacion'], [
            {'puesto': 1, 'nombre': 'Ada', 'puntuacion': 1400},
        ])
        diaria = self.client.get('/api/usuarios/arcade/clasificacion/?modo=diario')
        self.assertEqual(diaria.data['clasificacion'][0]['nombre'], 'Grace')
