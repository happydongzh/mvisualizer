(function () {
	function MVisualizer(options) {
		this.settings = options || {
			volumn: 0.3,
			effect: 'circle' //可视化效果选项 circle | rect
		};

		//XMLHttpRequest 
		this.request = null,
			//AudioContext
			this.ac,
			//Audio Analyser 音频分析器
			this.analyser,
			//音量控制器
			this.gainNode,

			//音频源节点
			this.audioSrc = null,

			//正在播放？
			this.playing = false,

			//播放计数
			this.status = 0,

			//当前音频信息
			//startOffset += context.currentTime - startTime;
			this.audioInfo = {
				audioURL: '',
				startTime: 0,
				playOffset: 0,
			},

			//canvas绘布及配置
			this.canvasConfig = null;

		if (this.settings.canvas) {
			this.canvasConfig = {
				canvas: this.settings.canvas,
				w: this.settings.canvas.width,
				h: this.settings.canvas.height,
				ctx: this.settings.canvas.getContext("2d"),
				animationReqID: 0,
				effect: this.settings.effect || 'rect'
			}
		}
	};


	//全局AudioContext--类静态变量
	MVisualizer.audioCtx = new(window.AudioContext || window.webkitAudioContext)();

	MVisualizer.prototype = {
		//初始化：初始化所有必需全局变量
		init: function () {
			var mv = this;
			mv.request = new XMLHttpRequest();
			mv.request.responseType = 'arraybuffer';
			mv.ac = MVisualizer.audioCtx;
			mv.analyser = MVisualizer.audioCtx.createAnalyser();
			mv.analyser.fftSize = 256;
			mv.gainNode = MVisualizer.audioCtx.createGain();
			mv.analyser.connect(mv.gainNode);
			mv.gainNode.connect(mv.ac.destination);
			mv.gainNode.gain.value = mv.settings.volumn || 0.3;
		},
		//播放已解码的音频数据
		play: function (decoded) {
			var mv = this;
			if (!decoded) {
				console.log('error decoding audio data');
				return;
			}
			mv.audioSrc = mv.ac.createBufferSource();
			mv.audioSrc.buffer = decoded;
			mv.audioSrc.connect(mv.analyser);
			mv.audioSrc.start(0, mv.audioInfo.playOffset % mv.audioSrc.buffer.duration);
			mv.playing = true; //播放标志
			mv.renderCanvas();
			//播放完毕，清空audio source并停止cavans可视化
			mv.audioSrc.onended = function () {
				mv.playing = false;
				mv.audioSrc = null;
				mv.stopVisualization();
			}
		},

		//暂停
		pause: function () {
			var mv = this;
			if (mv.playing && this.audioSrc != null) {
				var _curTime = mv.ac.currentTime;
				mv.audioInfo.playOffset += _curTime - mv.audioInfo.startTime;
				mv.audioInfo.startTime = _curTime;
				mv.audioSrc.stop();
				//mv.stopVisualization();
				mv.playing = false;
				mv.audioSrc = null;
			} else {
				mv.play(mv.audioInfo.audioData);
			}
		},
		//静音
		mute: function () {
			this.gainNode.gain.value = this.gainNode.gain.value != 0 ? 0 : this.settings.volumn;
		},
		//从网络加载音频数据
		load: function (url) {
			var mv = this;
			var p = ++mv.status;
			mv.request.abort();
			if (mv.audioSrc) {
				mv.audioSrc.stop();
			}
			//处理歌曲切换
			if (p != mv.status) {
				return;
			}

			mv.request.open('GET', url, true);
			mv.request.onload = function () {
				//处理歌曲切换
				if (p != mv.status) {
					return;
				}
				var _returnData = mv.request.response;
				mv.ac.decodeAudioData(_returnData, function (data) {
					//处理歌曲切换
					if (p != mv.status) {
						return;
					}
					mv.audioInfo.startTime = mv.ac.currentTime;
					mv.audioInfo.audioData = data;
					//mv.audioInfo.duration = data.buffer.duration;
					mv.audioInfo.playOffset = 0;
					mv.play(data);

				}, function () {
					console.log('出错误啦..');
				});
			};
			mv.request.onerror = function () {
				alert('XMLHttpRequest error!');
				return;
			}
			mv.request.send();
		},

		//设置音量
		changeVolum: function (value) {
			this.gainNode.gain.value = value;
			this.settings.volumn = value;
		},

		//画布canvas可视化渲染
		renderCanvas: function (cvs) {
			var mv = this;
			if (cvs) {
				mv.canvasConfig = {
					canvas: cvs.canvas,
					w: cvs.canvas.width,
					h: cvs.canvas.height,
					ctx: cvs.canvas.getContext("2d"),
					animationReqID: 0,
					effect: 'rect'
				};
			}

			if (mv.canvasConfig === null) {
				console.log('No canvas defined');
				return;
			}

			//没有音频在播放，取消animation frame 并返回
			if (!mv.playing) {
				mv.stopVisualization();
				console.log('没有歌曲播放');
				return;
			}

			var WIDTH = mv.canvasConfig.w,
				HEIGHT = mv.canvasConfig.h;
			//清空画布
			mv.canvasConfig.ctx.clearRect(0, 0, WIDTH, HEIGHT);

			var bufferLength = mv.analyser.frequencyBinCount;

			var array = new Uint8Array(bufferLength);

			var barWidth = WIDTH / bufferLength;

			//圆环型可视化效果 
			var _sigleCircleSpectrum = function () {

				if (!mv.playing) { //歌曲播放完毕，取消animation frame 返回
					mv.stopVisualization();
					return;
				}
				mv.canvasConfig.ctx.fillStyle = 'rgba(0,0,0,1)';
				mv.canvasConfig.ctx.fillRect(0, 0, mv.canvasConfig.w, mv.canvasConfig.h);
				mv.analyser.getByteFrequencyData(array);
				for (var i = 0; i < (array.length); i++) {
					var value = array[i];
					mv.canvasConfig.ctx.beginPath();
					mv.canvasConfig.ctx.arc(WIDTH / 2, HEIGHT / 2, value / 2, 0, 360, false);
					mv.canvasConfig.ctx.lineWidth = 1;
					mv.canvasConfig.ctx.strokeStyle = "rgba(" + value / 2 + "," + value / 2 + ",255,0.5)";
					mv.canvasConfig.ctx.stroke();
					mv.canvasConfig.ctx.closePath();
				}
				mv.canvasConfig.animationReqID = requestAnimationFrame(_sigleCircleSpectrum);
			}

			//柱状图效果
			var _rectSpectrum = function () {
				if (!mv.playing) { //歌曲播放完毕，取消animation frame 返回
					mv.stopVisualization();
					return;
				}
				mv.canvasConfig.animationReqID = requestAnimationFrame(_rectSpectrum);
				mv.analyser.getByteFrequencyData(array);
				mv.canvasConfig.ctx.fillStyle = 'rgb(0,0,0)';
				//mv.canvasConfig.ctx.fillStyle = '#FFF';
				mv.canvasConfig.ctx.fillRect(0, 0, WIDTH, HEIGHT);
				var barWidth = (WIDTH / bufferLength);
				var barHeight;
				var x = 0;
				mv.canvasConfig.ctx.fillStyle = 'rgb(20, 56, 155)';
				for (var i = 0; i < bufferLength; i++) {
					barHeight = array[i];
					var random = Math.random();
					//mv.canvasConfig.ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);
					mv.canvasConfig.ctx.fillRect(x, HEIGHT - barHeight, barWidth, HEIGHT);
					x += barWidth + 1;
				}
			};
			
			mv.canvasConfig.effect == 'rect' ? _rectSpectrum() : _sigleCircleSpectrum();
		},
		//关闭可视化效果
		stopVisualization: function () {
			var mv = this;
			if (mv.canvasConfig === null || !mv.playing) {
				return;
			}
			console.log('stop visualization');
			cancelAnimationFrame(mv.canvasConfig.animationReqID);
			mv.canvasConfig.ctx.clearRect(0, 0, mv.canvasConfig.w, mv.canvasConfig.h);
		},
		//启动可视化效果
		startVisualization: function () {
			var mv = this;
			if (mv.canvasConfig === null || !mv.playing) {
				console.log('No audio playing Or No canvas defined');
				return;
			}
			console.log('start visualization');
			mv.renderCanvas();
		},
		//设置循环播放
		playLoop: function (isLoop) {
			var mv = this;
			if (!mv.playing || this.audioSrc == null) {
				return;
			}
			mv.audioSrc.loop = isLoop;
		},
		//切换可视化效果
		switchVisual: function (visual) {
			var mv = this;
			if (mv.canvasConfig === null || !mv.playing) {
				console.log('No audio playing Or No canvas defined');
				return;
			}
			if (mv.canvasConfig.effect == visual) {
				return;
			}
			mv.canvasConfig.effect = visual;

			mv.stopVisualization();
			mv.startVisualization();
		},
		//播放速度控制
		changePlaySpeed: function (speed) {
			var mv = this;
			if (!mv.playing || this.audioSrc == null) {
				return;
			}
			mv.audioSrc.detune.value = speed;
		},

		changePlayRate: function (rate) {
			var mv = this;
			if (!mv.playing || this.audioSrc == null) {
				return;
			}
			mv.audioSrc.playbackRate.value = rate;
		}

	};

	window.MVisualizer = MVisualizer;

})();