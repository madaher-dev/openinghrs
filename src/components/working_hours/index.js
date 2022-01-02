import _ from "underscore";
import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import WorkingHoursDay from "./components/working_hours_day";
import { getWorkingHoursSelectedRanges } from "./util";

// select working hours in half-hour intervals for each day of the week
class WorkingHours extends React.Component {
  constructor(props) {
    super(props);

    this.resetAll = this.resetAll.bind(this);
    this.resetDay = this.resetDay.bind(this);
    this.startSelect = this.startSelect.bind(this);
    this.updateSelect = this.updateSelect.bind(this);

    this.state = {
      days: [], // state model for this control and children
      isSelecting: false, // if there is an active selection
      selectionOldCellStates: [], // the state of all cells before the selection started
      selectionState: true, // set or clear selection state for the current selection range
      selectionFromCell: null, // the current selection started on this cell
      previousUpdateSelectionToCell: null // avoid consecutive updates on same cell
    };

    // generate the state model for this control and children
    const num = 48;
    const newTimeCellDefinition = function(d, i) {
      // restore saved values from database on init
      const data = (this.props.data || {})[this.props.days[d].key];

      // from and to hours, half-hour flag
      const [hourFrom, hourTo, isHalf] = [
        Math.floor(i / 2),
        Math.ceil(i / 2),
        i % 2 === 1
      ];

      // from and to times as floating point
      const [f0, f1] = [
        hourFrom + (isHalf ? 0.5 : 0),
        hourTo + (isHalf ? 0 : 0.5)
      ];

      return {
        // unique time cell id
        id: d * num + i,
        // day of the week (0-6)
        dayIndex: d,
        // time cell index in current day
        index: i,
        // initial selection state for cell
        selected:
          data === undefined
            ? false
            : _.any(
                data,
                ts =>
                  (ts[0] <= f0 && ts[1] >= f1) ||
                  (ts[0] > ts[1] &&
                    ((f0 >= ts[0] && f1 <= 24.0) || (f1 <= ts[1] && f0 >= 0)))
              ),
        // is this a full-hour or half-hour cell
        hour: !isHalf,
        // from time as string (hh:mm)
        timeFrom:
          (hourFrom < 10 ? `0${hourFrom}` : hourFrom) +
          (isHalf ? ":30" : ":00"),
        // to time as string (hh:mm)
        timeTo:
          (hourTo < 10 ? `0${hourTo}` : hourTo) + (!isHalf ? ":30" : ":00")
      };
    }.bind(this);

    this.state.days = _.map(this.props.days, (day, d) => ({
      timeCells: _.range(num).map(i => newTimeCellDefinition(d, i))
    }));
  }

  componentWillMount() {
    this.mouseUpEventHandler = this.mouseUp.bind(this);
    this.mouseMoveEventHandler = this.mouseMove.bind(this);
    this.touchStartEventHandler = this.touchStart.bind(this);
    this.touchEndEventHandler = this.touchEnd.bind(this);
    this.touchMoveEventHandler = this.touchMove.bind(this);
    document.addEventListener("mouseup", this.mouseUpEventHandler, false);
    document.addEventListener("mousemove", this.mouseMoveEventHandler, false);
    document.addEventListener("touchstart", this.touchStartEventHandler, {
      capture: false,
      passive: false
    });
    document.addEventListener("touchend", this.touchEndEventHandler, {
      capture: false,
      passive: false
    });
    document.addEventListener("touchmove", this.touchMoveEventHandler, {
      capture: false,
      passive: false
    });
  }

  componentWillUnmount() {
    document.removeEventListener("mouseup", this.mouseUpEventHandler, false);
    document.removeEventListener(
      "mousemove",
      this.mouseMoveEventHandler,
      false
    );
    document.removeEventListener("touchstart", this.touchStartEventHandler, {
      capture: false,
      passive: false
    });
    document.removeEventListener("touchend", this.touchEndEventHandler, {
      capture: false,
      passive: false
    });
    document.removeEventListener("touchmove", this.touchMoveEventHandler, {
      capture: false,
      passive: false
    });
  }

