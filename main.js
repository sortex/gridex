/**
 * Datagrid module, Slickgrid helper
 *
 * @package    Sortex
 * @author     Sortex Systems Development Ltd.
 * @copyright  (c) 2011-2013 Sortex
 * @license    BSD
 * @link       http://www.sortex.co.il
 */
define([
	'jquery',
	'slickgrid/slick.grid',
	'./plugins/autotooltips',
	'./plugins/buttons',
	'./controls/columnpicker',
	'jqueryui',
	'jquery.pagination'
], function ($, SlickGrid, AutoTooltips, ButtonsColumn, SlickColumnPicker) {

	// Default datagrid plugin configuration
	var default_settings = {
		url: '',
		caption: '',
		model: null,
		defaultMinWidth: null,
		buttons: [],
		buttonsFormatter: false,
		footer: true,
		controls: true,
		enableRefresh: false,
		enableColumnPicker: true,
		enableTotals: false,
		pageSize: 15,
		iconClass: 'glyphicon',

		// Slickgrid options:
		rowHeight: 25,
		defaultColumnWidth: 80,
		enableTextSelectionOnCells: true,
		enableCellNavigation: false,
		autoHeight: false,
		forceFitColumns: true,
		editable: false,
		enableAddRow: false,
		disableScrollbar: true
	};

	var default_texts = {
		caption: null,
		export: 'Export',
		columns: 'Columns',
		filters: 'Filters',
		refresh: 'Refresh',
		columns_dialog_title: 'Columns',
		all: 'All',
		close: 'close',
		loading: 'Loading',
		no_results_msg: 'No Results',
		showing: 'Showing',
		of: 'of',
		rows: 'rows',
		tooltip_items_per_page: 'Items Per Page',
		tooltip_export: 'Export to CSV',
		tooltip_columns: 'Customize Columns',
		tooltip_filters: 'Toggle Filters'
	}, default_texts_translated = false;

	// ------------------------------------------------------- METHODS ---------------------------------------------------------

	var methods = {

		/**
		 * Init widget
		 *
		 * @param {Object} options User configuration
		 */
		init: function (options) {
			return this.each(function () {
				var $this    = $(this),
					data     = $this.data('datagrid');

				// Merge default settings
				options = $.extend({}, default_settings, options);
				options.columns = $.extend([], options.columns);
				options.buttons = $.extend([], options.buttons);

				if (options.disableScrollbar) {
					options.leaveSpaceForNewRows = true;
				}

				// Set automatic default settings for Slickgrid columns
				// Setting field as id if field is not present, and default minWidth
				$.each(options.columns, function (i, column) {
					if (column.field === undefined) {
						column.field = column.id;
					}
					if (options.defaultMinWidth && ! column.minWidth) {
						column.minWidth = options.defaultMinWidth;
					}
					if (column.sortable === undefined) {
						column.sortable = true;
					}
				});

				$this.addClass('datagrid');

				// If the plugin hasn't been initialized yet
				if ( ! data) {

					// Store target and settings within element data collection
					$this.data('datagrid', {
						target:   $this,
						settings: options,
						grid:     null,
						pager:    null,
						model:    null,
						picker:   null,
						indicate: false
					});

					methods.setup.apply(this, [ options ]);
				} else {
					data.settings = options;
				}

				methods.bind.call(this);
			});
		},

		/**
		 * Setup extra elements and bindings
		 *
		 * @param {Object} settings
		 */
		setup: function (settings) {
			var $this     = $(this),
				data      = $this.data('datagrid'),
				tooltips_direction = settings.is_rtl ? 'right' : 'left',
				$caption,
				$controls;

			// Translating all texts
			if (settings.polyglot) {
				if ( ! default_texts_translated)
				{
					var text;
					for (var txt in default_texts) {
						text = settings.texts[txt] === undefined ? default_texts[txt] : settings.texts[txt];
						default_texts[txt] = text ? settings.polyglot.t(text) : '';
					}
					default_texts_translated = true;
				}

				settings.texts = default_texts;

				if (settings.caption)
					settings.texts['caption'] = settings.polyglot.t(settings.caption);

				if (settings.no_results_msg)
					settings.texts['no_results_msg'] = settings.polyglot.t(settings.no_results_msg);
			}

			// Build caption div
			if (settings.caption) {
				$caption = $('<div />').addClass('grid-header')
					.append($('<label />').text(settings.texts.caption));
				$this.before($caption);
			}

			if (settings.footer) {
				data.status = $('<span class="slick-pager-status" />');
				$this.after($('<div class="slick-pager" />').append(data.status));
			}

			// Use underscore's debounce to postpone event execution
			// until after wait milliseconds have elapsed since the
			// last time it was invoked.
			$(window).bind('resize.datagrid', _.debounce(function() {
				data.grid.resizeCanvas();
			}, 500));

			if (settings.controls) {
				settings.$pageSize = $('<select class="page_size info" data-placement="'+tooltips_direction+'" title="'+(settings.texts.tooltip_items_per_page || '')+'"></select>').hide();
				$controls = $('<div />').addClass('grid-controls')
					.append(settings.$pageSize);

				if (settings.title && settings.title.length) {
					$('<h4 />').text(settings.title).prependTo($controls);
				}

				if (settings.enableBatchUpdate) {
					var $gridTopButtons = $('<div class="grid-top-buttons" />'),
						$batchUpdateBtn = $('<button class="batch-update btn btn-primary invisible">'+settings.batchUpdateButtonText+'</button>'),
						checkedCount = 0;

					// Setup "Batch Update" button
					$batchUpdateBtn.on('click', function() {
						var checkedValues = [];
						$this.find('.batch:checked').each(function() {
							checkedValues.push(this.value);
						});
						settings.onBatchUpdateClicked(checkedValues);
						return false;
					});

					// Setup batch update checkboxes
					$this.on('change', '.batch', function() {
						if (this.checked) {
							checkedCount++;
							if (checkedCount > 0) {
								$batchUpdateBtn.removeClass('invisible');
							}
						}
						else {
							checkedCount--;
							if ( ! checkedCount) {
								$batchUpdateBtn.addClass('invisible');
							}
						}
					});

					$gridTopButtons.append($batchUpdateBtn);
					$controls.append($gridTopButtons);
				}

				var title    = $('h1:first').text(),
					columns  = [],
					endpoint = settings.model.getUrl(),
					$slct    = $controls.find('select'),
					pageSize = settings.pageSize,
					csvVirtualColumns = settings.model.getCsvVirtualColumns();

				$.each([ pageSize, Math.ceil(pageSize*1.66), Math.ceil(pageSize*3.33), Math.ceil(pageSize*6.66), pageSize*10 ], function (i, val) {
					$slct.append('<option>'+val+'</option>');
				});

				// Add groupped-by field
				if (settings.model.getGroupGetter && settings.model.getGroupGetter()) {
					columns.push({ fld: settings.model.getGroupGetter(), name: settings.model.getGroupGetter().replace(/_/g, ' '), type: '' });
				}

				// Collect columns from settings
				$.each(settings.columns, function(i, column) {
					// Skip custom columns (like buttons)
					if (column.id.charAt(0) !== '_') {
						columns.push({ fld: column.field, name: column.name, type: column.type || '' });
					}
				});

				endpoint += endpoint.match(/\?/) ? '&' : '?';
				endpoint += 'format=csv&limit=4000';

				// Collect CSV columns
				$.each(csvVirtualColumns, function(i, column) {
					endpoint += '&virtual_fields[]='+column.id;
					columns.push({ fld: column.id, name: column.name, type: column.type || '' });
				});

				// Add list of columns
				endpoint += '&columns='+encodeURIComponent(JSON.stringify(columns));
				if (title) {
					endpoint += '&fn='+encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9א-ת_\-\(\)]/g, '_'));
				}

				var buttons_template = '<div class="btn-group">';

				// Add export button
				buttons_template += '<span><a href="#" class="info grid-icon export" data-placement="'+tooltips_direction+'" title="'+(settings.texts.tooltip_export || '')+'">'+(settings.texts.export || '')+'</a></span>';

				// Add column-picker button (only if more than 2 columns)
				if (settings.enableColumnPicker && columns.length > 2) {
					buttons_template += '<span><a href="#" class="info grid-icon columns" data-placement="'+tooltips_direction+'" title="'+(settings.texts.tooltip_columns || '')+'">'+(settings.texts.columns || '')+'</a></span>';
				}

				// Add filters toggle button (only if form.filter exists)
				var $filters = $('form.filter');
				if ($filters.length) {
					buttons_template += '<span><a href="#" class="info grid-icon filters" data-placement="'+tooltips_direction+'" title="'+(settings.texts.tooltip_filters || '')+'">'+(settings.texts.filters || '')+'</a></span>';
				}

				buttons_template += '</div>';

				// Add buttons to controls and set click actions
				$controls.prepend(buttons_template);

				$controls.find('a.export').attr('href', endpoint);

				if (settings.enableRefresh) {
					$controls.append('<button type="button" class="btn-grey refresh right">'+settings.texts.refresh+'</button>');
				}

				$controls.find('select.page_size').bind('change.datagrid', function () {
					var headerHeight = ($(data.grid.getHeaderRow())).height();
					data.settings.pageSize = parseInt($(this).val(), 10);
					$this.height(data.settings.pageSize * data.settings.rowHeight + headerHeight);
					data.grid.resizeCanvas();
					// Scroll to top, for page 1
					$(data.grid.getCanvasNode()).parent().scrollTop(0);
					// Ensure data for whole page, only for RemoteModel
					if (settings.model.ensureData) {
						settings.model.ensureData(0, data.settings.pageSize);
					}
					// Updating pagination
					if (data.pager) {
						data.pager.empty();
						methods.setup_pagination(data, data.settings.pageSize, data.pager.data('total_items'));
					}
				});

				if (settings.enableRefresh) {
					$controls.find('button.refresh').bind('click.datagrid', function () {
						if (settings.model.requery) {
							data.grid.setSortColumn();
							settings.model.requery();
						} else {
							settings.model.clear();
							settings.model.ensureData();
						}
					});
				}

				$controls.find('a.export').bind('click.datagrid', function () {
					var url = $(this).attr('href'),
						win_name = ($('h1:first').text() || '').replace(/\W{1,}/g, '_')+'_CSV',
						query;

					if (settings.model.getRequestQuery()) {
						query = settings.model.getRequestQuery();
						try {
							if (typeof query == 'string') {
								query = $.parseJSON(query);
							}
						} catch (ex) {
							// not a JSON
							return false;
						}
						url += '&'+decodeURIComponent($.param(query));
					}

					if (settings.grid_sort_uid) {

						// Get last sorting, but don't crash if invalid
						try {
							var storedSorting = localStorage[settings.grid_sort_uid];

							if (storedSorting) {
								var saved_sorting = JSON.parse(storedSorting);

								if (saved_sorting.sortCol) {
									url += '&sort='+saved_sorting.sortCol;
								}
								if (saved_sorting.sortAsc)
									url += '&order=ASC';
							}

						} catch (exception) {

						}
					}

					window.open(url, win_name);
					return false;
				});

				$controls.find('a.columns').bind('click.datagrid', function (e) {
					data.grid.onHeaderContextMenu.notify({ target: e.target }, e);
					return false;
				});

				$controls.find('a.filters').bind('click.datagrid', function (e) {
					$('#wrapper').toggleClass('with-filters');
					$filters.toggleClass('hidden');
					return false;
				});

				$this.before($controls);
				$this.before($filters);
			}

			/**
			 * Resize canvas height according to actual data rows (to prevent blank space)
			 *
			 * @param $grid
			 * @param dataLength
			 * @returns {number} - new height in pixels
			 */
			function resizeCanvasHeight($grid, dataLength) {
				var pageRows   = dataLength <= data.settings.pageSize ? dataLength : data.settings.pageSize,
					newHeight  = (pageRows*data.settings.rowHeight) || '50';

				$grid // grid-canvas
					.css('height', newHeight+'px');
				$grid.parent() // slick-viewport
					.css('height', newHeight+'px');
				$grid.parents('.datagrid:first') // datagrid container
					.css('height', 'auto');

				data.grid.resizeCanvas();

				return newHeight;
			}

			if (settings.model.isRemote) {

				settings.model.onDataLoading.subscribe(function () {
					//					log('RemoteModel.onDataLoading');
					if ( ! data.indicate) {
						data.indicate = $("<span class='loading-indicator'><label>"+settings.texts.loading+"...</label></span>").appendTo(document.body);
						data.indicate.css("position", "absolute");
					}

					data.indicate
						.css("top", $this.offset().top + $this.height() / 2 - data.indicate.height() / 2)
						.css("left", $this.offset().left + $this.width() / 2 - data.indicate.width() / 2)
						.show();
				});

				settings.model.onDataLoaded.subscribe(function (e, args) {
					//					log('RemoteModel.onDataLoaded');

					if ( ! data.grid) {
						data.indicate && data.indicate.remove();
						return;
					}

					var dataLength = data.grid.getDataLength();
					for (var i = args.from; i <= args.to; i ++) {
						data.grid.invalidateRow(i);
					}

					// Hide page size selector in case the minimum optional size is bigger than the results
					data.settings.controls &&
						data.settings.$pageSize[ dataLength > data.settings.$pageSize.find('option').first().val() ? 'show' : 'hide' ]();

					var $grid = $(data.grid.getCanvasNode());

					// Resize canvas height according to actual data rows
					resizeCanvasHeight($grid, dataLength);

					data.grid.updateRowCount();
					data.grid.render();

					if ( ! data.pager || data.pager.data('total_items') != dataLength) {
						//						log('** Total items changed!');
						// Scroll to top, for page 1
						$grid.parent().scrollTop(0);
						// Re-setup pagination
						methods.setup_pagination(data, data.pager ? data.pager.data('page_size') : data.settings.pageSize, dataLength);
					}

					data.indicate && data.indicate.fadeOut();

					// Create no-results message element
					if ( ! data.no_results_msg) {
						data.no_results_msg = $('<h2 class="no-data">'+settings.texts.no_results_msg+'</h2>')
							.appendTo($this.find('.grid-canvas'));
					}

					// Show no-results message when there are no results
					data.no_results_msg.css('display', args.to ? 'none' : 'block');
				});

			} else {
				// Build pager div
				//				data.pager = $('<div />').attr('id', this.id+'-pager');
				//				$this.after(data.pager);

				if (settings.enableTotals) {
					settings.showHeaderRow = true;
				}

				if ( ! settings.model) {
					// !!! TODO !!!
					//					settings.model = new Slick.Data.DataView();
				}

				settings.model.onPagingInfoChanged.subscribe(function (e, args) {
					//					log('DataView.onPagingInfoChanged');
				});

				settings.model.onRowCountChanged.subscribe(function (e, args) {
					//					log('DataView.onRowCountChanged: datagrid', settings);
					data.grid.updateRowCount();
					data.grid.render();
				});

				settings.model.onLoaded.subscribe(function () {
					var dataLength = data.grid.getDataLength(),
						$grid      = $(data.grid.getCanvasNode());

					// Resize canvas height according to actual data rows
					resizeCanvasHeight($grid, dataLength);
				});

				settings.model.onRowsChanged.subscribe(function (e, args) {
					//					log('DataView.onRowsChanged: datagrid', settings);
					data.grid.invalidateRows(args.rows);
					data.grid.render();

					var dataLength = data.grid.getDataLength(),
						$grid      = $(data.grid.getCanvasNode());

					// Resize canvas height according to actual data rows
					resizeCanvasHeight($grid, dataLength);

					if ( ! data.pager || data.pager.data('total_items') != dataLength) {
						//						log('** Total items changed!');
						// Scroll to top, for page 1
						$grid.parent().scrollTop(0);
						// Re-setup pagination
						methods.setup_pagination(data, data.pager ? data.pager.data('page_size') : data.settings.pageSize, dataLength);
					}
				});

				settings.model.onDataChanged.subscribe(function (e, args) {
					//					log('DataView.onDataChanged: datagrid');
					data.grid.invalidateAllRows();
					data.grid.render();
					if (settings.enableTotals) {
						methods.update_totals(data);
					}
				});

				settings.model.onEmptyResult.subscribe(function (e, args) {
					//					log('DataView.onEmptyResult: datagrid');
					methods.setup_pagination(data, data.pager ? data.pager.data('page_size') : data.settings.pageSize, 0);
				});
			}
		},

		default: function (params)
		{
			$.each(params, function (key, val)
			{
				default_settings[key] = val;
			})
		},

		/**
		 * Setup the pagination footer
		 *
		 * @param data         {Object}
		 * @param page_size    {Integer}
		 * @param dataLength   {Integer}
		 */
		setup_pagination: function (data, page_size, dataLength) {
			var vp     = data.grid.getViewport(),
				maxNumRows = vp.top + page_size,
				texts = data.settings.texts,
				status = dataLength > 3
					? texts.showing+' '+(dataLength > maxNumRows
							? (vp.top+1)+'-'+Math.min(maxNumRows, dataLength)+' '+texts.of+' '
							: ''
						)+dataLength+' '+texts.rows
					: '';

			data.status && data.status.text(status);

			page_size = parseInt(page_size, 10);
			if ( ! data.pager) {
				data.pager = $('<div />').addClass('pagination-container');
				data.status && data.status.after(data.pager);
			}
			data.pager.data('page_size', page_size);
			data.pager.data('total_items', dataLength);
			data.pager.pagination(dataLength, {
				current_page:   Math.floor(data.grid.getViewport().top / page_size),
				items_per_page: page_size,
				callback:       function(page, pagination) {
					var $vp       = $(data.grid.getCanvasNode()).parent(),
						scrollTop = page * page_size * data.settings.rowHeight;

					$vp.scrollTop(scrollTop);
					return false;
				},
				prev_text: '&laquo;',
				next_text: '&raquo;',
				prev_show_always: true,
				next_show_always: true
			});
		},

		update_pagination: function (data, viewport) {
			// Retrieve page_size from pager data attribute, when it is changed dynamically,
			// or from original settings.
			var page_size = data.grid.pager ? parseInt(data.pager.data('page_size'), 10) : data.settings.pageSize,
				canvas    = data.grid.getCanvasNode(),
				scrollTop = $(canvas).parent().scrollTop(),
				newPage   = Math.ceil(scrollTop / data.settings.rowHeight / page_size),
				vp = viewport || data.grid.getViewport(),
				dataLength = data.grid.getDataLength(),
				maxNumRows = vp.top + page_size,
				texts = data.settings.texts,
				status = dataLength > 0
					? texts.showing+" "+(vp.top+1)+"-"+ Math.min(maxNumRows, dataLength) +" "+texts.of+" " + dataLength + " "+texts.rows
					: '';

			data.status && data.status.text(status);

			if (data.pager && data.pager.data('current_page') != newPage) {
				// trigger pagination plugin, skip callback
				data.pager.trigger('setPage', [ newPage, true ]);
			}
		},

		update_totals: function (data) {
			var items = data.settings.model.getItems(),
				sum;

			for (var i = 0; i < data.settings.columns.length; i++) {
				if (data.settings.columns[i].id !== 'selector') {
					var header = data.grid.getHeaderRowColumn(data.settings.columns[i].id);
					if (header && i) {
						sum = 0;
						for (var j = 0; j < items.length; j++) {
							sum += parseInt(items[j][data.settings.columns[i].id] || 0);
						}
						sum = _.numberFormat(sum, 0);
						$(header).html(sum);
					} else if (header) {
						$(header).html('Total')
					}
				}
			}
		},

		/**
		 * Bind widget
		 */
		bind: function () {
			var $this     = $(this),
				data      = $this.data('datagrid'),
				settings  = data.settings;

			var model = settings.model;

			var sortCol;
			var sortdir;

			if (settings.buttons.length) {

				// Translate buttons labels
				if (settings.polyglot)
					for (var i in settings.buttons) {
						settings.buttons[i].label = settings.polyglot.t(settings.buttons[i].label);
					}

				var buttonsPlugin = new ButtonsColumn({
					iconClass: settings.iconClass,
					buttons: settings.buttons,
					buttonsFormatter: settings.buttonsFormatter
				});

				settings.columns.push(buttonsPlugin.getColumnDefinition());
			}

			if (settings.is_rtl)
				settings.columns = settings.columns.reverse();

			// Translate column titles
			if (settings.polyglot)
				for (var i in settings.columns) {
					settings.columns[i].name = settings.polyglot.t(settings.columns[i].name);
				}

			if (model.isRemote) {
				data.grid = new SlickGrid('#'+this.id, model.data, settings.columns, settings);

				data.grid.onViewportChanged.subscribe(function (e, args) {
					var vp = data.grid.getViewport();
					model.ensureData(vp.top, vp.bottom);

					methods.update_pagination(data, vp);
				});

				data.grid.onSort.subscribe(function (e, args) {
					model.setSort(args.sortCol.field, args.sortAsc ? 1 : - 1);
					var vp = data.grid.getViewport();
					model.ensureData(vp.top, vp.bottom);
				});

				data.grid.onViewportChanged.notify();

			} else {
				//				dataView.setPagingOptions({ pageSize: 10 });

				data.grid = new SlickGrid('#'+this.id, model, settings.columns, settings);
				//				pager = new Slick.Controls.Pager(model, data.grid, data.pager);

				data.grid.onViewportChanged.subscribe(function (e, args) {
					methods.update_pagination(data);
				});

				if (settings.enableTotals) {
					data.grid.onColumnsReordered.subscribe(function (e, args) {
						methods.update_totals(data);
					});
				}

				function comparer(a, b) {
					var x = a[sortCol.field], y = b[sortCol.field];
					//					log('comparer', sortCol, sortCol.type);
					if ( ! sortCol.type || sortCol.type == 'int') {
						x = parseInt(x);
						y = parseInt(y);
					}
					//					log(x, y, (x == y ? 0 : (x > y ? 1 : - 1)));
					return (x == y ? 0 : (x > y ? 1 : - 1));
				}

				data.grid.onSort.subscribe(function (e, args) {
					switch (args.sortCol.type) {
						case 'date':
							break;

						default:
					}
					sortdir = args.sortAsc ? 1 : - 1;
					sortCol = args.sortCol;

					// Cache the sorted column, for example group comparers can use this information
					model.setSortInfo(sortCol, sortdir);

					if ($.browser.msie && $.browser.version <= 8) {
						// more limited and does lexicographic sort only by default, but can be much faster
						// use numeric sort of % and lexicographic for everything else
						model.fastSort(sortCol.field, args.sortAsc);
					} else {
						// using native sort with comparer
						// preferred method but can be very slow in IE with huge datasets
						model.sort(comparer, args.sortAsc);
					}
				});
			}

			if (settings.enableColumnPicker) {
				data.picker = new SlickColumnPicker(settings.columns, data.grid, settings, $this.attr('id'));
			}

			if (settings.buttons.length) {
				data.grid.registerPlugin(buttonsPlugin);
			}

			// Set AutoToolTips plugin to show slickgrid tooltips when cell text is cut
			data.grid.registerPlugin(new AutoTooltips());
		},

		/**
		 * Destroy datagrid widget
		 */
		destroy: function () {
			return this.each(function () {

				var $this = $(this),
					data = $this.data('datagrid');

				// Un-binding events by namespace
				$(window).unbind('.datagrid');

				if (data) {

					// Removing controls
					data.pager && data.pager.remove();
					data.pager = null;

					data.indicate && data.indicate.remove();
					data.indicate = null;

					if (data.settings.controls) {
						$this.prev('.grid-controls').remove();
					}

					if (data.settings.footer) {
						$this.next('.slick-pager').remove();
					}

					// Destroying datagrid
					data.grid && data.grid.destroy();
					data.grid = null;

					// Emptying target element
					$this.empty();
					$this.removeClass('datagrid');

					// Emptying data collections
					data.response = null;
					data.target = null;
				}

				// Removing data collections
				$this.removeData('datagrid');
			});
		},

		/**
		 * Refresh data
		 *
		 * @param {Object} settings  Override element's stored settings
		 */
		refresh: function (settings) {
			var $this     = $(this),
				data      = $this.data('chart');

		},

		/**
		 * Flag filtered columns
		 * - Finding filtered columns of $form
		 * - Adding 'slick-header-column-filtered' class to datagrid columns
		 *
		 * @param settings
		 * - filter_form          - filter form
		 * - filters_columns_map  - filter to column map names (e.g. schedule_date_from (input) -> schedule_date (column))
		 */
		flag_filtered_columns: function (settings) {

			if ( ! settings.filter_form || ! settings.filters_columns_map) { return false; }

			var $filter_elements = settings.filter_form.find('input:text, input:checked, select').filter(function() {
					// Get only inputs with real value (not placeholder value)
					return this.value && this.value != $(this).attr('placeholder')
				}),
				$grid_columns = $(this).find('.slick-header-column'),
				filtered_columns = {},
				_filtered_column;

			// Prepare filtered columns names array
			if ($filter_elements) {
				$.each($filter_elements, function() {
					_filtered_column = settings.filters_columns_map[$(this).attr('name')];
					if (_filtered_column) {
						if ($.isArray(_filtered_column)) {
							// Sometimes input filters more then 1 columns (e.g. name -> name, description) - flag all used columns
							$.each(_filtered_column, function(i, single_column) {
								filtered_columns[single_column] = true;
							});
						}
						else {
							filtered_columns[_filtered_column] = true;
						}
					}
				});
			}

			// Clear filtered class for all columns
			$grid_columns.removeClass('slick-header-column-filtered');

			// add filtered class for filtered columns
			if (filtered_columns) {
				$grid_columns
					.filter(function() {
						return filtered_columns[$(this).data('column').id];
					})
					.addClass('slick-header-column-filtered');
			}
		}

	};

	/**
	 * Datagrid plugin
	 *
	 * @param method
	 */
	$.fn.datagrid = function (method) {

		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else {
			if (typeof method === 'object' || ! method) {
				return methods.init.apply(this, arguments);
			} else {
				$.error('Method '+method+' does not exist on jQuery.datagrid');
			}
		}
	};

});
