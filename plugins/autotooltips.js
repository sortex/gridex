define(['jquery'], function ($) {

  function AutoTooltips(options) {
    var _grid;
    var _self = this;
    var _defaults = {
      maxToolTipLength: null
    };

    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _grid.onMouseEnter.subscribe(handleMouseEnter);
      _grid.onMouseLeave.subscribe(handleMouseLeave);
    }

    function destroy() {
      _grid.onMouseEnter.unsubscribe(handleMouseEnter);
      _grid.onMouseLeave.unsubscribe(handleMouseLeave);
    }

    function handleMouseEnter(e, args) {
      $('.ui-tooltip').remove();
      var cell = _grid.getCellFromEvent(e);
      if (cell) {
        var node = _grid.getCellNode(cell.row, cell.cell);
        if ($(node).innerWidth() < node.scrollWidth) {

          var text = $.trim( $(node).find('.title').length ? $(node).find('.title a:first').text() : $(node).text() );
          if (options.maxToolTipLength && text.length > options.maxToolTipLength) {
            text = text.substr(0, options.maxToolTipLength - 3) + "...";
          }
          $(node).attr("title", text).addClass('info');
        } else {
          $(node).attr("title", "");
        }
      }
    }

    function handleMouseLeave(e, args) {
       $('.ui-tooltip').remove();
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy
    });
  }

  return AutoTooltips;

});
