import ExpoModulesCore
import Speech
import AVFoundation

public class SpeechNativeModule: Module {

  // MARK: - Properties

  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer: SFSpeechRecognizer?

  private let synthesizer = AVSpeechSynthesizer()
  private var ttsDelegate: TTSDelegate?

  // MARK: - Module Definition

  public func definition() -> ModuleDefinition {
    Name("SpeechNative")

    Events("onTranscript", "onRecordingStatusChange", "onSpeechDone", "onError")

    AsyncFunction("requestPermissions") { () -> [String: Bool] in
      let speechGranted = await self.requestSpeechPermission()
      let micGranted = await self.requestMicPermission()
      return ["granted": speechGranted && micGranted]
    }

    Function("startTranscribing") { (locale: String) in
      self.startSTT(locale: locale)
    }

    Function("stopTranscribing") {
      self.stopSTT()
    }

    Function("speak") { (text: String, language: String, rate: Double) in
      self.startTTS(text: text, language: language, rate: Float(rate))
    }

    Function("stopSpeaking") {
      self.synthesizer.stopSpeaking(at: .immediate)
    }
  }

  // MARK: - Permission Helpers

  private func requestSpeechPermission() async -> Bool {
    await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }
  }

  private func requestMicPermission() async -> Bool {
    await withCheckedContinuation { continuation in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        continuation.resume(returning: granted)
      }
    }
  }

  // MARK: - Speech-to-Text

  private func startSTT(locale: String) {
    // Clean up any existing session
    stopSTT()

    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: locale))

    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      sendEvent("onError", ["message": "Speech recognizer is not available for locale: \(locale)"])
      return
    }

    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

      let audioEngine = AVAudioEngine()
      self.audioEngine = audioEngine

      let request = SFSpeechAudioBufferRecognitionRequest()
      request.shouldReportPartialResults = true
      request.addsPunctuation = true
      request.taskHint = .dictation
      self.recognitionRequest = request

      let inputNode = audioEngine.inputNode
      let recordingFormat = inputNode.outputFormat(forBus: 0)

      guard recordingFormat.sampleRate > 0 && recordingFormat.channelCount > 0 else {
        sendEvent("onError", ["message": "Invalid audio format"])
        return
      }

      inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
        request.append(buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()

      sendEvent("onRecordingStatusChange", ["isRecording": true])

      recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
        guard let self = self else { return }

        if let error = error {
          // Cancelled tasks produce error code 216 / 1110 — ignore them
          let nsError = error as NSError
          if nsError.code == 216 || nsError.code == 1110 {
            return
          }
          self.sendEvent("onError", ["message": error.localizedDescription])
          self.stopSTT()
          return
        }

        if let result = result {
          let text = result.bestTranscription.formattedString
          self.sendEvent("onTranscript", [
            "text": text,
            "isFinal": result.isFinal,
          ])

          if result.isFinal {
            self.stopSTT()
          }
        }
      }
    } catch {
      sendEvent("onError", ["message": "Failed to start audio engine: \(error.localizedDescription)"])
      cleanupSTT()
    }
  }

  private func stopSTT() {
    recognitionTask?.cancel()
    recognitionTask = nil

    recognitionRequest?.endAudio()
    recognitionRequest = nil

    if let engine = audioEngine, engine.isRunning {
      engine.stop()
      engine.inputNode.removeTap(onBus: 0)
    }
    audioEngine = nil

    sendEvent("onRecordingStatusChange", ["isRecording": false])

    do {
      try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      // Ignore deactivation errors
    }
  }

  private func cleanupSTT() {
    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest = nil
    if let engine = audioEngine, engine.isRunning {
      engine.stop()
      engine.inputNode.removeTap(onBus: 0)
    }
    audioEngine = nil
    sendEvent("onRecordingStatusChange", ["isRecording": false])
  }

  // MARK: - Text-to-Speech

  private func startTTS(text: String, language: String, rate: Float) {
    synthesizer.stopSpeaking(at: .immediate)

    // Prepare audio session for speaker output
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.defaultToSpeaker, .allowBluetooth])
      try session.setActive(true)
    } catch {
      sendEvent("onError", ["message": "Audio session error: \(error.localizedDescription)"])
    }

    let utterance = AVSpeechUtterance(string: text)

    // Try premium voice first, fall back to default language voice
    if let premiumVoice = AVSpeechSynthesisVoice(identifier: "com.apple.voice.premium.\(language).Kyoko") {
      utterance.voice = premiumVoice
    } else {
      utterance.voice = AVSpeechSynthesisVoice(language: language)
    }

    utterance.rate = rate
    utterance.volume = 1.0

    // Set up delegate for completion callback
    let delegate = TTSDelegate { [weak self] in
      self?.sendEvent("onSpeechDone", [:])
    }
    self.ttsDelegate = delegate
    synthesizer.delegate = delegate

    synthesizer.speak(utterance)
  }
}

// MARK: - TTS Delegate

private class TTSDelegate: NSObject, AVSpeechSynthesizerDelegate {
  private let onFinish: () -> Void

  init(onFinish: @escaping () -> Void) {
    self.onFinish = onFinish
    super.init()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
    onFinish()
  }

  func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
    onFinish()
  }
}
