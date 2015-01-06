define(['jquery', 'jquery.cookie'], function ($) {

	function SlickColumnPicker(columns, grid, options, identifier) {
		var $menu;
		var columnCheckboxes;
		var the_columns = $.extend([], columns);
		var total_visible_columns = 0;
		var uniqueId = identifier || window.location.pathname+window.location.hash;
		var saved_state = $.cookie(uniqueId);

		var defaults = {
			fadeSpeed: 500,
			enableGridOptions: false
		};

		function init() {
			grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
			options = $.extend({}, defaults, options);

			$menu
				= $('<span class="slick-columnpicker" style="display:none;position:absolute" />');

			// Add the fake 'All' column
			the_columns.unshift({ id: '_all', name: options.texts.all });

			if (saved_state && saved_state.indexOf(',') > -1) {
				var visible_ids = saved_state.split(',');
				var visibleColumns = [];
				// Skip "All" fake column (for starts from 1)
				for (var i = 1; i < the_columns.length; i ++) {
					// Always add internal columns (like _button_handler) or a selected column
					if (the_columns[i].id.charAt(0) == '_' || jQuery.inArray(the_columns[i].id, visible_ids) > -1) {
						visibleColumns.push(the_columns[i]);
					}
				}
				grid.setColumns(visibleColumns);
			}
		}

		function handleHeaderContextMenu(e, args) {
			var $ul, $li, $input,
				all_is_checked   = true;

			e.preventDefault();

			$menu.stop().remove().empty();
			$menu.bind('click', updateColumn);

			if (e.type =='contextmenu') {
				$menu.bind('mouseleave', function (e) {
					$(this).fadeOut(options.fadeSpeed)
				});
			}

			columnCheckboxes = [];

			$('<a class="icon remove">'+options.texts.close+'</a>').click(function () {
				$menu.fadeOut(options.fadeSpeed);
				return false;
			}).appendTo($menu);

			$('<h2 />').html(options.texts.columns_dialog_title).appendTo($menu);

			$ul = $('<ul />');
			$ul.appendTo($menu);

			for (var i = 0; i < the_columns.length; i ++) {
				$li = $("<li />");
				if (the_columns[i].pickable === undefined || the_columns[i].pickable) {
					$li.appendTo($ul);
					// Keep a total sum of visible columns
					++total_visible_columns;
				}

				$input = $("<input type='checkbox' />").data('column-id', the_columns[i].id);
				columnCheckboxes.push($input);

				// Make sure we handle 'All'
				if (i) {
					if (grid.getColumnIndex(the_columns[i].id) != null) {
						$input.attr("checked", "checked");
					} else {
						all_is_checked = false;
					}
				}

				$("<label />").text(the_columns[i].name).prepend($input).appendTo($li);
			}

			columnCheckboxes[0].prop('checked', all_is_checked);

			if (options.enableGridOptions) {
				$("<hr/>").appendTo($menu);
				$li = $("<li />").appendTo($menu);
				$input = $("<input type='checkbox' />").data("option", "autoresize");
				$("<label />").text("Force fit columns").prepend($input).appendTo($li);
				if (grid.getOptions().forceFitColumns) {
					$input.attr("checked", "checked");
				}

				$li = $("<li />").appendTo($menu);
				$input = $("<input type='checkbox' />").data("option", "syncresize");
				$("<label />").text("Synchronous resize").prepend($input).appendTo($li);
				if (grid.getOptions().syncColumnCellResize) {
					$input.attr("checked", "checked");
				}
			}

			$menu.css({ top: 0, left: 0, display: 'block', visibility: 'hidden' }).appendTo(document.body);
			var actualWidth = $menu[0].offsetWidth,
				actualHeight = $menu[0].offsetHeight,
				viewportWidth = $(window).width(),
				viewportHeight = $(window).height() + $(window).scrollTop(),
				padding = 10,
				x = e.pageX,
				y = e.pageY;

			if (e.type == 'click') {
				x += e.target.offsetLeft + e.target.offsetWidth;
				y += e.target.offsetTop + e.target.offsetHeight;
			}

			if (x + actualWidth > viewportWidth) {
				x = viewportWidth - actualWidth - padding;
			}

			if (y + actualHeight > viewportHeight) {
				y = viewportHeight - actualHeight - padding;
			}

			$menu.css({ display: 'none', visibility: 'visible', opacity: 1 }).css('top', y).css('left', x).fadeIn(options.fadeSpeed);
		}

		function updateColumn(e) {
			var $target = $(e.target);

			if (options.enableGridOptions) {
				if ($target.data("option") == "autoresize") {
					if (e.target.checked) {
						grid.setOptions({forceFitColumns: true});
						grid.autosizeColumns();
					} else {
						grid.setOptions({forceFitColumns: false});
					}
					return;
				}

				if ($target.data("option") == "syncresize") {
					if (e.target.checked) {
						grid.setOptions({syncColumnCellResize: true});
					} else {
						grid.setOptions({syncColumnCellResize: false});
					}
					return;
				}
			}

			if ($target.is(':checkbox')) {

				// Check if 'all' was pressed
				if ($target.data('column-id') == '_all') {
					var toggle_on = $target.is(':checked');
					// Deselect or select all checkboxes according to 'All' state
					$(this).find('input').each(function () {
						$(this).prop('checked', toggle_on);
					});
				}

				var visibleColumns = [],
					visibleIds     = [];

				$.each(columnCheckboxes, function (i, e) {
					// Dont make fake "All" column visible
					if ($(this).data('column-id') != '_all'
							// Always add internal columns (like _button_handler) or a selected column
						&& (the_columns[i].id.charAt(0) == '_' || $(this).is(':checked'))
					) {
						visibleColumns.push(the_columns[i]);
						visibleIds.push(the_columns[i].id);
					}
				});

				// Deselect or select "All"
				if ($target.data('column-id') != '_all') {
					columnCheckboxes[0].prop('checked', visibleColumns.length == total_visible_columns);
				}

				//				if ( ! visibleColumns.length) {
				//					$target.prop('checked', true);
				//					return;
				//				}

				// Save column state in cookie
				$.cookie(uniqueId, visibleIds, { expires: 730 });

				grid.setColumns(visibleColumns);
			}
		}

		init();
	}

	return SlickColumnPicker;

});
