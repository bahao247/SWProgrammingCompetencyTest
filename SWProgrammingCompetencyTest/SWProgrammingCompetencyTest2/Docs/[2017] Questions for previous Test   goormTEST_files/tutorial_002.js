var tutorial_editor = {
	'socket': null,
	'container_socket': {},
	'gui_screen_size': {
		'width': 480,
		'height': 320
	},
	'editors': {},
	'ot_object': {},
	'ot_socket': null,
	'run_terminal': null,
	'terminals': {},
	'session': {},
	'backup': {},
	'data': {},
	'quiz_data': {},
	'web_docker_available': false,
	'web_run_queue': [],
	'programming_process_running': false,
	'process_killer_timeout': 0,
	'backup_server_url': '',

	'collaboration_quiz': ['programming', 'gui', 'web', 'arduino', 'unittest', 'skulpt'],

	removed_bookmarks: [],
	// arduino 
	'chrome_extension_id': 'jcmgepajkglnookmnfhjfjfmpodiihkn',
	port: null,
	arduino_language: 'uno',
	port_connected: null,
	port_test: null,
	is_scratchduino: false,
	user_agent: navigator.userAgent,
	no_scratchduino: false,
	initial_screen_size: null,
	scratchduino_tabs: {
		'blocks': 'Blocks',
		'arduino': 'Arduino'
	},
	scratchduino_blocks_offset: {
		left: null,
		top: null
	},
	quiz_submitted: false,
	hasFlash: false,
	
	is_link_unload: false,

	'load': function(next) {
		var self = this;

		window.is_mobile = /mobile/i.test(self.user_agent) || /android/i.test(self.user_agent);
		this.lecture_index = $('[name="dashboard_lecture_index_input"]').val();
		this.lesson_index = $('[name="dashboard_lesson_index_input"]').val();
		this.exam_index = $('[name="dashboard_exam_index_input"]').val();
		this.quiz_data.setting = $('[name="dashboard_quiz_setting_input"]').val();
		this.quiz_data.form = $('[name="dashboard_quiz_form"]').val();
		this.quiz_data.run_time_limit = parseFloat($('[name="dashboard_quiz_run_time_limit"]').val(), 10);
		this.quiz_data.index = $('[name="dashboard_quiz_index_input"]').val();
		this.initial_screen_size = window.innerHeight;
		this.show_run_res_usage = $('[name="dashboard_quiz_show_run_res_usage"]').val() === 'true' ? true : false;
		this.lecture_is_sample = $('[name="dashboard_lecture_is_sample"]').val() === 'true' ? true : false;
		this.backup_server_url = $('[name="dashboard_backup_server_url"]').val() ? $('[name="dashboard_backup_server_url"]').val() : '';

		if (this.quiz_data.run_time_limit <= 0) {
			this.quiz_data.run_time_limit = 60; //set default if invalid value.
		}
		
		$.get('/auth/get', function(session) {
			self.set_session();
			self.create(session);
			self.init_event();

			if (is_student && is_collaboration) {
				self.set_ot_connect();

				CodeMirror.defineExtension('grm_force_composition_end', function(cm) {
					var input = this.TextareaInput;

					if (input.textarea) { // textarea
						if (input.composing) {
							input.poll();
							input.composing.range.clear();
							input.composing = null;
						}
					} else { // contenteditable
						input.forceCompositionEnd();
					}
				});
			}

			if (next && typeof(next) === 'function') {
				next();
			}
		});

		var arduino_tab = $('.goorm-quiz-tab goorm-editor[form="arduino"]');
		if (arduino_tab.length > 0) {
			self.arduino_language = arduino_tab.attr('board');
		}

		if ($('.goorm-quiz-tab goorm-editor[form="web"]').length > 0) {			
			if (self.run_terminal) {
				self.run_terminal.destroy();
			}
			
			if ($('.goorm-stdout-container').length === 0) {
				$('.goorm-stdout-wrapper').append('<div class="goorm-stdout-container terminal-style" tabindex="0"></div>');
			}
			
			self.run_terminal = new goorm_terminal();
			self.run_terminal.load_without_socket($('.goorm-stdout-container'));
		}

		if ((navigator.appName == 'Netscape' && this.user_agent.indexOf('Trident') > -1) || (this.user_agent.indexOf("msie") > -1) || self.user_agent.indexOf("Edge") > -1) {
			this.no_scratchduino = true;
		}

		try {
			var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
			if (fo) {
				this.hasFlash = true;
			}
		} catch (e) {
			if (navigator.mimeTypes && navigator.mimeTypes['application/x-shockwave-flash'] !== undefined && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
				this.hasFlash = true;
			}
		}
	},

	get_random_string: function(bits) {
		var chars, rand, i, ret;

		chars = 'abcdefghijklmnopqr12345678abcdefghijklmnopqrstuvwxyz012345678912';
		ret = '';

		while (bits > 0) {
			// 32-bit integer
			rand = Math.floor(Math.random() * 0x100000000);
			// base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
			for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
				ret += chars[0x3F & rand >>> i];
			}
		}

		return ret;
	},

	set_session: function() {
		if (!/anonymous_/.test(this.session.user_id)) {
			this.session.id = this.get_random_string(54);
		} else {
			this.session.id = this.session.user_id.substring(10, this.session.user_id.length);
		}
	},

	create: function(session) {
		var self = this;
		var tab_id = 0;
		
		// make editor
		this.socket = io.connect();
		var lint_socket = io.connect();
		
		var is_arduino = false;
		var is_exam = /\/exam\//.test(location.pathname);
		var selected_lang = localStorage['grm_t_edt_' + (is_exam ? this.exam_index : this.lesson_index) + '_selected_lang'];
		var tab_found = 0;
		
		if (selected_lang) {
 			tab_found = $('.goorm-editor[goorm-tab="' + selected_lang + '"]').length;
 		}
		
		if (!tab_found) {
 			selected_lang = $('.goorm-editor[goorm-tab]').eq(0).attr('goorm-tab');
 		}

		// make tab
		$('goorm-tabs').each(function(i, e) {
			var nav = $("<nav class='_nav' role='navigation'>");
			var ul = $('#myTabs');
			
			$(e).find('.goorm-editor').wrapAll('<div class="tab-content">').each(function(j, l) {
				var id = "edu_tab_" + (tab_id++);
				var name = ($(this).attr("goorm-tab")) ? $(this).attr("goorm-tab") : $(this).attr("src");
				var wrapper = $('<div id="' + id + '" class="tab-pane"> role="tabpanel"');
				var is_scratchduino_tab = '';

				if ($(this).hasClass('goorm-scratchduino')) {
					name = scratchduino_lang[$(this).attr('localization_key')];
					is_scratchduino_tab = ' scratchduino-key="' + $(this).attr('localization_key') + '" ';
				}

				if (selected_lang == name) {
					wrapper.addClass("active");
					$('#lang_select_menu .selected_lang').text(name);
					
					ul.append("<li class='active'><a href='#" + id + "' data-toggle='tab' role='tab'" + is_scratchduino_tab + ">" + name + "</a></li>");
				} else {
					ul.append("<li><a href='#" + id + "'  data-toggle='tab' role='tab'" + is_scratchduino_tab + ">" + name + "</a></li>");
				}

				$(this).wrap(wrapper);
			});
			
			if ($(this).find('.tab-pane.active').length === 0) {
 				var target_id =  $(this).find('.tab-pane').eq(0).attr('id');
 				var $target_tab = $('#' + target_id);
 				$target_tab.addClass('active');
 			}

			// nav.append(ul);//$(this).prepend(ul);
			// $(this).prepend(nav);

			var btns_html = [];
			
			// tab move button
			$('#myTabs').before([
				'<div class="btn-group" style="z-index: 1;">',
					'<a class="btn btn-default tab_move left"><i class="fa fa-caret-left"></i></a>',
				'</div>'
			].join(''));
			
			btns_html.push(
				'<a class="btn btn-default tab_move right"><i class="fa fa-caret-right"></i></a>'
			);
			
			btns_html.push(
				'<a class="btn btn-default btns_toggle" style="display:none;"><i class="fa fa-ellipsis-h" aria-hidden="true"></i></a>'
			);
			
			// clear button
			if ($(this).attr('tab_run') === "true") {
				btns_html.push([
					'<a class="btn btn-default quiz_clear"><span class="btn_label">', main_localization.get_value('initialize'), '</span></a>'
				].join(''));
			}
			
			// save button
			if (!self.lecture_is_sample && (session && $(this).attr('tab_save') === "true") && self.exam_index !== 'quiz_preview') { // if exame is sample, hide save button
				btns_html.push([
					'<a class="btn btn-default quiz_save"' + (is_end_deadline ? 'style="display: none;' : '') + '"><span class="btn_label">', main_localization.get_value('save'), '</span></a>'
				].join(''));
			}
			
			if ($(this).attr('arduino') === "true") {
				is_arduino = true;

				btns_html.push([
						'<a class="btn btn-default quiz_term_run">',
							'<div id="quiz_term_run_loading" style="cursor:not-allowed; display:none;">',
								'<div class="run_loading"></div>',
							'</div>',
							'<span class="btn_label">', main_localization.get_value('upload'), '</span>',
						'</a>'
					].join(''));
			} else if ($(this).find('goorm-editor').attr('form') === 'programming') {
				btns_html.push([
					'<a class="btn btn-default quiz_term_run" style="display: block; width: 53.234px; margin-right: 0px !important; border-top-right-radius: 0px !important; border-bottom-right-radius: 0px !important;">',
						'<div id="quiz_term_run_loading" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
						'</div>',
						'<div id="quiz_term_run_loading_preparing" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
							'<div class="run_status_message">', main_localization.get_value('preparing'), '</div>',
						'</div>',
						'<div id="quiz_term_run_loading_running" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading2"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>',
							'<div class="run_status_message">', main_localization.get_value('running'), '</div>',
						'</div>',
						'<span class="btn_label">', main_localization.get_value('run'), '</span>',
					'</a>'
				].join(''));
				btns_html.push([
					'<a type="button" class="btn btn-default run_test_case" data-toggle="modal" data-target="#dlg_testcase_setting">',
						'<span class="btn-sub-label">',
							main_localization.get_value('testcase'),
						'</span>',
						'<span class="btn-main-label">',
							main_localization.get_value('run'),
						'</span>',
					'</a>',
				].join(''));
				
				$('#home-tab').append([
					'<span class="btn_stop">',
						'<i class="fa fa-stop" style="vertical-align: top;"> ', main_localization.get_value('stop'), '</i>',
					'</span>'
				].join(''));
			} else if ($(this).find('goorm-editor').attr('form') === 'unittest') {
				btns_html.push([
					'<a class="btn btn-default quiz_term_run">',
						'<div id="quiz_term_run_loading" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
						'</div>',
						'<div id="quiz_term_run_loading_preparing" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
							'<div class="run_status_message">', main_localization.get_value('preparing'), '</div>',
						'</div>',
						'<div id="quiz_term_run_loading_running" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading2"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>',
							'<div class="run_status_message">', main_localization.get_value('running'), '</div>',
						'</div>',
						'<span class="btn_label">', main_localization.get_value('run'), '</span>',
					'</a>'
				].join(''));
			} else {
				btns_html.push([
					'<a class="btn btn-default quiz_term_run">',
						'<div id="quiz_term_run_loading" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
						'</div>',
						'<span class="btn_label">', main_localization.get_value('run'), '</span>',
					'</a>'
				].join(''));
			}
			
			// submit button rendering
			if ((self.lecture_is_sample || (session && $(this).attr('bt_submit') === 'true')) && self.exam_index !== 'quiz_preview') { // if exame is sample, show submit button
				btns_html.push([
					'<a class="btn btn-default quiz_submit" ' + (is_end_deadline ? 'style="display: none;' : '') + '">',
						'<div id="quiz_submit_loading" style="cursor:not-allowed; display:none;">',
							'<div class="run_loading"></div>',
						'</div>',
						'<span class="btn_label">', (is_submitted === 'true' || is_submitted === true) ? main_localization.get_value('re_submit') : main_localization.get_value('submit'), '</span>',
					'</a>'
				].join(''));
			}
			
			if (self.quiz_data.form === 'programming' && self.show_run_res_usage) {
				$('#myTermTabs').append($(['<li role="presentation">',
												'<a href="#run-result" role="tab" id="run-result-tab" data-toggle="tab" aria-controls="profile" aria-expanded="false">',
													main_localization.get_value('run_statistics'),
												'</a>',
											'</li>'].join('')));
				
			}
			
			// render submit result tab only for exam_mode quiz
			if (self.quiz_data.setting === 'exam_mode') {
				$('#myTermTabs').append($(['<li role="presentation">',
										   '<a href="#marking-result" role="tab" id="marking-result-tab" data-toggle="tab" aria-controls="profile" aria-expanded="true">',
										   main_localization.get_value('submit_result') + '</a>',
										   '</li>'].join('')));
			}

			$('.coding_tools').prepend(btns_html.join(''));
			$('.coding_tools .quiz_term_run').css('width', $('.coding_tools .quiz_term_run').width() + 31);
			
			if (selected_lang === 'TestCode') {
				$('.coding_tools a').addClass('disabled');
			}

			// refresh CodeMirror after tabs are drawn
			// $(e).ready(function() {
			// 	var $ge = $(e).find("goorm-editor");
			// 	if ($ge.length > 0 && self.editors[self.get_editor_id($ge[0])]) {
			// 		self.editors[self.get_editor_id($ge[0])].refresh();
					
			// 		self.hide_loading();
			// 	} else {
			// 		setTimeout(function() {
			// 			if (self.editors[self.get_editor_id($ge[0])]) {
			// 				self.editors[self.get_editor_id($ge[0])].refresh();
							
			// 				self.hide_loading();
			// 			}
			// 		}, 1500);
			// 	}
			// });

		});

		if($('goorm-editor').length) {
			$('goorm-editor').each(function() {
				var ge = $(this);

				var editor_id = self.get_editor_id(ge);
				var no_tab = ge.attr('no-tab') || false;
				var lang_mode = ge.attr('lang_mode') || ge.attr('lang') || "text/x-csrc";
				var theme = ge.attr('theme') || "default";
				var contents = ge.text();
				var form = ge.attr('form');
				var orig_lang = ge.attr('goorm-tab');
				var language = ge.attr('goorm-tab').toLowerCase();
				var filetype = ge.attr('filetype');
				var lang_version = ge.attr('lang_ver');

				if (no_tab) {
					ge.attr('id', self.get_random_string(54));
				}

				if (theme !== "default" && $('head').find('link[theme="' + theme + '"]').length === 0) {
					$("<link>")
						.attr("rel", "stylesheet")
						.attr("type", "text/css")
						.attr("href", "/libs/codemirror/theme/" + theme + ".css")
						.attr('theme', theme)
						.appendTo("head");
				}

				if (form === 'terminal') {
					var app = ge.attr('app');

					ge.html('<div class="goorm-console" style="height: 100%"></div>');

					var terminal = new goorm_terminal();

					self.terminals[editor_id] = terminal.load(ge.find('.goorm-console'), {
						'id': self.session.id,
						'app': app,
						'console': true,
						'stat': false
					});
				} else if (form === 'serial') {
					var inner_html = [
					'<div class="serial_container terminal_style" style="overflow:auto;background-color:#333;"></div>',
					'<div class="serial_row" style="border:1px #222 solid;">',	
						'<button type="button" class="toggle_serial btn btn-default" data-toggle="button" aria-pressed="false" autocomplete="off" style="width:133px;background-color:#2a2a2a;color:#fff;">',
							'<i class="connent_icon fa fa-plug"></i>',
							'<span class="state" style="padding-left:5px;">',
								main_localization.get_value('serial_connect'),
							'</span>',
						'</button>',
						'<div class="guide input-group input_message" style="float:right;">',
							'<input type="text" class="send_input form-control noshadow" placeholder="' + main_localization.get_value('send_message') + '">',
							'<span class="input-group-btn">',
								'<button class="send_msg btn btn-default" type="button" style="background-color:#008BF4;">' + main_localization.get_value('send_off') + '</button>',
							'</span>',
						'</div>',
					'</div>'	
					].join('');
					ge.html('<div class="goorm-serial" style="height: 100%;border:1px #222 solid;">' + inner_html + '</div>');
				} else if (form === 'scratchduino' && language === self.scratchduino_tabs.blocks.toLowerCase()) {
					ge.empty();

					var scratchduino_template = ['<div id="content_area">',
												'</div>',
												'  <div id="content_blocks" class="content"></div>',
												'  <xml id="toolbox" style="display: none">',
												'	<category name="' + main_localization.get_value('calculate') + '">',
												'	  <block type="math_arithmetic"></block>',
												'	  <block type="logic_compare"></block>',
												'	  <block type="logic_operation"></block>',
												'	  <block type="logic_negate"></block>',
												'	</category>',
												'	<category name="' + main_localization.get_value('control') + '">',
												'	  <block type="controls_if"></block>',
												'	  <block type="base_delay">',
												'		<value name="DELAY_TIME">',
												'		  <block type="math_number">',
												'			<field name="NUM">1</field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="controls_for">',
												'		<value name="FROM">',
												'		  <block type="math_number">',
												'			<field name="NUM">1</field>',
												'		  </block>',
												'		</value>',
												'		<value name="TO">',
												'		  <block type="math_number">',
												'			<field name="NUM">10</field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="controls_whileUntil"></block>',
												'	</category>',
												'	<category name="' + main_localization.get_value('data') + '" custom="VARIABLE"></category>',
												'	<category name="' + main_localization.get_value('function') + '" custom="PROCEDURE"></category>',
												'	<sep></sep>',
												'	<category name="' + main_localization.get_value('IO') + '">',
												'	  <block type="inout_highlow"></block>',
												'	  <block type="inout_digital_write"></block>',
												'	  <block type="inout_digital_read"></block>',
												'	  <block type="inout_analog_write">',
												'		<value name="NUM">',
												'		  <block type="math_number">',
												'			<field name="NUM">0</field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="inout_analog_read"></block>',
												'	  <block type="serial_available"></block>',
												'	  <block type="serial_print">',
												'		<value name="CONTENT">',
												'		  <block type="text">',
												'			<field name="TEXT"></field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="serial_write">',
												'		<value name="CONTENT">',
												'		  <block type="text">',
												'			<field name="TEXT"></field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="serial_read"></block>',
												'	  <block type="inout_tone">',
												'		<value name="NUM">',
												'		  <block type="math_number">',
												'			<field name="NUM">440</field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="inout_notone"></block>',
												'	  <block type="inout_buildin_led"></block>',
												'	</category>',
												'	<category name="' + main_localization.get_value('servo_motor') + '">',
												'	  <block type="servo_move">',
												'		<value name="DEGREE">',
												'		  <block type="math_number">',
												'			<field name="NUM">0</field>',
												'		  </block>',
												'		</value>',
												'	  </block>',
												'	  <block type="servo_read_degrees"></block>',
												'	</category>',
												'	<category name="' + main_localization.get_value('sensor') + '">',
												'	  <block type="temporature_sensor"></block>',
												'	  <block type="supersonic_sensor"></block>',
												'	  <block type="light_sensor"></block>',
												'	</category>',
												'   <category name="ZUMO">',
												'	  <block type="zumo_button_ispressed"></block>',
												'	  <block type="zumo_button_waitforrelease"></block>',
												'	  <block type="zumo_button_waitforbutton"></block>',
												'	  <block type="zumo_motors_setspeeds"></block>',
												'	  <block type="zumo_sensors"></block>',
												'     <block type="zumo_buzzer_note">',
												'     	<value name="OCTAVE">',
												'     		<block type="math_number">',
												'     			<field name="NUM">3</field>',
												'     		</block>',
												'     	</value>',
												'     </block>',
												'     <block type="zumo_buzzer_play">',
												'     	<value name="SEQUENCE">',
												'     		<block type="text">',
												'     			<field name="TEXT">!L16 V8 cdefgab>cbagfedc</field>',
												'     		</block>',
												'     	</value>',
												'     </block>',
												'     <block type="zumo_buzzer_playnote"></block>',
												'     <block type="zumo_buzzer_stopplying"></block>',
												'     <block type="zumo_buzzer_isplaying"></block>',
												'	</category>',
												'  </xml>'].join('');

					if (self.no_scratchduino) {
						var prevent_template = ['<div id="no_scratchduino">',
											   main_localization.get_value('scratchduino_no_ie_edge'),
											   '</div>'].join('');
						$('.lecture-running').prepend(prevent_template);
					} else {
						ge.append(scratchduino_template);
						self.is_scratchduino = true;
						self.init_scratchduino(contents);
						$('.scratchduino_option').show();
					}
				} else if (form === 'scratch') { // Only One Tab..
					$('.dropup').css('bottom', '45px');

					$('.result_content').hide();

					window.scrach_ready = $.Deferred();
					window.JSeditorReady = function () {
						try {
							window.scrach_ready.resolve();
							return true;
						} catch (error) {
							console.error(error.message, "\n", error.stack);
							throw error;
						}
					};

					var inner_html = [
						'<div class="scratch_container" style="height: 100%">',
							'<div id="flash_content" height="100%"></div>',
						'</div>'
					];

					var flashvars = {
						autostart: 'false',
						cloudToken: '00000000-0000-0000-0000-000000000000',
						urlOverrides: JSON.stringify({
							sitePrefix: '/libs/scratch/',
							siteCdnPrefix: "/libs/scratch/",
							assetPrefix: "http://assets.scratch.mit.edu/",
							assetCdnPrefix: "http://cdn.assets.scratch.mit.edu/",
							internalAPI: "internalapi/",
							staticFiles: ""
						})
					};

					$.each(flashvars, function(prop, val) {
						if($.isPlainObject(val)) {
							flashvars[prop] = encodeURIComponent(JSON.stringify(val));
						}
					});

					var params = {
						bgcolor: "#FFFFFF",
						allowScriptAccess: "always",
						allowFullScreen: "true",
						wmode: 'direct',
						menu: 'false'
					};

					ge.html(inner_html.join(''));

					if (!self.hasFlash) {
						var prevent_flash_template = ['<div id="no_flash">',
											   no_flash_lang,
											   '</div>'].join('');
						$('.lecture-running').prepend(prevent_flash_template);
					} else {
						swfobject.embedSWF("/libs/scratch/Scratch.swf", "flash_content", "100%", "100%", "10.2.0", "expressInstall.swf", flashvars, params, {}, function() {
							$.when(window.scrach_ready).done(function() {
								self.scratch = swfobject.getObjectById("flash_content");
								self.scratch.ASsetEditMode(true);
								self.scratch.ASsetLanguage('ko');

								var init = function(sb2) {
									self.scratch.ASloadBase64SBX(sb2);
									self.scratch_default_data = sb2;

									var scratch_object = $('#flash_content');

									var is_fullscreen = false;
									var exit_handler = function() {
										is_fullscreen = !is_fullscreen;

										if (is_fullscreen) {
											var width = $(window).width();

											scratch_object.attr('width', width + 'px');
										} else {
											scratch_object.attr('width', '100%');
										}
									};

									document.addEventListener("fullscreenchange", exit_handler, false);
									document.addEventListener('webkitfullscreenchange', exit_handler, false);
									document.addEventListener('mozfullscreenchange', exit_handler, false);
									document.addEventListener('fullscreenchange', exit_handler, false);
									document.addEventListener('MSFullscreenChange', exit_handler, false);

									self.resize();

									$('.quiz_save').before('<a class="btn btn-default scratch-download"><span class="btn_label">' + main_localization.get_value('download') + '</span></a>');
									$('.quiz_term_run').hide().after('<a class="btn btn-default scratch-fullscreen"><span class="btn_label">' + main_localization.get_value('fullscreen') + '</span></a>');

									$('.scratch-download').click(function() {
										if (self.scratch) {
											toast.show(main_localization.get_value('scratch_download_guide'));

											self.scratch.ASexportProjectDialog();
										}
									});

									$('.scratch-fullscreen').click(function() {
										var $target_iframe = scratch_object;

										if ($target_iframe[0].requestFullscreen) {
											$target_iframe[0].requestFullscreen();
										} else if ($target_iframe[0].msRequestFullscreen) {
											$target_iframe[0].msRequestFullscreen();
										} else if ($target_iframe[0].mozRequestFullScreen) {
											$target_iframe[0].mozRequestFullScreen();
										} else if ($target_iframe[0].webkitRequestFullscreen) {
											$target_iframe[0].webkitRequestFullscreen();
										} else if ($target_iframe[0].webkitRequestFullScreen) {
											$target_iframe[0].webkitRequestFullScreen();
										} else {
											toast.show(main_localization.get_value('msg_fullscreen_not_supported'), {
												method: 'warning'
											});
										}
									});

									$('.editor_loading').hide();

									if (self.quiz_data.setting == 'run_mode') {
										self.check_badge();
									}
								};

								var user_sb2 = $('.scratch-user-code').html();

								if (user_sb2.length > 0) {
									init(user_sb2);
								} else {
									$.get('/quiz/download/scratch', {
										'index': ge.attr('quiz_index')
									}, function(project_sb2) {
										init(project_sb2);
									});
								}
							});
						});
					}
				} else if (form === 'entry') {
					$('.dropup').css('bottom', '45px');

					$('.result_content').hide();

					var option = self.lesson_index || self.exam_index || null;
					var inner_html = [
						'<div class="entry_container" style="height: 100%">',
							'<iframe id="entry_iframe" src="/iframe/entry_workspace/quiz_load/' + btoa(ge.attr('quiz_index')) + (option ? '/' + btoa(option) : '') + '" style="width: 100%;height: 100%;border: 0;">',
						'</div>'
					];
					
					ge.html(inner_html.join(''));
					self.resize();
					
					$('.quiz_save').before('<a class="btn btn-default entry-download"><span class="btn_label">' + main_localization.get_value('download') + '</span></a>');
					$('.quiz_term_run').hide();

					$('.entry-download').click(function() {
						var form = $('<form></form>').attr('action', '/quiz/download/entry').attr('method', 'post');
						form.append($("<input></input>").attr('type', 'hidden').attr('name', 'data').attr('value', JSON.stringify($('#entry_iframe').get(0).contentWindow.Entry.exportProject())));
						form.appendTo('body').submit().remove();
					});

					$('.editor_loading').hide();

					if (self.quiz_data.setting == 'run_mode') {
						self.check_badge();
					}
					
					toast.show(main_localization.get_value('entry_beta_guide'), {
						method: 'info'
					});
				} else if (form === 'restfulapi') {
					var info = JSON.parse($('.api-info').text());

					var template = {
						'string.required': [
							'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
								'<div class="params_parent col-xs-12 col-md-3">',
									'<input type="text" name="key" value="[KEY]" readonly="readonly" />',
								'</div>',
								'<div class="params_parent col-xs-12 col-md-9">',
									'<input type="text" name="value" data-keyname="[KEY]" value="[VALUE]" placeholder="(required)" class="required" />',
								'</div>',
							'</div>'
						].join(''),

						'string.optional': [
							'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
								'<div class="params_parent col-xs-12 col-md-3">',
									'<input type="text" name="key" value="[KEY]" readonly="readonly" />',
								'</div>',
								'<div class="params_parent col-xs-12 col-md-9">',
									'<input type="text" name="value" data-keyname="[KEY]" value="[VALUE]" placeholder="(optional)" />',
								'</div>',
							'</div>'
						].join(''),

						'boolean.required': function(key, value) {
							var _true = "";
							var _false = "";

							switch (value) {
								case "false":
									_false = "selected";
									break;

								case "true":
									_true = "selected";
									break;
							}

							return [
								'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
									'<div class="params_parent col-xs-12 col-md-3">',
										'<input type="text" name="key" value="' + key + '" readonly="readonly" />',
									'</div>',
									'<div class="params_parent col-xs-12 col-md-9 selector">',
										'<select name="value" data-keyname="' + key + '" class="form-control required"><option value="true" ' + _true + '>True</option><option value="false" ' + _false + '>False</option></select>',
									'</div>',
								'</div>'
							].join('');
						},

						'boolean.optional': function(key, value) {
							var _null = "";
							var _true = "";
							var _false = "";

							switch (value) {
								case "null":
									_null = "selected";
									break;

								case "false":
									_false = "selected";
									break;

								case "true":
									_true = "selected";
									break;
							}

							return [
								'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
									'<div class="params_parent col-xs-12 col-md-3">',
										'<input type="text" name="key" value="' + key + '" readonly="readonly" />',
									'</div>',
									'<div class="params_parent col-xs-12 col-md-9 selector">',
										'<select name="value" data-keyname="' + key + '" class="form-control"><option value="null" ' + _null + '>Null</option><option value="true" ' + _true + '>True</option><option value="false" ' + _false + '>False</option></select>',
									'</div>',
								'</div>'
							].join('');
						},

						'number.required': [
								'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
									'<div class="params_parent col-xs-12 col-md-3">',
										'<input type="text" name="key" value="[KEY]" readonly="readonly" />',
									'</div>',
									'<div class="params_parent col-xs-12 col-md-9">',
										'<input type="number" name="value" data-keyname="[KEY]" value="[VALUE]" placeholder="(required)" class="required" />',
									'</div>',
								'</div>',						
						].join(''),

						'number.optional': [
							'<div class="row header_params margin-0px" style="padding-bottom: 10px;">',
								'<div class="params_parent col-xs-12 col-md-3">',
									'<input type="text" name="key" value="[KEY]" readonly="readonly" />',
								'</div>',
								'<div class="params_parent col-xs-12 col-md-9">',
									'<input type="number" name="value" data-keyname="[KEY]" value="[VALUE]" placeholder="(optional)" />',
								'</div>',
							'</div>',
						].join('')
					};

					var inner_html = [
						'<div class="api_container" style="padding: 15px;">',
							'<div class="http_uri_container">',
								'<div style="width: 120px; display: inline-block;">',
									'<span id="http_method">' + main_localization.get_value('calling_method') + ': [METHOD]</span>',
								'</div>',
								'<div style="width: calc(100% - 120px); display: inline-block;">',
									'<input type="text" class="http_uri form-control input-sm" value="[URI]" readonly="readonly" />',
								'</div>',
							'</div>',
							'[URI_PARAMS_CONTAINER]',
							// '<div class="uri_params_container" style="margin-top: 10px;">',
							// '</div>',
							'[HTTP_HEADER_CONTAINER]',
							// '<div class="api_title">HEADER ' + main_localization.get_value('setting') + '</div>',
							// '<div class="http_header_container">',
							// '</div>',
							'[HTTP_BODY_CONTAINER]',
							// '<div class="api_title">BODY ' + main_localization.get_value('setting') + '</div>',
							// '<div class="http_body_container">',
							// 	'<div class="raw_container" style="display: none">',
							// 		'<textarea class="form-control noshadow raw-editor"></textarea>',
							// 	'</div>',
							// 	'<div class="x-www-form-urlencoded_container">',
							// 	'</div>',
							// '</div>',
						'</div>'
					].join('');

					// method
					inner_html = inner_html.replace('[METHOD]', info.method.toUpperCase());

					// uri
					inner_html = inner_html.replace('[URI]', info.protocol + '://' + info.header.uri);

					// uri params_container
					var uri_params_container = "";

					if (info.header.uri_params && info.header.uri_params.length > 0) {
						uri_params_container = ['<div class="uri_params_container" style="margin-top: 10px;">'];

						info.header.uri_params.map(function(o) {
							uri_params_container.push(template['string.required'].replace(/\[KEY\]/g, o.key).replace('[VALUE]', o.value));
						});

						uri_params_container.push('</div>');
						uri_params_container = uri_params_container.join('');
					}

					inner_html = inner_html.replace('[URI_PARAMS_CONTAINER]', uri_params_container);

					// http header container
					var http_header_container = "";

					if (info.header.params && info.header.params.length > 0) {
						http_header_container = ['<div class="api_title">HEADER ' + main_localization.get_value('setting') + '</div><div class="http_header_container">'];

						info.header.params.map(function(o) {
							var required = (o.required) ? 'required' : 'optional';
							var param_template = template[o.type + '.' + required];

							if (typeof(param_template) === 'string') {
								param_template = param_template.replace(/\[KEY\]/g, o.key).replace('[VALUE]', o.value);
							} else if (typeof(param_template) === 'function') {
								param_template = param_template(o.key, o.value);
							}

							http_header_container.push(param_template);
						});

						http_header_container.push('</div>');
						http_header_container = http_header_container.join('');
					}

					inner_html = inner_html.replace('[HTTP_HEADER_CONTAINER]', http_header_container);

					// http body container HTTP_BODY_CONTAINER
					var http_body_container = "";

					if (info.method !== 'get') {
						if (info.body.form === 'raw') {
							http_body_container = [
								'<div class="api_title">BODY ' + main_localization.get_value('setting') + '</div>',
								'<div class="http_body_container">',
									'<div class="raw_container">',
										'<textarea class="form-control noshadow raw-editor">' + (info.body.form_data.raw || "") + '</textarea>',
									'</div>',
								'</div>'
							].join('');
						} else if (info.body.form === 'x-www-form-urlencoded') {
							if (info.body.form_data.params && info.body.form_data.params.length > 0) {
								http_body_container = [
									'<div class="api_title">BODY ' + main_localization.get_value('setting') + '</div>',
									'<div class="http_body_container">',
										'<div class="x-www-form-urlencoded_container">',
								];

								info.body.form_data.params.map(function(o) {
									var required = (o.required) ? 'required' : 'optional';
									var param_template = template[o.type + '.' + required];

									if (typeof(param_template) === 'string') {
										param_template = param_template.replace(/\[KEY\]/g, o.key).replace('[VALUE]', o.value);
									} else if (typeof(param_template) === 'function') {
										param_template = param_template(o.key, o.value);
									}

									http_body_container.push(param_template);
								});

								http_body_container.push('</div></div>');
								http_body_container = http_body_container.join('');
							}
						}
					}

					inner_html = inner_html.replace('[HTTP_BODY_CONTAINER]', http_body_container);

					ge.html(inner_html).parents('.tab-pane').css('background-color', '#fff').css('border-left', '1px solid #eee').css('font-size', '14px').css('overflow', 'auto');

					if (ge.find('.raw-editor') && ge.find('.raw-editor').length > 0) {
						var editor = self.editors['raw-editor'] = CodeMirror.fromTextArea(ge.find('.raw-editor').get(0), {
							gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "fold"],
							foldGutter: {
								gutter: "fold"
							},
							mode: lang_mode,
							theme: theme,
							value: contents,
							lineNumbers: true,
							wordWrap: true,
							lineWrapping: true,
							styleActiveLine: true,
							matchBrackets: true,
							autoCloseBrackets: true,
							tabSize: 2,
							indentWithTabs: true,
							showTrailingSpace: true
						});

						var ctrl_s = CodeMirror.keyMap["default"] === CodeMirror.keyMap.macDefault ? "Cmd-S" : "Ctrl-S";
						var extra_key_event = {};
						extra_key_event[ctrl_s] = function(cm) {
							$('.quiz_save').click();
						};

						editor.setOption("extraKeys", extra_key_event);

						var mime_type = info.body.form_data['content-type'];
						editor.setOption('mode', mime_type);

						//Lazy Loading
						if (self.lazy_load) {
							CodeMirror.modeURL = 'codemirror/mode/%N/%N';
							CodeMirror.autoLoadMode(editor, CodeMirror.findModeByMIME(mime_type).mode);
						}
					}

					$('.uri_params_container [name="value"]').keyup($.debounce(500, function() {
						var container = $('.uri_params_container');

						if (container.find('.header_params') && container.find('.header_params').length > 0) {
							var uri = info.protocol + '://' + info.header.uri;

							container.find('.header_params').map(function(i, o) {
								var key = $(o).find('[name="key"]').val();

								var reg = new RegExp('{' + key + '}', 'g');

								uri = uri.replace(reg, ($(o).find('[name="value"]').val() || '{' + key + '}'));
							});

							$('.http_uri').val(uri);
						}
					}));

					if ($('.api-save').text()) {
						info = JSON.parse($('.api-save').text());

						if (info.header.uri_params && info.header.uri_params.length > 0) {
							var uri_params_container = $('.uri_params_container');

							info.header.uri_params.map(function(o) {
								uri_params_container.find('[data-keyname="' + o.key + '"]').val(o.value);
							});
						}

						// change uri
						var container = $('.uri_params_container');

						if (container.find('.header_params') && container.find('.header_params').length > 0) {
							var uri = info.protocol + '://' + info.header.uri;

							container.find('.header_params').map(function(i, o) {
								var key = $(o).find('[name="key"]').val();

								var reg = new RegExp('{' + key + '}', 'g');

								uri = uri.replace(reg, ($(o).find('[name="value"]').val() || '{' + key + '}'));
							});

							$('.http_uri').val(uri);
						}

						if (info.header.params && info.header.params.length > 0) {
							var params_container = $('.http_header_container');

							info.header.params.map(function(o) {
								params_container.find('[data-keyname="' + o.key + '"]').val(o.value);
							});
						}

						if (info.method !== 'get') {
							if (info.body.form === 'raw') {
								self.editors['raw-editor'].setValue(info.body.form_data.raw);
							} else if (info.body.form === 'x-www-form-urlencoded') {
								if (info.body.form_data.params && info.body.form_data.params.length > 0) {
									var x_www_form_urlencoded_container = $('.x-www-form-urlencoded_container');

									info.body.form_data.params.map(function(o) {
										x_www_form_urlencoded_container.find('[data-keyname="' + o.key + '"]').val(o.value);
									});
								}
							}
						}					
					}

					$('.editor_loading').hide();
				} else {
					// ge.html('<textarea></textarea>');

					var fullScreen_toggle = function(cm) {
						var is_fullscreen = self.editors[editor_id].getOption('fullScreen');

						self.editors[editor_id].setOption('fullScreen', !is_fullscreen);
						if(is_fullscreen) {
							//when minimized
							self.editors[editor_id].fullScreenBtn.text(main_localization.get_value('fullscreen') + '(F10)');
						} else {
							//when fullscreened
							self.editors[editor_id].fullScreenBtn.text(main_localization.get_value('original_size') + '(F10)');
						}
					};


					var cm_query = {
						gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "fold"],
						foldGutter: {
							gutter: "fold"
						},
						mode: lang_mode,
						theme: theme,
						value: contents,
						lineNumbers: true,
						wordWrap: true,
						lineWrapping: true,
						styleActiveLine: true,
						matchBrackets: true,
						tabSize: 2,
						indentWithTabs: true,
						showTrailingSpace: true
					};	

					if (form === 'scratchduino') {
						cm_query.readOnly = true;
						cm_query.cursorBlinkRate = -1;
					} else if (form === 'input') {
						cm_query.readOnly = true;
						cm_query.cursorBlinkRate = -1;
					}

					if (ge.data('readonly') === true) {
						cm_query.readOnly = true;
					}

					ge.empty();
					var editor = CodeMirror(ge.get(0), cm_query);

					if (window.editor_complete) {
						window.editor_complete.init(editor);
					}
					//Lazy Loading
					if (self.lazy_load) {
						CodeMirror.modeURL = 'codemirror/mode/%N/%N';
						CodeMirror.autoLoadMode(editor, CodeMirror.findModeByMIME(lang_mode).mode);
					}

					var ctrl_s = CodeMirror.keyMap["default"] === CodeMirror.keyMap.macDefault ? "Cmd-S" : "Ctrl-S";
					var extra_key_event = {};
					extra_key_event[ctrl_s] = function(cm) {
						$('.quiz_save').click();
					};
					extra_key_event['Space'] = function(cm) {
						var cur = cm.getCursor();

						cm.replaceSelection(' ');
						cm.markText(
							{
								line: cur.line,
								ch: cur.ch
							},
							{
								line: cur.line,
								ch: cur.ch+1
							},
							{
								replacedWith: $('<span class="grm-spc">·</span>')[0],
								atomic: false,
								handleMouseEvents: true
							}
						);
					};

					editor.setOption("extraKeys", extra_key_event);

					// show middle dot over each spaces
					var convert_space = function(cm) {
						var search_cursor = cm.getSearchCursor(' ', {line:0, ch:0}, null);
						while(search_cursor.findNext()) {
							cm.markText(
								search_cursor.from(),
								search_cursor.to(),
								{
									replacedWith: $('<span class="grm-spc">·</span>')[0],
									atomic: false,
									handleMouseEvents: true
								}
							);
						}
					};
					convert_space(editor);
					

					$.get('/quiz/get_bookmark_info', {
						'exam_index': self.lesson_index || self.exam_index,
						'quiz_index': ge.attr('quiz_index'),
					}, function(result) {
						if (result && result.bookmarks) {
							var bookmarks;
							// for old bookmarks, new bookmarks is string
							try {
								bookmarks = JSON.parse(result.bookmarks);
							} catch(e) {
								console.log("error in bookmarks parse : ", e);
								bookmarks = [];
							}

							if (result.removed_bookmarks) {
								self.removed_bookmarks = result.removed_bookmarks;
							}

							for (var i = 0; i < bookmarks.length; i++) {
								if (bookmarks[i].lang !== language) {
									continue;
								}

								var widget_html = $('<span class="editor_widget" line="' + bookmarks[i].pos.line + '" ch="' + bookmarks[i].pos.ch + '" editor_id="' + editor_id + '" lang="' + bookmarks[i].lang + '">' + bookmarks[i].name + '</span>');
								var widget = editor.findMarksAt({line: bookmarks[i].pos.line, ch: bookmarks[i].pos.ch});

								var removed_flag = true;
								for (var x = 0; x < self.removed_bookmarks.length; x++) {
									if (self.removed_bookmarks[x] === bookmarks[i].id) {
										removed_flag = false;
										break;
									}
								}

								if (!widget[0] && removed_flag) {
									editor.setBookmark({
										line: Number(bookmarks[i].pos.line),
										ch: Number(bookmarks[i].pos.ch)
									}, widget_html[0]);
								}
							}
						}

						$('.editor_loading').hide();
					});

					self.editors[editor_id] = editor;

					if (!window.is_mobile) {
						self.editors[editor_id].fullScreenBtn = $('<a class="btn btn-default btn-sm fullscreen">' + main_localization.get_value('fullscreen') + '(F10)</a>').css('position', 'absolute').css('z-index', 4).css('right', '20px').css('top','15px').click(fullScreen_toggle);
						ge.find('.CodeMirror').prepend(self.editors[editor_id].fullScreenBtn);
						self.editors[editor_id].fullScreen_toggle = fullScreen_toggle;
					}

					// if (form === 'programming' || form === 'gui') {
					// 	editor.linter = new goorm_lint().init(lint_socket).load({
					// 		'filetype': filetype,
					// 		'version': lang_version,
					// 		'editor': editor
					// 	});
					// }

					if (form === 'gui') {
						$('.gui_option').show();
					}

					if (self.collaboration_quiz.indexOf(form) > -1) {
						self.ot_object[orig_lang] = {};
					}
				}
			});
		} else {
			$('.editor_loading').hide();
			$('.msg_no_quiz').show();
		}
		
		if (window && window.resize) {
			window.resize();
		}
		this.resize();
		
		if ((/mobile/i.test(self.user_agent) || /android/i.test(self.user_agent)) && /scratch/i.test($('#myTabs > li:first-child > a').text())) {
			toast.show(main_localization.get_value("cannot_use_quiz_in_mobile") + "<br/>", {
				'method': 'error'
			});
		}
		
		if (is_arduino === true) {
			if (/mobile/i.test(self.user_agent) || /android/i.test(self.user_agent)) {
				toast.show(main_localization.get_value("cannot_use_arduino_in_mobile") + "<br/>", {
					'method': 'error'
				});
			} else {
				var extension_setting = [
					'<li class = "header_print">',
						'<a data-toggle="modal" data-target="#dlg_arduino_extension" title="' + main_localization.get_value("chrome_app_config") + '">',
							'<span class="sr-only">' + main_localization.get_value("chrome_app_config") + '</span>',
							'<i class="fa fa-link" aria-hidden="true" style="margin-right:8px;"></i>',
							'<span style="color:white;">goormduino</span>',
						'</a>',
					'</li>'
				].join('');

				var list_inline = $('.header_tool').children('.list-inline');
				list_inline.prepend(extension_setting);

				self.init_arduino_app();
				self.init_arduino_socket();

				setTimeout(function() {
					if (!self.port_connected) {
						if (self.user_agent.indexOf("Chrome") < 0 || self.user_agent.indexOf("Edge") > 0) {
							toast.show(main_localization.get_value("msg_chrome_only"), {
								'method': 'info'
							});
						} else {
							$('#dlg_arduino_extension').modal('show');	
						}
					}
				}, 1000);
			}
		}
		
		var web_quiz_index = $('goorm-editor[form="web"]').attr('quiz_index');

		if(web_quiz_index) {
			this.socket.on('init_web_container', function(msg) {
				if(msg.err) {
					console.log('init_web_container error:', msg.err);
					toast.show(msg.err, {
						'method': 'error'
					});
				} else if(msg.result) {
					self.web_docker_available = true;
					if (self.web_run_queue.length > 0) {
						self.web_run_queue.map(function (item, index) {
							self.socket.emit('web_project_in_container', {
								'quiz_index': item.quiz_index,
								'id': item.id,
								'sources': item.sources
							});
						});
						self.web_run_queue = [];
					}
				} else {
					
					console.log('init_web_container msg dump:', msg);
				}
			});
			
			this.socket.emit('init_web_container', {
				'quiz_index': web_quiz_index,
				'id': this.session.id
			});
		}
	},

	set_ot_connect: function(callback) {
		var self = this;

		var _set_ot_connect = function(lang) {
			var option = '';
			if (is_student) {
				option = user_id;
			} else {
				return;
			}

			var lesson_or_exam_index = self.exam_index || self.lesson_index;
			var ot_path = lesson_or_exam_index + '_' + self.quiz_data.index + '_' + option + '_' + lang;
			self.ot_object[lang].ot_path = ot_path;
			var editor_id = self.get_editor_id($('.goorm-editor[goorm-tab="' + lang + '"]'));
			var editor = self.editors[editor_id];
			//send a socket of joining
			var value = editor.getValue() || '';

			self.ot_socket.emit('join', JSON.stringify({
				'channel': 'ot',
				'filename': ot_path,
				'sessionid': self.ot_socket.id,
				'user_id': user_id,
				'user_name': user_name,
				'value': value,
				'service_type': 'edu'
			}));

			//apply message
			self.ot_object[lang].cmClient = null;

			var EditorClient = ot.EditorClient;
			var SocketIOAdapter = ot.SocketIOAdapter;
			var CodeMirrorAdapter = ot.CodeMirrorAdapter;
/*
			self.w_collabration_check = function(filepath, length) {
				self.collaboration_check(filepath, length);
			};
			self.w_save_collaboration = function(filepath) {
				self.save_collaboration(filepath);
			};
			self.w_editing_message = function(data) {
				self.editing_message(data);
			};
			self.w_editing_someone_leaved = function(name, filepath) {
				//cursor remove action when focus vanished--heeje
				self.editing_someone_leaved(name, filepath);
			};
			self.w_disconnect_socket = function() {
				self.disconnect_socket();
			};
*/

			self.ot_object[lang].doc_event_listener = function(obj) {
				if (self.ot_object[lang].adapter) {
					self.remove_collaboration_listener(true, lang);
					self.ot_object[lang].adapter.removeListener();
				}

				self.ot_object[lang].adapter = new SocketIOAdapter(self.ot_socket, self.ot_object[lang].ot_path, lesson_or_exam_index, self.quiz_data.index, lang);
				set_ot(obj.str, obj.revision, obj.clients, self.ot_object[lang].adapter, obj.edu_bookmarks);
				// self.ot_socket
				// 	.on('is_collaborating', self.w_collabration_check)
				// 	.on('save_collaboration', self.w_save_collaboration)
				// 	.on('editing_message', self.w_editing_message)
				// 	.on('editing_someone_leaved', self.w_editing_someone_leaved);
			};

			//to make undo stack depth work! --heeje
			// self.ot_object[lang].do_stack = function(event, obj) {
			// 	if (self.filepath != obj.filepath || !self.cmClient) {
			// 		return;
			// 	}

			// 	obj.data = {
			// 		undo: self.cmClient.undoManager.undoStack.length,
			// 		redo: self.cmClient.undoManager.redoStack.length
			// 	};
			// };

			// $(core).off('get_do_stack', self.do_stack);
			// $(core).on('get_do_stack', self.do_stack);

			self.ot_socket.once('doc.' + self.ot_object[lang].ot_path, self.ot_object[lang].doc_event_listener);

			var set_ot = function(str, revision, clients, serverAdapter, bookmarks) {
				var cm = editor;
				if (cm.getValue() !== str) {
					cm.setValue(str);
				}

				if (bookmarks && bookmarks.length > 0) {
					for (var i = 0; i < bookmarks.length; i++) {
						self.remove_bookmarks(bookmarks[i]);
					}
				}

				self.ot_object[lang].cmAdapter = new CodeMirrorAdapter(cm);

				self.ot_object[lang].cmClient = new EditorClient(
					revision, clients, serverAdapter, self.ot_object[lang].cmAdapter, self.ot_object[lang].ot_path);
				self.ot_object[lang].cmClient.serverAdapter.ownUserName = user_name;

				// if (!self.parent.readonly) {
				// 	cm.setOption('readOnly', false);
				// }
			};
		};

		this.set_ot_socket(function() {
			var socket_remove_listener = function(socket, name) {
				//socket.$events[name] = undefined;
				socket._callbacks['$' + name] = undefined;
			};

			// socket_remove_listener(self.ot_socket, 'editing_get_cursors');
			// self.ot_socket.on('editing_get_cursors', function(cursors) {
			// 	if (cursors === undefined || cursors === null) {
			// 		return;
			// 	}
			// 	for (var i = 0; i < cursors.length; i++) {
			// 		self.task_queue.push(cursors[i]);
			// 	}
			// });

			for (var i in self.ot_object) {
				_set_ot_connect(i);
			}

			self.ot_socket.on('/ot/remove_bookmark', function(data) {
				self.remove_bookmarks(data);
			});

			self.ot_socket.on('edu_save', function(data) {
				data.language = data.language || '';
				toast.show(main_localization.get_value("toast_save_from_other_student").replace(/\[NAME\]/, data.user_name).replace(/\[LANG\]/, data.language), {
					'method': 'info'
				});
			});

			if (callback && typeof(callback) == 'function') {
				callback();
			}
 		});
	},

	set_ot_socket: function(callback) {
		var self = this;
		var lesson_index = this.lesson_index || this.exam_index;
		var room_key = '';

		if (is_student) {
			room_key = user_id;
		} else {
			return;
		}

		self.socket.once('entrance_to_collaboration', function(msg) {
			if (!msg.result) {
				return;
			} else {
				$.post('/ot/set_socket', {
					'lesson_index': lesson_index,
					'collaboration_option': 'personal',
					'owner_id': room_key,
					'_id': msg._id
				} , function(data) {
					if (data.result) {
						var url = data.host + ':' + data.port;
						var options = {
							'secure': false
						};
						var proxy_host = data.proxy_host;

						options.path = '/app/' + data.host + '/' + data.port + '/socket.io';

						if (data.proxy_secure) {
							options.secure = true;
							options.port = 443;
						}

						self.ot_socket = new io.connect(proxy_host, options);

						if (callback && typeof(callback) == 'function') {
							if (self.ot_socket.connected) {
								callback();
							} else {
								self.ot_socket.once('connect', callback);
							}
						}
					}
				});
			}
		});
		self.socket.emit('entrance_to_collaboration', {
			'lesson_index': lesson_index,
			'collaboration_option': collaboration_option,
			'owner_id': room_key
		});
	},
	
	init_arduino_socket: function() {
		var self = this;

		var socket = self.socket;
		
		var stdout_container = $('.goorm-stdout-container');

		socket.on('terminal_error', function(data) {
			toast.show(data, {
				'method': 'error'
			});
		});

		socket.on('container_complete', function(data) {
			var error = "";
			var success = false;

			self.container_socket[data.token] = new io.connect(data.socket.url, data.socket.options);

			self.container_socket[data.token].on('terminal_exited.' + data.token, function() {
				var res = "";

				self.container_socket[data.token].on('cmd.stdout.' + data.token, function(stdout) {
					res += stdout;
				});

				self.container_socket[data.token].on('cmd.close.' + data.token, function() {
					if (success) {
						stdout_container.append("<pre>"+main_localization.get_value("compile_success")+"</pre>");

						self.port.postMessage({
							'op': 'upload',
							'selectedPort': $(".arduino_device option:selected").text(),
							'hex': res,
							'board_type': self.arduino_language
						});
					} else {
						stdout_container.append("<pre>"+main_localization.get_value("compile_fail")+"</pre>");

						var replaced = error.replace(/\[\d+\m/g, '');
 						stdout_container.append("<pre>" + replaced+"</pre>");
						
						arrow.show();
						toast.show(main_localization.get_value("toast_upload_fail") + "<br/>", {
							'method': 'error'
						});
						
						$('.quiz_term_run').removeAttr('disabled').removeClass('disabled_btn');
						$('#quiz_term_run_loading').hide();
						$('.quiz_term_run').children().not('#quiz_term_run_loading').show();
					}
					self.stop_container(data.token);
				});

				self.container_socket[data.token].emit('cmd', {
					'token': data.token,
					'cmd': '/bin/cat /goorm/' + self.arduino_language + '/.pioenvs/' + self.arduino_language + '/firmware.hex'
				});
			});

			self.container_socket[data.token].on('pty_command_result', function(data) {
				var time_regex = /Took (\d+).(\d+) seconds/;

				if (data.stdout.indexOf('SUCCESS') > -1) {
					success = true;
				}

				if (time_regex.test(data.stdout)) {
 					var time = data.stdout.match(time_regex);
 					$('.terminal_running_time').html(time[1]+":"+time[2]+'.00');
 				}
				
				if (/(error:.*)/.test(data.stdout)) {
					error += data.stdout;
				}
			});

			self.container_socket[data.token].on('disconnect', function() {
				self.container_socket[data.token].disconnect();
			});

			self.container_socket[data.token].emit('run', {
				'token': data.token,
				'daemon': true,
				'app': 'arduino_' + self.arduino_language
			});
		});
	},
	
	init_arduino_app: function() {
		var self = this;
		
		if (self.user_agent.indexOf("Chrome") < 0 || self.user_agent.indexOf("Edge") > 0) {
			return;
		}

		var port = self.port = chrome.runtime.connect(self.chrome_extension_id, {
			name:"goorm_arduino"
		});

		var monitor = $('.serial_container');

		var set = function(msg) {
			monitor.append('<p class="serial_message">' + msg + '</p>');
			monitor.scrollTop(monitor[0].scrollHeight);
		};

		var device = $('.arduino_device');

		var ext_loading = $('.connect_chrome_extension .run_loading');
		var ext_loaded = $('.connect_chrome_extension .run_loaded');
		
		var stdout_container = $('.goorm-stdout-container');

		port.postMessage({'op':'device'});
		port.onMessage.addListener(function(result) {
			if (result.op === 'connect') {
				ext_loading.hide();
				ext_loaded.show();

				self.port_connected = true;

				if (!self.port_test) {
					// already setup
					$('.setup_guide').show();
				}
			} else if (result.op === 'device') {
				if (self.running) {
					clearTimeout(self.running);

					ext_loading.hide();
					ext_loaded.show();
				}
				
				$('.arduino_device option').remove();

				$.each(result.msg, function(index, value) {
					if (value.indexOf('/dev/tty.') >= 0) {
						device.append("<option value="+value+" selected='selected'>"+value+"</option>");
					} else {
						device.append("<option value="+value+">"+value+"</option>");
					}
				});
			} else if (result.op === 'serial_connect') {
				if (result.msg) {
					set(result.msg);
				}
			} else if (result.op === 'disconnect') {
				if (result.msg) {
					set(result.msg);
				}
			} else if (result.op === 'send_data') {
				if (result.msg) {
					if (result.msg.indexOf('ERROR: Not connected') > -1) {
						toast.show(main_localization.get_value("toast_disconnect_serial"));
					} else {
						set(result.msg);
					}
				}
			}
			else if (result.op === 'upload') {
				stdout_container.append("<pre>" + result.msg + "</pre>");
					if (result.msg.indexOf("OK") >= 0) {
						toast.show(main_localization.get_value("upload_complete"), {
							'method': 'info'
						});
					}
				}
				$('.quiz_term_run').removeAttr('disabled').removeClass('disabled_btn');
				$('#quiz_term_run_loading').hide();
				$('.quiz_term_run').children().not('#quiz_term_run_loading').show();
		});
	},

	get_default_template: function(lang_mode) {
		if (lang_mode === "text/x-csrc") {
			return "#include <stdio.h>\r\rint main() {\r\r  return 0;\r}";
		} else if (lang_mode === "text/x-c++src") {
			return "#include <iostream>\r\rusing namespace std;\r\rint main() {\r\r  return 0;\r}";
		} else if (lang_mode === "text/x-java") {
			return "//Please don't change class name 'Main'\r\rclass Main {\r\r  public static void main(String[] args) {\r\r  }\r}";
		} else if (lang_mode === "text/x-python") {
			return "# -*- coding: utf-8 -*-\r# UTF-8 encoding when using korean\r\ra, b, c, d, e = raw_input().split()\r";
		} else if (lang_mode === "text/x-go") {
			return "package main\r\rimport \"fmt\"\r\rfunc main() {\r   fmt.Println(\"hello world\")\r}";
		} else if (lang_mode === "text/x-csharp") {
			return 'using System;\n\nnamespace goorm\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.WriteLine(\"Hello World!\");\n        }\n    }\n}';
		} else if (lang_mode === "text/x-swift") {
			return 'print(\"hello ☁️\");';
		} else if (lang_mode === "text/javascript") {
			return '// Run by Node.js\r\rconst readline = require(\"readline\");\rconst rl = readline.createInterface({\r  input: process.stdin,\r  output: process.stdout\r});\r\rrl.on(\"line\", function(line) {\r  console.log(\"hello goorm!\", line);\r  rl.close();\r}).on(\"close\", function() {\r  process.exit();\r});';
		} else if (lang_mode === "text/x-ruby") {
			return 'puts \"hello goorm!\"';
		} else if (lang_mode === "text/x-kotlin") {
			return 'fun main(args: Array<String>) {\r  println(\"hello goorm!\")\r}';
		} else if (lang_mode === 'text/x-scala') {
			return 'object Main {\r  def main(args: Array[String]) {\r  println(\"hello goorm!\")\r  }\r}';
		} else if (lang_mode === 'text/x-vb') {
			return 'Module Goorm\r  Sub Main()\r    Console.WriteLine(\"hello goorm!\")\r  End Sub\rEnd Module';
		} else if (lang_mode === 'text/x-pascal') {
			return "program Goorm;\rbegin\r  writeln(\'hello goorm!\')\rend.";
		} else if (lang_mode === 'text/x-lua') {
			return 'print(\"hello goorm!\")';
		} else if (lang_mode === 'text/x-objectivec') {
			return '#import <Foundation/Foundation.h>\r\rint main()\r{\r  printf(\"hello goorm!\\n\");\r\r  return 0;\r}';
		} else if (lang_mode === 'text/x-rsrc') {
			return 'cat(\"hello goorm!\\n\");';
		} else if (lang_mode === 'text/x-rustsrc') {
			return 'fn main() {\r  println!(\"hello goorm!\");\r}';
		} else if (lang_mode === 'text/x-cobol') {
			return "000010 IDENTIFICATION DIVISION.\r000020 PROGRAM-ID. GOORM.\r000030\r000040 PROCEDURE DIVISION.\r000050   DISPLAY \'hello goorm!\'.\r000060   STOP RUN.";
		} else if (lang_mode === 'text/x-clojure') {
			return '(println \"hello goorm!\")';
		} else if (lang_mode === 'text/x-stsrc') {
			return "\'hello goorm!\' displayNl";
		} else if (lang_mode === 'application/dart') {
			return 'void main() {\r  print(\"hello goorm!\");\r}';
		} else if (lang_mode === 'text/x-haskell') {
			return 'main = putStr \"hello goorm!\\n\"';
		} else if (lang_mode === 'text/x-perl') {
			return 'print \"hello goorm!\\n\"';
		} else if (lang_mode === 'text/x-common-lisp') {
			return '(format t \"hello goorm!\")';
		} else if (lang_mode === 'text/x-d') {
			return 'import std.stdio;\r\rvoid main() {\r  writeln(\"hello goorm!\");\r}';
		} else if (lang_mode === 'text/x-erlang') {
			return '%% Do not change -module and -start\r-module(main).\r-export([start/0]).\r\rstart() ->\r  io:fwrite(\"hello goorm!\\n\").';
		} else if (lang_mode === 'application/x-httpd-php') {
			return '<?php\r  echo \"hello goorm!\";\r?>';
		} else {
			return "";
		}
	},
	

	init_event: function() {
		var self = this;

		this.init_click_event();

		$(window).on('beforeunload', function() {
			if (!self.is_link_unload) {
				return false;
			}
		});
		
		$(document).on('click mouseup touch', 'a[href]:not([target="_blank"])',function(e) {
			var href = $(this).attr('href');
			var target = $(this).attr('target');

			if (href.indexOf('/') >= 0) {
				self.is_link_unload = true; // to prevent native beforeunload popup

				e.preventDefault();
				e.stopPropagation();

				var $active_editor = $('.goorm-quiz-tab .tab-pane.active .goorm-editor');

				var editor_id = self.get_editor_id($active_editor);
				var editor = self.editors[editor_id];

				var gogo = function() {
					if (target && target === '_blank') {
						window.open('/', '_blank');
					} else {
						location.href = href;
					}
				};

				if (editor && !editor.isClean() && !self.lecture_is_sample) {
					confirmation.init({
						message: main_localization.get_value('msg_confirm_save_code'),
						yes_text: main_localization.get_value('save'),
						no_text: main_localization.get_value('dont_save_and_go'),
						title: main_localization.get_value('dialog_confirmation'),

						yes: function() {
							self.save(null, function() {
								gogo();
							});
						},
						no: function() {
							gogo();
						}
					}).show();
				} else {
					gogo();
				}
			}
		});

		$(document).keydown(function (evt) {
			if (evt.keyCode === 121) {
				var editor_id = $('goorm-tabs .active').attr('id');
				self.editors[editor_id].fullScreen_toggle();
			}
		});
		
		$('#dlg_run_turtle .modal-dialog').draggable({
			handle: ".modal-header"
		});

		$('#dlg_run_gui .modal-dialog').draggable({
			handle: ".modal-header, .modal-body"
		});

		$('#result_tab').on('hidden.bs.collapse', function() {
			$('.result_tab_open_btn').children('.fa.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-up');
			self.resize();
		}).on('shown.bs.collapse', function() {
			$('.result_tab_open_btn').children('.fa.fa-chevron-up').removeClass('fa-chevron-up').addClass('fa-chevron-down');
			self.resize();
		});
		$(window).on('resize', function() {
			self.resize();
		});
		
		$('#home-tab').click(function() {
			if(self.run_terminal) {
				var resize_after_visible = function() {
					if($('.terminal').is(':visible')) {
						//terminal tab visible case
						self.run_terminal.resize();
						return 0;
					} else {
						//Terminal tab invisible case
						setTimeout(resize_after_visible, 100);
					}
				};
				resize_after_visible();
			}
		});

		if (self.quiz_data.form === 'programming' && (self.quiz_data.setting === 'exam_mode' || self.quiz_data.setting === 'submit_mode') && $('.run_test_case').length && !window.is_mobile) {
			$('.coding_tools .quiz_term_run').tooltip({
				placement: 'bottom',
				title: main_localization.get_value('run_result_warn')
			});
		}
	},

	init_click_event: function() {
		var self = this;
		var turtle_code = null;

		$(document).on('click', '.quiz_submit', function() {
			
			if ($(this).attr('disabled')) {
				toast.show(main_localization.get_value('msg_plz_wait_for_result'), {
					'method': 'warning'
				});
				return;
			}
							
			var quiz_setting = $('input[name="dashboard_quiz_setting_input"]') && $('input[name="dashboard_quiz_setting_input"]').val() || 'submit_mode';

			var submit_quiz = function() {

				var tab = $('.goorm-quiz-tab');

				if (tab.find('goorm-editor[form="robocode"]').length > 0) {
					/**
					 *	QUIZ ROBOCODE
					 */
					var editor_id = tab.find('goorm-editor[form="robocode"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_robocode_quiz(editor);
				} else if (tab.find('goorm-editor[form="gui"]').length > 0) {
					/**
					 *	QUIZ GUI
					 */
					var editor_id = tab.find('goorm-editor[form="gui"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_gui_quiz(editor);
				} else if (tab.find('goorm-editor[form="skulpt"]').length > 0) {
					/**
					 *	QUIZ SKULPT
					 */
					var editor_id = tab.find('goorm-editor[form="skulpt"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_skulpt_quiz(editor);
				} else if (tab.find('goorm-editor[form="web"]').length > 0) {
					/**
					 * QUIZ WEB PROGRAMMING 
					 */
					var editor_id = tab.find('goorm-editor[form="web"]').parent().attr('id');
					var editor = self.editors[editor_id];
					if(editor) {
						editor.markClean();
					}
					self.submit_web_quiz();

				} else if (tab.find('goorm-editor[form="arduino"]').length > 0) { 
					/**
					 * ARDUINO
					 */
					var editor_id = tab.find('goorm-editor[form="arduino"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_arduino_quiz(editor);
				} else if (tab.find('goorm-editor[form="scratch"]').length > 0) {
					/**
					 * SCRATCH
					 */
					var editor_id = tab.find('goorm-editor[form="scratch"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_scratch_quiz($('goorm-editor[form="scratch"]'));
				} else if (tab.find('goorm-editor[form="entry"]').length > 0) {
					/**
					 * ENTRY
					 */
					var editor_id = tab.find('goorm-editor[form="entry"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_entry_quiz($('goorm-editor[form="entry"]'));
				} else if (tab.find('goorm-editor[form="scratchduino"]').length > 0) {
					/**
					 * SCRATCHDUINO
					 */
					var editor_id = tab.find('goorm-editor[form="scratchduino"]').parent().attr('id');
					var editor = self.editors[editor_id];
					
					self.submit_scratchduino_quiz();
				} else if (tab.find('goorm-editor[form="unittest"]').length > 0) {
					/**
					 * UNITTEST
					 */
					var editor_id = tab.find('goorm-editor[form="unittest"]').parent().attr('id');
					var editor = self.editors[editor_id];
					if(editor) {
						editor.markClean();
					}
					self.submit_unittest_quiz($('goorm-editor[form="unittest"]'));
				} else {
					/**
					 *  QUIZ PROGRAMMING
					 */
					var editor_id = tab.find('goorm-editor[form="programming"]').parent().attr('id');
					var editor = self.editors[editor_id];
					if(editor) {
						editor.markClean();
					}

					tab.find('goorm-editor[form="programming"]').each(function(i, e) {
						if ($(e).parent().hasClass('active')) {
							self.submit_programming(e);
						}
					});
				}
			};
			
			if (is_end_exam) {
				if (is_end_deadline) {
					submit_quiz();
				} else {
					confirmation.init({
						message: main_localization.get_value('msg_submit_quiz_end_exam'),
						yes_text: main_localization.get_value('yes'),
						no_text: main_localization.get_value('no'),
						title: main_localization.get_value('submit_quiz_end_exam'),

						yes: submit_quiz
					}).show();
				}
			} else if(is_submitted === 'true' || self.quiz_submitted) {
				confirmation.init({
					message: main_localization.get_value('msg_re_submit_quiz'),
					yes_text: main_localization.get_value('yes'),
					no_text: main_localization.get_value('no'),
					title: main_localization.get_value('re_submit_quiz'),

					yes: submit_quiz
				}).show();
			} else {
				if(quiz_setting === 'exam_mode') {
					confirmation.init({
						message: main_localization.get_value('submit_confirmation_msg'),
						yes_text: main_localization.get_value('yes'),
						no_text: main_localization.get_value('no'),
						title: main_localization.get_value('submit_quiz'),

						yes: submit_quiz
					}).show();
				} else {
					submit_quiz();
				}
			}

		});

		// $(document).on('click', '.quiz_run', function() {
		// 	var tab = $('.goorm-quiz-tab');
		// 	var tabs = $('goorm-tabs');

		// 	/**
		// 	 *  QUIZ PROGRAMMING
		// 	 */
		// 	tabs.find('goorm-editor[form="programming"]').each(function(i, e) {
		// 		if ($(e).parent().hasClass('active')) {
		// 			self.submit_programming(e, true);
		// 		}
		// 	});
		// });

		$(document).on('click', '.quiz_term_run', function() {
			var tab = $('.goorm-quiz-tab');
			var tabs = $('goorm-tabs');

			if ($('goorm-editor[form="robocode"]').length > 0) {
				/**
				 *	QUIZ ROBOCODE
				 */
				var editor = self.editors['edu_tab_0'];
				self.run_robocode_quiz(editor);
			} else if ($('goorm-editor[form="gui"]').length > 0) {
				/**
				 *	QUIZ GUI
				 */
				var editor = self.editors['edu_tab_0'];
				var type =   tabs.find('goorm-editor[form="gui"]').attr('type');
				var quiz_index = tabs.find('goorm-editor[form="gui"]').attr('quiz_index');
				var filetype =  tabs.find('goorm-editor[form="gui"]').attr('filetype');

				self.run_gui_quiz({
					'editor': editor,
					'quiz_index': quiz_index,
					'filetype': filetype,
					'type': type
				});
			} else if ($('goorm-editor[form="skulpt"]').length > 0) {
				self.run_python_turtle_modal(self.editors['edu_tab_0']);
			} else if($('goorm-editor[form="web"]').length > 0) {
				/**
				 * QUIZ WEB PROGRAMMING
				 */
				var quiz_index = tabs.find('goorm-editor[form="web"]').attr('quiz_index');
				
				self.run_web_quiz({
					'quiz_index': quiz_index
				});

			} else if($('goorm-editor[form="arduino"]').length > 0) {
				/**
				 * ARDUINO
				 */
				var quiz_index = tabs.find('goorm-editor[form="arduino"]').attr('quiz_index');
				
				var selectedPort =  $(".arduino_device option:selected").text();
				if (selectedPort &&  selectedPort.indexOf('Bluetooth') >= 0) {
					toast.show(selectedPort + main_localization.get_value("msg_bad_port"), {
						'method': 'info'
					});	
					return;
				}
				
				if (!self.port_connected) {
					toast.show(main_localization.get_value("toast_connect_goormduino"), {
						'method': 'error'
					});	
					return;
				}
				
				var editor = self.editors['edu_tab_0'];
				self.run_arduino_quiz(editor, quiz_index);
			} else if ($('goorm-editor[form="restfulapi"]').length > 0) {
				/**
				 * RESTFul API
				 */
				var quiz_index = tabs.find('goorm-editor[form="restfulapi"]').attr('quiz_index');
				var info = JSON.parse($('.api-info').text());
				
				var uri_params_container = $('.uri_params_container');
				
				if (uri_params_container.find('.header_params') && uri_params_container.find('.header_params').length > 0) {
					info.header.uri_params = [];
					
					uri_params_container.find('.header_params').map(function(i, o) {
						var key = $(o).find('[name="key"]').val();
						var value = $(o).find('[name="value"]').val();

						info.header.uri_params.push({
							'key': key,
							'value': value
						});
					});
				}
				
				var http_header_container = $('.http_header_container');

				if (http_header_container.find('.header_params') && http_header_container.find('.header_params').length > 0) {
					info.header.params = [];

					http_header_container.find('.header_params').map(function(i, o) {
						var key = $(o).find('[name="key"]').val();
						var value = $(o).find('[name="value"]').val();

						if ($(o).find('[name="value"]').get(0).tagName === 'SELECT' && value === 'null') {
							return;
						}
						
						if (key.toLowerCase() === 'content-type') {
							info.header['content-type'] = value;
						}

						info.header.params.push({
							'key': key,
							'value': value
						});
					});
				}

				if (info.method !== 'get') {
					var x_www_form_urlencoded_container = $('.x-www-form-urlencoded_container');
					
					if (info.body.form === 'raw') {
						info.body.form_data.raw = self.editors['raw-editor'].getValue();
					} else if (info.body.form === 'x-www-form-urlencoded') {
						if (x_www_form_urlencoded_container.find('.header_params') && x_www_form_urlencoded_container.find('.header_params').length > 0) {
							info.body.form_data.params = [];
							
							x_www_form_urlencoded_container.find('.header_params').map(function(i, o) {
								var key = $(o).find('[name="key"]').val();
								var value = $(o).find('[name="value"]').val();

								if ($(o).find('[name="value"]').get(0).tagName === 'SELECT' && value === 'null') {
									return;
								}
								
								info.body.form_data.params.push({
									'key': key,
									'value': value
								});
							});
						}
					}
				}
				
				$.post('/quiz/run/restfulapi', {
					info: info
				}, function(data) {
					if (data) {
						if ($('.goorm-stdout-container').find('.response_headers').length === 0) {
							var theme = 'monokai';
							
							$('.goorm-stdout-container').append([
								'<div class="response_text_validation" style="display: none; padding: 20px 20px 0px 20px;">',
									'<table id="validation_table" class="table">',
										'<thead>',
											'<tr role="row">',
												'<th class="text-center" style="width: 10%;">', main_localization.get_value("result"), '</th>',
												'<th style="width: 20%;">', main_localization.get_value("verification_field"), '</th>',
												'<th style="width: 30%; word-break: break-word;">', main_localization.get_value("real_value"), '</th>',
												'<th style="width: 10%;">', main_localization.get_value("comparison_operator"), '</th>',
												'<th style="width: 30%; word-break: break-word;">', main_localization.get_value("expected_value"), '</th>',
											'</tr>',
										'</thead>',
										'<tbody>',
										'</tbody>',
									'</table>',
								'</div>',
								'<div class="response_headers quiz_solution quiz_solution_edit">',
									'HTTP/<span id="api_tester_http_version"></span> <i class="api_tester_http_status_circle fa fa-circle" style="margin: 0px 5px;"></i><span id="api_tester_http_status_code"></span> <span id="api_tester_http_status_message"></span> <br/>',
									'<p style="line-height: 2; word-break: break-all; font-family: SourceCodePro-Semibold;"></p>',
								'</div>',
								'<div class="response_download" style="text-align: center; padding: 15px; display: none;">',
									'<a type="button" class="api_tester_download btn btn-primary" style="width: 100%;">' + main_localization.get_value('download') +'</a>',
								'</div>',
								'<div class="response_image" style="text-align: center; padding: 15px; display: none;">',
									'<img src=""></img>',
								'</div>',
								'<div class="response_preview">',
									'<textarea class="form-control noshadow preview-editor"></textarea>',
								'</div>'
							].join(''));
							
							self.editors['preview-editor'] = CodeMirror.fromTextArea($('.preview-editor').get(0), {
								gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "fold"],
								foldGutter: {
									gutter: "fold"
								},
								theme: theme,
								lineNumbers: true,
								wordWrap: true,
								lineWrapping: true,
								styleActiveLine: true,
								matchBrackets: true,
								autoCloseBrackets: true,
								tabSize: 2,
								indentWithTabs: true,
								showTrailingSpace: true
							});
							
							if (theme !== "default" && $('head').find('link[theme="' + theme + '"]').length === 0) {
								$("<link>")
									.attr("rel", "stylesheet")
									.attr("type", "text/css")
									.attr("href", "/libs/codemirror/theme/" + theme + ".css")
									.attr('theme', theme)
									.appendTo("head");
							}
						}
						
						var validation = true;
						
						if (info.validation && info.validation.type) {
							var result_data = data.data;
							var cases = [];
						
							if (info.validation.type === 'xml') {
								var xml = $($.parseXML(result_data));

								// $.result.article[1].width >= 5000
								// => xml.find('result article:eq(1) width').html()
								//
								cases = info.validation.forms.map(function(o, i) {
									var split = o.field.split('.');

									split.shift(); // remove $
									split = split.map(function(item) {
										return item.replace(/\[([0-9]+)\]/, ':eq($1)');
									});

									o.expected_value = o.value;
									o.value = xml.find(split.join(' ')).html() || "";
									o.value = o.value.toString();

									var success = false;
									
									switch (o.comparison) {
										case 'eq':
											success = (o.value && (o.value == o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '=';
											break;

										case 'lt':
											success = (o.value && (o.value < o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '<';
											break;

										case 'gt':
											success = (o.value && (o.value > o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '>';
											break;

										case 'lte':
											success = (o.value && (o.value <= o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '<=';
											break;

										case 'gte':
											success = (o.value && (o.value >= o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '>=';
											break;

										case 'ne':
											success = (o.value && (o.value != o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '!=';
											break;
									}
									
									if (!success) {
										validation = false;
									}

									return o;
								});
							} else { // json
								// $.data.style => data['data']['style']
								// $.data.class[0] => data['data']['class'][0]
								cases = info.validation.forms.map(function(o, i) {
									var split = o.field.replace(/\[([0-9]+)\]/g, '.[$1]').split('.');
									var value = result_data;

									split.shift(); // remove $
									split.map(function(item) {
										if (!value) {
											return;
										}

										if (/\[([0-9]+)\]/.test(item)) {
											value = eval('value' + item);
										} else {
											value = value[item];
										}
									});

									o.expected_value = o.value;
									o.value = value || "";
									o.value = o.value.toString();

									var success = false;
									
									switch (o.comparison) {
										case 'eq':
											success = (o.value && (o.value == o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '=';
											break;

										case 'lt':
											success = (o.value && (o.value < o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '<';
											break;

										case 'gt':
											success = (o.value && (o.value > o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '>';
											break;

										case 'lte':
											success = (o.value && (o.value <= o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '<=';
											break;

										case 'gte':
											success = (o.value && (o.value >= o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '>=';
											break;

										case 'ne':
											success = (o.value && (o.value != o.expected_value));
											
											o.result = (success) ? '<span style="color: green;">O</span>' : '<span style="color: red;">X</span>';
											o.comparison = '!=';
											break;
									}
									
									if (!success) {
										validation = false;
									}

									return o;
								});
							}
							
							$('.goorm-stdout-container .response_text_validation tbody').html(cases.map(function(validation_case) {
								return [
									'<tr>',
										'<td class="text-center">', validation_case.result, '</td>',
										'<td>', validation_case.field, '</td>',
										'<td style="word-break: break-word;">', validation_case.value, '</td>',
										'<td>', validation_case.comparison, '</td>',
										'<td style="word-break: break-word;">', validation_case.expected_value, '</td>',
									'</tr>'
								].join('');
							}));
							
							$('.goorm-stdout-container .response_text_validation').show();
						} else {
							$('.goorm-stdout-container .response_text_validation').hide();
						}
						
						$('#api_tester_http_version').html(data.http_version);
						$('#api_tester_http_status_code').html(data.status_code);
						$('#api_tester_http_status_message').html(data.status_message);
						
						var api_tester_http_status_circle = $('.api_tester_http_status_circle');

						if (data.status_code < 400) {
							api_tester_http_status_circle.css('color', '#0fcc0f');
						} else {
							api_tester_http_status_circle.css('color', '#ff2626');
						}
						
						var html = [];
						
						$('.response_headers p').empty();
						
						if (data.raw_headers && data.raw_headers.length > 0) {
							for (var i=0; i<data.raw_headers.length; i=i+2) {
								html.push('<b>' + data.raw_headers[i] + '</b>: ' + data.raw_headers[i+1] + '<br />');
							}
							
							$('.response_headers p').append(html.join(''));
						}
						
						if (!data.is_binary) {
							if (data.headers['content-type'].indexOf('image/') > -1) {
								var mime_type = data.headers['content-type'].split(';').shift();
								var src = 'data:' + mime_type + ';base64,' + btoa(data.data);
								
								$('.response_image img').attr('src', src);
								
								$('.response_download').hide();
								$('.response_image').show();
								$('.response_preview').hide();
							} else {
								$('.response_download').hide();
								$('.response_image').hide();
								$('.response_preview').show();

								var string = data.data;

								if (typeof(string) === 'object') {
									string = JSON.stringify(string, null, '\t');
								}


								var content_type = data.headers['content-type'] || "text/plain";
								var mime_type = content_type.split(';').shift();
								var editor = self.editors['preview-editor'];

								editor.setValue(string);
								editor.setOption('mode', mime_type);

								// js Lazy loading
								if (self.lazy_load) {
									CodeMirror.modeURL = 'codemirror/mode/%N/%N';
									CodeMirror.autoLoadMode(editor, CodeMirror.findModeByMIME(mime_type).mode);
								}
							}
						} else {
							$('.response_download').show();
							$('.response_image').hide();
							$('.response_preview').hide();
							
							var binary_data = data.data;
							var content_type = data.headers['content-type'] || "text/plain";

							var base64toBlob = function(base64Data, contentType) {
								var sliceSize = 1024;
								var byteCharacters = atob(base64Data);
								var bytesLength = byteCharacters.length;
								var slicesCount = Math.ceil(bytesLength / sliceSize);
								var byteArrays = new Array(slicesCount);

								for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
									var begin = sliceIndex * sliceSize;
									var end = Math.min(begin + sliceSize, bytesLength);

									var bytes = new Array(end - begin);

									for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
										bytes[i] = byteCharacters[offset].charCodeAt(0);
									}

									byteArrays[sliceIndex] = new Uint8Array(bytes);
								}

								return new Blob(byteArrays, { type: contentType });
							};

							var blob = base64toBlob(binary_data, content_type.split(';').shift());
							var url = window.URL.createObjectURL(blob);

							var linker = $('.api_tester_download');

							var filename = "download";

							if (data.req_info.options.method === 'GET') {
								filename = data.req_info.options.path.split('/').pop();
								filename = filename.split('?').shift();
							}

							linker.attr('download', filename);
							linker.attr('href', url);
						}
						
						if (data.status_code < 400) {
							if (info.validation.type) {
								if (validation) {
									// text validation success
									toast.show(main_localization.get_value("run_api_with_validation_success"), {
										'method': 'success'
									});
									
									$.post('/run_quiz/save', {
										'lesson_index': self.lesson_index || self.exam_index,
										'quiz_index': quiz_index
									}, function(data) {
										if (self.lesson_index) {
											menu.init_student_curriculum();
										}
									});
								} else {
									// text validation fail
									toast.show(main_localization.get_value("run_api_success_but_validation_fail"), {
										'method': 'error'
									});
								}
							} else {
								// success
								toast.show(main_localization.get_value("run_api_success"), {
									'method': 'success'
								});
								
								$.post('/run_quiz/save', {
									'lesson_index': self.lesson_index || self.exam_index,
									'quiz_index': quiz_index
								}, function(data) {
									if (self.lesson_index) {
										menu.init_student_curriculum();
									}
								});
							}
						} else {
							// fail..
							toast.show(main_localization.get_value("run_api_fail"), {
								'method': 'error'
							});
						}
					} else { 
						// toast..
					}
				});
			} else if ($('goorm-editor[form="scratchduino"]').length > 0) {
				/**
				 * SCRATCHDUINO
				 */

				var quiz_index = tabs.find('goorm-editor[form="scratchduino"]').attr('quiz_index');
				if (!self.port_connected) {
					toast.show(main_localization.get_value("toast_connect_goormduino"), {
						'method': 'error'
					});	
					return;
				}

				self.run_arduino_quiz(self.get_scratchduino_code(), quiz_index);
			} else if ($('goorm-editor[form="unittest"]').length > 0) {
				/**
				 * UnitTest
				 */
				$('goorm-editor[form="unittest"]').each(function(i, e) {
					if ($(e).parent().hasClass('active')) {
						
						var filetype = $(e).attr('filetype');
						var jdk_version = $(e).attr('jdk_version');

						var image_name = "";
						var compile = "";

						switch (filetype) {
							case 'junit':
								filetype = 'java';
								image_name = "code-runner/unittest-java-" + jdk_version + '_junit4';
								break;

							case 'cpputest_c':
								filetype = 'c';
								compile = 'cpp';
								image_name = 'code-runner/unittest-cpputest';
								break;

							case 'cpputest_cpp':
								filetype = 'cpp';
								image_name = 'code-runner/unittest-cpputest';
								break;
						}

						self.run_programming($(e), {
							'compile': compile,
							'filetype': filetype,
							'image_name': image_name
						});
					}
				});
			} else if ($('goorm-editor[form="programming"]').length > 0) {
				/**
				 *  QUIZ PROGRAMMING
				 */
				$('goorm-editor[form="programming"]').each(function(i, e) {
					if ($(e).parent().hasClass('active')) {
						var editor = self.editors[self.get_editor_id($(e))];

						if (~editor.getValue().indexOf('import turtle')) {
							// $('.turtle_new_view').show();
							// if ($('input[name="turtle_new_check"]').is(':checked')) {
							// 	self.run_python_turtle_modal(editor);
							// } else {
							// 	self.run_python_turtle(editor);
							// }
							self.run_python_turtle_modal(editor);
						} else {
							var filetype = $(e).attr('filetype');
							var image_name = self.get_language(filetype);

							self.run_programming(e, {
								'image_name': image_name
							});
								
							$('.turtle_new_view').hide();
							//if (window.is_mobile) {
							//	$('.middle_bottom_container .container').click();

							//	if (!$('.goorm-stdout-container').is(':visible')) {
							//		$('.toggle_terminal').click();
							//	}
							//}
						}
					}
				});
			} else {
				if ($(e).parent().hasClass('active')) {
					toast.show(main_localization.get_value("toast_run"), {
						'method': 'info'
					});
				}
			}
			
			/**
			 *  INPUT/OUTPUT
			 */
			// $('goorm-editor[form="input"], goorm-editor[form="output"], goorm-editor[form="terminal"]').each(function(i, e) {
			// 	if ($(e).parent().hasClass('active')) {
			// 		toast.show(main_localization.get_value("toast_run"), {
			// 			'method': 'info'
			// 		});
			// 	}
			// });
		});

		$(document).on('click', '#run_programming_quiz_testcase', function() {
			var tab = $('.goorm-quiz-tab');
			var tabs = $('goorm-tabs');
			
			if ($('goorm-editor[form="programming"]').length > 0) {
				/**
				 *  QUIZ PROGRAMMING
				 */
				$('goorm-editor[form="programming"]').each(function(i, e) {
					if ($(e).parent().hasClass('active')) {
						var editor = self.editors[self.get_editor_id($(e))];

						if (~editor.getValue().indexOf('import turtle')) {
							// $('.turtle_new_view').show();
							// if ($('input[name="turtle_new_check"]').is(':checked')) {
							// 	self.run_python_turtle_modal(editor);
							// } else {
							// 	self.run_python_turtle(editor);
							// }
							self.run_python_turtle_modal(editor);
						} else {
							var auto_input_testcase = $('#auto_input_testcase').prop('checked');
							var testcase_textarea = $('.testcase_textarea');
							
							if (testcase_textarea.length === 0) {
								toast.show(main_localization.get_value("msg_no_testcase_input"), {
									'method': 'error'
								});
							} else {
								var testcase = [];
								var test_target = [];

								for (var j = 0; j < testcase_textarea.length; j++) {
									testcase.push(testcase_textarea.eq(j).val());
									test_target.push(testcase_textarea.eq(j).val());
								}

								var same_flag = false;
								var same_value = "";

								test_target.sort(function(a, b) {
									if (a === b) {
										same_value = a;
										same_flag = true;
									}

									return true;
								});

								if (same_flag) {
									toast.show(main_localization.get_value("msg_should_be_no_same_input"), {
										'method': 'error'
									});
								} else {
									self.run_programming_insert_testcase(e, testcase);
								}
							}
						}
					}
				});
			} else {
				if ($(e).parent().hasClass('active')) {
					toast.show(main_localization.get_value("toast_run"), {
						'method': 'info'
					});
				}
			}
		});

		$(document).on('click', '.quiz_save', function() {
			if(is_end_exam) {
				return false;
			}
 
			var tab = $('.goorm-quiz-tab');
			var tabs = $('goorm-tabs');

			if (self.is_scratchduino) {
				tabs.find('goorm-editor').each(function(i, e) {
					var quiz = $(e);

					if (quiz.attr('form') != 'serial') {
						self.save({
							'lecture_index': self.lecture_index,
							'exam_index': self.lesson_index || self.exam_index,
							'quiz_index': quiz.attr('quiz_index'),
							'source': quiz.attr('filetype') == 'xml' ? self.get_scratchduino_xml() : self.get_scratchduino_code(),
							'answer_language': quiz.attr('filetype'),
							'removed_bookmarks': self.removed_bookmarks,
							'form': quiz.attr('form')
						});
					}
				});
			} else {
				/**
				 *  QUIZ PROGRAMMING
				 */
				tabs.find('goorm-editor').each(function(i, e) {
					if ($(e).parent().hasClass('active')) {
						var quiz = $(e);

						if (quiz.attr('form') === 'scratch') {
							self.save({
								'lecture_index': self.lecture_index,
								'exam_index': self.lesson_index || self.exam_index,
								'quiz_index': quiz.attr('exam').split('/')[1],
								'source': self.scratch.ASexportProjectToBase64(),
								'answer_language': quiz.attr('filetype'),
								'removed_bookmarks': self.removed_bookmarks,
								'form': quiz.attr('form'),
								'file_path': quiz.attr('file_path')
							});
						} else if (quiz.attr('form') === 'entry') {
							self.save({
								'lecture_index': self.lecture_index,
								'exam_index': self.lesson_index || self.exam_index,
								'quiz_index': quiz.attr('exam').split('/')[1],
								'source': JSON.stringify($('#entry_iframe').get(0).contentWindow.Entry.exportProject()),
								'answer_language': quiz.attr('filetype'),
								'removed_bookmarks': self.removed_bookmarks,
								'form': quiz.attr('form'),
								'file_path': quiz.attr('file_path')
							});
						} else if (quiz.attr('form') === 'restfulapi') {
							var info = JSON.parse($('.api-info').text());
				
							var uri_params_container = $('.uri_params_container');

							if (uri_params_container.find('.header_params') && uri_params_container.find('.header_params').length > 0) {
								info.header.uri_params = [];

								uri_params_container.find('.header_params').map(function(i, o) {
									var key = $(o).find('[name="key"]').val();
									var value = $(o).find('[name="value"]').val();

									info.header.uri_params.push({
										'key': key,
										'value': value
									});
								});
							}

							var http_header_container = $('.http_header_container');

							if (http_header_container.find('.header_params') && http_header_container.find('.header_params').length > 0) {
								info.header.params = [];

								http_header_container.find('.header_params').map(function(i, o) {
									var key = $(o).find('[name="key"]').val();
									var value = $(o).find('[name="value"]').val();

									if ($(o).find('[name="value"]').get(0).tagName === 'SELECT' && value === 'null') {
										return;
									}

									if (key.toLowerCase() === 'content-type') {
										info.header['content-type'] = value;
									}

									info.header.params.push({
										'key': key,
										'value': value
									});
								});
							}

							if (info.method !== 'get') {
								var x_www_form_urlencoded_container = $('.x-www-form-urlencoded_container');

								if (info.body.form === 'raw') {
									info.body.form_data.raw = self.editors['raw-editor'].getValue();
								} else if (info.body.form === 'x-www-form-urlencoded') {
									if (x_www_form_urlencoded_container.find('.header_params') && x_www_form_urlencoded_container.find('.header_params').length > 0) {
										info.body.form_data.params = [];

										x_www_form_urlencoded_container.find('.header_params').map(function(i, o) {
											var key = $(o).find('[name="key"]').val();
											var value = $(o).find('[name="value"]').val();

											if ($(o).find('[name="value"]').get(0).tagName === 'SELECT' && value === 'null') {
												return;
											}

											info.body.form_data.params.push({
												'key': key,
												'value': value
											});
										});
									}
								}
							}
							
							self.save({
								'lecture_index': self.lecture_index,
								'exam_index': self.lesson_index || self.exam_index,
								'quiz_index': quiz.attr('exam').split('/')[1],
								'source': JSON.stringify(info),
								'answer_language': quiz.attr('filetype'),
								'removed_bookmarks': self.removed_bookmarks,
								'form': quiz.attr('form'),
								'file_path': quiz.attr('file_path')
							});
						} else {
							var editor_id = self.get_editor_id(quiz);
							var editor = self.editors[editor_id];

							if (editor) {
								self.save({
									'editor': editor,
									'lecture_index': self.lecture_index,
									'exam_index': self.lesson_index || self.exam_index,
									'quiz_index': quiz.attr('exam').split('/')[1],
									'source': editor.getValue(),
									'answer_language': quiz.attr('filetype'),
									'removed_bookmarks': self.removed_bookmarks,
									//for web programming quiz
									'form': quiz.attr('form'),
									'file_path': quiz.attr('file_path')
								});
							}
						}
					}
				});
			}
		});
		
		$(document).on('click', '.quiz_clear', function() {
			var editor = $('goorm-tabs').find('.tab-pane.active goorm-editor');
			var index = editor.attr('quiz_index');
			var form = editor.attr('form');
			//if exists. web quiz
			var file_path = editor.attr('file_path');

			confirmation.init({
				title: main_localization.get_value('dialog_confirmation'),
				message: main_localization.get_value('msg_sure_to_init'),
				yes_text: main_localization.get_value('yes'),
				no_text: main_localization.get_value('no'),

				yes: function() {
					if (editor.attr('form') === 'terminal') {
						toast.show(main_localization.get_value("toast_initialize"), {
							method: 'info'
						});
					} else if (editor.attr('form') === 'blockly') {
						goorm_blockly.discard(editor);
					} else if (editor.attr('form') === 'scratch') {
						self.scratch.ASloadBase64SBX(self.scratch_default_data);
					} else if (editor.attr('form') === 'entry') {
						$('#entry_iframe').get(0).contentWindow.location.reload();
					} else if (editor.attr('form') === 'restfulapi') {
						var info = JSON.parse($('.api-info').text());

						$('.http_uri').val(info.protocol + '://' + info.header.uri);
						
						if (info.header.uri_params && info.header.uri_params.length > 0) {
							var uri_params_container = $('.uri_params_container');
							
							info.header.uri_params.map(function(o) {
								uri_params_container.find('[data-keyname="' + o.key + '"]').val(o.value);
							});
						}
						
						if (info.header.params && info.header.params.length > 0) {
							var params_container = $('.http_header_container');
							
							info.header.params.map(function(o) {
								params_container.find('[data-keyname="' + o.key + '"]').val(o.value);
							});
						}
						
						if (info.method !== 'get') {
							if (info.body.form === 'raw') {
								self.editors['raw-editor'].setValue(info.body.form_data.raw);
							} else if (info.body.form === 'x-www-form-urlencoded') {
								if (info.body.form_data.params && info.body.form_data.params.length > 0) {
									var x_www_form_urlencoded_container = $('.x-www-form-urlencoded_container');
									
									info.body.form_data.params.map(function(o) {
										x_www_form_urlencoded_container.find('[data-keyname="' + o.key + '"]').val(o.value);
									});
								}
							}
						}
					} else {
						if (index) {	// answer tabs have quiz index

							if (form === 'web' && file_path) {
								/*
								 * Web Programming Quiz Case
								 */
								$.get('/quiz/get_template_code', {
									'quiz_index': index,
									'file_path': file_path,
									'form': form
								}, function(result) {
									if (!result) {
										result = '<?php\recho "Hello World!";\r?>';
									}
									self.editors[self.get_editor_id(editor)].setValue(result);
								});
							} else {
								$.get('/quiz/get_template_code', {
									quiz_index: index,
									form: form
								}, function(result) {
									if (result) {
										if (editor.attr('form') === 'arduino') {
											self.editors[self.get_editor_id(editor)].setValue(result);
										} else if (editor.attr('form') === 'scratchduino') {
											self.scratchduino_init_blocks(result);
											self.scratchduino_init_code(self.editors['edu_tab_1']);
										} else {
											var answer_code = JSON.parse(result);
											var value = editor.attr('type') ? answer_code[editor.attr('type')] : "";

											if (!value) {
												if (editor.attr('form') === 'unittest') {
													value = answer_code[editor.attr('filetype')];
												} else {
													// need refactoring...
													switch (editor.attr('filetype').toLowerCase()) {
														case 'c':
															value = answer_code.c;
															break;
														case 'cpp':
														case 'c++':
															value = answer_code['c++'];
															break;
														case 'java':
															value = answer_code.java;
															break;
														case 'python':
														case 'py':
															value = answer_code.python;
															break;
														case 'python3':
														case 'py3':
															value = answer_code.python3;
															break;
														case 'go':
															value = answer_code.go;
															break;
														case 'cs':
															value = answer_code.csharp;
															break;
														case 'swift':
															value = answer_code.swift;
															break;
														case 'js':
															value = answer_code.javascript;
															break;
														case 'rb':
															value = answer_code.ruby;
															break;
														case 'kt':
															value = answer_code.kotlin;
															break;
														case 'scala':
															value = answer_code.scala;
															break;
														case 'vb':
															value = answer_code.vbdotnet;
															break;
														case 'pas':
															value = answer_code.pascal;
															break;
														case 'lua':
															value = answer_code.lua;
															break;
														case 'm':
															value = answer_code.objectivec;
															break;
														case 'R':
															value = answer_code.R;
															break;
														case 'rust':
															value = answer_code.rust;
															break;
														case 'cob':
															value = answer_code.cobol;
															break;
														case 'clj':
															value = answer_code.clojure;
															break;
														case 'st':
															value = answer_code.smalltalk;
															break;
														case 'dart':
															value = answer_code.dart;
															break;
														case 'hs':
															value = answer_code.haskell;
															break;
														case 'pl':
															value = answer_code.perl;
															break;
														case 'lisp':
															value = answer_code.commonlisp;
															break;
														case 'd':
															value = answer_code.d;
															break;
														case 'erl':
															value = answer_code.erlang;
															break;
														case 'php':
															value = answer_code.php;
															break;
														default:
															value = self.get_default_template(editor.attr('lang_mode') || editor.attr('lang') || "text/x-csrc");
													}
												}
											}
											
											self.editors[self.get_editor_id(editor)].setValue(value);
										}
									} else {	// for old quiz that does not have answer skeleton code
										self.editors[self.get_editor_id(editor)].setValue(self.get_default_template(editor.attr('lang_mode') || editor.attr('lang') || "text/x-csrc"));
									}
								});
							}
						} else {	// input, output editor
							self.editors[self.get_editor_id(editor)].setValue(self.get_default_template(editor.attr('lang_mode') || editor.attr('lang') || "text/x-csrc"));
						}
					}					
				}
			}).show();
		});
		
		$(document).on('click', '.quiz_extension', function() {
			$('#dlg_arduino_extension').modal('show');
		});
		
		$('.setup_chrome_extension').click(function() {
			if (self.user_agent.indexOf("Chrome") < 0 || self.user_agent.indexOf("Edge") > 0) {
				toast.show(main_localization.get_value("toast_use_chrome"), {
					'method': 'error'
				});
				return;
			}

			window.open('https://chrome.google.com/webstore/detail/goormarduino/' + self.chrome_extension_id);
		});
		
		$('.reload_arduino').click(function() {
			if (self.port_connected) {
				self.port.postMessage({'op':'device'});
			} else {
				toast.show(main_localization.get_value("toast_connect_goormduino"), {
					'method': 'error'
				});
			}
		});
		
		$('.connect_chrome_extension').click(function() {
			var ext_loading = $('.run_loading', this);
			var ext_loaded = $('.run_loaded', this);

			if (self.user_agent.indexOf("Chrome") < 0 || self.user_agent.indexOf("Edge") > 0) {
				toast.show(main_localization.get_value("toast_use_chrome"), {
					'method': 'error'
				});
				return;
			}

			// set true when conneced
			if (!self.port_connected) {
				self.init_arduino_app();
			}
			
			if (self.port) {
				ext_loading.show();
				ext_loaded.hide();

				self.running = setTimeout(function() {
					ext_loading.hide();
					ext_loaded.hide();

					toast.show(main_localization.get_value("toast_install_goormduino"), {
						'method': 'error'
					});
				}, 3000);
				
				self.port_test = true;
				self.port.postMessage({'op':'device'});
			} else {
				// notice.show('');
			}
		});
		
		$('.toggle_serial').click(function() {
			if (self.port_connected) {
				var icon = $('.connent_icon', this);
				var state = $('.state', this);

				if (!$(this).hasClass('active')) {
					self.port.postMessage({
						'op': 'serial_connect',
						'selectedPort': $(".arduino_device option:selected").text()
					});

					icon.removeClass('fa-plug').addClass('fa-times');
					state.html(main_localization.get_value("msg_serial_disconnect"));
				} else {
					self.port.postMessage({
						'op': 'disconnect',
					});

					icon.removeClass('fa-times').addClass('fa-plug');
					state.html(main_localization.get_value("msg_serial_connect"));
				}
			} else {
				setTimeout(function() {
					$('.toggle_serial').removeClass('active');
				}, 1000);

				toast.show(main_localization.get_value("toast_connect_goormduino"), {
					'method': 'error'
				});
			}
		});
		
		$('.send_msg').click(function() {
			if (self.port_connected) {
				self.port.postMessage({
					'op':'send_data',
					'data': $('.send_input').val()
				});

				$('.send_input').val("");
			} else {
				toast.show(main_localization.get_value("toast_connect_goormduino"), {
					'method': 'error'
				});
			}
		});

		$('.send_input').keyup(function(e) {
			if (e.keyCode === 13) {
				$('.send_msg').click();
			}
		});
		
		/**
		 * toggle button event at bottom
		 */
		$('.middle_bottom_container .container').on('mousedown', function() {
			var target = $('.middle_right_container');
			var left_container = $('.middle_left_container');
			
			if (target.is(':visible')) {
				if (window.is_mobile || $(window).width() <= 767) {
					target.hide();
					
					left_container.show('slide', {
						'direction': 'up'
					}, 300);
					
				} else {
					target.hide("slide", {
						'direction': 'down'
					}, 300);
				}

				self.set_toggle_state('show');
			} else {
				if (window.is_mobile || $(window).width() <= 767) {
					left_container.hide();
					
					target.show("slide", {
						'direction': 'down'
					}, 300);
				} else {
					target.show("slide", {
						'direction': 'down'
					}, 300);
				}

				var editor = self.editors[$('.goorm-quiz-tab .tab-pane.active').attr('id')];

				editor.refresh();
// 				editor.focus();
				
				self.set_toggle_state('hide');
			}
		});
		
		$(document).on('click touchstart', '.editor_widget', function() {
			var widget_info = $(this);
			var editor = self.editors[widget_info.attr('editor_id')];
			var all_marks = editor.getAllMarks();
			var id = widget_info.attr('lang') + '_' + widget_info.attr('line') + '_' + widget_info.attr('ch');
			
			for (var i = 0, len = all_marks.length; i < len; i++) {
				var widget = all_marks[i];

				if (widget && widget.type === 'bookmark') {
					var pos = widget.find();
					var widget_dom = widget.widgetNode.children[0];
					var widget_id = widget_dom.getAttribute('lang') + '_' + widget_dom.getAttribute('line') + '_' + widget_dom.getAttribute('ch');

					if (id === widget_id) {
						self.removed_bookmarks.push(id);
						widget.clear();
						editor.focus();
						editor.setCursor({line: Number(widget_info.attr('line')), ch: Number(widget_info.attr('ch'))});
					}
				}
			}
		});

		$('#set_view_option_confirm_ok').on('click', function() {
			var set_data = $('#dlg_setting .modal-body');

			$('.CodeMirror').css('font-size',set_data.find('.editor_font_size').val());
			$('.CodeMirror').css('line-height',set_data.find('.editor_line_height').val());
			var theme = set_data.find('.editor_theme').val();
			$.map(self.editors, function(val, i) {
				val.setOption("theme", theme);
			});
			
			if (theme === 'default') {
				$('.CodeMirror-vscrollbar').addClass('light_theme');
			} else if (theme === 'monokai') {
				$('.CodeMirror-vscrollbar').removeClass('light_theme');
			}
			$('.CodeMirror-vscrollbar').css('overflow-y', 'hidden');
			setTimeout(function() {
				$('.CodeMirror-vscrollbar').css('overflow-y', 'scroll');
			}, 1);
			
			$('.instruction_content .print_target *').css('font-size',set_data.find('.content_font_size').val());
			$('.instruction_content .print_target *').css('line-height',set_data.find('.content_line_height').val());
			
			var key_map = set_data.find('.editor_keymap').val();
 			$.map(self.editors, function(val, i) {
 				val.setOption("keyMap", key_map);
 				val.refresh();
 			});

			var screen_size = set_data.find('.gui_screen_size').val();
			var width = screen_size.split('x').shift();
			var height = screen_size.split('x').pop();

			self.gui_screen_size = {
				'width': width,
				'height': height
			};
			
			$('#dlg_setting').modal('hide');

			if (self.is_scratchduino) {
				var block_theme = set_data.find('.blocks_theme').val();

				if (block_theme == 'default') {
					$('svg.blocklySvg').css('background-color', '#ffffff');
				} else {
					$('svg.blocklySvg').css('background-color', '#222222');
				}
			}
		});
		
		$('#dlg_setting').on('shown.bs.modal', function () {
			var set_data = $('#dlg_setting .modal-body');
			var content_line_height = set_data.find('.content_line_height').val();
			var content_font_size = set_data.find('.content_font_size').val();
			var editor_line_height = set_data.find('.editor_line_height').val();
			var editor_font_size = set_data.find('.editor_font_size').val();
			var editor_theme = set_data.find('.editor_theme').val();
		
			$('#set_view_option_confirm_cancel').on('click', function() {
				set_data.find('.content_line_height').val(content_line_height).attr("selected", true);
				set_data.find('.content_font_size').val(content_font_size).attr("selected", true);
				set_data.find('.editor_line_height').val(editor_line_height).attr("selected", true);
				set_data.find('.editor_font_size').val(editor_font_size).attr("selected", true);
				set_data.find('.editor_theme').val(editor_theme).attr("selected", true);
			});
		});
		
		$('#arduino_extension_confirm_ok').on('click', function() {
			$('#dlg_arduino_extension').modal('hide');
		});

		$("#myTabs li a").click(function(e) {
			$('#myTabs > li.active').removeClass('active');
			
			var editor_id = ($(this).attr('href')) ? $(this).attr('href').substring(1) : "";

			if (self.is_scratchduino) {
				var tab_name = $(this).attr('scratchduino-key');

				if (tab_name == 'scratchduino_blocks') {
					if (!$('#content_blocks').is(':visible')) {
						if (window.is_mobile) {
							if ($('#block_up_icon').css('display') != 'none') {
								$('.blocklyToolboxDiv').show();
							}
						} else {
							$('.blocklyToolboxDiv').show();
						}
						$(this).tab('show');
						Blockly.mainWorkspace.render();

						setTimeout(function() {
							if (self.scratchduino_blocks_offset.top && self.scratchduino_blocks_offset.left) {
								Blockly.mainWorkspace.scrollbar.set(self.scratchduino_blocks_offset.left, self.scratchduino_blocks_offset.top);
							} else {
								Blockly.mainWorkspace.scrollCenter();
							}
						}, 100);
					}
				} else if (tab_name == 'scratchduino_source_c') {
					Blockly.mainWorkspace.toolbox_.clearSelection();
					var metrics = Blockly.mainWorkspace.getMetrics();
					var left = metrics.contentLeft - metrics.viewLeft;
					var top = metrics.contentTop - metrics.viewTop;

					self.scratchduino_blocks_offset.top = Math.abs(top);
					self.scratchduino_blocks_offset.left = Math.abs(left);

					$('.blocklyToolboxDiv').hide();
					$(this).tab('show');

					self.scratchduino_init_code(self.editors[editor_id]);

					if (self.editors[editor_id]) {
						self.editors[editor_id].refresh();
						self.editors[editor_id].focus();
					}
				} else {
					Blockly.mainWorkspace.toolbox_.clearSelection();
					$(this).tab('show');
					$('.blocklyToolboxDiv').hide();

					if (self.terminals[editor_id]) {
						self.terminals[editor_id].resize();
						self.terminals[editor_id].focus();
					}
				}
				Blockly.fireUiEvent(window, 'resize');
			} else {
				var tab_selector = $(this).attr('href');
				var selected_lang = $(tab_selector).find('.goorm-editor').attr('goorm-tab');
				var is_exam = /\/exam\//.test(location.pathname);
				if (selected_lang) {
 					localStorage['grm_t_edt_' + (is_exam ? self.exam_index : self.lesson_index) + '_selected_lang'] = selected_lang;
 				}
				
				if (selected_lang === 'TestCode') {
					$('.coding_tools a').addClass('disabled');
				} else {
					$('.coding_tools a').removeClass('disabled');
				}
				
				$('#lang_select_menu .selected_lang').text($(this).text());
				
				$(this).tab('show');
				
				if (self.editors[editor_id]) {
					self.editors[editor_id].refresh();
					self.editors[editor_id].focus();
				}

				if (self.terminals[editor_id]) {
					self.terminals[editor_id].resize();
					self.terminals[editor_id].focus();
				}
			}

			e.preventDefault();
		});
		
		$(document).on('mousedown', '.tab_move', function() {
			var $myTabs = $('#myTabs');
			var $correct_li = $myTabs.find('.active');
			var $target_li;

			var direction = $(this).hasClass('left') ? 'right' : 'left';
			var matrix = $myTabs.css('transform').replace(/[^0-9\-.,]/g, '').split(',');
			var offset = 40; // offset is tab_move_btn width and margin
			var offset_right = 235;

			var xPos_myTabs = Number(matrix[12] || matrix[4]);
			var xPos_target_li;
			var xPos_target_li_width;
			var xPos_result;

			if (direction === 'left') {
				$target_li = $correct_li.next('li');
			} else {
				$target_li = $correct_li.prev('li');
			}

			if (!$target_li.length) {
				$target_li = $correct_li;
			}
			
			if (!$target_li) {
				return;
			} else {
				xPos_target_li = $target_li.position().left;
				xPos_target_li_width = $target_li.outerWidth();

				if (direction === 'left') {
					if (self.visible_tab_width < (xPos_target_li + xPos_target_li_width + self.one_nav_li_width - offset_right) - xPos_myTabs * -1) {
						xPos_result = self.visible_tab_width - (xPos_target_li + xPos_target_li_width + self.one_nav_li_width) + offset_right;
						$myTabs.css('transform', 'translateX('+ xPos_result +'px)');
					}
				} else {
					if (xPos_target_li < (xPos_myTabs * -1) + offset) {
						xPos_result = (xPos_target_li - offset) * -1;

						if (!$target_li.prev('li').length) {
							xPos_result = offset;
						}

						$myTabs.css('transform', 'translateX('+ xPos_result +'px)');
					}
				}
				$target_li.find('a').click();
			}
		});
		
		$(document).on('click', '.btns_toggle', function() {
			var $this = $(this);
			if ($this.hasClass('on')) {
				$('#myTabs').show();
				$('a.btn[class*="quiz_"]').hide();
				
				if ($('.tab_move').attr('is_hidden') === 'true') {
					$('.tab_move').attr('is_hidden', 'false').show();
				}
				
				$this.removeClass('on').find('i').removeClass('fa-angle-double-right').addClass('fa-ellipsis-h');
			} else {
				$('#myTabs').hide();
				
				if ($('.tab_move').css('display') !== 'none') {
					$('.tab_move').attr('is_hidden', 'true').hide();
				}

				$('a.btn[class*="quiz_"]').show();
				$this.addClass('on').find('i').removeClass('fa-ellipsis-h').addClass('fa-angle-double-right');
			}
		});
							
		$('#add_testcase').click(function() {
			$('#testcase_list').append([
				'<div class="input-group testcase_textarea_group">',
					'<textarea class="form-control testcase_textarea" style="resize: none;"></textarea>',
					'<span class="input-group-btn">',
						'<button type="button" class="btn btn-default remove_testcase">',
							'<i class="fa fa-minus"></i>',
						'</button>',
					'</span>',
				'</div>'
			].join(''));
		});
		
		$(document).on('click', '.remove_testcase', function() {
			$(this).closest('div.testcase_textarea_group').remove();
		});
							
		$('#show_testcase_container').click(function() {
		  $('#testcase_container').toggle();
		});
	},

	init_scratchduino: function(code) {
		var self = this;

		/**
		 * Initialize Blockly.  Called on page load.
		 */
		if (window.is_mobile) {
			$('.mobile_run_btn').hide();
			Blockly.Scrollbar.scrollbarThickness = 10;
			Blockly.Trashcan.prototype.MARGIN_BOTTOM_ = 15;
			Blockly.Trashcan.prototype.MARGIN_SIDE_ = 15;
			Blockly.ZoomControls.prototype.MARGIN_SIDE_ = 12;
			Blockly.ZoomControls.prototype.HORIZONTAL_MARGIN_BOTTOM_ = 12;
			Blockly.Toolbox.mobile_target = document.getElementsByClassName('running_content')[0];
		}

		function init() {
			var toolbox = document.getElementById('toolbox');
			Blockly.inject(document.getElementById('content_blocks'),
			  {grid:
				  {spacing: 25,
				   length: 3,
				   colour: '#ccc',
				   snap: true},
			   media: '/media/',
			   toolbox: toolbox,
			   zoom: {
				 controls: true,
				 wheel: true,
				 startScale: window.is_mobile ? 0.5 : 0.8,
				 maxScale: 2,
				 minScale: 0.2,
				 scaleSpeed: 0.1,
				 horizontal: window.is_mobile ? true : false
			   }});

			self.scratchduino_init_blocks(code);
			Blockly.Toolbox.margin_left = 5;
			Blockly.Toolbox.margin_top = window.is_mobile ? 28 : 5;

			var toolbox_leftbox = $('.blocklyTreeIcon.blocklyTreeIconNone');
			var toolbox_list = ['operators', 'control', 'data', 'function', 'inout', 'servo', 'sensor', 'zumo'];

			for (var i = 0; i < toolbox_leftbox.length; i++) {
				toolbox_leftbox.eq(i).css({
					'margin-left': '8px',
					'margin-right': '2px',
					'margin-bottom': '3px',
					'width': '8px',
					'height': '85%',
					'background-color': Blockly.Colours[toolbox_list[i]].primary
				});
			}

			if (window.is_mobile) {
				var toggle_toolbox_btn = ['<button id="toggle_toolbox_btn" class="btn no-swiping" style="position:absolute; top:5px; left:5px; z-index:999; padding:4px 6px; background-color:#333;">',
										 '<img id="block_down_icon" src="/media/block_down.png" style="width:30px;">',
										 '<img id="block_up_icon" src="/media/block_up.png" style="display:none;width:30px;">',
										 '</button>'].join('');
				$('#content_blocks').prepend(toggle_toolbox_btn);
				$('.blocklyToolboxDiv').addClass('no-swiping').hide();

				$('#toggle_toolbox_btn').on('click', function(e) {
					if ($('#block_down_icon').is(':visible')) {
						$('#block_down_icon').hide();
						$('#block_up_icon').show();
						$('.blocklyToolboxDiv').show();
					} else {
						$('#block_up_icon').hide();
						$('#block_down_icon').show();
						Blockly.mainWorkspace.toolbox_.clearSelection();
						$('.blocklyToolboxDiv').hide();
					}
				});
			}
		}

		init();
	},

	scratchduino_init_blocks: function(code, callback) {
		Blockly.mainWorkspace.clear();
		if (code) {
			var xml = Blockly.Xml.textToDom(code);
			Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
		}

		if ($('#content_blocks').is(':visible')) {
			setTimeout(function() {
				Blockly.mainWorkspace.scrollCenter();
			}, 100);
		}
	},

	scratchduino_init_code: function(editor) {
		editor.setValue(Blockly.Arduino.workspaceToCode(Blockly.getMainWorkspace()));
	},

	get_scratchduino_code: function() {
		return Blockly.Arduino.workspaceToCode(Blockly.getMainWorkspace());
	},

	get_scratchduino_xml: function() {
		var xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
		var xmlText = Blockly.Xml.domToPrettyText(xmlDom);

		return xmlText;
	},

	scratchduino_onresize: function(e) {
		if (!this.no_scratchduino && $('#content_blocks').is(':visible')) {
			var container = document.getElementById('content_area');
			var bBox = this.scratchduino_getBBox_(container);
			var el = document.getElementById('content_blocks');
			$(el).css('position', 'absolute');
			el.style.top = bBox.y + 'px';
			el.style.left = bBox.x + 'px';
			// Height and width need to be set, read back, then set again to
			// compensate for scrollbars.
			el.style.height = bBox.height + 'px';
			el.style.height = (2 * bBox.height - el.offsetHeight) + 'px';
			el.style.width = bBox.width - 1 + 'px';
			el.style.width = (2 * bBox.width - el.offsetWidth) - 2 + 'px';

			var is_same = function(a, b) {
				return a - 1 <= b && a + 1 >= b ? true : false;
			};
			var $content_area = $('#content_area');
			var $blockly_svg = $('#content_blocks').children('.blocklySvg');
			if (!is_same($content_area.width(), $blockly_svg.width()) || !is_same($content_area.height(), $blockly_svg.height())) {
				Blockly.svgResize(Blockly.mainWorkspace);
			}
		}
	},

	/**
	 * Compute the absolute coordinates and dimensions of an HTML element.
	 * @param {!Element} element Element to match.
	 * @return {!Object} Contains height, width, x, and y properties.
	 * @private
	 */
	scratchduino_getBBox_: function(element) {
	  var height = element.offsetHeight;
	  var width = element.offsetWidth;
	  var x = element.offsetLeft;
	  var y = element.offsetTop;
		// do {
		// x += element.offsetLeft;
		// y += element.offsetTop;
		// element = element.offsetParent;
		// } while (element);
	  return {
		height: height,
		width: width,
		x: x,
		y: y
	  };
	},
	
	set_toggle_state: function(state) {
		var container = $('.middle_bottom_container .container');
		
		if (state === 'hide') {
			$('i', container).removeClass('fa-chevron-up').addClass('fa-chevron-down');
			if (window.is_mobile) {
				$('.bottom_toggle', container).html(main_localization.get_value("show_lesson"));
			} else {
				$('.bottom_toggle', container).html(main_localization.get_value("close"));
			}
		} else { // show
			$('i', container).removeClass('fa-chevron-down').addClass('fa-chevron-up');
			$('.bottom_toggle', container).html(main_localization.get_value("practice"));
		}
	},
	
	set_output: function(data) {
		var goorm_tabs = $('goorm-tabs');
		
		if (goorm_tabs.find('[form="output"]').length > 0) {
			var output_editor_id = this.get_editor_id(goorm_tabs.find('[form="output"]'));
			var output_editor = this.editors[output_editor_id];

			if (output_editor) {
				output_editor.setValue(data);
			}
		}
	},

	get_editor_id: function(e) {
		e = $(e);

		return (e.attr('no-tab')) ? e.attr('id') : e.parent().attr('id');
	},

	get_programming_data: function(e) {
		return {
			'quiz_index': $(e).attr('quiz_index'),
			'type': $(e).attr('filetype'),
			'answer': '<br/>' + this.editors[this.get_editor_id($(e))].getValue().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;')
		};
	},

	save: function(options, callback) {
		var self = this;
		var post_data = {};
		var editor = null;

		if(this.lecture_is_sample) { // if exame is sample, make not to save the code
			return;
		}

		if (options) {
			post_data = {
				lecture_index: options.lecture_index,
				exam_index: options.exam_index,
				quiz_index: options.quiz_index,
				source: options.source,
				answer_language: options.answer_language,
				removed_bookmarks: options.removed_bookmarks,
				//for web programming quiz
				form: options.form,
				file_path: options.file_path
			};

			editor = options.editor;
		} else {
			// console programming quiz
			var $active_editor = $('.goorm-quiz-tab .tab-pane.active .goorm-editor');

			var editor_id = this.get_editor_id($active_editor);
			editor = this.editors[editor_id];

			if (editor) {
				post_data = {
					lecture_index: this.lecture_index,
					exam_index: this.lesson_index || this.exam_index,
					quiz_index: $active_editor.attr('exam').split('/')[1],
					source: editor.getValue(),
					answer_language: $active_editor.attr('filetype'),
					removed_bookmarks: this.removed_bookmarks,
					form: $active_editor.attr('form'),
					file_path: $active_editor.attr('file_path')
				};
			}
		}

		if (editor) {
			editor.markClean();
		}

		$.post('/submit_quiz/save',
			post_data
		).done(function(result) {
			if (post_data.form == 'scratchduino' && post_data.answer_language == 'xml') {
				return;
			}
			if (result === true) {
				toast.show(main_localization.get_value("toast_save_success"), {
					'method': 'info'
				});
				if (is_student && is_collaboration) {
					if (self.ot_socket) {
						self.ot_socket.emit('edu_save', {
							user_id: user_id,
							user_name: user_name,
							language: options.answer_language,
							filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
						});
					}
				}
			} else if (result == 'not student') {
				toast.show(main_localization.get_value("toast_save_fail_not_student"), {
					'method': 'error'
				});
			} else {
				toast.show(main_localization.get_value("toast_save_fail"), {
					'method': 'error'
				});
			}
			
			if (callback && typeof(callback) === 'function') {
				callback(result);
			}
		}).fail(function(xhr, textStatus, errorThrown) {
			toast.show('[저장] 요청이 많아 처리가 지연되고 있습니다.<br>코드를 임시로 복사해두고 다시 시도해주세요.', {
				'method': 'warning'
			});
		});
	},
	
	run_programming: function(e, options) {
		var self = this;
		
		var quiz = $(e);
		var goorm_tabs = quiz.parents('goorm-tabs');

		var editor_id = this.get_editor_id(quiz);

		var tab = $('a[href="#' + editor_id + '"]');
		var editor = this.editors[editor_id];
		
		if (self.programming_process_running) {
			toast.show(main_localization.get_value('msg_try_again_after_process_end'), {
				'method': 'warning'
			});
			return;
		}
		
		if (this.quiz_data.form === 'programming') {
			var wait_time = this.quiz_data.run_time_limit;
			
			if (typeof wait_time === 'undefined' || !wait_time || wait_time <= 0) {
				wait_time = 60;
			}
			
			var run_time_limit = wait_time ? wait_time : 60; //60 sec is default value
			
			$('.btn_stop').addClass('active');
			$('.btn_stop').one('click', function() {
				self.run_programming_stop_handler({
					set_terminal_stop: true,
					clearTimeout: true,
					skip_badge_check: true
				});
			});
			
			this.programming_process_running = true;
			this.process_killer_timeout = setTimeout(function() {
				toast.show(main_localization.get_value('msg_program_abort_becuaseof_time_limit') + self.quiz_data.run_time_limit + ')', {
					'method': 'warning'
				});
				self.run_programming_stop_handler({
					set_terminal_stop: true,
					set_timer_full: true
				});
			}, run_time_limit * 1000);
			
		}
		
		
		$('.quiz_term_run').prop('disabled',true)
						 .addClass('disabled_btn');
		var $run_test_case = $('.run_test_case');
		if ($run_test_case && $run_test_case.length > 0) {
			$run_test_case.prop('disabled',true)
							 .addClass('disabled_btn');
		}
		
		$('.quiz_term_run').children().hide();
		$('#quiz_term_run_loading_preparing').show();
		
		if (!options) {
			options = {};
		}
		
		if (editor) {
			var input = '';
			var output = '';

			$('.goorm-turtle-container').hide();
			$('.goorm-stdout-container').show();

			
			if (goorm_tabs.find('[form="input"]').length > 0) {
				var input_editor_id = this.get_editor_id(goorm_tabs.find('[form="input"]'));
				var input_editor = this.editors[input_editor_id];
				
				if (input_editor) {
					input = input_editor.getValue();
				}
			}

			if (goorm_tabs.find('[form="output"]').length > 0) {
				var output_editor_id = this.get_editor_id(goorm_tabs.find('[form="output"]'));
				var output_editor = this.editors[output_editor_id];
				
				if (output_editor) {
					output = output_editor.getValue();
				}
			}

			if (this.run_terminal) {
				this.run_terminal.destroy();
			}

			arrow.show();
			self.terminal_tab_flicker();
			var terminal = this.run_terminal = new goorm_terminal();
			
			if ($('.goorm-stdout-container').length === 0) {
				$('.goorm-stdout-wrapper').append('<div class="goorm-stdout-container terminal-style" tabindex="0"></div>');
			}
			
			var stdout_container = $('.goorm-stdout-container');
			
			terminal.load(stdout_container, {
				'id': self.session.id,
				'lecture_index': self.lecture_index,
				'lesson_index': self.lesson_index,
				'quiz_index': quiz.attr('exam').split('/')[1],
				'source': editor.getValue(),
				'filetype': options.filetype || quiz.attr('filetype'),
				'compile': options.compile || "",
				'image_name': options.image_name || "",
				'input': input,
				'output': output,
				'stat': true,
				'show_runtime': true,
				'margin_top': 33,
				// 'dotnet_core': quiz.attr('type') === 'dotnet'
			}, {
				finish: function() {
					self.run_programming_stop_handler({
						clearTimeout: true
					});
				},
				before_stop: function(container_info, next) {
					var container_socket = new io.connect(container_info.socket.url, container_info.socket.options);
					var res = "";
					
					var error_log = false;
					var bt_log = false;
					
					container_socket.on('cmd.stdout.' + container_info.token, function(stdout) {
						res += stdout;
					});

					container_socket.on('cmd.close.' + container_info.token, function() {
						if (!error_log) {
							error_log = true;
							
							if (res) {
								var lines = res.split('\n').filter(Boolean);

								for (var i = 0; i < lines.length; i++) {
									terminal.Terminal.writeln(lines[i]);
								}
							}
							
							res = "";
							
							container_socket.emit('cmd', {
								'token': container_info.token,
								'cmd': '/bin/cat /goorm/bt.log'
							});
						} else if (!bt_log) {
							bt_log = true;
							
							if (res) {
								var bt_lines = res.split('\n').filter(Boolean);

								for (var k = 0; k < bt_lines.length; k++) {
									if (bt_lines[k] && (bt_lines[k].indexOf('sig.c') > -1 || bt_lines[k].indexOf('??') > -1)) {
										continue;
									}
									
									terminal.Terminal.writeln(bt_lines[k]);
								}
							}
							
							res = "";
							
							container_socket.emit('cmd', {
								'token': container_info.token,
								'cmd': '/bin/cat /goorm/resource.info'
							});
						} else {
							if (res && self.show_run_res_usage) { // set table result
								var res_arr = res.split('\t');
								var res_info = {
									'kernel_mode_cpu_sec': res_arr[0],
									'user_mode_cpu_sec': res_arr[1],
									'max_mem_resident_kb': res_arr[2],
									'cpu_occupancy_ratio': res_arr[3],
									'real_elapsed_time_sec': res_arr[4]
								};

								var header = [main_localization.get_value('cpu_occupancy_ratio'), main_localization.get_value('kernel_mode_cpu_sec'), main_localization.get_value('user_mode_cpu_sec'), main_localization.get_value('max_mem_resident_kb'), main_localization.get_value('real_elapsed_time_sec')];
								var table_data = [[res_info.cpu_occupancy_ratio, res_info.kernel_mode_cpu_sec, res_info.user_mode_cpu_sec, res_info.max_mem_resident_kb, res_info.real_elapsed_time_sec]];
								self.print_terminal_table({
									'header': header,
									'data': table_data
								}, $('#run-result'));

							} else {
								//resource dump hide mode OR no resource data from server
							}
							// go stop process
							next();
						}
					});
					
					container_socket.emit('cmd', {
						'token': container_info.token,
						'cmd': '/bin/cat /goorm/error.log'
					});					
					
					$.post('/run_quiz/save', {
						'lesson_index': self.lesson_index || self.exam_index,
						'quiz_index': quiz.attr('exam').split('/')[1]
					}, function(data) {
						if (self.lesson_index) {
							menu.init_student_curriculum();
						}
					});
				},
				error: function(data) {
					self.run_programming_stop_handler({
						clearTimeout: true,
						skip_badge_check: true
					});
				
					switch (data.err_type) {
						case 'compile_err':
							toast.show(main_localization.get_value("toast_compile_fail"), {
								'method': 'error'
							});

							var error_message = data.err_msg.split("\n").join('<br>');

							stdout_container.html('<pre>' + main_localization.get_value("toast_compile_fail") + '<br>' + error_message + '</pre>');
							arrow.show();
							break;
						case 'run_error':
							toast.show(main_localization.get_value("toast_run_fail"), {
								'method': 'error'
							});
							break;
						case 'mark_err':
							toast.show(main_localization.get_value("toast_mark_fail"), {
								'method': 'error'
							});
							break;
						case 'infinity_loop':
							toast.show(main_localization.get_value("toast_infinity_loop"), {
								'method': 'error'
							});
							break;
						default:
							toast.show(main_localization.get_value("toast_mark_fail"), {
								'method': 'error'
							});
							break;
					}
				}
			});
		}
	},
	
	run_programming_stop_handler: function(options) {
		var self = this;
		var clear_timeout = options && options.clearTimeout;
		var set_terminal_stop = options && options.set_terminal_stop;
		var skip_badge_check = options && !options.skip_badge_check;
		
		if (clear_timeout) {
			clearTimeout(self.process_killer_timeout);
		}
		
		if (set_terminal_stop) {
			self.run_terminal.set_stop();
		}
		
		$('.btn_stop').removeClass('active');
		
		$('.quiz_term_run').removeAttr('disabled').removeClass('disabled_btn');
		$('.run_test_case').removeAttr('disabled').removeClass('disabled_btn');
		$('#quiz_term_run_loading').hide();
		$('#quiz_term_run_loading_preparing').hide();
		$('#quiz_term_run_loading_running').hide();
		$('.quiz_term_run').children('.btn_label').show();
		
		self.programming_process_running = false;
		
		if (self.quiz_data.setting == 'run_mode' && skip_badge_check) {
			self.check_badge();
		}
		
		this.run_time_limit_counter_stop(options.set_timer_full);
	},
	
	run_programming_insert_testcase: function(e, inputset) {
		var self = this;

		var quiz = $(e);
		var goorm_tabs = quiz.parents('goorm-tabs');
		var stdout_container = $('.goorm-stdout-container');

		var editor_id = this.get_editor_id(quiz);

		var tab = $('a[href="#' + editor_id + '"]');
		var editor = this.editors[editor_id];
		
		$('.quiz_term_run').prop('disabled',true)
						 .addClass('disabled_btn');
		
		$('#quiz_term_run_loading').css('width', $('.quiz_term_run')[0].getBoundingClientRect().width - parseFloat($('.quiz_term_run').css('padding-left').replace('px','')) - parseFloat($('.quiz_term_run').css('padding-right').replace('px','')));
		$('.quiz_term_run').children().hide();
		$('#quiz_term_run_loading').show();
		
		$('#run_programming_quiz_testcase').prop('disabled',true)
						 .addClass('disabled_btn');
		
		$('#quiz_testcase_run_loading').css('width', $('#run_programming_quiz_testcase')[0].getBoundingClientRect().width - parseFloat($('#run_programming_quiz_testcase').css('padding-left').replace('px','')) - parseFloat($('#run_programming_quiz_testcase').css('padding-right').replace('px','')));
		$('#run_programming_quiz_testcase').children().hide();
		$('#quiz_testcase_run_loading').show();
		$('.run_time_info').hide();
		
		if (editor) {
			$.post('/quiz/run', {
				'id': self.session.id,
				'quiz_index': quiz.attr('exam').split('/')[1],
				'source': editor.getValue(),
				'filetype': quiz.attr('filetype'),
				'inputset': JSON.stringify(inputset),
				'stringify': true,
				'image_name': self.get_language(quiz.attr('filetype'))
			}).done(function(data) {
				$('.quiz_term_run').prop('disabled', false).removeClass('disabled_btn');
				$('#quiz_term_run_loading').hide();
				$('.quiz_term_run').children('.btn_label').show();
				
				$('#run_programming_quiz_testcase').prop('disabled', false).removeClass('disabled_btn');
				$('#quiz_testcase_run_loading').hide();
				$('#run_programming_quiz_testcase').children().not('#quiz_testcase_run_loading').show();
				
				$('#dlg_testcase_setting').modal('hide');
				
				$('.goorm-stdout-container').empty();
				
				if (data.result) {
					var result = '<div class="terminal_custom">';
					for (var i = 0; i < inputset.length; i++) {
						result += '<div>' + main_localization.get_value('result') + ' ' + (i + 1) + ' (' + main_localization.get_value('run_time') + ': ' + (data.runtime[i] || 0) + main_localization.get_value('second') + ')</div>';
						if (data.server_err[i]) {
							result += '<div>' + (main_localization.get_value(data.server_err[i]) || data.server_err[i]) + '</div><br>';
						} else {
							result += '<div>' + inputset[i].replace(/ /g, '&nbsp;').replace(/\n/g, '</div><div>').replace(/\r/g, '</div><div>') + '</div><br>';
							result += '<div>' + (data.output[i] || '').replace(/ /g, '&nbsp;').replace(/\n/g, '</div><div>').replace(/\r/g, '</div><div>') + '</div><br>';
						}
					}
					result += '</div>';
					
					// result += '<div style="background-color: rgb(30, 30, 30); position: absolute; top: 0; right: 0; bottom: 0; width: 15px;"></div>';
					
					$('.goorm-stdout-container').append(result);
				} else {
					if (data.server_err) {
						$('.goorm-stdout-container').append(main_localization.get_value(data.server_err) || data.server_err);
					} else {
						$('.goorm-stdout-container').append(main_localization.get_value('toast_run_fail'));
					}
				}
				self.terminal_tab_flicker();
			}).fail(function(xhr, textStatus, errorThrown) {
				$('.quiz_term_run').prop('disabled', false).removeClass('disabled_btn');
				$('#quiz_term_run_loading').hide();
				$('.quiz_term_run').children('.btn_label').show();
				
				$('#run_programming_quiz_testcase').prop('disabled', false).removeClass('disabled_btn');
				$('#quiz_testcase_run_loading').hide();
				$('#run_programming_quiz_testcase').children().not('#quiz_testcase_run_loading').show();
				
				$('#dlg_testcase_setting').modal('hide');

				toast.show('요청이 많아 처리가 지연되고 있습니다.<br>코드를 저장하고 잠시 후 다시 시도해주세요.', {
					'method': 'warning'
				});
			});
		}
	},
	
	submit_programming: function(e, only_execute) {
		var self = this;

		var quiz = $(e);
		var goorm_tabs = quiz.parents('goorm-tabs');
		var stdout_container = $('.goorm-stdout-container');

		var editor_id = this.get_editor_id(quiz);

		var tab = $('a[href="#' + editor_id + '"]');
		var editor = this.editors[editor_id];
		
		$('.quiz_submit').attr('disabled','disabled')
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();

		if (editor) {
			if (self.backup.email || self.backup.object_storage) {
				var quiz_index = quiz.attr('quiz_index');
                var exam_index = this.exam_index;
				
				var formdata = new FormData();
				formdata.append('email', self.session.email);
				formdata.append('id', self.session.user_id);
				formdata.append('source', editor.getValue());
				formdata.append('quiz_index', quiz_index);
				formdata.append('exam_index', exam_index);				
				formdata.append('filetype', quiz.attr('filetype'));
				
				if (self.backup.email) {
					formdata.append('backup_email', true);
				}

				if (self.backup.object_storage) {
					formdata.append('backup_object_storage', true);
				}
				$.ajax({
					url: '//' + self.backup_server_url + '/backup',
					type: 'POST',
					dataType: 'json',
					data: formdata,
					cache: false,
					contentType: false,
					processData: false,
				}).done(function(data) {
					if (data) {
						console.log('backup complete');
					} else {
						console.log('backup failed');
					}
				});
			}
			
			$.post('/submit_quiz/programming', {
				'id': self.session.id,
				'lecture_index': self.lecture_index,
				'lesson_index': self.lesson_index || self.exam_index,
				'quiz_index': quiz.attr('exam').split('/')[1],
				'source': editor.getValue(),
				'filetype': quiz.attr('filetype'),
				'removed_bookmarks': self.removed_bookmarks,
				'image_name': self.get_language(quiz.attr('filetype'))
			}).done(function(data) {
				menu.exam_common.sync_time();
				if (data.saved === true) {
 					toast.show(main_localization.get_value("toast_save_success"), {
 						'method': 'info'
 					});
					if (is_student && is_collaboration) {
						if (self.ot_socket) {
							self.ot_socket.emit('edu_save', {
								user_id: user_id,
								user_name: user_name,
								language: quiz.attr('filetype'),
								filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
							});
						}
					}
 				} else if (data.saved == 'not_student') {
 					toast.show(main_localization.get_value("toast_save_fail_not_student"), {
 						'method': 'info'
 					});
 				} else {
 					toast.show(main_localization.get_value("toast_save_fail"), {
 						'method': 'error'
 					});
 				}
				
				$('.quiz_submit').removeAttr('disabled')
								 .removeClass('disabled_btn');
				$('#quiz_submit_loading').hide();
				$('.quiz_submit').children().not('#quiz_submit_loading').show();
				
				if (data.result) {
					self.quiz_submitted = true;
					if ($('.quiz_submit .btn_label').text() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
 						$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
 						if ($('.q_submit_count').text() == $('.q_total_count').text()) {
 							$('.header_stat').addClass('all_submitted');
 							$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
 						}
 					}
					$('.quiz_submit .btn_label').text(main_localization.get_value('re_submit'));
					$('#label_submitted').css('display','inline');
					if (self.lesson_index) {
						// goorm_menu.refresh_status(self.lesson_index, data.solved);
						menu.init_student_curriculum();
					}
					if (self.exam_index) {
						window.menu.init_tree();
					}
					
					var header = [main_localization.get_value("testcase_number")];
					var table_data = [];
					var is_tc_dump = data.mark_data && data.mark_data.correct_arr && data.mark_data.correct_arr.length > 0;
					var is_resource_dump = data.resource_data_list && data.resource_data_list.length > 0;
					var is_dump_score = data.scoreset && data.scoreset.length ? true : false;
					
					if (is_tc_dump) {
						header.push(main_localization.get_value("marking_result"));
					}
					
					if (is_resource_dump) {
						header.push(main_localization.get_value('cpu_occupancy_ratio'), main_localization.get_value('kernel_mode_cpu_sec'), main_localization.get_value('user_mode_cpu_sec'), main_localization.get_value('max_mem_resident_kb'), main_localization.get_value('real_elapsed_time_sec'));
					}

					if (data.hide_marking_result) {
						is_dump_score = false;
					}
					
					if (is_dump_score) {
						header.push(main_localization.get_value('quiz_score'));
					}

					var len = is_resource_dump ? data.resource_data_list.length : (is_tc_dump ? data.mark_data.correct_arr.length : (data.scoreset ? data.scoreset.length : 0));
					if ((is_tc_dump || is_resource_dump || is_dump_score) && len) {
						var corr_arr = is_tc_dump ? data.mark_data.correct_arr : null;
						for (var i = 0 ; i < len ; i++) {
							var row = [];
							var res = is_resource_dump && data.resource_data_list[i];
							row.push(i+1);
							
							if (is_tc_dump) {
								var tc_result = '';
								if (corr_arr[i]) {
									tc_result = '<span class="pass">' + "PASS" + '</span>';
								} else if (data.stdout[i] == 'WRONG') {
									tc_result = '<span class="fail">' + 'FAIL' + '</span>';
								} else if (data.stdout[i] == 'RUNTIME ERROR') {
									tc_result = '<span class="fail">' + 'FAIL' + ' (Runtime Error)</span>';
								} else if (data.stdout[i] == 'TIMEOUT') {
									tc_result = '<span class="fail">' + 'FAIL' + ' (Timeout)</span>';
								} else {
									tc_result = '<span class="error">' + main_localization.get_value("error") + '</span>';
								}
								
								row.push(tc_result);
							}
							
							if (is_resource_dump) {
								row.push(res.cpu_occupancy_ratio || '', res.kernel_mode_cpu_sec || '', res.user_mode_cpu_sec || '', res.max_mem_resident_kb || '', res.real_elapsed_time_sec || '');
							}
							
							if (is_dump_score) {
								row.push(data.scoreset[i]);
							}
							
							table_data.push(row);
						}
						self.print_terminal_table({
							'header': header,
							'data': table_data,
							'click_tab': $('#marking-result-tab')
						}, $('#marking-result'));
						arrow.show();
					} else {
						var table_msg = '';
						if (data.solved === undefined) {
							table_msg = '<span class="pass">' + main_localization.get_value('toast_submit_success') + '</span>';
						} else {
							if (data.solved === true || data.solved === 'true') {
								if(data.all_pass) {
									table_msg = '<span class="pass">' + main_localization.get_value('toast_pass_all_tc') + '</span>';
								} else {
									table_msg = '<span style="color:#f9c733;">' + main_localization.get_value('toast_mark_incorrect_answer') + '</span>';
								}
							} else {
								table_msg = '<span class="fail">' + main_localization.get_value('toast_mark_correct_fail') + '</span>';
							}
						}

						self.print_terminal_table({
							'header': [main_localization.get_value("marking_result")],
							'data': [[table_msg]],
							'click_tab': $('#marking-result-tab')
						}, $('#marking-result'));
						arrow.show();
					}

					if (data.output_file_content) {
						self.build_blob_output_file(data.output_file_content);
					} else {
						self.remove_blob_output_file();
					}

					if (!only_execute) {
						tab.find('span').remove();
						goorm_tabs.find('div.message').remove();

						if (data.submit_mode) {
							// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
							toast.show(main_localization.get_value("toast_submit_success"));
							self.check_badge();
						} else if (data.hide_marking_result) {
							toast.show(main_localization.get_value("msg_marking_success_hide_result"));
						} else if (data.solved) {
							if (data.all_pass) {
								// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
								toast.show(main_localization.get_value("toast_pass_all_tc"));
								self.check_badge();
							} else {
								// tab.prepend('<span class="glyphicon glyphicon-alert" style="margin-right: 5px; color: #f0ad4e"></span>');
								toast.show(main_localization.get_value("toast_mark_incorrect_answer"), {
									'method': 'warning'
								});
							}
						} else {
							// tab.prepend('<span class="glyphicon glyphicon-remove" style="margin-right: 5px; color: red"></span>');
							toast.show(main_localization.get_value("toast_mark_correct_fail"), {
								'method': 'error'
							});
						}
					} else {
						if (!data.stdout.length || (data.stdout.length === 1 && data.stdout[0] === "")) {
							data.stdout = [main_localization.get_value("no_output")];
						}
						
						self.terminal_tab_flicker();
						stdout_container.html(data.stdout.join('\n').replace(/ /g, ' ').replace(/\r\n/g, '<br/>').replace(/\r/g, '<br />').replace(/\n/g, '<br />'));
						arrow.show();
					}
				} else {
					var toast_err_msg = '';
					var error_message = '';
					var table_data = {};

					switch (data.err_type) {
						case 'compile_err':	
							toast_err_msg = main_localization.get_value("toast_compile_fail");

							if (data.err_msg) {
								error_message = data.err_msg.split("\n").join('<br>');
							}
							break;
						case 'run_err':
							if (data.err_msg) {
								error_message = data.err_msg.split("\n").join('<br>');
							}
							
							toast_err_msg = main_localization.get_value("toast_run_fail") + error_message;
							break;
						case 'mark_err':
							toast_err_msg = main_localization.get_value("toast_mark_fail");
							break;
						case 'submit_err':
							toast_err_msg = main_localization.get_value("toast_submit_fail");
							break;
						case 'date_err':
							toast_err_msg = main_localization.get_value("not_exam_term");
							break;
						case 'timeout_err':
							toast_err_msg = main_localization.get_value("toast_mark_timeout");
							break;
						default:
							toast_err_msg = main_localization.get_value("toast_mark_fail");
							break;
					}

					table_data.header = [main_localization.get_value("marking_result"), main_localization.get_value("contents")];
					table_data.data = [['<span class="fail">' + main_localization.get_value("fail") + '</span>', toast_err_msg]];

					toast.show(toast_err_msg, {
						'method': 'error'
					});

					if (error_message) {
						self.terminal_tab_flicker();
						stdout_container.html('<pre>' + main_localization.get_value("toast_compile_fail") + '<br>' + error_message + '</pre>');
						table_data.click_tab = null;
					} else {
						table_data.click_tab = $('#marking-result-tab');
					}

					self.print_terminal_table(table_data, $('#marking-result'));
					arrow.show();
				}
			}).fail(function(xhr, textStatus, errorThrown) {
				menu.exam_common.sync_time();
				$('.quiz_submit').removeAttr('disabled')
								 .removeClass('disabled_btn');
				$('#quiz_submit_loading').hide();
				$('.quiz_submit').children().not('#quiz_submit_loading').show();
				toast.show('제출 요청이 많아 처리가 지연되고 있습니다.<br>코드를 저장하고 잠시 후 다시 시도해주세요.', {
					'method': 'warning'
				});
			});
		}
	},

	set_programming_data: function(e, answer) {
		if (this.editors[this.get_editor_id($(e))]) {
			this.editors[this.get_editor_id($(e))].setValue(answer.replace(/<br\/>/g, '\n').replace(/&nbsp;&nbsp;&nbsp;&nbsp;/g, '\t').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));	
		}
	},
	
	// run_python_turtle: function(cm) {
	// 	var code = cm.getValue().replace(/onkeypress/g, "onkey");
	// 	var outf = function(str) {
	// 		$('#turtle_output').text($('#turtle_output').text() + str);
	// 	};
	// 	var builtinRead = function(x) {
	// 		if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined)
	// 			throw "File not found: '" + x + "'";
	// 		return Sk.builtinFiles.files[x];
	// 	};
		
	// 	$('.goorm-stdout-container').hide();
	// 	$('.goorm-turtle-container').show();

	// 	Sk.canvas = 'turtle_canvas';
	// 	Sk.pre = 'turtle_output';
	// 	Sk.configure({output:outf, read:builtinRead});

	// 	(Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'turtle_canvas';

	// 	var myPromise = Sk.misceval.asyncToPromise(function() {
	// 		return Sk.importMainWithBody("<stdin>", false, code, true);
	// 	});
	// 	myPromise.then(function(mod) {
	// 		$('.goorm-turtle-container').scrollTop(100);
	// 	}, function(err) {
	// 		toast.show(err.toString(), {
	// 			'method': 'error'
	// 		});
	// 	});
	// },

	run_python_turtle_modal: function(cm) {
		var $dlg = $('#dlg_run_turtle');
		var $canvas_container = $('#turtle_modal');
		var $output = $('#turtle_modal_output');

		var code = cm.getValue().replace(/onkeypress/g, "onkey");
		var outf = function(str) {
			if (str) {
				$output.text($output.text() + str).show();
			}
		};
		var builtinRead = function(x) {
			if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined)
				throw "File not found: '" + x + "'";
			return Sk.builtinFiles.files[x];
		};

		if (code.indexOf('setup') < 0) {
			code = code.replace('import turtle','import turtle\nturtle.Screen().setup(700,500)');
		}

		$output.text('>> ').hide(); // init

		$dlg.one('shown.bs.modal', function() {
			var min_width = $canvas_container.find('canvas').eq(0).width() + 30;
			var min_height = $canvas_container.find('canvas').eq(0).height() + 100;
			$dlg.find('.modal-dialog').css('width', min_width + 'px').css('height', min_height + 'px');

			$canvas_container.focus();
		});
		
		$dlg.modal('show');

		Sk.canvas = 'turtle_modal';
		Sk.pre = 'turtle_modal_output';
		Sk.configure({output:outf, read:builtinRead});

		(Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'turtle_modal';

		var myPromise = Sk.misceval.asyncToPromise(function() {
			return Sk.importMainWithBody("<stdin>", false, code, true);
		});
		myPromise.then(function(mod) {
			$canvas_container.focus();
		}, function(err) {
			$dlg.modal('hide');
			
			toast.show(err.toString(), {
				'method': 'error'
			});
		});
	},
	
	submit_scratch_quiz: function(e) {
		//disable submit button
		$('.quiz_submit').prop('disabled',true)
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();
		
		var self = this;
		
		var quiz = $(e);
		
		$.post('/submit_quiz/programming', {
			'id': self.session.id,
			'lecture_index': self.lecture_index,
			'lesson_index': self.lesson_index || self.exam_index,
			'quiz_index': quiz.attr('exam').split('/')[1],
			'source': this.scratch.ASexportProjectToBase64(),
			'filetype': quiz.attr('filetype')
		}, function(data) {
			menu.exam_common.sync_time();
			var message = '';
			var method = '';
			
			if (data) {
				if (data.saved === true) {
 					toast.show(main_localization.get_value("toast_save_success"), {
 						'method': 'info'
 					});
 				} else if (data.saved == 'not_student') {
 					toast.show(main_localization.get_value("toast_save_fail_not_student"), {
 						'method': 'error'
 					});
 				} else {
 					toast.show(main_localization.get_value("toast_save_fail"), {
 						'method': 'error'
 					});
 				}
				message = main_localization.get_value('msg_scratch_submit_success');
				method = 'success';
				self.quiz_submitted = true;
				if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
					$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
					if ($('.q_submit_count').text() == $('.q_total_count').text()) {
						$('.header_stat').addClass('all_submitted');
						$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
					}
				}
				$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
				$('#label_submitted').css('display','inline');
			} else {
				toast.show(main_localization.get_value("toast_save_fail"), {
					'method': 'error'
				});
				message = main_localization.get_value('msg_scratch_submit_fail');
				method = 'error';
			}
			
			$('.quiz_submit').prop('disabled', false)
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			$('.quiz_submit').children().not('#quiz_submit_loading').show();
			
			toast.show(message, {
				'method': method
			});
			
			self.check_badge();
		});
	},
	
	submit_entry_quiz: function(e) {
		//disable submit button
		$('.quiz_submit').prop('disabled',true)
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();
		
		var self = this;
		
		var quiz = $(e);
		
		$.post('/submit_quiz/programming', {
			'id': self.session.id,
			'lecture_index': self.lecture_index,
			'lesson_index': self.lesson_index || self.exam_index,
			'quiz_index': quiz.attr('exam').split('/')[1],
			'source': JSON.stringify($('#entry_iframe').get(0).contentWindow.Entry.exportProject()),
			'filetype': quiz.attr('filetype')
		}, function(data) {
			menu.exam_common.sync_time();
			var message = '';
			var method = '';
			
			if (data) {
				if (data.saved === true) {
 					toast.show(main_localization.get_value("toast_save_success"), {
 						'method': 'info'
 					});
 				} else if (data.saved == 'not_student') {
 					toast.show(main_localization.get_value("toast_save_fail_not_student"), {
 						'method': 'error'
 					});
 				} else {
 					toast.show(main_localization.get_value("toast_save_fail"), {
 						'method': 'error'
 					});
 				}
				
				message = main_localization.get_value('msg_entry_submit_success');
				method = 'success';
				self.quiz_submitted = true;
				if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
					$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
					if ($('.q_submit_count').text() == $('.q_total_count').text()) {
						$('.header_stat').addClass('all_submitted');
						$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
					}
				}
				$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
				$('#label_submitted').css('display','inline');
			} else {
				toast.show(main_localization.get_value("toast_save_fail"), {
					'method': 'error'
				});
				message = main_localization.get_value('msg_entry_submit_fail');
				method = 'error';
			}
			
			$('.quiz_submit').prop('disabled', false)
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			$('.quiz_submit').children().not('#quiz_submit_loading').show();
			
			toast.show(message, {
				'method': method
			});
			
			self.check_badge();
		});
	},
	
	submit_unittest_quiz: function() {
		//disable submit button
		$('.quiz_submit').prop('disabled',true)
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();
		
		var self = this;
		
		var editor = $('goorm-editor[form="unittest"]').map(function(i, e) {
			if ($(e).parent().hasClass('active')) {
				return e;
			}
		});
		// var testeditor = $('goorm-editor[data-testcode="true"]');
		
		var quiz_index = editor.eq(0).attr('quiz_index');
		var filetype = editor.eq(0).attr('filetype');
		
		var editor_id = self.get_editor_id(editor);
		// var testeditor_id = self.get_editor_id(testeditor);
		
		$.post('/submit_quiz/unittest', {
			'quiz_index': quiz_index,
			'id': self.session.id,
			'lecture_index': self.lecture_index,
			'lesson_index': self.lesson_index || self.exam_index,
			'source': self.editors[editor_id].getValue(),
			'filetype': filetype,
			'removed_bookmarks': self.removed_bookmarks
			// 'testcode': self.editors[testeditor_id].getValue(),
		}).done(function(data) {
			menu.exam_common.sync_time();
			var stdout_container = $('.goorm-stdout-container');
			var set_message = function(msg) {
				self.terminal_tab_flicker();

				stdout_container.html('<div class="terminal_line">' + msg + '<div>');//.scrollTop(stdout_container.get(0).scrollHeight);
			};
			
			var fin = function(noarrow) { //make button clickable
				$('.quiz_submit').prop('disabled', false)
								 .removeClass('disabled_btn');
				$('#quiz_submit_loading').hide();
				$('.quiz_submit').children().not('#quiz_submit_loading').show();
				
				if (!noarrow) {
					arrow.show();
				}
			};

			if (self.exam_index) {
				window.menu.init_tree();
			}

			if (data) {
				if (data.saved === true) {
					toast.show(main_localization.get_value("toast_save_success"), {
						'method': 'info'
					});
					if (is_student && is_collaboration) {
						if (self.ot_socket) {
							self.ot_socket.emit('edu_save', {
								user_id: user_id,
								user_name: user_name,
								language: filetype,
								filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
							});
						}
					}
	 			} else if (data.saved == 'not_student') {
	 				toast.show(main_localization.get_value("toast_save_fail_not_student"), {
	 					'method': 'error'
	 				});
	 			} else {
	 				toast.show(main_localization.get_value("toast_save_fail"), {
	 					'method': 'error'
	 				});
	 			}
				
				if (data.error_data) {
					fin();

					var toast_err_msg = '';
					var error_message = '';
					var table_data = {};

					switch (data.error_data.err_type) {
						case 'compile_err':	
							toast_err_msg = main_localization.get_value("toast_compile_fail");

							// var error_message = data.error_data.err_msg ? data.error_data.err_msg.split("\n").join('<br>') : '';
							if (data.error_data.err_msg) {
								error_message = data.error_data.err_msg.split("\n").join('<br>');
							}
							break;
						case 'mark_err':
							toast_err_msg = main_localization.get_value("toast_mark_fail");
							break;
						case 'runtime_err':
							toast_err_msg = '프로그램 실행에 실패했습니다. (Runtime Error)';
							break;
						case 'time_limit_err':
							toast_err_msg = main_localization.get_value("toast_mark_timeout");
							break;
						default:
							toast_err_msg = main_localization.get_value("toast_mark_fail");
							break;
					}

					table_data.header = [main_localization.get_value("marking_result"), main_localization.get_value("contents")];
					table_data.data = [['<span class="fail">' + main_localization.get_value("fail") + '</span>', toast_err_msg]];

					toast.show(toast_err_msg, {
						'method': 'error'
					});

					if (error_message) {
						self.terminal_tab_flicker();
						stdout_container.html('<pre>' + main_localization.get_value("toast_compile_fail") + '<br>' + error_message + '</pre>');
						table_data.click_tab = null;
					} else {
						table_data.click_tab = $('#marking-result-tab');
					}

					self.print_terminal_table(table_data, $('#marking-result'));
					arrow.show();
				} else if (data.submit_result) {
					//submit mode case
					if (data.submit_result === 'success' || data.submit_result === 'result_hidden') {
						var table_msg = '<span class="pass">' + main_localization.get_value('toast_submit_success') + '</span>';

						self.quiz_submitted = true;
						if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
							$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
							if ($('.q_submit_count').text() == $('.q_total_count').text()) {
								$('.header_stat').addClass('all_submitted');
								$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
							}
						}
						$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
						$('#label_submitted').css('display','inline');
						toast.show(main_localization.get_value("toast_submit_success"));
						
						self.check_badge();
						self.print_terminal_table({
							'header': [main_localization.get_value('marking_result')],
							'data': [[table_msg]],
							'click_tab': $('#marking-result-tab')
						}, $('#marking-result'));
						
						fin(true);
					} else {
						//failed
						toast.show(main_localization.get_value("toast_submit_fail"), {
							'method': 'error'
						});
						
						fin(true);
					}
				} else {
					//exam mode case - success
					self.quiz_submitted = true;
					if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
 						$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
 						if ($('.q_submit_count').text() == $('.q_total_count').text()) {
 							$('.header_stat').addClass('all_submitted');
 							$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
 						}
 					}
					$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
					$('#label_submitted').css('display','inline');
					
					toast.show(main_localization.get_value("toast_submit_success"));
					
					self.check_badge();
					
					var mark = data.mark;
			
					var total_score = 0;
					
					var table_header = [{
						'name': main_localization.get_value('test_method_name'),
						'width': '40%'
					}, main_localization.get_value("marking_result")];
					var table_data = [];
					
					for(var i=0; i<mark.length; i++) {
						var data = [];

						// set score
						if (mark[i].success) {
							data.push(mark[i].score);

							total_score += parseInt(mark[i].score, 10);
						} else {
							data.push(0);
						}

						var desc = (mark[i].desc) ? " (" + mark[i].desc + ")" : "";
						
						data.push(mark[i].name + desc);
						data.push((mark[i].success) ? '<span class="pass">' + main_localization.get_value("exact_answer") + '</span>' : '<span class="fail">' + main_localization.get_value("wrong_answer") + '</span>');
						
						table_data.push(data);
					}
					
					table_header.unshift({
						'name': main_localization.get_value('total_score') + ': ' + total_score,
						'width': '30%'
					});
					
					self.print_terminal_table({
						'header': table_header,
						'data': table_data,
						'click_tab': $('#marking-result-tab')
					}, $('#marking-result'));

					fin();
				}
			} else {
				//no response error
				set_message(main_localization.get_value("no_response_from_server"));
				fin();
			}
		}).fail(function(xhr, textStatus, errorThrown) {
			menu.exam_common.sync_time();
			$('.quiz_submit').prop('disabled', false)
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			$('.quiz_submit').children().not('#quiz_submit_loading').show();

			toast.show('제출 요청이 많아 처리가 지연되고 있습니다.<br>코드를 저장하고 잠시 후 다시 시도해주세요.', {
				'method': 'warning'
			});
		});
	},
	
	submit_web_quiz: function() {
		//disable submit button
		$('.quiz_submit').prop('disabled',true)
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();
		
		var self = this;
		var editor = $('goorm-editor');
		var quiz_index = editor.eq(0).attr('quiz_index');
		//var language = editor.eq(0).attr('filetype');
		
		var sources = this.get_editor_contents_list();
		
		var stdout_container = $('.goorm-stdout-container');
		var set_message = function(msg) {
			self.terminal_tab_flicker();
			self.run_terminal.Terminal.write(msg + '\n\r');
		};
				
		var fin = function() { //make button clickable
			$('.quiz_submit').prop('disabled', false)
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			$('.quiz_submit').children().not('#quiz_submit_loading').show();
			arrow.show();
		};
		if(self.quiz_data.setting === 'exam_mode') {
			set_message(main_localization.get_value("web_quiz_submission_msg"));		
		}
		$.post('/submit_quiz/web', {
			'quiz_index': quiz_index,
			'id': self.session.id,
			'lecture_index': self.lecture_index,
			'lesson_index': self.lesson_index || self.exam_index,
			'sources': JSON.stringify(sources)
		}, function(data) {
			menu.exam_common.sync_time();
			if (data) {
				if (data.saved === true) {
					var tab = $('.goorm-quiz-tab');
					var editor_id = tab.find('goorm-editor[form="web"]').parent().attr('id');
					var editor = self.editors[editor_id];
					if (editor) {
						editor.markClean();
					}
					toast.show(main_localization.get_value("toast_save_success"), {
						'method': 'info'
					});
					if (is_student && is_collaboration) {
						if (self.ot_socket) {
							self.ot_socket.emit('edu_save', {
								user_id: user_id,
								user_name: user_name,
								filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
							});
						}
					}
				} else if (data.saved == 'not_student') {
					toast.show(main_localization.get_value("toast_save_fail_not_student"), {
						'method': 'error'
					});
				} else {
					toast.show(main_localization.get_value("toast_save_fail"), {
						'method': 'error'
					});
				}

				if (data.terminal_error) {
					//terminal error occured
					if (main_localization.get_value(data.terminal_error)) {
						toast.show(main_localization.get_value(data.terminal_error), {
							'method': 'error'
						});
						set_message(main_localization.get_value(data.terminal_error));
					} else {
						set_message(main_localization.get_value("error_while_grading_web_quiz_marking"));
						set_message(data.terminal_error);
					}
					fin();
				} else if(data.submit_result) {
					//submit mode case
					if (data.submit_result === 'success' || data.submit_result === 'result_hidden') {
						var table_msg = '<span class="pass">' + main_localization.get_value('toast_submit_success') + '</span>';

						self.quiz_submitted = true;
						if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
							$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
							if ($('.q_submit_count').text() == $('.q_total_count').text()) {
								$('.header_stat').addClass('all_submitted');
								$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
							}
						}
						$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
						$('#label_submitted').css('display','inline');
						toast.show(main_localization.get_value("toast_submit_success"));
						// set_message(main_localization.get_value("toast_submit_success"));
						
						self.check_badge();
						self.print_terminal_table({
							'header': [main_localization.get_value('marking_result')],
							'data': [[table_msg]],
							'click_tab': $('#marking-result-tab')
						}, $('#marking-result'));
						fin(true);
					} else {
						//failed
						toast.show(main_localization.get_value("toast_submit_fail"), {
							'method': 'error'
						});
						set_message(main_localization.get_value("toast_submit_fail"));
						fin();
					}
				} else {
					//exam mode case - success
					
					var table_data = [];
					var mark_data = data.mark;
					var correct_arr = [];
					var url = 'http://' + data.web;
					var test_case_num = 0;
					var correct_case_num = 0;
					
					self.quiz_submitted = true;
					if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
 						$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
 						if ($('.q_submit_count').text() == $('.q_total_count').text()) {
 							$('.header_stat').addClass('all_submitted');
 							$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
 						}
 					}
					$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
					$('#label_submitted').css('display','inline');
					
					toast.show(main_localization.get_value("toast_submit_success"));
					set_message(main_localization.get_value("toast_submit_success"));
					
					self.check_badge();
			
					mark_data.map(function(item, index) {
						correct_arr.push(item.data.correct);
					});
					test_case_num = correct_arr.length;
					correct_case_num = correct_arr.filter(Boolean).length;
					
					mark_data.map(function(item, index) {
						table_data.push([(index + 1), (item.data.correct ? '<span class="pass">' + main_localization.get_value("exact_answer") + '</span>' : '<span class="fail">' + main_localization.get_value("wrong_answer") + '</span>'), (item.detail.trim() ? item.detail : 'No detail')]);
					});
					
					self.print_terminal_table({
						'header': [main_localization.get_value("testcase_number"), main_localization.get_value("marking_result"), main_localization.get_value("testcase_detail")],
						'data': table_data,
						'click_tab': $('#marking-result-tab')
					}, $('#marking-result'));
					arrow.show();

					fin();
				}
			} else {
				//no response error
				set_message(main_localization.get_value("no_response_from_server"));
				fin();
			}
		});
	},
	
	print_terminal_table: function(options, output) {
		var header = options.header;
		var header_length = header.length;
		
		var data = options.data;
		var click_tab = options.click_tab;
		var htmls = [];
		var date_string = main_localization.get_value("marking_complete_time") + ' ';
		
		var ZeroExt = function(n, digits) {
		  var zero = '';
		  n = n.toString();

		  if (n.length < digits) {
			for (i = 0; i < digits - n.length; i++)
			  zero += '0';
		  }
		  return zero + n;
		};
		
		var date = new Date();

		date_string += ZeroExt(date.getFullYear(), 4) + '-' + ZeroExt(date.getMonth() + 1, 2) + '-' + ZeroExt(date.getDate(), 2) + ' ' + ZeroExt(date.getHours(), 2) + ':' + ZeroExt(date.getMinutes(), 2) + ':' + ZeroExt(date.getSeconds(), 2);
		
		htmls.push('<div class="badge submit_time">'+ date_string + '</div>');
		htmls.push('<table class="table terminal_table">');
		htmls.push('<thead style="border-top: 1px solid #ccc;"><tr>');
		header.map(function (item, index) {
			if (typeof(item) === 'object') {
				htmls.push('<th style="width: ' + item.width + '">' + item.name + '</th>');
			} else { // string
				htmls.push('<th>' + item + '</th>');
			}
		});
		htmls.push('</tr></thead><tbody>');
		
		data.map(function (row, row_index) {
			var str = '<tr>';
			
			for (var i=0; i<header_length; i++) {
				str += '<td>' + row[i] + '</td>';
			}
			str += '</tr>';
			htmls.push(str);
		});

		htmls.push('</tbody></table><br /><br /><br />');
		if (click_tab && click_tab.click) {
			click_tab.click();
		}
		if (output) {
			output.prepend(htmls.join(''));
			//output.scrollTop(output.get(0).scrollHeight);
			output.scrollTop(0);
		}
		
		return htmls.join('');

	},
	
	submit_robocode_quiz: function(cm) {
		var self = this;
		var $dlg = $('#dlg_run_robocode');
		var code = cm.getValue();
		
		$('.terminal_running_time').html("0:00.00");
		$('.goorm-stdout-container').html("");
		
		$('.quiz_submit').attr('disabled','disabled')
						 .addClass('disabled_btn');

		$('#quiz_submit_loading').css('width', $('.quiz_submit')[0].getBoundingClientRect().width - parseFloat($('.quiz_submit').css('padding-left').replace('px','')) - parseFloat($('.quiz_submit').css('padding-right').replace('px','')));
		$('.quiz_submit').children().hide();
		$('#quiz_submit_loading').show();
		
		var make_blob = function(source) {
			window.URL = window.URL || window.webkitURL;

			var blob;
			try {
				blob = new Blob([source], {type: 'application/javascript'});
			} catch (e) {
				window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
				blob = new BlobBuilder();
				blob.append(source);
				blob = blob.getBlob();
			}

			return blob;
		};
		
		$dlg.one('shown.bs.modal', function() {
			self.get_robo_quiz(function() {
				self.battle = null;
				var error_checker = "var error = 0;\nthis.onerror = function(e) {\n\terror = e;\n\treturn true;\n}\n\nprototype.onIdle = function() {\n\tif (error !== 0) {\n\t\tthis.caughtError(error);\n\t\terror = 0;\n\t}\n";

				var student_robot = self.base_robot.replace(/\[ROBOT\]/, code.replace(/prototype.onIdle.+\n/, error_checker));
				var teacher_robot = self.base_robot.replace(/\[ROBOT\]/, self.robo_quiz.robo_correct_code.replace(/prototype.onIdle.+\n/, error_checker));

				self.student_blob = make_blob(student_robot);
				self.teacher_blob = make_blob(teacher_robot);
				self.student_blob_url = URL.createObjectURL(self.student_blob);
				self.teacher_blob_url = URL.createObjectURL(self.teacher_blob);

				$('#arena_container').children().remove();
				$('#arena_container').append('<canvas id="arena" width="700" height="600"></canvas><div id="debug" style="float: left; width: 200px; padding: 10px;"></div>');

				var canvas = $("#arena");

				self.battle = new Battle(
					canvas[0].getContext('2d'),
					canvas.attr('width'),
					canvas.attr("height"),
					[self.student_blob_url, self.teacher_blob_url],
					self.robo_settings.game_speed,
					self.robo_settings.hp,
					self.robo_settings.bullet_damage,
					'submit',
					self
				);

				self.battle.run();
			});
		});
		
		$dlg.one('hidden.bs.modal', function() {
			menu.exam_common.sync_time();
			$('.quiz_submit').removeAttr('disabled')
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			self.quiz_submitted = true;
			if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
				$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
				if ($('.q_submit_count').text() == $('.q_total_count').text()) {
					$('.header_stat').addClass('all_submitted');
					$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
				}
			}
			$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
			$('#label_submitted').css('display','inline');
			$('.quiz_submit').children().not('#quiz_submit_loading').show();
			self.battle.destroy();

			$('#arena_container').children().remove();
		});
		
		$dlg.modal('show');
	},
	
	submit_robocode_result: function(winner, game_time, callback) {
		var self = this;
		var quiz_index = $('goorm-editor').eq(0).attr('quiz_index');
		var editor_id = $('goorm-editor[form="robocode"]').parent().attr('id');
		var tab = $('a[href="#' + editor_id + '"]');
		
		$.post('/submit_quiz/robocode', {
			id: self.session.id,
			quiz_index: quiz_index,
			lecture_index: self.lecture_index,
			lesson_index: self.lesson_index || self.exam_index,
			answer_source_code: self.editors[editor_id].getValue(),
			winner: winner,
			game_time: game_time
		}, function(data) {
			menu.exam_common.sync_time();
			$('.quiz_submit').removeAttr('disabled')
							 .removeClass('disabled_btn');
			$('#quiz_submit_loading').hide();
			self.quiz_submitted = true;
			if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
				$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
				if ($('.q_submit_count').text() == $('.q_total_count').text()) {
					$('.header_stat').addClass('all_submitted');
					$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
				}
			}
			$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
			$('#label_submitted').css('display','inline');
			$('.quiz_submit').children().not('#quiz_submit_loading').show();

			if (data) {
				if (self.lesson_index) {
					// goorm_menu.refresh_status(self.lesson_index, data.result);
					menu.init_student_curriculum();
				}

				tab.find('span').remove();

				if (data.result) {
					// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
					toast.show(main_localization.get_value("toast_mark_correct_win"));
				} else {
					// tab.prepend('<span class="glyphicon glyphicon-remove" style="margin-right: 5px; color: red"></span>');
					toast.show(main_localization.get_value("toast_mark_correct_lose"), {
						'method': 'error'
					});
				}
			} else {
				toast.show(main_localization.get_value("toast_mark_fail"), {
					'method': 'error'
				});
			}
			callback();
		});
	},
	
	get_editor_contents_list: function() {
		var sources = [];
		var self = this;
		/* sources spec
		 * Array of Object
		 * Object: 
		 	{
				'filepath': filepath,
				'filetype': php,
				'source': sourcecode
		 	}
		 */
		$('goorm-editor').map(function(offset, item) {
			var filepath = $(item).attr('file_path') || "";
			var filetype = $(item).attr('filetype');
			
			var editor_id = self.get_editor_id($(item));
			var editor = self.editors[editor_id];
			var source = editor.getValue();
			
			sources.push({
				'filepath': filepath,
				'filetype': filetype,
				'source': source
			});
		});
		
		return sources;
	},
	
	run_web_quiz: function(options) {
		var self = this;
		var editor = $('goorm-editor:eq(0)');
		
		$('.quiz_term_run').prop('disabled', true)
						 .addClass('disabled_btn');
		
		$('#quiz_term_run_loading').css('width', $('.quiz_term_run')[0].getBoundingClientRect().width - parseFloat($('.quiz_term_run').css('padding-left').replace('px','')) - parseFloat($('.quiz_term_run').css('padding-right').replace('px','')));
		$('.quiz_term_run').children().hide();
		$('#quiz_term_run_loading').show();
		
		var fin = function() {
			$('.quiz_term_run').prop('disabled', false).removeClass('disabled_btn');
			$('#quiz_term_run_loading').hide();
			$('.quiz_term_run').children().not('#quiz_term_run_loading').show();
			arrow.show();
		};
		
		var stdout_container = $('.goorm-stdout-container');
		var set_message = function(msg) {
			//stdout_container.append('<div class="terminal_line">' + msg + '<div>').scrollTop(stdout_container.get(0).scrollHeight);
			self.terminal_tab_flicker();
			self.run_terminal.Terminal.write(msg + '\n\r');
		};
		
		set_message(main_localization.get_value("web_server_start_attempt"));
		
		this.socket.once('web_project_complete', function(data){
			if (data) {
				if (data.terminal_error || data.err) {
					var err_msg = data.terminal_error || data.err;
					toast.show(main_localization.get_value("error_occured_web_server_running"), {
						'method': 'error'
					});
					set_message(main_localization.get_value("error_occured_web_server_running"));
					set_message(err_msg);
					fin();
				} else {
					$.post('/run_quiz/save', {
						'lesson_index': self.lesson_index || self.exam_index,
						'quiz_index': options.quiz_index
					}, function(data) {
						if (self.lesson_index) {
							menu.init_student_curriculum();
						}
					});
					
					self.terminal_tab_flicker();
					var url = 'http://' + data.web;
					set_message(main_localization.get_value("web_server_launched"));
					
					if (/mobile/i.test(self.user_agent) || /android/i.test(self.user_agent)) {
						$('.web_container').html('<a href="' + url + '" class="web_url" target="_blank"><i class="fa fa-external-link" aria-hidden="true"></i></a>');
						set_message(main_localization.get_value("please_click_to_icon"));
					} else {
						$('.web_container').html('<a href="' + url + '" class="web_url" target="_blank">' + url + '</a>');
					}
					
					if(!self.container_socket[data.token]) {
						self.container_socket[data.token] = new io.connect(data.socket.url, data.socket.options);
						
						self.container_socket[data.token].emit('cmd', {
							'token': data.token,
							'cmd': '/usr/bin/pkill tail'
						});

						self.container_socket[data.token].on('cmd.stdout.' + data.token, function(data) {
							self.run_terminal.Terminal.write(data.replace(/\n/g, '\n\r'));
						});

						self.container_socket[data.token].on('cmd.stderr.' + data.token, function(data) {
							//suppression tail truncated error message. Need to refactoring this architecture which communicated directly between client side(front-end) and pty inside docker container in server side(Container Instance), because of security issue
							if (data.indexOf('/edufiles/server_log') === -1) {
								self.run_terminal.Terminal.write(data.replace(/\n/g, '\n\r'));
							}
						});

						self.container_socket[data.token].on('cmd.close.' + data.token, function(data) {
							console.log('close', data);
						});

						self.container_socket[data.token].emit('cmd', {
							'token': data.token,
							'cmd': '/usr/bin/tail -n20 -f ' + data.log_file_path
						});
						
					}
					

					if (self.quiz_data.setting == 'run_mode') {
						self.check_badge();
					}
					
					fin();
				}
			} else {
				set_message(main_localization.get_value("no_response_from_server"));
				fin();
			}
		});
		
		if (this.web_docker_available) {
			this.socket.emit('web_project_in_container', {
				'quiz_index': editor.attr('quiz_index'),
				'id': this.session.id,
				'sources': this.get_editor_contents_list()
			});
			
		} else {
			this.web_run_queue.push({
				'quiz_index': editor.attr('quiz_index'),
				'id': this.session.id,
				'sources': this.get_editor_contents_list()
			});
		}
	},
	
	run_robocode_quiz: function(cm) {
		$('.terminal_running_time').html("0:00.00");
		$('.goorm-stdout-container').html("");
		
		var self = this;
		var $dlg = $('#dlg_run_robocode');
		var code = cm.getValue();
		
		var make_blob = function(source) {
			window.URL = window.URL || window.webkitURL;

			var blob;
			try {
				blob = new Blob([source], {type: 'application/javascript'});
			} catch (e) {
				window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
				blob = new BlobBuilder();
				blob.append(source);
				blob = blob.getBlob();
			}

			return blob;
		};
		
		$dlg.one('shown.bs.modal', function() {
			self.get_robo_quiz(function() {
				self.battle = null;
				var error_checker = "var error = 0;\nthis.onerror = function(e) {\n\terror = e;\n\treturn true;\n}\n\nprototype.onIdle = function() {\n\tif (error !== 0) {\n\t\tthis.caughtError(error);\n\t\terror = 0;\n\t}\n";

				var student_robot = self.base_robot.replace(/\[ROBOT\]/, code.replace(/prototype.onIdle.+\n/, error_checker));
				var teacher_robot = self.base_robot.replace(/\[ROBOT\]/, self.robo_quiz.robo_correct_code.replace(/prototype.onIdle.+\n/, error_checker));

				self.student_blob = make_blob(student_robot);
				self.teacher_blob = make_blob(teacher_robot);
				self.student_blob_url = URL.createObjectURL(self.student_blob);
				self.teacher_blob_url = URL.createObjectURL(self.teacher_blob);

				$('#arena_container').children().remove();
				$('#arena_container').append('<canvas id="arena" width="700" height="600"></canvas><div id="debug" style="float: left; width: 200px; padding: 10px;"></div>');

				var canvas = $("#arena");

				self.battle = new Battle(
					canvas[0].getContext('2d'),
					canvas.attr('width'),
					canvas.attr("height"),
					[self.student_blob_url, self.teacher_blob_url],
					self.robo_settings.game_speed,
					self.robo_settings.hp,
					self.robo_settings.bullet_damage,
					'run',
					self
				);

				self.battle.run();
			});
		});
		
		$dlg.one('hidden.bs.modal', function() {
			URL.revokeObjectURL(self.student_blob_url);
			self.aa = null;
			self.a = undefined;
			URL.revokeObjectURL(self.teacher_blob_url);
			self.bb = null;
			self.b = undefined;

			self.battle.destroy();

			$('#arena_container').children().remove();
		});
		
		$dlg.modal('show');
	},

	run_arduino_quiz: function(cm) {
 		var self = this;
 		var code = typeof(cm) == 'string' ? cm : cm.getValue();
 		var stdout_container = $('.goorm-stdout-container');
		
		this.stop_container();
 
		$('.quiz_term_run').prop('disabled',true)
						 .addClass('disabled_btn');
		
		$('#quiz_term_run_loading').css('width', $('.quiz_term_run')[0].getBoundingClientRect().width - parseFloat($('.quiz_term_run').css('padding-left').replace('px','')) - parseFloat($('.quiz_term_run').css('padding-right').replace('px','')));
		$('.quiz_term_run').children().hide();
		$('#quiz_term_run_loading').show();
		
 		$('.terminal_running_time').html("0:00.00");
 		stdout_container.html("");
 
 		if (self.port) {
 			if (self.socket) {
				$.post('/run_quiz/save', {
					'lesson_index': self.lesson_index || self.exam_index,
					'quiz_index': cm.quiz_index
				}, function(data) {
					stdout_container.html("<pre>"+main_localization.get_value("start_compile")+"</pre>");
					self.socket.emit('arduino_in_container', {
						'id': "goorm_tutorial_editor",
						'source': code,
						'board': self.arduino_language
					});
					if (self.lesson_index) {
						menu.init_student_curriculum();
					}
				});
 			} else {
 				console.log("arduino upload err.. socket:", self.socket);
 			}
 		} else {
 			toast.show(main_localization.get_value("toast_connect_goormduino"), {
 				'method': 'error'
			});
 		}
 	},

	get_robo_quiz: function(callback) {
		var self = this;
		if (this.base_robot && this.robo_settings) {
			callback();
		} else {
			$.get('/quiz/get_robo', {
				quiz_index: $('goorm-editor').eq(0).attr('quiz_index')
			}, function(data) {
				self.robo_quiz = data.quiz;
				self.robo_settings = data.quiz.robo_settings;
				self.base_robot = data.base_robot;
				callback();
			});
		}
	},
	
	end_robocode: function(type, winner, game_time) {
		var self = this;
		var stdout_container = $('.goorm-stdout-container');
		
		var result_message = "";
		if (winner.id === 0) {
			result_message = ['<pre>',
							 	main_localization.get_value('toast_mark_correct_win'),
							  	'<br>',
							  '</pre>',
							  '<pre>',
							 	main_localization.get_value('my_robot_hp_remained') + ' : ' + winner.hp,
							  '</pre>'
							 ].join('');
		} else if (winner.id === 1) {
			result_message = ['<pre>',
							 	main_localization.get_value('toast_mark_correct_lose'),
							  	'<br>',
							  '</pre>',
							  '<pre>',
							 	main_localization.get_value('enemy_robot_hp_remained') + ' : ' + winner.hp,
							  '</pre>'
							 ].join('');
		}
		
		$('.terminal_running_time').html(game_time);
		stdout_container.html(result_message);
		
		if (type === 'run') {
			setTimeout(function() {
				$('#dlg_run_robocode').modal('hide');
			}, 500);
		} else if (type === 'submit') {
				setTimeout(function() {
					self.submit_robocode_result(winner, game_time, function() {
						$('#dlg_run_robocode').modal('hide');
					});
				}, 500);
		}
	},
	
	catch_error: function(e) {
		var stdout_container = $('.goorm-stdout-container');

		setTimeout(function() {
			var result_message = ['<pre>',
								  e,
								  '</pre>'
								 ].join('');

			stdout_container.html(result_message);
			arrow.show();
			$('#dlg_run_robocode').modal('hide');
		}, 500);
	},
	
	hide_loading: function() {
		$('#loading_background').delay(1000).fadeOut(1000);
		$('#loading_panel_container').delay(1500).fadeOut(1000);

		$('#loading_background').remove();
		$('#loading_panel_container').remove();
	},

	run_gui_quiz: function(options) {
		var self = this;
		
		var source = options.editor.getValue();
		var quiz_index = options.quiz_index;
		var filetype = options.filetype;
		var type = options.type; // java_swing, java_awt ...
		
		var screen_size = this.gui_screen_size;
		var $run_btn = $('.quiz_term_run');
		var $run_loading = $('#quiz_term_run_loading');
		var $stdout_container = $('.goorm-stdout-container');

		var $gui_modal = $('#dlg_run_gui');
		var $gui_modal_body = $('#gui_modal_body');

		this.stop_container();

		$stdout_container.empty();
		$stdout_container.append('<pre></pre>');

		$run_btn.addClass('disabled').addClass('disabled_btn');
		$run_loading.css('width', $run_btn[0].getBoundingClientRect().width - parseFloat($run_btn.css('padding-left').replace('px','')) - parseFloat($run_btn.css('padding-right').replace('px','')));
		$run_btn.children().hide();
		$run_loading.show();

		this.socket.once('container_result', function(msg) {
			$run_btn.removeClass('disabled').removeClass('disabled_btn');
			$run_loading.hide();
			$run_btn.children().not('#quiz_term_run_loading').show();

			if (msg.result) {
				if (self.quiz_data.setting == 'run_mode') {
					self.check_badge();
				}
				
				var secure = msg.secure ? 'https://' : 'http://';
				var width = parseInt(self.gui_screen_size.width, 10) + 5;
				var height = parseInt(self.gui_screen_size.height, 10) + 5;

				// pop up open
				var child_window = window.open(secure + msg.web, '_blank', 'width=' + width + ', height=' + height);
				var blocked = false;
				var check = setInterval(function() {
					if (!child_window) {
						clearInterval(check);
						toast.show(main_localization.get_value("warning_popup"), {
							'method': 'warning'
						});
						blocked = true;
					} else if (child_window.closed) {
						clearInterval(check);
						self.stop_container(msg.token);
					}
				}, 1000);

				// modal open
				// $gui_modal.find('.modal-dialog').css({
				// 	'width': width + 30 + 'px',
				// 	'height': height + 30 + 'px',
				// 	'top': '0px',
				// 	'left': '0px'
				// });
				// $('#gui_modal_refresh').remove();
				// $gui_modal.find('.modal-header').append('<i id="gui_modal_refresh" style="margin-left: 10px;margin-top: 4px;font-size: 16px;cursor: pointer;" class="fa fa-refresh"></i>');
				// $gui_modal_body.css('width', width + 'px').css('height', height + 'px');
				// $gui_modal_body.empty();
				// $gui_modal_body.append('<img src="/images/loader.gif" style="width: 150px;position: absolute;top: 50%;left: 50%;margin-top: -100px;margin-left: -75px;" />');
	
				// $('#gui_modal_refresh').click(function() {
				// 	$gui_modal.find('iframe').attr('src', secure + msg.web);
				// });

				// $gui_modal.one('hidden.bs.modal', function() {
				// 	$gui_modal.find('iframe').remove();
				// 	self.stop_container(msg.token);
				// });

				// $gui_modal.modal('show');

				// setTimeout(function() {
				// 	$gui_modal_body.find('img').hide();
				// 	$gui_modal_body.append('<iframe id="run_gui_iframe" src="' + secure + msg.web + '" style="width: ' + width + 'px; height: ' + height + 'px;"></iframe>');
				// }, 1500);

				self.container_socket[msg.token] = new io.connect(msg.socket.url, msg.socket.options);

				self.container_socket[msg.token].on('cmd.stdout.' + msg.token, function(stdout) {
					if ($stdout_container.prop('scrollHeight') - $stdout_container.height() === $stdout_container.scrollTop()) {
						$stdout_container.find('pre').append(stdout.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
						$stdout_container.scrollTop($stdout_container.prop('scrollHeight'));
					} else {
						$stdout_container.find('pre').append(stdout.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
					}
				});

				self.container_socket[msg.token].emit('cmd', {
					'token': msg.token,
					'cmd': '/usr/bin/tail -f /goorm/stdout.log'
				});
				
				if(!blocked) {
					$.post('/run_quiz/save', {
						'lesson_index': self.lesson_index || self.exam_index,
						'quiz_index': options.quiz_index
					}, function(data) {
						if (self.lesson_index) {
							menu.init_student_curriculum();
						}
					});
				}
			} else {
				switch (msg.err.err_type) {
					case 'compile_err':
						var error_message = msg.err.err_msg.split("\n").join('<br>');

						toast.show('<pre>' + main_localization.get_value("toast_compile_fail") + '<br>' + error_message + '</pre>', {
							'method': 'error'
						});
						break;
					case 'run_err':
						toast.show(main_localization.get_value("toast_run_fail"), {
							'method': 'error'
						});
						break;
					case 'mark_err':
						toast.show(main_localization.get_value("toast_mark_fail"), {
							'method': 'error'
						});
						break;
					default:
						toast.show(main_localization.get_value("toast_mark_fail"), {
							'method': 'error'
						});
						break;
				}
			}
		});
		
		this.socket.emit('vnc_in_container', {
			'id': this.session.id,
			'source': source,
			'quiz_index': quiz_index,
			'filetype': filetype,
			'type': type,
			'screen_size': screen_size
		});
	},

	stop_container: function(index) {
		var container_sockets = this.container_socket;

		if (index) {
			if (this.container_socket[index]) {
				this.socket.emit('container_stop', {
					'index': index
				});
				this.container_socket[index].disconnect();
				delete this.container_socket[index];
			}
		} else {
			for (var token in container_sockets) {
				var socket = container_sockets[token];

				if (socket) {
					this.socket.emit('container_stop', {
						'index': token
					});
					socket.disconnect();
					delete this.container_socket[token];
				}
			}
		}
	},

	submit_gui_quiz: function(cm) {
		var self = this;
		var code = cm.getValue();
		var quiz_index = $('goorm-editor').eq(0).attr('quiz_index');
		var editor_id = $('goorm-editor[form="gui"]').parent().attr('id');
		var tab = $('a[href="#' + editor_id + '"]');
		var $quiz_submit = $('.quiz_submit');
		var $quiz_submit_loading = $('#quiz_submit_loading');
		var filetype = $('goorm-editor').eq(0).attr('filetype');

		$('.goorm-stdout-container').empty();
		
		$quiz_submit.attr('disabled','disabled').addClass('disabled_btn');
		$quiz_submit_loading.css('width', $quiz_submit[0].getBoundingClientRect().width - parseFloat($quiz_submit.css('padding-left').replace('px','')) - parseFloat($quiz_submit.css('padding-right').replace('px','')));
		$quiz_submit.children().hide();
		$quiz_submit_loading.show();

		$.post('/submit_quiz/gui', {
			id: self.session.id,
			quiz_index: quiz_index,
			lecture_index: self.lecture_index,
			lesson_index: self.lesson_index || self.exam_index,
			answer_source_code: code,
			answer_language: filetype,
			removed_bookmarks: self.removed_bookmarks
		}, function(data) {
			menu.exam_common.sync_time();
			if (data.saved === true) {
				var editor = self.editors[editor_id];
				if (editor) {
					editor.markClean();
				}
				toast.show(main_localization.get_value("toast_save_success"), {
					'method': 'info'
				});
				if (is_student && is_collaboration) {
					if (self.ot_socket) {
						self.ot_socket.emit('edu_save', {
							user_id: user_id,
							user_name: user_name,
							language: filetype,
							filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
						});
					}
				}
			} else if (data.saved == 'not_student') {
				toast.show(main_localization.get_value("toast_save_fail_not_student"), {
					'method': 'error'
				});
			} else {
				toast.show(main_localization.get_value("toast_save_fail"), {
					'method': 'error'
				});
			}

			$quiz_submit.removeAttr('disabled').removeClass('disabled_btn');
			$quiz_submit_loading.hide();
			$quiz_submit.children().not('#quiz_submit_loading').show();
			
			if (data.result) {
				if (self.lesson_index) {
					// goorm_menu.refresh_status(self.lesson_index, data.result);
					menu.init_student_curriculum();
				}
				self.quiz_submitted = true;
				if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
					$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
					if ($('.q_submit_count').text() == $('.q_total_count').text()) {
						$('.header_stat').addClass('all_submitted');
						$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
					}
				}
				$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
				$('#label_submitted').css('display','inline');
				// tab.find('span').remove();

				// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
				toast.show(main_localization.get_value("toast_submit_success"));
				self.check_badge();
			} else {
				if (data.err) {
					toast.show(main_localization.get_value(data.err), {
						'method': 'error'
					});
				} else {
					toast.show(main_localization.get_value("toast_submit_fail"), {
						'method': 'error'
					});
				}
			}
		});
	},
	
	submit_skulpt_quiz: function(cm) {
		var self = this;
		var code = cm.getValue();
		var quiz_index = $('goorm-editor').eq(0).attr('quiz_index');
		var editor_id = $('goorm-editor[form="skulpt"]').parent().attr('id');
		var tab = $('a[href="#' + editor_id + '"]');
		var $quiz_submit = $('.quiz_submit');
		var $quiz_submit_loading = $('#quiz_submit_loading');
		var filetype = $('goorm-editor').eq(0).attr('filetype');

		$('.goorm-stdout-container').empty();
		
		$quiz_submit.attr('disabled','disabled').addClass('disabled_btn');
		$quiz_submit_loading.css('width', $quiz_submit[0].getBoundingClientRect().width - parseFloat($quiz_submit.css('padding-left').replace('px','')) - parseFloat($quiz_submit.css('padding-right').replace('px','')));
		$quiz_submit.children().hide();
		$quiz_submit_loading.show();

		$.post('/submit_quiz/skulpt', {
			id: self.session.id,
			quiz_index: quiz_index,
			lecture_index: self.lecture_index,
			lesson_index: self.lesson_index || self.exam_index,
			answer_source_code: code,
			answer_language: filetype,
			removed_bookmarks: self.removed_bookmarks
		}, function(data) {
			menu.exam_common.sync_time();
			$quiz_submit.removeAttr('disabled').removeClass('disabled_btn');
			$quiz_submit_loading.hide();
			$quiz_submit.children().not('#quiz_submit_loading').show();

			if (data) {
				if (data.saved === true) {
					var editor = self.editors[editor_id];
					if (editor) {
						editor.markClean();
					}
					toast.show(main_localization.get_value("toast_save_success"), {
						'method': 'info'
					});
					if (is_student && is_collaboration) {
						if (self.ot_socket) {
							self.ot_socket.emit('edu_save', {
								user_id: user_id,
								user_name: user_name,
								language: filetype,
								filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
							});
						}
					}
				} else if (data.saved == 'not_student') {
					toast.show(main_localization.get_value("toast_save_fail_not_student"), {
						'method': 'error'
					});
				} else {
					toast.show(main_localization.get_value("toast_save_fail"), {
						'method': 'error'
					});
				}

				if(data.result) {
					if (self.lesson_index) {
						// goorm_menu.refresh_status(self.lesson_index, data.result);
						menu.init_student_curriculum();
					}
					self.quiz_submitted = true;
					if ($('.quiz_submit .btn_label').html() !== main_localization.get_value('re_submit') && $('.q_submit_count')) {
 						$('.q_submit_count').text(Number($('.q_submit_count').text()) + 1);
 						if ($('.q_submit_count').text() == $('.q_total_count').text()) {
 							$('.header_stat').addClass('all_submitted');
 							$('.fa-minus-circle').removeClass('fa-minus-circle').addClass('fa-check-circle');
 						}
 					}
					$('.quiz_submit .btn_label').html(main_localization.get_value('re_submit'));
					$('#label_submitted').css('display','inline');
					// tab.find('span').remove();

					// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
					toast.show(main_localization.get_value("toast_submit_success"));
					self.check_badge();
				} else {
					toast.show(main_localization.get_value("toast_submit_fail"), {
						'method': 'error'
					});
				}
			} else {
				toast.show(main_localization.get_value("toast_submit_fail"), {
					'method': 'error'
				});
			}
		});
	},
	
	submit_scratchduino_quiz: function() {
		var self = this;
		var code = self.get_scratchduino_xml();
		var quiz_index = $('goorm-editor').eq(0).attr('quiz_index');
		var editor_id = $('goorm-editor[form="scratchduino"]').parent().attr('id');
		var tab = $('a[href="#' + editor_id + '"]');
		var $quiz_submit = $('.quiz_submit');
		var $quiz_submit_loading = $('#quiz_submit_loading');

		$quiz_submit.attr('disabled','disabled').addClass('disabled_btn');
		$quiz_submit_loading.css('width', $quiz_submit[0].getBoundingClientRect().width - parseFloat($quiz_submit.css('padding-left').replace('px','')) - parseFloat($quiz_submit.css('padding-right').replace('px','')));
		$quiz_submit.children().hide();
		$quiz_submit_loading.show();

		$.post('/submit_quiz/scratchduino', {
			id: self.session.id,
			quiz_index: quiz_index,
			lecture_index: self.lecture_index,
			lesson_index: self.lesson_index || self.exam_index,
			answer_source_code: code
		}, function(data) {
			menu.exam_common.sync_time();
			$quiz_submit.removeAttr('disabled').removeClass('disabled_btn');
			$quiz_submit_loading.hide();
			$quiz_submit.children().not('#quiz_submit_loading').show();

			if (data.result) {
				if (self.lesson_index) {
					// goorm_menu.refresh_status(self.lesson_index, data.result);
					menu.init_student_curriculum();
				}

				// tab.find('span').remove();

				// tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
				toast.show(main_localization.get_value("toast_submit_success"));
				self.check_badge();
			} else {
				if (data.err) {
					toast.show(main_localization.get_value(data.err), {
						'method': 'error'
					});
				} else {
					toast.show(main_localization.get_value("toast_submit_fail"), {
						'method': 'error'
				});
				}
			}
		});
	},
	
	submit_arduino_quiz: function(cm) {
		var self = this;
 		var code = cm.getValue();
 		$('.terminal_running_time').html("0:00.00");
 		$('.goorm-stdout-container').html("");
 		$('.goorm-stdout-container').empty();
 
 		var quiz_index = $('goorm-editor').eq(0).attr('quiz_index');
 		var editor_id = $('goorm-editor[form="arduino"]').parent().attr('id');
 		var tab = $('a[href="#' + editor_id + '"]');
 		var $quiz_submit = $('.quiz_submit');
  		var $quiz_submit_loading = $('#quiz_submit_loading');
		var filetype = $('goorm-editor').eq(0).attr('filetype');
 
 		$quiz_submit.attr('disabled','disabled').addClass('disabled_btn');
  		$quiz_submit_loading.css('width', $quiz_submit[0].getBoundingClientRect().width - parseFloat($quiz_submit.css('padding-left').replace('px','')) - parseFloat($quiz_submit.css('padding-right').replace('px','')));
  		$quiz_submit.children().hide();
  		$quiz_submit_loading.show();
 
 		$.post('/submit_quiz/arduino', {
  			id: self.session.id,
  			quiz_index: quiz_index,
  			lecture_index: self.lecture_index,
  			lesson_index: self.lesson_index || self.exam_index,
  			answer_source_code: code,
			answer_language: filetype,
			removed_bookmarks: self.removed_bookmarks
  		}, function(data) {
			menu.exam_common.sync_time();
			if (data.saved === true) {
				var editor = self.editors[editor_id];
				if (editor) {
					editor.markClean();
				}
				toast.show(main_localization.get_value("toast_save_success"), {
					'method': 'info'
				});
				if (is_student && is_collaboration) {
					if (self.ot_socket) {
						self.ot_socket.emit('edu_save', {
							user_id: user_id,
							user_name: user_name,
							language: filetype,
							filename: self.ot_object[$('.goorm-quiz-tab .tab-pane.active .goorm-editor').attr('goorm-tab')].ot_path
						});
					}
				}
			} else if (data.saved == 'not_student') {
				toast.show(main_localization.get_value("toast_save_fail_not_student"), {
					'method': 'error'
				});
			} else {
				toast.show(main_localization.get_value("toast_save_fail"), {
					'method': 'error'
				});
			}

 			$quiz_submit.removeAttr('disabled').removeClass('disabled_btn');
  			$quiz_submit_loading.hide();
  			$quiz_submit.children().not('#quiz_submit_loading').show();
  
  			if (data.result) {
  				if (self.lesson_index) {
  					menu.init_student_curriculum();
  				}
  
  				tab.find('span').remove();
  
  				tab.prepend('<span class="glyphicon glyphicon-ok" style="margin-right: 5px; color: green"></span>');
  				toast.show(main_localization.get_value("toast_submit_success"));
				self.check_badge();
  			} else {
				if (data.err) {
					toast.show(main_localization.get_value(data.err), {
						'method': 'error'
					});
				} else {
					toast.show(main_localization.get_value("toast_submit_fail"), {
						'method': 'error'
				});
				}
  			}
  		});
	},

	resize: function() {
		var resized_tab = (window.is_mobile ? $('.for_tablets .full_row').height() : $('.full_row').height())
			- (($('.result_content').is(':visible')) ? $('.result_content').outerHeight() : 0)
			- $('.running_content_header').height();

		$('.goorm-quiz-tab .tab-content').height(resized_tab);

		//terminal resize is as flow under code
		$.map(this.terminals, function(e) {
			e.resize();
		});
		if (this.run_terminal && this.run_terminal.resize) {
			this.run_terminal.resize();
		}
		
		$('.serial_container').height(resized_tab - 49);

		var running_content = $('.running_content').outerWidth();
		var toggle = $('.toggle_serial').outerWidth();
		$('.input_message').width(running_content - toggle - 5);

		var $nav_li = $('#myTabs > li');
		this.one_nav_li_width = $nav_li.width();
		this.nav_tab_width = $nav_li.length * $nav_li.width();
		
		if (/mobile/i.test(this.user_agent) || /android/i.test(this.user_agent)) {
			this.check_mobile_keyboard();
			this.visible_tab_width = $(window).width() -  $('.coding_tools').width() - 36;
		} else {
			this.visible_tab_width = $(window).width() - $('.lecture-guide').width() - $('.coding_tools').width() - 36;
		}
		
		this.set_tab_move_btn();
		if (this.is_scratchduino) {
			this.scratchduino_onresize();
		}
		var $no_scratchduino_box = $('#no_scratchduino');
		if ($no_scratchduino_box.length > 0) {
			$no_scratchduino_box.css('padding-top', $('.lecture-running').height()/2 - 20 + 'px');
		}
		var $no_flash_box = $('#no_flash');
		if ($no_flash_box.length > 0) {
			$no_flash_box.css('padding-top', $('.lecture-running').height()/2 - 20 + 'px');
		}
	},
	
	set_tab_move_btn: function() {
		var $myTabs = $('#myTabs');
		
		if (this.nav_tab_width > this.visible_tab_width) {
			if ($myTabs.find("li:first-child").hasClass('active')) {
				$myTabs.css('transform', 'translateX(40px)');
			}
			$('.tab_move').show();
		} else {
			$myTabs.css('transform', 'translateX(0px)');
			$('.tab_move').hide();
		}
	},
	
	check_badge: function(callback) {
		var evt = document.createEvent('Event');
		
		evt.initEvent('check_badge', true, true);

		window.dispatchEvent(evt);
		
		evt = null;
	},
	
	check_mobile_keyboard: function() {
		if (window.innerHeight !== this.initial_screen_size && !/OS X/i.test(this.user_agent)) {
			$('#exam_countdown_clock').hide();
		} else {
			$('#exam_countdown_clock').show();
		}
	},

	update_output_file: function(socket, token, callback) {
		var self = this;
		var $down_btn = $('.output_download');

		if ($down_btn.length) {
			var res = '';
			socket.on('cmd.stdout.' + token, function(stdout) {
				res += stdout;
			}).on('cmd.stderr.' + token, function(stderr) {
				// console.log(stderr)
			}).on('cmd.close.' + token, function() {
				$.post('/quiz/output_file', {
					lesson_index: $('input[name="dashboard_lesson_index_input"]').val(),
					exam_index: $('input[name="dashboard_exam_index_input"]').val(),
					quiz_index: $('[quiz_index]').attr('quiz_index'),
					output: res
				}, function(data) {
					if (data) {
						self.build_blob_output_file(res);
					}
				});

				callback();
			});

			socket.emit('cmd', {
				'token': token,
				'cmd': '/bin/cat /goorm/' + $down_btn.data('path')
			});
		} else {
			callback();
		}
	},
	
	build_blob_output_file: function(data) {
		var $down_btn = $('.output_download');
		
		if ($down_btn.attr('href') && window.URL && window.URL.revokeObjectURL) {
			// release previous blob
			window.URL.revokeObjectURL($down_btn.attr('href'));
		}

		var btn = $down_btn.get(0);
		var	blob = new Blob([data], {type: "octet/stream"});
		var	url = window.URL.createObjectURL(blob);

		btn.href = url;
		btn.download = $down_btn.data('path');

		$down_btn.show();
	},
	
	remove_blob_output_file: function() {
		var $down_btn = $('.output_download');

		if ($down_btn.length) {
			if ($down_btn.attr('href') && window.URL && window.URL.revokeObjectURL) {
				// release previous blob
				window.URL.revokeObjectURL($down_btn.attr('href'));
			}
			
			$down_btn.attr('href', '').attr('download', '').hide();
		}
	},

	get_output_file: function() {
		var self = this;
		var quiz_index = $('[quiz_index]').attr('quiz_index');
		
		$.get('/quiz/get_output_file', {
			lesson_index: $('input[name="dashboard_lesson_index_input"]').val(),
			exam_index: $('input[name="dashboard_exam_index_input"]').val(),
			quiz_index: quiz_index
		}, function(data) {
			if (data) {
				self.build_blob_output_file(data);
			}
		});
	},

	terminal_tab_flicker: function() {
		var $flicker = $('.term-title');
		$flicker.click();
		$flicker.addClass('term_tab_flicker');
		setTimeout(function() {
			$flicker.removeClass('term_tab_flicker');
		}, 6800);
	},
	
	run_time_limit_counter_start: function() {
		if (this.quiz_data.run_time_limit) {
			var self = this;
			var $terminal_running_time = $('.terminal_running_time');
			var $run_time_limit = $('.run_time_limit');
			
			$run_time_limit.html(this.quiz_data.run_time_limit + main_localization.get_value('second'));

			if (this.run_time_limit_counter && (typeof(this.run_time_limit_counter) == 'number')) {
				clearInterval(this.run_time_limit_counter);
			}

			var counter = 0;

			this.run_time_limit_counter = setInterval(function() {
				counter += 10;
				var minutes = parseInt(counter / 6000, 10);
				var seconds = parseInt(counter % 6000 / 100 % 100, 10);
				seconds = (seconds < 10) ? '0' + seconds : seconds;
				var milliseconds = parseInt(counter % 100 / 10, 10);
				
				$terminal_running_time.html(minutes + ':' + seconds + '.' + milliseconds);
			}, 100);
		}
	},
	
	run_time_limit_counter_stop: function(set_timer_full) {
		if (this.run_time_limit_counter && (typeof(this.run_time_limit_counter) == 'number')) {
			clearInterval(this.run_time_limit_counter);
			if (set_timer_full) {
				var $terminal_running_time = $('.terminal_running_time');

				var run_time_limit = this.quiz_data.run_time_limit * 100;

				var minutes = parseInt(run_time_limit / 6000, 10);
				var seconds = parseInt(run_time_limit % 6000 / 100 % 100, 10);
				seconds = (seconds < 10) ? '0' + seconds : seconds;
				var milliseconds = parseInt(run_time_limit % 100 / 10, 10);

				$terminal_running_time.html(minutes + ':' + seconds + '.' + milliseconds);
			}
		}
	},

	get_language: function(filetype) {
		var language = '';
		switch(filetype) {
			case 'c':
				language = 'c';
				break;
			case 'cpp':
				language = 'cpp';
				break;
			case 'py':
				language = 'python';
				break;
			case 'py3':
			case 'python3':
				language = 'python3';
				break;
			case 'java':
				language = 'java';
				break;
			case 'go':
				language = 'go';
				break;
			case 'cs':
				language = 'csharp';
				break;
			case 'swift':
				language = 'swift';
				break;
			case 'js':
				language = 'javascript';
				break;
			case 'rb':
				language = 'ruby';
				break;
			case 'kt':
				language = 'kotlin';
				break;
			case 'scala':
				language = 'scala';
				break;
			case 'vb':
				language = 'vbdotnet';
				break;
			case 'pas':
				language = 'pascal';
				break;
			case 'lua':
				language = 'lua';
				break;
			case 'm':
				language = 'objectivec';
				break;
			case 'R':
				language = 'rlanguage';
				break;
			case 'rs':
				language = 'rust';
				break;
			case 'cob':
				language = 'cobol';
				break;
			case 'clj':
				language = 'clojure';
				break;
			case 'st':
				language = 'smalltalk';
				break;
			case 'dart':
				language = 'dart';
				break;
			case 'hs':
				language = 'haskell';
				break;
			case 'pl':
				language = 'perl';
				break;
			case 'lisp':
				language = 'commonlisp';
				break;
			case 'd':
				language = 'dlanguage';
				break;
			case 'erl':
				language = 'erlang';
				break;
			case 'php':
				language = 'php';
		}

		return language;
	}
};
if (typeof(define) !== 'undefined') {
	define([], function() {
		return tutorial_editor;
	});
}
