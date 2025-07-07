import React from "react";

// const GenericTable = ({
//   columns,
//   data,
//   emptyMessage = "No data available.",
// }) => {
//   if (!data || data.length === 0) {
//     return (
//       <div className="alert alert-info text-center" role="alert">
//         {emptyMessage}
//       </div>
//     );
//   }

//   return (
//     <div className="table-responsive">
//       {" "}
//       {/* Bootstrap class for responsive tables */}
//       <table className="table table-hover align-middle">
//         {" "}
//         {/* Bootstrap table classes */}
//         <thead>
//           <tr>
//             {" "}
//             {/* No whitespace/newlines directly inside <thead> or <tr> */}
//             {columns.map((column, index) => (
//               <th
//                 key={column.accessor || index}
//                 className={column.headerClassName || ""}
//                 scope="col"
//               >
//                 {column.header}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {data.map((row, rowIndex) => (
//             <tr key={row.id || rowIndex}>
//               {" "}
//               {/* No whitespace/newlines directly inside <tbody> or <tr> */}
//               {columns.map((column, colIndex) => (
//                 <td
//                   key={column.accessor || colIndex}
//                   className={column.cellClassName || ""}
//                 >
//                   {column.Cell
//                     ? column.Cell({ row, column })
//                     : row[column.accessor]}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

const GenericTable = ({ columns, data, emptyMessage = "No data available." }) => {
  if (!data || data.length === 0) {
    return (
      <div className="alert alert-info text-center" role="alert">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle"><thead><tr>
            {columns.map((column, index) => (
              <th key={column.accessor || index} className={column.headerClassName || ''} scope="col">
                {column.header}
              </th>
            ))}
          </tr></thead><tbody>
          {data.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map((column, colIndex) => (
                <td key={column.accessor || colIndex} className={column.cellClassName || ''}>
                  {column.Cell ? column.Cell({ row, column }) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody></table>
    </div>
  );
};

export default GenericTable;
