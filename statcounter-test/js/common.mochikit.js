var Tooltip = { }; // prototype

Tooltip.create = function (e) {
	var area = e.src();
	if (hasElementClass(area, 'tooltipstered')) {
		return; // already covered
	}
	if(getNodeAttribute(area, 'title')){
		setNodeAttribute(area, 'title_', getNodeAttribute(area, 'title').slice(0));
		removeNodeAttribute(area, 'title');
	}
	//	e.stop();
	var old_tooltip = getElement('tooltip');
	if(hasElementClass(old_tooltip, 'label-popup') && !hasElementClass(area, 'clickable')){
		return;
	}
	var tooltip = Tooltip.build(area);
	tooltip.area = area;
	if (!old_tooltip){
		appendChildNodes(document.body, tooltip);
	} else {
		swapDOM(old_tooltip, tooltip);
	}
	Tooltip.set_position(tooltip);
	if(hasElementClass(area, 'clickable')){
		// project.js handles clickable creation and destruction
	} else {
		disconnectAll(area, 'onmouseenter'); // synthetic event, doesn't work
		disconnectAll(area, 'onmouseover');
		e.stopPropagation();
		var ds = connect(area, 'onmouseleave', function(){
			Tooltip.destroy(area);
			connect(area, 'onmouseenter', Tooltip.create);
			disconnect(ds);
		});
	}
	return 1;
};

Tooltip.build = function (area) {
	// generate DOM tree
	if(hasElementClass(area, 'arrowtip')){
		var tooltip   = DIV({'class': 'tooltip-body'});
	} else {
		var tooltip   = DIV({'id': 'tooltip', 'class': 'tooltip-body'});
	}
	this.title_div = DIV({});
	tooltip.appendChild(this.title_div);
	if(hasElementClass(area, 'arrowtip')){
		var extra_class = '';
		if (hasElementClass(area, 'visitor-label') || hasElementClass(area, 'internal-website-address')) {
			extra_class += ' label-popup';
		}
		tooltip = DIV({'id': 'tooltip', 'class': 'arrow-container'+extra_class}, tooltip);
		if(hasElementClass(area, 'redirect')){
			addElementClass(tooltip, 'redirect');
		}
		tooltip.appendChild(DIV({'class': 'bottom-arrow'}));
		tooltip.appendChild(DIV({'class': 'bottom-arrow-inner'}));
	}

	var title = getNodeAttribute(area, "title_");
	if (title) {
		// build the tooltip
			var title_text = '';
		do {
			title_text = title;
			title = title_text.replace(/(.*)\*([^.].*[^.]|[^.])\*(.*)/g, '$1<strong>$2</strong>$3');
		} while (title_text != title);
		this.title_div.innerHTML = title_text;
	} else {
		addElementClass(area, 'full-replace');
		replaceChildNodes(this.title_div, area.childNodes);
	}
	return tooltip;
};

Tooltip.set_position = function (tooltip){
	var viewport_dim = getViewportDimensions();
	var viewport_pos = getViewportPosition();
	var coords = {"x": 0, "y": 0};
	coords.x = getElementPosition(tooltip.area).x - 16;
	var tooltip_body = getFirstElementByTagAndClassName(null, 'tooltip-body', tooltip);
	if(hasElementClass(tooltip.area, 'arrowtip')){
		var label_width = (getElementDimensions(tooltip.area).w / 2)
		setStyle(tooltip_body, {'margin-left': '-'+(label_width-20)+'px' });
		coords.x += label_width;
		coords.x -= 8;
		var right_edge = coords.x + getElementDimensions(tooltip_body).w;
		var viewport_edge = viewport_pos.x + viewport_dim.w;
		if (right_edge > viewport_edge) {
			setStyle(tooltip_body, {'margin-left': '-'+((right_edge-viewport_edge)+label_width-5)+'px' });
		}
		if(hasElementClass(tooltip.area, 'bar')){
			coords.x += getNodeAttribute(tooltip.area, 'width') / 2;
		} else if(hasElementClass(tooltip.area, 'data-point')){
			coords.x += 4;
		}
	}
	// horizontal positioning affects height
	setElementPosition(tooltip, coords);
	var tooltip_dim  = getElementDimensions(tooltip);
	coords.y = getElementPosition(tooltip.area).y - tooltip_dim.h;
	if(hasElementClass(tooltip, 'label-popup')){
		coords.y  += 6;
	} else if(hasElementClass(tooltip, 'arrow-container')){
		coords.y  += 3;
	}
	if (coords.y < 0 && tooltip_body) {
		setStyle(tooltip, {'transform': 'scaleY(-1)', 'transform-origin': 'bottom'});
		setStyle(tooltip_body, {'transform': 'scaleY(-1)'});
	}
	setElementPosition(tooltip, coords);
};


