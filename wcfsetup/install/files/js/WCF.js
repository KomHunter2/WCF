/**
 * Class and function collection for WCF
 * 
 * @author	Markus Bartz, Tim Düsterhus, Alexander Ebert
 * @copyright	2001-2011 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 */

/**
 * Initialize WCF namespace
 */
var WCF = {};

/**
 * Extends jQuery with additional methods.
 */
$.extend(true, {
	/**
	 * Escapes an ID to work with jQuery selectors.
	 *
	 * @see		http://docs.jquery.com/Frequently_Asked_Questions#How_do_I_select_an_element_by_an_ID_that_has_characters_used_in_CSS_notation.3F
	 * @param	string		id
	 * @return	string
	 */
	wcfEscapeID: function(id) {
		return id.replace(/(:|\.)/g, '\\$1');
	},
	
	/**
	 * Returns true if given ID exists within DOM.
	 * 
	 * @param	string		id
	 * @return	boolean
	 */
	wcfIsset: function(id) {
		return !!$('#' + $.wcfEscapeID(id)).length;
	}
});

/**
 * Extends jQuery's chainable methods.
 */
$.fn.extend({
	/**
	 * Returns tag name of current jQuery element.
	 * 
	 * @returns	string
	 */
	getTagName: function() {
		return this.get(0).tagName.toLowerCase();
	},
	
	/**
	 * Returns the dimensions for current element.
	 * 
	 * @see		http://api.jquery.com/hidden-selector/
	 * @param	string		type
	 * @return	object
	 */
	getDimensions: function(type) {
		var dimensions = css = {};
		var wasHidden = false;
		
		// show element to retrieve dimensions and restore them later
		if (this.is(':hidden')) {
			css = {
				display: this.css('display'),
				visibility: this.css('visibility')
			};
			
			wasHidden = true;
			
			this.css({
				display: 'block',
				visibility: 'hidden'
			});
		}
		
		switch (type) {
			case 'inner':
				dimensions = {
					height: this.innerHeight(),
					width: this.innerWidth()
				};
			break;
			
			case 'outer':
				dimensions = {
					height: this.outerHeight(),
					width: this.outerWidth()
				};
			break;
			
			default:
				dimensions = {
					height: this.height(),
					width: this.width()
				};
			break;
		}
		
		// restore previous settings
		if (wasHidden) {
			this.css(css);
		}
		
		return dimensions;
	},
	
	/**
	 * Returns the offsets for current element, defaults to position
	 * relative to document.
	 * 
	 * @see		http://api.jquery.com/hidden-selector/
	 * @param	string		type
	 * @return	object
	 */
	getOffsets: function(type) {
		var offsets = css = {};
		var wasHidden = false;
		
		// show element to retrieve dimensions and restore them later
		if (this.is(':hidden')) {
			css = {
				display: this.css('display'),
				visibility: this.css('visibility')
			};
			
			wasHidden = true;
			
			this.css({
				display: 'block',
				visibility: 'hidden'
			});
		}
		
		switch (type) {
			case 'offset':
				offsets = this.offset();
			break;
			
			case 'position':
			default:
				offsets = this.position();
			break;
		}
		
		// restore previous settings
		if (wasHidden) {
			this.css(css);
		}
		
		return offsets;
	},
	
	/**
	 * Changes element's position to 'absolute' or 'fixed' while maintaining it's
	 * current position relative to viewport. Optionally removes element from
	 * current DOM-node and moving it into body-element (useful for drag & drop)
	 * 
	 * @param	boolean		rebase
	 * @return	object
	 */
	makePositioned: function(position, rebase) {
		if (position != 'absolute' && position != 'fixed') {
			position = 'absolute';
		}
		
		var $currentPosition = this.getOffsets('position');
		this.css({
			position: position,
			left: $currentPosition.left,
			margin: 0,
			top: $currentPosition.top
		});
		
		if (rebase) {
			this.remove().appentTo('body');
		}
		
		return this;
	},
	
	/**
	 * Disables a form element.
	 * 
	 * @return jQuery
	 */
	disable: function() {
		return this.attr('disabled', 'disabled');
	},
	
	/**
	 * Enables a form element.
	 * 
	 * @return	jQuery
	 */
	enable: function() {
		return this.removeAttr('disabled');
	},
	
	/**
	 * Applies a grow-effect by resizing element while moving the
	 * element appropriately
	 * 
	 * @param	object		data
	 * @param	object		options
	 * @return	jQuery
	 */
	wcfGrow: function(data, options) {
		// create temporarily element to determine dimensions
		var $tempElementID = WCF.getRandomID();
		$('body').append('<div id="' + $tempElementID + '" class="wcfDimensions">' + data.content + '</div>');
		var $tempElement = $('#' + $tempElementID);
		
		// get content dimensions
		var $dimensions = $tempElement.getDimensions();
		
		// remove temporarily element
		$tempElement.empty().remove();
		
		// move parent element, used if applying effect on dialogs
		if (!data.parent) {
			data.parent = this;
		}
		
		// calculate values for grow-effect
		var $borderHeight = parseInt(data.parent.css('borderTopWidth')) + parseInt(data.parent.css('borderBottomWidth'));
		var $borderWidth = parseInt(data.parent.css('borderLeftWidth')) + parseInt(data.parent.css('borderRightWidth'));
		
		var $windowDimensions = $(window).getDimensions();
		var $leftOffset = Math.round(($windowDimensions.width - ($dimensions.width + $borderWidth)) / 2);
		var $topOffset = Math.round(($windowDimensions.height - ($dimensions.height + $borderHeight)) / 2);
		
		data.parent.makePositioned('fixed', false);
		data.parent.animate({
			left: $leftOffset + 'px',
			top: $topOffset + 'px'
		}, options);
		
		return this.animate({
			height: $dimensions.height,
			width: $dimensions.width
		}, options);
	},
	
	/**
	 * Shows an element by sliding and fading it into viewport.
	 * 
	 * @param	string		direction
	 * @param	object		callback
	 * @returns	jQuery
	 */
	wcfDropIn: function(direction, callback) {
		if (!direction) direction = 'up';
		
		return this.show(WCF.getEffect(this.getTagName(), 'drop'), { direction: direction }, 600, callback);
	},
	
	/**
	 * Hides an element by sliding and fading it out the viewport.
	 * 
	 * @param	string		direction
	 * @param	object		callback
	 * @returns	jQuery
	 */
	wcfDropOut: function(direction, callback) {
		if (!direction) direction = 'down';
		
		return this.hide(WCF.getEffect(this.getTagName(), 'drop'), { direction: direction }, 600, callback);
	},
	
	/**
	 * Shows an element by blinding it up.
	 * 
	 * @param	string		direction
	 * @param	object		callback
	 * @returns	jQuery
	 */
	wcfBlindIn: function(direction, callback) {
		if (!direction) direction = 'vertical';
		
		return this.show(WCF.getEffect(this.getTagName(), 'blind'), { direction: direction }, 200, callback);
	},
	
	/**
	 * Hides an element by blinding it down.
	 * 
	 * @param	string		direction
	 * @param	object		callback
	 * @returns	jQuery
	 */
	wcfBlindOut: function(direction, callback) {
		if (!direction) direction = 'vertical';
		
		return this.hide(WCF.getEffect(this.getTagName(), 'blind'), { direction: direction }, 200, callback);
	},
	
	/**
	 * Highlights an element.
	 * 
	 * @param	object		options
	 * @param	object		callback
	 * @returns	jQuery
	 */
	wcfHighlight: function(options, callback) {
		return this.effect('highlight', options, 600, callback);
	}
});

/**
 * WoltLab Community Framework core methods
 */
