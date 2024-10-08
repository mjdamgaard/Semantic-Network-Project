
SELECT "Query procedures";

DROP PROCEDURE selectInstanceList;
DROP PROCEDURE selectRating;
DROP PROCEDURE selectRecordedInputs;
DROP PROCEDURE selectRecordedInputsFromSecKey;
DROP PROCEDURE selectRecordedInputsMaxID;

-- TODO: Make proc to query for users who has rated a stmt / scale.

DROP PROCEDURE selectEntity;
DROP PROCEDURE selectEntityAsUser;
DROP PROCEDURE selectEntityFromHash;
DROP PROCEDURE selectEntityFromHashAsUser;
DROP PROCEDURE selectCreations;
DROP PROCEDURE selectCreationsAsUser;


DROP PROCEDURE selectUserInfo;
DROP PROCEDURE selectBotInfo;

-- DROP PROCEDURE selectUserEntityID;
-- DROP PROCEDURE selectBotEntityID;


DROP PROCEDURE selectAncillaryBotData1e2d;
DROP PROCEDURE selectAncillaryBotData1e4d;




DELIMITER //
CREATE PROCEDURE selectInstanceList (
    IN userID BIGINT UNSIGNED,
    IN tagID BIGINT UNSIGNED,
    IN ratingRangeLo TINYINT UNSIGNED,
    IN ratingRangeHi TINYINT UNSIGNED,
    IN maxNum INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    SELECT
        rat_val AS ratVal,
        obj_id AS objID
    FROM SemanticInputs
    WHERE (
        user_id = userID AND
        tag_id = tagID AND
        (ratingRangeLo = 0 OR rat_val >= ratingRangeLo) AND
        (ratingRangeHi = 0 OR rat_val <= ratingRangeHi)
    )
    ORDER BY
        CASE WHEN isAscOrder THEN rat_val END ASC,
        CASE WHEN NOT isAscOrder THEN rat_val END DESC,
        CASE WHEN isAscOrder THEN obj_id END ASC,
        CASE WHEN NOT isAscOrder THEN obj_id END DESC
    LIMIT numOffset, maxNum;
END //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE selectRating (
    IN userID BIGINT UNSIGNED,
    IN tagID BIGINT UNSIGNED,
    IN objID BIGINT UNSIGNED
)
BEGIN
    SELECT rat_val AS ratVal
    FROM SemanticInputs
    WHERE (
        user_id = userID AND
        tag_id = tagID AND
        obj_id = objID
    );
