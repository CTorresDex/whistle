import 'audio.dart';

/// class#playlist — an ordered collection of audios.
class Playlist {
  Playlist({List<Audio>? audios, this.name}) : audios = audios ?? <Audio>[];

  final List<Audio> audios;
  final String? name;

  bool get isEmpty => audios.isEmpty;
  int get length => audios.length;

  Audio operator [](int index) => audios[index];
}
