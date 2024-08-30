import {useState, createContext, useContext, useEffect} from "react";
// import {redirect} from "react-router-dom";
import {useQuery} from "../hooks/DBRequests.js";
import {ColumnContext} from "../contexts/ColumnContext.js";
import {DataFetcher} from "../classes/DataFetcher.js";
import {ExpandableSpan} from "./DropdownBox.js";

import { AsyncManipulator } from "../classes/AsyncManipulator.js";

const ConcatenatedEntityTitle = () => <template></template>;
const TemplateLink = () => <template></template>;
const SpecialRefEntityTitle = () => <template></template>;
// const EntityBackRefLink = () => <template></template>;
// const InvalidEntityTitle = () => <template></template>;


export const EntityTitle = ({entID, recLevel, maxRecLevel}) => {
  recLevel ??= 0;
  maxRecLevel ??= 2;

  const [results, setResults] = useState({});
  useEffect(() => {
    getEntityTitle(entID, recLevel, maxRecLevel, (entityTitle, title) => {
      setResults(prev => {
        let ret = {...prev};
        ret.entityTitle = entityTitle;
        ret.title = title;
        ret.isFetched = true;
        return ret;
      });
    });
  }, []);


  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <EntityTitlePlaceholder entID={entID} key={key} />
    );
  }

  // Finally render this. 
  let titleClassName = (results.title) ? " title-" + results.title : "";
  return results.entityTitle;
}


export function getEntityTitle(entID, recLevel, maxRecLevel, callback) {
  // TODO: Also query for the highest rated 'representation' and if the rating
  // is high enough, use the propStruct generated from that instead.
  // TODO: Also always query for the `useful entity' meta-tag and print out
  // that rating as well.

  if (recLevel > maxRecLevel) {
    let entityTitle = (
      <span className="entity-title">
        <EntityID entID={entID} />
      </span>
    );
    callback(entityTitle, "");
    return;
  }

  // Hm, let me build a DataFetcher method instead to transform a propStruct
  // by fetching and inserting entity data as objects in place of all
  // placeholders in all strings, thus also exploding all strings into arrays.
  // And let us also transform sets and lists inside the propStruct by
  // wrapping them in objects. ..Let us also wrap the exploded strings in such
  // objects (e.g. {string: [...]}, {set: [...]}, or {list: [...]}).
  //  ..DataFetcher.expandPropStruct()

  DataFetcher.fetchMetadata(entID, (entMetadata) => {
    let propStruct = entMetadata.propStruct;
    // Create an array, propMembers, of property name and value pairs. If a
    // property value is an array (a set), add a pair for each element in this
    // array.
    let propMembers = [].concat(...Object.keys(propStruct).map(propKey => {
      let propVal = propStruct[propKey];
      let propValArr = (Array.isArray(propVal)) ? propVal : [propVal];
      return propValArr.map(val => [propKey, val]);
    }));

    let asyncManipulator = new AsyncManipulator();
    propMembers.forEach(([propKey, propVal], ind) => {
      asyncManipulator.push(ind, () => {
        if (/^@[1-9][0-9]*$/.test(propVal)) {
          let childEntID = propVal.substring(1);
          getEntityTitle(
            childEntID, recLevel - 1, maxRecLevel, (entityTitle, title) => {
              propMembers[ind] = entityTitle;
            }
          );
        }
        else {

        }
      });
    });

    const propChildren = Object.keys(propStruct).map((propKey => {
      let propVal = propStruct[propKey];
      let propValArr = (Array.isArray(propVal)) ? propVal : [propVal];
      var titleArr = [];
      return propValArr.map((val, ind) => {
        return (
          <span key={propKey + "-" + ind}
            className={"prop-member prop-name-" + propKey}
          >
  
          </span>
        );
      });
    }));

    var entClass = propStruct.class;
    // TODO: Import specific IDs instead as variable (e.g. TEMPLATE_CLASS_ID).
    if (entClass === "@3") {
      callback(
        <>
          <span className="class-prefix">{"template: "}</span>
          <span className="ps-template">
            {JSON.stringify(propStruct.template)}
          </span>
        </>
      );
    }
    else if (entClass === "@1") {
      callback(
        <>
          <span className="class-prefix">{"class: "}</span>
          <span className="ps-class">
            {propStruct.title}
          </span>
        </>
      );
    }
    // TODO: Add more.

    else {
      callback(
        <>
          {propStruct.title}
        </>
      );
    }
  });
}