$.extend(WCF, {
	/**
	 * Counter for dynamic element id's
	 *
	 * @var	integer
	 */
	_idCounter: 0,
	
	/**
	 * Shows a modal dialog with a built-in AJAX-loader.
	 * 
	 * @param	string		dialogID
	 * @param	boolean		resetDialog
	 */
	showAJAXDialog: function(dialogID, resetDialog) {
		if (!dialogID) {
			dialogID = this.getRandomID();
		}
		
		if (!$.wcfIsset(dialogID)) {
			$('body').append($('<div id="' + dialogID + '"></div>'));
		}
		
		var dialog = $('#' + $.wcfEscapeID(dialogID));
		
		if (resetDialog) {
			dialog.empty();
		}
		
		dialog.addClass('overlayLoading');
		
		var dialogOptions = arguments[2] || {};
		dialog.wcfAJAXDialog(dialogOptions);
	},
	
	/**
	 * Shows a modal dialog.
	 * @param	string		dialogID
	 */
	showDialog: function(dialogID) {
		// we cannot work with a non-existant dialog, if you wish to
		// load content via AJAX, see showAJAXDialog() instead
		if (!$.wcfIsset(dialogID)) return;
		
		var $dialog = $('#' + $.wcfEscapeID(dialogID));
		
		var dialogOptions = arguments[2] || {};
		$dialog.wcfDialog(dialogOptions);
	},
	
	/**
	 * Returns a dynamically created id.
	 * 
	 * @see		https://github.com/sstephenson/prototype/blob/master/src/prototype/dom/dom.js#L1789
	 * @return	string
	 */
	getRandomID: function() {
		var $elementID = '';
		
		do {
			$elementID = 'wcf' + this._idCounter++;
		}
		while ($.wcfIsset($elementID));
		
		return $elementID;
	},
	
	/**
	 * Wrapper for $.inArray which returns boolean value instead of
	 * index value, similar to PHP's in_array().
	 * 
	 * @param	mixed		needle
	 * @param	array		haystack
	 * @return	boolean
	 */
	inArray: function(needle, haystack) {
		return ($.inArray(needle, haystack) != -1);
	},
	
	/**
	 * Adjusts effect for partially supported elements.
	 * 
	 * @param	object		object
	 * @param	string		effect
	 * @return	string
	 */
	getEffect: function(tagName, effect) {
		// most effects are not properly supported on table rows, use highlight instead
		if (tagName == 'tr') {
			return 'highlight';
		}
		
		return effect;
	}
});

/**

 * Clipboard API
 */
WCF.Clipboard = {
	/**
	 * action proxy object
	 * @var	WCF.Action.Proxy
	 */
	_actionProxy: null,
	
	/**
	 * list of clipboard containers
	 * @var	jQuery
	 */
	_container: null,
	
	/**
	 * user has marked items
	 * @var	boolean
	 */
	_hasMarkedItems: false,
	
	/**
	 * current page
	 * @var	string
	 */
	_page: '',
	
	/**
	 * proxy object
	 * @var	WCF.Action.Proxy
	 */
	_proxy: null,
	
	/**
	 * Initializes the clipboard API.
	 */
	init: function(page, hasMarkedItems) {
		this._page = page;
		if (hasMarkedItems) this._hasMarkedItems = true;
		
		this._actionProxy = new WCF.Action.Proxy({
			success: $.proxy(this._actionSuccess, this),
			url: 'index.php?action=ClipboardProxy&t=' + SECURITY_TOKEN + SID_ARG_2ND
		});
		
		this._proxy = new WCF.Action.Proxy({
			success: $.proxy(this._success, this),
			url: 'index.php?action=Clipboard&t=' + SECURITY_TOKEN + SID_ARG_2ND
		});
		
		// init containers first
		this._containers = $('.clipboardContainer').each($.proxy(function(index, container) {
			this._initContainer(container);
		}, this));
		
		// loads marked items
		if (this._hasMarkedItems) {
			this._loadMarkedItems();
		}
	},
	
	/**
	 * Loads marked items on init.
	 */
	_loadMarkedItems: function() {
		new WCF.Action.Proxy({
			autoSend: true,
			data: {
				pageClassName: this._page
			},
			success: $.proxy(this._loadMarkedItemsSuccess, this),
			url: 'index.php?action=ClipboardLoadMarkedItems&t=' + SECURITY_TOKEN + SID_ARG_2ND
		});
	},
	
	/**
	 * Marks all returned items as marked
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	jQuery		jqXHR
	 */
	_loadMarkedItemsSuccess: function(data, textStatus, jqXHR) {
		for (var $typeName in data.markedItems) {
			var $objectData = data.markedItems[$typeName];
			var $objectIDs = [];
			for (var $i in $objectData) {
				$objectIDs.push($objectData[$i]);
			}
			
			// loop through all containers
			this._containers.each(function(index, container) {
				var $container = $(container);
				
				// typeName does not match, continue
				if ($container.data('type') != $typeName) {
					return true;
				}
				
				// mark items as marked
				$container.find('input.clipboardItem').each(function(innerIndex, item) {
					var $item = $(item);
					if (WCF.inArray($item.data('objectID'), $objectIDs)) {
						$item.attr('checked', 'checked');
					}
				});
				
				// check if there is a markAll-checkbox
				$container.find('input.clipboardMarkAll').each(function(innerIndex, markAll) {
					var $allItemsMarked = true;
					
					$container.find('input.clipboardItem').each(function(itemIndex, item) {
						var $item = $(item);
						if (!$item.attr('checked')) {
							$allItemsMarked = false;
						}
					});
					
					if ($allItemsMarked) {
						$(markAll).attr('checked', 'checked');
					}
				});
			});
		}
		
		// call success method to build item list editors
		this._success(data, textStatus, jqXHR);
	},
	
	/**
	 * Initializes a clipboard container.
	 * 
	 * @param	object		container
	 */
	_initContainer: function(container) {
		var $container = $(container);
		
		// fetch id or assign a random one if none found
		var $id = $container.attr('id');
		if (!$id) {
			$id = WCF.getRandomID();
			$container.attr('id', $id);
		}
		
		// bind mark all checkboxes
		$container.find('.clipboardMarkAll').each($.proxy(function(index, item) {
			$(item).data('hasContainer', $id).click($.proxy(this._markAll, this));
		}, this));
		
		// bind item checkboxes
		$container.find('input.clipboardItem').each($.proxy(function(index, item) {
			$(item).data('hasContainer', $id).click($.proxy(this._click, this));
		}, this));
	},
	
	/**
	 * Processes change checkbox state.
	 * 
	 * @param	object		event
	 */
	_click: function(event) {
		var $item = $(event.target);
		var $objectID = $item.data('objectID');
		var $isMarked = ($item.attr('checked')) ? true : false;
		var $objectIDs = [ $objectID ];
		
		// item is part of a container
		if ($item.data('hasContainer')) {
			var $container = $('#' + $item.data('hasContainer'));
			var $type = $container.data('type');
			
			// check if all items are marked
			var $markedAll = true;
			$container.find('input.clipboardItem').each(function(index, containerItem) {
				var $containerItem = $(containerItem);
				if (!$containerItem.attr('checked')) {
					$markedAll = false;
				}
			});
			
			// simulate a ticked 'markAll' checkbox
			$container.find('.clipboardMarkAll').each(function(index, markAll) {
				if ($markedAll) {
					$(markAll).attr('checked', 'checked');
				}
				else {
					$(markAll).removeAttr('checked');
				}
			});
		}
		else {
			// standalone item
			var $type = $item.data('type');
		}
		
		this._saveState($type, $objectIDs, $isMarked);
	},
	
	/**
	 * Marks all associated clipboard items as checked.
	 * 
	 * @param	object		event
	 */
	_markAll: function(event) {
		var $item = $(event.target);
		var $objectIDs = [ ];
		var $isMarked = true;
		
		// if markAll object is a checkbox, allow toggling
		if ($item.getTagName() == 'input') {
			$isMarked = $item.attr('checked');
		}
		
		// handle item containers
		if ($item.data('hasContainer')) {
			var $container = $('#' + $item.data('hasContainer'));
			var $type = $container.data('type');
			
			// toggle state for all associated items
			$container.find('input.clipboardItem').each(function(index, containerItem) {
				var $containerItem = $(containerItem);
				if ($isMarked) {
					if (!$containerItem.attr('checked')) {
						$containerItem.attr('checked', 'checked');
						$objectIDs.push($containerItem.data('objectID'));
					}
				}
				else {
					if ($containerItem.attr('checked')) {
						$containerItem.removeAttr('checked');
						$objectIDs.push($containerItem.data('objectID'));
					}
				}
			});
		}
		
		// save new status
		this._saveState($type, $objectIDs, $isMarked);
	},
	
	/**
	 * Saves clipboard item state.
	 * 
	 * @param	string		type
	 * @param	array		objectIDs
	 * @param	boolean		isMarked
	 */
	_saveState: function(type, objectIDs, isMarked) {
		this._proxy.setOption('data', {
			action: (isMarked) ? 'mark' : 'unmark',
			objectIDs: objectIDs,
			pageClassName: this._page,
			type: type
		})
		this._proxy.sendRequest();
	},
	
	/**
	 * Updates editor options.
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	jQuery		jqXHR
	 */
	_success: function(data, textStatus, jqXHR) {
		// clear all editors first
		var $containers = {};
		$('.clipboardEditor').each(function(index, container) {
			var $container = $(container);
			var $typeName = $container.data('type');
			if ($typeName) {
				$containers[$typeName] = $container;
			}
			
			$container.empty();
		});
		
		// do not buid new editors
		if (!data.items) return;
		
		// rebuild editors
		for (var $typeName in data.items) {
			if (!$containers[$typeName]) {
				continue;
			}
			
			// create container
			var $container = $containers[$typeName];
			var $editor = data.items[$typeName];
			var $label = $('<span>' + $editor.label + '</span>').appendTo($container).click(function(event) {
				var $span = $(event.target);
				$span.next().toggle();
			});
			var $list = $('<ol></ol>').appendTo($container).hide();
			
			// create editor items
			for (var $itemIndex in $editor.items) {
				var $item = $editor.items[$itemIndex];
				var $listItem = $('<li>' + $item.label + '</li>').appendTo($list);
				$listItem.data('actionName', $item.actionName).data('parameters', $item.parameters);
				$listItem.data('internalData', $item.internalData).data('url', $item.url).data('type', $typeName);
				
				// bind event
				$listItem.click($.proxy(this._executeAction, this));
			}
		}
	},
	
	/**
	 * Executes a clipboard editor item action.
	 * 
	 * @param	object		event
	 */
	_executeAction: function(event) {
		var $listItem = $(event.target);
		var $url = $listItem.data('url');
		if ($url) {
			window.location.href = $url;
		}
		
		// fire event
		$listItem.trigger('clipboardAction', [ $listItem.data('type'), $listItem.data('actionName') ]);
	},
	
	/**
	 * Sends a clipboard proxy request.
	 * 
	 * @param	object		item
	 */
	sendRequest: function(item) {
		var $item = $(item);
		
		this._actionProxy.setOption('data', {
			parameters: $item.data('parameters'),
			typeName: $item.data('type')
		});
		this._actionProxy.sendRequest();
	}
};

