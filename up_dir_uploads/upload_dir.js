
import * as process from 'process';
import path from 'path';
import {read} from 'read';

import {DirectoryUploader} from './src/DirectoryUploader.js';


// Get the directory path from the arguments, and combine it with __dirname if
// it is a relative path.
let [ , curPath, dirPath, deleteStructData = false] = process.argv;
if (!dirPath) throw (
  "Specify dirPath in '$ node <program path> <dirPath> [isPrivate]'"
);
if (dirPath[0] === ".") {
  dirPath = path.normalize(path.dirname(curPath) + "/" + dirPath);
}

// Prompt for username and password, then request the new directory.
let username, token, credentials;
read({prompt: "Username: "}).then(name => {
  username = name;
  read({prompt: "Password: ", silent: true}).then(pw => {
    console.log("\n");

    // Create/update the directory on the server side.
    DirectoryUploader.uploadDir(dirPath, username, pw, deleteStructData);
  });
});
