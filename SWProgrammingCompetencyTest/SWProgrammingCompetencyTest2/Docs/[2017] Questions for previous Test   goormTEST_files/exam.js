define(['main.localization'], function(localization) {
	var exam_common = {
		exam_index: null,
		user_id: null,
		is_student: false,
		is_teacher: false,

		exam_end_date: null,
		exam_allow_exceed_deadline: false,
		exam_exceed_deadline_days: 0,
		exam_remain_time: 0,

		sync_time_interval: -1,
		blink_time_interval: -1,

		init: function(options) {
			var self = this;
			
			this.lecture_index = options.lecture_index;
			this.exam_index = options.exam_index;
			this.user_id = options.user_id;
			this.is_student = options.is_student;
			this.is_teacher = options.is_teacher;
			this.is_admin = options.is_admin;

			if (this.exam_index !== 'quiz_preview') {
				this.init_timer();
			}
		},

		init_timer: function() {
			var self = this;
			if (!this.is_student && !this.is_teacher && !this.user_id) {
				this.sync_time();
			} else {
				var random_interval = (Math.floor(Math.random() * 300) + 300) * 1000;
				this.sync_time();
				this.sync_time_interval = setInterval(function() {
					self.sync_time();
				}, random_interval);
			}
		},

		sync_time: function() {
			var self = this;

			$.get('/exam/getdate', {
				exam_index: this.exam_index
			}, function(res) {
				if (res) {
					var exam_date = res.exam_date;
					var personal_date = res.personal_date || false;

					self.exam_remain_time = res.remain_time;
					self.set_popover_text(res);
					//set end date
					if (personal_date && personal_date.start_time && personal_date.end_time) {
						self.exam_end_date = personal_date.end_time;
					} else if (exam_date.end_date) {
						self.exam_end_date = exam_date.end_date; // exam_end_date for current exam.
					} else {
						self.exam_end_date = null;
					}
					
					self.exam_allow_exceed_deadline = exam_date.allow_exceed_deadline || false;
					self.exam_exceed_deadline_days = exam_date.exceed_deadline_days || 0;
					
					if (!(self.is_teacher || self.is_admin) && self.check_end_deadline() && !exam_date.allow_exceed_deadline_access) {
						if(typeof tutorial_editor !== 'undefined') {
							tutorial_editor.is_link_unload = true;
						}
						
						toast.show(localization.get_value('exam_openable_setting_change'), {
							'method': 'warning',
							'forever': true
						});
						
						$.debounce(5000, function () {
							location.href = '/learn/lecture/' + btoa(self.lecture_index);
						})();
					}

					clearInterval(self.blink_time_interval);
					self.blink_time_interval = setInterval(function() {
						self.blink_time();
						self.exam_remain_time -= 1000;
					}, 1000);
				} else {
					self.exam_end_date = null;
				}
			});
		},

		blink_time: function() {
			if (!this.exam_end_date) {
				clearInterval(this.sync_time_interval);
				clearInterval(this.blink_time_interval);

				$('#exam_countdown_clock .exist_limit').hide();
				$('#exam_countdown_clock .ended_exam').hide();
				$('#exam_countdown_clock .no_limit, .quiz_save, .quiz_submit, .submit_answer').show();

			} else {
				var end_time = new Date(this.exam_end_date).getTime();
				var remain_time = this.exam_remain_time; //end_time - new Date().getTime();

				var limit = null;

				var _h = Math.floor(remain_time / 1000 / (60*60));
				var _m = Math.floor(remain_time / 1000 / 60 % 60);
				var _s = Math.floor(remain_time / 1000 % 60);

				if (remain_time <= 0) {
					clearInterval(this.sync_time_interval);
					clearInterval(this.blink_time_interval);

					$('#exam_countdown_clock .exist_limit').hide();
					$('#exam_countdown_clock .no_limit').hide();
					$('#exam_countdown_clock .ended_exam').show();

					is_end_exam = true;

					this.check_end_deadline();
					
					$('.quiz_save, .quiz_submit, .submit_answer').toggle(!is_end_deadline);
				} else if (_h < 24) {
					is_end_exam = false;
					if (_m <= 9) {
						_m = '0' + _m;
					}
					if (_s <= 9) {
						_s = '0' + _s;
					}
					limit = _h + ':' + _m + ':' + _s;

					$('#exam_countdown_clock .ended_exam').hide();
					$('#exam_countdown_clock .no_limit').hide();
					$('#exam_countdown_clock .exist_limit, .quiz_save, .quiz_submit, .submit_answer').show();

					$('#exam_countdown_clock .clock').text(limit);
				} else {
					limit = Math.floor(_h / 24) + localization.get_value('exam_date');
					var extra_h = _h % 24;
					if (extra_h > 0) {
						limit = limit + ' ' + extra_h + localization.get_value('exam_hours');
					}

					$('#exam_countdown_clock .ended_exam').hide();
					$('#exam_countdown_clock .no_limit').hide();
					$('#exam_countdown_clock .exist_limit, .quiz_save, .quiz_submit, .submit_answer').show();

					$('#exam_countdown_clock .clock').text(limit);
				}
			}
		},
		
		check_end_deadline: function () {
			if(this.exam_remain_time > 0) {
				is_end_deadline = false;
			} else if (this.exam_allow_exceed_deadline && this.exam_exceed_deadline_days) {
				var deadline_time = new Date(this.exam_end_date).getTime() + 1000 * 60 * 60 * 24 * this.exam_exceed_deadline_days - new Date().getTime();

				if (deadline_time <= 0) {
					is_end_deadline = true;
				} else {
					is_end_deadline = false;
				}
			} else {
				is_end_deadline = true;
			}
			
			return is_end_deadline;
		},

		set_popover_text: function(data) {
			var exam_date = data.exam_date;
			var personal_date = data.personal_date || false;
			
			$('.popover:not(.tour)').remove();
			var text = '';
			
			if (exam_date) {
				if (exam_date.start_date) {
					var date = new Date(exam_date.start_date);
					text += localization.get_value('exam_start_time2') + ' : ' + (date.getMonth() + 1) + localization.get_value('month') + ' ' + date.getDate() + localization.get_value('exam_date') + ' ' + date.getHours() + localization.get_value('hour') + ' ' + date.getMinutes() + localization.get_value('minute') + '<br>';
				}
				if (exam_date.end_date) {
					var date = new Date(exam_date.end_date);
					text += localization.get_value('exam_end_time2') + ' : ' + (date.getMonth() + 1) + localization.get_value('month') + ' ' + date.getDate() + localization.get_value('exam_date') + ' ' + date.getHours() + localization.get_value('hour') + ' ' + date.getMinutes() + localization.get_value('minute') + '<br>';
					
					if (exam_date.allow_exceed_deadline) {
						if (exam_date.exceed_deadline_days) {
							var date = new Date(date.getTime() + 1000 * 60 * 60 * 24 * exam_date.exceed_deadline_days);
							text += localization.get_value('additional_submit_time') + ' : ' + (date.getMonth() + 1) + localization.get_value('month') + ' ' + date.getDate() + localization.get_value('exam_date') + ' ' + date.getHours() + localization.get_value('hour') + ' ' + date.getMinutes() + localization.get_value('minute') + '<br>';
						}
						if (exam_date.exceed_deadline_penalty_percent) {
							text += localization.get_value('deduction_per_day') + '  : -' + exam_date.exceed_deadline_penalty_percent + '%<br>';
						}
					}
				} else {
					text += localization.get_value('exam_end_time2') + ' : ' + localization.get_value('exam_end_date_none') + '<br>';
				}
				
				if (personal_date) {
					if (personal_date.start_time) {
						var date = new Date(personal_date.start_time);
						text = '최초 접속 시각 : ' + (date.getMonth() + 1) + localization.get_value('month') + ' ' + date.getDate() + localization.get_value('exam_date') + ' ' + date.getHours() + localization.get_value('hour') + ' ' + date.getMinutes() + localization.get_value('minute') + '<br>';
					}

					if (personal_date.end_time) {
						var date = new Date(personal_date.end_time);
						text += '시험 종료 예정 시각 : ' + (date.getMonth() + 1) + localization.get_value('month') + ' ' + date.getDate() + localization.get_value('exam_date') + ' ' + date.getHours() + localization.get_value('hour') + ' ' + date.getMinutes() + localization.get_value('minute') + '<br>';
					}
				}
				
			} else {
				text += localization.get_value('exam_end_time2') + ' : ' + localization.get_value('exam_end_date_none') + '<br>';
			}
			
			$('.test_time_button').attr('data-content', text);
		}
	};

	return exam_common;
});