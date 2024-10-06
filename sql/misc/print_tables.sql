

SELECT "RecordedInputs:";
SELECT
    id AS id,
    user_id AS userID,
    stmt_id AS stmtID,
    rat_val AS ratVal
FROM RecordedInputs
ORDER BY id ASC;


SELECT "SemanticInputs:";
SELECT
    user_id AS userID,
    tag_id AS tagID,
    rat_val AS ratVal,
    inst_id AS instID
FROM SemanticInputs
ORDER BY user_id ASC, tag_id ASC, rat_val DESC;


-- SELECT "UserData:";
-- SELECT *
-- FROM Private_UserData
-- ORDER BY user_id;
-- SELECT "Sessions:";
-- SELECT *
-- FROM Private_Sessions
ORDER BY user_id;
SELECT "EMails:";
SELECT *
FROM Private_EMails;



SELECT "Users:";
SELECT *
FROM Users
ORDER BY id;

SELECT "Entities:";
SELECT
    id,
    def_str,
    creator_id,
    is_public
FROM Entities
ORDER BY id;
