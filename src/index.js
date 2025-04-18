import React from 'react';
import ReactDOM from 'react-dom/client';

// import {
//   BrowserRouter, Routes,
//   createBrowserRouter,
//   RouterProvider,
// } from "react-router-dom";


import {App} from './components/App.js';

import './style/style01.scss';
import './style/entity_refs/ref_style.scss';
import './style/entity_data/entity_data_style.scss';
import './style/pages/subpages_style.scss';
import './style/entity_elements/elements_style.scss';



// const router = createBrowserRouter([
//   {
//     path: "/*",
//     element: <SDBApp />,
//   },
// ]);


const myElement = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const root = ReactDOM.createRoot(document.getElementById('root'), {
  // identifierPrefix: '',
});
root.render(myElement);