const EntityTitlePlaceholder = ({entID, isLink}) => {
  return <span className="entity-title entity-title-placeholder"></span>;
}

const InvalidEntityTitle = ({entID, isLink, children}) => {
  if (isLink) {
    return (
      <span className="entity-title invalid-entity-title text-warning">
        {/* TODO: Remove "text-warning" className. */}
        <EntityLink entID={entID}>
          {children}
        </EntityLink>
      </span>
    );
  } else {
    return (
      <span className="entity-title invalid-entity-title text-warning">
        {/* TODO: Remove "text-warning" className. */}
        {children}
      </span>
    );
  }
};



export const EntityTitleWrapper = ({entID, isLink, children}) => {
  // If the whole EntityTitle is a link, just use the whole string as is.
  if (isLink) {
    return (
      <span className="entity-title">
        <EntityLink entID={entID}>
          {children}
        </EntityLink>
      </span>
    );
  }
  // Else just return the string.
  else {
    return (
      <span className="entity-title">
        {children}
      </span>
    );
  }
}


const EntityLink = ({entID, children}) => {
  const [, columnManager] = useContext(ColumnContext);

  return (
    <span className="entity-link" onClick={() => {
      columnManager.openColumn(entID);
    }}>
      {children}
    </span>
  );
};

export const EntityID = ({entID}) => {
  return (
    <EntityLink entID={entID}>
      <span className="entity-id">@{entID}</span>
    </EntityLink>
  );
};









// export const EntityTitleFromData = ({entID, entDataArr, isLink}) => {
//   // If entity is missing from the database, return an InvalidEntityTitle.
//   if (!entDataArr[1]) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Entity not found"}
//       </InvalidEntityTitle>
//     );
//   }
//   // If an ancestor is missing from the database, return an InvalidEntityTitle.
//   let rootData = entDataArr.slice(-1)[0];
//   if (!rootData) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Entity with missing ancestor"}
//       </InvalidEntityTitle>
//     );
//   }
//   // If the root entity has a parent, return an InvalidEntityTitle.
//   if (rootData[0]) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Entity with too many ancestors"}
//       </InvalidEntityTitle>
//     );
//   }
//   // If the root entity has a spec, return an InvalidEntityTitle.
//   if (rootData[1]) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Entity with an invalid ancestor"}
//       </InvalidEntityTitle>
//     );
//   }

//   // Else we get the full propStruct (except that any data inputs haven't
//   // been neither fetched nor inserted).
//   const propStruct = getPropStruct(entDataArr);
//   if (!propStruct) {
//     throw "EntityTitleFromData: Either getPropStruct() or checks failed";
//   }

//   // First we look if there are remaining spec input placeholders, and if so,
//   // we preface the title with "class: ".
//   let isClass = includesPlaceholders(propStruct);
//   if (isClass) {
//     return (
//       <EntityTitleWrapper entID={entID} isLink={isLink} >
//         <span className="title-prefix class-prefix">{"class: "}</span>
//         {"type: " + propStruct.type + ", title: " + propStruct.title}
//       </EntityTitleWrapper>
//     );
//   }
//   else if (typeof propStruct.title === "string") {
//     return (
//       <EntityTitleWrapper entID={entID} isLink={isLink} >
//         {propStruct.title}
//       </EntityTitleWrapper>
//     );
//   }
//   else if (typeof propStruct.type === "string") {
//     return (
//       <EntityTitleWrapper entID={entID} isLink={isLink} >
//         {propStruct.type + " #" + entID}
//       </EntityTitleWrapper>
//     );
//   }
//   else {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Entity with no title or type"}
//       </InvalidEntityTitle>
//     );
//   }
// }


