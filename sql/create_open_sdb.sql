
-- /* Semantic inputs */
-- DROP TABLE SemanticInputs;
-- DROP TABLE PrivateRecentInputs;
-- DROP TABLE RecentInputs;
-- DROP TABLE RecordedInputs;
--
-- /* Terms */
-- DROP TABLE Users;
-- DROP TABLE SemanticContexts;
-- DROP TABLE Terms;
-- DROP TABLE Texts;
-- DROP TABLE Binaries;
--
-- /* Meta data */
-- DROP TABLE PrivateCreators;





/* Statements which the users (or bots) give as input to the semantic network.
 * A central feature of this semantic system is that all such statements come
 * with a numerical value which represents the degree to which the user deems
 * that the statement is correct (like when answering a survey).
 **/
CREATE TABLE SemanticInputs (
    -- user (or bot) who states the statement.
    user_id BIGINT UNSIGNED NOT NULL,
    -- predicate.
    pred_id BIGINT UNSIGNED NOT NULL,
    -- context or ancestor context of all the subjects if these are terms.
    context_id BIGINT UNSIGNED NOT NULL,

    /* The "input set" */
    -- given some constants for the above four columns, the input sets contains
    -- pairs of rating values and the IDs of the predicate subjects.
    rat_val VARBINARY(255) NOT NULL,
    subj_id BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (
        user_id,
        pred_id,
        context_id,
        rat_val,
        subj_id
    ),

    UNIQUE INDEX (user_id, pred_id, context_id, subj_id)
);
-- TODO: Compress this table and its sec. index, as well as some other tables
-- below (at least RecordedInputs). (But compression is a must for this table.)


CREATE TABLE PrivateRecentInputs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    pred_id BIGINT UNSIGNED NOT NULL,
    context_id BIGINT UNSIGNED NOT NULL,
    -- new rating value.
    rat_val VARBINARY(255),
    subj_id BIGINT UNSIGNED NOT NULL,

    live_after TIME
    -- TODO: Make a recurring scheduled event that decrements to days of this
    -- time, and one that continously moves the private RIs to the public table
    -- when the time is up (and when the day part of the time is at 0).
);
CREATE TABLE RecentInputs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    pred_id BIGINT UNSIGNED NOT NULL,
    context_id BIGINT UNSIGNED NOT NULL,
    -- new rating value.
    rat_val VARBINARY(255),
    subj_id BIGINT UNSIGNED NOT NULL,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE RecordedInputs (
    user_id BIGINT UNSIGNED NOT NULL,
    pred_id BIGINT UNSIGNED NOT NULL,
    context_id BIGINT UNSIGNED NOT NULL,
    -- recorded rating value.
    subj_id BIGINT UNSIGNED NOT NULL,

    changed_at DATETIME,

    rat_val VARBINARY(255),

    PRIMARY KEY (
        user_id,
        pred_id,
        context_id,
        subj_id,
        changed_at
    )
);





CREATE TABLE Users (
    -- user ID.
    id BIGINT UNSIGNED PRIMARY KEY,
    -- type = "u".

    -- (I have out-commented these following columns, since they should rather
    -- be part of another table, namely in a private (part of the) database.)
    -- upload_vol_today BIGINT,
    -- download_vol_today BIGINT,
    -- upload_vol_this_month BIGINT,
    -- download_vol_this_month BIGINT,

    username VARCHAR(50),

    public_keys_for_authentication TEXT
    -- (In order for third parties to be able to copy the database and then
    -- be able to have users log on, without the need to exchange passwords
    -- between databases.)
);






-- CREATE TABLE SemanticContexts (
--     -- context ID.
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     -- type = "c".
--
--     -- parent context.
--     parent_context_id BIGINT UNSIGNED NOT NULL,
--     -- ...
--     def_str VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
--
--     def_entity_t CHAR(1) NOT NULL, -- generally the same as parent's.
--
--     UNIQUE INDEX (parent_context_id, def_str)
-- );

CREATE TABLE Terms (
    -- term ID.
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- type = "t".

    -- id of the context which tells how the subsequent columns are to be
    -- interpreted.
    context_id BIGINT UNSIGNED NOT NULL,


    -- defining string of the term.
    def_str VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    -- the specifying entity (nullable), which can define the term more than
    -- just the context and the def_str does (useful for specifying instances of
    -- very broad classes of objects, such as texts, images, comments, and so
    -- on, where it is hard to specify the objects using contexts alone).
    -- Oh, and more importantly, the specifying entities are used to make
    -- predicates from relation--object pairs, which is of course a central
    -- usage in a semantic system: implementing relations.
    def_entity_id BIGINT UNSIGNED,


    derived_term_def_entity_t CHAR(1) NOT NULL,

    UNIQUE INDEX (context_id, def_str, def_entity_id, derived_term_def_entity_t)
);

INSERT INTO Terms (
    context_id, def_str, def_entity_id, derived_term_def_entity_t, id
)
VALUES (
    0, "Terms", NULL, '0', 1
), (
    0,
    "{Subcontexts} that build on their parent Context, $e, with the string, $s",
    NULL,
    't',
    2
), (
    2, "{Users} of the SDB", 1, 'u', 3
), (
    2, "{Texts} of the SDB", 1, 'x', 4
), (
    2, "{Binaries} of the SDB", 1, 'b', 5
);
-- Here, context_id = 0 defines the default semantic context, and it should
-- used for only for the two first Terms here ("Terms" and "{Subcontexts} ...").









CREATE TABLE Texts (
    /* text ID */
    id BIGINT UNSIGNED PRIMARY KEY,
    -- type = "x".

    /* data */
    str TEXT NOT NULL
);

CREATE TABLE Binaries (
    /* binary string ID */
    id BIGINT UNSIGNED PRIMARY KEY,
    -- type = "b".

    /* data */
    bin LONGBLOB NOT NULL
);





-- CREATE TABLE RankedStrings (
--     -- rank.
--     usability_rank CHAR(2) NOT NULL DEFAULT 'Ca', -- rank C, any (no subdivision).
--     -- string.
--     str VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL,
--
--     PRIMARY KEY (usability_rank, str)
-- );

-- CREATE TABLE KeywordStrings (
--     /* keyword string ID */
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     -- type = "k".
--
--     -- keyword string.
--     str VARCHAR(768) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
--     FULLTEXT idx (str)
-- );




CREATE TABLE PrivateCreators (
    term_id BIGINT UNSIGNED PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    INDEX (user_id)
);
