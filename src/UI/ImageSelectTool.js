/**
 * @author Jaclyn Beck
 * @fileoverview A class that deals with using the imgAreaSelect plugin, which allows the user to click and drag 
 *                 to select a subregion of the image in the viewport. 
 */
/*jslint browser: true, white: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, 
bitwise: true, regexp: true, strict: true, newcap: true, immed: true, maxlen: 120, sub: true */
/*global Class, $, Shadowbox, setTimeout, window */
"use strict";
var ImageSelectTool = Class.extend(
    /** @lends ImageSelectTool.prototype */
    {
        
    /**
     * @constructs
     * @description Sets up an event handler for the select region button and finds the divs where
     *                 the fake transparent image will be inserted
     * @param {Object} controller -- the helioviewer class
     */
    init: function (viewport) {
        this.active     = false;
        this.viewport   = viewport;
        this.vpDomNode  = $("#helioviewer-viewport");

        this._setupFinishedButton();
        this.button     = $("#done-selecting-image");
        this.helpButton = $("#image-select-help");
        this._setupHelpDialog();
        
        $(document).bind("enable-select-tool", $.proxy(this.enableAreaSelect, this));
    },

    enableAreaSelect: function (event, callback) {
        var width, height, imgContainer, transImg, helioviewer;
    
        // If the user has already pushed the button but not done anything, this will turn the feature off.
        if (this.active) {
            this.cleanup();
        }

        // Otherwise, turn it on.
        else {
            // Disable keyboard shortcuts for fullscreen mode
            $("body").addClass('disable-fullscreen-mode');
            this.active = true;

            // Get viewport dimensions to make the transparent image with. 
            this.width  = this.vpDomNode.width();
            this.height = this.vpDomNode.height();
        
            /* 
            * Create a temporary transparent image that spans the height and width of the viewport.
            * Necessary because the viewport image is done in tiles and imgAreaSelect cannot cross 
            * over tile boundaries. Add the transparent image to the viewport, on top of the other tiles.
            * 
            * viewport.domNode corresponds to the div "#helioviewer-viewport", so add the tile directly
            * inside this div. It is necessary to specify a z-index because otherwise it gets added underneath
            * the rest of the tiles and the plugin will not work.
            */
            transImg = $('<img id="transparent-image" src="resources/images/transparent_512.png" alt="" width="' +
                   this.width + '" height="' + this.height + '" />');
            transImg.css({'position': 'relative', 'cursor': 'crosshair', 'z-index': 5});
            transImg.appendTo(this.vpDomNode);
            
            /* Make a temporary container for imgAreaSelect to put all of its divs into.
            * Note that this container must be OUTSIDE of the viewport because otherwise the plugin's boundaries
            * do not span the whole image for some reason. All of the divs are put in "#outside-box"
            */
            imgContainer = $('body').append('<div id="imgContainer"></div>');

            this.selectArea(callback);
        }
    },
    
    /**
     * @description Loads the imgAreaSelect plugin and uses it on the transparent image that covers the viewport.
     *                 The function imgAreaSelect() returns two variables, "img", which is the original transparent
     *                 image, and "selection", which is an array describing the selected area. Available data for 
     *                 "selection" is x1, y1, x2, y2, width, and height.
     *                 See http://odyniec.net/projects/imgareaselect/  for usage examples and documentation. 
     */
    selectArea: function (callback) {
        var coords, visibleCoords, area, selection, viewportInfo, selectInfo, self = this;
        
        // Use imgAreaSelect on the transparent region to get the top, left, bottom, and right 
        // coordinates of the selected region. 
        area = $("#transparent-image").imgAreaSelect({ 
            instance: true,
            handles : true,
            parent  : "#imgContainer",
            x1      : this.width / 4,
            x2      : this.width * 3 / 4,
            y1      : this.height / 4,
            y2      : this.height * 3 / 4,
            onInit  : function () {
                self.vpDomNode.qtip("show");
                $("#social-buttons").hide("fast");
                $("#center-button").hide("fast");
                $("#zoomSliderContainer").hide("fast");
                $("#zoomControlZoomIn").hide("fast");
                $("#zoomControlZoomOut").hide("fast");
            }
        });
        
        self.button.click(function () {
            // Get the coordinates of the selected image, and adjust them to be 
            // heliocentric like the viewport coords.
            selection = area.getSelection();
            
            // If there is no area selected, don't do anything.
            if (selection.x2 - selection.x1 <= 0 || selection.y2 - selection.y1 <= 0) {
                self.cleanup();
                return;
            }
            
            viewportInfo  = self.viewport.getViewportInformation();
            visibleCoords = viewportInfo.coordinates;

            coords = {
                top     : visibleCoords.top  + selection.y1,
                left    : visibleCoords.left + selection.x1,
                bottom  : visibleCoords.top  + selection.y2,
                right   : visibleCoords.left + selection.x2
            };

            selectInfo = {
                coordinates : coords,
                imageScale  : viewportInfo.imageScale,
                layers      : viewportInfo.layers,
                time        : viewportInfo.time
            };
            self.cleanup();
            callback(selectInfo);
        });
    },
    
    _setupFinishedButton: function () {
        this.vpDomNode.qtip({
            position: {
                corner: {
                    target: 'topRight',
                    tooltip: 'topRight'
                }
            },      
            adjust: {
                x: -200,
                y: 200
            },
            content: {
                text : "<div id='done-selecting-image' class='text-btn'>" +
                            "<span class='ui-icon ui-icon-circle-check' style='float: left;'></span>" +
                            "<span>Done</span>" +
                        "</div>" + 
                        "<div id='image-select-help' class='text-btn' style='float: right;'>" + 
                            "<span class='ui-icon ui-icon-info'></span>" +
                        "</div>"
            },
            show: false,
            hide: 'click',
            style: {
                name: "mediaDark",
                "font-weight": 600,
                "font-size": "10pt",
                width: 'auto'
            }
        });
    },
    
    _setupHelpDialog: function () {
        var api = this.vpDomNode.qtip("api");
        qtip    = api.elements.tooltip;
        
        this.helpButton.qtip({
            position: {
                corner: {
                    target: 'bottomLeft',
                    tooltip: 'topRight'
                }
            },
            content: {
                title: "Help",
                text: "Resize by dragging the edges of the selection.<br />" +
                        "Move the selection by clicking inside and dragging it.<br />" + 
                        "Click and drag outside the selected area to start" +
                        " a new selection.<br />" +
                        "Click 'Done' when you have finished to submit."
            },
            adjust: { y: 100 },
            show: 'mouseover',
            hide: 'mouseout',
            style: {
                tip: 'topRight',
                name: 'simple',
                width: 'auto',
                "text-align": 'left',
                title: {
                    background: '#FFF'
                }
            }
        });
    },

    /**
     * Removes all divs created by imgAreaSelect. Also shows all divs that were hidden during selection.
     * @param imgContainer -- has all imgAreaSelect divs inside
     * @param transImg -- temporary transparent image that imgAreaSelect is used on.
     * @TODO: add error checking if the divs are already gone for whatever reason.
     */    
    cleanup: function () {
        this.vpDomNode.qtip("hide");
        $("#social-buttons").show("fast");
        $("#center-button").show("fast");
        $("#zoomSliderContainer").show("fast");
        $("#zoomControlZoomIn").show("fast");
        $("#zoomControlZoomOut").show("fast");
        $('#imgContainer, #transparent-image').remove();
        this.button.unbind('click');
        this.helpButton.qtip("hide");
        this.active = false;
        $("body").removeClass('disable-fullscreen-mode');
    }
});