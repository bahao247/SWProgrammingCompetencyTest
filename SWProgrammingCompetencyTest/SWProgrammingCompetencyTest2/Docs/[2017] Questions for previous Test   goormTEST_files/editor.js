var editor_complete = {
	CDN_URL: 'https://statics.goorm.io/lge',
	EXCLUDE_TRIGGER: {
		"8": "backspace","9": "tab","13": "enter","16": "shift","17": "ctrl","18": "alt","19": "pause","20": "capslock","27": "escape","33": "pageup","34": "pagedown","35": "end","36": "home","37": "left","38": "up","39": "right","40": "down","45": "insert","46": "delete","91": "left window key","92": "right window key","93": "select","107": "add","109": "subtract","110": "decimal point","111": "divide","112": "f1","113": "f2","114": "f3","115": "f4","116": "f5","117": "f6","118": "f7","119": "f8","120": "f9","121": "f10","122": "f11","123": "f12","144": "numlock","145": "scrolllock","186": "semicolon","187": "equalsign","188": "comma","189": "dash",/*"190": "period",*/"191": "slash","192": "graveaccent","220": "backslash","222": "quote"
	},
	EXCLUDE_CHARS: /[ㄱ-ㅎㅏ-ㅣ가-힣\!@#$%\^\&\*<>]+/,
	json: {
		c: {
			functions: null,
			types: null
		},
		cpp: {
			all: null
		},
		java: {
			all: null
		}
	},

	init: function(cm, options) {
		var self = this;

		this.init_event(cm);
		this.get_json();

		CodeMirror.registerGlobalHelper('hint', 'cwords', function(mode, editor) {
			// console.log('mode:', mode)
			if (mode.helperType === 'text/x-csrc') {
				return true;
			} else {
				return false;
			}
		}, function(editor, options) {
			var cur = editor.getCursor();
			var token = editor.getTokenAt(cur);

			var words = CodeMirror.hint.fromList(editor, {words: editor.getHelper(cur, 'hintWords')});
			var anyword = CodeMirror.hint.anyword(editor, options);
			var ref_words = self.json.c.functions && self.json.c.types ?
				CodeMirror.hint.fromList(editor, {words: self.json.c.functions.concat(self.json.c.types)}) : null;

			var final_list = [];

			var add = function(arr) {
				for (var i = 0; i < arr.length; i++) {
					if (final_list.indexOf(arr[i]) == -1) {
						final_list.push(arr[i]);
					}
				}
			};

			if (anyword && anyword.list && anyword.list.length) {
				add(anyword.list);
			}
			if (words && words.list && words.list.length) {
				add(words.list);
			}
			if (ref_words && ref_words.list && ref_words.list.length) {
				add(ref_words.list);
			}

			final_list.sort();
			final_list = final_list.slice(0, 50);

			return {
				list: final_list,
				from: {line: cur.line, ch: token.start},
				to: {line: cur.line, ch: token.end}
			};
		});

		CodeMirror.registerGlobalHelper('hint', 'javawords', function(mode, editor) {
			// console.log('mode:', mode)
			if (mode.helperType === 'text/x-java') {
				return true;
			} else {
				return false;
			}
		}, function(editor, options) {
			var cur = editor.getCursor();
			var token = editor.getTokenAt(cur);

			var words = CodeMirror.hint.fromList(editor, {words: editor.getHelper(cur, 'hintWords')});
			var anyword = CodeMirror.hint.anyword(editor, options);
			var ref_words = self.json.java.all ? CodeMirror.hint.fromList(editor, {words: self.json.java.all}) : null;

			var final_list = [];

			var add = function(arr) {
				for (var i = 0; i < arr.length; i++) {
					if (final_list.indexOf(arr[i]) == -1) {
						final_list.push(arr[i]);
					}
				}
			};

			if (anyword && anyword.list && anyword.list.length) {
				add(anyword.list);
			}
			if (words && words.list && words.list.length) {
				add(words.list);
			}
			if (ref_words && ref_words.list && ref_words.list.length) {
				add(ref_words.list);
			}

			final_list = final_list.slice(0, 50);
			final_list.sort(); // to large to sort all. splice and sort

			return {
				list: final_list,
				from: {line: cur.line, ch: token.start},
				to: {line: cur.line, ch: token.end}
			};
		});
		CodeMirror.registerGlobalHelper('hint', 'cppwords', function(mode, editor) {
			// console.log('mode:', mode)
			if (mode.helperType === 'text/x-c++src') {
				return true;
			} else {
				return false;
			}
		}, function(editor, options) {
			var cur = editor.getCursor();
			var token = editor.getTokenAt(cur);

			var words = CodeMirror.hint.fromList(editor, {words: editor.getHelper(cur, 'hintWords')});
			var anyword = CodeMirror.hint.anyword(editor, options);
			var ref_words = self.json.cpp.all ? CodeMirror.hint.fromList(editor, {words: self.json.cpp.all}) : null;

			var final_list = [];

			var add = function(arr) {
				for (var i = 0; i < arr.length; i++) {
					if (final_list.indexOf(arr[i]) == -1) {
						final_list.push(arr[i]);
					}
				}
			};

			if (anyword && anyword.list && anyword.list.length) {
				add(anyword.list);
			}
			if (words && words.list && words.list.length) {
				add(words.list);
			}
			if (ref_words && ref_words.list && ref_words.list.length) {
				add(ref_words.list);
			}

			final_list.sort();
			final_list = final_list.slice(0, 50);

			return {
				list: final_list,
				from: {line: cur.line, ch: token.start},
				to: {line: cur.line, ch: token.end}
			};
		});
	},

	init_event: function(cm) {
		var self = this;

		cm.on('keyup', function(editor, event) {

			var cur = editor.getCursor();
			var token = editor.getTokenAt(cur);

			if (!editor.state.completionActive &&
				!self.EXCLUDE_TRIGGER[(event.keyCode || event.which).toString()] &&
				!self.EXCLUDE_CHARS.test(token.string) &&
				(token.type && token.type !== 'string')
			   ) {
				editor.showHint({
					// hint: self.find_hint, //CodeMirror.hint.anyword,//(_edt, {word: new RegExp(token.string), range: 100}),
					completeSingle: false,
					closeOnUnfocus: true,
					closeCharacters: /[^\w]/ //[\s()\[\]{};:>,\.\+\-\*]/
				});
			}
		});
	},

	find_hint: function(cm, showhint, data) {
		// console.log(showhint)
		// console.log(data)
		var cur = cm.getCursor();
		var token = cm.getTokenAt(cur);

		return {
			list: [{text: 'text', displayText: 'displayText', className: 'grm-ec'}],
			from: {line: cur.line, ch: token.start},
			to: {line: cur.line, ch: token.end}
		};
	},

	get_json: function() {
		var self = this;

		if (this.json.c.functions === null) {
			this.json.c.functions = [];
			$.getJSON(this.CDN_URL + "/plugins/complete/c/functions.json", function(data) {
				self.json.c.functions = data;
			});
		}
		if (this.json.c.types === null) {
			this.json.c.types = [];
			$.getJSON(this.CDN_URL + "/plugins/complete/c/types.json", function(data) {
				self.json.c.types = data;
			});
		}
		if (this.json.java.all === null) {
			this.json.java.all = [];
			$.getJSON(this.CDN_URL + '/plugins/complete/java/index.json', function(data) {
				self.json.java.all = data;
			});
		}
		if (this.json.cpp.all === null) {
			this.json.cpp.all = [];
			$.getJSON(this.CDN_URL + '/plugins/complete/cpp/index.json', function(data) {
				self.json.cpp.all = data;
			});
		}
		//var i, j, result = [], codes = document.querySelectorAll('.t-lines > span'); for (i = 0; i < codes.length; i++) {if (result.indexOf(codes[i].innerText) == -1) {result.push(codes[i].innerText)}} JSON.stringify(result);
	}
};
