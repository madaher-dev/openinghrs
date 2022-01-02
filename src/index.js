import React from "react";
import ReactDOM from "react-dom";

import WorkingHours from "./components/working_hours";

import "./working_hours.scss";

function App() {
  var days = [
    { key: "mon", name: "Monday" },
    { key: "tue", name: "Tuesday" },
    { key: "wed", name: "Wednesday" },
    { key: "thu", name: "Thursday" },
    { key: "fri", name: "Friday" },
    { key: "sat", name: "Saturday" },
    { key: "sun", name: "Sunday" }
  ];

  var data = {};
  var fieldName = "location[working_hours]";

  return (
    <div className="App">
      <WorkingHours days={days} fieldName={fieldName} data={data} />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
