/***
 * Contains basic SlickGrid formatters.
 * @module Formatters
 * @namespace Slick
 */

define(['jquery', 'moment', 'underscore'], function ($, moment, _) {

	/**
	 * @return {String}
	 */
	function PercentCompleteFormatter(row, cell, value, columnDef, dataContext) {
		if (value == null || value === "") {
			return "-";
		} else {
			if (value < 50) {
				return "<span style='color:red;font-weight:bold;'>"+value+"%</span>";
			} else {
				return "<span style='color:green'>"+value+"%</span>";
			}
		}
	}

	/**
	 * @return {String}
	 */
	function PercentCompleteBarFormatter(row, cell, value, columnDef, dataContext) {
		if (value == null || value === "") {
			return "";
		}

		var color;

		if (value < 30) {
			color = "red";
		} else {
			if (value < 70) {
				color = "silver";
			} else {
				color = "green";
			}
		}

		return "<span class='percent-complete-bar' style='background:"+color+";width:"+value+"%'></span>";
	}

	/**
	 * @return {String}
	 */
	function NumberFormat(row, cell, value, columnDef, dataContext) {
		return _.numberFormat(value, 0);
	}

	/**
	 * @return {String}
	 */
	function YesNoFormatter(row, cell, value, columnDef, dataContext) {
		return value == '1' ? "Yes" : "No";
	}

	/**
	 * @return {String}
	 */
	function EmailFormatter(row, cell, value, columnDef, dataContext) {
		return value ? '<a href="mailto:'+value+'" class="mailto">'+value+'</a>' : '';
	}

	/**
	 * @return {String}
	 */
	function TooltipFormatter(row, cell, value, columnDef, dataContext) {
		var maxlength = columnDef.maxlength || 30;
		return value.length > maxlength ? '<span class="info" title="'+value+'">'+value.substr(0,maxlength)+'...</span>' : value;
	}

	/**
	 * @return {String}
	 */
	function CheckmarkFormatter(row, cell, value, columnDef, dataContext) {
		return value ? "<img src='"+window.pass.url.media+"img/slickgrid/tick.png'>" : "";
	}

	/**
	 * @return {String}
	 */
	function xvIcon(row, cell, value, columnDef, dataContext) {
		var icon = value == '1' ? 'v' : 'x';
		return '<div class="text-center"><span class="icon-'+icon+'">'+value+'</span></div>';
	}

	/**
	 * @return {String}
	 */
	function DateFormatter(row, cell, value, columnDef, dataContext) {
		var parse = columnDef.parse || '@',
			format = columnDef.format || window.pass.dates.datetimeFormat;

		if (columnDef.timezone_offset)
		{
			value = parseInt(value, 0) + parseInt(columnDef.timezone_offset, 0);
		}

		// Unix time is stored in seconds while Javascript uses milliseconds
		if (parse == '@' && value) {
			value *= 1000;
		}

		return value ? moment.utc(value).format(format) : '--';
	}

	// Defining dividends / devisors for percent formatter
	// Example: { sent = 100, success = 55 -> percent = success/sent*100 = 55(%) }
	var dividends_devisors = {
		success:       [ 'success',       'sent' ],
		failed:        [ 'failed',        'sent' ],
		opens:         [ 'opens',         'success' ],
		clicks:        [ 'clicks',        'opens' ],
		hard_bounces:  [ 'hard_bounces',  'sent' ],
		soft_bounces:  [ 'soft_bounces',  'sent' ],
		unsubscribes:  [ 'unsubscribes',  'success' ],
		complaints:    [ 'complaints',    'success' ],
		unique_clicks: [ 'unique_clicks', 'opens' ],
		ctr:           [ 'clicks',        'success' ]
	};

	/**
	 * @return {String}
	 */
	function PercentFormatter(row, cell, value, columnDef, dataContext) {
		var dividend = parseInt(dataContext[dividends_devisors[columnDef.field][0]], 10),
			divisor  = parseInt(dataContext[dividends_devisors[columnDef.field][1]], 10),
			quotient = parseFloat(divisor ? (dividend * 100.0 / divisor).toFixed(1) : 0);

		// For fields without values (only percents, i.e. ctr)
		if (value === undefined) { return quotient ? _.numberFormat(quotient, 0)+'%' : '0.0%' }

		value = parseInt(value, 10);

		return value ? _.numberFormat(value, 0)+' ('+_.numberFormat(quotient, 0)+'%)' : '0 (0.0%)';
	}

	/**
	 * @return {String}
	 */
	function GroupSumTotalsFormatter(totals, columnDef) {
		var value = totals.sum[columnDef.field];
		if (dividends_devisors[columnDef.field]) {
			var dividend = parseInt(totals.sum[dividends_devisors[columnDef.field][0]], 10),
				divisor  = parseInt(totals.sum[dividends_devisors[columnDef.field][1]], 10),
				quotient = parseFloat(divisor ? (dividend * 100.0 / divisor).toFixed(1) : 0);

			// For fields without values (only percents, i.e. ctr)
			if (value === undefined) { return quotient ? _.numberFormat(quotient, 0)+'%' : '0.0%' }

			value = value ? _.numberFormat(value, 0)+' ('+_.numberFormat(quotient, 0)+'%)' : '0 (0.0%)';
		} else {
			value = _.numberFormat(value, 0);
		}

		return value;
	}

	/**
	 * @return {String}
	 */
	function NumberFormatter(row, cell, value, columnDef, dataContext) {
		return parseFloat(value, 10).toFixed(columnDef.precision).replace(/\.?0+$/, "");
	}

	/**
	 * @return {String}
	 */
	function FloorPercent(row, cell, value, columnDef, dataContext) {
		return Math.floor(value)+'%';
	}

	/**
	 * @return {String}
	 */
	function FavoriteFormatter(row, cell, value, columnDef, dataContext) {
		var href = window.pass.url.base+columnDef.href+'/'+dataContext.id,
			title = value == '1' ? 'Unset Favorite' : 'Set as Favorite';

		return '<div class="btn-group"><a href="'+href+'" class="info icon favorite state-'+value+'" title="'+title+'"></a></div>';
	}

	/**
	 * @return {String}
	 */
	function formatStatusIcon(row, cell, value, columnDef, dataContext) {
		return value ? '<div class="status_icon status_'+dataContext.status+' info" title="'+value+'"></div>' : '';
	}

	// Utilities ****************************************************************************

	function rmBubbleEvt(e) {
		e = e || event;
		e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
	}

	return {
		"PercentComplete": PercentCompleteFormatter,
		"PercentCompleteBar": PercentCompleteBarFormatter,
		"NumberFormat": NumberFormat,
		"YesNo": YesNoFormatter,
		"Checkmark": CheckmarkFormatter,
		"xvIcon": xvIcon,
		"Date": DateFormatter,
		"Email": EmailFormatter,
		"Tooltip": TooltipFormatter,
		"PercentFormatter": PercentFormatter,
		"NumberFormatter": NumberFormatter,
		"FloorPercent": FloorPercent,
		"Favorite": FavoriteFormatter,
		"GroupSumTotalsFormatter": GroupSumTotalsFormatter,
		"StatusIcon": formatStatusIcon,

		// Utilities
		"rmBubbleEvt": rmBubbleEvt
	};

});
