/// class#audio — a single playable audio track.
///
/// [referenceId] is the YouTube video id and is the stable identity used by the
/// local storage; it must not be confused with the autoincremental id the
/// backend assigns to a downloaded audio.
class Audio {
  const Audio({
    required this.title,
    required this.url,
    required this.thumbnail,
    required this.duration,
    required this.referenceId,
  });

  final String title;
  final String url;
  final String? thumbnail;

  /// Human-readable duration as produced by the server (e.g. "3m20s").
  final String duration;
  final String referenceId;

  /// Builds an [Audio] from a /explore youtube-search result
  /// ({title, url, duration, thumbnail}). The referenceId is derived from the
  /// video url.
  factory Audio.fromSearchJson(Map<String, dynamic> json) {
    final url = (json['url'] as String?) ?? '';
    return Audio(
      title: (json['title'] as String?) ?? '',
      url: url,
      thumbnail: json['thumbnail'] as String?,
      duration: (json['duration'] as String?) ?? '',
      referenceId: youtubeIdFromUrl(url),
    );
  }

  Map<String, dynamic> toMap() => {
        'referenceId': referenceId,
        'title': title,
        'url': url,
        'thumbnail': thumbnail,
        'duration': duration,
      };

  factory Audio.fromMap(Map<String, dynamic> map) => Audio(
        title: map['title'] as String? ?? '',
        url: map['url'] as String? ?? '',
        thumbnail: map['thumbnail'] as String?,
        duration: map['duration'] as String? ?? '',
        referenceId: map['referenceId'] as String? ?? '',
      );

  Audio copyWith({String? thumbnail}) => Audio(
        title: title,
        url: url,
        thumbnail: thumbnail ?? this.thumbnail,
        duration: duration,
        referenceId: referenceId,
      );
}

/// Extracts the YouTube video id from a watch url, a youtu.be short url, or a
/// bare id. Falls back to the raw string when nothing else matches so an audio
/// always has a non-empty identity.
String youtubeIdFromUrl(String url) {
  if (url.isEmpty) return url;
  final uri = Uri.tryParse(url);
  if (uri == null) return url;
  final v = uri.queryParameters['v'];
  if (v != null && v.isNotEmpty) return v;
  if (uri.host.contains('youtu.be') && uri.pathSegments.isNotEmpty) {
    return uri.pathSegments.last;
  }
  if (uri.pathSegments.isNotEmpty) return uri.pathSegments.last;
  return url;
}
