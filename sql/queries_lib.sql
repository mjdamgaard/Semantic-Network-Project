

DROP PROCEDURE selectSet;
DROP PROCEDURE selectRating;

DROP PROCEDURE selectCatDef;
DROP PROCEDURE selectStdDef;
DROP PROCEDURE selectRelDef;

DROP PROCEDURE selectSuperCatDefs;

DROP PROCEDURE selectData;

DROP PROCEDURE selectCreations;




DELIMITER //
CREATE PROCEDURE selectSet (
    IN userType CHAR(1),
    IN userIDHex VARCHAR(16),
    IN subjType CHAR(1),
    IN subjIDHex VARCHAR(16),
    IN relIDHex VARCHAR(16),
    IN ratingRangeMin VARBINARY(255),
    IN ratingRangeMax VARBINARY(255),
    IN num INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    DECLARE userID, subjID, relID, setID BIGINT UNSIGNED;
    SET userID = CONV(userIDHex, 16, 10);
    SET subjID = CONV(subjIDHex, 16, 10);
    SET relID = CONV(relIDHex, 16, 10);

    -- DECLARE setID BIGINT UNSIGNED;
    SELECT set_id INTO setID
    FROM Sets
    WHERE (
        user_t = userType AND
        user_id = userID AND
        subj_t = subjType AND
        subj_id = subjID AND
        rel_id = relID
    );
    SELECT
        HEX(rat_val) AS ratingVal,
        obj_t AS objType,
        obj_id AS objID
    FROM SemanticInputs
    WHERE (
        set_id = setID AND
        (ratingRangeMin IS NULL OR rat_val >= ratingRangeMin) AND
        (ratingRangeMax IS NULL OR rat_val <= ratingRangeMax)
    )
    ORDER BY
        CASE WHEN isAscOrder THEN rat_val END ASC,
        CASE WHEN NOT isAscOrder THEN rat_val END DESC,
        obj_t ASC,
        obj_id ASC
    LIMIT numOffset, num;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectRating (
    IN objType CHAR(1),
    IN objIDHex VARCHAR(16),
    IN userType CHAR(1),
    IN userIDHex VARCHAR(16),
    IN subjType CHAR(1),
    IN subjIDHex VARCHAR(16),
    IN relIDHex VARCHAR(16)
)
BEGIN
    DECLARE objID, userID, subjID, relID, setID BIGINT UNSIGNED;
    SET objID = CONV(objIDHex, 16, 10);
    SET userID = CONV(userIDHex, 16, 10);
    SET subjID = CONV(subjIDHex, 16, 10);
    SET relID = CONV(relIDHex, 16, 10);

    -- DECLARE setID BIGINT UNSIGNED;
    SELECT set_id INTO setID
    FROM Sets
    WHERE (
        user_t = userType AND
        user_id = userID AND
        subj_t = subjType AND
        subj_id = subjID AND
        rel_id = relID
    );
    SELECT HEX(rat_val) AS ratingVal
    FROM SemanticInputs
    WHERE (obj_t = objType AND obj_id = objID AND set_id = setID);
END //
DELIMITER ;









DELIMITER //
CREATE PROCEDURE selectCatDef (
    IN catIDHex VARCHAR(16)
)
BEGIN
    DECLARE catID BIGINT UNSIGNED;
    SET catID = CONV(catIDHex, 16, 10);

    SELECT title AS title, HEX(super_cat_id) AS superCatID
    FROM Categories
    WHERE id = catID;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectStdDef (
    IN stdIDHex VARCHAR(16)
)
BEGIN
    DECLARE stdID BIGINT UNSIGNED;
    SET stdID = CONV(stdIDHex, 16, 10);

    SELECT title AS title, HEX(cat_id) AS catID
    FROM StandardTerms
    WHERE id = stdID;
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE selectRelDef (
    IN relIDHex VARCHAR(16)
)
BEGIN
    DECLARE relID BIGINT UNSIGNED;
    SET relID = CONV(relIDHex, 16, 10);

    SELECT obj_noun AS objNoun, HEX(subj_cat_id) AS subjCatID
    FROM Relations
    WHERE id = relID;
END //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE selectSuperCatDefs (
    IN catIDHex VARCHAR(16)
)
BEGIN
    DECLARE catID BIGINT UNSIGNED;
    DECLARE str VARCHAR(255);
    DECLARE n TINYINT UNSIGNED;
    SET catID = CONV(catIDHex, 16, 10);

    CREATE TEMPORARY TABLE ret
        SELECT title, super_cat_id AS superCatID
        FROM Categories
        WHERE id = NULL;

    SET n = 0;
    label1: LOOP
        IF (NOT catID > 0 OR n >= 255) THEN
            LEAVE label1;
        END IF;
        SELECT title, super_cat_id INTO str, catID
        FROM Categories
        WHERE id = catID;
        INSERT INTO ret (title, superCatID)
        VALUES (str, catID);
        SET n = n + 1;
        ITERATE label1;
    END LOOP label1;
    SELECT title, CONV(superCatID, 10, 16) FROM ret ORDER BY superCatID DESC;
END //
DELIMITER ;

-- SHOW WARNINGS;



DELIMITER //
CREATE PROCEDURE selectData (
    IN dataType CHAR(1),
    IN dataIDHex VARCHAR(16)
)
BEGIN
    DECLARE dataID BIGINT UNSIGNED;
    SET dataID = CONV(dataIDHex, 16, 10);

    CASE dataType
        WHEN "t" THEN
            SELECT str AS str FROM Texts WHERE (id = dataID);
        -- TODO: Implement more data term types.
        ELSE
            SELECT NULL;
    END CASE;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE selectCreations (
    IN userIDHex VARCHAR(16),
    IN termType CHAR(1),
    IN num INT UNSIGNED,
    IN numOffset INT UNSIGNED,
    IN isAscOrder BOOL
)
BEGIN
    DECLARE userID BIGINT UNSIGNED;
    SET userID = CONV(userIDHex, 16, 10);

    IF (isAscOrder) THEN
        SELECT CONV(term_id, 10, 16) AS termID
        FROM Creators
        WHERE (user_id = userID AND term_t = termType)
        ORDER BY term_id ASC
        LIMIT numOffset, num;
    ELSE
        SELECT CONV(term_id, 10, 16) AS termID
        FROM Creators
        WHERE (user_id = userID AND term_t = termType)
        ORDER BY term_id DESC
        LIMIT numOffset, num;
    END IF;
END //
DELIMITER ;
