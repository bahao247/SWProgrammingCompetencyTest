var g_tour = {
	init: function(tour_type, localization) {
		var self = this;
		this.localization = localization;
		this.replay_trigger = $('#replay_tour');

		this.tour = new Tour({
			name: 'tutorial_exam_tour',
			backdrop: true,
			smartPlacement: false,
			// storage: false,
			autoscroll: false,
			template: [
				'<div class="popover tour">',
					'<div class="arrow"></div>',
					'<h3 class="popover-title"></h3>',
					'<div class="popover-content"></div>',
					'<div class="popover-navigation">',
						'<div class="btn-group">',
							'<button class="btn btn-sm btn-default" data-role="prev">« ' + localization.get_value('prev') + '</button>',
							// '<span data-role="separator">|</span>',
							'<button class="btn btn-sm btn-default" data-role="next">' + localization.get_value('next') + ' »</button>',
						'</div>',
						'<button class="btn btn-sm btn-default" data-role="end">' + localization.get_value('quit') + '</button>',
					'</div>',
				'</div>'
			].join(''),
			g_shadow_backdrop: true,

		});
		
// console.log('tour_type:', tour_type)
		switch (tour_type) {
			case 'programming.exam':
				this.add_programming_exam_step();
				break;
			case 'web.exam':
				this.add_web_exam_step();
				break;
			case 'gui.exam':
				this.add_gui_exam_step();
				break;
			case 'robo.block.exam':
				this.add_robo_block_exam_step();
				break;
			case 'robo.code.exam':
				this.add_robo_code_exam_step();
				break;
		}


		$(document).on('editor_loaded exam_menu_loaded', function() {
			self.start();
		});

		this.replay_trigger.on('click', function() {
			this.restart();
		});
	},

	init_shadow_style: function(t) {
		if (t._options.g_shadow_backdrop) {

			var head = document.head || document.getElementsByTagName('head')[0];
			var previous_style = document.getElementById('tour_style');
			var style = document.createElement('style');
			var spread = Math.sqrt(Math.pow(document.body.offsetHeight, 2) + Math.pow(document.body.offsetWidth, 2)) + 100;
			var css = [
				'.tour-backdrop {display:none !important;}',
				'.tour-step-background {background:transparent !important; border:2px solid; border-color:papayawhip; box-shadow:0 0 0 ', spread + 'px rgba(255, 255, 255, 0.6);}'
			].join('');

			if (head && previous_style) {
				head.removeChild(previous_style);
			}

			style.type = 'text/css';
			style.id = 'tour_style';
			if (style.styleSheet) {
				style.styleSheet.cssText = css;
			} else {
				style.appendChild(document.createTextNode(css));
			}

			head.appendChild(style);
		}
	},
	start: function() {
		this.tour.start();
	},
	restart: function() {
		localStorage.removeItem('tutorial_exam_tour_current_step');
		localStorage.removeItem('tutorial_exam_tour_end');
		var head = document.head || document.getElementsByTagName('head')[0];
		var previous_style = document.getElementById('tour_style');

		if (head && previous_style) {
			head.removeChild(previous_style);
		}

		this.start();
	},

	add_programming_exam_step: function() {
		this.tour.addSteps([
			{ // 안내
				title: this.localization.get_value('guidance') + ' (1/7)',
				content: this.localization.get_value('msg_tour_guidance'),
				orphan: true,
				onHide: this.init_shadow_style
			},
			{ // 문제 설명
				element: '.instruction_content',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (2/7)',
				content: this.localization.get_value('msg_tour_quizdesc'),
				placement: 'right',
			},
			{ // 코드 에디터
				element: '.goorm-quiz-tab .tab-content',
				title: this.localization.get_value('code_editor') + ' (3/7)',
				content: this.localization.get_value('msg_tour_editor'),
				placement: 'bottom',
				reflex: 'keyup'
			},
			{ // 코드 실행
				element: '.quiz_term_run',
				title: this.localization.get_value('code_run') + ' (4/7)',
				content: this.localization.get_value('msg_tour_run'),
				placement: 'left'
			},
			{ // 실행 결과
				element: '#goorm-stdout-wrapper',
				title: this.localization.get_value('result') + ' (5/7)',
				content: this.localization.get_value('msg_tour_result'),
				placement: 'top'
			},
			{ // 제출
				element: '.quiz_submit',
				title: this.localization.get_value('submit') + ' (6/7)',
				content: this.localization.get_value('msg_tour_submit'),
				placement: 'left'
			},
			{ // 시작
				title: this.localization.get_value('start') + ' (7/7)',
				content: this.localization.get_value('msg_tour_end'),
				orphan: true,
				duration: 2000
			}
		]);
	},

	add_web_exam_step: function() {
		this.tour.addSteps([
			{
				title: this.localization.get_value('guidance') + ' (1/7)',
				content: this.localization.get_value('msg_tour_guidance'),
				orphan: true,
				onHide: this.init_shadow_style
			},
			{
				element: '.instruction_content',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (2/7)',
				content: this.localization.get_value('msg_tour_quizdesc'),
				placement: 'right',
			},
			{
				element: '.goorm-quiz-tab .tab-content',
				title: this.localization.get_value('code_editor') + ' (3/7)',
				content: this.localization.get_value('msg_tour_editor'),
				placement: 'bottom',
				reflex: 'keyup'
			},
			{
				element: '.quiz_term_run',
				title: this.localization.get_value('code_run') + ' (4/7)',
				content: this.localization.get_value('msg_tour_web_run'),
				placement: 'left'
			},
			{
				element: '.result_tab_open_btn',
				title: this.localization.get_value('result') + ' (5/7)',
				content: this.localization.get_value('msg_tour_web_result'),
				placement: 'top'
			},
			{
				element: '.quiz_submit',
				title: this.localization.get_value('submit') + ' (6/7)',
				content: this.localization.get_value('msg_tour_submit'),
				placement: 'left'
			},
			{
				title: this.localization.get_value('start') + ' (7/7)',
				content: this.localization.get_value('msg_tour_end'),
				orphan: true,
				duration: 2000
			}
		]);
	},
	add_gui_exam_step: function() {
		this.tour.addSteps([
			{
				title: this.localization.get_value('guidance') + ' (1/6)',
				content: this.localization.get_value('msg_tour_guidance'),
				orphan: true,
				onHide: this.init_shadow_style
			},
			{
				element: '.instruction_content',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (2/6)',
				content: this.localization.get_value('msg_tour_quizdesc'),
				placement: 'right',
			},
			{
				element: '.goorm-quiz-tab .tab-content',
				title: this.localization.get_value('code_editor') + ' (3/6)',
				content: this.localization.get_value('msg_tour_editor'),
				placement: 'bottom',
				reflex: 'keyup'
			},
			{
				element: '.quiz_term_run',
				title: this.localization.get_value('code_run') + ' (4/6)',
				content: this.localization.get_value('msg_tour_gui_run'),
				placement: 'left'
			},
			{
				element: '.quiz_submit',
				title: this.localization.get_value('submit') + ' (5/6)',
				content: this.localization.get_value('msg_tour_submit'),
				placement: 'left'
			},
			{
				title: this.localization.get_value('start') + ' (6/6)',
				content: this.localization.get_value('msg_tour_end'),
				orphan: true,
				duration: 2000
			}
		]);
	},
	add_robo_block_exam_step: function() {
		this.tour.addSteps([
			{
				title: this.localization.get_value('guidance') + ' (1/8)',
				content: this.localization.get_value('msg_tour_guidance'),
				orphan: true,
				onHide: this.init_shadow_style
			},
			{
				element: '#arena_display_toggle',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (2/8)',
				content: this.localization.get_value('msg_tour_robo_quizdesc1'),
				placement: 'left',
				onShown: function() {
					$('#arena_display_toggle').click();
				}
			},
			{
				element: '.instruction_content',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (3/8)',
				content: this.localization.get_value('msg_tour_robo_quizdesc2'),
				placement: 'right',
				onHidden: function() {
					$('#arena_display_toggle').click();
				}
			},
			{
				element: '#content_blocks',
				title: this.localization.get_value('block_editor') + ' (4/8)',
				content: this.localization.get_value('msg_tour_robo_block_editor'),
				placement: 'left'
			},
			{
				element: '.quiz_term_run',
				title: this.localization.get_value('block_run') + ' (5/8)',
				content: this.localization.get_value('msg_tour_run'),
				placement: 'left'
			},
			{
				element: '#arena_container',
				title: this.localization.get_value('result') + ' (6/8)',
				content: this.localization.get_value('msg_tour_robo_result'),
				placement: 'right'
			},
			{
				element: '.quiz_submit',
				title: this.localization.get_value('submit') + ' (7/8)',
				content: this.localization.get_value('msg_tour_robo_submit'),
				placement: 'left'
			},
			{
				title: this.localization.get_value('start') + ' (8/8)',
				content: this.localization.get_value('msg_tour_end'),
				orphan: true,
				duration: 2000
			}
		]);
	},
	add_robo_code_exam_step: function() {
		this.tour.addSteps([
			{
				title: this.localization.get_value('guidance') + ' (1/8)',
				content: this.localization.get_value('msg_tour_guidance'),
				orphan: true,
				onHide: this.init_shadow_style
			},
			{
				element: '#arena_display_toggle',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (2/8)',
				content: this.localization.get_value('msg_tour_robo_quizdesc1'),
				placement: 'left',
				onShown: function() {
					$('#arena_display_toggle').click();
				}
			},
			{
				element: '.instruction_content',
				title: this.localization.get_value('quiz') + ' ' + this.localization.get_value('description') + ' (3/8)',
				content: this.localization.get_value('msg_tour_robo_quizdesc2'),
				placement: 'right',
				onHidden: function() {
					$('#arena_display_toggle').click();
				}
			},
			{
				element: '.goorm-quiz-tab .tab-content',
				title: this.localization.get_value('code_editor') + ' (4/8)',
				content: this.localization.get_value('msg_tour_editor'),
				placement: 'left',
				reflex: 'keyup'
			},
			{
				element: '.quiz_term_run',
				title: this.localization.get_value('code_run') + ' (5/8)',
				content: this.localization.get_value('msg_tour_run'),
				placement: 'left'
			},
			{
				element: '#arena_container',
				title: this.localization.get_value('result') + ' (6/8)',
				content: this.localization.get_value('msg_tour_robo_result'),
				placement: 'right'
			},
			{
				element: '.quiz_submit',
				title: this.localization.get_value('submit') + ' (7/8)',
				content: this.localization.get_value('msg_tour_robo_submit'),
				placement: 'left'
			},
			{
				title: this.localization.get_value('start') + ' (8/8)',
				content: this.localization.get_value('msg_tour_end'),
				orphan: true,
				duration: 2000
			}
		]);
	}
};
var init_shadow_style = function(t) {
	if (t._options.g_shadow_backdrop) {
		
		var head = document.head || document.getElementsByTagName('head')[0];
		var previous_style = document.getElementById('tour_style');
		var style = document.createElement('style');
		var spread = Math.sqrt(Math.pow(document.body.offsetHeight, 2) + Math.pow(document.body.offsetWidth, 2)) + 100;
		var css = [
			'.tour-backdrop {display:none !important;}',
			'.tour-step-background {background:transparent !important; border:2px solid; border-color:papayawhip; box-shadow:0 0 0 ', spread + 'px rgba(255, 255, 255, 0.6);}'
		].join('');
		
		if (head && previous_style) {
			head.removeChild(previous_style);
		}

		style.type = 'text/css';
		style.id = 'tour_style';
		if (style.styleSheet) {
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}

		head.appendChild(style);
	}
};
// var g_tour = new Tour({
// 	name: 'tutorial_exam_tour',
// 	backdrop: true,
// 	smartPlacement: false,
// 	// storage: false,
// 	autoscroll: false,
// 	template: [
// 		'<div class="popover tour">',
// 			'<div class="arrow"></div>',
// 			'<h3 class="popover-title"></h3>',
// 			'<div class="popover-content"></div>',
// 			'<div class="popover-navigation">',
// 				'<div class="btn-group">',
// 					'<button class="btn btn-sm btn-default" data-role="prev">« 이전</button>',
// 					// '<span data-role="separator">|</span>',
// 					'<button class="btn btn-sm btn-default" data-role="next">다음 »</button>',
// 				'</div>',
// 				'<button class="btn btn-sm btn-default" data-role="end">그만보기</button>',
// 			'</div>',
// 		'</div>'
// 	].join(''),
// 	g_shadow_backdrop: true,

