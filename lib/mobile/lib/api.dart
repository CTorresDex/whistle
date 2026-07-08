import 'dart:convert';

import 'package:http/http.dart' as http;

import 'session.dart';

/// Thrown when the server responds with a non-2xx status. [code] is the
/// server's error discriminator (e.g. UserAlreadyExist) when present.
class ApiException implements Exception {
  ApiException(this.code);

  final String? code;
}

/// Maps server error discriminators to the same Spanish copy the webapp uses.
const _errorMessages = <String, String>{
  'UserAlreadyExist': 'El usuario ya existe',
  'InvalidUsernameAndPassword': 'Usuario o contraseña inválidos',
  'MaxAllowedRetriesExceeded': 'Demasiados intentos, prueba más tarde',
  'VideoNotFound': 'Video no encontrado',
  'ValidationError': 'Datos inválidos',
};

String apiErrorMessage(Object error, String fallback) {
  if (error is ApiException && error.code != null) {
    return _errorMessages[error.code] ?? fallback;
  }
  return fallback;
}

/// Client for the audio-station HTTP server. The base URL defaults to
/// http://localhost:8080 (reachable from the iOS simulator) and can be
/// overridden at build time with --dart-define=AUDIO_STATION_API_URL=...
class ApiClient {
  ApiClient({String? baseUrl})
      : baseUrl = baseUrl ??
            const String.fromEnvironment(
              'AUDIO_STATION_API_URL',
              defaultValue: 'http://localhost:8080',
            );

  final String baseUrl;

  Future<void> signup(String username, String password) async {
    await _post('/signup', {'username': username, 'password': password});
  }

  Future<Session> login(String username, String password) async {
    final body = await _post('/login', {
      'username': username,
      'password': password,
    });
    return Session.fromJson(body);
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> payload,
  ) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return const {};
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    String? code;
    try {
      code = (jsonDecode(res.body) as Map<String, dynamic>)['error'] as String?;
    } catch (_) {
      code = null;
    }
    throw ApiException(code);
  }
}