Tooltip.destroy = function (area) {
	// destroy the tooltip
	var tooltip = getElement("tooltip");
	if(tooltip && hasElementClass(area, 'full-replace')){
		appendChildNodes(area, this.title_div.childNodes);
	}
	if(tooltip && tooltip.parentNode){
		tooltip.parentNode.removeChild(tooltip);
	}
};
/*
function init_mapTooltips() {
	var areaTags = getElementsByTagAndClassName('area', null, zonemap);
	for (var ii=0; ii < areaTags.length; ii++) {
		var area = areaTags[ii];
		var title = getNodeAttribute(area, 'title');
		setNodeAttribute(area, 'title_', title.slice(0));
		removeNodeAttribute(area, 'title');
		removeNodeAttribute(area, 'alt');
		connect(area, "onmouseenter", ;
	}
}*/
function disableButton(buttonOrId){
	var button = getElement(buttonOrId);
	button.disabled = true;
}

function enableButton(buttonOrId){
	var button = getElement(buttonOrId);
	button.disabled = false;
}


function connectEach(iterable, signal, dest, func){
	return MochiKit.Base.map(function(el){
		return connect(el, signal, dest, func);
	}, iterable);
}

function signal_el(el, type){
	signal(el, type, {stop: noop, src: function(){ return getElement(el);} });
}

// port of rDuration from include/presentation/tools/stats.php
function rDuration(duration, is_short, is_long, omit_zero_periods) {
	if (is_short === undefined) {
		is_short = false;
	}
	if (omit_zero_periods === undefined) {
		omit_zero_periods = false;
	}
	if (is_short) {
		var sec_str = 's';
		var min_str = 'm';
		var hour_str = 'h';
	} else if (is_long) {
		var sec_str = ' second';
		var min_str = ' minute';
		var hour_str = ' hour';
	} else {
		var sec_str = ' sec';
		var min_str = ' min';
		var hour_str = ' hour';
	}
	if (duration == 1) {
		return duration + ' second';
	} else if (duration < 60) {
		return duration + ' seconds';
	} else if (duration < 3600) {
		var minutes = Math.floor(duration / 60);
		var seconds = Math.floor(duration % 60);
		if (minutes == 1 || is_short) {
			minutes = minutes + min_str;
		} else {
			minutes = minutes + min_str + 's';
		}
		if (seconds == 0 && omit_zero_periods) {
			return minutes;
		} else if (seconds == 1 || is_short) {
			seconds = seconds + sec_str;
		} else {
			seconds = seconds + sec_str + 's';
		}
		return minutes + ' ' + seconds;
	} else {
		var hours = Math.floor(duration / 3600);
		var minutes = Math.floor((duration % 3600)/60);
		var seconds = Math.floor(duration % 60);
		if (hours == 1 || is_short) {
			hours = hours + hour_str;
		} else {
			hours = hours + hour_str + 's';
		}
		if (minutes == 0 && omit_zero_periods) {
			minutes = '';
		} else if (minutes == 1 || is_short) {
			minutes = minutes + min_str;
		} else {
			minutes = minutes + min_str + 's';
		}
		if (is_short || (seconds == 0 && omit_zero_periods)) {
			seconds = '';
		} else if (seconds == 1) {
			seconds = ' ' + seconds + sec_str;
		} else {
			seconds = ' ' + seconds + sec_str + 's';
		}
		return hours + ' ' + minutes + seconds;
	}
}

function rDurationInv(duration_str) {
	if (duration_str === '') {
		return 0;
	}
	var secs = 0;
	if (duration_str.indexOf('h') !== -1) {
		var bits = duration_str.split('h');
		secs += 60 * 60 * parseInt(bits[0].replace( /^\D+/g, ''), 10);
		duration_str = bits[1];
	}
	if (duration_str.indexOf('m') !== -1) {
		var bits = duration_str.split('m');
		secs += 60 * parseInt(bits[0].replace( /^\D+/g, ''), 10);
		duration_str = bits[1];
	}
	secs += parseInt(duration_str.replace( /^\D+/g, ''));
	return secs;
}

/* to test:
for (var i=0; i<100000; i++) {
	if (rDurationInv(rDuration(i, false)) != i) {
		console.log(rDuration(i, false));
		console.log(i);
		break;
	}
// short versions above 1 hour lose the seconds value
	if (i <= 3600 && rDurationInv(rDuration(i, true)) != i) {
		console.log(rDuration(i, true));
		console.log(i);
		break;
	}
}
*/

function show_info_block(more_info, info_block){
	var arrow = getFirstElementByTagAndClassName('span', null, more_info);
	if(info_block.style.display != 'block'){
		// height can get stuck at an intermediate value with rapid clicks
		info_block.style.height = null;
		MochiKit.Visual.blindDown(info_block, {duration: 0.3});
		addElementClass(more_info, 'down');
		callLater(0.1, addElementClass, more_info, 'onclick-down');
		for(var i=0; i<5; i++){
			callLater(0.0603*i, partial(function(arrow, i){
				setStyle(arrow, {'background-position': ((4-i) * -13) + 'px 0'});
			}, arrow, i));
		}
	}
}

