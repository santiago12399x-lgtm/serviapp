from django.test import TestCase
from rest_framework.test import APIClient

from .models import Usuario


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
