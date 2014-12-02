/* Setting the level of logs (error, warning, info, debug) */
Log.setLogLevel(Log.e);

/* The main object processing the mp4 files */
var mp4box;

/* object responsible for file downloading */
var downloader = new Downloader();

/* the HTML5 video element */
var video;

var startButton, loadButton, initButton;
var urlInput, chunkTimeoutInput, chunkSizeInput;
var infoDiv, dlSpeedDiv;
var chunkTimeoutLabel, chunkSizeLabel, segmentSizeLabel;
var urlSelector;
var saveChecked;

window.onload = function () {
	video = document.getElementById('v');
	startButton = document.getElementById("startButton");
	loadButton = document.getElementById("loadButton");
	initButton = document.getElementById("initButton");
	urlInput = document.getElementById('url');
	chunkTimeoutInput = document.getElementById('chunk_speed_range');
	chunkSizeInput = document.getElementById("segment_size_range");
	infoDiv = document.getElementById('infoDiv');
	dlSpeedDiv = document.getElementById('dlSpeed');
	chunkTimeoutLabel = document.querySelector('#chunk_speed_range_out');
	chunkSizeLabel = document.querySelector('#chunk_size_range_out');
	segmentSizeLabel = document.querySelector('#segment_size_range_out');
	urlSelector = document.getElementById('urlSelector');
	urlSelector.selectedIndex = -1;
	saveChecked = document.getElementById("saveChecked");
	
	video.addEventListener("seeking", onSeeking);
	loadButton.disabled = true;
	reset();	
}

/* GUI-related callback functions */
function setUrl(url) {
	urlInput.value = url;
	if (url && url !== "") {
		loadButton.disabled = false;
	} else {
		loadButton.disabled = true;
	}
}

function toggleDownloadMode(event) {
	var checkedBox = event.target;
	if (checkedBox.checked) {
		dlSpeedDiv.style.display = "none";
		downloader.setRealTime(true);
	} else {
		dlSpeedDiv.style.display = "inline";
		downloader.setRealTime(false);
	}
}

function setDownloadSpeed(value) {
	chunkTimeoutLabel.value = value;
	chunkTimeoutInput.value = value;
	downloader.setInterval(parseInt(value));
}

function setDownloadChunkSize(value) {
	chunkSizeLabel.value = value;
	downloader.setChunkSize(parseInt(value));
}

function setSegmentSize(value) {
	segmentSizeLabel.value = value;
}

/* Functions to generate the tables displaying file information */	
function resetDisplay() {
	infoDiv.innerHTML = '';
}

function getBasicTrackHeader() {
	var html = '';
	html += "<th>Track ID</th>";
	html += "<th>Track References</th>";
	html += "<th>Alternate Group</th>";
	html += "<th>Creation Date</th>";
	html += "<th>Modified Date</th>";
	html += "<th>Timescale</th>";
	html += "<th>Media Duration</th>";
	html += "<th>Number of Samples</th>";
	html += "<th>Codec</th>";
	html += "<th>Language</th>";
	html += "<th>Track Width</th>";
	html += "<th>Track Height</th>";
	html += "<th>Track Layer</th>";
	return html;
}

function getBasicTrackInfo(track) {
	var html = '';
	html += "<td>"+track.id+"</td>";
	html += "<td>";
	if (track.references.length === 0) {
		html += "none";
	} else {
		for (var i = 0; i < track.references.length; i++) {
			if (i > 0) html += "<br>";
			html += "Reference of type "+track.references[i]+" to tracks "+track.references[i].track_ids;
		}
	}
	html += "</td>";
	html += "<td>"+track.alternate_group+"</td>";
	html += "<td>"+track.created+"</td>";
	html += "<td>"+track.modified+"</td>";
	html += "<td>"+track.timescale+"</td>";
	html += "<td>"+track.duration+" ("+Log.getDurationString(track.duration,track.timescale)+") </td>";
	html += "<td>"+track.nb_samples+"</td>";
	html += "<td>"+track.codec+"</td>";
	html += "<td>"+track.language+"</td>";
	html += "<td>"+track.track_width+"</td>";
	html += "<td>"+track.track_height+"</td>";
	html += "<td>"+track.layer+"</td>";
	return html;
}

function getVideoTrackHeader() {
	var html = '';
	html += "<th>Width</th>";
	html += "<th>Height</th>";
	return html;
}

function getVideoTrackInfo(track) {
	var html = '';
	html += "<td>"+track.video.width+"</td>";
	html += "<td>"+track.video.height+"</td>";
	return html;
}

