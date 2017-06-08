class ProgressBar {
	constructor() {
		this.el = this.createElement();
		this.textEl = this.el.querySelector('.progress-text');
		this.progressBar = this.el.querySelector('.bar');
		document.body.prepend(this.el);
	}

	createElement() {
		/*
		<div class="progress-bar">
			<span class="progress-text"></span>
			<div class="container">
				<div class="bar"></div>
			</div>
		</div>
		*/

		let el = document.createElement('div');
		el.classList.add('progress-bar');

		let text = document.createElement('div');
		text.classList.add('progress-text');

		let container = document.createElement('div');
		container.classList.add('container');

		let progressBar = document.createElement('div');
		progressBar.classList.add('bar');

		el.append(text);
		el.append(container);
		container.append(progressBar);

		return el;
	}

	text(text) {
		this.textEl.textContent = text;
	}

	show() {
		this.el.style.display = '';
	}

	hide() {
		this.el.style.display = 'none';
	}

	update(value) {
		this.progressBar.style.width = `${value * 100}%`;
	}
}

export default ProgressBar;
