import {useState, createContext, useContext, useMemo} from "react";
import {ColumnListContext, ColumnContextProvider}
  from "./contexts/ColumnContext.js";

import {EntityPage} from "./EntityPages.js";


export const InterfaceMain = () => {
  const [columns, columnListManager] = useContext(ColumnListContext);

  let fst = columns.fst;
  const appColumns = columns.keys.map((val, ind) => 
    <div key={val}
      style={{display: fst <= ind && ind < fst + columns.num ? null : "none"}}
  >
      <AppColumn colKey={val} />
    </div>
  );
  return (
    <div className="interface-main">
      <div className="interface-margin" onClick={() => {
        columnListManager.cycleLeft();
      }}>
        <br/><span>&#10094;</span><br/>
      </div>
      <div className="column-container"
        style={{gridTemplateColumns: "1fr ".repeat(columns.num)}}
      >
        {appColumns}
      </div>
      <div className="interface-margin" onClick={() => {
        columnListManager.cycleRight();
      }}>
        <br/><span>&#10095;</span><br/>
      </div>
    </div>
  );
};







const AppColumn = ({colKey}) => {
  const columnEntID = JSON.parse(colKey).entID;
  return (
    <div className="app-column">
      <ColumnButtonContainer colKey={colKey} />
      <ColumnContextProvider colKey={colKey}>
        <EntityPage entID={columnEntID} />
      </ColumnContextProvider>
    </div>
  );
};
// appColumnCL.addCallback("data", function(data) {
//   data.copyFromAncestor("cl", 1);
//   data.cl ??= appColumnCL.getRelatedCL("EntityPage");;
//   data.recLevel = null;
//   data.maxRecLevel = null;
// });



const ColumnButtonContainer = ({colKey}) => {
  return (
    <div>
      {/* <PinButton /> */}
      <CloseColumnButton colKey={colKey} />
    </div>
  );
};
const CloseColumnButton = ({colKey}) => {
  const [, columnListManager] = useContext(ColumnListContext);

  return (
    <button type="button" className="close" onClick={() => {
      columnListManager.closeColumn(colKey);
    }}>
      <span>&times;</span>
    </button>
  );
};