function toggle_compare(more_info, info_block, e){
	if(info_block.style.display != 'block'){
		show_info_block(more_info, info_block);
	} else {
		var arrow = getFirstElementByTagAndClassName('span', null, more_info);
		callLater(0.1, removeElementClass, more_info, 'onclick-down');
		MochiKit.Visual.blindUp(info_block, {duration: 0.3,
							 afterFinish: partial(removeElementClass, more_info, 'down')
							});
		for(var i=0; i<5; i++){
			callLater(0.0612*i, partial(function(arrow, i){
				setStyle(arrow, {'background-position': ((i+1) * -13) + 'px 0'});
			}, arrow, i));
		}
	}
}

var once_x = connect(window, 'onDOMcheckpoint', function(e){
	disconnect(once_x); // allow a page to signal early, 2nd time around nothing happens

	connectEach(document.getElementsByTagName('button'), 'onclick', function(e){
		if (hasElementClass(e.src(), 'submit') && e.src().form) {
			callLater(0.4, partial(function(button) {
				// Don't disable immediately as that blocks form submission
				button.disabled = true;
			}, e.src()));
		}
	});

	forEach(getElementsByTagAndClassName(null, 'js-link'), function(js_link) {
		addElementClass(js_link, 'js-link-enabled');
	});

	var pwd_label = $$('#left-login-form label[for=password]')[0];
	if(pwd_label){
		addElementClass(pwd_label.parentNode, 'js-float');
		pwd_label.innerHTML = pwd_label.innerHTML.toLowerCase().replace(':', '');
		connect('password', 'onkeydown', function(e){
			hideElement(pwd_label);
		});
		connect('password', 'onfocus', function(e){
			hideElement(pwd_label);
		});
		function showHidePassword(){
			if(getElement('password').value == ''){
				showElement(pwd_label);
			} else {
				hideElement(pwd_label);
			}
		}
		connect('password', 'onblur', showHidePassword);
		// Delay checking the password contents as e.g. chrome doesn't insert saved passwords until after DOMload
		connect(window, 'onload', function(e){
			callLater(0.2, showHidePassword);
		});
	}
	if(getElement('username')){
		var uname_label = $$('#left-login-form label[for=username]')[0];
		var focus_success = true;
		try{
			getElement('username').focus();
		} catch (exc){
			// IE6 fails here
			hideElement(uname_label);
			setNodeAttribute('username', 'placeholder', uname_label.innerHTML.toLowerCase().replace(':', ''));
			focus_success = false;
		}
		if(focus_success){
			addElementClass(uname_label.parentNode, 'js-float');
			uname_label.innerHTML = uname_label.innerHTML.toLowerCase().replace(':', '');
			connect('username', 'onkeydown', function(e){
				hideElement(uname_label);
			});
			connect('username', 'onfocus', function(e){
				hideElement(uname_label);
			});
			function showHideUsername(){
				if(getElement('username').value == ''){
					showElement(uname_label);
				} else {
					hideElement(uname_label);
				}
			}
			connect('username', 'onblur', showHideUsername);
			// Delay checking the username contents as e.g. chrome doesn't insert saved usernames until after DOMload
			connect(window, 'onload', function(e){
				callLater(0.2, showHideUsername);
			});
		}
	} else if (getElement('username2')) {
		getElement('username2').focus();
		callLater(0.1, function(){
			if(getElement('username2').value != ''){
				getElement('password2').focus();
			}
		});
	}

	if (getElement('hide-rhs-tabs')) {
		connect('hide-rhs-tabs', 'onclick', function(e){
			var req = doSimplePostXMLHttpRequest('/set-rhs-tabs/', [['setting'], [e.src().checked]]);
			req.addCallbacks(function(response){
				if (e.src().checked) {
					addElementClass(document.body, 'hide-rhs-tabs');
				} else {
					removeElementClass(document.body, 'hide-rhs-tabs');
				}
			}, function(response){
				var fc = formContents('feedback-form');
				var err_report = 'set rhs tabs (common.mochikit.js): ' + " \n" + response;
				try {
					err_report += 'request status: '+ response.number + " \n";
				} catch (e) {
				}
				fc[1][findValue(fc[0], 'feedback')] = err_report;
				doSimplePostXMLHttpRequest('/feedback/', fc);
			});
		});
	}

	connectEach($$('h1 a.refresh'), 'onclick', function(e){
		var refreshLink = e.src();
		var refreshImg = getFirstElementByTagAndClassName('span', 'refresh', refreshLink);
		function animate(){
			addElementClass(refreshImg, 'running');
			for(var i=0; i<12; i++){
				callLater(0.05*(i+1), setStyle, refreshImg, {'background-position': '-'+i*20+'px 0'});
			}
			callLater(0.05*12, animate);
		}
		if(!hasElementClass(refreshImg, 'running')){
			animate();
		}
	});

	forEach(concat($$('.nav a.refresh'), $$('#menu a.refresh')), function(refreshLink){
		var refreshCx = connect(refreshLink, 'onclick', function(e){
			var refreshImg = getFirstElementByTagAndClassName('span', 'refresh', refreshLink);
			function animate(){
				addElementClass(refreshImg, 'running');
				for(var i=0; i<12; i++){
					callLater(0.05*(i+1), setStyle, refreshImg, {'background-position': '-'+i*13+'px 0'});
				}
				callLater(0.05*12, animate);
			}
			e.stop();
			disconnect(refreshCx);
			animate();
			// Paradox: Displaying the animation makes the UI appear faster, while the actual page loading is delayed by a tenth of a second
			callLater(0.2, function(){ document.location = refreshLink.href });
		});
	});

	if(getElementsByTagAndClassName(null, 'banner').length > 0){
		// This block is only needed for [lte IE7] when there is a banner present
		// That browser somehow miscomputes the width of #nav resulting in only 1 tab being displayed
		// (Including it without a browser check so that bugs will be found earlier)
		var set_nav_width = 0;
		forEach(getElementsByTagAndClassName('li', null, 'nav'), function(nav_li){
			set_nav_width += getElementDimensions(nav_li).w + 5;
		});
		setElementDimensions('nav', {w: set_nav_width});
	}

	connectEach(getElementsByTagAndClassName(null, 'submit-feedback'), 'onclick', function(e){
		var s_width = getFirstElementByTagAndClassName(null, 'width', e.src().form);
		var s_height = getFirstElementByTagAndClassName(null, 'height', e.src().form);
		setNodeAttribute(s_width, 'value', screen.width);
		setNodeAttribute(s_height, 'value', screen.height);
		// recalculate when they actually submit the page
		var v_width = getFirstElementByTagAndClassName(null, 'v_width', e.src().form);
		var v_height = getFirstElementByTagAndClassName(null, 'v_height', e.src().form);
		setNodeAttribute(v_width, 'value', getViewportDimensions().w);
		setNodeAttribute(v_height, 'value', getViewportDimensions().h);
		var req = postJSONDocPHP('/feedback/', formContents(e.src().form));
		var feedback_form = e.src().form;
		addElementClass(feedback_form.parentNode, 'feedback-submitted');
		removeElementClass(feedback_form.parentNode, 'feedback-error');
		removeElementClass(feedback_form.parentNode, 'feedback-success');
		req.addCallback(function(res) {
			if (res.success) {
				addElementClass(feedback_form.parentNode, 'feedback-success');
				removeElementClass(feedback_form.parentNode, 'feedback-error');
				var feedback_textarea = getFirstElementByTagAndClassName(null, 'feedback-textarea', feedback_form.parentNode);
				getElement(feedback_textarea).value = '';
			} else {
				getFirstElementByTagAndClassName(null, 'feedback-thanks-text', feedback_form.parentNode).innerHTML = res.error;
				addElementClass(feedback_form.parentNode, 'feedback-error');
				removeElementClass(feedback_form.parentNode, 'feedback-success');
			}
		});
	});

	if(getElement('language-switcher')){
		connect('language-switcher', 'onclick', function(e){
			var container = getElement('language-dropdown');
			e.stop();
			addElementClass(container, 'open');
			var ds = connect(document, 'onclick', function(){
				disconnect(ds);
				removeElementClass(container, 'open');
			});
		});
	}

	connectEach(getElementsByTagAndClassName(null, 'social-link'), 'onclick', function(e){
		if(getNodeAttribute(e.src(), 'target')=='_blank'){
			e.stop();
			var social_win = window.open(e.src().href, 'name', 'height=300,width=520,top=140,left=280');
			if(window.focus){
				social_win.focus();
			}
		}
	});

	forEach(getElementsByTagAndClassName(null, 'feedback-dialog'), function(feedback_dialog){
		var feedback_thanks = getFirstElementByTagAndClassName(null, 'feedback-thanks', feedback_dialog);
		var feedback_form = getFirstElementByTagAndClassName(null, 'feedback-form', feedback_dialog);
		connectEach(getElementsByTagAndClassName(null, 'modal-close', feedback_dialog), 'onclick', function(e){
			e.stop();
			MochiKit.Visual.slideUp(feedback_dialog, {duration: 0.28, direction: "center"});
			MochiKit.Visual.fade('overlay', {duration: 0.28});
			removeElementClass(feedback_form.parentNode, 'feedback-submitted');
			removeElementClass(feedback_form.parentNode, 'feedback-error');
			removeElementClass(feedback_form.parentNode, 'feedback-success');
		});
	});

	forEach(getElementsByTagAndClassName(null, 'tabs'), function (tab){
		var tab_heads = findChildElements(tab, ['.tab-head li']);
		var tab_blocks = getElementsByTagAndClassName(null, 'tab-block', tab);
		//setStyle(tab, {'min-height': getElementDimensions(tab).h + 'px'});
		/*			var tab_block = findChildElements(tab, ['.tab-blocks'])[0];
		for(var i=0; i<tab_heads.length; i++){
			connect(tab_heads[i], 'onclick', partial(function(pos, e){
				   setStyle(tab_block, { left: (-pos * 100)+'%'});
				}, i));
		}
		return;*/
		forEach(zip(tab_heads, tab_blocks), function(head_block){
			function selectBlock(){
				var prevHeight = getElementDimensions(tab).h;
				forEach(tab_heads, function(head){
					removeElementClass(head, 'selected');
				});
				addElementClass(head_block[0], 'selected');
				forEach(tab_blocks, function(block){
					removeElementClass(block, 'selected');
				});
				addElementClass(head_block[1], 'selected');
				if(prevHeight > getElementDimensions(tab).h){
					setStyle(tab, {'min-height': prevHeight + 'px'});
				}
			}
			var radios = findChildElements(head_block[0], ['input']);
			if(radios.length > 0 && radios[0].checked){
				selectBlock();
			}
			connect(head_block[0], 'onclick', selectBlock);
		});
	});


	// transfer username to forgot-password page
	connectEach(getElementsByTagAndClassName('a', 'forgot-password-link'), 'onclick', function(e){
		var found = false;
		forEach(document.getElementsByName('form_user'), function(userinput){
			if(userinput.value != '' && userinput.value != 'username'){
				found = userinput.value;
				return;
			}});
		if(found){
			document.location = getNodeAttribute(e.src(), 'href') + '?u=' + found;
			e.stop();
		}
	});

});
connect(window, 'onDOMload', function(e){
	forEach(zip(getElementsByTagAndClassName(null, 'more-info'), getElementsByTagAndClassName(null, 'info-block')), function(more_block) {
		connect(more_block[0], 'onclick', partial(toggle_compare, more_block[0], more_block[1]));
		if (hasElementClass(more_block[0], 'open')) {
			toggle_compare(more_block[0], more_block[1]);
		}
	});
	if(getElement('feedback-footer-link')){
		connect('feedback-footer-link', 'onclick', function(e){ showPopup(e, 'feedback-dialog')} );
	}
	if(getElement('feedback-msg-link')){
		connect('feedback-msg-link', 'onclick', function(e){ showPopup(e, 'feedback-dialog')} );
	}

	connectEach(getElementsByTagAndClassName('input', 'check-all'), 'onclick', function(e){
		var checked = e.src().checked;
		var thead = getFirstParentByTagAndClassName(e.src(), 'thead');
		var tbody = thead.nextSibling;
		forEach(getElementsByTagAndClassName('input', 'check-all-item', tbody), function(other_cb){
			other_cb.checked = checked;
		});
	});

	forEach(getElementsByTagAndClassName('form'), function(form_el){
		if (getNodeAttribute(form_el, 'data-confirm')) {
			connect(form_el, 'onsubmit', function(e){
				var go_ahead = window.confirm(getNodeAttribute(form_el, 'data-confirm'));
				if (!go_ahead) {
					e.stop();
				}
			});
		}
	});

	connectEach(getElementsByTagAndClassName('input', 'hide-check'), 'onclick', function(e){
		var cb = e.src();
		var showHideReq = doSimplePostXMLHttpRequest('/set-group-hidden/', [['group_id', 'hide'], [cb.name.substring(11) , cb.checked]]);
		showHideReq.addCallback(function(result){
			if(result.responseText == '1'){
				var thead = getFirstParentByTagAndClassName(cb, 'thead');
				toggleElementClass('hidden-group', thead);
				if(cb.checked){
					setNodeAttribute(cb, 'data-checked', 'checked');
				} else {
					setNodeAttribute(cb, 'data-checked', '');
				}
				var tbody = thead.nextSibling;
				if (tbody) {
					toggleElementClass('hidden-group', tbody);
				}
			}
		});
	});

	if (getElement('finish-grouping')) {
		connect('finish-grouping', 'onclick', function(e){
			var any_checked = false;
				var any_hidden_changed = false;
			forEach(getElementsByTagAndClassName('input', 'project-check'), function(cb){
				if(cb.checked){
					any_checked = true;
				}
			});
			forEach(getElementsByTagAndClassName('input', 'hide-check'), function(cb){
				if(cb.checked != (getNodeAttribute(cb, 'data-checked') == 'checked')){
					any_hidden_changed = true;
				}
			});

			if (any_hidden_changed || (any_checked && MochiKit.Format.strip(getElement('group_name').value) != '')) {
				e.stop();
				getElement('group_name').form.action = '/?organize&finish';
				getElement('group_name').form.submit();
			}
		});
		connectEach(getElementsByTagAndClassName('a', 'link', 'paging-bottom'), 'onclick', function(e){
			var paging_link = e.src();
			forEach(getElementsByTagAndClassName('input', 'project-check'), function(cb){
				if(cb.checked){
					paging_link.href += '&'+cb.name+'=on';
				}
			});
		});
	}

	connectEach(getElementsByTagAndClassName('input', 'go-directly-page'), 'onkeydown', function(e){
		// Auto resize the input textbox
		var w = getStyle(e.src(), 'width');
		if(w.slice(0, w.length-2) < e.src().value.length+2){
			setStyle(e.src(), {width: 2+(3*e.src().value.length/6) + 'em'});
		}
	});
	connectEach(getElementsByTagAndClassName('input', 'go-directly-page'), 'onkeyup', function(e){
		if(e.key().string == 'KEY_ENTER'){
			document.location = getNodeAttribute(e.src(), 'data-urllink') + "=" + (Math.min(parseInt(e.src().value, 10)-1, parseInt(getNodeAttribute(e.src(), 'data-maxpage'), 10)) * getNodeAttribute(e.src(), 'data-perpage'));
		}
	});
	connectEach(getElementsByTagAndClassName('input', 'go-directly-date'), 'onkeyup', function(e){
		if(e.key().string == 'KEY_ENTER'){
			var max_d = ''+Math.max(parseInt(e.src().value.replace(/-/g, ''), 10), parseInt(getNodeAttribute(e.src(), 'data-maxdate').replace(/-/g, ''), 10)-1);
			document.location = getNodeAttribute(e.src(), 'data-urllink') + "=" + max_d.substring(0, 4)+'-'+max_d.substring(4, 6)+'-'+max_d.substring(6, 8);
		}
	});

	var textSels = concat(getElementsByTagAndClassName('label'), getElementsByTagAndClassName('div', 'more-info'), getElementsByTagAndClassName('div', 'info-block'));
	// tooltips within labels shouldn't check checkboxes
	connectEach(textSels, 'onclick', function(e){
		if (hasElementClass(e.target(), 'tooltip')) {
			e.stop();
		}
	});

	connect(document, 'onmousedown', function(e){
		if (hasElementClass(e.target(), 'button-left') || hasElementClass(e.target(), 'button-right')) {
			e.preventDefault(); // Stop firefox dragging of background images
			var button = e.target();
			addElementClass(button, 'mousedown');
				var ident = connect(document, 'onmouseup', function(e){
					removeElementClass(button, 'mousedown');
					disconnect(ident);
				});
		}
	});

	// Close button on messages
	connectEach($$('.message .remove'), 'onclick', function(e){
		var message = getFirstParentByTagAndClassName(e.src(), null, 'message');
		MochiKit.Visual.blindUp(message, { duration: 0.3});
		if(hasElementClass(message, 'permanent')){
			var xxx = doSimplePostXMLHttpRequest('/dismiss-message/', {'msg_id': message.id});
			xxx.addErrback(function(response){
				var xxx2 = doSimplePostXMLHttpRequest('/dismiss-message/', {'msg_id': message.id});
				xxx2.addErrback(function(response){
					// Want to find out why this fails
					var fc = formContents('feedback-form');
					var err_report = 'Automated (common.mochikit.js - 2nd attempt): ' + response + " \n" ;
					err_report += 'msg_id: ' + message.id + " \n";
					try {
						err_report += 'request status: '+ response.number + " \n";
					} catch (e) {
					}
					try {
						err_report += 'request responseText: '+ response.responseText + " \n";
					} catch (e) {
					}
					try {
						err_report += 'req channel: '+ response.req.channel + " \n";
					} catch (e) {
					}
					fc[1][findValue(fc[0], 'feedback')] = err_report;
					doSimplePostXMLHttpRequest('/feedback/', fc);
				});
			});
		}
	});

});

