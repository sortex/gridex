define(['jquery', 'slickgrid/slick.core'], function ($, Slick) {

	/***
	 * A sample AJAX data store implementation
	 */
	function RemoteModel() {
		// private
		var PAGESIZE = 50;
		var data = {length: 0};
		var sortcol = null;
		var sortdir = 1;
		var h_request = null;
		var req = null; // ajax request
		var is_remote = true;

		// events
		var onDataLoading = new Slick.Event();
		var onDataLoaded = new Slick.Event();

		// query and form bind
		var url;
		var request_type;
		var the_post_data;
		var $formFilter;
		var filters = [];
		var parsedFilters;
		var csvVirtualColumns = [];

		function init() {
		}

		function isDataLoaded(from, to) {
			for (var i = from; i <= to; i ++) {
				if (data[i] == undefined || data[i] == null) {
					return false;
				}
			}

			return true;
		}

		function clear() {
			for (var key in data) {
				delete data[key];
			}
			data.length = 0;
		}

		function ensureData(from, to, post_data) {

			if (post_data) {
				the_post_data = post_data;
			}

			if (req && req.status) {
				req.abort();
				for (var i = req.fromPage; i <= req.toPage; i ++) {
					data[i * PAGESIZE] = undefined;
				}
			}

			if ( ! from || from < 0) {
				from = 0;
			}

			if ( ! to) {
				to = PAGESIZE;
			}

			var fromPage = Math.floor(from / PAGESIZE);
			var toPage = Math.floor(to / PAGESIZE);

			while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage) {
				fromPage ++;
			}

			while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage) {
				toPage --;
			}

			if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
				// TODO:  look-ahead
				return;
			}

			parseFilters();

			var endpoint = url + (url.match(/\?/) ? '&' : '?');
			endpoint += 'offset='+(fromPage * PAGESIZE) + '&limit=' + (((toPage - fromPage) * PAGESIZE) + PAGESIZE);

			if (sortcol) {
				endpoint += '&sort='+sortcol+'&order='+(sortdir > 0 ? 'asc' : 'desc');
			}

			if (parsedFilters) {
				endpoint += '&'+$.param(parsedFilters);
			}

			if (h_request != null) {
				clearTimeout(h_request);
			}

			h_request = setTimeout(function () {
				for (var i = fromPage; i <= toPage; i ++) {
					data[i * PAGESIZE] = null;
				} // null indicates a 'requested but not available yet'

				onDataLoading.notify({from: from, to: to});

				req = $.ajax({
					url: endpoint,
					data: the_post_data,
					dataType: 'json',
					type: request_type,
					success: function (resp) {
						onSuccess(resp, fromPage);
					},
					error: function (e, jqxhr, settings, exception) {
						// Handle different status codes
						if (jqxhr) {
							// Reload page if user has been logged-out
							if (jqxhr.status == 401) {
								window.location.reload();
								return;
							}
						}
						try {
							if ( ! jqxhr || ! jqxhr.readyState || ! jqxhr.responseText) return;
							onError(fromPage, toPage);
							// Try to parse errors
//							alert($.parseJSON(jqxhr.responseText).join('\n'));
						} catch (error) {
							// Otherwise show responseText
							alert(jqxhr.responseText);
						}
					}
				});
/*
				req = $.jsonp({
					url: url,
					callbackParameter: "callback",
					cache: true, // Digg doesn't accept the autogenerated cachebuster param
					success: onSuccess,
					error: function () {
						onError(fromPage, toPage)
					}
				});
				req.fromPage = fromPage;
				req.toPage = toPage;
*/
			}, 50);
		}

		function onError(fromPage, toPage) {
			alert("Error loading pages "+fromPage+" to "+toPage);
		}

		function onSuccess(resp, fromPage) {
			var from = fromPage * PAGESIZE, to = from + resp.payload.length;
			data.length = parseInt(resp.metadata.total);

			for (var i = 0; i < resp.payload.length; i++) {
				data[from+i] = resp.payload[i];
				data[from+i].index = from+i;
			}

			req = null;

			onDataLoaded.notify({from: from, to: to, response: resp});
		}

		function reloadData(from, to) {
			if ( ! from && ! to) {
				clear();
			} else {
				for (var i = from; i <= to; i ++) {
					delete data[i];
				}
			}

			ensureData(from, to);
		}

		function setSort(column, dir) {
			sortcol = column;
			sortdir = dir;
			clear();
		}

		function setFilters(arr) {
			filters = arr;
			clear();
		}

		function setUrl(a_url, a_request_type) {
			url = a_url;
			request_type = a_request_type || 'GET';
		}

		function setCsvVirtualColumns(csvVirtualColumns) {
			csvVirtualColumns = csvVirtualColumns;
		}

		function getCsvVirtualColumns(csvVirtualColumns) {
			csvVirtualColumns = csvVirtualColumns;
		}

		function getUrl() {
			return url;
		}

		function getRequestType() {
			return request_type || 'GET';
		}

		function bindForm($form) {
			$formFilter = $form;
			$formFilter.bind('submit.remotemodel', function () {
				clear();
				ensureData(0, 0);
				return false
			});
		}

		function getRequestQuery() {
			return the_post_data || parsedFilters;
		}

		/**
		 * Parses bind form inputs to query
		 */
		function parseFilters() {
			var filter_regex = /^bind\((.*)\)$/,
				filter, matches, selector, val, timestamp, $inp, type;

			// Empty filters
			parsedFilters = {};

			for (var i = 0, filter_count = filters.length; i < filter_count; i++) {
				filter = filters[i];
				if (filter_regex.test(filter[2])) {
					matches = filter_regex.exec(filter[2]);
					if (matches.length == 2) {
						selector = '[name="'+matches[1]+'"]';
						$inp = $formFilter.find('input'+selector+', select'+selector).eq(0);
						type = $inp.attr('type');
						val = $inp.val();

						// If field has been initialized with datepicker, change value to unix timestamp
						// TODO: Can this be better somehow?
						if (val && $inp.hasClass('hasDatepicker')) {
							timestamp = $.datepicker.parseDate('dd-mm-yy', val);
							// Convert to unix timestamp, adjusting to UTC timezone
							val = (timestamp.getTimezoneOffset() * -60) + (timestamp.getTime() / 1000);
						}

						// Use filter, unless it's an unchecked checkbox input or value is identical to placeholder
						if (val && val != $inp.attr('placeholder') && (type != 'checkbox' || $inp.is(':checked'))) {
							parsedFilters[filter[0]] = val;
						}
					}
				} else {
					parsedFilters[filter[0]] = filter[2];
				}
			}
			return parsedFilters;
		}

		init();

		return {
			// properties
			"data": data,
			"isRemote": is_remote,

			// binding methods
			"bindForm": bindForm,

			// methods
			"clear": clear,
			"isDataLoaded": isDataLoaded,
			"ensureData": ensureData,
			"reloadData": reloadData,
			"setSort": setSort,
			"setUrl": setUrl,
			"getUrl": getUrl,
			"setCsvVirtualColumns": setCsvVirtualColumns,
			"getCsvVirtualColumns": getCsvVirtualColumns,
			"getRequestType": getRequestType,
			"getRequestQuery": getRequestQuery,
			"setFilters": setFilters,

			// events
			"onDataLoading": onDataLoading,
			"onDataLoaded": onDataLoaded
		};
	}

	return RemoteModel;

});
