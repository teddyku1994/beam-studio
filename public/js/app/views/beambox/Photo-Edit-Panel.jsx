
/* eslint-disable react/no-multi-comp */
define([
    'jquery',
    'react',
    'helpers/i18n',
    'helpers/image-data',
    'app/actions/progress-actions',
    'app/constants/progress-constants',
    'jsx!widgets/Modal',
    'jsx!widgets/Curve-Control',
    'jsx!widgets/Slider-Control',
    'lib/cropper'
], function(
    $,
    React,
    i18n,
    ImageData,
    ProgressActions,
    ProgressConstants,
    Modal,
    CurveControl,
    SliderControl,
    Cropper
) {
    const LANG = i18n.lang.beambox.photo_edit_panel;
    
    let cropper = null;
    class PhotoEditPanel extends React.Component {
        constructor(props) {
            super(props);
            ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
            this.state = {
                origSrc: this.props.src,
                previewSrc: this.props.src,
                src: this.props.src,
                srcHistory: [],
                isCropping: false,
                wRatio: 1,
                hRatio: 1,
                threshold: $(this.props.element).attr('data-threshold'),
                shading: ($(this.props.element).attr('data-shading') === 'true')
            };
            this.sharpenIntensity = 0;
            let tempImg = new Image();
            const self = this;
            tempImg.src = this.state.src;
            tempImg.onload = function() {
                self.state.origImage = tempImg;
                self.state.imagewidth = tempImg.naturalWidth;
                self.state.origWidth = tempImg.naturalWidth;
                self.state.imageheight = tempImg.naturalHeight;
                self.state.origHeight = tempImg.naturalHeight;
            };
        }

        componentDidMount() {
            switch(this.props.mode) {
                case 'sharpen':
                case 'curve':
                    this._handleDownSampling();
                    break;
                case 'invert':
                    this._handleInvert(this._handleComplete.bind(this));
                    break;
                default:
                    break;
            }
        }

        componentWillUnmount() {
        }

        _handleDownSampling() {
            const jimp = require('jimp');
            let imgBlobUrl = this.state.origSrc;
            let imageFile;
            ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
            fetch(imgBlobUrl)
                .then(res => res.blob())
                .then((blob) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        imageFile = e.target.result;
                        imageFile = new Buffer.from(imageFile);
                        
                        jimp.read(imageFile)
                            .then((image) => {
                                if(Math.max(image.bitmap.width, image.bitmap.height) > 600) {
                                    if (image.bitmap.width >= image.bitmap.height) {
                                        image.resize(600, jimp.AUTO);
                                    } else {
                                        image.resize(jimp.AUTO, 600);
                                    }
                                    image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                        const newBlob = new Blob([buffer]);
                                        const src = URL.createObjectURL(newBlob);
                                        if (this.state.src !== this.state.origSrc) {
                                            URL.revokeObjectURL(this.state.src);
                                        }
                                        this.state.previewSrc= src;
                                        this.setState({src: src});
                                        ProgressActions.close();
                                    });
                                }
                            })
                            .catch((err) => {
                                console.log(err);
                                ProgressActions.close();
                            });
                    };
                    fileReader.readAsArrayBuffer(blob);
                })
                .catch((err) => {
                    d.reject(err);
                    ProgressActions.close();
                });
        }

        _handleCancel() {
            let src = this.state.src
            while (this.state.srcHistory.length > 0) {
                URL.revokeObjectURL(src);
                src = this.state.srcHistory.pop();
            }
            this.props.unmount();
        }

        _handleComplete() {
            let self = this;
            this.batchCmd = new svgedit.history.BatchCommand('Photo edit');
            let elem = this.props.element;
            this._handleSetAttribute('origImage', this.state.src);
            if (this.props.mode === 'crop') {
                const image = document.getElementById('original-image');
                if (this.state.origWidth !== image.naturalWidth) {
                    let ratio = image.naturalWidth / this.state.origWidth;
                    this._handleSetAttribute('width', $(elem).attr('width') * ratio);
                }
                if (this.state.origHeight !== image.naturalHeight) {
                    let ratio = image.naturalHeight / this.state.origHeight;
                    this._handleSetAttribute('height', $(elem).attr('height') * ratio);
                }
            }
            if (this.props.mode === 'invert') {
                this._handleSetAttribute('data-threshold', this.state.threshold);
            }

            ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
            ImageData(
                this.state.src, {
                    grayscale: {
                        is_rgba: true,
                        is_shading: this.state.shading,
                        threshold: this.state.threshold,
                        is_svg: false
                    },
                    onComplete: function (result) {
                        self._handleSetAttribute('xlink:href', result.canvas.toDataURL());
                        svgCanvas.undoMgr.addCommandToHistory(self.batchCmd);
                        svgCanvas.selectOnly([elem], true);

                        ProgressActions.close();
                    }
                }
            );
            let src;
            while (this.state.srcHistory.length > 0) {
                URL.revokeObjectURL(src);
                src = this.state.srcHistory.pop();
            }
            if (this.state.previewSrc !== this.state.origSrc) {
                URL.revokeObjectURL(this.state.previewSrc);
            }
            this.props.unmount();
        }

        _handleSetAttribute(attr, value) {
            let elem = this.props.element;
            svgCanvas.undoMgr.beginUndoableChange(attr, [elem]);
            elem.setAttribute(attr, value);
            let cmd = svgCanvas.undoMgr.finishUndoableChange();
            this.batchCmd.addSubCommand(cmd);
        }

        _handleGoBack() {
            if (this.state.isCropping) {
                this._destroyCropper();
            }
            URL.revokeObjectURL(this.state.src);
            const src = this.state.srcHistory.pop();
            this.setState({src: src, isCropping: false});
        }

        _renderPhotoEditeModal() {
            if (this.state.src !== this.lastSrc) {
                this._handleGrayScale();
            }
            let panelContent;
            let rightWidth = 40;
            switch (this.props.mode) {
                case 'sharpen':
                    panelContent = this._renderSharpenPanel();
                    rightWidth = 390;
                    break;
                case 'curve':
                    panelContent = this._renderCurvePanel();
                    rightWidth = 390;
                    break;
                default:
                    break;
            }
            const maxAllowableWidth = $('.top-menu').width() - rightWidth;
            const maxAllowableHieght = $(window).height() - 2 * $('.top-menu').height() - 180;
            const containerStyle = (this.state.imagewidth / maxAllowableWidth > this.state.imageheight / maxAllowableHieght) ? 
                {width: `${maxAllowableWidth}px`} : {height: `${maxAllowableHieght}px`};
            const footer = this._renderPhotoEditFooter();
            const onImgLoad = (this.props.mode === 'crop' && !this.state.isCropping) ? this._handleStartCrop.bind(this) : () => {};
            if (this.state.grayScaleUrl && this.state.grayScaleUrl === this.lastGrayScale && this.state.src === this.lastSrc && !this.state.isCropping) {
                onImgLoad();
            }
            this.lastSrc = this.state.src;
            this.lastGrayScale =this.state.grayScaleUrl;
            return (
                <Modal>
                    <div className='photo-edit-panel'>
                        <div className='main-content'>
                            <div className='image-container' style={containerStyle} >
                                <img 
                                    id='original-image'
                                    style={containerStyle}
                                    src={this.state.grayScaleUrl}
                                    onLoad={() => {
                                        onImgLoad();
                                        ProgressActions.close();
                                    }}/>
                            </div>
                            {panelContent}
                        </div>
                        {footer}
                    </div>
                </Modal>
            );
        }

        _handleGrayScale() {
            ImageData(
                this.state.src,
                {
                    grayscale: {
                        is_rgba: true,
                        is_shading: this.state.shading,
                        threshold: this.state.threshold,
                        is_svg: false
                    },
                    onComplete: (result) => {
                        if (this.state.grayScaleUrl) {
                            URL.revokeObjectURL(this.state.grayScaleUrl);
                        }
                        this.setState({grayScaleUrl: result.canvas.toDataURL('image/png')});
                    }
                }
            );
        }

        // SHARPEN
        _renderSharpenPanel() {
            return (
                <div className='right-part'>
                    <div className={`scroll-bar-container ${this.props.mode}`}>
                        <div className='sub-functions with-slider'> 
                        <div className='title'>{LANG.sharpen}</div>
                        <SliderControl
                            id='sharpen-intensity'
                            key='sharpen-intensity'
                            label={LANG.sharpness}
                            min={0}
                            max={20}
                            step={1}
                            default={0}
                            onChange={(id, val) => this._handleParameterChange(id, val)}
                        />
                        </div>
                    </div>
                </div>    
            );
        }

        _handleParameterChange(id, val) {
            if (id === 'sharpen-intensity'){
                const sharpenIntensity = parseInt(val);
                const jimp = require('jimp');
                const d = $.Deferred();
                let imgBlobUrl = this.state.origSrc;
                let imageFile;
                const k_edge = -sharpenIntensity / 2;
                const k_corner = -sharpenIntensity / 4;
                const k_m = -4 * (k_edge + k_corner) + 1;
                const kernal = [[k_corner, k_edge, k_corner], [k_edge, k_m, k_edge], [k_corner, k_edge, k_corner]];
                fetch(imgBlobUrl)
                    .then(res => res.blob())
                    .then((blob) => {
                        var fileReader = new FileReader();
                        fileReader.onloadend = (e) => {
                            imageFile = e.target.result;
                            imageFile = new Buffer.from(imageFile);
                            ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                            jimp.read(imageFile)
                                .then((image) => {
                                    image.convolute(kernal);
                                    image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                        const newBlob = new Blob([buffer]);
                                        const src = URL.createObjectURL(newBlob);
                                        if (this.state.src !== this.state.origSrc) {
                                            URL.revokeObjectURL(this.state.src);
                                        }
                                        this.setState({src: src});
                                        ProgressActions.close();
                                    });
                                })
                                .catch((err) => {
                                    console.log(err);
                                    ProgressActions.close();
                                });
                        };
                        fileReader.readAsArrayBuffer(blob);
                    })
                    .catch((err) => {
                        d.reject(err);
                        ProgressActions.close();
                    });
            } 
        }

        // CROP
        _handleStartCrop() {
            if (this.state.isCropping) {
                return;
            }
            const image = document.getElementById('original-image');
            cropper = new Cropper(
                image,
                {
                    autoCropArea: 1,
                    zoomable: false,
                    viewMode: 0,
                    targetWidth: image.width,
                    targetHeight: image.height
                }
            );
            this.setState({isCropping: true});
        }

        _handleCrop(complete=false) {
            const image = document.getElementById('original-image');
            const cropData = cropper.getData();;
            const x = Math.max(0, cropData.x);
            const y = Math.max(0, cropData.y);
            const w = Math.min(image.naturalWidth - x, cropData.width);
            const h = Math.min(image.naturalHeight - y, cropData.height);

            const jimp = require('jimp');
            const d = $.Deferred();
            let imgBlobUrl = this.state.src;
            let imageFile;
            fetch(imgBlobUrl)
                .then(res => res.blob())
                .then((blob) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        imageFile = e.target.result;
                        imageFile = new Buffer.from(imageFile);
                        ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                        jimp.read(imageFile)
                            .then((image) => {
                                image.crop(x, y, w, h);
                                image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                    const newBlob = new Blob([buffer]);
                                    const src = URL.createObjectURL(newBlob);
                                    this.state.srcHistory.push(this.state.src);
                                    this._destroyCropper();
                                    this.setState({
                                        src: src,
                                        isCropping: false,
                                        imagewidth: cropData.width,
                                        imageheight: cropData.height
                                    });
                                    ProgressActions.close();
                                    if (complete) {
                                        ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                                        let timeout = window.setTimeout(this._handleComplete.bind(this) , 500);
                                    }
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                ProgressActions.close();
                            });
                    };
                    fileReader.readAsArrayBuffer(blob);
                })
                .catch((err) => {
                    d.reject(err);
                    ProgressActions.close();
                });
        }

        _handleCancelCrop() {
            this._destroyCropper();
            this.setState({isCropping: false});
        }

        _destroyCropper() {
            if(cropper) {
                cropper.destroy();
            }
        }

        // INVERT
        _handleInvert(callback) {
            const jimp = require('jimp');
            const d = $.Deferred();
            let imgBlobUrl = this.state.src;
            let imageFile;
            fetch(imgBlobUrl)
                .then(res => res.blob())
                .then((blob) => {
                    var fileReader = new FileReader();
                    fileReader.onloadend = (e) => {
                        imageFile = e.target.result;
                        imageFile = new Buffer.from(imageFile);
                        ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                        jimp.read(imageFile)
                            .then((image) => {
                                image.invert();
                                image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                    const newBlob = new Blob([buffer]);
                                    const src = URL.createObjectURL(newBlob);
                                    if (!this.state.shading) {
                                        this.state.threshold = 256 - this.state.threshold;
                                    }
                                    this.state.srcHistory.push(this.state.src);
                                    this.state.src = src;
                                    ProgressActions.close();
                                    callback();
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                                ProgressActions.close();
                            });
                    };
                    fileReader.readAsArrayBuffer(blob);
                })
                .catch((err) => {
                    d.reject(err);
                    ProgressActions.close();
                });
        }

        // CURVE
        _renderCurvePanel() {
            return (
                <div className='right-part'>
                    <div className='curve-panel'>
                        <div className='title'>{LANG.curve}</div>
                        <CurveControl
                            updateCurveFunction={this._updateCurveFunction.bind(this)}
                            updateImage={this._handleCurve.bind(this)}
                        />
                    </div>
                </div>
            );
        }

        _updateCurveFunction(curvefunction) {
            this.curvefunction = curvefunction;
        }

        _handleCurve(mode) {
            const jimp = require('jimp');
            const curveFunc = [...Array(256).keys()].map(e => Math.round(this.curvefunction(e)));
            let imgBlobUrl;
            if (mode === 'preview') {
                imgBlobUrl = this.state.previewSrc;
            } else {
                imgBlobUrl = this.state.origSrc;
            }
            let imageFile;
            fetch(imgBlobUrl)
            .then(res => res.blob())
            .then((blob) => {
                var fileReader = new FileReader();
                ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                fileReader.onloadend = (e) => {
                    imageFile = e.target.result;
                    imageFile = new Buffer.from(imageFile);
                    jimp.read(imageFile)
                        .then((image) => {
                            for (let i = 0; i < image.bitmap.data.length; i++) {
                                if (i % 4 != 3) {
                                    image.bitmap.data[i] =  curveFunc[image.bitmap.data[i]];
                                }
                            }
                            image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                const newBlob = new Blob([buffer]);
                                const src = URL.createObjectURL(newBlob);
                                if (this.state.src !== this.state.previewSrc) {
                                    URL.revokeObjectURL(this.state.src);
                                }
                                if (mode === 'preview') {
                                    this.setState({src: src});
                                } else {
                                    this.setState({src: src}, this._handleComplete);
                                }
                                ProgressActions.close();
                            });
                        })
                        .catch((err) => {
                            console.log(err);
                            ProgressActions.close();
                        });
                };
                fileReader.readAsArrayBuffer(blob);
            })
            .catch((err) => {
                console.log(err)
                ProgressActions.close();
            });
        }

        _handleCurveComplete() {
            this._handleCurve('complete');
        }

        _renderPhotoEditFooter() {
            if (this.props.mode === 'sharpen') {
                return (
                <div className='footer'>
                    {this._renderFooterButton(LANG.okay, this._handleComplete.bind(this))}
                    {this._renderFooterButton(LANG.cancel, this._handleCancel.bind(this))}
                </div>
                );
            } 
            if (this.props.mode === 'crop') {
                const disableGoBack = (this.state.srcHistory.length === 0);
                return (
                    <div className='footer'>
                        {this._renderFooterButton(LANG.okay, () => {
                                this._handleCrop.bind(this)(true);
                            })}
                        {this._renderFooterButton(LANG.apply, this._handleCrop.bind(this))}
                        {this._renderFooterButton(LANG.back, this._handleGoBack.bind(this), disableGoBack)}
                        {this._renderFooterButton(LANG.cancel, this._handleCancel.bind(this))}
                    </div>
                );
            }
            if (this.props.mode === 'curve') {
                return (
                    <div className='footer'>
                        {this._renderFooterButton(LANG.okay, this._handleCurveComplete.bind(this))}
                        {this._renderFooterButton(LANG.cancel, this._handleCancel.bind(this))}
                    </div>
                );
            }
        }

        _renderFooterButton(label, onClick, isDisable) {
            let disable = '';
            if (isDisable) {
                disable = 'disabled';
                onClick = () => {};
            }
            return(
                <button
                        key={label}
                        className={`btn btn-default pull-right ${disable}`}
                        onClick={() => {onClick()}}
                    >
                        {label}
                </button>
            )
        }

        render() {
            let renderContent;
            switch (this.props.mode) {
                case 'sharpen':
                case 'crop':
                case 'curve':
                    renderContent = this._renderPhotoEditeModal();
                    break;
                case 'invert':
                    ProgressActions.open(ProgressConstants.NONSTOP_WITH_MESSAGE, LANG.processing);
                    renderContent = (<div/>)
                    break;
                default:
                    renderContent = (<div/>)
                    break;
            }
            return renderContent;
        }
    };
    return PhotoEditPanel;
});
