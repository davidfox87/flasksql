'use strict';

function setup(args, ctx) {
  ctx.mic = new Microphone();

  startListening(ctx.mic, args, ctx);
};

function update(args, ctx) {
  if (ctx.mic.isRecording) {
    ctx.mic.processAudio();
    onVisualizeBuffer(ctx.mic.realtimeBuffer, ctx);
  }
}

function cleanup(args, ctx) {
  ctx.mic.cleanup();

  stopListening(ctx);
};

var parameters = [
  {
    key: 'isPlayingMicInput',
    type: 'boolean',
    default: 'false',
    name: 'Test Mic Input'
  }
];

class Microphone {
  constructor(sampleRate = 44100, bufferLength = 4096) {
    this._sampleRate = sampleRate;
    // Shorter buffer length results in a more responsive visualization
    this._bufferLength = bufferLength;

    this._audioContext = new AudioContext();
    this._bufferSource = null;
    this._streamSource = null;
    this._scriptNode = null;

    this._realtimeBuffer = [];
    this._audioBuffer = [];
    this._audioBufferSize = 0;

    this._isRecording = false;

    this._setup(this._bufferLength);
  };

  get realtimeBuffer() {
    return this._realtimeBuffer;
  }

  get isRecording() {
    return this._isRecording;
  }

  _validateSettings() {
    if (!Number.isInteger(this._sampleRate) || this._sampleRate < 22050 || this._sampleRate > 96000) {
      throw "Please input an integer samplerate value between 22050 to 96000";
    }

    this._validateBufferLength();
  }

  _validateBufferLength() {
    const acceptedBufferLength = [256, 512, 1024, 2048, 4096, 8192, 16384]
    if (!acceptedBufferLength.includes(this._bufferLength)) {
      throw "Please ensure that the buffer length is one of the following values: " + acceptedBufferLength;
    }
  }

  _setup(bufferLength) {
    this._validateSettings();

    // Get microphone access
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
        this._streamSource = this._audioContext.createMediaStreamSource(stream);
        this._scriptNode = this._audioContext.createScriptProcessor(bufferLength, 1, 1);
        this._bufferSource = this._audioContext.createBufferSource();

        this._streamSource.connect(this._scriptNode);
        this._bufferSource.connect(this._audioContext.destination);
      }).catch ((e) => {
        throw "Microphone: " + e.name + ". " + e.message;
      })
    } else {
      throw "MediaDevices are not supported in this browser";
    }
  }

  processAudio() {
    // Whenever onaudioprocess event is dispatched it creates a buffer array with the length bufferLength
    this._scriptNode.onaudioprocess = (audioProcessingEvent) => {
      if (!this._isRecording) return;

      this._realtimeBuffer = audioProcessingEvent.inputBuffer.getChannelData(0);

      // Create an array of buffer array until the user finishes recording
      this._audioBuffer.push(this._realtimeBuffer);
      this._audioBufferSize += this._bufferLength;
    }
  }

  playback() {
    this._setBuffer().then((bufferSource) => {
      bufferSource.start();
    }).catch((e) => {
      throw "Error playing back audio: " + e.name + ". " + e.message;
    })
  }

  _setBuffer() {
    return new Promise((resolve, reject) => {
      // New AudioBufferSourceNode needs to be created after each call to start()
      this._bufferSource = this._audioContext.createBufferSource();
      this._bufferSource.connect(this._audioContext.destination);

      let mergedBuffer = this._mergeBuffers(this._audioBuffer, this._audioBufferSize);
      let arrayBuffer = this._audioContext.createBuffer(1, mergedBuffer.length, this._sampleRate);
      let buffer = arrayBuffer.getChannelData(0);

      for (let i = 0, len = mergedBuffer.length; i < len; i++) {
        buffer[i] = mergedBuffer[i];
      }

      this._bufferSource.buffer = arrayBuffer;

      resolve(this._bufferSource);
    })
  }

  _mergeBuffers(bufferArray, bufferSize) {
    // Not merging buffers because there is less than 2 buffers from onaudioprocess event and hence no need to merge
    if (bufferSize < 2) return;

    let result = new Float32Array(bufferSize);

    for (let i = 0, len = bufferArray.length, offset = 0; i < len; i++) {
      result.set(bufferArray[i], offset);
      offset += bufferArray[i].length;
    }
    return result;
  }

  startRecording() {
    if (this._isRecording) return;

    this._clearBuffer();
    this._isRecording = true;
  }

  stopRecording() {
    if (!this._isRecording) {
      this._clearBuffer();
      return;
    }

    this._isRecording = false;

  }

  _clearBuffer() {
    this._audioBuffer = [];
    this._audioBufferSize = 0;
  }

  cleanup() {
    this._streamSource.disconnect(this._scriptNode);
    this._bufferSource.disconnect(this._audioContext.destination);
    this._audioContext.close();
  }
}

function startListening(mic, args, ctx) {
  // Single button for recording using the mic icon
  if (document.getElementById("recordMic")) {
    ctx.recordMicButton = document.getElementById("recordMic");

    ctx.recordMicButton.addEventListener("mousedown", (event) => { startRecordingWithMicButton(mic, ctx); });
    ctx.recordMicButton.addEventListener("mouseup", (event) => { stopRecordingWithMicButton(mic, args, ctx); });
  }
}

function stopListening(ctx) {
  if (ctx.recordMicButton) {
    ctx.recordMicButton.removeEventListener("mousedown", startRecordingWithMicButton);
    ctx.recordMicButton.removeEventListener("mouseup", stopRecordingWithMicButton);
  }
}

function startRecordingWithMicButton(mic, ctx) {
  mic.startRecording();

  if (ctx.recordMicButton) {
    ctx.recordMicButton.style.opacity = 0.3;
  }
}

function stopRecordingWithMicButton(mic, args, ctx) {
  mic.stopRecording();

  console.log(args)
  // Play back the audio immediately after it stops recording
  if (args.isPlayingMicInput) {
    console.log('HELLLLOoOOOOOOOO')
    mic.playback();
  }

  if (ctx.recordMicButton) {
    ctx.recordMicButton.style.opacity = 1.0;
  }
}


var canvas = document.getElementById("ctx");
var ctx = canvas.getContext('2d');
setup(parameters[0].key, ctx);
update(parameters[0].key, ctx)