function getAudioTrackHeader() {
	var html = '';
	html += "<th>Sample Rate</th>";
	html += "<th>Channel Count</th>";
	html += "<th>Volume</th>";
	return html;
}

function getAudioTrackInfo(track) {
	var html = '';
	html += "<td>"+track.audio.sample_rate+"</td>";
	html += "<td>"+track.audio.channel_count+"</td>";
	html += "<td>"+track.volume+"</td>";
	return html;
}

function getTrackListInfo(tracks, type) {
	var html = '';
	if (tracks.length>0) {
		html += type+" track(s) info";
		html += "<table>";
		html += "<tr>";
		html += getBasicTrackHeader();
		switch (type) {
			case "Video":
				html += getVideoTrackHeader();
				break;				
			case "Audio":
				html += getAudioTrackHeader();
				break;				
			case "Subtitle":
				break;				
			case "Metadata":
				break;				
			case "Hint":
				break;				
			default:
				break;				
		}
		html += "<th>Source Buffer Status</th>";
		html += "</tr>";
		for (var i = 0; i < tracks.length; i++) {
			html += "<tr>";
			html += getBasicTrackInfo(tracks[i]);
			switch (type) {
				case "Video":
					html += getVideoTrackInfo(tracks[i]);
					break;				
				case "Audio":
					html += getAudioTrackInfo(tracks[i]);
					break;				
				case "Subtitle":
					break;				
				case "Metadata":
					break;				
				case "Hint":
					break;	
				default:
					break;
			}					
			var mime = 'video/mp4; codecs=\"'+tracks[i].codec+'\"';
			if (MediaSource.isTypeSupported(mime)) {
				html += "<td id=\"buffer"+tracks[i].id+"\">"+"<input id=\"addTrack"+tracks[i].id+"\" type=\"checkbox\">"+"</td>";
			} else {
				html += "<td>Not supported, adding as TextTrack <input id=\"addTrack"+tracks[i].id+"\" type=\"checkbox\"></td>";
			}
			html += "</tr>";
		}
		html += "</table>";	
	}
	return html;
}

function displayMovieInfo(info) {
	var html = "Movie Info";
	html += "<div>";
	html += "<table>";
	html += "<tr><th>File Size</th><td>"+downloader.getFileLength()+" bytes</td></tr>";
	html += "<tr><th>Brands</th><td>"+info.brands+"</td></tr>";
	html += "<tr><th>Creation Date</th><td>"+info.created+"</td></tr>";
	html += "<tr><th>Modified Date</th><td>"+info.modified+"</td></tr>";
	html += "<tr><th>Timescale</th><td>"+info.timescale+"</td></tr>";
	html += "<tr><th>Duration</th><td>"+info.duration+" ("+Log.getDurationString(info.duration,info.timescale)+")</td></tr>";
	html += "<tr><th>Progressive</th><td>"+info.isProgressive+"</td></tr>";
	html += "<tr><th>Fragmented</th><td>"+info.isFragmented+"</td></tr>";
	html += "<tr><th>MPEG-4 IOD</th><td>"+info.hasIOD+"</td></tr>";
	if (info.isFragmented) {
		html += "<tr><th>Fragmented duration</th><td>"+info.fragment_duration+" ("+Log.getDurationString(info.fragment_duration,info.timescale)+")</td></tr>";
	}
	html += "</table>";
	html += getTrackListInfo(info.videoTracks, "Video");
	html += getTrackListInfo(info.audioTracks, "Audio");
	html += getTrackListInfo(info.subtitleTracks, "Subtitle");
	html += getTrackListInfo(info.metadataTracks, "Metadata");
	html += getTrackListInfo(info.otherTracks, "Other");
	html += "</div>";
	infoDiv.innerHTML = html;
}

/* main functions, MSE-related */
function resetMediaSource() {
	var mediaSource;
	mediaSource = new MediaSource();
	mediaSource.video = video;
	video.ms = mediaSource;
	mediaSource.addEventListener("sourceopen", onSourceOpen);
	mediaSource.addEventListener("sourceclose", onSourceClose);
	video.src = window.URL.createObjectURL(mediaSource);
	/* TODO: remove Text tracks */
}

function onSourceClose(e) {
	var ms = e.target;
	Log.i("MSE", "Source closed, video error: "+ (ms.video.error ? ms.video.error.code : "(none)"));
	Log.d("MSE", ms);
}