  mouseUp(e) {
    if (!this.state.isSelecting) return;

    this.endSelect();
    e.preventDefault();
  }

  mouseMove(e) {
    if (!this.state.isSelecting) return;

    this.updateSelect(e.clientX, e.clientY);
    e.preventDefault();
  }

  touchStart(e) {
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;

    for (let d = 0; d < this.state.days.length; d += 1) {
      for (let i = 0; i < this.state.days[d].timeCells.length; i += 1) {
        const timecell = this.state.days[d].timeCells[i];
        const domNode = ReactDOM.findDOMNode(timecell.elementRef);
        const rc = domNode.getBoundingClientRect();

        if (y >= rc.y && y < rc.y + rc.height) {
          if (x >= rc.x && x < rc.x + rc.width) {
            this.startSelect(timecell, domNode);
            e.preventDefault();
            break;
          }
        }
      }
    }
  }

  // trigger end selection when dragging
  touchEnd(e) {
    if (!this.state.isSelecting) return;

    this.endSelect();
    e.preventDefault();
  }

  // trigger update selection when dragging
  touchMove(e) {
    if (!this.state.isSelecting) return;

    this.updateSelectTouch(e);
    e.preventDefault();
  }

  // start time cell selection
  startSelect(state, el) {
    this.state.isSelecting = true;

    this.state.selectionOldCellStates = _.map(this.state.days, day => ({
      timeCells: _.map(day.timeCells, item => ({
        index: item.index,
        selected: item.selected
      }))
    }));
    this.state.selectionFromCell = state;
    this.state.selectionState = !state.selected;

    this.updateSelectInternal(state, el);
  }

  // end time cell selection
  endSelect() {
    this.state.isSelecting = false;
    this.state.selectionOldCellStates = [];
    this.state.previousUpdateSelectionToCell = null;
  }

  // update time cell selection (get state for time cell closest to x-coordinate)
  updateSelect(x, y) {
    for (let d = 0; d < this.state.days.length; d += 1) {
      for (let i = 0; i < this.state.days[d].timeCells.length; i += 1) {
        const timecell = this.state.days[d].timeCells[i];
        const domNode = ReactDOM.findDOMNode(timecell.elementRef);
        const rc = domNode.getBoundingClientRect();

        if (
          (y >= rc.y && y < rc.y + rc.height) ||
          (d === 0 && y < rc.y) ||
          (d === this.state.days.length - 1 && y > rc.y + rc.height - 1)
        ) {
          if (
            (x >= rc.x && x < rc.x + rc.width) ||
            (i === 0 && x < rc.x) ||
            (i === this.state.days[d].timeCells.length - 1 &&
              x > rc.x + rc.width - 1)
          ) {
            this.updateSelectInternal(this.state.days[d].timeCells[i], domNode);
            break;
          }
        }
      }
    }
  }

