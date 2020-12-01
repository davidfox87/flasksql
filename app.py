from flask import Flask, render_template
from flask import render_template, flash, redirect, request, url_for, make_response
from flask_assets import Bundle, Environment
from flask import jsonify
from scipy.io import wavfile
from matplotlib import pyplot as plt
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory
from util import log_specgram, int_sequence_to_text, predict_
from sklearn.preprocessing import StandardScaler
import numpy as np
import json

from keras.models import load_model
import keras.backend as K
from keras.optimizers import SGD

model2 = load_model('model/test3.h5')
loss = {'ctc': lambda y_true, y_pred: y_pred}
optimizer = SGD(lr=0.02, decay=1e-6, momentum=0.9, nesterov=True, clipnorm=5)

model2.compile(loss=loss, optimizer=optimizer)

model2.summary()

app = Flask(__name__)
UPLOAD_FOLDER = './UPLOADED_AUDIO'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TEMPLATES_AUTO_RELOAD'] = True

js = Bundle('microphoneController.js', 'jquery-3.5.1.min.js', 'recorder.js', output='gen/main.js')
assets = Environment(app)
assets.register('main_js', js)


@app.route('/')
def index():
	return render_template('index.html')

# https://blog.addpipe.com/using-recorder-js-to-capture-wav-audio-in-your-html5-web-site/
@app.route('/upload', methods=['GET', 'POST'])
def upload():
	if request.method == "POST":
		file = request.files['file']
		filename = secure_filename(file.filename)

		file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
		print(file.filename, type(file), file.filename.split('.')[0])
	return render_template('index.html')

@app.route('/predict', methods=['GET', 'POST'])
def predict():
	rate, audio = wavfile.read('UPLOADED_AUDIO/filename.wav')
	data_point = log_specgram(audio, rate)

	scaler = StandardScaler()
	data_point = scaler.fit_transform(data_point)

	pred_ = predict_(data_point, model2, 'model/model_0.h5')
	print(str(pred_))

	return jsonify(result=str(pred_))


if __name__ == "__main__":
	app.run(debug=True)