function onSourceOpen(e) {
	var ms = e.target;
	Log.i("MSE", "Source opened");
	Log.d("MSE", ms);
	urlSelector.disabled = false;
}

function onInitAppended(e) {
	var sb = e.target;
	var rangeString = Log.printRanges(sb.buffered);
	Log.d("MSE - SourceBuffer #"+sb.id, "Init segment append ended ("+sb.updating+"), buffered: "+rangeString+", pending: "+sb.pendingAppends.length);
	sb.bufferTd = document.getElementById("buffer"+sb.id);
	sb.bufferTd.textContent = rangeString;
	sb.sampleNum = 0;
	sb.removeEventListener('updateend', onInitAppended);
	sb.addEventListener('updateend', onUpdateEnd.bind(sb));
	/* In case there are already pending buffers we call onUpdateEnd to start appending them*/
	onUpdateEnd.call(sb, null);
}

function onUpdateEnd(e) {
	if (e != null) {
		var rangeString = Log.printRanges(this.buffered);
		Log.i("MSE - SourceBuffer #"+this.id,"Update ended ("+this.updating+"), buffered: "+rangeString+" pending: "+this.pendingAppends.length+" media time: "+Log.getDurationString(video.currentTime));
		this.bufferTd.textContent = rangeString;
	}
	if (this.sampleNum) {
		mp4box.releaseUsedSamples(this.id, this.sampleNum);
		delete this.sampleNum;
	}
	if (this.ms.readyState == "open" && this.pendingAppends.length > 0 && !this.updating) {
		Log.i("MSE - SourceBuffer #"+this.id, "Appending new buffer");
		var obj = this.pendingAppends.shift();
		this.sampleNum = obj.sampleNum;
		this.appendBuffer(obj.buffer);
	}
}

function addSourceBufferListener(info) {
	var ms = video.ms;
	var sb;
	for (var i = 0; i < info.tracks.length; i++) {
		var track = info.tracks[i];
		var checkBox = document.getElementById("addTrack"+track.id);
		if (!checkBox) continue;
		checkBox.addEventListener("change", (function (track_id, codec) { 
			return function (e) {
				var check = e.target;
				if (check.checked) { 
					var mime = 'video/mp4; codecs=\"'+codec+'\"';
					if (MediaSource.isTypeSupported(mime)) {
						Log.i("MSE - SourceBuffer #"+track_id,"Creation with type '"+mime+"'");
						sb = ms.addSourceBuffer(mime);
						sb.ms = ms;
						sb.id = track_id;
						mp4box.setSegmentOptions(track_id, sb, { nbSamples: parseInt(segmentSizeLabel.value) } );
						sb.pendingAppends = [];
						initButton.disabled = false;
					} else {
						Log.w("MSE", "MIME type '"+mime+"' not supported for creation of a SourceBuffer for track id "+track_id);
						var textrack = v.addTextTrack("subtitles", "Text track for track "+track_id);
						mp4box.setExtractionOptions(track_id, textrack);
						//check.checked = false;
					}
				} else {
					Log.i("MSE - SourceBuffer #"+track_id,"Removing buffer");
					mp4box.unsetSegmentOptions(track_id);
					for (var i = 0; i < ms.sourceBuffers.length; i++) {
						sb = ms.sourceBuffers[i];
						if (sb.id == track_id) {
							ms.removeSourceBuffer(sb);
							break;
						}
					}
					if (ms.sourceBuffers.length === 0) {
						initButton.disabled = true;
					}
				}
			};
		})(track.id, track.codec));
	}
}

