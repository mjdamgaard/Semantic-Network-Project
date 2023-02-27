USE mydatabase;


DROP PROCEDURE insertString;
DROP PROCEDURE insertStringWORollback;
DROP PROCEDURE insertOrFindString;
DROP PROCEDURE insertText;
DROP PROCEDURE insertTextWORollback;
DROP PROCEDURE insertOrFindText;
DROP PROCEDURE authorBotInsert;

DROP PROCEDURE insertRels_hasLexItem_and_hasDescription;

DROP PROCEDURE insertTermWODescription;
DROP PROCEDURE insertTerm;



DELETE FROM SemanticInputs;
DELETE FROM Bots;
DELETE FROM Users;

DELETE FROM NextIDPointers;
INSERT INTO NextIDPointers (type_code, next_id_pointer)
VALUES
    (0x00, 0x0000000000000001),
    (0x10, 0x1000000000000001),
    (0x20, 0x2000000000000001),
    (0x30, 0x3000000000000001),
    (0x70, 0x7000000000000001),
    (0x80, 0x8000000000000001),
    (0x90, 0x9000000000000001),
    (0xA0, 0xA000000000000001),
    (0xB0, 0xB000000000000001)
;

DELETE FROM Lists;
DELETE FROM Binaries;
DELETE FROM Blobs;
DELETE FROM Strings;
DELETE FROM Texts;


/* This library is for the basic insert functions used to initialize
 * the semantic tree (adding some fundamental terms).
 * I intend to also write more advanced term insertion functions,
 * but I will then do so in another library so that I can make a
 * term insertion script for the fundamental terms which only depennds
 * on this basic (and more constant) library.
 **/


DELIMITER //
CREATE PROCEDURE insertString (
    IN str VARCHAR(255),
    OUT new_id BIGINT UNSIGNED,
    OUT exit_code TINYINT
)
BEGIN
    DECLARE `_rollback` BOOL DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET `_rollback` = 1;
    START TRANSACTION;
        CALL getNewTermID (0xA0, new_id);
        INSERT INTO Strings (id, str) VALUES (new_id, str);
    IF `_rollback` THEN
        ROLLBACK;
        SET exit_code = 1; -- failure.
    ELSE
        COMMIT;
        SET exit_code = 0; -- success.
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertStringWORollback (
    IN str VARCHAR(255),
    OUT new_id BIGINT UNSIGNED
)
BEGIN
    CALL getNewTermID (0xA0, new_id);
    INSERT INTO Strings (id, str) VALUES (new_id, str);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertOrFindString (
    IN in_str VARCHAR(255),
    OUT new_id BIGINT UNSIGNED,
    OUT exit_code TINYINT -- 0 is successful insertion, 2 is successful find.
)
BEGIN
    SELECT id INTO new_id FROM Strings WHERE str = in_str;
    IF (new_id IS NULL) THEN
        CALL getNewTermID (0xA0, new_id);
        INSERT INTO Strings (id, str) VALUES (new_id, in_str);
        SET exit_code = 0; -- insert.
    ELSE
        SET exit_code = 2; -- find.
    END IF;
END //
DELIMITER ;






DELIMITER //
CREATE PROCEDURE insertText (
    IN str TEXT,
    OUT new_id BIGINT UNSIGNED,
    OUT exit_code TINYINT
)
BEGIN
    DECLARE `_rollback` BOOL DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET `_rollback` = 1;
    START TRANSACTION;
        CALL getNewTermID (0xB0, new_id);
        INSERT INTO Texts (id, str) VALUES (new_id, str);
    IF `_rollback` THEN
        ROLLBACK;
        SET exit_code = 1; -- failure.
    ELSE
        COMMIT;
        SET exit_code = 0; -- success.
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE insertTextWORollback (
    IN str TEXT,
    OUT new_id BIGINT UNSIGNED
)
BEGIN
    CALL getNewTermID (0xB0, new_id);
    INSERT INTO Texts (id, str) VALUES (new_id, str);
END //
DELIMITER ;


DELIMITER //
CREATE PROCEDURE insertOrFindText (
    IN in_str TEXT,
    OUT new_id BIGINT UNSIGNED,
    OUT exit_code TINYINT -- 0 is successful insertion, 2 is successful find.
)
BEGIN
    SELECT id INTO new_id FROM Texts WHERE str = in_str;
    IF (new_id IS NULL) THEN
        CALL getNewTermID (0xB0, new_id);
        INSERT INTO Texts (id, str) VALUES (new_id, in_str);
        SET exit_code = 0; -- insert.
    ELSE
        SET exit_code = 2; -- find.
    END IF;
END //
DELIMITER ;





DELIMITER //
CREATE PROCEDURE authorBotInsert (
    IN s_id BIGINT UNSIGNED,
    IN r_id BIGINT UNSIGNED,
    IN o_id BIGINT UNSIGNED
)
BEGIN
    INSERT INTO SemanticInputs (
        subj_id,
        user_id,
        rel_id,
        obj_id,
        rat_val, opt_data
    )
    VALUES (
        s_id,
        1,
        r_id,
        o_id,
        0x7F, NULL
    );
