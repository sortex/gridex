define(['jquery', 'slickgrid/slick.core'], function ($, Slick) {

	/***
	 * Provides item metadata for group (Slick.Group) and totals (Slick.Totals) rows produced by the DataView.
	 * This metadata overrides the default behavior and formatting of those rows so that they appear and function
	 * correctly when processed by the grid.
	 *
	 * This class also acts as a grid plugin providing event handlers to expand & collapse groups.
	 * If "grid.registerPlugin(...)" is not called, expand & collapse will not work.
	 *
	 * @class GroupItemMetadataProvider
	 * @module Data
	 * @namespace Slick.Data
	 * @constructor
	 * @param options
	 */
	function GroupItemMetadataProvider(options) {
		var _grid;
		var _defaults = {
			groupCssClass: "slick-group",
			totalsCssClass: "slick-group-totals",
			groupFocusable: true,
			totalsFocusable: false,
			toggleCssClass: "slick-group-toggle",
			toggleExpandedCssClass: "expanded",
			toggleCollapsedCssClass: "collapsed",
			enableExpandCollapse: true
		};

		options = $.extend(true, {}, _defaults, options);

		function defaultGroupCellFormatter(row, cell, value, columnDef, item) {
			if (! options.enableExpandCollapse) {
				return item.title;
			}

			return "<span class='btn-grey "+options.toggleCssClass+"'><span class='icon "+(item.collapsed ? options.toggleCollapsedCssClass
				: options.toggleExpandedCssClass)+"'></span></span>"+item.title;
		}

		function defaultTotalsCellFormatter(row, cell, value, columnDef, item) {
			return (columnDef.groupTotalsFormatter && columnDef.groupTotalsFormatter(item, columnDef)) || "";
		}

		function init(grid) {
			_grid = grid;
			_grid.onClick.subscribe(handleGridClick);
			_grid.onKeyDown.subscribe(handleGridKeyDown);
		}

		function destroy() {
			if (_grid) {
				_grid.onClick.unsubscribe(handleGridClick);
				_grid.onKeyDown.unsubscribe(handleGridKeyDown);
			}
		}

		function handleGridClick(e, args) {
			var item    = this.getDataItem(args.row),
				$target = $(e.target);

			if (
				item && item instanceof Slick.Group
				&& ($target.hasClass(options.toggleCssClass) || $target.parent().hasClass(options.toggleCssClass))
			) {
				if (item.collapsed) {
					this.getData().expandGroup(item.value);
				} else {
					this.getData().collapseGroup(item.value);
				}

				e.stopImmediatePropagation();
				e.preventDefault();
			}
		}

		// TODO:  add -/+ handling
		function handleGridKeyDown(e, args) {
			if (options.enableExpandCollapse && (e.which == $.ui.keyCode.SPACE)) {
				var activeCell = this.getActiveCell();
				if (activeCell) {
					var item = this.getDataItem(activeCell.row);
					if (item && item instanceof Slick.Group) {
						if (item.collapsed) {
							this.getData().expandGroup(item.value);
						} else {
							this.getData().collapseGroup(item.value);
						}

						e.stopImmediatePropagation();
						e.preventDefault();
					}
				}
			}
		}

		function getGroupRowMetadata(item) {
			var columns = _grid.getColumns(),
				meta_columns = {
					0: {
						colspan: 1,
						formatter: defaultGroupCellFormatter,
						editor: null
					}
				};

			// Collecting all other fields
			for (var i = 1; i < columns.length; i ++) {
				meta_columns[i] = {
					colspan: 1,
					formatter: function (row, cell, value, columnDef, item) {
						return columnDef.groupTotalsFormatter ? columnDef.groupTotalsFormatter(item.totals, columnDef) : '';
					},
					editor: null
				}
			}

			return {
				selectable: false,
				focusable: options.groupFocusable,
				cssClasses: options.groupCssClass,
				columns: meta_columns
			};
		}

		function getTotalsRowMetadata(item) {
			return {
				selectable: false,
				focusable: options.totalsFocusable,
				cssClasses: options.totalsCssClass,
				formatter: defaultTotalsCellFormatter,
				editor: null
			};
		}

		return {
			"init": init,
			"destroy": destroy,
			"getGroupRowMetadata": getGroupRowMetadata,
			"getTotalsRowMetadata": getTotalsRowMetadata
		};
	}

	return GroupItemMetadataProvider;

});
