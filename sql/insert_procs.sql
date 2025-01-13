
SELECT "Insert procedures";

DROP PROCEDURE _insertUpdateOrDeletePublicListElement;
DROP PROCEDURE _insertUpdateOrDeletePrivateListElement;
DROP PROCEDURE _getIsMemberAndUserWeight;


DROP PROCEDURE insertOrUpdatePublicUserScore;
DROP PROCEDURE deletePublicUserScore;

DROP PROCEDURE insertOrUpdatePrivateScore;
DROP PROCEDURE deletePrivateScore;


DROP PROCEDURE _insertEntityWithoutSecKey;
DROP PROCEDURE _insertOrFindEntityWithSecKey;

DROP PROCEDURE insertFunctionEntity;
DROP PROCEDURE insertOrFindRegularEntity;
DROP PROCEDURE _insertOrFindRegularEntity;
DROP PROCEDURE insertUTF8Entity;
DROP PROCEDURE insertHTMLEntity;
DROP PROCEDURE insertJSONEntity;

DROP PROCEDURE _editEntity;

DROP PROCEDURE editUTF8Entity;
DROP PROCEDURE editHTMLEntity;
DROP PROCEDURE editJSONEntity;

DROP PROCEDURE substitutePlaceholdersInEntity;

DROP PROCEDURE _nullUserRefsInEntity;

DROP PROCEDURE nullUserRefsInRegularEntity;

DROP PROCEDURE finalizeEntity;
DROP PROCEDURE anonymizeEntity;


DROP PROCEDURE _increaseWeeklyUserCounters;