// export function includesPlaceholders(propStruct) {
//   var ret = false;
//   let placeholderRegEx = /(^|[^\\%])(\\\\)*%[1-9][0-9]*/;
//   Object.values(propStruct).forEach(val => {
//     ret = ret || placeholderRegEx.test(val);
//   });
//   return ret;
// }
















// function transformDef(def) {
//   return def
//     .replaceAll("\\\\", "\\\\0")
//     .replaceAll("\\|", "\\\\1")
//     .replaceAll("\\@", "\\\\2")
//     .replaceAll("\\#", "\\\\3")
//     .replaceAll("\\%", "\\\\4");
// }

// function transformDefBack(transDef) {
//   return transDef
//     .replaceAll("\\\\4", "\\%")
//     .replaceAll("\\\\3", "\\#")
//     .replaceAll("\\\\2", "\\@")
//     .replaceAll("\\\\1", "\\|")
//     .replaceAll("\\\\0", "\\\\");
// }

// function getWYSIWYGDef(transDef) {
//   return transDef
//     .replaceAll("\\\\4", "%")
//     .replaceAll("\\\\3", "#")
//     .replaceAll("\\\\2", "@")
//     .replaceAll("\\\\1", "|")
//     .replaceAll("\\\\0", "\\");
// }



// const EntityTitleFromTransDef = ({
//   transDef, entID, isLink, isFull, recLevel, maxRecLevel,
//   isTemplateInstance, templateID
// }) => {
//   // First we make some checks that the def is well-formed.

//   // If def has single backslashes that does not escape a special character,
//   // or if contains unescaped '#'s (which should only be part of concatenated
//   // strings), or if it contains more than one unescaped '|',
//   // or if it starts with '|', or if it start or ends in whitespace, or
//   // contains newlines, or if it has ill-formed '@' references or back-
//   // references, or if it has ill-formed placeholders, return an
//   // InvalidEntityTitle.
//   const defHasInvalidEscapes = transDef.replaceAll("\\\\", "").includes("\\");
//   const defHasUnescapedNumberSigns = transDef.includes("#");
//   const defHasSeveralVBars = transDef.replace("|", "").includes("|");
//   const defStartsWithVBar = transDef[0] === "|";
//   const defHasInvalidWhitespace = (
//     transDef.match(/(^\s)|(\s$)|(\s\|)/g) ||
//     transDef.replaceAll(" ", "").match(/\s/g)
//   );
//   const defHasInvalidRefs = transDef
//     .replaceAll(/@[1-9][0-9]*\./g, "")
//     .includes("@");
//   const defHasInvalidPlaceholders = transDef
//     .replaceAll(/%[e1-9]/g, "")
//     .includes("%");
//   if (
//     defHasInvalidEscapes || defHasUnescapedNumberSigns ||
//     defHasSeveralVBars || defStartsWithVBar || defHasInvalidWhitespace ||
//     defHasInvalidRefs || defHasInvalidPlaceholders
//   ) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {transformDefBack(transDef)}
//       </InvalidEntityTitle>
//     );
//   }


//   // Then parse any links, and split transDef up into parts
//   const refRegEx = /@[1-9][0-9]*\./g;
//   const refArr = (transDef.match(refRegEx) ?? ["@."])
//     .map(val => val.slice(1, -1));
//   const transDefComponentsRegEx =
//     /(\|)|(@\w+\.)|(%[e1-9])|([^@%\|]+)/g;
//   const transDefFullArr = transDef.match(transDefComponentsRegEx);

//   // If !isFull, slice the array to exclude "|" and every element to its right.
//   const transDefArr = isFull ? transDefFullArr :
//     transDefFullArr.slice(0, transDefFullArr.indexOf("|"));


