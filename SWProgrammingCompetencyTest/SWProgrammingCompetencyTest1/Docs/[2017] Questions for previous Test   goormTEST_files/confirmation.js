var confirmation = {
	init: function(option) {
		var self = this;

		this.panel = $('#dlg_confirmation');

		this.title = option.title;
		this.message = option.message;
		this.zIndex = option.zIndex || 2;

		this.yes_text = option.yes_text || "네";
		this.no_text = option.no_text || "아니오";

		this.yes_localization = option.yes_localization || "네";
		this.no_localization = option.no_localization || "아니오";

		this.yes = option.yes;
		this.no = option.no;
		this.close = option.close;

		if (this.title != "" && this.title != undefined) {
			this.title_id = this.title.replace('?', "");
			$("#confirmation_title").html(this.title);
		}

		var goorm_dialog_container = this.panel.find('#confirmation_content_container');
		goorm_dialog_container.empty().append(this.message);

		var cfrm_btn_yes = this.panel.find(".modal-footer #g_cfrm_btn_yes"); //jeongmin: yes confirm button
		var cfrm_btn_no = this.panel.find(".modal-footer #g_cfrm_btn_no"); //jeongmin: no confirm button

		// Button Text & Localization
		//
		if (this.yes_text) {
			cfrm_btn_yes.html(this.yes_text);
		}

		if (this.yes_localization) {
			cfrm_btn_yes.attr("localization_key", this.yes_localization);
		}

		if (this.no_text) {
			cfrm_btn_no.html(this.no_text);
		}

		if (this.no_localization) {
			cfrm_btn_no.attr("localization_key", this.no_localization);
		}

		cfrm_btn_yes.off('click');
		cfrm_btn_yes.click($.debounce(250, true, function() {
			self.bt_clicked = true;

			cfrm_btn_yes.attr("disabled", "true");
			self.panel.modal('hide');

			if (typeof option.yes == "function") {
				option.yes.call();
			}
		}));

		cfrm_btn_no.off('click');
		cfrm_btn_no.click(function() {
			self.bt_clicked = true;

			self.panel.modal('hide');

			if (typeof option.no == "function") {
				option.no.call();
			}
		});

		if (!this.first_init) {
			this.first_init = true;

			this.panel.on('hidden.bs.modal', function() {
				self.panel.modal('hide');

				//jeongmin: when user close confirmation by clicking out of modal or pushing esc, do no button
				if (!self.bt_clicked && typeof option.no == "function")
					option.no.call();

				if (typeof option.close == "function") {
					option.close.call();
				}

				self.bt_clicked = false; //jeongmin: reset 
				cfrm_btn_yes.removeAttr("disabled");
			});

			// move to Center
			//
			this.panel.on("show.bs.modal", function() {
				setTimeout(function() {
					self.panel.css('top', '0px');

					var container = self.panel.find('.modal-dialog');

					var window_height = $(window).height();
					var container_height = container.height();

					if (window_height > container_height) {
						container.css('margin-top', ((window_height - container_height) / 2) + 'px');
					} else {
						container.css('margin-top', '10px');
					}
				}, 200); // fade animation: 0.15s -> 150
			});

			this.panel.on("shown.bs.modal", function() {
				if(option.shown && typeof(option.shown) === 'function') {
					option.shown();
				}
			});
			
			this.panel.on("keydown", function(e) {
				if (e.keyCode == 13) {
					cfrm_btn_yes.click();
				}
			});
		}

		return this;
	},

	show: function() {
		var self = this;

		if (this.reculsive) {
			$('div.modal-backdrop.fade.in').first().remove();

			setTimeout(function() {
				if (self.panel.modal) {
					self.panel.modal('show');
				}
			}, 500);
		} else {
			if (this.panel.modal) {
				this.panel.modal('show');
			}
		}
	},

	hide: function() {
		if (this.panel.modal) {
			this.panel.modal('hide');
		}
	},

	set: function(option, value) {
		this[option] = value;
	}
};

if (typeof(define) === 'undefined') {
	window.confirmation = confirmation;
} else {
	define(function(){
		var widgets = {};
		widgets.confirmation = function() {
			this.panel = null;
		};

		widgets.confirmation.prototype = confirmation;
		
		return widgets.confirmation;
	});	
}