import {useState, useMemo, useContext} from "react";

import {DataFetcher} from "../../../../classes/DataFetcher.js";
import {DropdownMenu} from "../../../menus/DropdownMenu.js";
import {EntityReference} from "../../../entity_refs/EntityReference.js";
import {XMLText, XMLTextFromEntID} from "../../../texts/XMLText.js";

/* Placeholders */
// const XMLText = () => <template></template>;

const CLASS_CLASS_ID = "2";
const ENTITY_CLASS_ID = "4";
const ENTITY_CLASS_DESC_ID = "5";


export const EntityInfoPage = ({entID}) => {
  // TODO: Refactor this as a hook instead, returning results.
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

  var content;
  if (datatype === 'x') {
    content = <>
      <h1>Text content</h1>
      <XMLText xml={defStr} />
    </>;
  }
  else if (datatype === 'j') {
    content = <JSONEntityInfoPageContent
      entID={entID} defStr={defStr} isContained={isContained}
    />;
  }
  else {
    content = <>{
      "Entity with datatype identifier '" + datatype +
      "' is not implemented yet."
    }</>;
  }

  return (
    <div className="info-page">
      {content}
    </div>
  );
};




const JSONEntityInfoPageContent = ({entID, defStr, isContained}) => {
  if (!isContained) {
    return (
      <>{"Invalid Entity #" + entID + " (definition is too long)"}</>
    );
  }
  var def;
  try {
    def = JSON.parse(defStr);
  }
  catch (error) {
    return (
      <>{"Invalid Entity #" + entID + " (invalid JSON)"}</>
    );
  }

  if (Array.isArray(def)) {
    return (
      <>{"Array #" + entID + " (arrays are not yet implemented)"}</>
    );
  }
  else if (def && typeof def === "object") {
    return (
      <div className="json-entity">
        <ObjectEntityInfoPageContent entID={entID} defObj={def} />
      </div>
    );
  }
  else if (typeof def === "string") {
    return (
      <>{"String #" + entID + " (strings are not yet implemented)"}</>
    );
  }
  else if (typeof def === "number") {
    return (
      <>{"Number #" + entID + " (numbers are not yet implemented)"}</>
    );
  }
};



const ObjectEntityInfoPageContent = ({entID, defObj}) => {
  const attributeMembers =  Object.entries(defObj).map(([key, val], ind) => {
    let parsedKey = key.match(/[a-z0-9\-]+/g).join();
    if (/^@[1-9[0-9]*$/.test(val)) {
      val = <EntityReference entID={val.substring(1)} isLink />
    }
    return (
      <div key={ind} className={"member-" + parsedKey}>
        <div className="attribute-name">{key}</div>
        <div className="attribute-value">{val}</div>
      </div>
    );
  });

  var descriptionText;
  if (/^@[1-9][0-9]*$/.test(defObj.description)) {
    let descriptionID = defObj.description.substring(1);
    descriptionText = <XMLTextFromEntID entID={descriptionID} />;
  }
  else {
    descriptionText = "Description attribute is ill-formed or missing."
  }


  var classDescriptions;
  if (/^@[1-9][0-9]*$/.test(defObj.class)) {
    let classID = defObj.class.substring(1);
    if (classID != CLASS_CLASS_ID) {
      classDescriptions = <ClassDescriptions classID={classID} />;
    }
    else if (defObj["parent class"]) {
      let parentClass = defObj["parent class"];
      if (/^@[1-9][0-9]*$/.test(parentClass)) {
        let parentClassID = parentClass.substring(1);
        classDescriptions = <ClassDescriptions classID={parentClassID} />;
      }
      else {
        classDescriptions = <>{"Parent class attribute is ill-formed."}</>;
      }
    }
    else {
      classDescriptions = <></>;
    }
  }
  else {
    classDescriptions = <>{"Class attribute is ill-formed or missing."}</>;
  }

  return (
    <>
      <DropdownMenu
        title={"Attributes"} children={attributeMembers} startAsExpanded
      />
      <DropdownMenu
        title={"Description"} children={descriptionText} startAsExpanded
      />
      {classDescriptions}
      <DropdownMenu
        title={<EntityReference entID={ENTITY_CLASS_ID} isLink />}
        children={<XMLTextFromEntID entID={ENTITY_CLASS_DESC_ID} />}
      />
    </>
  );
};



const ClassDescriptions = ({classID, maxRecLevel = 7, recLevel = 0}) => {
  const [results, setState] = useState({});
  useMemo(() => {
    DataFetcher.fetchPublicSmallEntity(
      classID, (datatype, defStr, len, creatorID, isContained) => {
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

  var defObj;
  try {
    defObj = JSON.parse(defStr);
  }
  catch (error) {
    return (
      <>{"Invalid class #" + classID + " (invalid JSON)"}</>
    );
  }
  if (!defObj || Array.isArray(defObj) || typeof defObj !== "object") {
    return (
      <>{"Invalid class #" + classID + " (not a JSON object)"}</>
    );
  }


  var descriptionText;
  if (/^@[1-9][0-9]*$/.test(defObj.description)) {
    let descriptionID = defObj.description.substring(1);
    descriptionText = <XMLTextFromEntID entID={descriptionID} />;
  }
  else {
    descriptionText = "Description attribute is ill-formed or missing."
  }

  var parentClassDescriptions;
  let parentClass = defObj["parent class"];
  if (/^@[1-9][0-9]*$/.test(parentClass)) {
    parentClassDescriptions = <ClassDescriptions
      classID={parentClass.substring(1)}
      maxRecLevel={maxRecLevel} recLevel={recLevel + 1}
    />;
  }
  else if (parentClass === undefined) {
    parentClassDescriptions = <></>;
  }
  else {
    parentClassDescriptions = <>{"Parent class attribute is ill-formed."}</>;
  }

  return (
    <>
      <DropdownMenu
        title={<EntityReference entID={classID} isLink />}
        children={descriptionText}
      />
      {parentClassDescriptions}
    </>
  );
};
