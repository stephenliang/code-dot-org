import PropTypes from 'prop-types';

/**
 * See ApplicationHelper::PUZZLE_PAGE_NONE.
 */
export const PUZZLE_PAGE_NONE = -1;

/**
 * @typedef {Object} Student
 *
 * @property {number} id
 * @property {string} name
 */
export const studentType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired
});

/**
 * @typedef {Object} LevelSchematic
 *
 * @property {string} id The id of the level. It is intentionally
 *   a string (despite always being numerical) because it gets
 *   used as a key in JS objects and is used in the url.
 * @property {string} url
 * @property {string} name
 * @property {string} icon
 * @property {bool} isUnplugged
 * @property {number} levelNumber
 * @property {bool} isConceptLevel
 * @property {string} kind
 * @property {number} pageNumber The page number of the level if
 *   this is a multi-page level, or PUZZLE_PAGE_NONE
 * @property {array} sublevels An optional array of recursive sublevel objects
 */
const levelSchematicShape = {
  id: PropTypes.string.isRequired,
  levelNumber: PropTypes.number,
  bubbleText: PropTypes.string,
  kind: PropTypes.string,
  url: PropTypes.string,
  name: PropTypes.string,
  icon: PropTypes.string,
  isUnplugged: PropTypes.bool,
  isConceptLevel: PropTypes.bool,
  pageNumber: PropTypes.number
  /** sublevels: PropTypes.array */ // See below
};
// Avoid recursive definition
levelSchematicShape.sublevels = PropTypes.arrayOf(
  PropTypes.shape(levelSchematicShape)
);

/**
 * Going forward, we are moving all user-specific data about a level into
 * `studentLevelProgressType`, so our `levelType` will just include "schematic"
 * data that is universal for the level, represented by this type. However, for
 * now we still need to support the legacy type that includes user-specific
 * data, which builds on this type.
 */
export const levelSchematicType = PropTypes.shape(levelSchematicShape);

/**
 * @typedef {Object} LevelWithProgress
 *
 * @property {string} status
 * @property {bool} isLocked
 * @property {bool} isCurrentLevel
 */
export const levelWithProgressType = PropTypes.shape({
  ...levelSchematicShape,
  status: PropTypes.string.isRequired,
  isLocked: PropTypes.bool.isRequired,
  isCurrentLevel: PropTypes.bool
});

/**
 * @typedef {Object} StudentLevelProgress
 *
 * @property {string} status
 * A string enum representing student progress status on a level.
 * See src/util/sharedConstants.LevelStatus.
 * @property {number} result
 * A numerical enum of the TestResult a student received for a level.
 * See src/constants.TestResult.
 * See src/code-studio/activityUtils.activityCssClass for a mapping to status.
 * @property {bool} paired
 * A boolean indicating if a student was paired on a level.
 * @property {number} timeSpent
 * The number of seconds a student spent on a level.
 * @property {number} lastTimestamp
 * A timestamp of the last time a student made progress on a level.
 * @property {array} pages
 * An optional array of recursive progress objects representing progress on
 * individual pages of a multi-page assessment
 */
const studentLevelProgressShape = {
  status: PropTypes.string.isRequired,
  result: PropTypes.number.isRequired,
  paired: PropTypes.bool.isRequired,
  timeSpent: PropTypes.number,
  lastTimestamp: PropTypes.number
  /** pages: PropTypes.array */ // See below
};
// Avoid recursive definition
studentLevelProgressShape.pages = PropTypes.arrayOf(
  PropTypes.shape(studentLevelProgressShape)
);
export const studentLevelProgressType = PropTypes.shape(
  studentLevelProgressShape
);

/*
 * @typedef {Object} scriptProgressType
 *
 * scriptProgressType represents a user's progress in a script.  It is a map of
 * levelId -> studentLevelProgressType objects.
 */
export const scriptProgressType = PropTypes.objectOf(studentLevelProgressType);

/**
 * @typedef {Object} Lesson
 *
 * @property {string} name
 * @property {number} id
 * @property {bool} lockable
 * @property {number} stageNumber
 */
export const lessonType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  lockable: PropTypes.bool.isRequired,
  stageNumber: PropTypes.number,
  lesson_plan_html_url: PropTypes.string,
  isFocusArea: PropTypes.bool.isRequired,
  description_student: PropTypes.string,
  description_teacher: PropTypes.string
});

/**
 * @typedef {Object} StudentLessonProgress
 *
 * @property {number} incompletePercent
 * @property {number} imperfectPercent
 * @property {number} completedPercent
 * @property {number} timeSpent
 * @property {number} lastTimestamp
 */
export const studentLessonProgressType = PropTypes.shape({
  incompletePercent: PropTypes.number.isRequired,
  imperfectPercent: PropTypes.number.isRequired,
  completedPercent: PropTypes.number.isRequired,
  timeSpent: PropTypes.number.isRequired,
  lastTimestamp: PropTypes.number.isRequired
});

/**
 * @typedef {Object} LessonGroup
 *
 * @property {string} displayName
 * @property {number} id
 * @property {array} bigQuestion
 * @property {string} description
 */
export const lessonGroupType = PropTypes.shape({
  id: PropTypes.number,
  displayName: PropTypes.string,
  bigQuestions: PropTypes.string,
  description: PropTypes.string
});
