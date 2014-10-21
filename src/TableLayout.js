/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2014
 */

/*global define*/

/**
 * Lays out a collection of renderables from top to bottom or left to right.
 *
 * |options|type|description|
 * |---|---|---|
 * |`[itemSize]`|Number|Height or width in pixels of the list-item|
 *
 * Example:
 *
 * ```javascript
 * var ListLayout = require('famous-flex/layouts/ListLayout');
 *
 * new LayoutController({
 *   layout: ListLayout,
 *   layoutOptions: {
 *     itemSize: 40,         // item has height of 40 pixels
 *   },
 *   dataSource: [
 *     new Surface({content: 'item 1'}),
 *     new Surface({content: 'item 2'}),
 *     new Surface({content: 'item 3'})
 *   ]
 * })
 * ```
 * @module
 */
define(function(require, exports, module) {

    // import dependencies
    var Utility = require('famous/utilities/Utility');

    // Define capabilities of this layout function
    var capabilities = {
        sequence: true,
        direction: [Utility.Direction.Y, Utility.Direction.X],
        scrolling: true,
        trueSize: true,
        sequentialScrollingOptimized: true,
        debug: {
            testPrev: false
        }
    };

    // Layout function
    function TableLayout(context, options) {

        // Prepare
        var size = context.size;
        var direction = context.direction;
        var offset = context.scrollOffset;
        var node;
        var nodeSize;
        var itemSize;
        var set;
        var lastSectionBeforeVisibleCell;
        var firstVisibleCell;
        var lastCellOffsetInFirstVisibleSection;

        //
        // Determine item-size or use true=size
        //
        if ((options.itemSize === true) || !options.hasOwnProperty('itemSize')) {
            itemSize = true;
        }
        else {
            itemSize = (options.itemSize === undefined) ? size[direction] : options.itemSize;
        }

        //
        // Process all next nodes
        //
        while (offset < context.scrollEnd) {
            node = context.next();
            if (!node) {
                break;
            }
            nodeSize = (itemSize === true) ? context.resolveSize(node, size)[direction] : itemSize;
            set = {
                size: direction ? [size[0], nodeSize] : [nodeSize, size[1]],
                translate: direction ? [0, offset, 0] : [offset, 0, 0],
                scrollLength: nodeSize
            };
            context.set(node, set);
            offset += nodeSize;

            //
            // Keep track of the last section before the first visible cell
            //
            if (options.isSectionCallback && options.isSectionCallback(context.getRenderNode(node))) {
                if (!firstVisibleCell) {
                    lastSectionBeforeVisibleCell = node;
                } else if (lastCellOffsetInFirstVisibleSection === undefined) {
                    lastCellOffsetInFirstVisibleSection = offset - nodeSize;
                }
            } else if (!firstVisibleCell && (offset >= 0)) {
                firstVisibleCell = node;
            }
        }

        //
        // Process previous nodes
        //
        offset = context.scrollOffset;
        while (offset > context.scrollStart) {
            node = context.prev();
            if (!node) {
                break;
            }

            //
            // Keep track of the last section before the first visible cell
            //
            if (options.isSectionCallback && options.isSectionCallback(context.getRenderNode(node))) {
                if (!lastSectionBeforeVisibleCell) {
                    lastSectionBeforeVisibleCell = node;
                }
            } else if (offset >= 0) {
                firstVisibleCell = node;
                if (lastSectionBeforeVisibleCell) {
                    lastCellOffsetInFirstVisibleSection = offset;
                }
                lastSectionBeforeVisibleCell = undefined;
            }

            //
            // Position node
            //
            nodeSize = options.itemSize || context.resolveSize(node, size)[direction];
            set = {
                size: direction ? [size[0], nodeSize] : [nodeSize, size[1]],
                translate: direction ? [0, offset - nodeSize, 0] : [offset - nodeSize, 0, 0],
                scrollLength: nodeSize
            };
            context.set(node, set);
            offset -= nodeSize;
        }

        //
        // When no first section is in the scrollable range, then
        // look back further in search for the that section
        //
        if (node && !lastSectionBeforeVisibleCell) {
            node = context.prev();
            while (node && !lastSectionBeforeVisibleCell) {
                if (options.isSectionCallback && options.isSectionCallback(context.getRenderNode(node))) {
                    lastSectionBeforeVisibleCell = node;
                    nodeSize = options.itemSize || context.resolveSize(node, size)[direction];
                    set = {
                        size: direction ? [size[0], nodeSize] : [nodeSize, size[1]],
                        translate: direction ? [0, offset - nodeSize, 0] : [offset - nodeSize, 0, 0]
                    };
                    context.set(node, set);
                }
                else {
                    node = context.prev();
                }
            }
        }

        //
        // Reposition "last section before first visible cell" to the top of the layout
        //
        if (lastSectionBeforeVisibleCell) {
            var translate = lastSectionBeforeVisibleCell.set.translate;
            translate[direction] = 0;
            translate[2] = 1; // put section on top, so that it overlays cells
            if ((lastCellOffsetInFirstVisibleSection !== undefined) &&
                (lastSectionBeforeVisibleCell.set.size[direction] > lastCellOffsetInFirstVisibleSection)) {
                translate[direction] = lastCellOffsetInFirstVisibleSection - lastSectionBeforeVisibleCell.set.size[direction];
            }
            context.set(lastSectionBeforeVisibleCell, {
                size: lastSectionBeforeVisibleCell.set.size,
                translate: translate,
                scrollLength: lastSectionBeforeVisibleCell.set.scrollLength
            });
        }
    }

    TableLayout.Capabilities = capabilities;
    TableLayout.Name = 'TableLayout';
    TableLayout.Description = 'Layout for TableView supporting sticky sections';
    module.exports = TableLayout;
});