/* remove debugging output that messes up json parsing */
function evalJSONRequestWithoutVarDump(req) {
	var res_lines = req.responseText.split('\n');
	var json_content_started = false;
	var filteredResponseText = '';
	for (var i=0; i<res_lines.length; i++) {
		if (json_content_started) {
			filteredResponseText += '\n' + res_lines[i];
		} else if (MochiKit.Format.strip(res_lines[i])[0] == '{') {
			json_content_started = true;
			filteredResponseText += res_lines[i];
		}
	}
	return MochiKit.Base.evalJSON(filteredResponseText);
}

/*
  loadJSONDocPHP('.');
  loadJSONDocPHP('?x=y');
  loadJSONDocPHP('/path/');
  etc.
  */
function loadJSONDocPHP(relativeOrAbsUrlorQs, qs) {

	let url = new URL(relativeOrAbsUrlorQs, document.location.href);  // does the right thing with both a relative or an absolute url.

	if (url.searchParams === undefined) {
		// PhantomJS - provide dummies (chart rendering doesn't appear to use this functionality)
		url.searchParams = {
			has: function() {return false},
			set: function() {}
		};
	}

	if (qs !== undefined) {
		for (let qsp in qs) {
			// overwrite with anything explicit
			url.searchParams.set(qsp, qs[qsp]);
		}
	}
	if (document.location.search.length && window.location.origin === url.origin) {
		// pull in existing things present in the url like PHPSESSID, but only if not explicitly set in qs
		let locqs = parseQueryString(document.location.search.substring(1));
		for (let qsp in locqs) {
			if (!url.searchParams.has(qsp)) {
				url.searchParams.set(qsp, locqs[qsp]);
			}
		}
	}
	if (getElement('php-sess-id')) {
		// probably redundant
		var tmp = getElement('php-sess-id').value.split('=');
		url.searchParams.set(tmp[0], tmp[1]);
	}
	var d = MochiKit.Async.doXHR(url.href, {
		'mimeType': 'text/plain',
		'headers': [['Accept', 'application/json']]
	});
	return d.addCallback(evalJSONRequestWithoutVarDump);
}