//   // Compute the HTML for the links based on the references. If maxRecLevel
//   // is reached, these are EntityID elements, which only shows the entity ID.
//   var children = transDefArr.map((val, ind) => {
//     if (val.match(refRegEx)) {
//       let linkEntID = val.slice(1, -1);
//       return (recLevel <= maxRecLevel) ?
//         <EntityTitle key={ind} entID={linkEntID} isLink={isFull}
//           recLevel={recLevel + 1} maxRecLevel={maxRecLevel}
//         /> :
//         <EntityID key={ind} entID={linkEntID} isLink={isFull} />;
//     }
//     if (val.match(/^%[e1-9]$/g)) {
//       return <span key={ind} className="template-placeholder">{val}</span>;
//     }
//     if (val === "|") {
//       return <span key={ind} className="spec-separator" ></span>
//     }
//     return <span key={ind}>{getWYSIWYGDef(val)}</span>;
//   });

//   // If isFull && isTemplateInstance, insert a link to the template at the
//   // end of the full definition.
//   if (isFull && isTemplateInstance) {
//     children.push(
//       <TemplateLink key={children.length} entID={templateID} />
//     );
//   }
  

//   // Return a link if isLink, or else just return a span of these children.
//   if (isLink) {
//     return (
//       <span className="entity-title" >
//         <EntityLink entID={entID}>
//           {children}
//         </EntityLink>
//       </span>
//     );
//   } else {
//     return (
//       <span className="entity-title" >
//         {children}
//       </span>
//     );
//   }
// };



// const TemplateInstanceEntityTitle = ({
//   transDef, entID, isLink, isFull, recLevel, maxRecLevel
// }) => {

//   // Parse the ID array and fetch the definition of the template
//   // and of the inputs.
//   const idArr = transDef.match(/[1-9][0-9]*/g); // RegExp.match() is greedy.
//   const inputIDArr = idArr.slice(1);

//   const [results, setResults] = useState(idArr.map(val => ({})));
//   const reqData = idArr.map(val => ({
//     req: "ent",
//     id: val,
//   }));


//   useQuery(results, setResults, reqData);



//   // Before results[0] is fetched, render a placeholder.
//   if (!results[0].isFetched) {
//     return (
//       <EntityTitlePlaceholder entID={entID} isLink={isLink} />
//     );
//   }
  
//   // Afterwards, first extract the templateDef data from results[0].data[0].
//   const [templateDef] = (results[0].data[0] ?? []);

//   // Transform the templateDef.
//   const transTemplateDef = transformDef(templateDef);

//   // If transTemplateDef has ill-formed placeholders (or back-references),
//   // return an InvalidEntityTitle.
//   const templateDefHasInvalidPlaceholders = transTemplateDef
//     .replaceAll(/%[e1-9]/g, "")
//     .includes("%");
//   if (templateDefHasInvalidPlaceholders) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {"Instance of invalid template: " + transformDefBack(transTemplateDef)}
//       </InvalidEntityTitle>
//     );
//   }

//   // If the number of placeholders does not match the number of inputs,
//   // return an InvalidEntityTitle.
//   const inputNumberIsWrong = (
//     transTemplateDef.match(/%e/g).length !== inputIDArr.length
//   );
//   if (inputNumberIsWrong) {
//     return (
//       <InvalidEntityTitle entID={entID} isLink={isLink} >
//         {
//           "Wrong number inputs (" + inputIDArr.length + ") for template: " +
//           templateDef
//         }
//       </InvalidEntityTitle>
//     );
//   }

//   // Construct the template instance.
//   const transTemplateInstDef = inputIDArr.reduce(
//     (acc, val) => acc.replace("%e", "@" + val + "."),
//     transTemplateDef.replaceAll(
//       /%[1-9]/g,
//       str => ("@" + (inputIDArr[parseInt(str[1]) - 1] ?? "") + ".")
//     )
//   );

