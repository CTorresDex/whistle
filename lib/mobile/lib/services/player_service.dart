import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';

import '../models/audio.dart';
import '../models/playlist.dart';

/// enum#player-status
enum PlayerStatus { stopped, playing, paused }

/// enum#iteration-mode
enum IterationMode { cyclePlaylist, repeatSong, noRepeat }

/// Resolves the local opus file path for an [audio], downloading it into the
/// cache when needed. [onProgress] reports 0..100 while downloading.
typedef AudioFileResolver = Future<String> Function(
  Audio audio,
  void Function(int progress) onProgress,
);

/// Given the current index in a playlist of [length] songs, the index that
/// should play after the current song ends — or null when playback should stop
/// (no-repeat). Pure so it can be unit-tested without the audio engine.
int? indexAfterEnd(IterationMode mode, int current, int length) {
  if (length == 0) return null;
  switch (mode) {
    case IterationMode.cyclePlaylist:
      return (current + 1) % length;
    case IterationMode.repeatSong:
      return current;
    case IterationMode.noRepeat:
      return null;
  }
}

/// service#player — centralized service controlling audio reproduction. Audio
/// keeps playing in the background via just_audio_background.
class PlayerService extends ChangeNotifier {
  PlayerService({required AudioFileResolver resolver, AudioPlayer? player})
      : _resolver = resolver,
        _player = player ?? AudioPlayer() {
    _player.playerStateStream.listen(_onPlayerState);
    _player.positionStream.listen((pos) {
      _currentTime = pos;
      notifyListeners();
    });
    _player.durationStream.listen((d) {
      if (d != null) {
        _duration = d;
        notifyListeners();
      }
    });
  }

  final AudioPlayer _player;
  final AudioFileResolver _resolver;

  // ── state ──────────────────────────────────────────────────────────────
  PlayerStatus _status = PlayerStatus.stopped;
  Playlist? _playlist;
  int _songIndex = 0;
  Duration _currentTime = Duration.zero;
  Duration _duration = Duration.zero;
  IterationMode _iterationMode = IterationMode.cyclePlaylist;
  bool _advancing = false;

  PlayerStatus get status => _status;
  Playlist? get playlist => _playlist;
  int get songIndex => _songIndex;
  Duration get currentTime => _currentTime;
  Duration get duration => _duration;
  IterationMode get iterationMode => _iterationMode;

  Audio? get currentAudio {
    final list = _playlist;
    if (list == null || list.isEmpty) return null;
    if (_songIndex < 0 || _songIndex >= list.length) return null;
    return list[_songIndex];
  }

  String get title => currentAudio?.title ?? '';

  set iterationMode(IterationMode mode) {
    _iterationMode = mode;
    notifyListeners();
  }

  // ── actions ────────────────────────────────────────────────────────────
  /// action#play — plays [audio]; if something is already playing it switches.
  Future<void> play(Audio audio) =>
      playFromPlaylist(Playlist(audios: [audio]), 0);

  /// Plays [index] within [playlist], keeping the playlist so the play-bar's
  /// previous/next can navigate it.
  Future<void> playFromPlaylist(Playlist playlist, int index) async {
    _playlist = playlist;
    _songIndex = index;
    await _playCurrent();
  }

  /// action#pause — pauses the playing audio.
  Future<void> pause() async {
    await _player.pause();
    _status = PlayerStatus.paused;
    notifyListeners();
  }

  /// action#resume — resumes the paused audio.
  Future<void> resume() async {
    await _player.play();
    _status = PlayerStatus.playing;
    notifyListeners();
  }

  /// play-bar previous control — plays the previous song, wrapping to the last.
  Future<void> previous() async {
    final list = _playlist;
    if (list == null || list.isEmpty) return;
    _songIndex = (_songIndex - 1 + list.length) % list.length;
    await _playCurrent();
  }

  /// play-bar next control — plays the next song, wrapping to the first.
  Future<void> next() async {
    final list = _playlist;
    if (list == null || list.isEmpty) return;
    _songIndex = (_songIndex + 1) % list.length;
    await _playCurrent();
  }

  Future<void> _playCurrent() async {
    final audio = currentAudio;
    if (audio == null) return;
    final path = await _resolver(audio, (_) {});
    await _player.setAudioSource(
      AudioSource.file(
        path,
        tag: MediaItem(
          id: audio.referenceId,
          title: audio.title,
          artUri: audio.thumbnail != null && audio.thumbnail!.isNotEmpty
              ? Uri.tryParse(audio.thumbnail!)
              : null,
        ),
      ),
    );
    _status = PlayerStatus.playing;
    notifyListeners();
    await _player.play();
  }

  void _onPlayerState(PlayerState state) {
    if (state.processingState == ProcessingState.completed) {
      _handleEnd();
      return;
    }
    // Keep status in sync with the engine while active.
    if (_status != PlayerStatus.stopped) {
      _status = state.playing ? PlayerStatus.playing : PlayerStatus.paused;
      notifyListeners();
    }
  }

  /// event#on_end — a song finished playing.
  Future<void> _handleEnd() async {
    if (_advancing) return;
    _advancing = true;
    try {
      final list = _playlist;
      final next = list == null
          ? null
          : indexAfterEnd(_iterationMode, _songIndex, list.length);
      if (next == null) {
        // no-repeat: stop playing, reset to paused at 00:00.
        await _player.pause();
        await _player.seek(Duration.zero);
        _status = PlayerStatus.paused;
        _currentTime = Duration.zero;
        notifyListeners();
      } else if (next == _songIndex &&
          _iterationMode == IterationMode.repeatSong) {
        await _player.seek(Duration.zero);
        await _player.play();
      } else {
        _songIndex = next;
        await _playCurrent();
      }
    } finally {
      _advancing = false;
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }
}
