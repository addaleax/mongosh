import React, { Component } from 'react';
import classnames from 'classnames';
import styles from './compass-shell.less';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Resizable } from 're-resizable';
import IconButton from '@leafygreen-ui/icon-button';
import Icon from '@leafygreen-ui/icon';

import { Shell } from '@mongosh/browser-repl';

import { ResizeHandle } from '../resize-handle';

const resizeableDirections = {
  top: false, // This property is controlled in the component.
  right: false,
  bottom: false,
  left: false,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false
};

const defaultShellHeightClosed = 24;
const defaultShellHeightOpened = 240;

export class CompassShell extends Component {
  static propTypes = {
    runtime: PropTypes.object,
    historyStorage: PropTypes.object
  };

  static defaultProps = {
    runtime: null
  };
  constructor(props) {
    super(props);

    this.state = {
      initialHistory: this.props.historyStorage ? null : [],
      isExpanded: false
    };
  }

  componentDidMount() {
    this.loadHistory();
  }

  resizableRef = null;
  lastOpenHeight = defaultShellHeightOpened;

  saveHistory = async(history) => {
    if (!this.props.historyStorage) {
      return;
    }

    try {
      await this.props.historyStorage.save(history);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  loadHistory = async() => {
    if (!this.props.historyStorage) {
      return;
    }

    try {
      const history = await this.props.historyStorage.load();
      this.setState({
        initialHistory: history
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.setState({
        initialHistory: []
      });
    }
  }

  shellToggleClicked = () => {
    if (this.state.isExpanded) {
      this.lastOpenHeight = this.resizableRef.sizeStyle.height;

      this.resizableRef.updateSize({
        width: '100%',
        height: defaultShellHeightClosed
      });
    } else {
      this.resizableRef.updateSize({
        width: '100%',
        height: this.lastOpenHeight
      });
    }

    this.setState({
      isExpanded: !this.state.isExpanded
    });
  }

  /**
   * Render CompassShell component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    const {
      isExpanded
    } = this.state;

    if (!this.props.runtime || !this.state.initialHistory) {
      return (<div />);
    }

    return (
      <Resizable
        className={styles['compass-shell']}
        defaultSize={{
          width: '100%',
          height: defaultShellHeightClosed
        }}
        id="content"
        minHeight={defaultShellHeightClosed}
        enable={{
          ...resizeableDirections,
          top: isExpanded
        }}
        ref={c => { this.resizableRef = c; }}
        handleComponent={{
          top: <ResizeHandle />,
        }}
      >
        <div className={styles['compass-shell-header']}>
          <button
            className={styles['compass-shell-toggle']}
            onClick={this.shellToggleClicked}
          >
            &gt;_MongoSH v0.9 Beta
          </button>
          {isExpanded && (
            <div>
              <IconButton
                className={styles['compass-shell-close-btn']}
                variant="dark"
                aria-label="Some Menu"
                onClick={this.shellToggleClicked}
              >
                <Icon glyph="X" />
              </IconButton>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className={classnames(styles['compass-shell-shell-container'])}>
            <Shell
              runtime={this.props.runtime}
              initialHistory={this.state.initialHistory}
              onHistoryChanged={this.saveHistory}
            />
          </div>
        )}
      </Resizable>
    );
  }
}

export default connect(
  (state) => ({
    runtime: state.runtime ? state.runtime.runtime : null
  }),
  {}
)(CompassShell);
