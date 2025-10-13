import React from "react";
import "./Target.css"; // External CSS file for styling

const DataTable = ({ dbData }) => {
  const data = dbData || [];

  return (
    <div className="target-Datacontainer">
      <table className="target-Datatable">
        <thead>
          <tr>
            <th>Category</th>
            <th>Current</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.category}</td>
              <td>{row.current}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
