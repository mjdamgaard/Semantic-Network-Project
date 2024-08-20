import {useState, useMemo, useContext} from "react";
import {useQuery} from "../hooks/DBRequests.js";
// import {
//   MaxRatingSetCombiner, SimpleSetGenerator,
// } from "/src/SetGenerator.js";

import {PropStructFetcher} from "./PropStructFetcher.js";

import {AccountManagerContext} from "../contexts/AccountContext.js";

import {PagesWithTabs} from "./PagesWithTabs.js";
import {
  EntityID, EntityTitle, ContextDisplay
} from "./EntityTitles.js";
import {InstListDisplay} from "./InstListDisplay.js";
import {RatingElement} from "./Ratings.js";
import {SemanticPropertyElement} from "./EntityElements.js";
import {
  SubmitEntityOfTemplateField, SubmitInstanceOfCategoryField,
  SubmitTemplateForTypeField, SubmitEntityOfTypeField,
} from "./SubmissionFields.js";

import {
  SimpleInstListGenerator, MaxRatingInstListCombiner
} from "../classes/InstListGenerator.js";



/* Placeholders */
// const EntityTitle = () => <template></template>;
// const FullEntityTitle = () => <template></template>;
// const EntityIDDisplay = () => <template></template>;
// const ContextDisplay = () => <template></template>;
// const SemanticPropertyElement = () => <template></template>;
// const EntityRatingsPage = () => <template></template>;
// const PropertyCategoryPage = () => <template></template>;
// const RelevantRatingsTypePage = () => <template></template>;
// const RelevantPropertiesTypePage = () => <template></template>;
// const SubmitEntityPage = () => <template></template>;
// const SubmitEntityField = () => <template></template>;
// const CategoryInstancesPage = () => <template></template>;
const SubmitInstanceField = () => <template></template>;
const CategoryDisplay = () => <template></template>;
// const PropStructDisplayPlaceholder = () => <span></span>;


const PropStructDisplay = ({entID, fullPropStruct, entDataArr}) => {
  return (
    <div>
      <h4>Full property struct:</h4>
      <div>{JSON.stringify(fullPropStruct)}</div>
      <h4>Entity ID:</h4>
      <div>{entID}</div>
      <h4>Entity data array:</h4>
      <div>{JSON.stringify(entDataArr)}</div>
    </div>
  );
};

export const EntityPage = ({entID, initTab}) => {

  // TODO: Query for the topmost types for the entity (entID), and use them to
  // specify the tabs. *Or maybe look up types in fullPropStruct, or do both..

  // const [results, setResults] = useState([]);
  // useQuery(results, setResults, {
  //   req: "instList",
  //   u: ...,
  // });
  
  // TODO: Remove: Temporary module while refactoring and debugging:
  var typeID, cxtID;
  return (
    <div className="entity-page">
      <div className="entity-page-header">
        <h2><EntityTitle entID={entID} isLink /></h2>
        <div className="full-title">
            <PropStructFetcher
              entID={entID} ChildModule={PropStructDisplay} extraProps={{}}
            />
        </div>
        {/* <div><EntityIDDisplay entID={entID} /></div> */}
      </div>
      {/* <PagesWithTabs tabDataArr={tabDataArr} initTab={initTab} /> */}
    </div>
  );


  // Construct the tabs on the EntityPage.
  const [tabDataArr, defaultTab] = getTabDataArrAndDefaultTab(
    entID, typeID, cxtID
  );
  initTab ??= defaultTab;

  return (
    <div className="entity-page">
      <div className="entity-page-header">
        <h2><EntityTitle entID={entID} isLink /></h2>
        <div className="full-title">
            <b>Definition:</b> <EntityTitle entID={entID} isFull />
        </div>
        <div><EntityIDDisplay entID={entID} /></div>
      </div>
      <PagesWithTabs tabDataArr={tabDataArr} initTab={initTab} />
    </div>
  );
};


