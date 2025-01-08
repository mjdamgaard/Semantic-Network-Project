
SELECT "Insert procedures";

DROP PROCEDURE insertOrUpdatePublicUserScore;
DROP PROCEDURE deletePublicUserScore;
DROP PROCEDURE insertOrUpdatePrivateUserScore;
DROP PROCEDURE deletePrivateUserScore;
DROP PROCEDURE deleteAllPrivateUserScores;
DROP PROCEDURE deleteSeveralPrivateUserScores;

DROP PROCEDURE _insertEntityWithoutSecKey;
DROP PROCEDURE _insertOrFindEntityWithSecKey;

DROP PROCEDURE insertAttributeDefinedEntity;
DROP PROCEDURE insertFunctionEntity;
DROP PROCEDURE insertOrFindFunctionCallEntity;
DROP PROCEDURE insertUTF8Entity;
DROP PROCEDURE insertHTMLEntity;
DROP PROCEDURE insertJSONEntity;

DROP PROCEDURE _editEntity;

DROP PROCEDURE editUTF8Entity;
DROP PROCEDURE editHTMLEntity;
DROP PROCEDURE editJSONEntity;

DROP PROCEDURE _substitutePlaceholdersInEntity;

DROP PROCEDURE substitutePlaceholdersInAttrEntity;
DROP PROCEDURE substitutePlaceholdersInFunEntity;

DROP PROCEDURE finalizeEntity;
DROP PROCEDURE anonymizeEntity;