END //
DELIMITER ;





-- First two relations:

-- use once (then drop procedure).
DELIMITER //
CREATE PROCEDURE insertRels_hasLexItem_and_hasDescription (
    str_lexItem_of_hasLexItem VARCHAR(255),
    str_description_of_hasLexItem TEXT,
    str_lexItem_of_hasDescription VARCHAR(255),
    str_description_of_hasDescription TEXT
)
BEGIN
    CALL getNewTermID (0x30, @TermID_hasLexItem);
    SELECT @TermID_hasLexItem;
    CALL getNewTermID (0x30, @TermID_hasDescription);
    SELECT @TermID_hasDescription;

    CALL insertStringWORollback(
        str_lexItem_of_hasLexItem,
        @StrID_LexItem_of_hasLexItem
    );
    CALL insertTextWORollback(
        str_description_of_hasLexItem,
        @StrID_Description_of_hasLexItem
    );
    CALL insertStringWORollback(
        str_lexItem_of_hasDescription,
        @StrID_LexItem_of_hasDescription
    );
    CALL insertTextWORollback(
        str_description_of_hasDescription,
        @StrID_Description_of_hasDescription
    );


    CALL authorBotInsert (
        @TermID_hasLexItem,
        @TermID_hasLexItem,
        @StrID_LexItem_of_hasLexItem
    );
    CALL authorBotInsert (
        @TermID_hasLexItem,
        @TermID_hasDescription,
        @StrID_Description_of_hasLexItem
    );
    CALL authorBotInsert (
        @TermID_hasDescription,
        @TermID_hasLexItem,
        @StrID_LexItem_of_hasDescription
    );
    CALL authorBotInsert (
        @TermID_hasDescription,
        @TermID_hasLexItem,
        @StrID_Description_of_hasDescription
    );

    IF (@TermID_hasLexItem != 0x3000000000000001) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'TermID_hasLexItem wrong value';
    END IF;
    IF (@TermID_hasDescription != 0x3000000000000002) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'TermID_hasDescription wrong value';
    END IF;
END //
DELIMITER ;




DELIMITER //
CREATE PROCEDURE insertTerm (
    str_lexItem VARCHAR(255),
    str_description TEXT,
    OUT exit_code_lex TINYINT,
    OUT exit_code_dscr TINYINT
)
BEGIN
    CALL getNewTermID (0x30, @TermID_new);

    CALL insertOrFindString (str_LexItem, @StrID_lexItem, exit_code_lex);
    CALL insertOrFindText (str_LexItem, @StrID_description, exit_code_dscr);

    CALL authorBotInsert (
        @TermID_new,
        0x3000000000000001, -- TermID of hasLexItem
        @StrID_lexItem
    );
    CALL authorBotInsert (
        @TermID_new,
        0x3000000000000002, -- TermID of hasDescription
        @StrID_description
    );
END //
DELIMITER ;



DELIMITER //
CREATE PROCEDURE insertTermWODescription (
    str_lexItem VARCHAR(255),
    OUT exit_code_lex TINYINT
)
BEGIN
    CALL getNewTermID (0x30, @TermID_new);

    CALL insertOrFindString (str_LexItem, @StrID_lexItem, exit_code_lex);

    CALL authorBotInsert (
        @TermID_new,
        0x3000000000000001, -- TermID of hasLexItem
        @StrID_lexItem
    );
END //
DELIMITER ;












-- Some testing.

-- CALL insertString ("hello world!", @hello_id, @exit_code);
-- CALL insertString ("hello world!!", @hello_id, @exit_code);
-- CALL insertString ("hello world!! How are you?", @hello_id, @exit_code);
--
-- CALL insertString ("hello world!", @hello_id, @exit_code);
-- -- CALL insertStringWOROllback ("hello world!", @hello_id); -- correct
-- -- -- (throws error).
-- CALL insertOrFindString ("hello world!", @hello_id, @exit_code);
-- -- SELECT @hello_id; SELECT @exit_code; -- correct
-- CALL insertOrFindString ("hello new world!", @hello_id, @exit_code);
-- -- SELECT @hello_id; SELECT @exit_code; -- corret
--
-- -- SET @hello_id = 0xA000000000000000 + 1;
-- -- SELECT @hello_id;
-- -- SELECT @exit_code;







-- function appendSQL_addObjNounRelation($subjType, $objNoun, $objType, $dscrptn) {
--     $sql = "";
--     if (strlen($subjType) != 0) {
--         $sql .= "(".$subjType.") ";
--     }
--     $sql .= "has ".$objNoun . " ";
--     if (strlen($objType) != 0) {
--         $sql .= "(".$objType.") ";
--     }
--     $sql .= "=";
--
--     if (strlen($dscrptn) != 0) {
--
--     }
--
--     return $sql;
-- }
