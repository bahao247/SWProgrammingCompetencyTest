var main_localization = {
	// CDN_URL: 'https://statics.goorm.io/lge',
	CDN_URL: '',
	language: 'kor',
	data: {
		version: -1,
		kor: {},
		us: {}
	},

	init: function(callback) {
		var self = this;
		
		this.set_event();

		this.get_current_data();
		this.get_current_language(function() {
			self.get_version(function(version) {
				if (version > self.data.version || !self.data[self.language]) {
					self.get_lang_json(self.language, function(success) {
						if (success) {
							// self.apply(function() {
								window.language_data = self.data;
								// if (self.language === 'kor'){
								// 	$('#localization-container').html('한국어');
								// } else if (self.language === 'us'){
								// 	$('#localization-container').html('English');
								// } else if (self.language === 'jp'){
								// 	$('#localization-container').html('日本語');
								// }

							if(callback) {
								callback();	
							}
							// });
						} else if(callback) {
							callback();	
						}
					});
				} else {
					// self.apply(function() {
						window.language_data = self.data;

					if(callback) {
						callback();	
					}
					// });
				}
			});			
		});
	},

	set_event: function(callback) {
		var self = this;

		$('.localization_item').click(function() {
			var lang = $(this).attr('lang');
			var lang_name = $(this).html();
			
			self.language = lang;

			self.get_version(function(version) {
				if (version > self.data.version || !self.data[self.language]) {
					self.get_lang_json(self.language, function(success) {
						if (success) {
							self.apply(function() {
								window.language_data = self.data;
								
								$('#localization-container').html(lang_name);
							});
						}
					});
				} else {
					self.apply(function() {
						window.language_data = self.data;
						
						$('#localization-container').html(lang_name);
					});
				}
			});
		});
	},

	get_version: function(callback) {
		// $.getJSON('/configs/version/version.json', function(version) {
		// 	if (version) {
		// 		callback(version.language);
		// 	} else {
		// 		console.log('main.localization.js:get_version fail - cannot find version.json');
		// 		callback(1);
		// 	}
		// });
		callback(1);
	},

	get_lang_json: function(language, callback) {
		var self = this;

		$.getJSON(this.CDN_URL + '/configs/languages/' + language + '.main.json', function(json) {
			if (json) {
				self.data[language] = json;
				callback(true);
			} else {
				console.log('main.localization.js:get_lang_json fail - cannot find '+language+'.main.json');
				self.data[language] = {};

				callback(false);
			}
		});
	},

	get_current_data: function() {
		var data = (localStorage.getItem('language.data') && localStorage.getItem('language.data') != 'null' && localStorage.getItem('language.data') != 'undefined') ? localStorage.getItem('language.data') : '{}';

		this.data = JSON.parse(data);
	},

	get_current_language: function(callback) {
		var self = this;

		if ($('body').data('lang')) {
			this.language = $('body').data('lang');
			callback();
		} else {
			$.get('/current_language', function(lang) {
				self.language = lang;

				callback();
			});
		}
	},

	apply: function(callback) {
		var lang_data = this.data[this.language];

		if (lang_data) {
			async.forEachOf(lang_data, function(v, key, next) {
				var value = v.value;

				var nodes = $('[localization_key="' + key + '"]');

				var caret = $('[localization_key="' + key + '"] > .caret')[0];
				var placeholder = nodes.attr('placeholder');
				
				nodes.html(value);

				if (caret) {
					$('[localization_key="' + key + '"].dropdown-toggle').append('<b class="caret"></b>');
				}

				if (placeholder) {
					nodes.attr('placeholder', value);
					nodes.empty();
				}

				$('[tooltip="' + key + '"]').attr('data-original-title', value);

				next();
			}, function() {
				callback();
			});
		} else {
			callback();
		}
	},

	get_value: function(key) {
		if (window.language_data && window.language_data[this.language] && window.language_data[this.language][key] && window.language_data[this.language][key].value) {
			return window.language_data[this.language][key].value;
		} else {
			return '';
		}
	}
};

if (typeof(define) !== 'undefined') {
	define([], function() {
		return main_localization;
	});
}
