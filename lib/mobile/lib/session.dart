import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// The logged-in user's session, mirroring the server's /login response
/// (token.access-token, user_id.id, username).
class Session {
  const Session({
    required this.token,
    required this.userId,
    required this.username,
  });

  final String token;
  final int userId;
  final String username;

  factory Session.fromJson(Map<String, dynamic> json) => Session(
        token: json['token'] as String,
        userId: json['user_id'] as int,
        username: json['username'] as String,
      );

  Map<String, dynamic> toJson() => {
        'token': token,
        'user_id': userId,
        'username': username,
      };
}

/// Persists the session in SharedPreferences so it survives app restarts.
class SessionStore {
  static const _key = 'audio-station-session';

  Future<Session?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      if (json['token'] is! String) return null;
      return Session.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> save(Session session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(session.toJson()));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