DELIMITER //
CREATE PROCEDURE _insertUpdateOrDeletePublicListElement (
    IN userGroupID BIGINT UNSIGNED,
    IN listSpecID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN floatVal1 FLOAT,
    IN floatVal2 FLOAT,
    IN onIndexData VARBINARY(32),
    IN offIndexData VARBINARY(32),
    IN addedUploadDataCost FLOAT,
    OUT exitCode TINYINT
)
BEGIN
    DECLARE prevFloatVal1, prevFloatVal2 FLOAT;
    DECLARE prevListLen BIGINT UNSIGNED;
    DECLARE isExceeded TINYINT;

    SET floatVal2 = CASE WHEN (floatVal2 IS NULL)
        THEN 0 ELSE floatVal2
    END CASE;

    -- We select (for update) the previous score on the list, and branch
    -- accordingly in order to update the ListMetadata table correctly.
    START TRANSACTION;

    SELECT list_len INTO prevListLen -- only used to lock ListMetadata row.
    FROM PublicListMetadata FORCE INDEX (PRIMARY)
    WHERE (
        user_group_id = userGroupID AND
        list_spec_id = listSpecID
    )
    FOR UPDATE;

    SELECT float_val_1, float_val_2 INTO prevFloatVal1, prevFloatVal2
    FROM PublicEntityLists FORCE INDEX (PRIMARY)
    WHERE (
        user_group_id = userGroupID AND
        list_spec_id = listSpecID AND
        subj_id = subjID
    );

    -- Branch according to whether the score should be inserted, updated, or
    -- deleted, the latter being the case where the floatVal input is NULL. 
    IF (floatVal1 IS NOT NULL AND prevFloatVal1 IS NULL) THEN
        INSERT INTO PublicEntityLists (
            user_group_id, list_spec_id, subj_id,
            float_val_1, float_val_2, on_index_data, off_index_data
        ) VALUES (
            userGroupID, listSpecID, subjID,
            floatVal1, floatVal2, onIndexData, offIndexData
        );

        INSERT INTO PublicListMetadata (
            user_group_id, list_spec_id,
            list_len, float_1_sum, float_1_sum, paid_upload_data_cost
        ) VALUES (
            userGroupID, listSpecID,
            1, floatVal1, floatVal2, addedUploadDataCost
        )
        ON DUPLICATE KEY UPDATE
            list_len = list_len + 1,
            float_1_sum = float_1_sum + floatVal1,
            float_2_sum = float_2_sum + floatVal2,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost;

        COMMIT;
        SET exitCode = 0; -- insert.

    ELSEIF (floatVal1 IS NOT NULL AND prevFloatVal1 IS NOT NULL) THEN
        UPDATE PublicEntityLists SET
            float_val_1 = floatVal1,
            float_val_2 = floatVal2,
            on_index_data = onIndexData,
            off_index_data = offIndexData
        WHERE (
            user_group_id = userGroupID AND
            list_spec_id = listSpecID AND
            subj_id = subjID
        );
        
        UPDATE PublicListMetadata SET
            float_1_sum = float_1_sum + floatVal1 - prevFloatVal1,
            float_2_sum = float_2_sum + floatVal2 - prevFloatVal2,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost;
        WHERE (
            user_group_id = userGroupID AND
            list_spec_id = listSpecID
        );

        COMMIT;
        SET exitCode = 1; -- update.

    ELSEIF (floatVal1 IS NULL AND prevFloatVal1 IS NOT NULL) THEN
        DELETE FROM PublicEntityLists
        WHERE (
            user_group_id = userGroupID AND
            list_spec_id = listSpecID AND
            subj_id = subjID
        );
        
        UPDATE PublicListMetadata SET
            list_len = list_len - 1,
            float_1_sum = float_1_sum - prevFloatVal1,
            float_2_sum = float_2_sum - prevFloatVal2,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost;
        WHERE (
            user_group_id = userGroupID AND
            list_spec_id = listSpecID
        );

        COMMIT;
        SET exitCode = 2; -- deletion.
    ELSE
        COMMIT;
        SET exitCode = 3; -- no change.
    END IF;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertOrUpdatePublicUserScore (
    IN userID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN minScore FLOAT,
    IN maxScore FLOAT,
    IN truncateTimeBy TINYINT UNSIGNED
)
proc: BEGIN
    DECLARE isExceeded, exitCode TINYINT;
    DECLARE userScoreListSpecID BIGINT UNSIGNED;
    DECLARE userScoreListSpecDefStr VARCHAR(700)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT (
            CONCAT('@13,@', qualID)
        );
    DECLARE unixTime INT UNSIGNED DEFAULT (
        UNIX_TIMESTAMP() >> truncateTimeBy << truncateTimeBy
    );
    DECLARE unixTimeBin VARBINARY(4) DEFAULT (
        UNHEX(CONV(unixTime, 10, 16))
    );

    SET maxScore = CASE WHEN (maxScore <= minScore)
        THEN minScore
        ELSE maxScore
    END CASE;

    -- Pay the upload data cost for the score insert.
    CALL _increaseWeeklyUserCounters (
        userID, 0, 20, 0, isExceeded
    );
    -- Exit if upload limit was exceeded.
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- upload limit was exceeded.
        LEAVE proc;
    END IF;

    -- Insert of find the user score list spec entity, and exit if upload limit
    -- is exceeded.
    CALL _insertOrFindFunctionCallEntity (
        userID, userScoreListSpecDefStr, 1,
        userScoreListSpecID, exitCode
    );
    IF (exitCode = 5) THEN
        LEAVE proc;
    END IF;

    -- Exit if the subject entity does not exist.
    IF ((SELECT ent_type FROM Entities WHERE id = subjID) IS NULL) THEN
        SELECT subjID AS outID, 3 AS exitCode; -- subject does not exist.
        LEAVE proc;
    END IF;

    -- Finally insert the user score, updating the PublicListMetadata in the
    -- process.
    CALL _insertUpdateOrDeletePublicListElement (
        userID
        userScoreListSpecID
        subjID,
        minScore,
        maxScore,
        unixTimeBin,
        NULL,
        20,
        exitCode
    );

    SELECT subjID AS outID, exitCode; -- 0: inserted, or 1: updated.
END proc //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE deletePublicUserScore (
    IN userID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED
)
BEGIN
    DECLARE userScoreListSpecID BIGINT UNSIGNED;
    DECLARE userScoreListSpecDefStr VARCHAR(700)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT (
            CONCAT('@13,@', qualID)
        );

    SELECT ent_id INTO userScoreListSpecID
    FROM EntitySecKeys FORCE INDEX (PRIMARY)
    WHERE (
        ent_type = "c" AND
        user_whitelist_id = 0 AND
        def_key = userScoreListSpecDefStr
    );

    CALL _insertUpdateOrDeletePublicListElement (
        userID,
        userScoreListSpecID,
        subjID,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        exitCode
    );
    SET exitCode CASE WHEN (exitCode = 3)
        THEN 0 -- deleted.
        ELSE 1 -- no change.
    END CASE;

    SELECT subjID AS outID, exitCode; -- score was deleted if there.
END //
DELIMITER ;




-- TODO: Correct these private score insert procedures below at some point.

