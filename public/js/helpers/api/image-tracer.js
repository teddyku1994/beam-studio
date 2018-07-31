/**
 * API fcode reader
 * Ref: https://github.com/flux3dp/fluxghost/wiki/fcode-reader
 */
define([
    'helpers/websocket',
], function(Websocket) {
    'use strict';

    return function() {
        var ws = new Websocket({
                method: 'image-tracer',
                onMessage: (data) => {
                    events.onMessage(data);
                },
                onError: (response) => {
                    events.onError(response);
                },
                onFatal: (response) => {
                    events.onFatal(response);
                }
            }),
            events = {
                onMessage   : () => {},
                onError     : () => {},
                onFatal     : () => {}
            };

        return {
            connection: ws,

            /**
             * @param {ArrayBuffer} data    - binary data with array buffer type
             */
            upload: (data, opts) => {
                opts = opts || {};
                let d = $.Deferred();
                events.onMessage = (response) => {
                    switch (response.status) {
                        case 'ok':
                            d.resolve(response);
                            break;
                        case 'continue':
                            ws.send(data);
                            break;
                        default:
                            console.log('strange message', response);
                            break;
                    }
                };

                events.onError = (response) => { d.reject(response); console.log('on error', response); };
                events.onFatal = (response) => { d.reject(response); console.log('on fatal', response); };

                ws.send(`image_trace ${data.size || data.byteLength}`);
                return d.promise();
            },
        };
    };
});