function initializeSourceBuffers() {
	mp4box.onSegment = function (id, user, buffer, sampleNum) {	
		var sb = user;
		saveBuffer(buffer, 'track-'+id+'-segment-'+sb.segmentIndex+'.m4s');
		sb.segmentIndex++;
		sb.pendingAppends.push({ id: id, buffer: buffer, sampleNum: sampleNum });
		Log.i("Application","Received new segment for track "+id+" up to sample #"+sampleNum+", segments pending append: "+sb.pendingAppends.length);
		onUpdateEnd.call(sb, null);				
	}

	mp4box.onSamples = function (id, user, samples) {	
		var texttrack = user;
		Log.i("TextTrack #"+id,"Received "+samples.length+" new sample(s)");
		for (var j = 0; j < samples.length; j++) {
			var sample = samples[j];
			if (sample.description.type == "wvtt") {
				var vtt4Parser = new VTTin4Parser();
				var cues = vtt4Parser.parseSample(sample.data);
				for (var i = 0; i < cues.length; i++) {
					var cueIn4 = cues[i];
					var cue = new VTTCue(sample.dts/sample.timescale, (sample.dts+sample.duration)/sample.timescale, cueIn4.payl.text);
					texttrack.addCue(cue);
				}
			} else {
				var xmlSub4Parser = new XMLSubtitlein4Parser();
				var xmlSubSample = xmlSub4Parser.parseSample(sample); 
				var xmlParser = new DOMParser();
				xmlParser.parseFromString = xmlSubSample.documentString;
				console.log(xmlSubSample.documentString);
			}
		}
	}

	var initSegs = mp4box.initializeSegmentation();
	for (var i = 0; i < initSegs.length; i++) {
		var sb = initSegs[i].user;
		sb.addEventListener("updateend", onInitAppended);
		Log.i("MSE - SourceBuffer #"+sb.id,"Appending initialization data");
		sb.appendBuffer(initSegs[i].buffer);
		saveBuffer(initSegs[i].buffer, 'track-'+initSegs[i].id+'-init.mp4');
		sb.segmentIndex = 0;
	}
	
	initButton.disabled = true;
	startButton.disabled = false;
}

/* main player functions */
function reset() {
	stop();
	downloader.reset();
	startButton.disabled = true;	
	resetMediaSource();
	resetDisplay();
	setUrl('');
}

function load() {
	var ms = video.ms;
	if (ms.readyState != "open") {
		return;
	}

	mp4box = new MP4Box();
	mp4box.onMoovStart = function () {
		Log.i("Application", "Starting to parse movie information");
	}
	mp4box.onReady = function (info) {
		Log.i("Application", "Movie information received");
		stop();
		if (info.isFragmented) {
			ms.duration = info.fragment_duration/info.timescale;
		} else {
			ms.duration = info.duration/info.timescale;
		}
		displayMovieInfo(info);
		addSourceBufferListener(info);
	}
				
	loadButton.disabled = true;
	startButton.disabled = true;
	stopButton.disabled = false;

	downloader.setCallback(
		function (response, end) { 
			if (response) {
				var nextStart = mp4box.appendBuffer(response);
				downloader.setChunkStart(nextStart); 
			}
			if (end) {
				mp4box.flush();
			}
		}
	);
	downloader.setInterval(parseInt(chunkTimeoutLabel.value));
	downloader.setChunkSize(parseInt(chunkSizeLabel.value));
	downloader.setUrl(urlInput.value);
	downloader.start();
}

function start() {
	startButton.disabled = true;
	stopButton.disabled = false;
	downloader.setChunkSize(parseInt(chunkSizeLabel.value));
	downloader.setInterval(parseInt(chunkTimeoutLabel.value));
	downloader.resume();
}		

function stop() {
	if (!downloader.isStopped()) {
		stopButton.disabled = true;
		startButton.disabled = false;
		downloader.stop();
	}
}		

function onSeeking(e) {
	if (video.lastSeekTime != video.currentTime) {
		/* Chrome fires twice the seeking event with the same value */
		Log.i("Application", "Seeking called to video time "+Log.getDurationString(video.currentTime));
		var seek_info = mp4box.seek(video.currentTime, true);
		downloader.stop();
		downloader.setChunkStart(seek_info.offset);
		downloader.resume();
		startButton.disabled = true;
		stopButton.disabled = false;
		video.lastSeekTime = video.currentTime;
	}
}

function computeWaitingTimeFromBuffer(v) {
	var ms = v.ms;
	var sb;
	var startRange, endRange;
	var currentTime = v.currentTime;
	var maxStartRange = 0;
	var minEndRange = Infinity;
	var duration;
	for (var i = 0; i < ms.activeSourceBuffers.length; i++) {
		sb = ms.activeSourceBuffers.item(i);
		for (var j = 0; j < sb.buffered.length; j++) {
			startRange = sb.buffered.start(j);
			endRange = sb.buffered.end(j);
			if (currentTime >= startRange && currentTime <= endRange) {
				if (startRange >= maxStartRange) maxStartRange = startRange;
				if (endRange <= minEndRange) minEndRange = endRange;
				break;
			}
		}
	}
	duration = minEndRange - maxStartRange;
	if (currentTime + duration/4 >= minEndRange) {
		return 0;
	} else {
		return 1000*(minEndRange-currentTime)/2;
	}
}

function saveBuffer(buffer, name) {		
	if (saveChecked.checked) {
		var d = new DataStream(buffer);
		d.save(name);
	}
}