DELIMITER //
CREATE PROCEDURE insertOrUpdatePrivateUserScore (
    IN userID BIGINT UNSIGNED,
    IN listType CHAR,
    IN userWhitelistID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN scoreVal BIGINT
)
proc: BEGIN
    DECLARE isExceeded TINYINT;
    DECLARE userWhitelistScoreVal FLOAT;

    CALL _increaseWeeklyUserCounters (
        userID, 0, 25, 10, isExceeded
    );
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- counter was exceeded.
        LEAVE proc;
    END IF;

    -- Exit if the user is not currently on the user whitelist.
    SELECT score_val INTO userWhitelistScoreVal
    FROM FloatScoreAndWeightAggregates
    WHERE (
        list_id = userWhitelistID AND
        subj_id = userID
    );
    IF (userWhitelistScoreVal IS NULL OR userWhitelistScoreVal <= 0) THEN
        SELECT subjID AS outID, 1 AS exitCode; -- user is not on the whitelist.
        LEAVE proc;
    END IF;

    INSERT INTO PrivateUserScores (
        list_type, user_whitelist_id, qual_id,
        score_val, user_id, subj_id
    )
    VALUES (
        listType, userWhitelistID, qualID,
        scoreVal, userID, subjID
    );

    SELECT subjID AS outID, 0 AS exitCode; -- inserted if not already there.
END proc //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE deletePrivateUserScore (
    IN userID BIGINT UNSIGNED,
    IN listType CHAR,
    IN userWhitelistID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN scoreVal BIGINT
)
BEGIN
    CALL _increaseWeeklyUserCounters (
        userID, 0, 0, 10, isExceeded
    );
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- counter was exceeded.
        LEAVE proc;
    END IF;

    DELETE FROM PrivateUserScores
    WHERE (
        list_type = listType AND
        user_whitelist_id = userWhitelistID AND
        qual_id = qualID AND
        score_val = scoreVal AND
        user_id = userID AND
        subj_id = subjID
    );

    -- TODO: Also add a request (or reduce the countdown) to go through the
    -- scores on this list and remove any entries from users no longer on the
    -- whitelist. (Implement as a procedure.)

    SELECT subjID AS outID, 0 AS exitCode; -- delete if there.
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE deleteAllPrivateUserScores (
    IN userID BIGINT UNSIGNED,
    IN listType CHAR,
    IN userWhitelistID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED
)
BEGIN
    DECLARE isExceeded TINYINT;

    -- Some arbitrary (pessimistic or optimistic) guess at the computation time.
    CALL _increaseWeeklyUserCounters (
        userID, 0, 0, 1000, isExceeded
    );
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- counter was exceeded.
        LEAVE proc;
    END IF;

    DELETE FROM PrivateUserScores
    WHERE (
        list_type = listType AND
        user_whitelist_id = userWhitelistID AND
        qual_id = qualID AND
        user_id = userID
    );

    SELECT subjID AS outID, 0 AS exitCode; -- deleted if there.
END //
DELIMITER ;


-- DELIMITER //
-- CREATE PROCEDURE deleteSeveralPrivateUserScores (
--     IN userID BIGINT UNSIGNED,
--     IN userWhitelistID BIGINT UNSIGNED,
--     IN qualID BIGINT UNSIGNED,
--     IN scoreCutoff BIGINT UNSIGNED
-- )
-- BEGIN
--     DELETE FROM PrivateUserScores
--     WHERE (
--         user_whitelist_id = userWhitelistID AND
--         qual_id = qualID AND
--         subj_id = subjID AND
--         score_val < scoreCutoff AND
--         user_id = userID
--     );

--     SELECT subjID AS outID, 0 AS exitCode; -- delete if there.
-- END //
-- DELIMITER ;












