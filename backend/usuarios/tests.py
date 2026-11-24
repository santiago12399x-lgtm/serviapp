from django.test import TestCase
from rest_framework.test import APIClient

from .models import PerfilProfesional, Usuario


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
