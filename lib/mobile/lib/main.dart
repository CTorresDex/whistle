import 'package:flutter/material.dart';

import 'screens/landing_screen.dart';

void main() {
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
