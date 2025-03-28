import {useState} from "react";



export const DropdownBox = ({children, startAsExpanded}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(startAsExpanded);
  
  if(!isLoaded && isExpanded) {
    setIsLoaded(true);
  }

  if (!isLoaded) {
    return (
      <div className="dropdown-box">
        <div style={{display: "none"}}></div>
        <DropdownButtonBar
          isExpanded={isExpanded} setIsExpanded={setIsExpanded}
        />
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="dropdown-box">
        <div style={{display: "none"}}>
          {children}
        </div>
        <DropdownButtonBar
          isExpanded={isExpanded} setIsExpanded={setIsExpanded}
        />
      </div>
    );
  }

  return (
    <div className="dropdown-box">
      <div>
        {children}
      </div>
      <DropdownButtonBar
        isExpanded={isExpanded} setIsExpanded={setIsExpanded}
      />
    </div>
  );
};

export const DropdownButtonBar = ({isExpanded, setIsExpanded}) => {
  return (
    <div className="dropdown-button-bar" onClick={() => {
      setIsExpanded(prev => !prev);
    }}>
      <span className="dropdown-button">
        <span className={isExpanded ? "caret caret-up dropup" : "caret"}></span>
      </span>
    </div>
  );
};




export const DropdownMenu = ({title, children, startAsExpanded}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(startAsExpanded);
  
  if(!isLoaded && isExpanded) {
    setIsLoaded(true);
  }

  if (!isLoaded) {
    return (
      <div>
        <h2 className="dropdown-menu-title clickable" onClick={() => {
          setIsExpanded(prev => !prev);
        }}>
          <span className="dropdown-button">
            <span>&#8250;</span>{' '}
            {title}
          </span>
        </h2>
        <div style={{display: "none"}}></div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div>
        <h2 className="dropdown-menu-title clickable" onClick={() => {
          setIsExpanded(prev => !prev);
        }}>
          <span className="dropdown-button">
          <span>&#8250;</span>{' '}
            {title}
          </span>
        </h2>
        <div style={{display: "none"}}>{children}</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="dropdown-menu-title clickable" onClick={() => {
        setIsExpanded(prev => !prev);
      }}>
        <span className="dropdown-button">
          <span>&#8964;</span>{' '}
          {title}
        </span>
      </h2>
      <div>{children}</div>
    </div>
  );
};




export const ExpandableSpan = ({children, startAsExpanded}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(startAsExpanded);
  
  if(!isLoaded && isExpanded) {
    setIsLoaded(true);
  }

  if (!isLoaded) {
    return (
      <span className="expandable-span">
        <span style={{display: "none"}}></span>
        <ExpandButton
          isExpanded={isExpanded} setIsExpanded={setIsExpanded}
        />
      </span>
    );
  }

  if (!isExpanded) {
    return (
      <span className="expandable-span">
        <span style={{display: "none"}}>
          {children}
        </span>
        <ExpandButton
          isExpanded={isExpanded} setIsExpanded={setIsExpanded}
        />
      </span>
    );
  }

  return (
    <span className="expandable-span">
      <span>
        {children}
      </span>
      <ExpandButton
        isExpanded={isExpanded} setIsExpanded={setIsExpanded}
      />
    </span>
  );
};



export const ExpandButton = ({isExpanded, setIsExpanded}) => {
  return (
    <button className="expand-button" onClick={() => {
      setIsExpanded(prev => !prev);
    }}>
      {isExpanded ? "<" : ">"}
    </button>
  );
};
