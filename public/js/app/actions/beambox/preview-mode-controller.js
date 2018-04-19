define([
    'helpers/device-master',
    'helpers/i18n',
    'app/constants/device-constants',
    'app/actions/progress-actions',
    'app/constants/progress-constants',
    'app/actions/global-actions',
    'helpers/sprintf',
    'helpers/check-device-status',
    'helpers/firmware-version-checker',
    'app/actions/beambox/constant'
], function (
    DeviceMaster,
    i18n,
    DeviceConstants,
    ProgressActions,
    ProgressConstants,
    GlobalActions,
    sprintf,
    checkDeviceStatus,
    FirmwareVersionChecker,
    Constant
) {
    const LANG = i18n.lang.beambox.left_panel;
    class PreviewModeController {
        constructor() {
            this.storedPrinter = null;
            this.isPreviewModeOn = false;
            this.isPreviewBlocked = false;
            this.cameraOffset = null;
            this.canvas = document.createElement('canvas');
            this.cameraCanvasUrl = '';
            this.errorCallback = function(){};

            this.canvas.width = Constant.dimension.width;
            this.canvas.height = Constant.dimension.height;

        }

        //main functions

        async start(selectedPrinter, errCallback) {
            await this._reset();

            await DeviceMaster.select(selectedPrinter);

            ProgressActions.open(ProgressConstants.NONSTOP, sprintf(i18n.lang.message.connectingMachine, selectedPrinter.name));

            try {
                await this._retrieveCameraOffset();
                await DeviceMaster.enterMaintainMode();
                if (await FirmwareVersionChecker.check(selectedPrinter, 'CLOSE_FAN')) {
                    DeviceMaster.maintainCloseFan(); // this is async function, but we don't have to wait it
                }
                this.storedPrinter = selectedPrinter;
                this.errorCallback = errCallback;
                this.isPreviewModeOn = true;
                this._drawBoundary();
                await DeviceMaster.connectCamera(this.storedPrinter);
            } catch (error) {
                throw error;
            } finally {
                ProgressActions.close();
            }
        }

        async end() {
            this._clearBoundary();
            const storedPrinter = this.storedPrinter;
            await this._reset();
            await DeviceMaster.select(storedPrinter);
            await DeviceMaster.endMaintainMode();
        }

        async preview(x, y) {
            if (this.isPreviewBlocked) {
                return;
            }
            this.isPreviewBlocked = true;
            const constrainedXY = this._constrainPreviewXY(x, y);
            x = constrainedXY.x;
            y = constrainedXY.y;

            $(workarea).css('cursor', 'wait');

            try {
                const imgUrl = await this._getPhotoAfterMove(x, y);
                $(workarea).css('cursor', 'url(img/camera-cursor.svg), cell');
                this._drawIntoBackground(imgUrl, x, y);
                this.isPreviewBlocked = false;
                $('.left-panel .preview-btns .clear-preview').show();// bad practice ~~~~
            } catch (error) {
                console.log(error);
                this.errorCallback(error.message);
                this.isPreviewBlocked = false;
            }
        }

        async previewRegion(x1, y1, x2, y2) {
            const points = (() => {
                const size = (() => {
                    const h = Constant.camera.imgHeight;
                    const a = this._getCameraOffset().angle;
                    const s = this._getCameraOffset().scaleRatio;
                    const c = h / (Math.cos(a) + Math.sin(a));
                    return c * s ;
                })();

                const {left, right, top, bottom} = (() => {
                    const l = Math.min(x1, x2) + size/2;
                    const r = Math.max(x1, x2) - size/2;
                    const t = Math.min(y1, y2) + size/2;
                    const b = Math.max(y1, y2) - size/2;

                    return {
                        left: this._constrainPreviewXY(l, 0).x,
                        right: this._constrainPreviewXY(r, 0).x,
                        top: this._constrainPreviewXY(0, t).y,
                        bottom: this._constrainPreviewXY(0, b).y
                    };
                })();

                const pointsArray = [];
                for(let curY = top; curY < (bottom + size); curY += size){
                    for(let curX = left; curX < (right + size); curX += size) {
                        pointsArray.push([curX, curY]);
                    }
                }
                return pointsArray;
            })();

            for(let i=0; i<points.length; i++) {
                await this.preview(points[i][0], points[i][1]);
            }
        }

        // x, y in mm
        takePictureAfterMoveTo(movementX, movementY) {
            return this._getPhotoAfterMoveTo(movementX, movementY);
        }

        clearGraffiti() {
            window.svgCanvas.setBackground('#fff');

            // clear canvas
            this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);

            // reset cameraCanvasUrl
            URL.revokeObjectURL(this.cameraCanvasUrl);
            this.cameraCanvasUrl = '';

            // hide 'x' button
            $('.left-panel .preview-btns .clear-preview').hide();// bad practice ~~~~
        }

        isPreviewMode() {
            return this.isPreviewModeOn;
        }

        isGraffitied() {
            return this.cameraCanvasUrl === '';
        }

        //helper functions

        async _retrieveCameraOffset() {
            // cannot getDeviceSetting during maintainMode. So we force to end it.
            try {
                await DeviceMaster.endMaintainMode();
            } catch (error) {
                if ( (error.status === 'error') && (error.error && error.error[0] === 'OPERATION_ERROR') ) {
                    // do nothing.
                } else {
                    console.log(error);
                }
            }

            const resp = await DeviceMaster.getDeviceSetting('camera_offset');
            this.cameraOffset = {
                x:          Number(/X:\s?(\-?\d+\.?\d+)/.exec(resp.value)[1]),
                y:          Number(/Y:\s?(\-?\d+\.?\d+)/.exec(resp.value)[1]),
                angle:      Number(/R:\s?(\-?\d+\.?\d+)/.exec(resp.value)[1]),
                scaleRatio: Number(/S:\s?(\-?\d+\.?\d+)/.exec(resp.value)[1])
            };
            if ((this.cameraOffset.x === 0) && (this.cameraOffset.y === 0)) {
                this.cameraOffset = {
                    x: Constant.camera.offsetX_ideal,
                    y: Constant.camera.offsetY_ideal,
                    angle: 0,
                    scaleRatio: Constant.camera.scaleRatio_ideal,
                };
            }
        }

        _getCameraOffset() {
            return this.cameraOffset;
        }

        async _reset() {
            this.storedPrinter = null;
            this.isPreviewModeOn = false;
            this.cameraOffset = null;
            this.isPreviewBlocked = false;
            await DeviceMaster.disconnectCamera();
        }

        _constrainPreviewXY(x, y) {
            const maxWidth = Constant.dimension.width;
            const maxHeight = Constant.dimension.height;

            x = Math.max(x, this._getCameraOffset().x * 10);
            x = Math.min(x, maxWidth);
            y = Math.max(y, this._getCameraOffset().y * 10);
            y = Math.min(y, maxHeight);
            return {
                x: x,
                y: y
            };
        }

        //x, y in pixel
        _getPhotoAfterMove(x, y) {
            const movementX = x / Constant.dpmm - this._getCameraOffset().x;
            const movementY = y / Constant.dpmm - this._getCameraOffset().y;
            return this._getPhotoAfterMoveTo(movementX, movementY);
        }

        //movementX, movementY in mm
        async _getPhotoAfterMoveTo(movementX, movementY) {
            // x, y in pixel
            let movement = {
                f: Constant.camera.movementSpeed,
                x: movementX, // mm
                y: movementY  // mm
            };

            await DeviceMaster.select(this.storedPrinter);
            await DeviceMaster.maintainMove(movement);
            // wait for moving camera to take a stable picture, this value need optimized
            await new Promise(resolve => setTimeout(resolve, Constant.camera.waitTimeForMovementStop));
            const imgUrl = await this._getPhotoFromMachine();
            return imgUrl;
        }

        //just fot _getPhotoAfterMoveTo()
        async _getPhotoFromMachine() {
            const imgBlob = await DeviceMaster.takeOnePicture();
            const imgUrl = URL.createObjectURL(imgBlob);
            return imgUrl;
        }

        //just for preview()
        _drawIntoBackground(imgUrl, x, y) {
            const img = new Image();
            img.src = imgUrl;
            img.onload = () => {
                // free unused blob memory
                URL.revokeObjectURL(imgUrl);

                const img_regulated = this._cropAndRotateImg(img);

                const dstX = x - img_regulated.width/2;
                const dstY = y - img_regulated.height/2;

                this.canvas.getContext('2d').drawImage(img_regulated, dstX, dstY);
                this.canvas.toBlob((blob) => {
                    if (this.cameraCanvasUrl) {
                        URL.revokeObjectURL(this.cameraCanvasUrl);
                    }
                    this.cameraCanvasUrl = URL.createObjectURL(blob);
                    window.svgCanvas.setBackground('#fff', this.cameraCanvasUrl);
                });
            };
        }

        //just for _drawIntoBackground()
        _cropAndRotateImg(imageObj) {
            const {angle, scaleRatio} = this._getCameraOffset();

            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');

            const a = angle;
            const s = scaleRatio;
            const w = imageObj.width;
            const h = imageObj.height;

            const c = h / (Math.cos(a) + Math.sin(a));
            const dstx = (h - w) / 2 * s;
            const dsty = - h * Math.sin(a) / (Math.cos(a) + Math.sin(a)) * s;

            cvs.width = cvs.height = c * s;

            ctx.rotate(a);
            ctx.drawImage(imageObj, 0, 0, w, h, dstx, dsty, w * s, h * s);

            return cvs;
        }

        //just for end()
        _clearBoundary() {
            const canvasBackground = svgedit.utilities.getElem('canvasBackground');
            const previewBoundary = svgedit.utilities.getElem('previewBoundary');
            canvasBackground.removeChild(previewBoundary);
        }

        // just for start()
        _drawBoundary() {
            const canvasBackground = svgedit.utilities.getElem('canvasBackground');
            const previewBoundary = this._getPreviewBoundary();
            canvasBackground.appendChild(previewBoundary);
        }
        // just for _drawBoundary()
        _getPreviewBoundary() {
            const previewBoundaryId = 'previewBoundary';
            const color = 'rgba(200,200,200,0.8)';

            const boundaryGroup = svgCanvas.addSvgElementFromJson({
                'element': 'g',
                'attr': {
                    'id': previewBoundaryId,
                    'width': '100%',
                    'height': '100%',
                    'x': 0,
                    'y': 0,
                    'style': 'pointer-events:none'
                }
            });
            const uncapturabledHeight = (this._getCameraOffset().y * Constant.dpmm) - (Constant.camera.imgHeight * this._getCameraOffset().scaleRatio / 2);
            const uncapturabledHeightRatio = uncapturabledHeight / Constant.dimension.height;

            const descText = svgCanvas.addSvgElementFromJson({
                'element': 'text',
                'attr': {
                    'font-size': '14px',
                    'x': 10,
                    'y': 15,
                    'fill': '#fff',
                    'style': 'pointer-events:none'
                }
            });
            const textNode = document.createTextNode(LANG.unpreviewable_area);
            descText.appendChild(textNode);
            const borderTop = svgCanvas.addSvgElementFromJson({
                'element': 'rect',
                'attr': {
                    'width': '100%',
                    'height': `${uncapturabledHeightRatio*100}%`,
                    'x': 0,
                    'y': 0,
                    'fill': color,
                    'style': 'pointer-events:none'
                }
            });
            // const borderBottom = svgCanvas.addSvgElementFromJson({
            //     'element': 'rect',
            //     'attr': {
            //         'width': '100%',
            //         'height': '2.597%',
            //         'x': 0,
            //         'y': '97.403%',
            //         'fill': color,
            //         'style': 'pointer-events:none'
            //     }
            // });
            // const borderLeft = svgCanvas.addSvgElementFromJson({
            //     'element': 'rect',
            //     'attr': {
            //         'width': '2.381%',
            //         'height': '100%',
            //         'x': 0,
            //         'y': 0,
            //         'fill': color,
            //         'style': 'pointer-events:none'
            //     }
            // });
            // const borderRight = svgCanvas.addSvgElementFromJson({
            //     'element': 'rect',
            //     'attr': {
            //         'width': '2.381%',
            //         'height': '100%',
            //         'x': '97.619%',
            //         'y': 0,
            //         'fill': color,
            //         'style': 'pointer-events:none'
            //     }
            // });
            boundaryGroup.appendChild(borderTop);
            boundaryGroup.appendChild(descText);
            // boundaryGroup.appendChild(borderBottom);
            // boundaryGroup.appendChild(borderLeft);
            // boundaryGroup.appendChild(borderRight);
            return boundaryGroup;
        }
    }

    const instance = new PreviewModeController();

    return instance;
});
