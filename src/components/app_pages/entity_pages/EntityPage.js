import {useState, useMemo, useContext} from "react";

import {DataFetcher} from "../../../classes/DataFetcher";
import {EntityReference} from "../../entity_refs/EntityReference";
import {EntityInfoPage} from "./subpages/InfoPage";
import {DropdownMenu} from "../../menus/DropdownMenu";
import {AppPageTabList} from "../tabs/AppPageTabList";

/* Placeholders */
const ScoringDisplay = () => <template></template>;
const MainMenu = () => <template></template>;
const ClassesMenu = () => <template></template>;
const FilteringPredicatesMenu = () => <template></template>;
const SortingPredicatesMenu = () => <template></template>;
const SubdivisionsMenu = () => <template></template>;
const EntityPageBody = () => <template></template>;
const OpenedTabList = () => <template></template>;
const SettingsMenu = () => <template></template>;
const SubmitEntityMenu = () => <template></template>;

// TODO: Import from one location instead:
const CLASSES_CLASS_ID = "4";
const USEFUL_RELATIONS_REL_ID = "19";


export const EntityPage = ({entID, initTab}) => {
  const [results, setState] = useState({});

  useMemo(() => {
    DataFetcher.fetchPublicSmallEntity(
      entID, (datatype, defStr, len, creatorID, isContained) => {
        setState(prev => {
          return {
            ...prev,
            datatype: datatype,
            defStr: defStr,
            len: len,
            creatorID: creatorID,
            isContained: isContained,
            isFetched: true,
          };
        });
      }
    );
  }, []);

  const {datatype, defStr, isContained, isFetched} = results;

  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <></>
    );
  }
 
  var classID;
  try {
    classID = JSON.parse(defStr).Class.substring(1);
  } catch (error) {
    classID = null;
  }

  return (
    <div className="entity-page">
      <EntityPageHeader entID={entID}/>
      <ScoringDisplay />
      <EntityPageMenu  entID={entID} entType={datatype} classID={classID} />
      <EntityPageBody />
      {/* TODO: Move the InfoPage under one of the topmost tabs instead. */}
      <DropdownMenu
        title={"Info"} children={<EntityInfoPage entID={entID} />}
        startAsExpanded
      />
    </div>
  );
};


const EntityPageHeader = ({entID}) => {
  return (
    <div className="entity-page-header">
      <h2><EntityReference entID={entID} isLink /></h2>
    </div>
  );
};



const EntityPageMenu = ({entID, entType, classID}) => {
  var initTabArr, initTab, moreTabsRelationID, moreTabsObjectID;
  switch (classID) {
    case CLASSES_CLASS_ID:
      initTabArr = [["info-tab", entID], ["instances-tab", classID]];
      initTab = ["instances-tab", classID];
      moreTabsRelationID = USEFUL_RELATIONS_REL_ID;
      break;
    default:
      initTabArr = [["info-tab", entID], ];
      initTab = ["info-tab", entID];
      moreTabsRelationID = USEFUL_RELATIONS_REL_ID;
  }

  return (
    <div className="entity-page-menu">
      <OpenedTabList />
      <AppPageTabList
        initTabArr={initTabArr} initTab={initTab}
        moreTabsRelationID={moreTabsRelationID}
        moreTabsObjectID={moreTabsObjectID}
      />
      <SettingsMenu />
      <SubmitEntityMenu />
    </div>
  );
};


