import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../models/audio.dart';
import '../models/playlist.dart';

/// Persistent storage for the mobile app, mirroring storage.pug:
///   * file-storage#audio-files — opus files (and thumbnails) on the device disk
///   * sqlite#audios           — metadata of downloaded (persisted) audios
///   * sqlite#playlists        — saved playlists
///
/// Downloaded audios are keyed by [Audio.referenceId] (the YouTube id), which is
/// what the home view checks with `audios.exists(audio.referenceId)`.
class AudioStorage {
  AudioStorage._(this._db, this._audiosDir, this._cacheDir);

  final Database _db;
  final Directory _audiosDir;
  final Directory _cacheDir;

  static Future<AudioStorage> open() async {
    final docs = await getApplicationDocumentsDirectory();
    final audiosDir = Directory(p.join(docs.path, 'audios'));
    await audiosDir.create(recursive: true);

    final temp = await getTemporaryDirectory();
    final cacheDir = Directory(p.join(temp.path, 'audio_cache'));
    await cacheDir.create(recursive: true);

    final dbPath = p.join(await getDatabasesPath(), 'audio_station.db');
    final db = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE audios (
            referenceId TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            thumbnail TEXT,
            duration TEXT NOT NULL,
            filePath TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            audios TEXT NOT NULL
          )
        ''');
      },
    );
    return AudioStorage._(db, audiosDir, cacheDir);
  }

  /// Local path an audio's opus file gets while it only lives in the cache.
  String cachePathFor(String referenceId) =>
      p.join(_cacheDir.path, '$referenceId.opus');

  /// Local path an audio's opus file gets once persisted.
  String persistentPathFor(String referenceId) =>
      p.join(_audiosDir.path, '$referenceId.opus');

  File cacheFile(String referenceId) => File(cachePathFor(referenceId));

  /// True once the audio has been downloaded into the persistent storage.
  Future<bool> existsPersistent(String referenceId) async {
    final rows = await _db.query(
      'audios',
      where: 'referenceId = ?',
      whereArgs: [referenceId],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  /// Returns the persisted opus path for [referenceId], or null when it is not
  /// stored persistently.
  Future<String?> persistentFilePath(String referenceId) async {
    final rows = await _db.query(
      'audios',
      columns: ['filePath'],
      where: 'referenceId = ?',
      whereArgs: [referenceId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['filePath'] as String?;
  }

  /// Persists an audio: writes its bytes to the audios disk (copying from the
  /// cache when the file is already there) and records the row.
  Future<void> persist(Audio audio) async {
    final referenceId = audio.referenceId;
    final target = File(persistentPathFor(referenceId));
    final cached = cacheFile(referenceId);
    if (await cached.exists()) {
      await cached.copy(target.path);
    }
    await _db.insert(
      'audios',
      {
        ...audio.toMap(),
        'filePath': target.path,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Audio>> listPersistent() async {
    final rows = await _db.query('audios', orderBy: 'rowid DESC');
    return rows.map(Audio.fromMap).toList();
  }

  Future<int> savePlaylist(Playlist playlist) async {
    return _db.insert('playlists', {
      'name': playlist.name ?? 'Playlist',
      'audios': jsonEncode(playlist.audios.map((a) => a.toMap()).toList()),
    });
  }

  Future<List<Playlist>> listPlaylists() async {
    final rows = await _db.query('playlists', orderBy: 'id DESC');
    return rows.map((row) {
      final raw = jsonDecode(row['audios'] as String) as List<dynamic>;
      final audios =
          raw.map((e) => Audio.fromMap(e as Map<String, dynamic>)).toList();
      return Playlist(name: row['name'] as String?, audios: audios);
    }).toList();
  }
}