/**
 * Provides a simple call for periodical executed functions. Based upon
 * ideas by Prototype's PeriodicalExecuter.
 * 
 * @see		https://github.com/sstephenson/prototype/blob/master/src/prototype/lang/periodical_executer.js
 * @param	function		callback
 * @param	integer			delay
 */
WCF.PeriodicalExecuter = function(callback, delay) { this.init(callback, delay); };
WCF.PeriodicalExecuter.prototype = {
	/**
	 * Initializes a periodical executer.
	 * 
	 * @param	function		callback
	 * @param	integer			delay
	 */
	init: function(callback, delay) {
		this.callback = callback;
		this.delay = delay;
		this.loop = true;
		
		this.intervalID = setInterval($.proxy(this._execute, this), this.delay);
	},
	
	/**
	 * Executes callback.
	 */
	_execute: function() {
		this.callback(this);
		
		if (!this.loop) {
			clearInterval(this.intervalID);
		}
	},
	
	/**
	 * Terminates loop.
	 */
	stop: function() {
		this.loop = false;
	}
};

/**
 * Namespace for AJAXProxies
 */
WCF.Action = {};

/**
 * Basic implementation for AJAX-based proxyies
 * 
 * @param	object		options
 */
WCF.Action.Proxy = function(options) { this.init(options); };
WCF.Action.Proxy.prototype = {
	/**
	 * Initializes AJAXProxy.
	 * 
	 * @param	object		options
	 */
	init: function(options) {
		// initialize default values
		this.options = $.extend(true, {
			autoSend: false,
			data: { },
			after: null,
			init: null,
			failure: null,
			success: null,
			type: 'POST',
			url: 'index.php?action=AJAXProxy&t=' + SECURITY_TOKEN + SID_ARG_2ND
		}, options);
		
		this.confirmationDialog = null;
		this.loading = null;
		
		// send request immediately after initialization
		if (this.options.autoSend) {
			this.sendRequest();
		}
	},
	
	/**
	 * Sends an AJAX request.
	 */
	sendRequest: function() {
		this._init();
		
		$.ajax({
			data: this.options.data,
			dataType: 'json',
			type: this.options.type,
			url: this.options.url,
			success: $.proxy(this._success, this),
			error: $.proxy(this._failure, this)
		});
	},
	
	/**
	 * Fires before request is send, displays global loading status.
	 */
	_init: function() {
		if ($.isFunction(this.options.init)) {
			this.options.init(this);
		}
		
		$('<div id="actionProxyLoading" style="display: none;">'+WCF.Language.get('wcf.global.loading')+'</div>').appendTo($('body'));
		this.loading = $('#actionProxyLoading');
		this.loading.wcfDropIn();
	},
	
	/**
	 * Handles AJAX errors.
	 * 
	 * @param	object		jqXHR
	 * @param	string		textStatus
	 * @param	string		errorThrown
	 */
	_failure: function(jqXHR, textStatus, errorThrown) {
		try {
			var data = $.parseJSON(jqXHR.responseText);
			
			// call child method if applicable
			if ($.isFunction(this.options.failure)) {
				this.options.failure(jqXHR, textStatus, errorThrown, data);
			}
			
			var $randomID = WCF.getRandomID();
			$('<div id="' + $randomID + '" title="HTTP/1.0 ' + jqXHR.status + ' ' + errorThrown + '"><p>Der Server antwortete: ' + data.message + '.</p></div>').wcfDialog();
		}
		// failed to parse JSON
		catch (e) {
			var $randomID = WCF.getRandomID();
			$('<div id="' + $randomID + '" title="HTTP/1.0 ' + jqXHR.status + ' ' + errorThrown + '"><p>Der Server antwortete: ' + jqXHR.responseText + '.</p></div>').wcfDialog();
		}
		
		this._after();
	},
	
	/**
	 * Handles successful AJAX requests.
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	object		jqXHR
	 */
	_success: function(data, textStatus, jqXHR) {
		// call child method if applicable
		if ($.isFunction(this.options.success)) {
			this.options.success(data, textStatus, jqXHR);
		}
		
		this._after();
	},
	
	/**
	 * Fires after an AJAX request, hides global loading status.
	 */
	_after: function() {
		if ($.isFunction(this.options.after)) {
			this.options.after();
		}
		
		this.loading.wcfDropOut('up');
	},
	
	/**
	 * Sets options, MUST be used to set parameters before sending request
	 * if calling from child classes.
	 * 
	 * @param	string		optionName
	 * @param	mixed		optionData
	 */
	setOption: function(optionName, optionData) {
		this.options[optionName] = optionData;
	},

	/**
	 * Displays a spinner image for given element.
	 *
	 * @param	jQuery		element
	 */
	showSpinner: function(element) {
		element = $(element);

		if (element.getTagName() !== 'img') {
			console.debug('Given element is not an image, aborting.');
			return;
		}

		// force element dimensions
		element.attr('width', element.attr('width'));
		element.attr('height', element.attr('height'));

		// replace image
		element.attr('src', WCF.Icon.get('wcf.global.spinner'));
	}
};

/**
 * Basic implementation for simple proxy access using bound elements.
 * 
 * @param	object		options
 * @param	object		callbacks
 */
WCF.Action.SimpleProxy = function(options, callbacks) { this.init(options, callbacks); };
WCF.Action.SimpleProxy.prototype = {
	/**
	 * Initializes SimpleProxy.
	 * 
	 * @param	object		options
	 * @param	object		callbacks
	 */
	init: function(options, callbacks) {
		/**
		 * action-specific options
		 */
		this.options = $.extend(true, {
			action: '',
			className: '',
			elements: null,
			eventName: 'click'
		}, options);
		
		/**
		 * proxy-specific options
		 */
		this.callbacks = $.extend(true, {
			after: null,
			failure: null,
			init: null,
			success: null
		}, callbacks);
		
		if (!this.options.elements) return;
		
		// initialize proxy
		this.proxy = new WCF.Action.Proxy(this.callbacks);
		
		// bind event listener
		this.options.elements.each($.proxy(function(index, element) {
			$(element).bind(this.options.eventName, $.proxy(this._handleEvent, this));
		}, this));
	},
	
	/**
	 * Handles event actions.
	 * 
	 * @param	object		event
	 */
	_handleEvent: function(event) {
		this.proxy.setOption('data', {
			actionName: this.options.action,
			className: this.options.className,
			objectIDs: [ $(event.target).data('objectID') ]
		});
		
		this.proxy.sendRequest();
	}
};

/**
 * Basic implementation for AJAXProxy-based deletion.
 * 
 * @param	string		className
 * @param	jQuery		containerList
 */
WCF.Action.Delete = function(className, containerList) { this.init(className, containerList); };
WCF.Action.Delete.prototype = {
	/**
	 * Initializes 'delete'-Proxy.
	 * 
	 * @param	string		className
	 * @param	jQuery		containerList
	 */
	init: function(className, containerList) {
		if (!containerList.length) return;
		this.containerList = containerList;
		this.className = className;
		
		// initialize proxy
		var options = {
			success: $.proxy(this._success, this)
		};
		this.proxy = new WCF.Action.Proxy(options);
		
		// bind event listener
		this.containerList.each($.proxy(function(index, container) {
			$(container).find('.deleteButton').bind('click', $.proxy(this._click, this));
		}, this));
	},
	
	/**
	 * Sends AJAX request.
	 * 
	 * @param	object		event
	 */
	_click: function(event) {
		var $target = $(event.target);
		
		if ($target.data('confirmMessage')) {
			if (confirm($target.data('confirmMessage'))) {
				this.proxy.showSpinner($target);
				this._sendRequest($target);
			}
		}
		else {
			this.proxy.showSpinner($target);
			this._sendRequest($target);
		}
		
	},
	
	_sendRequest: function(object) {
		this.proxy.setOption('data', {
			actionName: 'delete',
			className: this.className,
			objectIDs: [ $(object).data('objectID') ]
		});
		
		this.proxy.sendRequest();
	},
	
	/**
	 * Deletes items from containers.
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	object		jqXHR
	 */
	_success: function(data, textStatus, jqXHR) {
		// remove items
		this.containerList.each(function(index, container) {
			var $objectID = $(container).find('.deleteButton').data('objectID');
			if (WCF.inArray($objectID, data.objectIDs)) {
				$(container).wcfBlindOut('up', function() {
					$(container).empty().remove();
				}, container);
			}
		});
	}
};

