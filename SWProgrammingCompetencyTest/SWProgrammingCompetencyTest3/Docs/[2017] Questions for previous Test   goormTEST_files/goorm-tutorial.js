var nav_agent = navigator.userAgent;
// var is_mobile = (nav_agent.match(/iPad/i) !== null || nav_agent.match(/iPhone/i) !== null || nav_agent.match(/iPod/i) !== null || nav_agent.match(/Android/i) !== null);
var is_mobile = (nav_agent.match(/iPhone/i) !== null || nav_agent.match(/iPod/i) !== null || nav_agent.match(/Android/i) !== null);
var is_ipad = (nav_agent.match(/iPad/i) !== null);
var animation = true;

if (document.location.search) {
	document.location.search.substring(1).split('&').map(function(o) {
		var items = o.split('=');
		
		if (items[0] === 'animation' && items[1] === 'false') {
			animation = false;
		}
		
		if (items[0] === 'terminal' && items[1] === 'none') {
			$('.goorm-stdout-container').hide();
			$('.toggle_terminal .fa-angle-down').removeClass('fa-angle-down').addClass('fa-angle-up');
		}
	});
}

var page = parseInt(location.href.split('/').pop(), 10);
var preview = {
	load_slide: function(url) {
		var self = this;
		var slide_url;
		$.ajax({
			url: "http://www.slideshare.net/api/oembed/2",
			data: {
				"url": url,
				"format": "json"
			},
			dataType: "jsonp",
			success: function(json) {
				var slideshow_id = json.slideshow_id;

				self.player.load(slideshow_id);
			}
		});
	},

	player: {
		init: function() {
			var self = this;

			this.f = $('#lesson_slideshare').get(0);
			this.w = this.f.contentWindow;

			$(window).bind('message.slideshare', function(e) {
				var message = e.originalEvent.data;

				var messageComponents = message.split('_');
				var messageName = messageComponents[0];
				var values = messageComponents.slice(1);

				if (messageName === 'getCurrentSlide') {
					self.slide_page = parseInt(values, 10);
				}
			});
		},

		load: function(slideshow_id) {
			this.f.src = "http://www.slideshare.net/slideshow/embed_code/" + slideshow_id + '?jsapi=true';
		},

		next: function() {
			this.w.postMessage('next', '*');
		},

		prev: function() {
			this.w.postMessage('previous', '*');
		},

		jumpTo: function(page) {
			this.w.postMessage('jumpTo_' + page, '*');
		},

		getCurrentSlide: function() {
			this.w.postMessage('getCurrentSlide', '*');
		}
	},

	load: function () {
		var url = $('#lesson_slideshare').attr('url');

		if (url === 'NO_URL') {
			$('.contents_container .slideshare_contents').html('<div class="well well-sm">' + lang.none_slideshare_url + '</div>');
		}
		else {
			preview.player.init();
			preview.load_slide(url);

			return true;
		}
	}
};

var load_type = 'programming';

/* Resize Variable */
var init = false;
var prev = 0;
var top_height = 0;
var bottom_height = 0;
var west_ready = true;
var prev_left = 0;
var east_ready = true;

/**
 * Container Resize
 */
var CONTAINER_HEIGHT = 0;
var CONTENTS_HEIGHT = 0;

var west_resize = function(msg) {
	if (!msg) {
		msg = {};
	}

	var contents_left_height = CONTENTS_HEIGHT - 40;

	var wrapper = (msg.force !== undefined && msg.force !== false) ? msg.force : $('.goorm-stdout-wrapper').height();
	var guide_container = (init) ? $('.guide-container').height() : 200;
	var title_width = $('.title_container').width() - ($('.title_container .previous').outerWidth() * 2) -  $('.content_print_btn').outerWidth();

	init = true;

	if (is_mobile || $(window).width() <= 767) {
		$('.tutorial_left_contents .instruction_contents').height(contents_left_height - guide_container - 5 - 11);
	} else {
		$('.tutorial_left_contents .instruction_contents').height(contents_left_height - guide_container - 10 - 11);
	}
	
	$('.title_container .contents').outerWidth(title_width);
	$('.title_container .current_parent_title').outerWidth(title_width - 50); // 50: badge
	
	var RESPONSIVE = ($(window).width() <= 767) ? true : false;
	$('#goorm_accordion').outerWidth($('#goorm_accordion').parent().outerWidth() + ((RESPONSIVE) ? 3 : 2));
};

var east_resize = function(msg) {
	if (!msg) {
		msg = {};
	}
	
	var wrapper_h = (msg.force !== undefined && msg.force !== false) ? msg.force : $('.goorm-stdout-wrapper').get(0).offsetHeight;
	var stdout_panel_h = wrapper_h + 38 + 10; // 38:heading, 10: padding-top
	var editor_h = CONTENTS_HEIGHT - stdout_panel_h - 41; // 39: tab, 2:border

	var $m_r_cont = $('.middle_right_container');
	var $tab_content = $('goorm-tabs .tab-content');
	
	if ($(window).width() <= 767 || is_mobile) {
		if (wrapper_h < 200 && (msg.force === undefined || msg.force === false)) {
			wrapper_h = 200;
		}
		stdout_panel_h = wrapper_h + 38 + 5; // 5: padding-top
		editor_h = CONTENTS_HEIGHT - stdout_panel_h - 41;
		$m_r_cont.outerWidth($(window).width() - 10); // 10: padding
	} else {
		$m_r_cont.outerWidth($(window).width() - $('.middle_left_container').outerWidth() - 20).show(); // 20 for padding;
	}

	if (msg.animation) {
		$tab_content.animate({
			'height': editor_h + 'px'
		}, 300);
	} else {
		$tab_content.height(editor_h);
	}
};

//taeyoung : add function for tab line
var total_width = 0;
var tabs_width = 0;
var btns_width = 0;

var resize = function() {
	
	CONTAINER_HEIGHT = (is_mobile || $(window).width() <= 767) ? ($(window).height() - 95) : ($(window).height() - 70);
	CONTENTS_HEIGHT = CONTAINER_HEIGHT - 11;

	$('.contents_container .middle').css('height', CONTAINER_HEIGHT + 'px');

	if (load_type === 'programming') {
		if (west_ready) {
			west_resize();
		}
		if (east_ready) {
			east_resize();
		}
	}

	//taeyoung : add function for tab line
	total_width = $('.tutorial_right_contents').width();//$('.nav.nav-tabs.edu_tabs').width();
	
	if ((tabs_width + btns_width) > total_width) {
		$('.fa.fa-caret-left').parent().css('display', 'inherit');
		$('.fa.fa-caret-right').parent().css('display', 'inherit');
	}
	else {
		$('.fa.fa-caret-left').parent().css('display', 'none');
		$('.fa.fa-caret-right').parent().css('display', 'none');
		$('._nav').css('transform', 'translateX(0px)');
	}
};
