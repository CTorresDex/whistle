import 'package:flutter/material.dart';
import 'package:just_audio_background/just_audio_background.dart';

import 'screens/landing_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Enables background playback + a media notification for just_audio.
  await JustAudioBackground.init(
    androidNotificationChannelId:
        'com.audiostation.audio_station_mobile.channel.audio',
    androidNotificationChannelName: 'Audio Station',
    androidNotificationOngoing: true,
  );
  runApp(const AudioStationApp());
}

class AudioStationApp extends StatelessWidget {
  const AudioStationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Audio Station',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF10B981),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const LandingScreen(),
    );
  }
}
