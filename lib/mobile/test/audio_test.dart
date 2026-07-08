import 'package:flutter_test/flutter_test.dart';

import 'package:audio_station_mobile/models/audio.dart';

void main() {
  group('youtubeIdFromUrl', () {
    test('extracts the v query param from a watch url', () {
      expect(
        youtubeIdFromUrl('https://www.youtube.com/watch?v=vid0001'),
        'vid0001',
      );
    });

    test('extracts the id from a youtu.be short url', () {
      expect(youtubeIdFromUrl('https://youtu.be/abc123'), 'abc123');
    });

    test('falls back to the raw value when unparseable', () {
      expect(youtubeIdFromUrl('bareid'), 'bareid');
    });
  });

  test('Audio.fromSearchJson maps a /explore result', () {
    final audio = Audio.fromSearchJson({
      'title': 'lofi result 1',
      'url': 'https://www.youtube.com/watch?v=vid0001',
      'duration': '3m20s',
      'thumbnail': 'https://i.ytimg.com/vi/vid0001/hq.jpg',
    });
    expect(audio.title, 'lofi result 1');
    expect(audio.referenceId, 'vid0001');
    expect(audio.duration, '3m20s');
    expect(audio.thumbnail, 'https://i.ytimg.com/vi/vid0001/hq.jpg');
  });

  test('Audio round-trips through toMap/fromMap', () {
    const original = Audio(
      title: 'song',
      url: 'https://youtu.be/xyz',
      thumbnail: null,
      duration: '1m',
      referenceId: 'xyz',
    );
    final restored = Audio.fromMap(original.toMap());
    expect(restored.title, original.title);
    expect(restored.referenceId, original.referenceId);
    expect(restored.thumbnail, isNull);
  });
}
