import 'dart:io';

import 'package:flutter/material.dart';

import '../api.dart';
import '../models/audio.dart';
import '../models/playlist.dart';
import '../services/player_service.dart';
import '../session.dart';
import '../storage/audio_storage.dart';
import 'login_screen.dart';

/// view#home — search YouTube, list results with per-row download progress,
/// play/download each audio, and control playback from a bottom play-bar.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session});

  final Session session;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final ApiClient _api = ApiClient(session: widget.session);
  final _store = SessionStore();
  final _searchController = TextEditingController();

  AudioStorage? _storage;
  PlayerService? _player;

  Playlist _playlist = Playlist();
  bool _searching = false;

  /// referenceId -> download progress in 0..1 (bar stays at 1.0 once done).
  final Map<String, double> _progress = {};

  /// referenceIds already stored in the persistent audios storage.
  final Set<String> _downloaded = {};

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final storage = await AudioStorage.open();
    final persisted = await storage.listPersistent();
    if (!mounted) return;
    setState(() {
      _storage = storage;
      _downloaded.addAll(persisted.map((a) => a.referenceId));
      _player = PlayerService(resolver: (audio, _) => _ensureCached(audio));
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _player?.dispose();
    super.dispose();
  }

  // ── search ───────────────────────────────────────────────────────────────
  Future<void> _search() async {
    final term = _searchController.text.trim();
    if (term.isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() => _searching = true);
    try {
      final audios = await _api.explore(term);
      if (!mounted) return;
      setState(() => _playlist = Playlist(name: term, audios: audios));
    } catch (error) {
      _showError(apiErrorMessage(error, 'Error al buscar'));
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  // ── downloading ────────────────────────────────────────────────────────
  /// Ensures [audio]'s opus file is available locally, downloading it into the
  /// cache when needed, and returns its path. Reuses the persisted file when
  /// the audio is already downloaded.
  Future<String> _ensureCached(Audio audio) async {
    final storage = _storage!;
    final refId = audio.referenceId;

    final persistent = await storage.persistentFilePath(refId);
    if (persistent != null && await File(persistent).exists()) {
      return persistent;
    }
    final cache = storage.cacheFile(refId);
    if (await cache.exists()) return cache.path;

    int? serverId;
    await for (final event in _api.download(audio.url)) {
      if (mounted) {
        setState(() => _progress[refId] = event.progress / 100.0);
      }
      if (event.isDone) serverId = event.id;
    }
    if (serverId == null) throw ApiException('DownloadFailed');

    final bytes = await _api.fetchAudioBytes(serverId);
    await cache.writeAsBytes(bytes);
    if (mounted) setState(() => _progress[refId] = 1.0);
    return cache.path;
  }

  Future<void> _play(int index) async {
    try {
      await _player!.playFromPlaylist(_playlist, index);
    } catch (error) {
      _showError(apiErrorMessage(error, 'No se pudo reproducir'));
    }
  }

  Future<void> _download(Audio audio) async {
    try {
      await _ensureCached(audio);
      await _storage!.persist(audio);
      if (!mounted) return;
      setState(() => _downloaded.add(audio.referenceId));
    } catch (error) {
      _showError(apiErrorMessage(error, 'No se pudo descargar'));
    }
  }

  Future<void> _logout() async {
    await _store.clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  // ── build ────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final player = _player;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Audio Station'),
        actions: [
          IconButton(
            key: const Key('logout'),
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: player == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildSearchSection(),
                Expanded(child: _buildList()),
                _PlayBar(player: player),
              ],
            ),
    );
  }

  Widget _buildSearchSection() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: TextField(
        key: const Key('search-bar'),
        controller: _searchController,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => _search(),
        onTap: () => setState(() => _searching = true),
        decoration: InputDecoration(
          prefixIcon: _searching
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : const Icon(Icons.search),
          hintText: '¿Qué quieres escuchar?',
          filled: true,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(28),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildList() {
    if (_playlist.isEmpty) {
      return const Center(
        child: Text('Busca algo para empezar', key: Key('empty-list')),
      );
    }
    return ListView.builder(
      key: const Key('audio-list'),
      itemCount: _playlist.length,
      itemBuilder: (context, index) {
        final audio = _playlist[index];
        return _AudioRow(
          key: Key('audio-row-$index'),
          audio: audio,
          progress: _progress[audio.referenceId],
          downloaded: _downloaded.contains(audio.referenceId),
          onPlay: () => _play(index),
          onDownload: () => _download(audio),
        );
      },
    );
  }
}

/// A single list row: thumbnail, title/duration, play & (optional) download
/// actions, with a hidden 2px download-progress bar pinned to the bottom that
/// never changes the row height and stays visible once complete.
class _AudioRow extends StatelessWidget {
  const _AudioRow({
    super.key,
    required this.audio,
    required this.progress,
    required this.downloaded,
    required this.onPlay,
    required this.onDownload,
  });

  final Audio audio;
  final double? progress;
  final bool downloaded;
  final VoidCallback onPlay;
  final VoidCallback onDownload;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              _Thumbnail(url: audio.thumbnail),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      audio.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (audio.duration.isNotEmpty)
                      Text(
                        audio.duration,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
              IconButton(
                key: const Key('play-button'),
                icon: const Icon(Icons.play_arrow),
                onPressed: onPlay,
              ),
              if (!downloaded)
                IconButton(
                  key: const Key('download-button'),
                  icon: const Icon(Icons.download),
                  onPressed: onDownload,
                ),
            ],
          ),
        ),
        // 2px bottom bar: always occupies the same height so the row never
        // resizes; only becomes visible while/after a download runs.
        SizedBox(
          height: 2,
          child: progress == null
              ? const SizedBox.shrink()
              : LinearProgressIndicator(value: progress, minHeight: 2),
        ),
      ],
    );
  }
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    const size = 48.0;
    final placeholder = Container(
      width: size,
      height: size,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const Icon(Icons.music_note),
    );
    if (url == null || url!.isEmpty) return placeholder;
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: Image.network(
        url!,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => placeholder,
      ),
    );
  }
}

/// play-bar fixed at the bottom, hidden while the player is stopped.
class _PlayBar extends StatelessWidget {
  const _PlayBar({required this.player});

  final PlayerService player;

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: player,
      builder: (context, _) {
        if (player.status == PlayerStatus.stopped) {
          return const SizedBox.shrink();
        }
        final total = player.duration.inMilliseconds;
        final value = total == 0
            ? 0.0
            : (player.currentTime.inMilliseconds / total).clamp(0.0, 1.0);
        return Material(
          key: const Key('play-bar'),
          elevation: 8,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Row(
                  children: [
                    IconButton(
                      key: const Key('playbar-previous'),
                      icon: const Icon(Icons.skip_previous),
                      onPressed: player.previous,
                    ),
                    if (player.status == PlayerStatus.paused)
                      IconButton(
                        key: const Key('playbar-play'),
                        icon: const Icon(Icons.play_arrow),
                        onPressed: player.resume,
                      )
                    else
                      IconButton(
                        key: const Key('playbar-pause'),
                        icon: const Icon(Icons.pause),
                        onPressed: player.pause,
                      ),
                    IconButton(
                      key: const Key('playbar-next'),
                      icon: const Icon(Icons.skip_next),
                      onPressed: player.next,
                    ),
                    Expanded(
                      child: Text(
                        player.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text('${_fmt(player.currentTime)} - ${_fmt(player.duration)}'),
                  ],
                ),
              ),
              LinearProgressIndicator(value: value, minHeight: 2),
            ],
          ),
        );
      },
    );
  }
}
