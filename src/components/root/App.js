import {useState, useLayoutEffect, createContext, useCallback} from "react";

import {useDispatch} from "../../hooks/old/useDispatch.js";

// import {appReducers} from "./appReducers.js";

import {AppHeader} from "./AppHeader.js";
import {AppPage} from "../app_pages/AppPage.js";


export const HOME_ENTITY_ID = "2";



const PAGE_LIST_CONTAINER_SELECTOR = ".page-list-container";
const PAGE_CONTAINER_SELECTOR = ".page-container";


// if (typeof(Storage) === "undefined") {
//   alert(
//     "This web application requires browser support for local " +
//     "storage in order to function correctly. It seems that your " +
//     "browser does not support local storage."
//   );
//   return;
// }


export const AccountContext = createContext();




export const App = (props) => {
  const pathname = window.location.pathname;
  const hasPath = pathname !== "/";
  const [state, setState] = useState({
    accountData: {
      userID: localStorage.session && localStorage.session.userID,
      sesIDHex: localStorage.session && localStorage.session.sesIDHex,
    },
    pageKeyArr: hasPath ? [0, 1] : [0],
    pagePathStore: {
      0: "/e" + HOME_ENTITY_ID,
      1: hasPath ? pathname : undefined,
    },
    nonce: 1,
    currInd: hasPath ? 1 : 0,
    prevInd: hasPath ? 0 : null,
    // scrollLeft: 0, scrollVelocity: 0, lastScrollAt: 0,

  });
  const {pagePathStore, pageKeyArr, currInd, accountData} = state;
console.log(pagePathStore);
  const [refCallback, dispatch] = useDispatch(
    appReducers, "app", setState, props
  );


  const getAccountData = useCallback((propName) => {
    return accountData[propName];
  }, Object.values(accountData))


  useLayoutEffect(() => {
    let currPagePath = pagePathStore[pageKeyArr[currInd]];
    let newPath = currPagePath.entID ? "e" + currPagePath.entID : "";
    window.history.pushState(null, "", newPath);
    // TODO: Refactor:
    appReducers["SCROLL_INTO_VIEW"]({}, currInd);
    window.onresize = (event) => {
      appReducers["SCROLL_INTO_VIEW"]({}, currInd);
    };
  }, [currInd])



  const appPages = pageKeyArr.map((pageKey, ind) => {
    let pagePath = pagePathStore[pageKey];
    return (
      <div key={pageKey} className={
        "page-container" + ((currInd === ind) ? " active" : "")
      }
        onClick={(e) => {
          if (currInd === ind) {
            appReducers["SCROLL_INTO_VIEW"]({}, ind);
          } else {
            dispatch(e.target, "self", "GO_TO_PAGE", ind);
          }
        }}
      >
        <AppPage pageKey={pageKey} pagePath={pagePath} />
      </div>
    );
  });

  return (
    <div className="app" ref={refCallback}>
      <AccountContext.Provider value={getAccountData}>
        <AppHeader
          setAppPage={void(0)}
          pageKeyArr={pageKeyArr} pagePathStore={pagePathStore}
          currInd={currInd}
        />
        <div className="page-list-container">
          {appPages}
        </div>
      </AccountContext.Provider>
    </div>
  );
};





const appReducers = {
  "OPEN_PAGE": function ({state}, [pagePath, callerPageKey]) {
    const {pageKeyArr, pagePathStore, nonce} = state;
    let callerColInd = pageKeyArr.indexOf(callerPageKey);
    let newNonce = nonce + 1;
    let newPageKeyArr = (callerColInd === -1) ?
      pageKeyArr.concat([newNonce]) :
      pageKeyArr.slice(0, callerColInd + 1).concat(
        [newNonce], pageKeyArr.slice(callerColInd + 1)
      )
    let newSpecStore = {...pagePathStore, [newNonce]: pagePath};
    let newCurrInd = callerColInd + 1;

    if (newCurrInd == state.prevInd) {
      // window.history.popState()...
    }

    state = this["GO_TO_PAGE"]({state}, newCurrInd);
    return {
      ...state,
      pageKeyArr: newPageKeyArr,
      pagePathStore: newSpecStore,
      nonce: newNonce,
    };
  },

  "GO_TO_PAGE": function ({state}, pageInd) {
    return {
      ...state,
      currInd: pageInd,
      prevInd: state.currInd,
    };
  },

  "CLOSE_PAGE": function ({state}, callerPageKey) {
    // TODO: Implement.
    alert("CLOSE_PAGE not implemented yet.");
  },

  getPageListContainerAndPositions: function () {
    const pageListContainer = document.querySelector(
      PAGE_LIST_CONTAINER_SELECTOR
    );

    const {left, right} = pageListContainer.getBoundingClientRect();
    const pos = {left: left, center: (right - left) / 2, right: right};

    // Get the center position of the page container.
    const pageContainers = pageListContainer.querySelectorAll(
      PAGE_CONTAINER_SELECTOR
    );
    const childPosArr = [];
    pageContainers.forEach((element, ind) => {
      let {left, right} = element.getBoundingClientRect();
      childPosArr[ind] = {
        left: left, center: left + (right - left) / 2, right: right
      };
    });

    return [pageListContainer, pos, childPosArr];
  },

  "SCROLL_INTO_VIEW": function ({state}, colInd) {
    // Get the page container and the positions.
    const [pageListContainer, pos, childPosArr] =
      this.getPageListContainerAndPositions();
    // And get the center position of the page container.
    const center = pos.center;

    // Get the amount to scroll to the new page.
    const centerDiff = childPosArr[colInd].center - center;
    
    // Now scroll by that amount.
    pageListContainer.scrollBy({left: centerDiff, behavior: "smooth"});

    return;
  },

  /* Account reducers */

  "LOG_IN": function ({state, props, node}, input, dispatch) {
    // TODO: Implement.
    alert("LOG_IN not implemented yet.");
  },
}


