END //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE selectRecordedInputs (
    IN startID BIGINT UNSIGNED,
    IN maxNum INT UNSIGNED
)
BEGIN
    SELECT
        user_id AS userID,
        stmt_id AS stmtID,
        rat_val AS ratVal
    FROM RecordedInputs
    WHERE id >= startID
    ORDER BY id ASC
    LIMIT maxNum;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectRecordedInputsFromSecKey (
    IN stmtID BIGINT UNSIGNED,
    IN maxNum INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    SELECT
        id AS ratID,
        user_id AS userID,
        stmtID,
        rat_val AS ratVal
    FROM RecordedInputs
    WHERE stmt_id = stmtID
    ORDER BY
        CASE WHEN isAscOrder THEN id END ASC,
        CASE WHEN NOT isAscOrder THEN id END DESC
    LIMIT numOffset, maxNum;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectRecordedInputsMaxID ()
BEGIN
    SELECT MAX(id) AS maxID
    FROM RecordedInputs;
END //
DELIMITER ;












DELIMITER //
CREATE PROCEDURE selectEntity (
    IN entID BIGINT UNSIGNED,
    IN maxLen INT UNSIGNED,
    IN startPos INT UNSIGNED
)
BEGIN
    SET startPos = startPos + 1;
    SELECT 
        (
            CASE WHEN maxLen = 0 THEN SUBSTRING(def_str, startPos)
            ELSE SUBSTRING(def_str, startPos, startPos + maxLen)
            END
        ) AS defStr,
        LENGTH(def_str) AS len,
        creator_id AS creatorID
    FROM Entities
    WHERE (
        id = entID AND
        is_private = 0
    );
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE selectEntityAsUser (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN maxLen INT UNSIGNED,
    IN startPos INT UNSIGNED
)
BEGIN
    SET startPos = startPos + 1;
    SELECT 
        (
            CASE WHEN maxLen = 0 THEN SUBSTRING(def_str, startPos)
            ELSE SUBSTRING(def_str, startPos, startPos + maxLen)
            END
        ) AS defStr,
        LENGTH(def_str) AS len,
        creator_id AS creatorID,
        is_private AS isPrivate
    FROM Entities
    WHERE (
        id = entID AND
        (is_private = 0 OR creator_id = userID)
    );
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE selectEntityFromHash (
    IN defHash CHAR(64),
    IN creatorID BIGINT UNSIGNED,
    IN maxLen INT UNSIGNED,
    IN startPos INT UNSIGNED
)
BEGIN
    SET startPos = startPos + 1;
    SELECT 
        (
            CASE WHEN maxLen = 0 THEN SUBSTRING(def_str, startPos)
            ELSE SUBSTRING(def_str, startPos, startPos + maxLen)
            END
        ) AS defStr,
        LENGTH(def_str) AS len
    FROM Entities
    WHERE (
        is_private = 0 AND
        def_hash = defHash AND
        creator_id = creatorID
    );
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE selectEntityFromHashAsUser (
    IN defHash CHAR(64),
    IN userID BIGINT UNSIGNED,
    IN maxLen INT UNSIGNED,
    IN startPos INT UNSIGNED
)
BEGIN
    SET startPos = startPos + 1;
    SELECT 
        (
            CASE WHEN maxLen = 0 THEN SUBSTRING(def_str, startPos)
            ELSE SUBSTRING(def_str, startPos, startPos + maxLen)
            END
        ) AS defStr,
        LENGTH(def_str) AS len
    FROM Entities
    WHERE (
        is_private = 1 AND
        def_hash = defHash AND
        creator_id = userID
    );
END //
DELIMITER ;





DELIMITER //
CREATE PROCEDURE selectCreations (
    IN creatorID BIGINT UNSIGNED,
    IN maxNum INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    SELECT creation_ident AS ident, id AS entID
    FROM Entities
    WHERE (
        creator_id = creatorID AND
        is_private = 0
    )
    ORDER BY
        CASE WHEN isAscOrder THEN id END ASC,
        CASE WHEN NOT isAscOrder THEN id END DESC
    LIMIT numOffset, maxNum;
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE selectCreationsAsUser (
    IN userID BIGINT UNSIGNED,
    IN maxNum INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    SELECT creation_ident AS ident, id AS entID
    FROM Entities
    WHERE (
        creator_id = userID
    )
    ORDER BY
        CASE WHEN isAscOrder THEN id END ASC,
        CASE WHEN NOT isAscOrder THEN id END DESC
    LIMIT numOffset, maxNum;
END //
DELIMITER ;




























DELIMITER //
CREATE PROCEDURE selectUserInfo (
    IN userID BIGINT UNSIGNED
)
BEGIN
    SELECT
        username AS username,
        public_keys_for_authentication AS publicKeys
    FROM UserData
    WHERE data_key = (
        SELECT data_key
        FROM Entities
        WHERE id = userID
    );
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectBotInfo (
    IN botName BIGINT UNSIGNED
)
BEGIN
    SELECT
        bot_name AS botName,
        bot_description AS botDescription
    FROM NativeBotData
    WHERE data_key = (
        SELECT data_key
        FROM Entities
        WHERE id = botName
    );
END //
DELIMITER ;



















DELIMITER //
CREATE PROCEDURE selectAncillaryBotData1e2d (
    IN botName BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED
)
BEGIN
    SELECT data_1 AS data1, data_2 AS data2
    FROM AncillaryBotData1e2d
    WHERE (
        bot_name = botName AND
        ent_id = entID
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE selectAncillaryBotData1e4d (
    IN botName BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED
)
BEGIN
    SELECT data_1 AS data1, data_2 AS data2, data_3 AS data3, data_4 AS data4
    FROM AncillaryBotData1e4d
    WHERE (
        bot_name = botName AND
        ent_id = entID
    );
END //
DELIMITER ;