function postJSONDocPHP(url/*, ...*/) {
	var req = getXMLHttpRequest();
	if (startsWith('/', '' + url)) {
		url = window.location.origin + url
	}
	req.open("POST", url, true);
	var requestHeaders =
		['X-Requested-With', 'XMLHttpRequest',
		 'X-MochiKit-Version', MochiKit.Async.VERSION,
		 'Accept', 'text/json',
		 'Content-type', 'application/x-www-form-urlencoded'];
	for (var i = 0; i < requestHeaders.length; i += 2) {
		req.setRequestHeader(requestHeaders[i],
							 requestHeaders[i+1]);
	}
	if (arguments.length > 1) {
			var m = MochiKit.Base;
			var qs = m.queryString.apply(null, m.extend(null, arguments, 1));
	}
	var d = sendXMLHttpRequest(req, qs);
	return d.addCallback(evalJSONRequestWithoutVarDump);
}


function doSimplePostXMLHttpRequest(url/*, ...*/) {
	var self = MochiKit.Async;
	var req = self.getXMLHttpRequest();
	if (arguments.length > 1) {
		var m = MochiKit.Base;
		var qs = m.queryString.apply(null, m.extend(null, arguments, 1));
	} else {
		var qs = '';
	}
	if (startsWith('/', '' + url)) {
		url = window.location.origin + url
	}
	if (getElement('php-sess-id')) {
		if (qs.length) {
			qs += '&';
		}
		qs += getElement('php-sess-id').value;
	}
	req.open("POST", url, true);
	//taken from prototype, pretty much verbatim
	var requestHeaders =
	['X-Requested-With', 'XMLHttpRequest',
	 'X-MochiKit-Version', MochiKit.Async.VERSION,
	 'Accept', 'text/javascript, text/html, application/xml, text/xml, */*',
	 'Content-type', 'application/x-www-form-urlencoded'];
	for (var i = 0; i < requestHeaders.length; i += 2) {
		req.setRequestHeader(requestHeaders[i],
							 requestHeaders[i+1]);
	}

	return self.sendXMLHttpRequest(req, qs);
}