DELIMITER //
CREATE PROCEDURE _insertEntityWithoutSecKey (
    IN entType CHAR,
    IN userID BIGINT UNSIGNED,
    IN defStr LONGTEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL,
    OUT outID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
proc: BEGIN
    DECLARE isExceeded TINYINT;

    IF (userWhitelistID = 0) THEN
        SET userWhitelistID = NULL;
    END IF;

    CALL _increaseWeeklyUserCounters (
        userID, 0, LENGTH(CAST(defStr AS BINARY)) + 22, 0, isExceeded
    );

    IF (isExceeded) THEN
        SET outID = NULL;
        SET exitCode = 5; -- upload limit was exceeded.
        SELECT outID, exitCode;
        LEAVE proc;
    END IF;

    INSERT INTO Entities (
        creator_id,
        ent_type, def_str, user_whitelist_id, is_editable
    )
    VALUES (
        CASE WHEN (isAnonymous) THEN 0 ELSE userID END,
        entType, defStr, userWhitelistID, isEditable AND NOT isAnonymous
    );
    SET outID = LAST_INSERT_ID();

    SET exitCode = 0; -- insert.
    SELECT outID, exitCode;
END proc //
DELIMITER ;





DELIMITER //
CREATE PROCEDURE _insertOrFindEntityWithSecKey (
    IN entType CHAR,
    IN userID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    OUT outID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
proc: BEGIN
    DECLARE isExceeded TINYINT;
    -- DECLARE EXIT HANDLER FOR 1213 -- Deadlock error.
    -- BEGIN
    --     ROLLBACK;
    --     SELECT NULL AS outID, 10 AS exitCode; -- rollback due to deadlock.
    -- END;

    DECLARE EXIT HANDLER FOR 1586 -- Duplicate key entry error.
    BEGIN
        ROLLBACK;

        SELECT ent_id INTO outID
        FROM EntitySecKeys
        WHERE (
            ent_type = entType AND
            user_whitelist_id = userWhitelistID AND
            def_key = defStr
        );

        SET exitCode = 1; -- find.
        SELECT outID, exitCode;
    END;

    START TRANSACTION;

    INSERT INTO Entities (
        creator_id,
        ent_type, def_str, user_whitelist_id, is_editable
    )
    VALUES (
        CASE WHEN (isAnonymous) THEN 0 ELSE userID END,
        entType, defStr, userWhitelistID, 0
    );
    SET outID = LAST_INSERT_ID();

    INSERT INTO EntitySecKeys (
        ent_type, user_whitelist_id, def_key, ent_id
    )
    VALUES (
        entType, userWhitelistID, defStr, outID
    );

    CALL _increaseWeeklyUserCounters (
        userID, 0, LENGTH(CAST(defStr AS BINARY)) * 2 + 31, 0, isExceeded
    );

    IF (isExceeded) THEN
        ROLLBACK;
        SET outID = NULL;
        SET exitCode = 5; -- upload limit was exceeded.
        SELECT outID, exitCode;
        LEAVE proc;
    END IF;

    COMMIT;

    SET exitCode = 0; -- insert.
    SELECT outID, exitCode;
END proc //
DELIMITER ;







DELIMITER //
CREATE PROCEDURE insertAttributeDefinedEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL
)
BEGIN
    CALL _insertEntityWithoutSecKey (
        "a",
        userID, defStr, userWhitelistID, isAnonymous, 0,
        @unused, @unused
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertFunctionEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL
)
BEGIN
    CALL _insertEntityWithoutSecKey (
        "f",
        userID, defStr, userWhitelistID, isAnonymous, 0,
        @unused, @unused
    );
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE insertOrFindFunctionCallEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    IN isAnonymous BOOL
)
BEGIN
    CALL _insertOrFindEntityWithSecKey (
        "c",
        userID, defStr, isAnonymous, 0,
        @unused, @unused
    );
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE _insertOrFindFunctionCallEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    IN isAnonymous BOOL,
    OUT outID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
