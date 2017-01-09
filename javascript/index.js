window.onload = function () {
	var v = new MVisualizer({
		canvas: document.getElementById("canvas"),
		effect: 'circle',
		volumn: 0.3
	});
	v.init();

	var ulSongs = document.getElementById('songList');

	ulSongs.addEventListener('click', function (e) {
		if (e.currentTarget != e.target) {
			var _l = e.currentTarget.children;
			for (var i = 0; i < _l.length; i++) {
				_l[i].className = '';
			}
			v.load('./resource/' + e.target.title + '.mp3');
			e.target.className = 'active';
		}
	}, false);

	document.getElementById('volumnBtn').addEventListener('change', function () {
		v.changeVolum(this.value / 100);
	}, false);

	document.getElementById('pauseNplay').addEventListener('click', function () {
		this.innerHTML = (this.innerHTML.indexOf('暂停') == -1) ? '⏸️ &nbsp;暂停' : '▶️&nbsp;播放';
		v.pause();
	}, false);

	document.getElementById('visualization').addEventListener('change', function () {
		v.switchVisual(this.value);
	}, false);

	document.getElementById('playSpeed').addEventListener('change', function () {
		v.changePlaySpeed(this.value);
		//console.log(this.value);
	}, false);

	document.getElementById('playRate').addEventListener('change', function () {
		v.changePlayRate(this.value / this.min);
	}, false);

	document.getElementById('stopVisualization').addEventListener('click', function () {
		if (this.className.indexOf('disable') == -1) {
			this.className = 'disable';
			v.stopVisualization()
		} else {
			this.className = '';
			v.startVisualization();
		}
	}, false);


	document.getElementById('loop').addEventListener('click', function () {
		v.playLoop(this.checked);
	}, false);

	document.getElementById('mute').addEventListener('click', function () {
		this.className = this.className.indexOf('disable') == -1 ? 'disable' : '';
		v.mute();
	}, false);
};