
import {fetch, getCurHomeDirPath} from 'query';

export function render() {
  let {isAscending, postList} = this.state;

  if (!postList) {
    let homeDirPath = getCurHomeDirPath();
    fetch(
      homeDirPath + "/posts.att/list/n=50/a=" + isAscending ? true : false
    ).then(res => {
      if (res) {
        this.setState({...this.state, postList: res});
      }
      else throw "No list returned from server";
    });
    return;
  }
  else {

  }

  return (
    <div>
      {postList.map(row => <div>{row}</div>)}
    </div>
  );
}



export function getInitState({isAscending = false}) {
  return {isAscending: isAscending};
}