//   // Return an EntityTitleFromTransDef (isTemplateInstance={true}) with a
//   // recLevel of one more.
//   return (
//     <EntityTitleFromTransDef transDef={transTemplateInstDef} entID={entID}
//       isLink={isLink} isFull={isFull}
//       recLevel={recLevel + 1} maxRecLevel={maxRecLevel}
//       isTemplateInstance={true} templateID={idArr[0]}
//     />
//   );

// };





// // TODO: Continue remaking:

// function getTemplateChildren(defStr, isLinks, recLevel, maxRecLevel) {
//   return defStr
//     .replaceAll("\\\\", "\\\\1")
//     .replaceAll("\\|", "\\\\2")
//     .split("|")
//     .map(val => (
//       val
//       .replaceAll("\\\\2", "|")
//       .replaceAll("\\\\", "\\")
//     ))
//     .map(val => (
//       /^#[1-9][0-9]*$/.test(val) ? (
//         <span className="template-child">
//           <EntityTitle entID={val.substring(1)}
//             isLink={isLinks} recLevel={recLevel + 1} maxRecLevel={maxRecLevel}
//           />
//         </span>
//       ) : (
//         <span className="template-child">
//           {val}
//         </span>
//       )
//     ));
// }


// export const TemplateInstance = ({tmplID, tmplChildren, isCut}) => {
//   const [results, setResults] = useState([]);
//   useQuery(results, setResults, {
//     req: "ent",
//     id: tmplID,
//   });

//   // Before results is fetched, render this:
//   if (!results.isFetched) {
//     return (
//       <span style={{display: "none"}}>
//         {tmplChildren.map((val, ind) => (
//           <span key={-ind - 1}>
//             {val}
//           </span>
//         ))}
//       </span>
//     );
//   }

//   // Afterwards, first extract the needed data from results[0].
//   const [, , tmplDefStr] = (results.data[0] ?? []);

//   // Transform the template into an array of arrays, first by "reducing" the
//   // string by removing the unused template placeholder names, then by "cutting"
//   // it up along each '{' or '}' character such that only every second entry in
//   // the resulting array is rendered if isCut == true, and finally by
//   // "splitting" it up further along each occurrence of '&lt;&gt;' ('<>').
//   const reducedTmpl = tmplDefStr
//     // .replaceAll("&gt;", ">")
//     // .replaceAll("&lt;", "<")
//     .replaceAll(/<[^<>]*>/g, '<>')
//     // .replaceAll("<", "&lt;")
//     // .replaceAll(">", "&gt;");
//   const reducedAndCutTmpl = /[\{\}]/.test(reducedTmpl) ?
//     reducedTmpl.split(/[\{\}]/) :
//     ['', reducedTmpl]
//   const reducedCutAndSplitTmpl = reducedAndCutTmpl.map(val => (
//     // val.split('&lt;&gt;')
//     val.split('<>')
//   ));

//   // If we have more tmplChildren than there are template placeholders, extend
//   // reducedCutAndSplitTmpl such that these children will be added at the end
//   // of the template.
//   let placeholderNum = reducedCutAndSplitTmpl.reduce((acc, val) => (
//     acc + val.length - 1
//   ), 0);
//   let excess = placeholderNum - tmplChildren.length;
//   if (excess > 0) {
//     let len = reducedCutAndSplitTmpl.length
//     let lastTmplPart = reducedCutAndSplitTmpl[len - 1];
//     let prevEnd = lastTmplPart.pop();
//     let separator = '<span class="extra-children-separator">, </span>'
//     lastTmplPart.push(prevEnd + separator);
//     while (excess > 1) {
//       lastTmplPart.push(separator);
//     }
//     lastTmplPart.push('');
//   }
//   // TODO: Change the above so that this last step is done before "cutting,"
//   // and also find a more clear representation and name for e.g. 
//   // "reducedCutAndSplitTmpl."

