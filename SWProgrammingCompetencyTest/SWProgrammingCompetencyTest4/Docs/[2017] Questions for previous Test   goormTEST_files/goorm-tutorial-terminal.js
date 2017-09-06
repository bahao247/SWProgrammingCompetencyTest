var goorm_terminal = function() {
	this.socket = null;

	this.container = null;
	this.container_info = null;

	this.target = null;

	this.Terminal = null;
	
	this.show_runtime = false;

	this.init();
};

goorm_terminal.prototype = {
	init: function() {
		var self = this;

		this.create();
		this.socket = io.connect();

		this.socket.on('terminal_error', function(data) {
			if (self.fn && self.fn.error && typeof(self.fn.error) === 'function') {
				self.fn.error(data);
				self.fn.error = null;
			}
		});
	},

	load_without_socket: function(container) {
		var self = this;

		this.destroy();

		this.container = $(container);

		if (this.container.find('.terminal').length === 0) {
			this.container.empty();
			// this.container.prepend('<div class="terminal"></div>');
		}

		// this.target = this.container.find('.terminal');
		var geometry = self.calculate_geometry();

		this.Terminal = new Terminal({
			'cols': geometry.cols,
			'rows': geometry.rows
		});

		// self.Terminal.open(self, self.target, function() {

		// 	self.resize();

		// 	// self.target.off('click').click(function() {
		// 	// 	self.container.attr('tabindex', 0);
		// 	// 	self.container.focus();
		// 	// });
		// 	// self.target.click();
		// });
		this.Terminal.open(this.container[0]);
	},

	load: function(container, data, fn) {
		var self = this;

		this.destroy();

		this.container = $(container);
		this.fn = fn;

		if (this.container.find('.terminal').length === 0) {
			this.container.empty();
			// this.container.prepend('<div class="terminal"></div>');
			if (data.show_runtime) {
				this.show_runtime = data.show_runtime;
				
				if (this.container.siblings('.run_time_info').length === 0) {
					this.container.after('<div class="run_time_info">' + main_localization.get_value('run_time') + ' : <span class="terminal_running_time">0:00.0</span> / ' + main_localization.get_value('timeout') + ' : <span class="run_time_limit">00' + main_localization.get_value('second') + '</span></div>');
				} else {
					this.container.find('.run_time_info').show();
				}
			}
		}
		
		// if (data.margin_top) {
		// 	this.container.find('.terminal').eq(0).addClass('terminal_no_top_padding');
		// } else {
		// 	this.container.find('.terminal').eq(0).removeClass('terminal_no_top_padding');
		// }

		// this.target = this.container.find('.terminal');

		this.socket.once('container_complete', function(container_info) {
			if (container_info) {
				self.container_info = container_info;
				self.index = container_info.token;

				var geometry = self.calculate_geometry();

				self.Terminal = new Terminal({
					'cols': geometry.cols,
					'rows': geometry.rows,
					'handler': function(data) {
						self.send('pty_execute_command', {
							index: self.index,
							command: data
						});
					}
				});

				self.Terminal.open(self.container[0]);
				self.Terminal.setOption('cursorBlink', true);
				// self.target = self.container.find('.terminal');
				// self.Terminal.open(self, self.target, function() {
					// $('#quiz_term_run_loading_running').css('width', $('.quiz_term_run')[0].getBoundingClientRect().width - parseFloat($('.quiz_term_run').css('padding-left').replace('px','')) - parseFloat($('.quiz_term_run').css('padding-right').replace('px','')));
					$('.quiz_term_run').children().fadeOut();
					$('#quiz_term_run_loading_running').fadeIn();
					
					self.Terminal.write('\033[1;30m' + main_localization.get_value('msg_run_program_started') + '\r\n\033[1;39m> ');
					
					if (tutorial_editor && tutorial_editor.run_time_limit_counter_start) {
						tutorial_editor.run_time_limit_counter_start();
					}
					
					self.set_socket(container_info);

					self.send('run', {
						'token': container_info.token,
						'daemon': container_info.daemon,
						'app': container_info.app,
						'main': container_info.main,
						'run_option': container_info.run_option || '',
						'stat': data.stat
					});

					// self.set_run();
					self.resize();

					// self.target.off('click').click(function() {
					// 	self.container.attr('tabindex', 0);

					// 	if (!window.is_mobile) {
					// 		self.container.focus();
					// 	}
					// });
					// self.target.click();
				// });
			}
		});

		if (data.console) {
			this.socket.emit('console_in_container', data);
		} else {
			this.socket.emit('build_in_container', data);
		}

		// hidden - xterm supports mobile
		// if (/mobile/i.test(navigator.userAgent) || /android/i.test(navigator.userAgent)) {
		// 	$(self.target).parent().append('<textarea class="inputbox" spellcheck=false style="position:absolute; left: -9999px; z-index:-1; width:98%; height:93%; visibility:none;">');
		// 	$(self.target).parent().find('textarea.inputbox').keydown(function(e) {
		// 		if (e.keyCode === 0) {
		// 			var key = $(this).val();
		// 			self.Terminal.handler(key);
		// 			$(this).val('');
		// 		} else {
		// 			self.Terminal.keyDown(e);
		// 		}
		// 	});

		// 	self.adapt_smart_pad($(self.target)[0]);

		// 	$(self.target)[0].addEventListener('touchstart', function() {
		// 		$(self.target).parent().find('textarea.inputbox').focus();
		// 	});

		// 	$('div#terminal').css('-moz-user-select', 'none').css('-khtml-user-select', 'none').css('-webkit-user-select', 'none').css('user-select', 'none');
		// 	$('div.terminal').css('-moz-user-select', 'none').css('-khtml-user-select', 'none').css('-webkit-user-select', 'none').css('user-select', 'none');
		// }

		return this;
	},

	set_socket: function(container_info) {
		var self = this;

		var socket = this.container_socket = new io.connect(container_info.socket.url, container_info.socket.options);

		socket.on('terminal_exited.' + container_info.token, function() {
			var call_stop = function() {
				if (self.fn && self.fn.before_stop && typeof(self.fn.before_stop) === 'function') {
					self.fn.before_stop(container_info, function() {
						self.set_stop();
					});
				}
			};

			if (tutorial_editor && tutorial_editor.update_output_file) {
				tutorial_editor.update_output_file(socket, container_info.token, function() {
					call_stop();
				});
			} else {
				call_stop();
			}
		});

		socket.on('pty_notify_infinity_loop', function() {
			if (self.fn && self.fn.error && typeof(self.fn.error) === 'function') {
				self.fn.error({
					'err_type': 'infinity_loop'
				});
				self.fn.error = null;
			}

			self.set_stop();
		});

		socket.on('terminal_running_time', function(data) {
			self.set_time(data.time);
		});

		socket.on('terminal_output', function(data) {
			goorm_editor.set_output(data.output);
		});

		socket.on('pty_command_result', function(data) {
			self.Terminal.write(data.stdout);
		});

		// socket.on('pty_stat', function(data) {
		// 	console.log(data);
		// });

		socket.on('disconnect', function() {
			socket.disconnect();
		});
	},

	set_run: function() {
		/*
		var target = $('.goorm-stdout-title i.fa-terminal');

		this.interval = setInterval(function() {
			if (target.hasClass('running')) {
				target.removeClass('running');
			} else {
				target.addClass('running');
			}
		}, 500);
		*/
	},

	set_stop: function() {
		this.socket.emit('container_stop', {
			'index': this.index
		});

		if (this.container_socket) {
			this.container_socket.disconnect();
		}

		if (this.Terminal) {
			// clearInterval(this.Terminal._blink);
			this.Terminal.setOption('cursorBlink', false);
			// this.Terminal.cursorHidden = true
			this.Terminal.write('\r\n\033[1;30m' + main_localization.get_value('msg_run_program_finished'));
		}
		
		if (this.container) {
			this.container.find('.terminal-cursor').hide();
		}

		if (this.fn && this.fn.finish && typeof(this.fn.finish) === 'function') {
			this.fn.finish();
			this.fn.finish = null;
		
			if ($('.btn_stop').length) {
				$('.btn_stop').off('click');
			}
		}
	},

	set_time: function(time) {
		if (time.indexOf(' ') > -1) {
			time = time.split(' ');

			var hours = parseInt(time.shift(), 10);
			var minute = parseInt(time.shift(), 10);
			var seconds = parseInt(time.shift(), 10);
			var last = time.shift(); // .1234

			// if (hours !== 0) {
			// 	if (minute > 9) {
			// 		time = hours + lang.time_hour + ' ' + minute + lang.time_minute;
			// 	} else if (minute > 0) {
			// 		time = hours + lang.time_hour + ' 0' + minute + lang.time_minute;
			// 	}
			// } else {
				if (minute !== 0) {
					time = Math.max(minute, 0) + main_localization.get_value('time_minute') + ' ' + Math.max(seconds, 0) + main_localization.get_value('time_second');
				} else {
					time = Math.max(seconds, 0) + '.' + Math.max(last, 0) + main_localization.get_value('time_second');
				}
			// }
		}

		$('.terminal_running_time').text(time);
	},

	create: function() {
		var self = this;

		$(window).one('unload', function() {
			self.destroy();
		});
	},

	focus: function() {
		this.container.attr('tabindex', 0);
		this.container.focus();
	},

	destroy: function() {
		if (this.target) {
			this.target.remove();
			this.target = null;
		}
		
		if (this.container) {
			this.container.remove();
			this.container = null;
		}
		
		if (this.container_socket) {
			this.container_socket.disconnect();
		}
		
		if (this.Terminal) {
			this.fn = {};
			this.set_stop();

			this.index = null;

			this.Terminal = null;

			this.set_time('0:00.00');
		}
	},

	resize: function() {
		if (this.container && this.Terminal) {
			var geometry = this.calculate_geometry();

			this.send('terminal_resize', {
				'index': this.index,
				'cols': geometry.cols,
				'rows': geometry.rows
			});

			this.Terminal.resize(geometry.cols, geometry.rows);
		}
	},

	calculate_geometry: function() {
		var geometry = {};
		var div_height = parseInt(this.container.css('line-height'), 10);
		var font_size = parseInt(this.container.css('font-size'), 10);
		var height;
		var width;

		// seongho : I calculate the pixels. floor(font_size * 0.625) is real width of pixels
		var font_width = Math.floor(font_size * 0.5818079); // jeongmin: changed number -> it's statistical!!
		var parent = this.container;
		// if (font_width == 6) // but font_size:11px is exception. Calculation value is 6px, but in real, 7px
		// 	font_width = 7;	// hidden by jeongmin: more accurate column will be calculated below, anyway

		// for target space
		height = parseInt(parent.height(), 10); // 10 for leaving margins
		width = parseInt(parent.width() - 40, 10); // 40 for leaving margins, paddings

		// for text space
		geometry.rows = Math.floor((height) / div_height); // 10 for leaving margins
		geometry.cols = Math.floor((width - 10) / font_width); // 10 for leaving margins
		////// jeongmin: sometimes, width is much smaller than it is. So, reset its width as its parent's width //////

		// this.target.width(width);
		// this.target.outerHeight(parent.height() - (this.target.siblings('.clr_view').length ? this.target.siblings('.clr_view').outerHeight() : 0)); // full terminal height

		if (geometry.cols <= 0 || geometry.rows <= 0 || isNaN(geometry.cols)) { //it can be NaN - divide by 0
			geometry.cols = 1000;
			geometry.rows = 10;
		} else { // column experiment: check if caculated column exactly fits to target's width with font-size and font-family
			///seongho.cha : some browers not fit upper fomula because of spacing. it will calculate real width...
			var dummy = 'dummy_terminal';
			var dummy_str = (new Array(geometry.cols + 1)).join('a'); // dummy text

			$('#' + dummy).html(dummy_str); // put dummy text to dummy terminal

			if ($('#' + dummy).width() > width) { // calculated column is too many for width -> text will be hidden
				while ($('#' + dummy).width() > width) { // until calculated column exactly fits to terminal width
					geometry.cols -= 1; // calculated column is too many, so decrease
					dummy_str = dummy_str.slice(1); // what if shorter dummy text?
					$('#' + dummy).html(dummy_str); // check again
				}
			}/* else if ($('#' + dummy).width() < width) { // calculated column is too few for width -> text will go over to next line
				while ($('#' + dummy).width() < width) { // until calculated column exactly fits to terminal width
					geometry.cols += 1; // calculated column is too few, so increase
					dummy_str = dummy_str + 'a'; // what if longer dummy text?
					$('#' + dummy).html(dummy_str); // check again
				}

				geometry.cols -= 1; // text should be inside of width, so decrease one more time
			}*/
		}

		geometry.cols -= 2; // give some margin

		return geometry;
	},

	send: function(namespace, options) {
		if (this.container_socket) {
			this.container_socket.emit(namespace, options);
		}
	},

	adapt_smart_pad: function(target) {
		function touch_handler(event) {
			var touches = event.changedTouches;
			var first = touches[0];
			var type = '';
			switch (event.type) {
				case 'touchstart':
					type = 'mousedown';
					break;
				case 'touchmove':
					type = 'mousemove';
					break;
				case 'touchend':
					type = 'mouseup';
					break;
				default:
					return;
			}

			var simulated_event = document.createEvent('MouseEvent');
			simulated_event.initMouseEvent(type, true, true, document, 1,
				first.screenX, first.screenY,
				first.clientX, first.clientY, false,
				false, false, false, 0, null);

			first.target.dispatchEvent(simulated_event);

			event.preventDefault();
		}

		target.addEventListener('touchstart', touch_handler, true);
		target.addEventListener('touchmove', touch_handler, true);
		target.addEventListener('touchend', touch_handler, true);
		target.addEventListener('touchcancel', touch_handler, true);
	}
};


if (typeof(define) === 'undefined') {
	goorm_terminal.prototype.create();
} else {
	define(function(){
		return goorm_terminal;
	});	
}
