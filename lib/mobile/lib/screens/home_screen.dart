import 'package:flutter/material.dart';

/// view#home — empty page with a "Coming Soon" message.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Audio Station')),
      body: const Center(
        child: Text(
          'Coming Soon',
          key: Key('home-coming-soon'),
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}
