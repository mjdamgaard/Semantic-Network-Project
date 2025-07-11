import {createContext} from "react";
import {
  useDispatch
} from "../../hooks/useDispatch.js"
import React from 'react';

import {EntityPage} from "./entity_pages/EntityPage.js";
import {InitialInsertsPage} from "../../../inserts/InitialInsertsPage.js";

const PageContext = createContext();

/* Placeholders */
// const ListGeneratorPage = () => <template></template>;



export const AppPage = (props) => {
  const {pageKey, pagePath} = props;
  const [dispatch, ref] = useDispatch(
    appPageActions, null, null, props
  );

  var page;
  if (/^\/e[1-9]/.test(pagePath)) {
    page = <EntityPage entID={pagePath.match(/[1-9][0-9]*/)[0]} />;
  }
  // Temporary initial insert page used for development.
  else if (pagePath === "/init_inserts") {
    page = <InitialInsertsPage />;
  }

  return (
    <div className="app-page" ref={ref}>
      <PageButtonContainer pageKey={pageKey} />
      <PageContext.Provider value={pageKey}>
        {page}
      </PageContext.Provider>
    </div>
  );
};



const appPageActions = {
  "OPEN_PAGE": (pagePath, setState, {state, props}, node, dispatch) => {
    let callerPageKey = props.pageKey;
    dispatch(node.parentNode, "OPEN_PAGE", [pagePath, callerPageKey]);
  },
}






const PageButtonContainer = ({pageKey}) => {
  return (
    <div>
      {/* <PinButton /> */}
      <ClosePageButton pageKey={pageKey} />
    </div>
  );
};

const ClosePageButton = (props) => {
  const {pageKey} = props;
  const [ref, dispatch] = useDispatch(
    closePageButtonReducers, null, null, props
  );

  return (
    <button type="button" className="close" ref={ref} onClick={() => {
      // pageListManager.closePage(pageKey);
    }}>
      <span>&times;</span>
    </button>
  );
};



const closePageButtonReducers = {
  "CLOSE_PAGE": ({props, node}, _, dispatch) => {
    let callerPageKey = props.pageKey;
    dispatch(node, "app", "CLOSE_PAGE", callerPageKey);
  },
}