function getTabDataArrAndDefaultTab(entID, typeID, cxtID) {
  let tabDataArr = [
    ["Info", <EntityInfoPage entID={entID} typeID={typeID} />],
    ["Ratings", <EntityRatingsPage entID={entID} typeID={typeID} />],
    ["Related to", <PropertyCategoryPage entID={entID} propID={42} />],
  ];
  let defaultTab;
  
  switch (typeID) {
    case 1:
      tabDataArr.push(
        ["Relevant ratings", <RelevantRatingsTypePage entID={entID} />],
        ["Relevant properties", <RelevantPropertiesTypePage entID={entID} />],
        ["Templates", <PropertyCategoryPage entID={entID} propID={85} />],
        // ["Submit entity", <SubmitEntityOfTypePage entID={entID} />],
      );
      if (![3, 4, 5, 7, 8].includes(entID)) {
        tabDataArr.push(
          ["Submit entity", <SubmitEntityOfTypePage entID={entID} />],
        );
      }
      if (![1, 3, 4, 5, 7, 8].includes(entID)) {
        tabDataArr.push(
            ["Submit template", <SubmitTemplatePage entID={entID} />],
        );
      }
      if (entID == 1) {
        tabDataArr.push(
            ["Types", <TypesCategoryPage />],
        );
      }
      defaultTab = "Relevant ratings";
      break;
    case 2:
      tabDataArr.push(
        ["Subcategories", <PropertyCategoryPage entID={entID} propID={37} />],
        ["Instances", <CategoryInstancesPage entID={entID} />],
        ["Supercategories", <PropertyCategoryPage entID={entID} propID={47} />],
        ["Submit instance", <SubmitCategoryInstancePage entID={entID} />],
      );
      defaultTab = "Subcategories";
      break;
    case 3:
      tabDataArr.push(
        ["Submit entity", <SubmitEntityOfTemplatePage entID={entID} />],
      );
      defaultTab = "Submit entity";
      break;
    default:
      defaultTab = "Info";
      break;
  }
  // TODO: Implement the following two tabs as well:
  // tabDataArr.push(
  //     ["Comments", <EntityCommentsPage />],
  //     ["Discussions", <EntityDiscussionsPage />],
  // );

  return [tabDataArr, defaultTab];
}



export const EntityIDDisplay = ({entID}) => {
  return (
    <span className="entity-id-display">
      <b>ID:</b> <EntityID entID={entID}/>
    </span>
  );
};



export const TypesCategoryPage = ({propID, entID}) => {
  const accountManager = useContext(AccountManagerContext);
  const [lg, ] = useState(
    new SimpleInstListGenerator(
      {catID: 11},
      accountManager
    )
  );

  return (
    <div>
      <InstListDisplay listGenerator={lg} />
    </div>
  );
};


export const PropertyCategoryPage = ({propID, entID}) => {
  const accountManager = useContext(AccountManagerContext); 
  const [lg, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#" + propID + "|#" + entID}},
      accountManager
    )
  );

  return (
    <div>
      <InstListDisplay listGenerator={lg} />
    </div>
  );
};


export const CategoryInstancesPage = ({entID}) => {
  const accountManager = useContext(AccountManagerContext);
  const [lg, ] = useState(
    new SimpleInstListGenerator(
      {catID: entID},
      accountManager,
    )
  );

  return (
    <div>
      <InstListDisplay listGenerator={lg} />
    </div>
  );
};






export const EntityRatingsPage = ({entID, typeID}) => {
  const accountManager = useContext(AccountManagerContext);
  const [lg1, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#54|#" + entID}},
      accountManager,
    )
  );
  const [lg2, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#52|#" + typeID}},
      accountManager,
    )
  );
  const [lg, ] = useState(
    new MaxRatingInstListCombiner([lg1, lg2])
  );

  return (
    <div>
      <h4>Relevant ratings</h4>
      <InstListDisplay
        listGenerator={lg}
        ElemComponent={RatingElement} extraProps={{instID: entID}}
      />
    </div>
  );
};






export const SubmitEntityOfTypePage = ({entID}) => {
  return (
    <SubmitEntityOfTypeField typeID={entID} />
  );
};

export const SubmitTemplatePage = ({entID}) => {
  return (
    <SubmitTemplateForTypeField typeID={entID} />
  );
};

export const SubmitEntityOfTemplatePage = ({entID}) => {
  return (
    <SubmitEntityOfTemplateField tmplID={entID} />
  );
};

export const SubmitCategoryInstancePage = ({entID}) => {
  return (
    <SubmitInstanceOfCategoryField catID={entID} />
  );
};




export const EntityInfoPage = ({entID, typeID}) => {
  const accountManager = useContext(AccountManagerContext);

  // (Change to use useMemo if needing to be able to update props.)
  const [lg1, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#58|#" + entID}},
      accountManager,
    )
  );
  const [lg2, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#59|#" + typeID}},
      accountManager,
    )
  );
  const [lg, ] = useState(
    new MaxRatingInstListCombiner([lg1, lg2])
  );

  return (
    <div>
      <InstListDisplay
        listGenerator={lg}
        ElemComponent={SemanticPropertyElement}
        extraProps={{ownerEntID: entID}}
      />
    </div>
  );
};




export const RelevantRatingsTypePage = ({entID}) => {
  const accountManager = useContext(AccountManagerContext);
  const [lg, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#52|#" + entID}},
      accountManager
    )
  );

  return (
    <div>
      <h4>Relevant categories to rate for type instances of this type</h4>
      <InstListDisplay
        listGenerator={lg}
      />
    </div>
  );
};


export const RelevantPropertiesTypePage = ({entID}) => {
  const accountManager = useContext(AccountManagerContext);
  const [lg, ] = useState(
    new SimpleInstListGenerator(
      {catSK: {cxtID: 21, defStr: "#59|#" + entID}},
      accountManager
    )
  );

  return (
    <div>
      <h4>Relevant properties for type instances of this type</h4>
      <InstListDisplay
        listGenerator={lg}
      />
    </div>
  );
};
