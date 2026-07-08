import 'package:flutter_test/flutter_test.dart';

import 'package:audio_station_mobile/services/player_service.dart';

void main() {
  group('indexAfterEnd (event#on_end)', () {
    test('cycle-playlist advances to the next song', () {
      expect(indexAfterEnd(IterationMode.cyclePlaylist, 0, 3), 1);
    });

    test('cycle-playlist wraps from the last song to the first', () {
      expect(indexAfterEnd(IterationMode.cyclePlaylist, 2, 3), 0);
    });

    test('repeat-song stays on the same song', () {
      expect(indexAfterEnd(IterationMode.repeatSong, 1, 3), 1);
    });

    test('no-repeat stops (returns null)', () {
      expect(indexAfterEnd(IterationMode.noRepeat, 1, 3), isNull);
    });

    test('empty playlist stops', () {
      expect(indexAfterEnd(IterationMode.cyclePlaylist, 0, 0), isNull);
    });
  });
}