//   // Finally create the template instance by filling in the provided template
//   // children into this structure and reduce it to a JSX element.
//   let i = 0;
//   let len = tmplChildren.length;
//   return reducedCutAndSplitTmpl.map((val, ind) => (
//     <span key={ind} style={{display: (isCut && ind % 2 === 0) ? "none" : ""}}>
//       {val.map((val, ind) => {
//         if (ind === 0) {
//           return (
//             <span key={ind}>
//               {val}
//             </span>
//           );
//         } else if (i >= len) {
//           <span key={ind}>
//             <i class="text-warning">missing entity</i>
//           </span>
//         } else {
//           let ret = (
//             <span key={ind}>
//               {tmplChildren[i]}{val}
//             </span>
//           );
//           i++;
//           return ret;
//         }
//       })}
//     </span>
//   ));
// };
// // TODO: Consider doing something like this again:
// // export function getTitle(tmpl, defItemStrArr) {
// //   return getTransformedTemplate(tmpl, defItemStrArr)
// //     .replace(/^[^\{]*\{/g, "")
// //     .replace(/\}[^\{]*$/g, "")
// //     .replaceAll(/\}[^\{]*\{/g, "");
// // }
// // export function getFullTitle(tmpl, defItemStrArr) {
// //   return getTransformedTemplate(tmpl, defItemStrArr)
// //     .replaceAll('{', "")
// //     .replaceAll('}', "");
// // }







// export const FullEntityTitle = ({entID, maxRecLevel}) => {
//   maxRecLevel ??= 4;

//   const [results, setResults] = useState([]);
//   useQuery(results, setResults, {
//     req: "ent",
//     id: entID,
//   });

//   // Before results is fetched, render this:
//   if (!results.isFetched) {
//     return (
//       <EntityTitlePlaceholder entID={entID} />
//     );
//   }

//   // Afterwards, first extract the needed data from results[0].
//   const [typeID, cxtID, defStr] = (results.data[0] ?? []);

//   // If the entity is a template entity (typeID == 3) or if it has no context,
//   // we only need to to render the type followed by a separator followed by the
//   // defining string:
//   let titleContent;
//   if (!cxtID || typeID == 3) {
//     titleContent = defStr;
  
//   // Else, the entity is derived from a template. The full title should not be
//   // "cut", meaning that all parts of it will be rendered despite the curly
//   // braces (which will be removed), and each reference-type template child
//   // should be a link on its own (isLinks = true).
//   } else {
//     let tmplChildren = getTemplateChildren(defStr, true, 0, maxRecLevel);
//     titleContent = (
//       <TemplateInstance 
//         tmplID={cxtID} tmplChildren={tmplChildren} isCut={false}
//       />
//     );
//   }

//   return (
//     <span className="full-entity-title">
//       <EntityTitle entID={typeID} isLink={true} />
//       <span className="type-separator"> &#9656; </span>
//       {titleContent}
//     </span>
//   );
// };



export const ContextDisplay = ({entID}) => {
  const [results, setResults] = useState([]);
  useQuery(results, setResults, {
    req: "ent",
    id: entID,
  });
  
  // Before results is fetched, render this:
  if (!results.isFetched) {
    return (
      <></>
    );
  }
  
  // Afterwards, first extract the needed data from results[0].
  const [typeID, cxtID, defStr] = (results.data[0] ?? []);
  
  // If the type can have no context, return an empty context display.
  if (typeID == 1 || 4 <= typeID && typeID <= 8) {
    return (
      <></>
    );
  }

  // Else set the appropriate label and append the EntityTitle of context.
  let label;
  if (typeID == 3) {
    label = 'Type of derived entities: ';
  } else {
    label = 'Template: ';
  }
  if (cxtID) {
    return (
      <span>
        {label}
        <EntityTitle entID={cxtID} isLink={true}/>
      </span>
    );
  } else {
    return (
      <span>
        {label}
        <i>none</i>
      </span>
    );
  }
};
