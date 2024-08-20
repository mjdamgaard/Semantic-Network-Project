import {useState, createContext, useContext, useEffect} from "react";
import {useQuery} from "../hooks/DBRequests.js";
import {ColumnContext} from "../contexts/ColumnContext.js";



export const PropStructFetcher = ({
  entID, PlaceholderModule, ChildModule, extraProps, maxRecLevel
}) => {
  PlaceholderModule ??= () => <template></template>;
  maxRecLevel ??= 6;

  const [results, setResults] = useState([]);
  useQuery(results, setResults, {
    req: "ent",
    id: entID,
  });

  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <PlaceholderModule {...extraProps} entID={entID} recLevel={0} />
    );
  }
  
  // Afterwards, first extract the needed data from results.
  const entDataArr = results.data;
  const [parentID, spec, propStruct, dataLen] = entDataArr[0] ?? [];
  
  // If parentID is undefined, meaning that the entity is missing, return
  // ChildModule with the boolean entIsMissing set.
  if (parentID === undefined) {
    return (
      <ChildModule
        {...extraProps} entID={entID} entDataArr={entDataArr} entIsMissing
      />
    );
  }
  // If the entity neither has a parent nor a propStruct, return
  // ChildModule with the boolean entIsInvalid set.
  if (!parentID && !propStruct) {
    return (
      <ChildModule
        {...extraProps} entID={entID} entDataArr={entDataArr} entIsInvalid
      />
    );
  }

  // If not, pass the data to EntityTitleFromParent to query the parent for
  // more data to construct the full propStruct.
  return (
    <PropStructFetcherHelper
      entID={entID} PlaceholderModule={PlaceholderModule}
      ChildModule={ChildModule} extraProps={extraProps}
      parentID={parentID} spec={spec} propStruct={propStruct}
      entDataArr={entDataArr} recLevel={1} maxRecLevel={maxRecLevel}
    />
  );
}



const PropStructFetcherHelper = ({
  entID, PlaceholderModule, ChildModule, extraProps,
  parentID, spec, propStruct, entDataArr, recLevel, maxRecLevel
}) => {
  const [results, setResults] = useState([]);
  useQuery(results, setResults, {
    req: "ent",
    id: parentID,
  });

  // If maximum recursion level is exceeded, return ChildModule with the
  // boolean exceedsRecLevel set.
  if (recLevel > maxRecLevel) {
    return (
      <ChildModule
        {...extraProps} entID={entID} entDataArr={entDataArr} exceedsRecLevel
      />
    );
  }

  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <PlaceholderModule {...extraProps} entID={entID} recLevel={recLevel} />
    );
  }
  
  // Afterwards, first extract the needed data from results.
  const entData = results.data[0] ?? [];
  const [parParentID, parSpec, parPropStruct, parDataLen] = entData;

  // If parParentID is undefined, meaning that the ancestor is missing, return
  // ChildModule with the boolean ancIsMissing set.
  if (parParentID === undefined) {
    return (
      <ChildModule
        {...extraProps} entID={entID} entDataArr={entDataArr.concat([entData])}
        ancIsMissing
      />
    );
  }

  //..Oh, I should actually get the full propStruct of the parent first, and
  // *then* insert the spec inputs..

  // Call getTransPropStruct() to construct the transformed propStruct.
  const transPropStruct = getTransformedPropStruct(
    parPropStruct, spec, propStruct
  );

  // If parent's parent is defined, pass to self yet another time to get more
  // data to construct the full propStruct.
  if (parParentID) {
    return (
      <PropStructFetcherHelper
      entID={entID} PlaceholderModule={PlaceholderModule}
      ChildModule={ChildModule} extraProps={extraProps}
      parentID={parParentID} spec={parSpec} propStruct={transPropStruct}
      entDataArr={entDataArr} recLevel={1} maxRecLevel={maxRecLevel}
      />
    );
  }

  // Else if parent's spec is defined while its parentID is not, return
  // ChildModule with the boolean ancIsInvalid set.
  if (parSpec) {
    return (
      <ChildModule
        {...extraProps} entID={entID} entDataArr={entDataArr} ancIsInvalid
      />
    );
  }

  // Else we now have that transPropStruct is the full propStruct of the
  // entity, and we can finally pass this to the ChildModule, along with other
  // props. 
  return (
    <ChildModule
      {...extraProps}
      entID={entID} fullPropStruct={transPropStruct} entDataArr={entDataArr}
    />
  );
}


export function getTransformedPropStruct(parPropStruct, spec, propStruct) {
  return Object.assign(getSpecifiedPropStruct(parPropStruct, spec), propStruct);
}

export function getSpecifiedPropStruct(parPropStruct, spec) {
  var specArr = (typeof spec === "string") ? getSpecArr(spec) : spec;

  // Replace each '%<n>' placeholder in parPropStruct with specArr[<n> - 1].
  // If a specArr[<n> - 1] is undefined, let the placeholder be. Note that is
  // is assumed that '%<n>' will always be followed by space or some sort of
  // punctuation, and never directly by other digits or another placeholder. 
  var ret = {};
  Object.keys(parPropStruct).forEach(prop => {
    let val = parPropStruct[prop];
    // If property value is a string, replace e.g. '%3' with specArr[2], and
    // '\\\\%3' with '\\\\' + specArr[2], unless specArr[2] is undefined.
    if (typeof val === "string") {
      ret[prop] = val.replaceAll(/(^|[^\\%])(\\\\)*%[1-9][0-9]*/g, str => {
        let [leadingChars, n] = val.match(/^[^%]*|%.*$/g);
        if (n === undefined) {
          n = leadingChars;
          leadingChars = "";
        }
        let placement = specArr[parseInt(n) - 1];
        if (placement !== undefined) {
          return leadingChars + placement;
        } else {
          return str;
        }
      });
    }
    // Else call getSpecifiedPropStruct recursively to get the substituted val.
    else {
      ret[prop] = getSpecifiedPropStruct(val, specArr);
    }
  });
  return ret;
}

export function getSpecArr(spec) {
  return spec
    .replaceAll("\\\\", "\\\\0")
    .replaceAll("\\|", "\\\\1")
    .split("|")
    .map(val => {
      return val
      .replaceAll("\\\\1", "|")
      .replaceAll("\\\\0", "\\");
    });

}