/**
 * Basic implementation for AJAXProxy-based toggle actions.
 * 
 * @param	string		className
 * @param	jQuery		containerList
 */
WCF.Action.Toggle = function(className, containerList) { this.init(className, containerList); };
WCF.Action.Toggle.prototype = {
	/**
	 * Initializes 'toggle'-Proxy
	 * 
	 * @param	string		className
	 * @param	jQuery		containerList
	 */
	init: function(className, containerList) {
		if (!containerList.length) return;
		this.containerList = containerList;
		this.className = className;
		
		// initialize proxy
		var options = {
			success: $.proxy(this._success, this)
		};
		this.proxy = new WCF.Action.Proxy(options);
		
		// bind event listener
		this.containerList.each($.proxy(function(index, container) {
			$(container).find('.toggleButton').bind('click', $.proxy(this._click, this));
		}, this));
	},
	
	/**
	 * Sends AJAX request.
	 * 
	 * @param	object		event
	 */
	_click: function(event) {
		this.proxy.setOption('data', {
			actionName: 'toggle',
			className: this.className,
			objectIDs: [ $(event.target).data('objectID') ]
		});
		
		this.proxy.sendRequest();
	},
	
	/**
	 * Toggles status icons.
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	object		jqXHR
	 */
	_success: function(data, textStatus, jqXHR) {
		// remove items
		this.containerList.each(function(index, container) {
			var $toggleButton = $(container).find('.toggleButton');
			if (WCF.inArray($toggleButton.data('objectID'), data.objectIDs)) {
				$(container).wcfHighlight();
				
				// toggle icon source
				$toggleButton.attr('src', function() {
					if (this.src.match(/disabled1\.svg$/)) {
						return this.src.replace(/disabled1\.svg$/, 'enabled1.svg');
					}
					else {
						return this.src.replace(/enabled1\.svg$/, 'disabled1.svg');
					}
				});
				// toogle icon title
				$toggleButton.attr('title', function() {
					if (this.src.match(/enabled1\.svg$/)) {
						return $(this).data('disableMessage');
					}
					else {
						return $(this).data('enableMessage');
					}
				});
			}
		});
	}
};

/**
 * Namespace for date-related functions.
 */
WCF.Date = {};

/**
 * Provides utility functions for date operations.
 */
WCF.Date.Util = {
	/**
	 * Returns UTC timestamp, if date is not given, current time will be used.
	 * 
	 * @param	Date		date
	 * @return	integer
	 */
	gmdate: function(date) {
		var $date = (date) ? date : new Date();
		
		return Math.round(Date.UTC(
			$date.getUTCFullYear(),
			$date.getUTCMonth(),
			$date.getUTCDay(),
			$date.getUTCHours(),
			$date.getUTCMinutes(),
			$date.getUTCSeconds()
		) / 1000);
	},
	
	/**
	 * Returns a Date object with precise offset (including timezone and local timezone).
	 * Parameter timestamp must be in miliseconds!
	 * 
	 * @param	integer		timestamp
	 * @param	integer		offset
	 * @return	Date
	 */
	getTimezoneDate: function(timestamp, offset) {
		var $date = new Date(timestamp);
		var $localOffset = $date.getTimezoneOffset() * -1 * 60000;
		
		return new Date((timestamp - $localOffset - offset));
	}
};

/**
 * Handles relative time designations.
 */
WCF.Date.Time = function() { this.init(); };
WCF.Date.Time.prototype = {
	/**
	 * Initializes relative datetimes.
	 */
	init: function() {
		// initialize variables
		this.elements = $('time.datetime');
		this.timestamp = 0;
		
		// calculate relative datetime on init
		this._refresh();
		
		// re-calculate relative datetime every minute
		new WCF.PeriodicalExecuter($.proxy(this._refresh, this), 60000);
	},
	
	/**
	 * Refreshes relative datetime for each element.
	 */
	_refresh: function() {
		// TESTING ONLY!
		var $date = new Date();
		this.timestamp = ($date.getTime() - $date.getMilliseconds()) / 1000;
		// TESTING ONLY!
		
		this.elements.each($.proxy(this._refreshElement, this));
	},
	
	/**
	 * Refreshes relative datetime for current element.
	 * 
	 * @param	integer		index
	 * @param	object		element
	 */
	_refreshElement: function(index, element) {
		if (!$(element).attr('title')) {
			$(element).attr('title', $(element).text());
		}
		
		var $timestamp = $(element).data('timestamp');
		var $date = $(element).data('date');
		var $time = $(element).data('time');
		var $offset = $(element).data('offset');
		
		// timestamp is less than 60 minutes ago (display 1 hour ago rather than 60 minutes ago)
		if (this.timestamp < ($timestamp + 3540)) {
			var $minutes = Math.round((this.timestamp - $timestamp) / 60);
			$(element).text(eval(WCF.Language.get('wcf.global.date.relative.minutes')));
		}
		// timestamp is less than 24 hours ago
		else if (this.timestamp < ($timestamp + 86400)) {
			var $hours = Math.round((this.timestamp - $timestamp) / 3600);
			$(element).text(eval(WCF.Language.get('wcf.global.date.relative.hours')));
		}
		// timestamp is less than a week ago
		else if (this.timestamp < ($timestamp + 604800)) {
			var $days = Math.round((this.timestamp - $timestamp) / 86400);
			var $string = eval(WCF.Language.get('wcf.global.date.relative.pastDays'));
		
			// get day of week
			var $dateObj = WCF.Date.Util.getTimezoneDate(($timestamp * 1000), $offset);
			var $dow = $dateObj.getDay();
			
			$(element).text($string.replace(/\%day\%/, WCF.Language.get('__days')[$dow]).replace(/\%time\%/, $time));
		}
		// timestamp is between ~700 million years BC and last week
		else {
			var $string = WCF.Language.get('wcf.global.date.dateTimeFormat');
			$(element).text($string.replace(/\%date\%/, $date).replace(/\%time\%/, $time));
		}
	}
};

/**
 * Hash-like dictionary. Based upon idead from Prototype's hash
 * 
 * @see	https://github.com/sstephenson/prototype/blob/master/src/prototype/lang/hash.js
 */
WCF.Dictionary = function() { this.init(); };
WCF.Dictionary.prototype = {
	/**
	 * Initializes a new dictionary.
	 */
	init: function() {
		this.variables = { };
	},
	
	/**
	 * Adds an entry.
	 * 
	 * @param	string		key
	 * @param	mixed		value
	 */
	add: function(key, value) {
		this.variables[key] = value;
	},
	
	/**
	 * Adds a traditional object to current dataset.
	 * 
	 * @param	object		object
	 */
	addObject: function(object) {
		for (var $key in object) {
			this.add($key, object[$key]);
		}
	},
	
	/**
	 * Adds a dictionary to current dataset.
	 * 
	 * @param	object		dictionary
	 */
	addDictionary: function(dictionary) {
		dictionary.each($.proxy(function(pair) {
			this.add(pair.key, pair.value);
		}, this));
	},
	
	/**
	 * Retrieves the value of an entry or returns null if key is not found.
	 * 
	 * @param	string		key
	 * @returns	mixed
	 */
	get: function(key) {
		if (this.isset(key)) {
			return this.variables[key];
		}
		
		return null;
	},
	
	/**
	 * Returns true if given key is a valid entry.
	 * 
	 * @param	string		key
	 */
	isset: function(key) {
		return this.variables.hasOwnProperty(key);
	},
	
	/**
	 * Removes an entry.
	 * 
	 * @param	string		key
	 */
	remove: function(key) {
		delete this.variables[key];
	},
	
	/**
	 * Iterates through dictionary.
	 * 
	 * Usage:
	 * 	var $hash = new WCF.Dictionary();
	 * 	$hash.add('foo', 'bar');
	 * 	$hash.each(function(pair) {
	 * 		// alerts:	foo = bar
	 * 		alert(pair.key + ' = ' + pair.value);
	 * 	});
	 * 
	 * @param	function	callback
	 */
	each: function(callback) {
		if (!$.isFunction(callback)) {
			return;
		}
		
		for (var $key in this.variables) {
			var $value = this.variables[$key];
			var $pair = {
				key: $key,
				value: $value
			};
			
			callback($pair);
		}
	}
};

