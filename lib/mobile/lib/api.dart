import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'models/audio.dart';
import 'session.dart';

/// Thrown when the server responds with a non-2xx status. [code] is the
/// server's error discriminator (e.g. UserAlreadyExist) when present.
class ApiException implements Exception {
  ApiException(this.code);

  final String? code;

  @override
  String toString() => 'ApiException($code)';
}

/// Maps server error discriminators to the same Spanish copy the webapp uses.
const _errorMessages = <String, String>{
  'UserAlreadyExist': 'El usuario ya existe',
  'InvalidUsernameAndPassword': 'Usuario o contraseña inválidos',
  'MaxAllowedRetriesExceeded': 'Demasiados intentos, prueba más tarde',
  'VideoNotFound': 'Video no encontrado',
  'DownloadFailed': 'No se pudo descargar el audio',
  'ValidationError': 'Datos inválidos',
};

String apiErrorMessage(Object error, String fallback) {
  if (error is ApiException && error.code != null) {
    return _errorMessages[error.code] ?? fallback;
  }
  return fallback;
}

/// One event of the /download long-polling stream. Progress climbs 0..100; the
/// terminal event also carries the persisted audio [id] and [title]. A non-null
/// [error] marks a failed download.
class DownloadEvent {
  DownloadEvent({
    required this.progress,
    this.estimated,
    this.id,
    this.title,
    this.error,
  });

  final int progress;
  final String? estimated;
  final int? id;
  final String? title;
  final String? error;

  bool get isDone => progress >= 100 && id != null;

  factory DownloadEvent.fromJson(Map<String, dynamic> json) => DownloadEvent(
        progress: (json['progress'] as num?)?.toInt() ?? 0,
        estimated: json['estimated'] as String?,
        id: (json['id'] as num?)?.toInt(),
        title: json['title'] as String?,
        error: json['error'] as String?,
      );
}

/// Client for the audio-station HTTP server. The base URL defaults to
/// http://localhost:8080 and can be overridden at build time with
/// --dart-define=AUDIO_STATION_API_URL=...
///
/// Authenticated endpoints require a [session]; pass one for the home flow.
class ApiClient {
  ApiClient({String? baseUrl, this.session})
      : baseUrl = baseUrl ??
            const String.fromEnvironment(
              'AUDIO_STATION_API_URL',
              defaultValue: 'http://localhost:8080',
            );

  final String baseUrl;
  final Session? session;

  Map<String, String> get _authHeaders => session == null
      ? const {}
      : {'authorization': 'Bearer ${session!.token}'};

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

  /// GET /explore — searches YouTube for [search] and returns the audios found.
  Future<List<Audio>> explore(String search) async {
    final uri = Uri.parse('$baseUrl/explore')
        .replace(queryParameters: {'search': search});
    final res = await http.get(uri, headers: _authHeaders);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(_errorCode(res.body));
    }
    final data = jsonDecode(res.body) as List<dynamic>;
    return data
        .map((e) => Audio.fromSearchJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /download — asks the server to download [url] from YouTube, streaming
  /// progress events until the audio is persisted server-side.
  Stream<DownloadEvent> download(String url) async* {
    final client = http.Client();
    try {
      final req = http.Request('POST', Uri.parse('$baseUrl/download'))
        ..headers.addAll({'content-type': 'application/json', ..._authHeaders})
        ..body = jsonEncode({'url': url});
      final res = await client.send(req);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw ApiException(_errorCode(await res.stream.bytesToString()));
      }
      final lines = res.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());
      await for (final line in lines) {
        if (line.trim().isEmpty) continue;
        final event =
            DownloadEvent.fromJson(jsonDecode(line) as Map<String, dynamic>);
        yield event;
        if (event.error != null) {
          throw ApiException(event.error);
        }
      }
    } finally {
      client.close();
    }
  }

  /// Downloads the raw opus bytes of a persisted audio (GET /audio/{id}.opus).
  Future<Uint8List> fetchAudioBytes(int id) async {
    final res = await http.get(
      Uri.parse('$baseUrl/audio/$id.opus'),
      headers: _authHeaders,
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(_errorCode(res.body));
    }
    return res.bodyBytes;
  }

  String audioUrl(int id) => '$baseUrl/audio/$id.opus';
  String thumbnailUrl(int id) => '$baseUrl/thumbnail/$id.webp';

  String? _errorCode(String body) {
    try {
      return (jsonDecode(body) as Map<String, dynamic>)['error'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> payload,
  ) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {'content-type': 'application/json', ..._authHeaders},
      body: jsonEncode(payload),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return const {};
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw ApiException(_errorCode(res.body));
  }
}