// export const App = () => {
//   // On first render of the app, get the page from the URL and use it to set
//   // the initial state.
//   const initialPage = useMemo(() => getPageFromTop(), []);
//   const [{appPage}, setState] = useState({appPage: initialPage})

//   const [refCallback, dispatch] = useDispatch(appReducers, "app", setState);

//   return (
//     <div className="sdb-interface" ref={refCallback}>
//       <AccountContextProvider>{/* yields: session, accountManager.*/}
//         {/* <AppHeader setAppPage={void(0)} /> */}
//         <MainPage
//           isHidden={appPage !== "main"}
//         />
//         <LoginPage // Todo: Make sure that the LoginPage is refreshed
//         // when it is hidden.
//           isHidden={appPage !== "login"}
//         />
//         <SignupPage
//           isHidden={appPage !== "signup"}
//         />
//         {/* <TutorialPage
//           setAppPage={setAppPage}
//           isHidden={appPage !== "tutorial"}
//         /> */}
//         {/* TODO: Remove the following test page */}
//         <InsertPage
//           isHidden={appPage !== "insert"}
//         />
//       </AccountContextProvider>
//     </div>
//   );
// };


















// const Layout = (props) => {
//   const {children} = props;
//   return (
//     <AccountContextProvider> {/* yields: session, accountManager.*/}
//       <AppHeader setAppPage={void(0)} />
//       {children}
//       {/* <Outlet /> */}
//     </AccountContextProvider>
//   );
// };

// const IndexPage = ({}) => {
//   return (
//     <Navigate replace to={"/e" + HOME_ENTITY_ID} />
//   );
// };





// <AccountContextProvider> {/* yields: session, accountManager.*/}
// <div className="sdb-interface">
//   <AppPage
//     // initColSpec={{entID: 1}}
//     // initColSpec={{entID: 40}}
//     initColSpec={{entID: entID}} 
//     setAppPage={setAppPage}
//     isHidden={appPage !== "home"}
//   />
//   <LoginPage // Todo: Make sure that the LoginPage is refreshed when it is
//   // hidden.
//     setAppPage={setAppPage}
//     isHidden={appPage !== "login"}
//   />
//   <SignupPage
//     setAppPage={setAppPage}
//     isHidden={appPage !== "signup"}
//   />
//   {/* <TutorialPage
//     setAppPage={setAppPage}
//     isHidden={appPage !== "tutorial"}
//   /> */}
//   {/* TODO: Remove the following test page */}
//   <InsertPage
//     setAppPage={setAppPage}
//     isHidden={appPage !== "insert"}
//   />
// </div>
// {/* </AppPageContext.Provider> */}
// </AccountContextProvider>





    // <BrowserRouter>
    //   <Routes>
    //     <Route path="/" element={<Layout />}>
    //       <Route index element={<IndexPage />} />
    //       <Route path="login" element={<LoginPage />} />
    //       {/* Todo: Make sure that the LoginPage is refreshed when it is
    //       hidden. */}
    //       <Route path="signup" element={<SignupPage />} />
    //       {/* <Route path="tutorial" element={<TutorialPage />} /> */}
    //       <Route path="insert" element={<InsertPage />} />
    //       <Route key={"m"} path="*" element={<MainPage key={"m"} />} />
    //       {/* Wrong paths are handled in MainPage instead of here */}
    //     </Route>
    //   </Routes>
    // </BrowserRouter>



    // <Layout>
    //   <MainPage />
    //   <LoginPage />
    //   {/* Todo: Make sure that the LoginPage is refreshed when it is
    //   hidden. */}
    //   <SignupPage />
    //   {/* <TutorialPage /> */}
    //   <InsertPage />
    // </Layout>