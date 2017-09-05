define(["codemirror",
		"codemirror/addon/mode/loadmode",
		"codemirror/mode/meta",
		// "codemirror/addon/runmode/runmode",
		// "codemirror/addon/runmode/colorize",
		"codemirror/addon/search/searchcursor",
		// "codemirror/addon/hint/show-hint",
		// "codemirror/addon/hint/anyword-hint",
		// "codemirror/addon/merge/merge",
		// "codemirror/addon/search/match-highlighter",
		// "codemirror/addon/fold/foldgutter",
		// "codemirror/addon/fold/brace-fold",
		// "codemirror/addon/fold/xml-fold",
		"codemirror/addon/edit/closebrackets",
		"codemirror/addon/edit/closetag",
		"codemirror/addon/edit/matchbrackets",
		// "codemirror/addon/dialog/dialog",
		"codemirror/addon/selection/active-line",
		"codemirror/addon/hint/show-hint",
		"codemirror/addon/hint/anyword-hint",
		/*'codemirror/addon/display/placeholder'*/
	    "codemirror/addon/display/fullscreen",
		"codemirror/addon/display/panel",
	    "codemirror/addon/dialog/dialog",
 	   	"codemirror/keymap/emacs",
 		"codemirror/keymap/sublime",
 		"codemirror/keymap/vim"],
function (CodeMirror) {
    var widgets = {};
	window.CodeMirror = CodeMirror;
	CodeMirror.modeURL = 'codemirror/mode/%N/%N';

    widgets.codemirror = function() {
		
        this.cm = null;
		this.ready = false;
		
		this.configs = {
			// 'editor': {
				gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
				foldGutter: true,
				lineNumbers: true,
				wordWrap: true,
				lineWrapping: true,
				styleActiveLine: true,
				indentWithTabs: true,
				matchBrackets: true,
				autoCloseBrackets: true,
				extraKeys: { 
					"Ctrl-Space": "autocomplete",
					'Space': function(cm) {
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
					}
				},
				fullscreenBtn: null,
				fullScreenContainer: null
			// }
		};
    };

    widgets.codemirror.prototype = {
				
        init: function (container, _configs) {
			var self = this;
						
			if (_configs) {
				$.extend(true, this.configs, _configs);
			}
	
			window.is_mobile = /mobile/i.test(navigator.userAgent) || /android/i.test(navigator.userAgent);
			
			if(this.configs.fullscreenBtn && !window.is_mobile) {
				//prepare fullscreen button before codemirror initialized
				this.fullscreenBtn = $('<a class="btn btn-default btn-sm fullscreen">' + (self.configs.fullscreen_html || '최대화면') + '(F10)</a>').css('position', 'absolute').css('z-index', 9).css('right', '20px').css('top','5px');
				
				var fullScreen_toggle = function () {
					var is_fullscreen = self.cm.getOption('fullScreen');
					var container = self.configs.fullScreenContainer;
					
					if (typeof container === 'string') {
						container = $(container);
					}

					self.cm.setOption('fullScreen', !is_fullscreen);
					if(is_fullscreen) {
						//when minimized
						self.fullscreenBtn.css('position', 'absolute').css('z-index', 9).text((self.configs.fullscreen_html || '최대화면') + '(F10)');
						
						if (container) {
							container.removeClass('fullScreen');
						}
					} else {
						//when fullscreened
						self.fullscreenBtn.css('position', 'fixed').css('z-index', 99).text((self.configs.originalscreen_html || '최대화면') + '(F10)');
						if (container) {
							container.addClass('fullScreen');
						}
					}
					self.cm.refresh();
				};
				
				this.fullScreen_toggle = fullScreen_toggle;
				
				this.configs.extraKeys.F10 = fullScreen_toggle;
				this.fullscreenBtn.click(fullScreen_toggle);
			}

			this.container = container;

			this.cm = CodeMirror.fromTextArea(this.container, this.configs);

			if (this.configs) {
				
				if (this.configs.fullscreenBtn) {
					//attach DOM after codemirror initialized
					$(container).parent().find('.CodeMirror-wrap').prepend(this.fullscreenBtn);				
				}
				
				if (this.configs.mode) {
					this.set_mode(this.configs.mode);
				}

				if (this.configs.theme) {
					this.set_theme(this.configs.theme);
				}

				if (this.configs.change_event) {
					this.set_change_event(this.configs.change_event);
				}
				
			}

            return this;
        },
		
		set_option: function (name, value) {
			this.cm.setOption(name, value);
			
			return this;
		},

		set_data: function (contents) {
			var self = this;
			
            contents = contents || "";

			this.cm.setValue(contents);
			this.convert_space();
			this.cm.refresh();
			return this;
		},

        get_data: function () {
			return this.cm.getValue();
        },

        set_readonly: function (b) {
            b = b || false;
			
			this.set_option('readOnly', b);

			return this;
        },
		
		set_mode: function (val) {
			// this.set_option('mode', mode);
			var m, info, mode, spec;
			if (m = /.+\.([^.]+)$/.exec(val)) {
				info = CodeMirror.findModeByExtension(m[1]);
				if (info) {
					mode = info.mode;
					spec = val;
				}
			} else if (/\//.test(val)) {
				info = CodeMirror.findModeByMIME(val);
				if (info) {
					mode = info.mode;
					spec = val;
				}
			} else {
				mode = spec = val;
			}

			this.set_option('mode', spec);
			CodeMirror.autoLoadMode(this.cm, mode);
			
			this.configs.mode = mode;

			return this;
		},
		
		set_theme: function (theme) {
			if (theme !== "default" && $('head').find('link[theme="'+theme+'"]').length === 0) {
				$("<link>").attr("rel", "stylesheet").attr("type", "text/css").attr("href", "/libs/codemirror/theme/" + theme + ".css").appendTo("head");
			}
			
			this.set_option("theme", theme);
			
			this.configs.theme = theme;
		},

		change_event: function(fn) {
			if (fn && typeof(fn) === 'function') {
				this.cm.on('change', fn);
			}
			
			return this;
		},
		
        get_cm: function () {
			return this.cm;
        },
		
		refresh: function () {
			this.cm.refresh();
			
			return this;
		},

		refresh_bookmark_positions: function(lang, bookmark_config) {
			var cm = this.cm;
			var all_marks = cm.getAllMarks();

			for (var i = 0, len = all_marks.length; i < len; i++) {
				var widget = all_marks[i];
				
				if (widget && widget.type === 'bookmark') {
					var pos = widget.find(); // new, actual position
					var widget_x_btn = widget.widgetNode.children[0].childNodes[1];
					var widget_old_id = [lang, widget_x_btn.getAttribute('line'), widget_x_btn.getAttribute('ch')].join('_');
					var widget_new_id = [lang, pos.line, pos.ch].join('_');

					var idx = -1;

					for (var j = 0; j < bookmark_config.bookmarks.length; j++) {
						if (bookmark_config.bookmarks[j].id === widget_old_id) {
							idx = j;
							break;
						}
					}

					if (idx !== -1) {
						// update with new position
						bookmark_config.bookmarks[idx].id = widget_new_id;
						bookmark_config.bookmarks[idx].pos = pos;
					}
				}
			}
		},

		focus: function() {
			this.cm.focus();
			
			return this;
		},

		convert_space: function() {
			var cm = this.cm;
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
		},

		addPanel: function(pos, text) {
			var cm = this.cm;
			var node = document.createElement('div');
			node.setAttribute('class', 'cm-panel');
			var label = node.appendChild(document.createElement('span'));
			label.textContent = text;

			cm.addPanel(node, {position: pos, stable: true});
		}
    };

    return widgets.codemirror;
});
