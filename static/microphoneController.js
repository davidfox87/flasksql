

function update(mic) {
  if (mic.isRecording) {
    mic.processAudio();
  }
}

function cleanup() {
  mic.cleanup();
  stopListening();
};



class Microphone {
  constructor(sampleRate = 44100, bufferLength = 4096) {
    this._sampleRate = sampleRate;

    // Shorter buffer length results in a more responsive visualization
    this._bufferLength = bufferLength;

    this._audioContext = new AudioContext();
    this._bufferSource = null;
    this._streamSource = null;
    this._scriptNode = null;
    this._recorder = null;

    this._realtimeBuffer = [];
    this._audioBuffer = [];
    this._audioBufferSize = 0;

    this._isRecording = false;

    this._setup(this._bufferLength);
  };

  get realtimeBuffer() {
    return this._realtimeBuffer;
  }

    // javascript getter
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
    // this means i can use mic instance with dot notation to call function
    //mic.isRecording
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

        // https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
        this._streamSource.connect(this._scriptNode);
        this._bufferSource.connect(this._audioContext.destination);

        // Initialize the Recorder Library
        this._recorder = new Recorder(this._streamSource);

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

      console.log((this._audioBuffer).length)

    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
  // this function plays back audio in the buffer
  // if setBuffer is successful then bufferSource.start (playback) is called else an error is thrown
  // if unsuccessful
  playback() {
    this._setBuffer().then((bufferSource) => {
      bufferSource.start();
    }).catch((e) => {
        console.log('Oh No!')
      throw "Error playing back audio: " + e.name + ". " + e.message;
    })
  }

  _setBuffer() {
    return new Promise((resolve, reject) => {
      // New AudioBufferSourceNode needs to be created after each call to start()
      console.log('inside _setBuffer()');
      this._bufferSource = this._audioContext.createBufferSource();
      this._bufferSource.connect(this._audioContext.destination);
        // where is this._audioBuffer set, when does the size become > 0???
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
    console.log('inside mic._mergeBuffers()')
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

    console.log('inside mic.startRecording()')
  }

  stopRecording() {
    if (!this._isRecording) {
      this._clearBuffer();

      // Stop the recorder instance
      this._recorder && this._recorder.stop();


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

function startListening(mic, args) {
  // Single button for recording using the mic icon
  console.log('hello');
  if (document.getElementById("recordMic")) {
    console.log('found recordMic element');
    var recordMicButton = document.getElementById("recordMic");

    recordMicButton.addEventListener("mousedown", (event) => { startRecordingWithMicButton(mic, recordMicButton); });
    recordMicButton.addEventListener("mouseup", (event) => { stopRecordingWithMicButton(mic, recordMicButton, args); });
  }
}

function stopListening() {
  if (recordMicButton) {
    recordMicButton.removeEventListener("mousedown", startRecordingWithMicButton);
    recordMicButton.removeEventListener("mouseup", stopRecordingWithMicButton);
  }
}

function startRecordingWithMicButton(mic, recordMicButton) {
    console.log('record button pressed')
    mic.startRecording();
    mic._recorder && mic._recorder.record();
    // if record mic button is pressed down, we want to keep adding to the buffer
  if (recordMicButton) {
    update(mic)
    recordMicButton.style.opacity = 0.3;
  }
}

function stopRecordingWithMicButton(mic, recordMicButton, args) {

  mic.stopRecording();
  console.log('button released')
  // Play back the audio immediately after it stops recording
  console.log(args)
  // when we release the button, buffer is cleared and sound is played
  if (args.default) {

    console.log('HELLLLOoOOOOOOOO')
    mic.playback();

    // export audio blob as wav file
    mic._recorder.exportWAV(function (blob) {

     // Clear the Recorder to start again !
        mic._recorder.clear();

        var xhr=new XMLHttpRequest();
        xhr.onload=function(e) {
            if(this.readyState === 4) {
                console.log("Server returned: ",e.target.responseText);
            }
        };
        var fd=new FormData();
        fd.append("file", blob, "test.wav");
        xhr.open("POST", "/upload", true); //trigger the upload function to store the audio file
        xhr.send(fd);
    }, ("audio/wav"));
  }

  if (recordMicButton) {
    recordMicButton.style.opacity = 1.0;
  }
}



var parameters = [
  {
    key: 'isPlayingMicInput',
    type: 'boolean',
    default: 'false',
    name: 'Test Mic Input'
  }
];

function setup(args) {
  var mic = new Microphone();
  //update(mic)
  startListening(mic, args);
};


setup(parameters[0]);


// attach another event listener to recordMicbutton
// every time a mouseup event fires, another function is called

// this function will upload the recorded audio file from the buffer