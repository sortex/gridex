define(['jquery'], function ($) {

	function ButtonsColumn(options) {
		var _grid;
		var _self = this;
		var _defaults = {
			columnId: '_buttons_handler',
			cssClass: null,
			toolTip: 'Actions',
			iconWidth: 26,
			margin: 11,
			buttons: [],
			primaryKey: 'id',
			buttonsFormatter: false
		};

		// Calculate icons width by icons that doesn't use deactivate or undelete classes
		_defaults.width = _defaults.iconWidth * (options.buttons.filter(function(el){return ! el.class.match("deactivate|undelete")}).length) + _defaults.margin;

		var _options = $.extend(true, {}, _defaults, options);

		var _buttons = '';
		$.each(_options.buttons, function (i, button) {
			_buttons += '<span><a href="#" class="info '+(button.title ? '' : options.iconClass)+' '+button['class']+'" rel="'+(button.rel || button['class'])+'" '+(button.label ? 'title="'+button.label+'"' : '')+' data-index="'+i+'">'+(button.title ? button.title : '&nbsp;')+'</a></span>';
		});

		var _ctrls = $('<div />').append(_buttons);

		function init(grid) {
			_grid = grid;
			var $canvas = $(_grid.getCanvasNode());

			if (_options.buttons.length > 1) {
				_grid.onMouseEnter.subscribe(handleEnter);
				_grid.onMouseLeave.subscribe(handleLeave);

			} else {
				$canvas.on('click', 'a.'+options.iconClass, function () {
					var $btn     = $(this),
						btn_def  = _options.buttons[$btn.data('index')],
						id       = $btn.parent().parent().data('pk'),
						click    = btn_def.click,
						callback = btn_def.callback;

					// Call supplied click function, and send supplied callback as well
					if ($.isFunction(click)) {
						return click.apply(this, [ id, callback || false, {} ]);
					}
					return false;
				});
			}
		}

		function destroy() {
			if (_options.buttons.length > 1) {
				_grid.onMouseEnter.unsubscribe(handleEnter);
				_grid.onMouseLeave.unsubscribe(handleLeave);
			} else {
				$(_grid.getCanvasNode()).off('click', 'a.'+options.iconClass).tooltip('hide');
			}
		}

		function handleEnter(e) {
			var cell  = _grid.getCellFromEvent(e),
				$cell = $(_grid.getCellNode(cell.row, cell.cell)),
				$toggle;

			if ( ! $cell.length) return null;

			$toggle = $cell.parent('.slick-row').find('a.handler:first');

			if ($toggle.hasClass('handler') && ! $toggle.data('expand')) {
				// See if there's a button strip next to the handler,
				var $btns    = $toggle.next(),
					// Grab record data context
					dataContext = _grid.getDataItem(cell.row);

				if ( ! dataContext) return;

				$toggle.data('expand', true);

				// Clone button strip if it was never expanded
				if ($btns.length) {
					$toggle.hide();
					$btns.show();
				} else {
					$btns = _ctrls.clone();

					// Run pre-formatter
					if ($.isFunction(_options.buttonsFormatter)) {
						_options.buttonsFormatter.apply($btns[0], [ dataContext, $toggle ]);
					}

					// Inject button strip into DOM
					$toggle.after($btns);
					$toggle.hide();

					// Setup href if needed
					$btns.find('a').each(function () {
						var $this = $(this),
							index = $this.data('index');

						// Add href attribute to anchors from options
						if (_options.buttons[index].href) {
							$this.attr('href', parseVariables(_options.buttons[index].href, dataContext));
						}
					});

					// Bind onclick to each icon button
					$btns.find('a').bind('click.datagrid', function (event) {
						var $btn     = $(this),
							btn_def  = _options.buttons[$btn.data('index')],
							$handler = $btn.parent().parent().siblings('.handler'),
							id       = $handler.data('pk'),
							row      = $handler.data('row'),
							click    = btn_def.click,
							callback = btn_def.callback;

						// Call supplied click function, and send supplied callback as well
						if ($.isFunction(click)) {
							return click.apply(this, [ id, callback || false, row, event ]);
						}
					});
				}

				$toggle.removeClass('on').addClass('off');
			}
		}

		/**
		 * Parse any {{tags}} with
		 *
		 * @param str         {String}
		 * @param dataContext {Object}
		 * @return string
		 */
		function parseVariables(str, dataContext) {
			var re     = /\{\{(\w*)\}\}/g,
				parsed = str,
				match;
			// Replace any {tags} with data from row context
			while (match = re.exec(str)) {
				parsed = parsed.replace(match[0], dataContext[match[1]]);
			}
			return parsed;
		}

		function handleLeave(e) {
			$('.btn-group div:visible', _grid.getCanvasNode()).each(function () {
				var $this = $(this);
				$this.hide().prev()
					.css({ display: 'block', width: '', opacity: 1 })
					.removeData('expand', '')
					.removeClass('off').addClass('on');
			});
		}

		function getColumnDefinition() {
			return {
				id: _options.columnId,
				name: 'Actions',
				toolTip: _options.toolTip,
				field: 'sel',
				width: _options.width,
				focusable: false,
				resizable: false,
				sortable: false,
				pickable: false,
				cssClass: _options.cssClass,
				formatter: buttonHandlerFormatter
			};
		}

		function buttonHandlerFormatter(row, cell, value, columnDef, dataContext) {
			if ( ! dataContext) return null;

			if (_options.buttons.length == 1) {
				var html = _ctrls.html();
				// Add href attribute to anchors from options
				if (_options.buttons[0].href) {
					// Dirty but fast:
					html = html.replace('"#"', '"'+parseVariables(_options.buttons[0].href, dataContext)+'"');
				}
				return '<div class="btn-group" data-pk="'+dataContext[_options.primaryKey]+'">'+html+'</div>';
			} else {
				return '<div class="btn-group"><a href="javascript:void(0)" class="handler on '+options.iconClass+' expand" data-row="'+row+'" data-pk="'+dataContext[_options.primaryKey]+'"></a></div>';
			}
		}

		$.extend(this, {
			"init": init,
			"destroy": destroy,

			"getColumnDefinition": getColumnDefinition
		});
	}

	return ButtonsColumn;

});
