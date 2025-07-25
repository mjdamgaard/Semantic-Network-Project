
import * as PostField from "./PostField.jsx";
import * as PostList from "./PostList.jsx";

export function render({userID}) {
  console.log("Rendering app with userID=" + userID);
  return (
    <div>
      <h2>{"Post a message!"}</h2>
      <PostField key={0} userID={userID} />
      <PostList key={1} />
    </div>
  );
}


export const actions = {
  "refresh": function() {
    this.call(1, "refresh");
  }
};