import {useState, useMemo, useCallback} from "react";

import {basicEntIDs} from "../../../../entity_ids/basic_entity_ids.js";
import {DataFetcher} from "../../../classes/DataFetcher.js";
import {
  EntityReference, ScaleReference
} from "../../entity_refs/EntityReference.js";
import {EntityInfoPage} from "./subpages/InfoPage.js";
import {DropdownMenu} from "../../menus/DropdownMenu.js";
import {SubpagesWithTabs} from "./subpages/SubpagesWithTabs.js";

import {EntityList} from "../../entity_lists/EntityList.js";
import {ClassSubpage} from "./subpages/ClassSubpage.js";
import {RelationSubpage} from "./subpages/RelationSubpage.js";

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




export const EntityPage = ({entID, initTabID}) => {
  const [results, setState] = useState({});
  return <span>Placeholder...</span>;
  useMemo(() => {
    DataFetcher.fetchEntity(
      entID,
      (entType, defStr, len, creatorID, isEditable, readerWhitelistID) => {
        // setState(prev => {
        //   return {
        //     ...prev,
        //     entType: entType,
        //     defStr: defStr,
        //     len: len,
        //     creatorID: creatorID,
        //     isContained: isContained,
        //     isFetched: true,
        //   };
        // });
      }
    );
  }, []);

  const {entType, defStr, isContained, isFetched} = results;

  var classID;
  try {
    classID = JSON.parse(defStr).Class.substring(1);
  } catch (error) {
    classID = null;
  }


  const getPageCompFromID = useCallback(tabID => {
    if (tabID == basicEntIDs["relations/members"]) {
      return [ClassSubpage, {entID: entID}];
    }
    return [RelationSubpage, {objID: entID, relID: tabID}];
  }, [entID]);
 
  const initTabsJSON = JSON.stringify([
    [basicEntIDs["relations/members"], "Members"],
  ]);
  const tabScaleKeysJSON = JSON.stringify([
    [classID, basicEntIDs["relations/relations for members"]],
    [entID, basicEntIDs["relations/relations"]],
  ]);

  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <></>
    );
  }

  return (
    <div className="entity-page">
      <EntityPageHeader entID={entID}/>
      <SubpagesWithTabs
        initTabsJSON={[initTabsJSON]}
        getPageCompFromID={getPageCompFromID}
        getTabTitleFromID="Title"
        tabScaleKeysJSON={tabScaleKeysJSON}
        tabBarHeader={<ScaleReference
          objID={entID} relID={basicEntIDs["relations/relations"]}
        />}
        initTabID={initTabID}
      />
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

