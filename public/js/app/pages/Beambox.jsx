define([
    'react',
    'app/actions/beambox',
    'jsx!views/beambox/Left-Panel',
    'jsx!pages/svg-editor',
    'jsx!widgets/Button-Group',
    'helpers/api/config',
    'helpers/i18n',
    'jsx!widgets/Modal',
    'jsx!views/Printer-Selector',
], function(
    React,
    beamboxEvents,
    LeftPanel,
    SvgGenerator,
    ButtonGroup,
    ConfigHelper,
    i18n,
    Modal,
    PrinterSelector
) {

    let Config = ConfigHelper(),
        lang = i18n.lang;

        'use strict';

    return function(args = {}) {
        let Svg = SvgGenerator(args);
            self = this;

        class view extends React.Component {
        constructor(){
            super();
            this.beamboxEvents = beamboxEvents.call(this);
            this.state = {
                openPrinterSelectorWindow: false
            };
        }

        componentDidMount() {
            let options = Config.read('laser-defaults') || {};
            if (options.material == null) {
                options.material = lang.laser.advanced.form.object_options.options[0];
            }

            options.objectHeight = options.objectHeight || 0;
            options.heightOffset = options.heightOffset || (Config.read('default-model') === 'fd1p' ? -2.3 : 0);
            options.isShading = !!options.isShading;
            if (!Config.read('laser-defaults')) {
                Config.write('laser-defaults', options);
            }
            this.setState({options});
          }

          _fetchFormalSettings(holder) {
              let options = Config.read('laser-defaults') || {},
                  max = lang.laser.advanced.form.power.max;
              return {
                  object_height: options.objectHeight,
                  height_offset: options.heightOffset || 0,
                  laser_speed: options.material.data.laser_speed,
                  //calibration: holder.state.debug || 0,
                  calibration: 0,
                  power: options.material.data.power / max,
                  //shading: (true === holder.refs.setupPanel.isShading() ? 1 : 0)
                  shading: true
              };
          }

          _handleExportClick(filemode) {
              this.laserEvents.exportTaskCode(this._fetchFormalSettings(), filemode);
          }

          _renderActionButtons() {
              console.log('randerActionButtons', this);
              //globalInteraction.onImageChanged(this.state.hasImage);

              var cx = React.addons.classSet,
                  buttons = [{
                      label: lang.laser.get_fcode,
                      className: cx({
                          //'btn-disabled': !this.state.hasImage,
                          'btn-disabled': false,
                          'btn-default': true,
                          'btn-hexagon': true,
                          'btn-get-fcode': true
                      }),
                      dataAttrs: {
                          'ga-event': 'get-laser-fcode'
                      },
                      onClick: this._handleExportClick.bind(this, '-f')
                  }, {
                      label: lang.monitor.start,
                      className: cx({
                          //'btn-disabled': !this.state.hasImage,
                          'btn-disabled': false,
                          'btn-default': true,
                          'btn-hexagon': true,
                          'btn-go': true
                      }),
                      dataAttrs: {
                          'ga-event': 'laser-goto-monitor'
                      },
                    onClick: this._handleStartClick.bind(this)
                }];

            return (
                <ButtonGroup buttons={buttons} className="beehive-buttons action-buttons"/>
            );
        }

        _handleStartClick() {
            this.setState({
                openPrinterSelectorWindow: true,
                machineCommand: 'start',
                settings: this._fetchFormalSettings()
            });
        }

        _renderPrinterSelectorWindow() {
            if (!this.state.openPrinterSelectorWindow) { return ''; }
            var self = this,
                onGettingPrinter = function(auth_printer) {
                    self.setState({
                        selectedPrinter: auth_printer,
                        openPrinterSelectorWindow: false
                    });

                    self.beamboxEvents.uploadFcode(self._fetchFormalSettings());
                },
                onClose = function(e) {
                    self.setState({
                        openPrinterSelectorWindow: false
                    });
                },
                content = (
                    <PrinterSelector
                        uniqleId="laser"
                        className="laser-device-selection-popup"
                        lang={lang}
                        onClose={onClose}
                        onGettingPrinter={onGettingPrinter}
                    />
                );

            return (
                <Modal content={content} onClose={onClose}/>
            );
        }


          _renderLeftPanel() {
          return (<LeftPanel/>);
          }

          render() {
            var actionButtons = this._renderActionButtons(),
                leftPanel = this._renderLeftPanel(),
                printerSelector = this._renderPrinterSelectorWindow();

            return (
                    <div className="studio-container beambox-studio">
                        {leftPanel}
                        <Svg />
                        {actionButtons}
                        {printerSelector}
                    </div>
            );
          }
        }

        return view;
    };
});