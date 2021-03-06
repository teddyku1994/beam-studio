define([
    'jsx!widgets/Modal',
    'jsx!widgets/Button-Group',
    'jsx!/contexts/AlertContext'
], function (
    Modal,
    ButtonGroup,
    {AlertContext}
) {
    const React = require('react');
    let ret = {};

    class Alert extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                checkboxChecked: false
            }
        };

        componentDidMount() {
            ret.AlertContextCaller = this.context;
        }

        _renderCaption = (caption) => {
            return caption ? (
                <h2 className="caption">{caption}</h2>
            ) : null;
        }

        _renderMessage = (alert) => {
            return typeof alert.message === 'string' ?
                        <pre className="message" dangerouslySetInnerHTML={{__html: alert.message}}></pre> :
                        <pre className="message">{alert.message}</pre>
        }

        _renderCheckbox = (checkBoxText) => {
            let _handleCheckboxClick = () => {
                this.setState({checkboxChecked: !this.state.checkboxChecked});
            };

            return (
                <div className="modal-checkbox">
                    <input type="checkbox" onClick={_handleCheckboxClick}></input>{checkBoxText}
                </div>
            );
        }

        render() {
            const { index } = this.props;
            const {checkboxChecked} = this.state;
            const { alertStack, popAlertStack } = this.context;
            if (alertStack.length <= index) {
                return null;
            } 
            const alert = alertStack[index];
            let buttons = alert.buttons.map((b, i) => {
                const newButton = {...b};
                const buttonCallback = b.onClick;
                if (!checkboxChecked || !alert.checkBoxText || !alert.checkBoxCallbacks)  {
                    newButton.onClick = () => {
                        popAlertStack();
                        buttonCallback();
                    }
                } else {
                    if (typeof alert.checkBoxCallbacks === 'function') {
                        newButton.onClick = () => {
                            popAlertStack();
                            alert.checkBoxCallbacks();
                        }
                    } else if (alert.checkBoxCallbacks.length > i){
                        newButton.onClick = () => {
                            popAlertStack();
                            alert.checkBoxCallbacks[i]();
                        }
                    } else {
                        newButton.onClick = () => {
                            popAlertStack();
                            buttonCallback();
                        };
                    }
                }
                return newButton;
            });

            let checkBox = alert.checkBoxText ? this._renderCheckbox(alert.checkBoxText) : null;
            
            return (
                <Modal>
                    <div className="modal-alert">
                        {this._renderCaption(alert.caption)}
                        {this._renderMessage(alert)}
                        {checkBox}
                        <ButtonGroup buttons={buttons}/>
                    </div>
                    <Alert 
                        index={index+1}
                    />
                </Modal>
            );
        }
    };
    Alert.contextType = AlertContext;
    ret.Alert = Alert

    return ret;
});