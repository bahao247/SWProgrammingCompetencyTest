define(['main.localization', 'exam.common'], function(localization, exam_common) {
	var menu = {
		STATE_CLASS: ['ongoing', 'success', 'challenge', 'submitted'],
		STATE_ICON: ['<i></i>',
					 '<i class="fa fa-check-circle"></i>',
					 '<i class="fa fa-minus-circle"></i>',
					 '<i class="fa fa-arrow-circle-up"></i>'],

		lecture_index: '',
		exam_index: '',
		quiz_index: '',
		exam_data: {},

		accessable_quiz_list: [],

		exam_end_date: null,
		tree_container: null,
		
		pathname: document.location.pathname.indexOf('learn') !== -1 ? '/learn' : '/apply',
		user_agent: navigator.userAgent,

		anon_start_time: null,
		sync_time_interval: -1,
		blink_interval: -1,

		init: function(options) {
			var self = this;
			this.lecture_index = options.lecture_index;
			this.exam_index = options.exam_index;
			this.quiz_index = options.quiz_index;
			this.tree_container = options.tree_container;
			this.is_student = options.is_student;
			this.is_teacher = options.is_teacher;
			this.user_id = options.user_id;

			exam_common.init(options);
			this.exam_common = exam_common;

			loader.hide();
			$(document).trigger('exam_menu_loaded');
			
			if (!this.is_student) {
				$('.my_lecture_btn').addClass('disabled');
			}
			
			$('.header_title_link').attr('href', '/' + (self.pathname === '/learn' ? 'lecture' : 'test') + '/' + btoa(self.lecture_index));

			$.get('/exam/get', {
				index: self.exam_index
			}, function(exam_data) {
				self.exam_data = exam_data || {};

				self.load();
			});
		},

		load: function() {
			var self = this;
			
			if (this.exam_index !== 'quiz_preview'){
				this.init_tree();
				this.init_event();
				this.init_socket();
			}

			setTimeout(function() { 
				loader.hide();
			}, 1500);
		},

		init_event: function() {
			var self = this;

			$('.learnpage_curriculum_list_btn').on('click', function() {
				$(this).blur();
				if (!$(this).hasClass('disabled')) {
					var $list = $('.learnpage_curriculum_list');
					if ($list.is(':visible')) {
						$(this).removeClass('list_open');

						$list.hide();
						$('.instruction_content').show();
						$('.emphasis_content').show();
					} else {
						$(this).addClass('list_open');

						$list.show();
						$('.instruction_content').hide();
						$('.emphasis_content').hide();
					}
				}
			});

			$('.learnpage_curriculum_list_close').on('click', function() {
				$('.learnpage_curriculum_list_btn').removeClass('list_open');
				$('.learnpage_curriculum_list').hide();
				$('.instruction_content').show();
				$('.emphasis_content').show();
			});

			$(document).on('click', '#g_confirm_ok', function () {
				window.location.href = self.pathname + "/my";
			});
			
			if (/mobile/i.test(self.user_agent) || /android/i.test(self.user_agent)) {}
			else {
				$('.lecture-guide').resizable({
					handles: 'e',
					minWidth: 360,
					maxWidth: $(window).width() * 0.7,
					helper: "ui-resizable-helper-e",
					create: function() {
						$(this).find('.ui-resizable-e').append('<i class="fa fa-arrows-h"></i>');
					},
					stop: function(e, ui) {
						var w_width = $(window).width();
						var width_percent = ui.size.width / w_width * 100;
						$(this).css('width', width_percent.toString() + '%');
						ui.element.next().css('width', (100 - width_percent).toString() + '%');
					}
				});

				$('.result_content').resizable({
					handles: 'n',
					minHeight: 100,
					maxHeight: $(window).height() * 0.7,
					helper: 'ui-resizable-helper-n',
					create: function() {
						$(this).find('.ui-resizable-n').append('<i class="fa fa-sort"></i>');
					},
					stop: function(e, ui) {
						$(this).css({
							'width': '100%',
							'bottom': 0,
							'top': '',
							'height': 'initial'
						});

						var mini_tab_height = $('.running_result_header').is(':visible') ? parseInt($('.running_result_header').css('height'), 10) : 0;
						$('#result_tab .tab-content').css('height', (ui.size.height - 12 - mini_tab_height) + 'px');
						/*
						$('.ui-resizable-handle').css('height') = "12px"
						$('.result_tab_open_btn').css('height') = "53px" (removed)
						*/

						if (window.tutorial_editor && window.tutorial_editor.resize) {
								window.tutorial_editor.resize();
						}
					}
				});
			}
		},

		init_tree: function() {
			var self = this;
			if (this.exam_data) {
				var converted_data = [];

				var exam_info = {
					text: '<span class="chapter">' + this.exam_data.title.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>',
					href: '#'
				};

				exam_info.nodes = [];

				if (this.exam_data.quizlist && this.exam_data.quizlist.length !== 0) {
					$.get('/quiz/get_label', {
						'exam_index': this.exam_index,
						'quizlist': this.exam_data.quizlist
					}, function(result) {
						self.init_stat(result);
						if(result && result.length && typeof(result) !== 'string') {
							for(var j = 0; j < self.exam_data.quizlist.length; j++) {
								for (var i = 0; i < result.length; i++) {
									var item = result[i];
									
									if(item.index === self.exam_data.quizlist[j]) {
										var quiz_info = {
											'href': self.pathname + '/exam/' + btoa(self.exam_index) + '/quiz/' + btoa(item.index),
											'index': item.index
										};

										var state = 0;

										if (item.result_hidden) {
											if (item.last_submit_date) {
												state = 3;
											}
										} else {
											if (item.solved_count > 0) {
												if (item.solved_count == item.input_count) {
													state = 1;
												} else {
													state = 2;
												}
											} else {
												if (item.last_submit_date) {
													if (item.solved_count === 0 && item.input_count === 0) {
														state = 1;
													}
												}
											}
										}
										

										quiz_info.text = [
											'<span class="lesson ', self.STATE_CLASS[state], '">',
												self.STATE_ICON[state],
												'<i class="fa fa-code"></i> ',
												item.title,
													[
														item.difficulty ? '<span class="info" data-toggle="tooltip" data-placement="left" title="' + localization.get_value('difficulty') + '"><i class="fa fa-star"></i> ' + item.difficulty + '</span>': '',
														item.score ? '<span class="info" data-toggle="tooltip" data-placement="left" title="' + localization.get_value('points') + '">' + item.score + localization.get_value('points') + '</span>': ''
													].join(''),
											'</span>'].join('');

										if (quiz_info.index == self.quiz_index) {
											quiz_info.state = {
												checked: true
											};
										}
										exam_info.nodes.push(quiz_info);

										self.push_to_list(item.index);
										// self.accessable_quiz_list.push({
										// 	'index': item.index
										// });
									}
								}
							}
						} else { // if fail to get label data, just make quiz list
							for(var i = 0; i < self.exam_data.datalist.length; i++) {
								var item = self.exam_data.datalist[i];

								var quiz_info = {
									'href': self.pathname + '/exam/' + btoa(self.exam_index) + '/quiz/' + btoa(item.index),
									'index': item.index
								};

								var state = 0;
								quiz_info.text = [
									'<span class="lesson ', self.STATE_CLASS[state], '">',
										self.STATE_ICON[state],
										'<i class="fa fa-code"></i> ',
										item.title,
									'</span>'].join('');

								if (quiz_info.index == self.quiz_index) {
									quiz_info.state = {
										checked: true
									};
								}
								exam_info.nodes.push(quiz_info);

								self.push_to_list(item.index);
								// self.accessable_quiz_list.push({
								// 	'index': item.index
								// });
							}
						}
						
						if (self.exam_data.normal_datalist && self.exam_data.normal_datalist.length !== 0) {
							var _quiz_index = self.exam_data.normal_datalist[0].index;
							var quiz_info = {
								'href': self.pathname + '/exam/' + btoa(self.exam_index) + '/quiz/' +btoa(_quiz_index),
								'index':_quiz_index
							};

							quiz_info.text = [
								'<span class="lesson">',
									'<i></i><i class="fa fa-file-text-o"></i> ',
									localization.get_value('normal_type_quiz'),
								'</span>'].join('');

							if (_quiz_index == self.quiz_index) {
								quiz_info.state = {
									checked: true
								};
							}
							exam_info.nodes.push(quiz_info);

							self.push_to_list(_quiz_index);
							// self.accessable_quiz_list.push({
							// 	'index': _quiz_index
							// });
						}
						
						converted_data.push(exam_info);

						self.tree_container.treeview({
							levels: 2,
							data: converted_data,
							enableLinks: true,
							collapseIcon: 'glyphicon'
						});
						
						$('[data-toggle="tooltip"]').tooltip();
						
						$('.learnpage_curriculum_list_btn').removeClass('disabled');
						self.init_nav();
						
					});
				}
			}
		},
		
		init_stat: function(data) {
 			if (data && data.length) {
 				if ($('.q_submit_count').text() == $('.q_total_count').text()) {
 					$('.header_stat').addClass('all_submitted');
 					$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
 				}
 			}
		},

		init_nav: function() {
			var list = this.accessable_quiz_list;

			var prev_quiz = null;
			var next_quiz = null;

			for (var i = 0; i < list.length; i++) {
				if (this.quiz_index == list[i].index) {
					if (list[i - 1]) {
						prev_quiz = list[i - 1];
					}

					if (list[i + 1]) {
						next_quiz = list[i + 1];
					}
					break;
				}
			}

			if (prev_quiz) {
				$('.nav_prev')
					.removeClass('disabled')
					.attr('href', this.pathname + '/exam/' + btoa(this.exam_index) + '/quiz/' + btoa(prev_quiz.index));
			}

			if (next_quiz) {
				$('.nav_next')
					.removeClass('disabled')
					.attr('href', this.pathname + '/exam/' + btoa(this.exam_index) + '/quiz/' + btoa(next_quiz.index));
			}
		},

		init_socket: function() {
			this.socket = io.connect();
			this.socket.emit('entrance_to_exam', {
				'exam_index': this.exam_index
			});

			var self = this;

			this.socket.on('edited_exam_data', function(msg) {
				// exam_common.set_popover_text({
				// 	'exam_date': msg
				// });
				// self.exam_end_date = msg.end_date;
				// self.exam_allow_exceed_deadline = msg.allow_exceed_deadline;
				// self.exam_exceed_deadline_days = msg.exceed_deadline_days;
				exam_common.init_timer();
				
				if (new Date(exam_common.exam_end_date) > new Date()) {
  					is_end_exam = false;
  				} else {
  					is_end_exam = true;
 				}
				
				toast.show(localization.get_value('msg_changed_exam_time'), {
					'method': 'warning'
				});
			});
		},

		push_to_list: function(index) {
			var _list = this.accessable_quiz_list;
			var already_in = false;

			for (var i = 0 ; i < _list.length; i++) {
				if (_list[i].index == index) {
					already_in = true;
					break;
				}
			}

			if (!already_in) {
				this.accessable_quiz_list.push({
					index: index
				});
			}
		}
	};

	return menu;
});