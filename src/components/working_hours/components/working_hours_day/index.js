import _ from "underscore";
import React from "react";
import PropTypes from "prop-types";
import TimeCell from "../time_cell";
import { getWorkingHoursSelectedRanges } from "../../util";

class WorkingHoursDay extends React.Component {
  render() {
    const num = this.props.timeCells.length;
    const timeCells = this.props.timeCells;

    // render half-hour time cells
    const timeCellElements = _.range(num).map(i => (
      <TimeCell
        key={`timeCell-${timeCells[i].id}`}
        ref={input => {
          if (input == null) return;
          timeCells[input.props.state.index].elementRef = input;
        }}
        state={timeCells[i]}
        startSelect={this.props.startSelect}
      />
    ));

    // calculate selected ranges
    const ranges = getWorkingHoursSelectedRanges(timeCells);

    // humanize the timespan ranges
    const rangeStr = _.map(ranges, r => {
      const tmp = [timeCells[r.start].timeFrom, timeCells[r.end].timeTo]; //.replace(/:00$/, '')
      return tmp.join("-");
    }).join(", ");

    return (
      <tr className="day">
        <td className="day-name">
          {rangeStr.length > 0 && (
            <div className="timespan-container">
              <div className="timespan-overlay">
                <span className="timespan">{rangeStr}</span>
              </div>
            </div>
          )}
          {this.props.name}
        </td>
        {timeCellElements}
        <td className="reset">
          <button
            className="btn btn-primary btn-xs working-hours-reset"
            onClick={e => {
              this.props.resetDay(e, this.props.index);
            }}
          >
            Reset
          </button>
        </td>
      </tr>
    );
  }
}

WorkingHoursDay.propTypes = {
  name: PropTypes.string.isRequired,
  timeCells: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired,
  startSelect: PropTypes.func.isRequired,
  resetDay: PropTypes.func.isRequired
};

export default WorkingHoursDay;