BEGIN
    CALL _insertOrFindEntityWithSecKey (
        "c",
        userID, defStr, isAnonymous, 0,
        outID, exitCode
    );
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE insertUTF8Entity (
    IN userID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
BEGIN
    CALL _insertEntityWithoutSecKey (
        "8",
        userID, defStr, userWhitelistID, isAnonymous, isEditable,
        @unused, @unused
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertHTMLEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
BEGIN
    CALL _insertEntityWithoutSecKey (
        "h",
        userID, defStr, userWhitelistID, isAnonymous, isEditable,
        @unused, @unused
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertJSONEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
BEGIN
    CALL _insertEntityWithoutSecKey (
        "j",
        userID, defStr, userWhitelistID, isAnonymous, isEditable,
        @unused, @unused
    );
END //
DELIMITER ;










DELIMITER //
CREATE PROCEDURE _editEntity (
    IN entType CHAR,
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN defStr LONGTEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
proc: BEGIN
    DECLARE isExceeded TINYINT;
    DECLARE creatorID BIGINT UNSIGNED;
    DECLARE prevIsEditable TINYINT UNSIGNED;
    DECLARE prevDefStr LONGTEXT;
    DECLARE prevType CHAR;

    IF (userWhitelistID = 0) THEN
        SET userWhitelistID = NULL;
    END IF;

    CALL _increaseWeeklyUserCounters (
        userID, 0, LENGTH(CAST(defStr AS BINARY)) + 22, 0, isExceeded
    );

    IF (isExceeded) THEN
        SELECT entID AS outID, 5 AS extCode; -- upload limit was exceeded.
        LEAVE proc;
    END IF;


    SELECT ent_type, creator_id, def_str, is_editable
    INTO prevType, creatorID, prevDefStr, prevIsEditable 
    FROM Entities
    WHERE id = entID;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    IF (NOT prevIsEditable) THEN
        SELECT entID AS outID, 3 AS exitCode; -- can not be edited.
        LEAVE proc;
    END IF;

    IF (prevType != entType) THEN
        SELECT entID AS outID, 4 AS exitCode; -- changing entType not allowed.
        LEAVE proc;
    END IF;

    -- If all checks succeed, update the entity.
    UPDATE Entities
    SET
        creator_id = CASE WHEN (isAnonymous) THEN 0 ELSE userID END,
        def_str = defStr,
        user_whitelist_id = userWhitelistID,
        is_editable = isEditable
    WHERE id = entID;

    SELECT entID AS outID, 0 AS exitCode; -- edit.
END proc //
DELIMITER ;





DELIMITER //
CREATE PROCEDURE editUTF8Entity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
BEGIN
    CALL _editEntity (
        "8",
        userID, entID, defStr, userWhitelistID, isAnonymous, isEditable
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE editHTMLEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
BEGIN
    CALL _editEntity (
        "h",
        userID, entID, defStr, userWhitelistID, isAnonymous, isEditable
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE editJSONEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    IN isEditable BOOL
)
proc: BEGIN
    CALL _editEntity (
        "j",
        userID, entID, defStr, userWhitelistID, isAnonymous, isEditable
    );
END proc //
DELIMITER ;











DELIMITER //
CREATE PROCEDURE _substitutePlaceholdersInEntity (
    IN entType CHAR,
    IN maxLen INT UNSIGNED,
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
    IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
)
proc: BEGIN
    DECLARE creatorID BIGINT UNSIGNED;
    DECLARE prevDefStr, newDefStr LONGTEXT;
    DECLARE prevType CHAR;
    DECLARE i TINYINT UNSIGNED DEFAULT 0;
    DECLARE pathStr TEXT;
    DECLARE subEntID BIGINT UNSIGNED;

    SELECT ent_type, creator_id, def_str
    INTO prevType, creatorID, prevDefStr 
    FROM Entities
    WHERE id = entID;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    IF (prevType != entType) THEN
        SELECT entID AS outID, 3 AS exitCode; -- entType is incorrect.
        LEAVE proc;
    END IF;

    -- If all checks succeed, first initialize newDefStr by replacing all
    -- escaped '@'s with some temporary placeholders ("@@" -> "@;").
    SET newDefStr = REPLACE(newDefStr, "@@", "@;");

    -- Then loop through all the paths and substitute any
    -- occurrences inside prevDefStr with the corresponding entIDs.
    label: LOOP
        SET i = i + 1;

        SET pathStr = REGEXP_SUBSTR(paths, "[^,]+", 1, i);
        SET subEntID = CAST(
            REGEXP_SUBSTR(substitutionEntIDs, "[^,]+", 1, i) AS UNSIGNED
        );

        IF (pathStr IS NULL OR subEntID IS NULL) THEN
            LEAVE label;
        ELSE
            -- Replace all occurrences of '@[<path>]' with '@<subEntID>'.
            SET newDefStr = REPLACE(
                newDefStr, CONCAT("@[", pathStr, "]"), CONCAT("@", subEntID)
            );
            ITERATE label;
        END IF;
    END LOOP label;

    -- Restore the escaped '@'s.
    SET newDefStr = REPLACE(newDefStr, "@;", "@@");

    -- Check that newDefStr is not too long.
    IF (LENGTH(newDefStr) > maxLen) THEN
        SELECT entID AS outID, 4 AS exitCode; -- new defStr too long.
        LEAVE proc;
    END IF;
    

    -- Then finally update the entity with the new defStr.
    UPDATE Entities
    SET def_str = newDefStr
    WHERE id = entID;

    SELECT entID AS outID, 0 AS exitCode; -- edit.
END proc //
DELIMITER ;





DELIMITER //
CREATE PROCEDURE substitutePlaceholdersInAttrEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
    IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
)
BEGIN
    CALL _substitutePlaceholdersInEntity (
        "a",
        700, userID, entID, defStr, paths, substitutionEntIDs
    );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE substitutePlaceholdersInFunEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
    IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
)
BEGIN
    CALL _substitutePlaceholdersInEntity (
        "f",
        700, userID, entID, defStr, paths, substitutionEntIDs
    );
END //
DELIMITER ;




-- DELIMITER //
-- CREATE PROCEDURE substitutePlaceholdersInEntity (
--     IN entType CHAR,
--     IN userID BIGINT UNSIGNED,
--     IN entID BIGINT UNSIGNED,
--     IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
--     IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
-- )
-- BEGIN
--     IF (entType = "a" OR entType = "f") THEN
--         CALL _substitutePlaceholdersInEntity (
--             entType, 700, userID, entID, defStr, paths, substitutionEntIDs
--         );
--     ELSE
--         SELECT entID AS outID, 5 AS exitCode; -- entType is not allowed.
--     END IF;
-- END //
-- DELIMITER ;















DELIMITER //
CREATE PROCEDURE finalizeEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED
)
proc: BEGIN
    DECLARE creatorID BIGINT UNSIGNED;

    SELECT creator_id INTO creatorID
    FROM Entities
    WHERE id = entID;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    UPDATE Entities
    SET is_editable = 0
    WHERE id = entID;

    SELECT entID AS outID, 0 AS exitCode; -- edit.
END proc //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE anonymizeEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED
)
proc: BEGIN
    DECLARE creatorID BIGINT UNSIGNED;

    SELECT creator_id INTO creatorID
    FROM Entities
    WHERE id = entID;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    UPDATE Entities
    SET creator_id = 0, is_editable = 0
    WHERE id = entID;

    SELECT entID AS outID, 0 AS exitCode; -- edit.
END proc //
DELIMITER ;


















DELIMITER //
CREATE PROCEDURE _increaseWeeklyUserCounters (
    IN userID BIGINT UNSIGNED,
    IN downloadData FLOAT, -- Only used for query "as user" requests.
    IN uploadData FLOAT,
    IN compUsage FLOAT,
    OUT isExceeded TINYINT
)
proc: BEGIN
    DECLARE downloadCount, uploadCount, compCount FLOAT;
    DECLARE downloadLimit, uploadLimit, compLimit FLOAT;
    DECLARE lastRefreshedAt DATE;
    DECLARE currentDate DATE DEFAULT (CURDATE());
    
    SELECT
        download_data_this_week + uploadData,
        download_data_weekly_limit,
        upload_data_this_week + uploadData,
        upload_data_weekly_limit,
        computation_usage_this_week + compUsage,
        computation_usage_weekly_limit,
        last_refreshed_at
    INTO
        downloadCount,
        downloadLimit,
        uploadCount,
        uploadLimit,
        compCount,
        compLimit,
        lastRefreshedAt
    FROM Private_UserData
    WHERE user_id = userID;

    -- If it has been more than a week since freshing the counters to 0, do so
    -- first. 
    IF (currentDate >= ADDDATE(lastRefreshedAt, INTERVAL 1 WEEK)) THEN
        UPDATE Private_UserData
        SET
            download_data_this_week = 0,
            upload_data_this_week = 0,
            computation_usage_this_week = 0,
            last_refreshed_at = currentDate
        WHERE user_id = userID;

        SET downloadCount = downloadData;
        SET uploadCount = uploadData;
        SET compCount = compUsage;
    END IF;

    -- Then check if any limits are exceeded.
    SET isExceeded = (
        downloadCount > downloadLimit OR
        uploadCount > uploadLimit OR
        compCount > compLimit
    );

    -- Finally update the counters and return isExceeded.
    UPDATE Private_UserData
    SET
        download_data_this_week = downloadCount,
        upload_data_this_week = uploadCount,
        computation_usage_this_week = compCount
    WHERE user_id = userID;
END proc //
DELIMITER ;