/* definitions */
var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
var longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var shortDays = [ 'Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
var longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var american = false;

function ordered_day_month(d){
	if(!american){
	// Rest of World
	return d.getDate() + ' ' + shortMonths[d.getMonth()];
	} else {
	return shortMonths[d.getMonth()] + ' ' + d.getDate();
	}
}

function validateEmail(target){
	if(target.value.match(/.+@.+\..+/)){
		var other_emails = getElementsByTagAndClassName(null, 'email-address', target.parentNode.parentNode);
		for(var i=0; i<other_emails.length; i++){
			if(other_emails[i].innerHTML == target.value){
				Highlight(other_emails[i], {'startcolor': '#22bb22'});
				return true;
			}
		}
		return true;
	} else {
		//Highlight(target, {'startcolor': '#ff7777'});
			var startColor = MochiKit.Color.Color.fromComputedStyle(target, 'border-top-color').toHexString();
		setStyle(target, {'border': '1px solid #ff7777'});
		//callLater(0.4, setStyle, target, {'border': '1px solid #ff7777'});
		Morph(target, {style: {'border-color': '#7F9DB9' }});
		return false;
	}
}

function setArrowPosition(arrow, pos){
	setStyle(arrow, {'background-position': pos+'px 0'});
}
// DOM observer
// based on https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
var observeDOM = (function() {
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
		eventListenerSupported = window.addEventListener;

	return function(obj, callback) {
		if (MutationObserver){
			var obs = new MutationObserver( function(mutations, observer) {
				if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
					callback();
			});
			obs.observe(obj, { childList:true, subtree:true });
		}
		else if (eventListenerSupported) {
			obj.addEventListener('DOMNodeInserted', callback, false);
			obj.addEventListener('DOMNodeRemoved', callback, false);
		}
	};
})();

// for show/hide ad blocked banner
function toggleAdBlockedBanner(ad_position_class, visible) {
	var ad_block_banner = getElement(ad_position_class); // each ad banner position e.g. with class .top-banner has a corresponding <aside id="top-banner">
	if (ad_block_banner) {
		setStyle(ad_block_banner, {'display': (visible ? 'block' :'none')});
	}
};

//<<-- for ad blocked notifications -- START
connect(window, "onload", function(){
	var ad_children_count = 0;
	var ad_active = false;
	var not_relevant_children_count = 0;
	var relevant_children_count = 0;
	var ad_snigel = false;
	var ad_fired = false;
	var ad_containers = getElementsByTagAndClassName('div', 'sc-ad-container', document);
	forEach(ad_containers, function(elem) {
		observeDOM(elem ,function(){
			var ad_position_class = elem.parentNode.className;
			toggleAdBlockedBanner(ad_position_class, false);
			ad_active = true;
			ad_fired = true;
		});
	});
	forEach(ad_containers, function(elem) {
		var ad_position_class = elem.parentNode.className;
		forEach(elem.childNodes, function (child) {
			ad_children_count++;
			if (typeOf(child) === 'text' || typeOf(child) === 'comment') {
				not_relevant_children_count++;
			} else if (typeOf(child) === 'htmliframeelement'){
				ad_active = true;
				relevant_children_count++;
			} else if (child.className === 'ad-snigel'){
				ad_snigel = true;
			} else {
				relevant_children_count++;
			}
			if(typeOf(child) === 'htmldivelement') {
				if (child.id.indexOf("google_ads") > 0 || child.hasAttribute("data-google-query-id")) {
					ad_active = true;
				}
			}
		});

		//WE DO SPEC 4 RELEVANT ELEMENTS OR AT LEAST NONE IFRAMES INTO THE AD CONTAINER WHEN AN AD BLOCKER HAS BEEN blocking the ads (snigel provider)
		if (!ad_active && (relevant_children_count <= 4 || (ad_snigel && relevant_children_count <= 2))) {
			var ad_blocked_banner = getElement(ad_position_class);
			if (ad_blocked_banner) {
				//we have to slow down the toggle waiting for some change from the elem observer
				callLater(3, function() {
					if (!ad_fired)
						toggleAdBlockedBanner(ad_position_class, true);
				});
				appendChildNodes(getFirstElementByTagAndClassName('div', ad_position_class, document), ad_blocked_banner);
				ad_children_count = 0;
			}
		}
	});
	//this is the workaround to detect ads blocked on the new app design with google ads
	if (!ad_snigel || !ad_active) {
		if (!ad_active) {
			forEach(ad_containers, function(elem) {
				var ad_position_class = elem.parentNode.className;
				var ad_blocked_banner = getElement(ad_position_class);
				if (ad_blocked_banner) {
					forEach(elem.childNodes, function (child) {
						if(typeOf(child) === 'htmldivelement') {
							if (child.id.indexOf("google_ads") === 0 || !(child.hasAttribute("data-google-query-id"))) {
								// we toggle the ad blocked banner with a little of delay as sometimes ads take time to be in the DOM.
								callLater(3, function() {
									if (!ad_fired)
										toggleAdBlockedBanner(ad_position_class, true);
								});
							}
						}
					});
				}
			});
		}
	}
	//for ad blocked notifications -->> END

	forEach(concat($$('form button.submit .rarr-rotate'), $$('form button.submit .refresh-rotate')), function(buttonImg){
		var button = getFirstParentByTagAndClassName(buttonImg, 'button', 'submit');
		if(hasElementClass(buttonImg, 'small')){
			var width = 13;
		} else {
			var width = 20;
		}
		var checkform = button.form;
		var checkform_clicked = false;
		connect(checkform, 'onsubmit', function(e){
			if(checkform_clicked){
				e.preventDefault();
				return;
			}
			checkform_clicked = true;
			function animate(){
				buttonImg.running = true;
				for(var i=0; i<12; i++){
					callLater(0.07*(i+1), setStyle, buttonImg, {'background-position': '-'+i*width+'px 0'});
				}
				callLater(0.07*12, animate);
			}
			if(!buttonImg.running){
				animate();
			}
		});
	});
});

function highlight(id){
	forEach($$('.hash-highlight'), function(hh){
		removeElementClass(hh, 'hash-highlight');
	});
	if(document.getElementById(id) != null) {
		addElementClass(document.getElementById(id).parentNode, 'hash-highlight');
	}
}

function labelVisibility(id, visibility) {
	var tags = document.getElementsByTagName('label').length;
	for(var i=0; i < tags; i++) {
		if (document.getElementsByTagName('label').item(i).innerHTML.indexOf(id) != -1) {
			document.getElementsByTagName('label').item(i).style.visibility=visibility;
		}
	}
}

function startsWith(substr, str) {
	return str != null && substr != null && str.indexOf(substr) == 0;
}

function endsWith(substr, str) {
	return str != null && substr != null && str.indexOf(substr) == str.length-substr.length;
}
//similar to JQuery.type
function typeOf (obj) {
	return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}

// for tabbed panels
function verticalTabClicked(clicked_id) {
	var i;
	// hide all elements with class tab_content
	var tabContentElements = document.getElementsByClassName("tab_content");
	for (i = 0; i < tabContentElements.length; i++) {
		if(tabContentElements[i].parentElement == document.getElementById(clicked_id).parentElement) {
			tabContentElements[i].style.display = 'none';
		}
	}

	// remove class active from all elements with class tab
	var tabElements = document.getElementsByClassName("tab");
	for (i = 0; i < tabElements.length; i++) {
		if(tabElements[i].parentElement.id == document.getElementById(clicked_id).parentElement.id) {
			tabElements[i].className = tabElements[i].className.replace(' active', '');
		}
	}

	// show element with id = this.id+'_content'
	document.getElementById(clicked_id+'_content').style.display = 'block';

	// add class active to this
	document.getElementById(clicked_id).className += " active";
}