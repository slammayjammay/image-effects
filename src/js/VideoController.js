const { app } = window.require('electron').remote;
import { join } from 'path';
import EventEmitter from 'events';
import 'gsap';

const DELAY_UNTIL_FADEOUT = 1000;

class VideoController extends EventEmitter {
	constructor() {
		super();

		this.controlsEl = document.querySelector('.video-controls');
		this.playButton = this.controlsEl.querySelector('.play-pause');
		this.seekerEl = this.controlsEl.querySelector('.seek');

		this.playIcon = join(app.getAppPath(), './images/play-icon.png');
		this.pauseIcon = join(app.getAppPath(), './images/pause-icon.png');
	}

	load(filePath) {
		return new Promise((resolve, reject) => {
			this.videoEl = document.createElement('video');
			this.videoEl.src = filePath;
			this.videoEl.load();

			const onLoad = () => {
				this.addVideoControls();
				resolve(this.videoEl);

				this.videoEl.removeEventListener('canplay', onLoad);
			};

			this.videoEl.addEventListener('canplay', onLoad);
		});
	}

	addVideoControls() {
		setTimeout(() => this.fadeOutControls, DELAY_UNTIL_FADEOUT);

		// play / pause
		this.playButton.addEventListener('click', () => {
			if (this.videoEl.paused) {
				this.play();
			} else {
				this.pause();
			}
		});
		// update when video ends as well
		this.videoEl.addEventListener('ended', () => {
			this.playButton.style.backgroundImage = `url(${this.playIcon})`;
		});

		// update seek bar when playing
		this.videoEl.addEventListener('timeupdate', e => {
			if (this.seeking) {
				return;
			}

			let currentTime = this.videoEl.currentTime;
			let totalDuration = this.videoEl.duration;
			let progress = currentTime / totalDuration;

			this.seekerEl.value = progress * 100;
		});

		// keep track of whether the user clicks and holds the seek button
		this.seekerEl.addEventListener('mousedown', () => this.seeking = true);
		this.seekerEl.addEventListener('mouseup', () => this.seeking = false);

		// set video current time when seeked
		this.seekerEl.addEventListener('change', e => {
			let progress = this.seekerEl.value / 100;
			let totalDuration = this.videoEl.duration;
			this.videoEl.currentTime = totalDuration * progress;
		});

		// fade in / fade out controls
		document.body.addEventListener('mousemove', e => {
			this.fadeInControls();
			clearTimeout(this.id);

			if (!this.controlsEl.contains(e.target)) {
				this.id = setTimeout(() => this.fadeOutControls(), DELAY_UNTIL_FADEOUT);
			}
		});

		// always show controls on hover
		this.controlsEl.addEventListener('mouseenter', () => clearTimeout(this.id));
		this.controlsEl.addEventListener('mouseleave', () => {
			this.fadeOutControls();
		});
	}

	fadeInControls() {
		TweenMax.to(this.controlsEl, 0.5, { opacity: 1 });
	}

	fadeOutControls() {
		TweenMax.to(this.controlsEl, 0.5, { opacity: 0 });
	}

	play() {
		this.videoEl.play();
		this.playButton.style.backgroundImage = `url(${this.pauseIcon})`;

		const play = () => {
			this.playId = requestAnimationFrame(play);
			this.emit('draw');
		};

		play();
	}

	pause() {
		this.videoEl.pause();
		this.playButton.style.backgroundImage = `url(${this.playIcon})`;

		cancelAnimationFrame(this.playId);
	}

	restart() {
		this.videoEl.pause();
		this.videoEl.currentTime = 0;
	}
}

export default VideoController;