/**
 * Global language storage.
 * 
 * @see	WCF.Dictionary
 */
WCF.Language = {
	_variables: new WCF.Dictionary(),
	
	/**
	 * @see	WCF.Dictionary.add()
	 */
	add: function(key, value) {
		this._variables.add(key, value);
	},
	
	/**
	 * @see	WCF.Dictionary.addObject()
	 */
	addObject: function(object) {
		this._variables.addObject(object);
	},
	
	/**
	 * Retrieves a variable.
	 * 
	 * @param	string		key
	 * @return	mixed
	 */
	get: function(key) {
		return this._variables.get(key);
	}
};

/**
 * Icon collection used across all JavaScript classes.
 * 
 * @see	WCF.Dictionary
 */
WCF.Icon = {
	/**
	 * list of icons
	 * @var	WCF.Dictionary
	 */
	_icons: new WCF.Dictionary(),

	/**
	 * @see	WCF.Dictionary.add()
	 */
	add: function(name, path) {
		this._icons.add(name, path);
	},

	/**
	 * @see	WCF.Dictionary.addObject()
	 */
	addObject: function(object) {
		this._icons.addObject(object);
	},

	/**
	 * @see	WCF.Dictionary.get()
	 */
	get: function(name) {
		return this._icons.get(name);
	}
};

/**
 * Number utilities.
 */
WCF.Number = {
	/**
	 * Rounds a number to a given number of floating points digits. Defaults to 0.
	 * 
	 * @param	number		number
	 * @param	floatingPoint	number of digits
	 * @return	number
	 */
	round: function (number, floatingPoint) {
		floatingPoint = Math.pow(10, (floatingPoint || 0));
		
		return Math.round(number * floatingPoint) / floatingPoint;
	}
}

/**
 * String utilities.
 */
WCF.String = {
	/**
	 * Adds thousands separators to a given number.
	 * 
	 * @param	mixed		number
	 * @return	string
	 */
	addThousandsSeparator: function(number) {
		var $numberString = String(number);
		var parts = $numberString.split(/[^0-9]/);

		var $decimalPoint = $numberString.match(/[^0-9]/g);
		
		$numberString = parts[0];
		delete parts[0];
		var $decimalPart = $decimalPoint.join('')+parts.join('');
		
		if (parseInt(number) >= 1000 || parseInt(number) <= -1000) {
			var $negative = false;
			if (parseInt(number) <= -1000) {
				$negative = true;
				$numberString = $numberString.substring(1);
			}
			var $separator = WCF.Language.get('wcf.global.thousandsSeparator');
			
			if ($separator != null && $separator != '') {
				var $numElements = new Array();
				var $firstPart = $numberString.length % 3
				if ($firstPart == 0) $firstPart = 3;
				for (var $i = 0; $i < Math.ceil($numberString.length / 3); $i++) {
					if ($i == 0) $numElements.push($numberString.substring(0, $firstPart));
					else {
						var $start = (($i - 1) * 3) + $firstPart
						$numElements.push($numberString.substring($start, $start + 3));
					}
				}
				$numberString = (($negative) ? ('-') : ('')) + $numElements.join($separator);
			}
		}
		
		return $numberString + $decimalPart;
	},
	
	/**
	 * Escapes special HTML-characters within a string
	 * 
	 * @param	string	string
	 * @return	string
	 */
	escapeHTML: function (string) {
		return string.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	},
	
	/**
	 * Escapes a String to work with RegExp.
	 *
	 * @see		https://github.com/sstephenson/prototype/blob/master/src/prototype/lang/regexp.js#L25
	 * @param	string	string
	 * @return	string
	 */
	escapeRegExp: function(string) {
		return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
	},
	
	/**
	 * Rounds number to given count of floating point digits, localizes decimal-point and inserts thousands-separators
	 * 
	 * @param	mixed	number
	 * @return	string
	 */
	formatNumeric: function(number, floatingPoint) {
		number = String(WCF.Number.round(number, floatingPoint || 2));
		number = number.replace('.', WCF.Language.get('wcf.global.decimalPoint'));
		
		return this.addThousandsSeparator(number);
	},
	
	/**
	 * Makes a string's first character uppercase
	 * 
	 * @param	string		string
	 * @return	string
	 */
	ucfirst: function(string) {
		return string.substring(0, 1).toUpperCase() + string.substring(1);
	}
};

/**
 * Basic implementation for WCF TabMenus. Use the data attributes 'active' to specify the
 * tab which should be shown on init. Furthermore you may specify a 'store' data-attribute
 * which will be filled with the currently selected tab.
 */
WCF.TabMenu = {
	/**
	 * Initializes all TabMenus
	 */
	init: function() {
		$('.tabMenuContainer').each(function(index, tabMenu) {
			if (!$(tabMenu).attr('id')) {
				var $randomID = WCF.getRandomID();
				$(tabMenu).attr('id', $randomID);
			}
			
			// init jQuery UI TabMenu
			$(tabMenu).wcfTabs({
				select: function(event, ui) {
					var $panel = $(ui.panel);
					var $container = $panel.closest('.tabMenuContainer');
					
					// store currently selected item
					if ($container.data('store')) {
						if ($.wcfIsset($container.data('store'))) {
							$('#' + $container.data('store')).attr('value', $panel.attr('id'));
						}
					}
				}
			});
			
			// display active item on init
			if ($(tabMenu).data('active')) {
				$(tabMenu).find('.tabMenuContent').each(function(index, tabMenuItem) {
					if ($(tabMenuItem).attr('id') == $(tabMenu).data('active')) {
						$(tabMenu).wcfTabs('select', index);
					}
				});
			}
		});
	}
};

/**
 * Templates that may be fetched more than once with different variables. Based upon ideas from Prototype's template
 * 
 * Usage:
 * 	var myTemplate = new WCF.Template('{$hello} World');
 * 	myTemplate.fetch({ hello: 'Hi' }); // Hi World
 * 	myTemplate.fetch({ hello: 'Hello' }); // Hello World
 * 	
 * 	my2ndTemplate = new WCF.Template('{@$html}{$html}');
 * 	my2ndTemplate.fetch({ html: '<b>Test</b>' }); // <b>Test</b>&lt;b&gt;Test&lt;/b&gt;
 * 
 * 	var my3rdTemplate = new WCF.Template('You can use {literal}{$variable}{/literal}-Tags here');
 * 	my3rdTemplate.fetch({ variable: 'Not shown' }); // You can use {$variable}-Tags here
 * 
 * 
 * @param	template		template-content
 * @see		https://github.com/sstephenson/prototype/blob/master/src/prototype/lang/template.js
 */
WCF.Template = function(template) { this.init(template); };
WCF.Template.prototype = {
	/**
	 * Template-content
	 * 
	 * @var	string
	 */
	_template: '',
	
	/**
	 * Saved literal-tags
	 * 
	 * @var	WCF.Dictionary
	 */
	_literals: new WCF.Dictionary(),
	
	/**
	 * Prepares template
	 * 
	 * @param	$template		template-content
	 */
	init: function($template) {
		this._template = $template;
		
		// save literal-tags
		this._template = this._template.replace(/\{literal\}(.*?)\{\/literal\}/g, $.proxy(function ($match) {
			// hopefully no one uses this string in one of his templates
			var id = '@@@@@@@@@@@'+Math.random()+'@@@@@@@@@@@';
			this._literals.add(id, $match.replace(/\{\/?literal\}/g, ''));
			
			return id;
		}, this));
	},
	
	/**
	 * Fetches the template with the given variables
	 *
	 * @param	$variables	variables to insert
	 * @return			parsed template
	 */
	fetch: function($variables) {
		var $result = this._template;
		
		// insert them :)
		for (var $key in $variables) {
			$result = $result.replace(new RegExp(WCF.String.escapeRegExp('{$'+$key+'}'), 'g'), WCF.String.escapeHTML($variables[$key]));
			$result = $result.replace(new RegExp(WCF.String.escapeRegExp('{#$'+$key+'}'), 'g'), WCF.String.formatNumeric($variables[$key]));
			$result = $result.replace(new RegExp(WCF.String.escapeRegExp('{@$'+$key+'}'), 'g'), $variables[$key]);
		}
		
		// insert delimiter tags
		$result = $result.replace('{ldelim}', '{').replace('{rdelim}', '}');
		
		// and re-insert saved literals
		return this.insertLiterals($result);
	},
	
	/**
	 * Inserts literals into given string
	 * 
	 * @param	$template	string to insert into
	 * @return			string with inserted literals
	 */
	insertLiterals: function ($template) {
		this._literals.each(function ($pair) {
			$template = $template.replace($pair.key, $pair.value);
		});
		
		return $template;
	},
	
	/**
	 * Compiles this template into javascript-code
	 * 
	 * @return	WCF.Template.Compiled
	 */
	compile: function () {
		var $compiled = this._template;
		
		// escape \ and '
		$compiled = $compiled.replace('\\', '\\\\').replace("'", "\\'");
		
		// parse our variable-tags
		$compiled = $compiled.replace(/\{\$(.*?)\}/g, function ($match) {
			var $name = '$v.' + $match.substring(2, $match.length - 1);
			// trinary operator to maintain compatibility with uncompiled template
			// ($name) ? $name : '$match'
			// -> $v.muh ? $v.muh : '{$muh}'
			return "' + WCF.String.escapeHTML("+ $name + " ? " + $name + " : '" + $match + "') + '";
		}).replace(/\{#\$(.*?)\}/g, function ($match) {
			var $name = '$v.' + $match.substring(3, $match.length - 1);
			// trinary operator to maintain compatibility with uncompiled template
			// ($name) ? $name : '$match'
			// -> $v.muh ? $v.muh : '{$muh}'
			return "' + WCF.String.formatNumeric("+ $name + " ? " + $name + " : '" + $match + "') + '";
		}).replace(/\{@\$(.*?)\}/g, function ($match) {
			var $name = '$v.' + $match.substring(3, $match.length - 1);
			// trinary operator to maintain compatibility with uncompiled template
			// ($name) ? $name : '$match'
			// -> $v.muh ? $v.muh : '{$muh}'
			return "' + ("+ $name + " ? " + $name + " : '" + $match + "') + '";
		});
		
		// insert delimiter tags
		$compiled = $compiled.replace('{ldelim}', '{').replace('{rdelim}', '}');
		
		// and re-insert saved literals
		return new WCF.Template.Compiled("'" + this.insertLiterals($compiled) + "';");
	}
};

