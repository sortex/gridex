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
        var node  = _grid.getCellNode(cell.row, cell.cell),
            $node = $(node);

        // In case cell's text width is wider than the column, OR cell's text includes a break
        if ($node.innerWidth() < node.scrollWidth || $node.text().indexOf('\n') >= 0) {

          // Check for '.title' element's first link text
          var text = $.trim($node.find('.title').length
            // Use it as text if exists
              ? $node.find('.title a:first').text()
            // Otherwise use all cell's text
              : $node.text());

          if (options.maxToolTipLength && text.length > options.maxToolTipLength) {
            text = text.substr(0, options.maxToolTipLength - 3) + "...";
          }

          // Replace '\n' to '<br />' in tool tip
          text = text.replace(/\n/g,'<br />');

          $(node).attr("data-title", text).addClass('info');
        } else {
          $(node).attr("data-title", "");
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
