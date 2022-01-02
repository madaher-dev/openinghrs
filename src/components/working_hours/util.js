import _ from "underscore";

export function getWorkingHoursSelectedRanges(timeCells) {
  // calculate selected ranges
  const ranges = _.chain(timeCells)
    .reduce((r, v, i) => {
      if (!v.selected) return r;
      if (
        r.length === 0 ||
        i !==
          _.chain(r)
            .last()
            .last()
            .value().index +
            1
      )
        r.push([{ value: v, index: i }]);
      else _.last(r).push({ value: v, index: i });
      return r;
    }, [])
    .map(e => ({ start: e[0].index, end: _.last(e).index }))
    .value();

  // enable range overlap from 24-0
  if (
    ranges.length > 0 &&
    _.last(ranges).end === timeCells.length - 1 &&
    ranges[0].start === 0
  ) {
    _.last(ranges).end = ranges[0].end;
    ranges.splice(0, 1);
  }

  return ranges;
}