/**
 * Represents a compiled template
 * 
 * @param	compiled		compiled template
 */
WCF.Template.Compiled = function(compiled) { this.init(compiled); };
WCF.Template.Compiled.prototype = {
	/**
	 * Compiled template
	 * 
	 * @var	string
	 */
	_compiled: '',
	
	/**
	 * Initializes our compiled template
	 * 
	 * @param	$compiled	compiled template
	 */
	init: function($compiled) {
		this._compiled = $compiled;
	},
	
	/**
	 * @see	WCF.Template.fetch
	 */
	fetch: function($v) {
		return eval(this._compiled);
	}
};

/**
 * Toggles options.
 * 
 * @param	string		element
 * @param	array		showItems
 * @param	array		hideItems
 */
WCF.ToggleOptions = function(element, showItems, hideItems) { this.init(element, showItems, hideItems); };
WCF.ToggleOptions.prototype = {
	/**
	 * target item
	 * 
	 * @var	jQuery
	 */
	_element: null,
	
	/**
	 * list of items to be shown
	 * 
	 * @var	array
	 */
	_showItems: [],
	
	/**
	 * list of items to be hidden
	 * 
	 * @var	array
	 */
	_hideItems: [],
	
	/**
	 * Initializes option toggle.
	 * 
	 * @param	string		element
	 * @param	array		showItems
	 * @param	array		hideItems
	 */
	init: function(element, showItems, hideItems) {
		this._element = $('#' + element);
		this._showItems = showItems;
		this._hideItems = hideItems;
		
		// bind event
		this._element.click($.proxy(this._toggle, this));
		
		// execute toggle on init
		this._toggle();
	},
	
	/**
	 * Toggles items.
	 */
	_toggle: function() {
		if (!this._element.attr('checked')) return;
		
		for (var $i = 0, $length = this._showItems.length; $i < $length; $i++) {
			var $item = this._showItems[$i];
			
			$('#' + $item).show();
		}
		
		for (var $i = 0, $length = this._hideItems.length; $i < $length; $i++) {
			var $item = this._hideItems[$i];
			
			$('#' + $item).hide();
		}
	}
};

/**
 * Namespace for all kind of collapsible containers.
 */
WCF.Collapsible = {};

/**
 * Simple implementation for collapsible content, neither does it
 * store its state nor does it allow AJAX callbacks to fetch content.
 */
WCF.Collapsible.Simple = {
	/**
	 * Initializes collapsibles.
	 */
	init: function() {
		$('.collapsible').each($.proxy(function(index, button) {
			this._initButton(button);
		}, this));
	},
	
	/**
	 * Binds an event listener on all buttons triggering the collapsible.
	 * 
	 * @param	object		button
	 */
	_initButton: function(button) {
		var $button = $(button);
		var $isOpen = $button.data('isOpen');
		
		if (!$isOpen) {
			// hide container on init
			$($button.data('collapsibleContainer')).hide();
		}
		
		$button.click($.proxy(this._toggle, this));
	},
	
	/**
	 * Toggles collapsible containers on click.
	 * 
	 * @param	object		event
	 */
	_toggle: function(event) {
		var $button = this._findElement($(event.target));
		if ($button === false) {
			return false;
		}
		
		var $isOpen = $button.data('isOpen');
		var $target = $('#' + $.wcfEscapeID($button.data('collapsibleContainer')));
		
		if ($isOpen) {
			$target.stop().wcfBlindOut('vertical', $.proxy(function() {
				this._toggleImage($button, 'wcf.global.closed');
			}, this));
			$isOpen = false;
		}
		else {
			$target.stop().wcfBlindIn('vertical', $.proxy(function() {
				this._toggleImage($button, 'wcf.global.opened');
			}, this));
			$isOpen = true;
		}
		
		$button.data('isOpen', $isOpen);
		
		// suppress event
		event.stopPropagation();
		return false;
	},
	
	/**
	 * Toggles image of target button.
	 * 
	 * @param	jQuery		button
	 * @param	string		image
	 */
	_toggleImage: function(button, image) {
		var $icon = WCF.Icon.get(image);
		var $image = button.find('img');
		
		if ($image.length) {
			$image.attr('src', $icon);
		}
	},
	
	/**
	 * Finds the anchor element (sometimes the image will show up as target).
	 * 
	 * @param	jQuery		element
	 * @return	jQuery
	 */
	_findElement: function(element) {
		if (element.getTagName() == 'a') {
			return element;
		}
		
		element = $(element.parent('a'));
		if (element.length == 1) {
			return element;
		}
		
		console.debug('[WCF.Collapsible.Simple] Could not find valid parent, aborting.')
		return false;
	}
};

/**
 * Holds userdata of the current user
 */
WCF.User = {
	/**
	 * UserID of the user
	 * 
	 * @var	integer
	 */
	userID: 0,
	
	/**
	 * Username of the user
	 * 
	 * @var	string
	 */
	username: '',
	
	/**
	 * Initializes userdata
	 * 
	 * @param	integer	userID
	 * @param	string	username
	 */
	init: function(userID, username) {
		this.userID = userID;
		this.username = username;
	}
};

/**
 * Namespace for effect-related functions.
 */
WCF.Effect = {};

/**
 * Creates a smooth scroll effect.
 */
WCF.Effect.SmoothScroll = function() { this.init(); };
WCF.Effect.SmoothScroll.prototype = {
	/**
	 * Initializes effect.
	 */
	init: function() {
		$('a[href=#top],a[href=#bottom]').click(function() {
			var $target = $(this.hash);
			if ($target.length) {
				var $targetOffset = $target.getOffsets().top;
				if ($targetOffset > $(document).height() - $(window).height()) {
					$targetOffset = $(document).height() - $(window).height();
					if ($targetOffset < 0) $targetOffset = 0;
				}
				
				$('html,body').animate({ scrollTop: $targetOffset }, 1200, function (x, t, b, c, d) {
					return -c * ((t=t/d-1)*t*t*t - 1) + b;
				});
				
				return false;
			}
		});
	}
};

/**
 * Creates a smooth scroll effect.
 */
WCF.Effect.BalloonTooltip = function() { this.init(); };
WCF.Effect.BalloonTooltip.prototype = {
	init: function() {
		// create empty div
		this.tooltip = $('<div style="position:absolute" id="balloonTooltip"></div>').appendTo(document.body).hide();
	
		// init elements
		$('.balloonTooltip').each($.proxy(this._initTooltip, this));
	},
	
	_initTooltip: function(index, element) {
		$(element).hover(
			$.proxy(this._mouseEnterHandler, this),	
			$.proxy(this._mouseLeaveHandler, this)
		);
		
		$(element).mousemove(
			$.proxy(this._mouseMoveHandler, this)	
		);
	},
	
	_mouseEnterHandler: function(event) {
		var $element = $(event.currentTarget);
		if ($element.attr('title')) {
			$element.data('tooltip', $element.attr('title'));
			$element.attr('title', '');
		
			this.tooltip.text($element.data('tooltip')).fadeIn('fast');
		}
	},
	
	_mouseLeaveHandler: function(event) {
		var $element = $(event.currentTarget);
		if ($element.data('tooltip')) {
			$element.attr('title', $element.data('tooltip'));
			$element.data('tooltip', '');
			
			this.tooltip.hide();
		}
	},
	
	/**
	 * Moves tooltip to cursor position.
	 */
	_mouseMoveHandler: function(event) {
		if ($(document).width() - event.pageX < this.tooltip.getDimensions().width) {
			this.tooltip.css({
				top: (event.pageY) + "px",
				right: ($(document).width() - event.pageX) + "px",
				left: "auto"
			});
		}
		else {
			this.tooltip.css({
				top: (event.pageY) + "px",
				left: (event.pageX + 15) + "px",
				right: "auto"
			});
		}
	}
};

