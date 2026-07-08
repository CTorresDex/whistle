package com.audiostation.audio_station_mobile

import com.ryanheise.audioservice.AudioServiceActivity

// Extends AudioServiceActivity so media-button intents reach the background
// audio service used by just_audio_background.
class MainActivity : AudioServiceActivity()
