Pod::Spec.new do |s|
  s.name           = 'SpeechNative'
  s.version        = '1.0.0'
  s.summary        = 'iOS native speech recognition and text-to-speech module for Expo'
  s.description    = 'Uses SFSpeechRecognizer and AVSpeechSynthesizer for on-device speech processing'
  s.author         = ''
  s.homepage       = 'https://github.com/anthropics/claude-code'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'Speech', 'AVFoundation'

  s.source_files = '**/*.swift'
end