/**
 * Basic implementation for WCF dialogs.
 */
$.widget('ui.wcfDialog', $.ui.dialog, {
	_init: function() {
		this.options.autoOpen = true;
		this.options.close = function(event, ui) {
			$(this).parent('.ui-dialog').wcfDropOut('down', $.proxy(function() {
				$(this).parent('.ui-dialog').empty().remove();
			}, this));
		};
		this.options.height = 'auto';
		this.options.minHeight = 0;
		this.options.modal = true;
		this.options.width = 'auto';
		
		$.ui.dialog.prototype._init.apply(this, arguments);
	}
});

/**
 * Basic implementation for WCF dialogs loading content
 * via AJAX before calling dialog itself.
 */
$.widget('ui.wcfAJAXDialog', $.ui.dialog, {
	/**
	 * Indicates wether callback was already executed
	 * 
	 * @var	boolean
	 */
	_callbackExecuted: false,
	
	/**
	 * Initializes AJAX-request to fetch content.
	 */
	_init: function() {
		if (this.options.ajax) {
			this._loadContent();
		}
		
		// force dialog to be placed centered
		this.options.position = {
			my: 'center center',
			at: 'center center'
		};
		
		// dialog should display a spinner-like image, thus immediately fire up dialog
		this.options.autoOpen = true;
		this.options.width = 'auto';
		this.options.minHeight = 80;
		
		// disable ability to move dialog
		this.options.resizable = false;
		this.options.draggable = false;
		
		this.options.modal = true;
		this.options.hide = {
			effect: 'drop',
			direction: 'down'
		};
		
		this.options.close = function(event, ui) {
			// loading ajax content seems to block properly closing
			$(this).parent('.ui-dialog').empty().remove();
		};
		
		if (this.options.preventClose) {
			this.options.closeOnEscape = false;
		}
		
		$.ui.dialog.prototype._init.apply(this, arguments);
		
		// remove complete node instead of removing node-by-node
		if (this.options.hideTitle && this.options.preventClose) {
			this.element.parent('.ui-dialog').find('div.ui-dialog-titlebar').empty().remove();
		}
		else {
			if (this.options.hideTitle) {
				// remove title element
				$('#ui-dialog-title-' + this.element.attr('id')).empty().remove();
			}
			
			if (this.options.preventClose) {
				// remove close-button
				this.element.parent('.ui-dialog').find('a.ui-dialog-titlebar-close').empty().remove();
			}
		}
	},
	
	/**
	 * Loads content via AJAX.
	 * 
	 * @todo	Enforce JSON
	 */
	_loadContent: function() {
		var $type = 'GET';
		if (this.options.ajax.type) {
			$type = this.options.ajax.type;
			
			if (this.options.ajax.type != 'GET' && this.options.ajax.type != 'POST') {
				$type = 'GET';
			}
		}
		
		var $data = this.options.ajax.data || {};
		
		$.ajax({
			url: this.options.ajax.url,
			context: this,
			dataType: 'json',
			type: $type,
			data: $data,
			success: $.proxy(this._createDialog, this),
			error: function(transport) {
				alert(transport.responseText);
			}
		});
	},
	
	/**
	 * Inserts content.
	 * 
	 * @param	string		data
	 */
	_createDialog: function(data) {
		data.ignoreTemplate = true;
		this.element.data('responseData', data);
		
		this.element.wcfGrow({
			content: data.template,
			parent: this.element.parent('.ui-dialog')
		}, {
			duration: 600,
			complete: $.proxy(function(data) {
				this.element.css({
					height: 'auto'
				});
				
				// prevent double execution due to two complete-calls (two times animate)
				if (this._callbackExecuted) {
					return;
				}
				
				this._callbackExecuted = true;
				
				this.element.removeClass('overlayLoading');
				this.element.html(this.element.data('responseData').template);
				
				if (this.options.ajax.success) {
					this.options.ajax.success();
				}
			}, this)
		});
	},
	
	/**
	 * Redraws dialog, should be executed everytime content is changed.
	 */
	redraw: function() {
		var $dimensions = this.element.getDimensions();
		
		if ($dimensions.height > 200) {
			this.element.wcfGrow({
				content: this.element.html(),
				parent: this.element.parent('.ui-dialog')
			}, {
				duration: 600,
				complete: function() {
					$(this).css({ height: 'auto' });
				}
			});
		}
	}
});

/**
 * Workaround for ids containing a dot ".", until jQuery UI devs learn
 * to properly escape ids ... (it took 18 months until they finally
 * fixed it!)
 * 
 * @see	http://bugs.jqueryui.com/ticket/4681
 */
$.widget('ui.wcfTabs', $.ui.tabs, {
	_init: function() {
		$.ui.dialog.prototype._init.apply(this, arguments);
	},
	
	_sanitizeSelector: function(hash) {
		return hash.replace(/([:\.])/g, '\\$1');
	}
});

/**
 * jQuery widget implementation of the wcf pagination.
 */
