import React from "react";
import PropTypes from "prop-types";

class TimeCell extends React.Component {
  constructor(props) {
    super(props);

    this.mouseDown = this.mouseDown.bind(this);
    this.elementRef = null;
  }

  mouseDown(e) {
    this.props.startSelect(this.props.state, e.target);
    e.preventDefault();
  }

  render() {
    const state = this.props.state;
    const [di, tf, s, h] = [
      state.dayIndex,
      state.timeFrom.replace(":", "-"),
      state.selected ? " selected" : "",
      state.hour ? " hour" : " half"
    ];
    const classNames = `time-cell time-cell-${di}-${tf}${s}${h}`;

    return (
      <td
        ref={input => {
          this.elementRef = input;
        }}
        className={classNames}
        onMouseDown={this.mouseDown}
      />
    );
  }
}

TimeCell.propTypes = {
  state: PropTypes.any.isRequired,
  startSelect: PropTypes.func.isRequired
};

export default TimeCell;