  // update time cell selection (from touch event)
  updateSelectTouch(e) {
    this.updateSelect(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
  }

  // update time cell selection based on start and end elements (state)
  updateSelectInternal(state) {
    if (state === this.state.previousUpdateSelectionToCell) return;
    this.state.previousUpdateSelectionToCell = state;

    const [fromCell, toCell] = [this.state.selectionFromCell, state];
    let [fromY, toY, fromX, toX] = [
      fromCell.dayIndex,
      toCell.dayIndex,
      fromCell.index,
      toCell.index
    ];

    // swap from and to, if from > to
    if (fromY > toY) [fromY, toY] = [toY, fromY];
    if (fromX > toX) [fromX, toX] = [toX, fromX];

    // set selection status for all time cells
    // current selection is set based on the state of the start element
    // time cells not in current selection are reset to cached state
    const newState = {
      days: _.map(this.state.days, d => ({
        timeCells: _.map(d.timeCells, c => Object.assign({}, c))
      }))
    };
    for (let d = 0; d < this.state.days.length; d += 1) {
      for (let i = 0; i < this.state.days[d].timeCells.length; i += 1) {
        const oldState = this.state.selectionOldCellStates[d].timeCells[i];

        if (d >= fromY && d <= toY && i >= fromX && i <= toX) {
          newState.days[d].timeCells[i].selected = this.state.selectionState;
        } else {
          newState.days[d].timeCells[i].selected = oldState.selected;
        }
      }
    }

    this.setState(newState);
  }

  // reset working hours for every day of the week
  resetAll(e) {
    const newState = {
      days: _.map(this.state.days, d => ({
        timeCells: _.map(d.timeCells, c => Object.assign({}, c))
      }))
    };
    for (let d = 0; d < this.state.days.length; d += 1) {
      for (let i = 0; i < this.state.days[d].timeCells.length; i += 1) {
        newState.days[d].timeCells[i].selected = false;
      }
    }

    this.setState(newState);
    e.preventDefault();
  }

  // reset working hours for one given day of the week
  resetDay(e, index) {
    const newState = {
      days: _.map(this.state.days, d => ({
        timeCells: _.map(d.timeCells, c => Object.assign({}, c))
      }))
    };
    for (let i = 0; i < this.state.days[index].timeCells.length; i += 1) {
      newState.days[index].timeCells[i].selected = false;
    }

    this.setState(newState);
    e.preventDefault();
  }

  render() {
    // render days
    const days = _.map(this.props.days, (day, i) => (
      <WorkingHoursDay
        key={day.name}
        name={day.name}
        index={i}
        timeCells={this.state.days[i].timeCells}
        resetDay={this.resetDay}
        startSelect={this.startSelect}
      />
    ));

    // render headers
    const timeHeaders = _.chain(_.range(24))
      .map(i => [
        <td key={i} className="header">
          <span>{i < 10 ? `0${i}` : i}</span>
        </td>,
        <td key={`${i}-part`} className="header part">
          <span>30</span>
        </td>
      ])
      .flatten()
      .value();

    // translate time cell indices to actual timespan ranges
    const dayWorkingHoursOutputs = [];
    for (let d = 0; d < this.state.days.length; d += 1) {
      const timeCells = this.state.days[d].timeCells;
      const ranges = getWorkingHoursSelectedRanges(timeCells);
      const day = this.props.days[d];

      if (ranges.length === 0) {
        dayWorkingHoursOutputs.push(
          <input
            key={`who-${day.name}-0-from-hours`}
            name={`${this.props.fieldName}[${day.key}]`}
            type="hidden"
            value=""
          />
        );
      }

      _.each(ranges, (r, index) => {
        const from = timeCells[r.start].timeFrom.split(":");
        const to = timeCells[r.end].timeTo.split(":");
        dayWorkingHoursOutputs.push(
          <input
            key={`who-${day.name}-${index}-from-hours`}
            name={`${this.props.fieldName}[${day.key}][][from][hours]`}
            type="hidden"
            value={from[0]}
          />
        );
        dayWorkingHoursOutputs.push(
          <input
            key={`who-${day.name}-${index}-from-minutes`}
            name={`${this.props.fieldName}[${day.key}][][from][minutes]`}
            type="hidden"
            value={from[1]}
          />
        );
        dayWorkingHoursOutputs.push(
          <input
            key={`who-${day.name}-${index}-to-hours`}
            name={`${this.props.fieldName}[${day.key}][][to][hours]`}
            type="hidden"
            value={to[0]}
          />
        );
        dayWorkingHoursOutputs.push(
          <input
            key={`who-${day.name}-${index}-to-minutes`}
            name={`${this.props.fieldName}[${day.key}][][to][minutes]`}
            type="hidden"
            value={to[1]}
          />
        );
      });
    }

    return (
      <div>
        <table className="working-hours">
          <thead>
            <tr className="hours">
              <td />
              {timeHeaders}
              <td />
              <td />
            </tr>
          </thead>
          <tbody>
            {days}
            <tr>
              <td className="reset-all" colSpan="49">
                <button
                  className="btn btn-primary btn-xs working-hours-reset"
                  onClick={this.resetAll}
                >
                  Reset All
                </button>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
        {dayWorkingHoursOutputs}
      </div>
    );
  }
}

WorkingHours.propTypes = {
  fieldName: PropTypes.string.isRequired,
  days: PropTypes.array.isRequired,
  data: PropTypes.object
};

export default WorkingHours;