$.widget('ui.wcfPages', {
	SHOW_LINKS: 11,
	SHOW_SUB_LINKS: 20,
	
	options: {
		// vars
		activePage: 1,
		maxPage: 1,
		
		// icons
		previousIcon: RELATIVE_WCF_DIR + 'icon/previous1.svg',
		previousDisabledIcon: RELATIVE_WCF_DIR + 'icon/previous1D.svg',
		arrowDownIcon: RELATIVE_WCF_DIR + 'icon/dropDown1.svg',
		nextIcon: RELATIVE_WCF_DIR + 'icon/next1.svg',
		nextDisabledIcon: RELATIVE_WCF_DIR + 'icon/next1D.svg',
		
		// language
		// we use options here instead of language variables, because the paginator is not only usable with pages
		nextPage: null,
		previousPage: null,
	},
	
	/**
	 * Creates the pages widget.
	 */
	_create: function() {
		if (this.options.nextPage === null) this.options.nextPage = WCF.Language.get('wcf.global.page.next');
		if (this.options.previousPage === null) this.options.previousPage = WCF.Language.get('wcf.global.page.previous');
		
		this.element.addClass('pageNavigation');
		
		this._render();
	},
	
	/**
	 * Destroys the pages widget.
	 */
	destroy: function() {
		$.Widget.prototype.destroy.apply(this, arguments);
		
		this.element.children().remove();
	},
	
	/**
	 * Renders th pages widget.
	 */
	_render: function() {
		// only render if we have more than 1 page
		if (!this.options.disabled && this.options.maxPage > 1) {
			// make sure pagination is visible
			if (this.element.hasClass('hidden')) {
				this.element.removeClass('hidden');
			}
			this.element.show();
			
			this.element.children().remove();
			
			var $pageList = $('<ul></ul>');
			this.element.append($pageList);
			
			var $previousElement = $('<li></li>');
			$pageList.append($previousElement);
			
			if (this.options.activePage > 1) {
				var $previousLink = $('<a' + ((this.options.previousPage != null) ? (' title="' + this.options.previousPage + '"') : ('')) + '></a>');
				$previousElement.append($previousLink);
				this._bindSwitchPage($previousLink, this.options.activePage - 1);
				
				var $previousImage = $('<img src="' + this.options.previousIcon + '" alt="" />');
				$previousLink.append($previousImage);
			}
			else {
				var $previousImage = $('<img src="' + this.options.previousDisabledIcon + '" alt="" />');
				$previousElement.append($previousImage);
			}
			$previousElement.addClass('skip');
			
			// add first page
			$pageList.append(this._renderLink(1));
			
			// calculate page links
			var $maxLinks = this.SHOW_LINKS - 4;
			var $linksBefore = this.options.activePage - 2;
			if ($linksBefore < 0) $linksBefore = 0;
			var $linksAfter = this.options.maxPage - (this.options.activePage + 1);
			if ($linksAfter < 0) $linksAfter = 0;
			if (this.options.activePage > 1 && this.options.activePage < this.options.maxPage) $maxLinks--;
			
			var $half = $maxLinks / 2;
			var $left = this.options.activePage;
			var $right = this.options.activePage;
			if ($left < 1) $left = 1;
			if ($right < 1) $right = 1;
			if ($right > this.options.maxPage - 1) $right = this.options.maxPage - 1;
			
			if ($linksBefore >= $half) {
				$left -= $half;
			}
			else {
				$left -= $linksBefore;
				$right += $half - $linksBefore;
			}
			
			if ($linksAfter >= $half) {
				$right += $half;
			}
			else {
				$right += $linksAfter;
				$left -= $half - $linksAfter;
			}
			
			$right = Math.ceil($right);
			$left = Math.ceil($left);
			if ($left < 1) $left = 1;
			if ($right > this.options.maxPage) $right = this.options.maxPage;
			
			// left ... links
			if ($left > 1) {
				if ($left - 1 < 2) {
					$pageList.append(this._renderLink(2));
				}
				else {
					var $leftChildren = $('<li class="children"></li>');
					$pageList.append($leftChildren);
					
					var $leftChildrenLink = $('<a>&hellip;</a>');
					$leftChildren.append($leftChildrenLink);
					$leftChildrenLink.click($.proxy(this._startInput, this));
					
					var $leftChildrenImage = $('<img src="' + this.options.arrowDownIcon + '" alt="" />');
					$leftChildrenLink.append($leftChildrenImage);
					
					var $leftChildrenInput = $('<input type="text" class="inputText" name="pageNo" />');
					$leftChildren.append($leftChildrenInput);
					$leftChildrenInput.keydown($.proxy(this._handleInput, this));
					$leftChildrenInput.keyup($.proxy(this._handleInput, this));
					$leftChildrenInput.blur($.proxy(this._stopInput, this));
					
					var $leftChildrenContainer = $('<div></div>');
					$leftChildren.append($leftChildrenContainer);
					
					var $leftChildrenList = $('<ul></u>');
					$leftChildrenContainer.append($leftChildrenList);
					
					// render sublinks
					var $k = 0;
					var $step = Math.ceil(($left - 2) / this.SHOW_SUB_LINKS);
					for (var $i = 2; $i <= $left; $i += $step) {
						$leftChildrenList.append(this._renderLink($i, ($k != 0 && $k % 4 == 0)));
						$k++;
					}
				}
			}
			
			// visible links
			for (var $i = $left + 1; $i < $right; $i++) {
				$pageList.append(this._renderLink($i));
			}
			
			// right ... links
			if ($right < this.options.maxPage) {
				if (this.options.maxPage - $right < 2) {
					$pageList.append(this._renderLink(this.options.maxPage - 1));
				}
				else {
					var $rightChildren = $('<li class="children"></li>');
					$pageList.append($rightChildren);
					
					var $rightChildrenLink = $('<a>&hellip;</a>');
					$rightChildren.append($rightChildrenLink);
					$rightChildrenLink.click($.proxy(this._startInput, this));
					
					var $rightChildrenImage = $('<img src="' + this.options.arrowDownIcon + '" alt="" />');
					$rightChildrenLink.append($rightChildrenImage);
					
					var $rightChildrenInput = $('<input type="text" class="inputText" name="pageNo" />');
					$rightChildren.append($rightChildrenInput);
					$rightChildrenInput.keydown($.proxy(this._handleInput, this));
					$rightChildrenInput.keyup($.proxy(this._handleInput, this));
					$rightChildrenInput.blur($.proxy(this._stopInput, this));
					
					var $rightChildrenContainer = $('<div></div>');
					$rightChildren.append($rightChildrenContainer);
					
					var $rightChildrenList = $('<ul></ul>');
					$rightChildrenContainer.append($rightChildrenList);
					
					// render sublinks
					var $k = 0;
					var $step = Math.ceil((this.options.maxPage - $right) / this.SHOW_SUB_LINKS);
					for (var $i = $right; $i < this.options.maxPage; $i += $step) {
						$rightChildrenList.append(this._renderLink($i, ($k != 0 && $k % 4 == 0)));
						$k++;
					}
				}
			}
			
			// add last page
			$pageList.append(this._renderLink(this.options.maxPage));
			
			// add next button
			var $nextElement = $('<li></li>');
			$pageList.append($nextElement);
			
			if (this.options.activePage < this.options.maxPage) {
				var $nextLink = $('<a title="' + ((this.options.nextPage != null) ? (' title="' + this.options.nextPage + '"') : ('')) + '"></a>');
				$nextElement.append($nextLink);
				this._bindSwitchPage($nextLink, this.options.activePage + 1);
				
				var $nextImage = $('<img src="' + this.options.nextIcon + '" alt="" />');
				$nextLink.append($nextImage);
			}
			else {
				var $nextImage = $('<img src="' + this.options.nextDisabledIcon + '" alt="" />');
				$nextElement.append($nextImage);
			}
			$nextElement.addClass('skip');
		}
		else {
			// otherwise hide the paginator if not already hidden
			this.element.hide();
		}
	},
	
	/**
	 * Renders a page link
	 * 
	 * @parameter	integer		page
	 * 
	 * @return		$(element)
	 */
	_renderLink: function(page, lineBreak) {
		var $pageElement = $('<li></li>');
		if (lineBreak != undefined && lineBreak) {
			$pageElement.addClass('break');
		}
		if (page != this.options.activePage) {
			var $pageLink = $('<a>' + WCF.String.addThousandsSeparator(page) + '</a>'); 
			$pageElement.append($pageLink);
			this._bindSwitchPage($pageLink, page);
		}
		else {
			$pageElement.addClass('active');
			var $pageSubElement = $('<span>' + WCF.String.addThousandsSeparator(page) + '</span>');
			$pageElement.append($pageSubElement);
		}
		
		return $pageElement;
	},
	
	/**
	 * Binds the 'click'-event for the page switching to the given element.
	 * 
	 * @parameter	$(element)	element
	 * @paremeter	integer		page
	 */
	_bindSwitchPage: function(element, page) {
		var $self = this;
		element.click(function() {
			$self.switchPage(page);
		});
	},
	
	/**
	 * Switches to the given page
	 * 
	 * @parameter	Event		event
	 * @parameter	integer		page
	 */
	switchPage: function(page) {
		this._setOption('activePage', page);
	},
	
	/**
	 * Sets the given option to the given value.
	 * See the jQuery UI widget documentation for more.
	 */
	_setOption: function(key, value) {
		if (key == 'activePage') {
			if (value != this.options[key] && value > 0 && value <= this.options.maxPage) {
				// you can prevent the page switching by returning false or by event.preventDefault()
				// in a shouldSwitch-callback. e.g. if an AJAX request is already running.
				var $result = this._trigger('shouldSwitch', undefined, {
					nextPage: value,
				});
				
				if ($result) {
					this.options[key] = value;
					this._render();
					this._trigger('switched', undefined, {
						activePage: value,
					});
				}
				else {
					this._trigger('notSwitched', undefined, {
						activePage: value,
					});
				}
			}
		}
		else {
			this.options[key] = value;
			
			if (key == 'disabled') {
				if (value) {
					this.element.children().remove();
				}
				else {
					this._render()
				}
			}
			else if (key == 'maxPage') {
				this._render();
			}
		}
		
		return this;
	},
	
	/**
	 * Start input of pagenumber
	 * 
	 * @parameter	Event		event
	 */
	_startInput: function(event) {
		// hide a-tag
		var $childLink = $(event.currentTarget);
		if (!$childLink.is('a')) $childLink = $childLink.parent('a');
		
		$childLink.hide();
		
		// show input-tag
		var $childInput = $childLink.parent('li').children('input')
			.css('display', 'block')
			.val('');
		
		$childInput.focus();
	},
	
	/**
	 * Stops input of pagenumber
	 * 
	 * @parameter	Event		event
	 */
	_stopInput: function(event) {
		// hide input-tag
		var $childInput = $(event.currentTarget);
		$childInput.css('display', 'none');
		
		// show a-tag
		var $childContainer = $childInput.parent('li')
		if ($childContainer != undefined && $childContainer != null) {
			$childContainer.children('a').show();
		}
	},
	
	/**
	 * Handles input of pagenumber
	 * 
	 * @parameter	Event		event
	 */
	_handleInput: function(event) {
		var $ie7 = ($.browser.msie && $.browser.version == '7.0');
		if (event.type != 'keyup' || $ie7) {
			if (!$ie7 || ((event.which == 13 || event.which == 27) && event.type == 'keyup')) {
				if (event.which == 13) {
					this.switchPage(parseInt($(event.currentTarget).val()));
				}
				
				if (event.which == 13 || event.which == 27) {
					this._stopInput(event);
					event.stopPropagation();
				}
			}
		}
	}
});

/**
 * Encapsulate eval() within an own function to prevent problems
 * with optimizing and minifiny JS.
 * 
 * @param	mixed		expression
 * @returns	mixed
 */
function wcfEval(expression) {
	return eval(expression);
}
