// MochiKit-based ComboBox
// Cobbled together from bits and pieces of:
//   ComboBox by Eric Waldheim
//   ComboBox By Jared Nuzzolillo
//   ComboBox Updated by Erik Arvidsson
//   DHTML Widgets by Barney Boisvert
//   Dojo ComboBox

if (typeof(StatCounter) == 'undefined'){
    StatCounter = {};
}

StatCounter.ComboBox = function(id_or_el, options){
    this.__init__(id_or_el, options);
};

StatCounter.ComboBox.prototype = {
    __class__: StatCounter.ComboBox,

    __init__: function(id_or_el, /* optional */config){
        //        this.node = getElement(id_or_el);
        this.exposed_options = [];
        this.total_options = 0;

        this.config = MochiKit.Base.update({
            maxListLength: 22,
            options:[],
            display_hidden_value: false,
            bias_list_selection: true,
            click_to_show_dropdown: false,
            strip_parenthesis: false,
            match_from_start_only: false,
            optionStringGetter: function(item){ return item }
        },
                                           config || {});
        this.textedit = getElement(id_or_el); //INPUT({type:'text', 'class':"cbox-input"});
        setNodeAttribute(this.textedit, 'autocomplete', 'off');

        if (this.config.permaOptions) {
            // dropdown button not needed
            var button = null;
        } else {
            if (getElementDimensions(this.textedit).h > 23){
                var button = getElement('dropdown-arrow-long').cloneNode(true);
            } else {
                var button = getElement('dropdown-arrow').cloneNode(true);
            }
            removeNodeAttribute(button, 'id');
            setStyle(button, {display: 'inline'});
        }
        this.optionslist = DIV({'class':'cbox-list'});
        if (!this.config.permaOptions) {
            addElementClass(this.optionslist, 'hidden');
        }
        this.optionValueMap = {};

        this.nestedMap = {};
        this.expanded = {};

        this.search_status = {};

        if (document.getElementById(id_or_el)) {
            this.hidden = getElement(id_or_el+'_hidden');
        } else if (id_or_el.id) {
            this.hidden = getElement(id_or_el.id+'_hidden');
        } else {
            this.hidden = undefined;
        }
        this.selectedValue = "";

        if(!this.hidden){
            this.hidden = INPUT({'type':'hidden', 'name': this.textedit.name+'_hidden'});
            if (this.textedit.id) {
                this.hidden.id = this.textedit.id + '_hidden';
            }
            insertSiblingNodesAfter(this.textedit, this.hidden);
        }
        //    var mydiv = DIV({style: {color: 'red'}}, 'test');
        //    connect(mydiv, "onclick", function(e){ alert(e.src().innerHTML); });

        var cbox_container_classes = 'cbox-container';
        if (this.textedit.disabled) {
            cbox_container_classes = 'cbox-container disabled';
        }
        this.cbox_container = DIV({'class': cbox_container_classes});
        insertSiblingNodesAfter(this.textedit, this.cbox_container);
        appendChildNodes(this.cbox_container, this.textedit, button, this.optionslist);

        //    connect(this.optionslist, "onselectstart", function(){return false});
        var IE6 = false /*@cc_on || @_jscript_version < 5.7 @*/;
        if(IE6){
            connect(this.optionslist, "onmouseover", bind(this.highlightOption, this));
        }
        //    connect(this.optionslist, "onmouseover", bind(this.clickOption, this));
        connect(this.optionslist, "onclick", bind(this.clickOption, this));
        connect(this.textedit, "onkeydown", bind(this.keyDown, this));
        var keyUp = bind(this.keyUp, this);
        connect(this.textedit, "onkeyup", keyUp);
        connect(this.textedit, "onpaste", function(e) {
            // why delay? new value doesn't update immediately on paste in FF
            callLater(0.01, partial(keyUp, e));
        });

        this._prevTexteditValue = this.textedit.value;
        connect(this.textedit, "onclick", function(e) {
            // this one is specifically for a click on the -webkit-search-cancel-button
            callLater(0.01, partial(keyUp, e));
        });
        //    connect(this.textedit, "onblur",  partial(makeInvisible, this.optionslist));

        if (!this.config.permaOptions) {
            connect(document, "onmousedown", bind(this.documentMouseDown, this));
        }
        connect(this.optionslist, "onmousedown", this.preventBlur);

        if (button) {
            connect(button, "onfocus", function () { button.blur(); });
            connect(button, 'onclick', bind(this.toggle, this));
            connect(button, "onmousedown", this.preventBlur);
        }

        this.build(this.config.options);
    },

    preventBlur: function(e){
        // Don't fire the blur event
      //  e.stopPropagation();
    },

    documentMouseDown: function(e){
        if(!hasElementClass(this.optionslist, 'hidden') && !isChildNode(e.target(), this.cbox_container)){
            addElementClass(this.optionslist, 'hidden');
            disconnect(this.scroll_cx);
            disconnect(this.resize_cx);
            e.stop()
        }
    },

    keyDown: function(e){
        switch(e.key().code) {
          case 33: // pageup
            if (hasElementClass(this.optionslist, 'hidden')){
                this.toggle();
                if(this._highlighted_node){
                    this.focusOptionNode(this._highlighted_node);
                } else if (this.exposed_options.length > 0){
                    this.focusOptionNode(this.exposed_options[0]);
                }
            } else {
                if (this._highlighted_node){
                    var hl_i = findIdentical(this.exposed_options, this._highlighted_node);
                    var jump = parseInt(getElementDimensions(this.optionslist).h / getElementDimensions(this.exposed_options[0]).h)-1;
                    if(hl_i !== -1){
                        var toh = Math.max(0, hl_i-jump);
                        this.focusOptionNode(this.exposed_options[toh]);
                    }
                }
                e.stopPropagation();
            }
            break;
          case 34: // pagedown
            if (hasElementClass(this.optionslist, 'hidden')){
                this.toggle();
                if(this._highlighted_node){
                    this.focusOptionNode(this._highlighted_node);
                } else if (this.exposed_options.length > 0){
                    this.focusOptionNode(this.exposed_options[0]);
                }
            } else {
                if (this._highlighted_node){
                    var hl_i = findIdentical(this.exposed_options, this._highlighted_node);
                    var jump = parseInt(getElementDimensions(this.optionslist).h / getElementDimensions(this.exposed_options[0]).h)-1;
                    if(hl_i !== -1){
                        var toh = Math.min(this.exposed_options.length-1, hl_i+jump);
                        this.focusOptionNode(this.exposed_options[toh]);
                    }
                }
                e.stopPropagation();
            }
            break;
          case 38: // up arrow
            if (hasElementClass(this.optionslist, 'hidden')){
                this.toggle();
                if(this._highlighted_node){
                    this.focusOptionNode(this._highlighted_node);
                } else if (this.exposed_options.length > 0){
                    this.focusOptionNode(this.exposed_options[0]);
                }
            } else {
                if (this._highlighted_node){
                    var hl_i = findIdentical(this.exposed_options, this._highlighted_node);
                    if(hl_i !== -1 && hl_i !== 0){
                        this.focusOptionNode(this.exposed_options[hl_i-1]);
                    }
                }
                e.stop();
            }
            break;
          case 40: // down arrow
            if (hasElementClass(this.optionslist, 'hidden')){
                this.toggle();
                if(this._highlighted_node){
                    this.focusOptionNode(this._highlighted_node);
                } else if (this.exposed_options.length > 0){
                    this.focusOptionNode(this.exposed_options[0]);
                }
            } else {
                 if (((!this._highlighted_node) || !this._highlighted_node.parentNode) &&
                     this.exposed_options.length > 0){
                    // wrap
                    this.focusOptionNode(this.exposed_options[0]);
                } else if (this._highlighted_node){
                    var hl_i = findIdentical(this.exposed_options, this._highlighted_node);
                    if(hl_i !== -1 && hl_i !== this.exposed_options.length-1){
                        this.focusOptionNode(this.exposed_options[hl_i+1]);
                    }
                }
                //        this._highlighted_node.scrollIntoView(false);
                e.stop();
            }
            break;
          case 27: // escape
            if (!this.config.permaOptions) {
                addElementClass(this.optionslist, 'hidden');
            }
            disconnect(this.scroll_cx);
            disconnect(this.resize_cx);
            e.stopPropagation();
            break;
          case 39: // Right Arrow
          case 9: // KEY_TAB
          case 13: //KEY_ENTER:
            if (!hasElementClass(this.optionslist, 'hidden')){
                if(this._highlighted_node){
                    this.selectOption();
                }
                if (!this.config.permaOptions) {
                    addElementClass(this.optionslist, 'hidden');
                }
                disconnect(this.scroll_cx);
                disconnect(this.resize_cx);
                //e.stop();  // need to allow filtering-inline.jquery.js to detect an enter click; not sure why this was here originally
            }
            signal(this, 'selected');

            // e.stop();
            break;
        }
    },

    keyUp: function(e){
        if (e.key() && e.key().code == 13) {
            // Stop form submission
            e.stop();
        }
        // normalization here should match deep search filtering.js see combobox:changed
        var trimmed_val = this.textedit.value.trim();  // don't normalize with .toLowerCase() as this would lose the special ' OR ' uppercase string  we need to split on
        if (this._prevTexteditValue.toLowerCase() != trimmed_val.toLowerCase()){
            this.filterList();

            if(e.key() && e.key().code == 8 && (this.exposed_options.length == 0 ||
                                     (this.exposed_options.length == 1 &&
                                      (!this.config.create || scrapeText(this.exposed_options[0]).indexOf(this.config.create) == -1)))){
                if (!this.config.permaOptions) {
                    // don't show a single element on a backspace
                    addElementClass(this.optionslist, 'hidden');
                }
                disconnect(this.scroll_cx);
                disconnect(this.resize_cx);
            } else if (!this.config.click_to_show_dropdown) {
                this.showDropdown();
            }
            if (this.textedit.value == '') {
                if (this.config.autoselect) {
                    forEach(getElementsByTagAndClassName(null, 'autoselected', self.optionslist), function(option){
                        removeElementClass(option, 'selected');
                        removeElementClass(option, 'autoselected');
                    });
                }
                signal(this, 'cleared');
            }
            if (typeof jQuery !== 'undefined') {
                jQuery(this.textedit).trigger('combobox:changed');
            }
            signal(this, 'changed');
            this._prevTexteditValue = trimmed_val;
        }
        if(this.selectedValue != this.textedit.value){
            this.hidden.value = "";
            this.hidden.dataset.vals = '';
        }
    },

    selectOption: function(){
        var target = this._highlighted_node;
        if (target) {
            if (!this.config.multi || hasElementClass(this._highlighted_node, 'autocreated')) {
                forEach(getElementsByTagAndClassName(null, 'selected', this.optionslist), function(sel){
                    removeElementClass(sel, 'selected');
                });
            } else {
                forEach(getElementsByTagAndClassName(null, 'autocreated', this.optionslist), function(sel){
                    removeElementClass(sel, 'selected');
                });
            }
            if (!hasElementClass(this.optionslist, 'filtered') && !hasElementClass(target, 'cbox-subitem') && hasElementClass(target.parentNode, 'cbox-nested')) {
                // remove explicit 'selected' items from subitems (including nested another level down) as the entire category is now selected
                forEach(getElementsByTagAndClassName(null, 'cbox-item', target.parentNode), function(other_item){
                    removeElementClass(other_item, 'selected');
                });
            }
            addElementClass(target, 'selected');
            this.updateValues();
            //    var self = this;
            //    signal(this, 'onchange', {src: function(){ return self; }});
            if(!this.config.bias_list_selection){
                this._highlighted_node = null;
            }
        }
    },

    updateValues: function() {
        var hiddenValues = [];
        var selectedValues = [];
        var self = this;
        var selected_items = getElementsByTagAndClassName(null, 'selected', this.optionslist);
        for (var i=0; i<selected_items.length; i++) {
            var sel = selected_items[i];
            if (hasElementClass(sel, 'autocreated') && self.config.match_text) {
                // ignoring this ensures get_filtered_url() picks up the value from the textedit directly
                continue;
            }
            var scraped = scrapeText(sel);
            if (self.config.display_hidden_value && !this.config.multi) {
                selectedValues.push(self.hidden.value);
            } else if (self.config.strip_parenthesis) {
                selectedValues.push(MochiKit.Format.strip(scraped.split('(')[0]));
            } else {
                selectedValues.push(scraped);
            }
            if (sel.dataset.value) {
                if (sel.dataset.value == 'ANY') {
                    hiddenValues = ['ANY'];
                    selectedValues = [selectedValues[-1]];
                    break;
                }
                hiddenValues.push(sel.dataset.value);
            } else if (self.optionValueMap[scraped] != undefined){
                hiddenValues.push(self.optionValueMap[scraped]);
            }
            if (self.config.create) {
                self.selectedValue = self.selectedValue.replace(self.config.create, '');
            }
        }
        this.hidden.value = hiddenValues.join(',');
        this.hidden.dataset.vals = selectedValues.join(',');
        if (!this.config.permaOptions) {
            // perma version, the textedit is search only
            this.selectedValue = selectedValues.join(' OR ');
            this.textedit.value = this.selectedValue;
        }
    },


        /*
    moveCaretToEnd: function(){
    var t = this.textedit;
    if (t.createTextRange) {
        var range = t.createTextRange();
        range.collapse(false);
        range.select();
    } else if (t.setSelectionRange) {
        t.focus();
        var length = t.value.length;
        t.setSelectionRange(length, length);
    }
    },*/

    getAllOptionDivs: function() {
        var all_items = getElementsByTagAndClassName(null, 'cbox-item', this.optionslist);
        for (var k in this.nestedMap) {
            extend(all_items, this.nestedMap[k], 1);
        }
        return all_items;
    },

    filterList: function(){
        if (!this.config.click_to_show_dropdown) {
            removeElementClass(this.optionslist, 'hidden');
        }
        var exposed_options = [];
        var self = this;
        if(MochiKit.Format.strip(self.textedit.value) != ''){
            var sbc = getFirstElementByTagAndClassName(null, 'simplebar-content', this.optionslist);
            if (!sbc) {
                sbc = self.optionslist;
            }

            addElementClass(this.optionslist, 'filtered');
            var value_splits = self.textedit.value.split(/[\s]+OR(?:[\s]+|$)+/g);
            var re_splits = [];
            for (var mv=0; mv<value_splits.length; mv++) {
                var search_val = MochiKit.Format.strip(value_splits[mv]).replace(/([\\\^\$*+[\]?{}.=!:(|)])/g, '\\$1');
                if (this.config.match_from_start_only) {
                    search_val = '^' + search_val;
                }
                re_splits.push(new RegExp(search_val, 'i'));
            }
            var first = true;
            var has_exact_match = false;
            var some_selected = false;
            var dedupe = {};  // duplicates can happen if we copy e.g. the same city under a country or under the region/state

            forEach(this.getAllOptionDivs(), function(option){
                var search_part = getFirstElementByTagAndClassName(null, 'search-only', option);
                if (!search_part) {
                    search_part = option;
                }
                var scrape_part = search_part.cloneNode(true);
                var paren_counts = scrape_part.getElementsByTagName('i');
                if (paren_counts.length) {
                    removeElement(paren_counts[0]);
                }
                var scraped = scrapeText(scrape_part);
                //        var bits = scrapeText(option).toLowerCase().split(/\(|\)|\s+|\//);
                var initials = MochiKit.Base.map(function(word){return word[0];}, MochiKit.Format.strip(scraped.split('(')[0]).split(' ')).join('').toLowerCase()

                var is_match = false;
                var highlight_re = false;
                for (var mv=0; mv<value_splits.length; mv++) {
                    is_match = (scraped.search(re_splits[mv]) !== -1 || startsWith(value_splits[mv].toLowerCase(), initials))
                    if (MochiKit.Format.strip(scraped) == MochiKit.Format.strip(value_splits[mv])){
                        has_exact_match = true;
                    }
                    if (is_match) {
                        highlight_re = re_splits[mv];
                        break;
                    }
                }

                if(self.config.create && scraped.indexOf(self.config.create) !== -1){
                    removeElement(option);
                } else if (self.config.match_text && hasElementClass(option, 'autocreated')) {
                    removeElement(option);
                } else if (!dedupe[scrapeText(option)] && is_match) {
                    if (!option.parentNode) {
                        addElementClass(option, 'filter-only');
                        appendChildNodes(sbc, option);
                    }
                    search_part.innerHTML = search_part.innerHTML.replace(/<\/?b>/g, '');
                    var els = [search_part];
                    while (els.length) {
                        if (els[0].nodeType === 3) {
                            els[0].nodeValue = els[0].nodeValue.replace(highlight_re, '<b>$&</b>');  // search string highlighting
                        } else if (els[0].nodeType === 1) {
                            for (var jj=0; jj<els[0].childNodes.length; jj++) {
                                if (els[0].childNodes[jj].nodeType === 1 && els[0].childNodes[jj].tagName === 'I') {
                                    // don't highlight within the '(N sessions)' section
                                    continue;
                                }
                                els.push(els[0].childNodes[jj]);
                            }
                        }
                        els.shift();
                    }
                    search_part.innerHTML = search_part.innerHTML.replace(/&lt;(\/?)b&gt;/g, '<$1b>');  // we changed nodeValue as we couldn't chang innerText

                    addElementClass(option, 'shown');
                    if (self.config.autoselect) {
                        addElementClass(option, 'selected');
                        addElementClass(option, 'autoselected');
                    }
                    if (hasElementClass(option, 'selected')) {
                        some_selected = true;
                    }
                    exposed_options.push(option);
                    if(first && self.config.bias_list_selection){
                        self.focusOptionNode(option);
                        first = false;
                    }
                    dedupe[scrapeText(option)] = option;
                } else if (dedupe[scrapeText(option)] !== option) {
                    if (option.parentNode) {
                        if (hasElementClass(option, 'filter-only')) {
                            removeElement(option);
                        } else if (hasElementClass(option, 'selected')) {
                            some_selected = true;
                            addElementClass(option, 'shown');
                        } else {
                            removeElementClass(option, 'shown');
                        }
                    }
                }
            });

            if (!has_exact_match && self.config.create) {
                var val_create = self.textedit.value + ' ' + self.config.create;
                var create_option = DIV({'class': 'cbox-item'}, val_create);
                self.optionValueMap[val_create] = self.textedit.value;
                self.valueOptionMap[self.textedit.value] = val_create;
                appendChildNodes(sbc, create_option);
                exposed_options.push(create_option);
                self.focusOptionNode(create_option);
            } else if (self.config.match_text) {
                var val_create = self.config.match_text.replace('%s', self.textedit.value.split(/[\s]+OR(?:[\s]+|$)/).join("' or '"));
                var create_option = DIV({'class': 'cbox-item'}, val_create);
                self.optionValueMap[val_create] = self.textedit.value;
                self.valueOptionMap[self.textedit.value] = val_create;
                var fi = getFirstElementByTagAndClassName(null, 'cbox-item', sbc);
                if (!fi) {
                    appendChildNodes(sbc, create_option);
                } else {
                    insertSiblingNodesBefore(fi, create_option);
                }
                if (!some_selected && self.config.match_text) {
                    addElementClass(create_option, 'selected');
                }
                addElementClass(create_option, 'shown');
                addElementClass(create_option, 'autocreated');
                if (self.config.match_text) {
                    addElementClass(create_option, 'match-item');
                }
                exposed_options.push(create_option);
                self.focusOptionNode(create_option);
                if (!some_selected && !self.config.deep_search) {
                    self.maybeSetNoMatchText();
                }
            }
        } else {
            this.unfilterList();
        }
        self.exposed_options = exposed_options;
        if (exposed_options.length == 1) {
            signal(this, 'single_item');
        }
    },

    unfilterList: function(){
        var exposed_options = [];
        removeElementClass(this.optionslist, 'filtered');
        var self = this;
        forEach(this.getAllOptionDivs(), function(option){
            option.innerHTML = option.innerHTML.replace(/<\/?b>/g, ''); // remove search string highlighting
            if (hasElementClass(option, 'filter-only') && hasElementClass(option, 'selected')) {
                // We've found something by filtering, selected it, and then removed the filter, so now we need to create the hierarchy
                removeElementClass(option, 'filter-only');
                var o = option;
                while (!o.parentNode) {
                    for (var k in self.nestedMap) {
                        if (self.nestedMap[k].indexOf(o) !== -1) {
                            addElementClass(self.nestedMap[k][0], 'has-selected');
                            appendChildNodes.apply(null, self.nestedMap[k]);
                            delete self.nestedMap[k];
                            break;
                        }
                    }
                    o = o.parentNode;
                }
            } else if (hasElementClass(option, 'autocreated') || hasElementClass(option, 'filter-only')) {
                if (option.parentNode) {
                    removeElement(option);
                }
            } else {
                addElementClass(option, 'shown');
            }
            if (hasElementClass(option, 'selected')) {
                option.style.order = '10';
            } else {
                option.style.order = null;
            }
            exposed_options.push(option);
        });
        this.exposed_options = exposed_options;
    },

    _connect_ids: [],
    build: function(options){
        total_options = 0;
        /*while (this._connect_ids.length) {
        disconnect(this._connect_ids.pop());
        }*/
        var cat_indices = {};
        var top_divs = [];
        var self = this;
        var old_optionValueMap = self.optionValueMap;
        var old_highlight_value = null;
        if (this._highlighted_node){
            old_highlight_value = scrapeText(this._highlighted_node);
        }
        self.optionValueMap = {};
        self.valueOptionMap = {};
        for (var i=0; i<options.length; i++) {
            var option = options[i];
            if(option === null){
                top_divs.push(DIV({'class': 'break'}));
            } else {
                if (option instanceof Array) {
                    var option_text = option[1];
                } else {
                    var option_text = option;
                }
                var zero_results = false;
                var paren_i = option_text.lastIndexOf(' (');
                var parenthesized_count = false;
                if (paren_i !== -1 && self.config.separate_parenthesis) {
                    var count_plus_sessions = option_text.slice(paren_i + 1);
                    var m = count_plus_sessions.match(/(\([\d,]+) (.*)(\))/);
                    if (m) {
                        if (m[1] == '(0') {
                            // zero visits - hacky; we should really be passing around the count in a separate field/array-item
                            zero_results = true;
                        }
                        parenthesized_count = createDOM('i', {}, m[1], SPAN({'class': 'session-unit'}, ' ' + m[2]), m[3]);
                    } else {
                        parenthesized_count = createDOM('i', {}, count_plus_sessions);
                    }
                    option_text = option_text.slice(0, paren_i);
                }
                var page_title = false;
                if (option_text.indexOf(' ::: ') !== -1) {
                    page_title = option_text.split(' ::: ')[1];
                    option_text = option_text.split(' ::: ')[0];
                }
                var text_cat = option_text.split(' | ');
                var cat = option_text.substring(option_text.indexOf(' | ') + 3);
                if (self.config.nested && text_cat.length > 1 && cat_indices[cat] !== undefined) {
                    var div = DIV({'class': 'cbox-item cbox-subitem'}, SPAN({'class': 'search-only'}, text_cat[0]));
                    var nested_text = cat.replace(/ \| /g, ', ');
                    if (text_cat[0].indexOf(nested_text) === -1) {
                        appendChildNodes(div, SPAN({'class': 'nested-context'}, ', ' + nested_text));
                    }
                } else {
                    var div = DIV({'class': 'cbox-item'}, option_text);
                }
                if (zero_results) {
                    addElementClass(div, 'zero-results');
                } else {
                    removeElementClass(div, 'zero-results');
                }
                if (parenthesized_count) {
                    appendChildNodes(div, parenthesized_count);
                }
                if (page_title) {
                    appendChildNodes(div, SPAN({'class': 'page-title'}, page_title));
                    addElementClass(div, 'has-page-title');
                }
                if (option instanceof Array) {
                    self.optionValueMap[scrapeText(div)] = option[0];
                    self.valueOptionMap[option[0]] = scrapeText(div);
                    div.dataset.value = option[0];
                } else {
                    self.optionValueMap[scrapeText(div)] = scrapeText(div);
                    self.valueOptionMap[scrapeText(div)] = scrapeText(div);
                }
                if (option[0] != '' &&
                    (this.hidden.value.split(',').indexOf(option[0]) !== -1 ||
                     this.hidden.value.split(',').indexOf(option[0].split('[')[0]) !== -1 ||
                     (this.hidden.dataset.vals && this.hidden.dataset.vals.split(',').indexOf(option[1]) !== -1))) {
                    addElementClass(div, 'selected');
                }
                if (self.config.nested) {
                    if (text_cat.length > 1 && cat_indices[cat] !== undefined) {
                        if (MochiKit.Format.strip(text_cat[0]) !== '') {  // this was previously handled serverside by $prefilterQuery->andWhere('city != \'\'');
                            if (cat_indices[cat] !== true) {
                                // we've got a third level
                                var leaf = self.nestedMap[cat_indices[cat][0]][cat_indices[cat][1]];
                                removeElementClass(leaf, 'cbox-subitem');  // promote to main item in sub category
                                var toggler = DIV({'class': 'toggler'});
                                toggler.dataset.cat = cat;
                                var cat_div = DIV({'class': 'cbox-nested cbox-subitem'}, toggler, leaf);
                                if (self.expanded[cat] !== undefined) {
                                    self.expanded[cat] = cat_div;
                                }
                                self.nestedMap[cat_indices[cat][0]][cat_indices[cat][1]] = cat_div; // replace with category item
                                self.nestedMap[cat] = [cat_div];
                                cat_indices[cat] = true;
                            }
                            addElementClass(div, 'shown');  // 'shown' class would have been added elsewhere
                            if (hasElementClass(div, 'selected')) {
                                addElementClass(self.nestedMap[cat][0], 'has-selected');
                                appendChildNodes(self.nestedMap[cat][0], div);
                                if (text_cat.length > 2) {
                                    addElementClass(self.nestedMap[text_cat[2]][0], 'has-selected');
                                    appendChildNodes(self.nestedMap[text_cat[2]][0], self.nestedMap[cat][0]);
                                }
                            } else {
                                self.nestedMap[cat].push(div);
                            }
                            cat_indices[option_text] = [cat, self.nestedMap[cat].length - 1];  // in case this later becomes a (nested) category
                            if (text_cat[0] != text_cat[1]) {
                                // Don't allow a single 'London' city to appear below a 'London' region
                                // instead only allow option of selecting the region.
                                // Idea is that if there is no change in name, no-one really knows what geographically regions are being
                                // delineated (we no longer display 'City/Town' or 'State/Region' as titles)
                                addElementClass(self.nestedMap[cat][0], 'expandable');
                            }
                        }
                    } else {
                        var toggler = DIV({'class': 'toggler'});
                        var cat_div = DIV({'class': 'cbox-nested'}, toggler, div);
                        connect(toggler, 'onclick', partial(self.toggleNested, self, cat_div, option_text));
                        if (self.expanded[option_text] !== undefined) {
                            self.expanded[option_text] = cat_div;  // refresh
                        }
                        top_divs.push(cat_div);
                        self.nestedMap[option_text] = [cat_div];
                        cat_indices[option_text] = true;
                    }
                } else {
                    top_divs.push(div);
                }
                if (old_highlight_value && scrapeText(div) == old_highlight_value){
                    addElementClass(div, 'focused');
                }
            }
            total_options++;
        }
        if (!(objEqual(keys(old_optionValueMap), keys(self.optionValueMap)) &&
              objEqual(values(old_optionValueMap), values(self.optionValueMap)))) {
            var sbc = getFirstElementByTagAndClassName(null, 'simplebar-content', this.optionslist);
            var add_simplebar = !sbc;
            if (!sbc) {
                sbc = this.optionslist;
            }
            replaceChildNodes(sbc, top_divs);
            if (add_simplebar && this.config.permaOptions) {
                new SimpleBar(this.optionslist);
            }
            this.total_options = total_options;
        }
        if (old_highlight_value == null) {
            this.unfilterList();
        }
        for (var k in this.expanded) {
            this.toggleNested(this, this.expanded[k], k);
        }
    },

    toggleNested: function(self, cat_div, cat) {
        if (self.nestedMap[cat]) {
            var cat_item = getFirstElementByTagAndClassName(null, 'cbox-item', self.nestedMap[cat][0]);
            if (cat_item && cat_item.dataset.value && cat_item.dataset.value && endsWith('*', cat_item.dataset.value)) {
                // deep search for more subitems
                load_combo(self, self.textedit.name.split('-filter')[0], get_filtered_url(), undefined, undefined, cat_item.dataset.value.substring(0, cat_item.dataset.value.length - 1), true);
            }
            // on demand creation of subitem DOM
            appendChildNodes.apply(null, self.nestedMap[cat]);
            forEach(getElementsByTagAndClassName(null, 'cbox-nested', self.nestedMap[cat][0]), function(nested){
                var toggler = getFirstElementByTagAndClassName(null, 'toggler', nested);
                if (toggler) {
                    connect(toggler, 'onclick', partial(self.toggleNested, self, toggler.parentElement, toggler.dataset.cat));
                }
            });
            self.expanded[cat] = cat_div;
            delete self.nestedMap[cat];
        }
        toggleElementClass('expanded', cat_div);
    },

    enableDisable: function(presentMap) {
        var self = this;
        forEach(this.getAllOptionDivs(), function(option_div) {
            if (option_div.dataset.value && !presentMap[option_div.dataset.value]) {
				addElementClass(option_div, 'zero-results');
			} else {
				var option_text = scrapeText(option_div);
				var paren_i = option_text.lastIndexOf(' (');
				var count_plus_sessions = option_text.slice(paren_i + 1);
				var m = count_plus_sessions.match(/(\([\d,]+) (.*)(\))/);
				if (m && m[1] !== '(0') {
					removeElementClass(option_div, 'zero-results');
				}
			}
        });
    },

    insertOptions: function(insertMap) {
        forEach(this.getAllOptionDivs(), function(option_div) {
            if (option_div.dataset.value && insertMap[option_div.dataset.value]) {
                delete insertMap[option_div.dataset.value];
            }
        });
        if (keys(insertMap).length == 0) {
            return;
        }
        var new_options = extend(null, this.config.options);
        for (var ik in insertMap) {
            new_options.push([ik, insertMap[ik]]);  // can't just push to config.options as setOptions does nothing if it sees no changes to config.options
        }
        this.setOptions(new_options);
    },

    showDropdown: function(){
        removeElementClass(this.optionslist, 'hidden');
        var visibleCount = Math.min(this.exposed_options.length, this.config.maxListLength);
        if (!visibleCount && !this.config.permaOptions){
            addElementClass(this.optionslist, 'hidden');
            disconnect(this.scroll_cx);
            disconnect(this.resize_cx);
            this.blurHighlightedNode();
            return;
        }

        if (this.config.permaOptions) {
            new SimpleBar(this.optionslist);
        } else {
            var item_dims = getElementDimensions(this.optionslist.childNodes[0]);
            var desiredHeight = visibleCount * item_dims.h + 6;

            var textedit_rel_pos = getElementPosition(this.textedit, getElementPosition(getFirstParentByTagAndClassName(this.textedit, null, 'cbox-relative')));
            var textedit_pos = getElementPosition(this.textedit);
            var textedit_dims = getElementDimensions(this.textedit);

            // Maximize the height of the dropdown

            // TODO: turn this into polling rather than signalling, see throttling below
            this.scroll_cx = connect(window, "onscroll", bind(this.positionDropdown, this, textedit_dims, textedit_pos, desiredHeight));
            this.resize_cx = connect(window, "onresize", bind(this.movedDropdown, this, textedit_dims, desiredHeight));
            this.positionDropdown(textedit_dims, textedit_pos, textedit_rel_pos, desiredHeight, true);
            this.scrollDropdown(true);
        }
    },

    movedDropdown: function(textedit_dims, desiredHeight){
        var textedit_rel_pos = getElementPosition(this.textedit, getElementPosition(getFirstParentByTagAndClassName(this.textedit, null, 'cbox-relative')));
        var textedit_pos = getElementPosition(this.textedit);
        this.positionDropdown(textedit_dims, textedit_pos, textedit_rel_pos, desiredHeight);
    },

    positionDropdown: function(textedit_dims, textedit_pos, textedit_rel_pos, desiredHeight, override_recent_throttle){
        // on the new app, we're using a different method to position combobox dropdowns, so skip
		if (document.getElementsByTagName("body")[0].className.match(/app /)) {
            return;
        }
        // call throttling
        if(arguments.callee.later){
            arguments.callee.later.cancel();
        }
        if(arguments.callee.calledRecently && override_recent_throttle === undefined){
            // IE6 fires the onscroll event too often
            arguments.callee.later = callLater(0.11, arguments.callee, textedit_dims, textedit_pos, desiredHeight);
            return;
        }
        arguments.callee.calledRecently = true;
        callLater(0.1, function(callee){ callee.calledRecently = false; }, arguments.callee);
        var left = textedit_rel_pos.x;
        var width = textedit_dims.w-4;
        var vpp = getViewportPosition();
        var vdim = getViewportDimensions();
        if(vpp.x > left){
            width = width - (vpp.x - left);
            left = vpp.x;
        }

        var textedit_bot = textedit_pos.y + textedit_dims.h - 1;
        var textedit_rel_bot = textedit_rel_pos.y + textedit_dims.h - 1;
        var h = vdim.h - (textedit_bot - vpp.y);

        if(desiredHeight + 5 > h && h < textedit_pos.y - vpp.y){
            // It won't fit below and there's more room above

            var h = Math.min(desiredHeight, textedit_pos.y - vpp.y);
            setElementDimensions(this.optionslist, {w: width, h:h-3});
            //this.optionslist.style.left = 1-textedit_dims.w;
            var loading_adjust = 0;
            if (hasElementClass(this.optionslist, 'loading')) {
                // extra space to account for loading animation
                loading_adjust = 15;
            }
            setElementPosition(this.optionslist, {
                x: left,
                y: (textedit_rel_pos.y-h)-loading_adjust
            });
        } else {
            h = Math.min(desiredHeight, h);
            setElementDimensions(this.optionslist, {w: width, h:h-3});
            //this.optionslist.style.left = 1-textedit_dims.w;
            setElementPosition(this.optionslist, {
                x: left,
                y: textedit_rel_bot
            });
        }
    },

    scrollDropdown: function(selectedAtTop){
        var node = this._highlighted_node;
        if (!node) {
            return;
        }
        var olp = getElementPosition(this.optionslist);
        var ol_top = olp.y;
        var sel_top = getElementPosition(node).y;
        if(ol_top > sel_top){
            this.optionslist.scrollTop -= ol_top - sel_top;
        } else {
            var ol_bot = ol_top + getElementDimensions(this.optionslist).h - this.optionslist.scrollTop;
            var sel_bot = sel_top + getElementDimensions(node).h;
            if(ol_bot < sel_bot && sel_bot - ol_bot > this.optionslist.scrollTop){
                if(selectedAtTop){
                    this.optionslist.scrollTop = sel_top - ol_top;
                } else {
                    this.optionslist.scrollTop = sel_bot - ol_bot;
                }
            }
        }
    },

    highlightOption: function(e){
        if(e.target() != e.src()){
            this.focusOptionNode(e.target());
        }
    },


    clickOption: function(e){
        if(e.target() != e.src()){
            var target = e.target();
            while (target.parentNode && !hasElementClass(target, 'cbox-item')) {
                // could be a click on <i>(2,744 visits)</i>
                target = target.parentNode;
                if (hasElementClass(target, 'cbox-list')) {
                    return;  // didn't click within a .cbox-item
                }
            }
            var is_selected = hasElementClass(target, 'selected');
            var selected_categories = [];  // selected either in their own right, or because they are themselves within a selected category (mid level in 3 level hierarchy)
            if (!hasElementClass(this.optionslist, 'filtered')) {
                var p = target;
                while (!is_selected && p.parentNode && !hasElementClass(p, 'cbox-list')) {
                    p = p.parentNode;
                    if (hasElementClass(p, 'cbox-nested')) {
                        forEach(p.childNodes, function(pc) {
                            if (hasElementClass(pc, 'cbox-subitem')) {
                                return;
                            }
                            if (hasElementClass(pc, 'cbox-item')) {
                                selected_categories.push(pc);
                                if (hasElementClass(pc, 'selected')) {
                                    is_selected = true;
                                }
                            }
                        });
                    }
                }
            }
            if (!is_selected) {
                selected_categories = [];
            }
            var deselect = false;
            if (this.config.multi && is_selected) {
                if (this.textedit.value !== '' && this.config.autoselect) {
                    // with autoselect, don't have concept of deselecting after a search, as you didn't explicitly select in the first place
                    return;
                }
                if (hasElementClass(target, 'autocreated')) {
                    // don't allow toggling off by a click
                    return;
                }
                for (var i=0; i<selected_categories.length; i++) {
                    forEach(selected_categories[i].parentNode.childNodes, function(cn){
                        if (hasElementClass(cn, 'cbox-subitem')) {
                            if (hasElementClass(cn, 'cbox-nested')) {
                                var other_item = findChildElements(cn, ['.cbox-item:not(.cbox-subitem)'])[0];
                            } else {
                                var other_item = cn;
                            }
                            if (selected_categories[i] === target) {
                                // deselecting the .cbox-item category
                                removeElementClass(other_item, 'selected');
                            } else if (other_item !== target && (i == 0 || other_item !== selected_categories[i - 1])) {
                                // deselecting a .cbox-subitem, we actually need to select all others
                                addElementClass(other_item, 'selected');
                            }
                        }
                    });
                    removeElementClass(selected_categories[i], 'selected');
                }
                deselect = true;
                removeElementClass(target, 'selected');
                this.blurHighlightedNode();
                this.updateValues();
            }
            if (!deselect) {
                this.focusOptionNode(target);
                this.selectOption();
            }
            var container = target;
            while (container.parentNode && !hasElementClass(container, 'cbox-list')) {
                container = container.parentNode;
                if (hasElementClass(container, 'cbox-nested')) {
                    if (getFirstElementByTagAndClassName(null, 'selected', container)) {
                        var all_selected = true;
                        var cat_node = false;
                        forEach(container.childNodes, function(cn){
                            if (hasElementClass(cn, 'cbox-subitem')) {
                                if (hasElementClass(cn, 'cbox-nested')) {
                                    if (!hasElementClass(cn.childNodes[1], 'selected')) { // brittle
                                        all_selected = false;
                                    }
                                } else {
                                    if (!hasElementClass(cn, 'selected')) {
                                        all_selected = false;
                                    }
                                }
                            } else if (hasElementClass(cn, 'cbox-item')) {
                                cat_node = cn;
                            }
                        });
                        if (all_selected && cat_node && !hasElementClass(this.optionslist, 'filtered')) {
                            this.focusOptionNode(cat_node);
                            this.selectOption();
                        }
                        addElementClass(container, 'has-selected');
                    } else {
                        removeElementClass(container, 'has-selected');
                    }
                }
            }
            if (deselect) {
                signal(this, 'selected');  // this is to trigger reload_stats
                return;
            }
            if (!this.config.permaOptions) {
                addElementClass(this.optionslist, 'hidden');
                disconnect(this.scroll_cx);
                disconnect(this.resize_cx);
            }
            //        this.textedit.form.submit();
            signal(this, 'selected');
        }
    },

    toggle: function(){
        // do nothing if the base text input is disabled
        if (this.textedit.disabled) {
           return;
        }
        if (this.exposed_options.length != this.total_options  || !this.optionslist || hasElementClass(this.optionslist, 'hidden')){
            if(this._highlighted_node){
                this.unfilterList();
            } else {
                this.filterList();
                if (this.exposed_options.length < this.config.maxListLength){
                    if(this.exposed_options.length > 0){
                        this._highlighted_node = this.exposed_options[this.exposed_options.length-1];
                    }
                    this.unfilterList();
                }
            }
            this.showDropdown();
            this.textedit.focus();
        } else {
            addElementClass(this.optionslist, 'hidden');
            disconnect(this.scroll_cx);
            disconnect(this.resize_cx);
        }
    },


    focusOptionNode: function(node){
        while (node.parentNode && !hasElementClass(node, 'cbox-item')){
            node = node.parentNode;
            if (hasElementClass(node, 'cbox-list')) {
                return;  // didn't click within a .cbox-item
            }
        }
        if(this._highlighted_node != node){
            this.blurHighlightedNode();
            this._highlighted_node = node;
        }
        if(!this.config.permaOptions && !hasElementClass(this.optionslist, 'hidden')){
            this.scrollDropdown();
        }
        addElementClass(node, 'focused');
    },

    blurHighlightedNode: function(){
        if (this._highlighted_node){
            removeElementClass(this._highlighted_node, 'focused');
            this._highlighted_node = null;
        }
    },

    setOptions: function(d){
        if (compare(this.config.options, d) === 0) {
            // don't rebuild if options are the same
            return;
        }
        this.config.options = d;
        this.build(this.config.options);
        if (this.config.permaOptions) {
            // this might be desirable even without permaOptions
            this.filterList();
        }
    },

    setText: function(txt, highlight){
        if(highlight === undefined){
            highlight = '#e6eff7';
        }
        this.textedit.value = txt;
        if(highlight !== false){
            Highlight(this.textedit, {'startcolor': highlight, 'duration': 2});
        }
        if(this.optionValueMap[txt] !== undefined){
            this.hidden.value = this.optionValueMap[txt];
            this.hidden.dataset.vals = txt;
            this.selectedValue = txt;
        } else {
            this.hidden.value = "";
            this.hidden.dataset.vals = '';
        }
    },

    setByHidden: function(value){
        if(this.valueOptionMap[value] !== undefined){
            if (!this.config.permaOptions) {
                if (this.config.strip_parenthesis) {
                    this.textedit.value = this.valueOptionMap[value].split(' (')[0];
                } else {
                    this.textedit.value = this.valueOptionMap[value];
                }
            }
            this.selectedValue = this.textedit.value;
        }
        this.hidden.value = value;
    },

    maybeSetNoMatchText: function() {
        var match_item = getFirstElementByTagAndClassName(null, 'match-item', this.optionslist);
        var tv = this.textedit.value.trim().toLowerCase();
        if (match_item
            && this.optionslist.querySelectorAll('.cbox-item.shown').length == 1  // just the match_item
            && !hasElementClass(this.optionslist, 'loading')  // e.g. not filtering on Countries before regions/cities have loaded
            && (!this.deep_search ||
                (this.search_status[tv] !== undefined
                 && (startsWith('no-results', this.search_status[tv]) || startsWith('no-more-results', this.search_status[tv]))))
           ) {
            addElementClass(match_item, 'zero-results');
            removeElementClass(match_item, 'selected');
            get_filtered_url();  // in case in future we revert policy and want to disable the 'Apply Filter' button based on .zero-results
            if (this.config.no_match_text) {
                match_item.innerText = this.config.no_match_text.replace('%s', this.textedit.value.split(/[\s]+OR(?:[\s]+|$)/).join("' or '"));
            }
        }
    }


};