DELIMITER //
CREATE PROCEDURE _insertUpdateOrDeletePublicListElement (
    IN listID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN float1Val FLOAT,
    IN float2Val FLOAT,
    IN onIndexData VARBINARY(16),
    IN offIndexData VARBINARY(16),
    IN addedUploadDataCost FLOAT,
    OUT exitCode TINYINT
)
BEGIN
    DECLARE prevFloatVal1, prevFloatVal2 FLOAT;
    DECLARE prevListLen BIGINT UNSIGNED;
    DECLARE isExceeded TINYINT;

    SET float2Val = CASE WHEN (float2Val IS NULL)
        THEN 0 ELSE float2Val
    END;

    -- We select (for update) the previous score on the list, and branch
    -- accordingly in order to update the ListMetadata table correctly.
    START TRANSACTION;

    SELECT list_len INTO prevListLen -- only used to lock ListMetadata row.
    FROM PublicListMetadata FORCE INDEX (PRIMARY)
    WHERE list_id = listID
    FOR UPDATE;

    SELECT float_1_val, float_2_val INTO prevFloatVal1, prevFloatVal2
    FROM PublicEntityLists FORCE INDEX (PRIMARY)
    WHERE (
        list_id = listID AND
        subj_id = subjID
    );

    -- Branch according to whether the score should be inserted, updated, or
    -- deleted, the latter being the case where the floatVal input is NULL. 
    IF (float1Val IS NOT NULL AND prevFloatVal1 IS NULL) THEN
        INSERT INTO PublicEntityLists (
            list_id, subj_id,
            float_1_val, float_2_val, on_index_data, off_index_data
        ) VALUES (
            listID, subjID,
            float1Val, float2Val, onIndexData, offIndexData
        );

        INSERT INTO PublicListMetadata (
            list_id,
            list_len, float_1_sum, float_2_sum,
            pos_list_len,
            paid_upload_data_cost
        ) VALUES (
            listID,
            1, float1Val, float2Val,
            CASE WHEN (float1Val > 0) THEN 1 ELSE 0 END,
            addedUploadDataCost
        )
        ON DUPLICATE KEY UPDATE
            list_len = list_len + 1,
            float_1_sum = float_1_sum + float1Val,
            float_2_sum = float_2_sum + float2Val,
            pos_list_len = pos_list_len +
                CASE WHEN (float1Val > 0) THEN 1 ELSE 0 END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost;

        COMMIT;
        SET exitCode = 0; -- insert.

    ELSEIF (float1Val IS NOT NULL AND prevFloatVal1 IS NOT NULL) THEN
        UPDATE PublicEntityLists SET
            float_1_val = float1Val,
            float_2_val = float2Val,
            on_index_data = onIndexData,
            off_index_data = offIndexData,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE (
            list_id = listID AND
            subj_id = subjID
        );
        
        UPDATE PublicListMetadata SET
            float_1_sum = float_1_sum + float1Val - prevFloatVal1,
            float_2_sum = float_2_sum + float2Val - prevFloatVal2,
            pos_list_len = pos_list_len +
                CASE
                    WHEN (float1Val > 0 AND prevFloatVal1 <= 0) THEN 1
                    WHEN (float1Val <= 0 AND prevFloatVal1 > 0) THEN -1
                    ELSE 0
                END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE list_id = listID;

        COMMIT;
        SET exitCode = 1; -- update.

    ELSEIF (float1Val IS NULL AND prevFloatVal1 IS NOT NULL) THEN
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
            pos_list_len = pos_list_len +
                CASE WHEN (prevFloatVal1 > 0) THEN -1 ELSE 0 END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE list_id = listID;

        COMMIT;
        SET exitCode = 2; -- deletion.
    ELSE
        COMMIT;
        SET exitCode = 3; -- no change.
    END IF;
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE _insertUpdateOrDeletePrivateListElement (
    IN listType CHAR,
    IN userWhiteListID BIGINT UNSIGNED,
    IN listID BIGINT UNSIGNED,
    IN userID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN floatVal FLOAT,
    IN onIndexData VARBINARY(16),
    IN offIndexData VARBINARY(16),
    IN addedUploadDataCost FLOAT,
    OUT exitCode TINYINT
)
BEGIN
    DECLARE prevFloatVal FLOAT;
    DECLARE prevListLen, prevCombListLen BIGINT UNSIGNED;
    DECLARE isExceeded TINYINT;

    -- We select (for update) the previous score on the list, and branch
    -- accordingly in order to update the ListMetadata table correctly.
    START TRANSACTION;

    SELECT list_len INTO prevCombListLen -- only used to lock ListMetadata list.
    FROM PrivateListMetadata FORCE INDEX (PRIMARY)
    WHERE (
        list_type = listType AND
        user_whitelist_id = userWhiteListID AND
        list_id = listID AND
        user_id = 0
    )
    FOR UPDATE;

    SELECT float_val INTO prevFloatVal
    FROM PrivateEntityLists FORCE INDEX (PRIMARY)
    WHERE (
        list_type = listType AND
        user_whitelist_id = userWhiteListID AND
        list_id = listID AND
        user_id = userID AND
        subj_id = subjID
    );

    -- Branch according to whether the score should be inserted, updated, or
    -- deleted, the latter being the case where the floatVal input is NULL. 
    IF (floatVal IS NOT NULL AND prevFloatVal IS NULL) THEN
        INSERT INTO PrivateEntityLists (
            list_type, user_whitelist_id, list_id, user_id, subj_id,
            float_val, on_index_data, off_index_data
        ) VALUES (
            listType, userWhitelistID, listID, userID, subjID,
            floatVal, onIndexData, offIndexData
        );

        INSERT INTO PrivateListMetadata (
            list_type, user_whitelist_id, list_id, user_id,
            list_len, float_sum,
            pos_list_len,
            paid_upload_data_cost
        ) VALUES (
            listID,
            1, floatVal,
            CASE WHEN (floatVal > 0) THEN 1 ELSE 0 END,
            addedUploadDataCost
        )
        ON DUPLICATE KEY UPDATE
            list_len = list_len + 1,
            float_sum = float_sum + floatVal,
            pos_list_len = pos_list_len +
                CASE WHEN (floatVal > 0) THEN 1 ELSE 0 END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost;

        COMMIT;
        SET exitCode = 0; -- insert.

    ELSEIF (floatVal IS NOT NULL AND prevFloatVal IS NOT NULL) THEN
        UPDATE PrivateEntityLists SET
            float_val = floatVal,
            on_index_data = onIndexData,
            off_index_data = offIndexData,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE (
            list_type = listType AND
            user_whitelist_id = userWhiteListID AND
            list_id = listID AND
            user_id = userID AND
            subj_id = subjID
        );
        
        UPDATE PrivateListMetadata SET
            float_sum = float_sum + floatVal - prevFloatVal,
            pos_list_len = pos_list_len +
                CASE
                    WHEN (floatVal > 0 AND prevFloatVal <= 0) THEN 1
                    WHEN (floatVal <= 0 AND prevFloatVal > 0) THEN -1
                    ELSE 0
                END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE list_id = listID;

        COMMIT;
        SET exitCode = 1; -- update.

    ELSEIF (floatVal IS NULL AND prevFloatVal IS NOT NULL) THEN
        DELETE FROM PrivateEntityLists
        WHERE (
            user_group_id = userGroupID AND
            list_spec_id = listSpecID AND
            subj_id = subjID
        );
        
        UPDATE PrivateListMetadata SET
            list_len = list_len - 1,
            float_1_sum = float_1_sum - prevFloatVal,
            float_2_sum = float_2_sum - prevFloatVal2,
            pos_list_len = pos_list_len +
                CASE WHEN (prevFloatVal > 0) THEN -1 ELSE 0 END,
            paid_upload_data_cost = paid_upload_data_cost +
                addedUploadDataCost
        WHERE (
            list_type = listType AND
            user_whitelist_id = userWhiteListID AND
            list_id = listID AND
            user_id = 0
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
CREATE PROCEDURE _getIsMemberAndUserWeight (
    IN userID BIGINT UNSIGNED,
    IN userGroupID BIGINT UNSIGNED,
    OUT isMember BOOL,
    OUT userWeightVal FLOAT
)
proc: BEGIN
    IF (
        userGroupID <=> 0 AND
        "u" <=> (
            SELECT ent_type
            FROM Entities FORCE INDEX (PRIMARY)
            WHERE id = userID
        )
        OR
        userGroupID != 0 AND
        userID = userGroupID
    ) THEN
        SET isMember = 1;
        SET userWeightVal = 1;
        LEAVE proc;
    END IF;

    SELECT float_1_val INTO userWeightVal
    FROM PublicEntityLists FORCE INDEX (PRIMARY)
    WHERE (
        list_id = userGroupID AND
        subj_id = userID
    );

    SET isMember = (userWeightVal > 0);
END proc //
DELIMITER ;













DELIMITER //
CREATE PROCEDURE insertOrUpdatePublicUserScore (
    IN userID BIGINT UNSIGNED,
    IN qualID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN scoreMid FLOAT,
    IN scoreRad FLOAT,
    IN truncateTimeBy TINYINT UNSIGNED
)
proc: BEGIN
    DECLARE isExceeded, exitCode TINYINT;
    DECLARE userScoreListID BIGINT UNSIGNED;
    DECLARE userScoreListDefStr VARCHAR(700)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT (
            CONCAT('@[11],@[', userID, '],@[', qualID, ']')
        );
    DECLARE unixTime INT UNSIGNED DEFAULT (
        UNIX_TIMESTAMP() >> truncateTimeBy << truncateTimeBy
    );
    DECLARE unixTimeBin VARBINARY(4) DEFAULT (
        UNHEX(CONV(unixTime, 10, 16))
    );

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
    CALL _insertOrFindRegularEntity (
        userID, userScoreListDefStr, 0, 1,
        userScoreListID, exitCode
    );
    IF (exitCode = 5) THEN
        LEAVE proc;
    END IF;

    -- Exit if the subject entity does not exist.
    IF (
        (
            SELECT ent_type
            FROM Entities FORCE INDEX (PRIMARY)
            WHERE id = subjID
        )
        IS NULL
    ) THEN
        SELECT subjID AS outID, 3 AS exitCode; -- subject does not exist.
        LEAVE proc;
    END IF;

    -- Finally insert the user score, updating the PublicListMetadata in the
    -- process.
    CALL _insertUpdateOrDeletePublicListElement (
        userScoreListID,
        subjID,
        scoreMid,
        scoreRad,
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
    DECLARE userScoreListID BIGINT UNSIGNED;
    DECLARE userScoreListDefStr VARCHAR(700)
        CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT (
            CONCAT('@[11],@[', userID, '],@[', qualID, ']')
        );
    DECLARE exitCode TINYINT;

    SELECT ent_id INTO userScoreListID
    FROM EntitySecKeys FORCE INDEX (PRIMARY)
    WHERE (
        ent_type = "r" AND
        user_whitelist_id = 0 AND
        def_key = userScoreListDefStr
    );

    CALL _insertUpdateOrDeletePublicListElement (
        userScoreListID,
        subjID,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        exitCode
    );
    SET exitCode = CASE WHEN (exitCode = 3)
        THEN 0 -- deleted.
        ELSE 1 -- no change.
    END;

    SELECT subjID AS outID, exitCode; -- score was deleted if there.
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertOrUpdatePrivateScore (
    IN userID BIGINT UNSIGNED,
    IN listType CHAR,
    IN userWhiteListID BIGINT UNSIGNED,
    IN listID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN floatVal FLOAT,
    IN onIndexData VARBINARY(16),
    IN offIndexData VARBINARY(16),
    IN addedUploadDataCost FLOAT
)
proc: BEGIN
    DECLARE isExceeded, exitCode TINYINT;
    DECLARE addedUploadDataCost FLOAT DEFAULT (
        32 + LENGTH(offIndexData) + 2 * LENGTH(onIndexData)
    );

    -- Pay the upload data cost for the score insert.
    CALL _increaseWeeklyUserCounters (
        userID, 0, addedUploadDataCost, 0, isExceeded
    );
    -- Exit if upload limit was exceeded.
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- upload limit was exceeded.
        LEAVE proc;
    END IF;

    -- Finally insert the user score, updating the PrivateListMetadata in the
    -- process.
    CALL _insertUpdateOrDeletePrivateListElement (
        listType,
        userWhiteListID,
        listID,
        userID,
        subjID,
        floatVal,
        onIndexData,
        offIndexData,
        addedUploadDataCost,
        exitCode
    );

    SELECT subjID AS outID, exitCode; -- 0: inserted, or 1: updated.
END proc //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE deletePrivateScore (
    IN userID BIGINT UNSIGNED,
    IN listType CHAR,
    IN userWhiteListID BIGINT UNSIGNED,
    IN listID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED
)
BEGIN
    CALL _insertUpdateOrDeletePrivateListElement (
        listType,
        userWhiteListID,
        listID,
        userID,
        subjID,
        NULL,
        NULL,
        NULL,
        0,
        exitCode
    );

    SELECT subjID AS outID, 0 AS exitCode; -- score was deleted if there.
END //
DELIMITER ;


-- DELIMITER //
-- CREATE PROCEDURE deleteAllPrivateScores (
--     IN userID BIGINT UNSIGNED,
--     IN listType CHAR,
--     IN userWhiteListID BIGINT UNSIGNED,
--     IN listID BIGINT UNSIGNED
-- )
-- proc: BEGIN
--     DECLARE isExceeded TINYINT;

--     -- Some arbitrary (pessimistic or optimistic) guess at the computation time.
--     CALL _increaseWeeklyUserCounters (
--         userID, 0, 0, 1000, isExceeded
--     );
--     IF (isExceeded) THEN
--         SELECT subjID AS outID, 5 AS exitCode; -- counter was exceeded.
--         LEAVE proc;
--     END IF;

--     DELETE FROM PrivateUserScores
--     WHERE (
--         list_type = listType AND
--         user_whitelist_id = userWhitelistID AND
--         qual_id = qualID AND
--         user_id = userID
--     );
--     SET exitCode = CASE WHEN (exitCode = 3)
--         THEN 0 -- deleted.
--         ELSE 1 -- no change.
--     END;

--     SELECT subjID AS outID, exitCode; -- deleted if there.
-- END proc //
-- DELIMITER ;


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
        ent_type, def_str, user_whitelist_id, is_editable,
        paid_upload_data_cost
    )
    VALUES (
        CASE WHEN (isAnonymous) THEN 0 ELSE userID END,
        entType, defStr, userWhitelistID, isEditable AND NOT isAnonymous,
        LENGTH(defStr) + 25
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
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
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

    DECLARE EXIT HANDLER FOR 1062, 1586 -- Duplicate key entry error.
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
        ent_type, def_str, user_whitelist_id, is_editable,
        paid_upload_data_cost
    )
    VALUES (
        CASE WHEN (isAnonymous) THEN 0 ELSE userID END,
        entType, defStr, userWhitelistID, 0,
        LENGTH(defStr) * 2 + 33
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







-- DELIMITER //
-- CREATE PROCEDURE insertAttributeDefinedEntity (
--     IN userID BIGINT UNSIGNED,
--     IN defStr TEXT CHARACTER SET utf8mb4,
--     IN userWhitelistID BIGINT UNSIGNED,
--     IN isAnonymous BOOL
-- )
-- BEGIN
--     CALL _insertEntityWithoutSecKey (
--         "a",
--         userID, defStr, userWhitelistID, isAnonymous, 0,
--         @unused, @unused
--     );
-- END //
-- DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertFunctionEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr TEXT CHARACTER SET utf8mb4,
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
CREATE PROCEDURE insertOrFindRegularEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL
)
BEGIN
    CALL _insertOrFindEntityWithSecKey (
        "r",
        userID, defStr, userWhitelistID, isAnonymous,
        @unused, @unused
    );
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE _insertOrFindRegularEntity (
    IN userID BIGINT UNSIGNED,
    IN defStr VARCHAR(700) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    IN userWhitelistID BIGINT UNSIGNED,
    IN isAnonymous BOOL,
    OUT outID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
BEGIN
    CALL _insertOrFindEntityWithSecKey (
        "r",
        userID, defStr, userWhitelistID, isAnonymous,
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
    IN maxLen INT UNSIGNED,
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
    DECLARE prevLen, newLen INT UNSIGNED;
    DECLARE prevType CHAR;

    SET newLen = LENGTH(defStr);

    IF (newLen > maxLen) THEN
        SELECT entID AS outID, 6 AS exitCode; -- defStr was too long.
        LEAVE proc;
    END IF;

    SELECT
        ent_type, creator_id, def_str, LENGTH(def_str), is_editable
    INTO prevType, creatorID, prevDefStr, prevLen, prevIsEditable 
    FROM Entities
    WHERE id = entID;

    CALL _increaseWeeklyUserCounters (
        userID, 0, newLen - prevLen + 22, 0, isExceeded
    );
    IF (isExceeded) THEN
        SELECT entID AS outID, 5 AS extCode; -- upload limit was exceeded.
        LEAVE proc;
    END IF;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    IF (NOT prevIsEditable) THEN
        SELECT entID AS outID, 3 AS exitCode; -- cannot be edited.
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
        "8", 4294967295,
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
        "h", 4294967295,
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
        "j", 4294967295,
        userID, entID, defStr, userWhitelistID, isAnonymous, isEditable
    );
END proc //
DELIMITER ;









-- TODO: Add counter increase to this procedure.

DELIMITER //
CREATE PROCEDURE substitutePlaceholdersInEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
    IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
)
proc: BEGIN
    DECLARE pathRegExp VARCHAR(80) DEFAULT '[^0-9\\[\\]@,;"][^\\[\\]@,;"]*';
    DECLARE creatorID, subEntID, userWhiteListID BIGINT UNSIGNED;
    DECLARE entType CHAR;
    DECLARE prevDefStr, newDefStr LONGTEXT;
    DECLARE prevType CHAR;
    DECLARE i TINYINT UNSIGNED DEFAULT 0;
    DECLARE pathStr TEXT;
    DECLARE prevLen, newLen, maxLen, addedLen INT UNSIGNED;
    DECLARE isExceeded TINYINT;

    SELECT ent_type, creator_id, def_str, LENGTH(def_str), user_whitelist_id
    INTO entType, creatorID, prevDefStr, prevLen, userWhiteListID
    FROM Entities FORCE INDEX (PRIMARY)
    WHERE id = entID;

    IF (creatorID != userID) THEN
        SELECT entID AS outID, 2 AS exitCode; -- user is not the owner.
        LEAVE proc;
    END IF;

    -- If all checks succeed, first initialize newDefStr.
    SET newDefStr = prevDefStr;

    -- Then loop through all the paths and substitute any
    -- occurrences inside prevDefStr with the corresponding entIDs.
    loop_1: LOOP
        SET i = i + 1;

        SET pathStr = REGEXP_SUBSTR(paths, "[^,]+", 1, i);
        SET subEntID = CAST(
            REGEXP_SUBSTR(substitutionEntIDs, "[^,]+", 1, i) AS UNSIGNED
        );

        IF (pathStr IS NULL) THEN
            LEAVE loop_1;
        END IF;
        IF (subEntID IS NULL OR subEntID = 0) THEN
            ITERATE loop_1;
        END IF;

        -- If a path is ill-formed, exit and make no updates.
        IF NOT (REGEXP_LIKE(pathStr, pathRegExp)) THEN
            SELECT entID AS outID, 3 AS exitCode; -- a path was ill-formed.
            LEAVE proc;
        END IF;

        -- Replace all occurrences of '@[<path>]' with '@<subEntID>'.
        SET newDefStr = REPLACE(
            newDefStr,
            CONCAT("@[", pathStr,  "]"),
            CONCAT("@[", subEntID, "]")
        );

        ITERATE loop_1;
    END LOOP loop_1;

    -- Check that newDefStr is not too long.
    SET maxLen = CASE
        WHEN (entType = "r") THEN 700
        WHEN (entType = "f") THEN 65535
        ELSE 4294967295
    END;
    SET newLen = LENGTH(newDefStr);
    IF (newLen > maxLen) THEN
        SELECT entID AS outID, 4 AS exitCode; -- new defStr too long.
        LEAVE proc;
    END IF;

    -- Pay the upload data cost for the edit.
    SET addedLen = CASE WHEN (newLen > prevLen)
        THEN newLen - prevLen
        ELSE 0
    END;
    CALL _increaseWeeklyUserCounters (
        userID, 0, addedLen, 10, isExceeded
    );
    -- Exit if upload limit was exceeded.
    IF (isExceeded) THEN
        SELECT subjID AS outID, 5 AS exitCode; -- upload limit was exceeded.
        LEAVE proc;
    END IF;

    -- Then finally update the entity with the new defStr.
    IF (entType != "r") THEN
        UPDATE Entities
        SET def_str = newDefStr
        WHERE id = entID;
    ELSE
        START TRANSACTION;

        UPDATE Entities
        SET def_str = newDefStr
        WHERE id = entID;

        UPDATE EntitySecKeys
        SET def_key = newDefStr
        WHERE (
            ent_type = "r" AND
            user_whitelist_id = userWhiteListID AND
            def_key = prevDefStr AND
            ent_id = entID
        );

        COMMIT;
    END IF;

    SELECT entID AS outID, 0 AS exitCode; -- edit.
