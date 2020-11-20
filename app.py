from flask import Flask, render_template
from flask import render_template, flash, redirect, request, url_for
from flask_assets import Bundle, Environment
from flask import jsonify
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory
from scipy.io import wavfile
from matplotlib import pyplot as plt

app = Flask(__name__)
UPLOAD_FOLDER = './UPLOADED_AUDIO'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


js = Bundle('index.js', 'recorder.js', output='gen/main.js')
assets = Environment(app)
assets.register('main_js', js)


@app.route('/uploads/<filename>')
def uploaded_file(filename):
	return send_from_directory(app.config['UPLOAD_FOLDER'],
							   filename)

@app.route('/')
def index():
	return render_template('index.html')

# https://blog.addpipe.com/using-recorder-js-to-capture-wav-audio-in-your-html5-web-site/
@app.route('/', methods=['POST'])
def upload_file():
	if request.method == 'POST':
		# we will get the file from the request
		if request.method == "POST":
			file = request.files['file']
			print(file.filename)
			filename = secure_filename(file.filename)

			file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
			print(file.filename, type(file), file.filename.split('.')[0])

			return redirect(url_for('uploaded_file',
									filename=filename))
		else:
			return render_template("index.html")

if __name__ == "__main__":
	app.run(debug=True)