// });

// g_tour.addSteps([
// 	{
// 		title: '안내 (1/8)',
// 		content: '시작에 앞서, 화면 구성을 간단하게 설명드리겠습니다.',
// 		orphan: true,
// 		onHide: init_shadow_style
// 	},
// 	{
// 		element: '.instruction_content',
// 		title: '문제 설명 (2/8)',
// 		content: '우선 문제의 설명을 천천히 읽어주세요.',
// 		placement: 'right',
// 	},
// 	{
// 		element: '.goorm-quiz-tab .tab-content',
// 		title: '코드 에디터 (3/8)',
// 		content: '코드는 여기에 작성합니다.',
// 		placement: 'bottom',
// 		reflex: 'keyup'
// 	},
// 	{
// 		element: '.quiz_term_run',
// 		title: '코드 실행 (4/8)',
// 		content: '그리고 실행 버튼을 누르면,',
// 		placement: 'left'
// 	},
// 	{
// 		element: '#goorm-stdout-wrapper',
// 		title: '실행 결과 (5/8)',
// 		content: '이 곳에서 실행 결과를 확인할 수 있습니다.',
// 		placement: 'top'
// 	},
// 	{
// 		element: '.quiz_submit',
// 		title: '제출 (6/8)',
// 		content: '문제를 풀고 나서 <b style="color:red;">반드시!!</b> 제출 버튼을 눌러주세요. <br>마지막으로 제출된 코드를 기준으로 채점합니다.',
// 		placement: 'left'
// 	},
// 	{
// 		element: '.learnpage_curriculum_list_btn',
// 		title: '문제 목록 (7/8)',
// 		content: '<b>다른 문제</b>들은 이 버튼을 클릭하면 볼 수 있습니다.<br>놓치는 문제가 없도록 주의하세요.',
// 		placement: 'right',
// 		onShown: function() {
// 			$('.learnpage_curriculum_list_btn').click();
// 		},
// 		onHidden: function() {
// 			$('.learnpage_curriculum_list_btn').click();
// 		}
// 	},
// 	{
// 		title: '시작 (8/8)',
// 		content: '만점을 기원합니다!',
// 		orphan: true,
// 		duration: 2000
// 	}
// ]);

// var replay_tour = $('#replay_tour');
// if (replay_tour) {
// 	replay_tour.click(function() {
// 		localStorage.removeItem('tutorial_exam_tour_current_step');
// 		localStorage.removeItem('tutorial_exam_tour_end');
// 		var head = document.head || document.getElementsByTagName('head')[0];
// 		var previous_style = document.getElementById('tour_style');

// 		if (head && previous_style) {
// 			head.removeChild(previous_style);
// 		}

// 		g_tour.start();
// 	});
// }
// g_tour.init();

// if (typeof(define) === 'undefined') {
// 	window.g_tour = g_tour;
// } else {
// 	define(['bootstrap-tour'], function() {
// 		return g_tour;
// 	});
// }