END proc //
DELIMITER ;





-- DELIMITER //
-- CREATE PROCEDURE substitutePlaceholdersInAttrEntity (
--     IN userID BIGINT UNSIGNED,
--     IN entID BIGINT UNSIGNED,
--     IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
--     IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
-- )
-- BEGIN
--     CALL _substitutePlaceholdersInEntity (
--         "a",
--         700, userID, entID, defStr, paths, substitutionEntIDs
--     );
-- END //
-- DELIMITER ;

-- DELIMITER //
-- CREATE PROCEDURE substitutePlaceholdersInFunEntity (
--     IN userID BIGINT UNSIGNED,
--     IN entID BIGINT UNSIGNED,
--     IN paths TEXT, -- List of the form '<path_1>,<path_2>...'
--     IN substitutionEntIDs TEXT -- List of the form '<entID_1>,<entID_2>...'
-- )
-- BEGIN
--     CALL _substitutePlaceholdersInEntity (
--         "f",
--         700, userID, entID, defStr, paths, substitutionEntIDs
--     );
-- END //
-- DELIMITER ;








DELIMITER //
CREATE PROCEDURE _nullUserRefsInEntity (
    IN entType CHAR,
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
proc: BEGIN
    DECLARE prevDefStr, newDefStr LONGTEXT CHARACTER SET utf8mb4
        COLLATE utf8mb4_bin;
    DECLARE userWhiteListID BIGINT UNSIGNED;
    DECLARE isMember TINYINT;

    SELECT def_str, user_whitelist_id INTO prevDefStr, userWhiteListID
    FROM Entities FORCE INDEX (PRIMARY)
    WHERE (
        id = entID AND
        ent_type = entType
    );

    CALL _getIsMemberAndUserWeight (
        userID,
        userWhiteListID,
        isMember,
        @unused
    );

    IF NOT (isMember) THEN
        SET exitCode = 2; -- user is not on whitelist.
        LEAVE proc;
    END IF;
    
    SET newDefStr = REGEXP_REPLACE(
        prevDefStr, CONCAT('@[', userID, ']'), '@[0]'
    );

    IF (newDefStr <=> prevDefStr) THEN
        SET exitCode = 1; -- no changes.
    ELSE
        START TRANSACTION;

        UPDATE Entities
        SET def_str = newDefStr
        WHERE id = entID;

        DELETE FROM EntitySecKeys
        WHERE (
            ent_type = entType AND
            user_whitelist_id = userWhiteListID AND
            def_key = prevDefStr
        );

        COMMIT;
        SET exitCode = 0; -- occurrences was nulled.
    END IF;
END proc //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE nullUserRefsInRegularEntity (
    IN userID BIGINT UNSIGNED,
    IN entID BIGINT UNSIGNED
)
proc: BEGIN
    DECLARE exitCode TINYINT;

    CALL _substitutePlaceholdersInEntity (
        "r", userID, entID, exitCode
    );

    SELECT entID AS outID, exitCode;
END proc //
DELIMITER ;











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

    -- userID can be set to 0 in order to suppress any counter checks.
    IF (userID = 0) THEN
        SET isExceeded = 0;
        LEAVE proc;
    END IF;
    
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
