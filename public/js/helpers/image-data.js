/**
 * To get image data
 */
define([
    'helpers/grayscale',
    'helpers/convertToTypedArray',
    'app/actions/beambox/beambox-preference',
],
function(
    grayScale,
    convertToTypedArray,
    BeamboxPreference,

) {
    'use strict';

    return function(source, opts) {
        opts.onComplete = opts.onComplete || function() {};
        opts.type = opts.type || 'image/png';

        var img = new Image(),
            blobUrl = window.URL,
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            onload = async function(e) {
                var size = {
                        width: opts.width || e.target.naturalWidth,
                        height: opts.height || e.target.naturalHeight
                    },
                    imageBinary,
                    imageData;
                let arrayBuffer = await fetch(img.src);
                arrayBuffer = await arrayBuffer.blob();
                arrayBuffer = await new Response(arrayBuffer).arrayBuffer(); 
                const rotationFlag = svgEditor.getExifRotationFlag(arrayBuffer);

                //DownSampling
                let isSettingDownsampling = BeamboxPreference.read('image_downsampling') || (BeamboxPreference.read('image_downsampling') === undefined);
                if (isSettingDownsampling) {
                    if (!opts.isFullResolution) {
                        const downRatio = Math.min(1, 1.5 * $(window).width() / Math.max(size.width, size.height));
                        size.width = Math.round(size.width * downRatio);
                        size.height = Math.round(size.height * downRatio);
                    }
                }
                let w = size.width, h = size.height;
                let rotation = 0;
                let shouldFlip = false;
                ctx.save();
                if (rotationFlag && rotationFlag > 1) {
                    if (rotationFlag > 4) {
                        [w, h] = [h, w];
                    }
                    switch (rotationFlag) {
                        case 2:
                            shouldFlip = true;
                            break;
                        case 3:
                            rotation = Math.PI;
                            break;
                        case 4:
                            rotation = Math.PI;
                            shouldFlip = true;
                            break;
                        case 5:
                            shouldFlip = true;
                            rotation = Math.PI / 2;
                            break;
                        case 6:
                            rotation = Math.PI / 2;
                            break;
                        case 7:
                            shouldFlip = true;
                            rotation = - Math.PI / 2;
                            break;
                        case 8:
                            rotation = - Math.PI / 2;
                            break;
                    }
                }
                canvas.width = w;
                canvas.height = h;
                ctx.translate(w / 2, h / 2);
                if (shouldFlip) {
                    ctx.scale(-1, 1);
                }
                ctx.rotate(rotation);
                ctx.drawImage(
                    img,
                    - size.width / 2,
                    - size.height / 2,
                    size.width,
                    size.height
                );
                ctx.restore();
                imageData = ctx.createImageData(w, h);
                imageBinary = ctx.getImageData(0, 0, w, h).data;

                if ('undefined' !== typeof opts.grayscale) {
                    imageBinary = grayScale(imageBinary, opts.grayscale);
                }

                imageData.data.set(imageBinary);

                ctx.putImageData(imageData, 0, 0);

                opts.onComplete({
                    canvas: canvas,
                    size: size,
                    data: imageData,
                    imageBinary: imageBinary,
                    blob: new Blob([imageData.data], { type: opts.type })
                });

                canvas = null;

                // remove event
                img.removeEventListener(
                    'load',
                    onload,
                    false
                );
            };

        img.addEventListener(
            'load',
            onload,
            false
        );

        if (source instanceof Blob) {
            img.src = blobUrl.createObjectURL(source);

        }
        else if ('string' === typeof source) {
            img.src = source;
        }
    };
});
