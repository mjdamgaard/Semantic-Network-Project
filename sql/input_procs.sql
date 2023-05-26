
SELECT "Input procedures";

DROP PROCEDURE createOrFindSet;
DROP PROCEDURE inputOrChangeRating;
DROP PROCEDURE inputOrChangeRatingFromSecKey;
DROP PROCEDURE insertOrFindContext;
DROP PROCEDURE insertOrFindTerm;
DROP PROCEDURE insertOrFindKeywordString;
DROP PROCEDURE insertOrFindPattern;
DROP PROCEDURE insertText;
DROP PROCEDURE insertBinary;
DROP PROCEDURE insertOrFindList;



DELIMITER //
CREATE PROCEDURE createOrFindSet (
    IN userID BIGINT UNSIGNED,
    IN predID BIGINT UNSIGNED,
    IN subjType CHAR(1)
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;

    SELECT id INTO outID
    FROM Sets
    WHERE (
        user_id = userID AND
        pred_id = predID AND
        subj_t = subjType
    );
    IF (outID IS NULL) THEN
        INSERT INTO Sets (
            user_id,
            pred_id,
            subj_t,
            elem_num
        )
        VALUES (
            userID,
            predID,
            subjType,
            0
        );
        SELECT LAST_INSERT_ID() INTO outID;
        SET exitCode = 0; -- create.
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("s", outID, userID);
    ELSE
        SET exitCode = 1; -- find.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE inputOrChangeRating (
    IN userID BIGINT UNSIGNED,
    IN setID BIGINT UNSIGNED,
    IN subjID BIGINT UNSIGNED,
    IN ratValHex VARCHAR(510),
    IN delayTime TIME
)
BEGIN
    DECLARE exitCode TINYINT;
    DECLARE prevRatVal, ratVal VARBINARY(255);
    DECLARE setUserID, prevElemNum BIGINT UNSIGNED;

    IF NOT EXISTS (
        SELECT id FROM Sets WHERE (id = setID AND user_id = userID)
    ) THEN
        SET exitCode = 2; -- user does not own the set (or set doesn't exist).
    ELSE
        IF (ratValHex = "") THEN
            SET ratValHex = NULL;
        END IF;
        SET ratVal = UNHEX(ratValHex);

        SELECT rat_val INTO prevRatVal
        FROM SemanticInputs
        WHERE (
            subj_id = subjID AND
            set_id = setID
        );
        SELECT elem_num INTO prevElemNum
        FROM Sets
        WHERE id = setID
        FOR UPDATE;
        SELECT rat_val INTO prevRatVal
        FROM SemanticInputs
        WHERE (
            subj_id = subjID AND
            set_id = setID
        )
        FOR UPDATE;

        -- TODO: Change this to update PrivateRecentInputs instead, make a
        -- scheduled event to move private recent inputs into (the public)
        -- RecentInputs, and at some point also make an event to record
        -- recent inputs into RecordedInputs when there is long enough time
        -- between the last last recent input before that.
        SET delayTime = 0; -- (not implemented yet)
        INSERT INTO RecentInputs (set_id, rat_val, subj_id)
        VALUES (setID, ratVal, subjID); -- (This can in theory fail if to
        -- changes can happen at the same millisecond, so let's keep it here
        -- above the following updates, for aesthetics if nothing else.)

        IF (ratVal IS NOT NULL AND prevRatVal IS NULL) THEN
            INSERT INTO SemanticInputs (set_id, rat_val, subj_id)
            VALUES (setID, ratVal, subjID);
            UPDATE Sets
            SET elem_num = prevElemNum + 1
            WHERE id = setID;
            SET exitCode = 0; -- success(ful insertion of new rating).
        ELSEIF (ratVal IS NOT NULL AND prevRatVal IS NOT NULL) THEN
            UPDATE SemanticInputs
            SET rat_val = ratVal
            WHERE (
                subj_id = subjID AND
                set_id = setID
            );
            SET exitCode = 0; -- success(ful update of previous rating).
        ELSEIF (ratVal IS NULL AND prevRatVal IS NOT NULL) THEN
            DELETE FROM SemanticInputs
            WHERE (
                subj_id = subjID AND
                set_id = setID
            );
            UPDATE Sets
            SET elem_num = prevElemNum - 1
            WHERE id = setID;
            SET exitCode = 0; -- success(ful deletion of previous rating).
        ELSE
            SET exitCode = 1; -- trying to delete a non-existing rating.
        END IF;
    END IF;
    SELECT setID AS outID, exitCode;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE inputOrChangeRatingFromSecKey (
    IN userID BIGINT UNSIGNED,
    IN predID BIGINT UNSIGNED,
    IN subjType CHAR(1),
    IN subjID BIGINT UNSIGNED,
    IN ratValHex VARCHAR(510),
    IN delayTime TIME
)
BEGIN
    DECLARE setID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;
    SET exitCode = 1; -- means that set was found (perhaps overwritten below).

    SELECT id INTO setID
    FROM Sets
    WHERE (
        user_id = userID AND
        pred_id = predID AND
        subj_t = subjType
    );
    IF (setID IS NULL) THEN
        INSERT INTO Sets (
            user_id,
            pred_id,
            subj_t,
            elem_num
        )
        VALUES (
            userID,
            predID,
            subjType,
            0
        );
        SELECT LAST_INSERT_ID() INTO setID;
        SET exitCode = 0; -- set was created.
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("s", setID, userID);
    END IF;
    CALL inputOrChangeRating (
        userID,
        setID,
        subjID,
        ratValHex,
        delayTime
    );
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertOrFindContext (
    IN userID BIGINT UNSIGNED,
    IN parentCxtID BIGINT UNSIGNED,
    IN cxtTitle VARCHAR(255),
    IN desTextID BIGINT UNSIGNED,
    IN specType CHAR(1)
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;

    SELECT id INTO outID
    FROM Contexts
    WHERE (
        parent_context_id = parentCxtID AND
        description_text_id = desTextID AND
        spec_entity_t = specType AND
        title = cxtTitle
    );
    IF (outID IS NOT NULL) THEN
        SET exitCode = 1; -- find.
    ELSEIF (NOT EXISTS (SELECT id FROM Contexts WHERE id = parentCxtID)) THEN
        SET exitCode = 2; -- parent context does not exist.
    ELSE
        INSERT INTO Contexts (
            parent_context_id, title, description_text_id, spec_entity_t
        )
        VALUES (
            parentCxtID, cxtTitle, desTextID, specType
        );
        SELECT LAST_INSERT_ID() INTO outID;
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("c", outID, userID);
        SET exitCode = 0; -- insert.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE insertOrFindTerm (
    IN userID BIGINT UNSIGNED,
    IN cxtID BIGINT UNSIGNED,
    IN termTitle VARCHAR(255),
    IN specID BIGINT UNSIGNED
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;

    SELECT id INTO outID
    FROM Terms
    WHERE (
        context_id = cxtID AND
        spec_entity_id = specID AND
        title = termTitle
    );
    IF (outID IS NOT NULL) THEN
        SET exitCode = 1; -- find.
    ELSEIF (NOT EXISTS (SELECT id FROM Contexts WHERE id = cxtID)) THEN
        SET exitCode = 2; -- context does not exist.
    ELSE
        INSERT INTO Terms (
            context_id, title, spec_entity_id
        )
        VALUES (
            cxtID, termTitle, specID
        );
        SELECT LAST_INSERT_ID() INTO outID;
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("t", outID, userID);
        SET exitCode = 0; -- insert.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertOrFindList (
    IN userID BIGINT UNSIGNED,
    IN elemTypeStr VARCHAR(31),
    IN elemIDHexStr VARCHAR(496),
    IN tailID BIGINT UNSIGNED
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;
    DECLARE elemIDs VARBINARY(248);
    SET elemIDs = UNHEX(elemIDHexStr);

    IF (tailID = 0) THEN
        SET tailID = NULL;
    END IF;

    SELECT id INTO outID
    FROM Lists
    WHERE (elem_ts = elemTypeStr AND elem_ids = elemIDs AND tail_id = tailID);
    IF (outID IS NOT NULL) THEN
        SET exitCode = 1; -- find.
    ELSE
        INSERT INTO Lists (elem_ts, elem_ids, tail_id)
        VALUES (elemTypeStr, elemIDs, tailID);
        SELECT LAST_INSERT_ID() INTO outID;
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("l", outID, userID);
        SET exitCode = 0; -- insert.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertOrFindPattern (
    IN userID BIGINT UNSIGNED,
    IN s VARCHAR(768)
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;

    SELECT id INTO outID
    FROM Patterns
    WHERE str = s;
    IF (outID IS NOT NULL) THEN
        SET exitCode = 1; -- find.
    ELSE
        INSERT INTO Patterns (str)
        VALUES (s);
        SELECT LAST_INSERT_ID() INTO outID;
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("p", outID, userID);
        SET exitCode = 0; -- insert.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE insertOrFindKeywordString (
    IN userID BIGINT UNSIGNED,
    IN s VARCHAR(768)
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;
    DECLARE exitCode TINYINT;

    SELECT id INTO outID
    FROM KeywordStrings
    WHERE str = s;
    IF (outID IS NOT NULL) THEN
        SET exitCode = 1; -- find.
    ELSE
        INSERT INTO KeywordStrings (str)
        VALUES (s);
        SELECT LAST_INSERT_ID() INTO outID;
        INSERT INTO Creators (entity_t, entity_id, user_id)
        VALUES ("k", outID, userID);
        SET exitCode = 0; -- insert.
    END IF;
    SELECT outID, exitCode;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertText (
    IN userID BIGINT UNSIGNED,
    IN s TEXT
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;

    INSERT INTO Texts (str)
    VALUES (s);
    SELECT LAST_INSERT_ID() INTO outID;
    INSERT INTO Creators (entity_t, entity_id, user_id)
    VALUES ("x", outID, userID);
    SELECT outID, 0; -- insert.
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE insertBinary (
    IN userID BIGINT UNSIGNED,
    IN b TEXT,
    OUT outID BIGINT UNSIGNED,
    OUT exitCode TINYINT
)
BEGIN
    DECLARE outID BIGINT UNSIGNED;

    INSERT INTO Binaries (bin)
    VALUES (b);
    SELECT LAST_INSERT_ID() INTO outID;
    INSERT INTO Creators (entity_t, entity_id, user_id)
    VALUES ("b", outID, userID);
    SELECT outID, 0; -- insert.
END //
DELIMITER ;
