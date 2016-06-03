'use strict';

/* global Applab */

import FirebaseUtils from './firebaseUtils';

/**
 * Namespace for Firebase storage.
 */
let FirebaseStorage = {};

function getKeysRef(channelId) {
  let kv = FirebaseUtils.getDatabase(channelId).child('storage/keys');
  return kv;
}

function getRecordsRef(channelId, tableName) {
  return FirebaseUtils.getDatabase(channelId).child(`storage/tables/${tableName}/records`);
}

/**
 * @param {string} tableName
 * @returns {Promise<number>} next record id to assign.
 */
function getNextIdPromise(tableName) {
  let lastIdRef = FirebaseUtils.getDatabase(Applab.channelId)
    .child(`counters/tables/${tableName}/last_id`);
  return lastIdRef.transaction(currentValue => (currentValue || 0) + 1)
    .then(transactionData => transactionData.snapshot.val());
}

/**
 * Reads the value associated with the key, accessible to all users of the app.
 * @param {string} key The name of the key.
 * @param {function (Object)} onSuccess Function to call on success with the
       value retrieved from storage.
 * @param {function (string, number)} onError Function to call on error with error msg and http status.
 */
FirebaseStorage.getKeyValue = function (key, onSuccess, onError) {
  let keyRef = getKeysRef(Applab.channelId).child(key);
  keyRef.once("value", object => onSuccess(object.val()), onError);
};

/**
 * Saves the value associated with the key, accessible to all users of the app.
 * @param {string} key The name of the key.
 * @param {Object} value The value to associate with the key.
 * @param {function ()} onSuccess Function to call on success.
 * @param {function (string, number)} onError Function to call on error with error msg and
 *    http status.
 */
FirebaseStorage.setKeyValue = function (key, value, onSuccess, onError) {
  let keyRef = getKeysRef(Applab.channelId).child(key);
  keyRef.set(value).then(onSuccess, onError);
};

function getWriteRecordPromise(tableName, recordId, record) {
  let recordString = record === null ? null : JSON.stringify(record);
  let recordRef = FirebaseUtils.getDatabase(Applab.channelId)
    .child(`storage/tables/${tableName}/records/${recordId}`);
  return recordRef.set(recordString);
}

/**
 * Creates a new record in the specified table, accessible to all users.
 * @param {string} tableName The name of the table to read from.
 * @param {Object} record Object containing other properties to store
 *     on the record.
 * @param {function (Object)} onSuccess Function to call with the new record.
 * @param {function (string, number)} onError Function to call with an error message
 *    and http status in case of failure.
 */
FirebaseStorage.createRecord = function (tableName, record, onSuccess, onError) {
  // Assign a unique id for the new record.
  getNextIdPromise(tableName).then(nextId => {
    record.id = nextId;
    return getWriteRecordPromise(tableName, record.id, record);
  }).then(() => onSuccess(record), onError);
};

/**
 * Returns true if record matches the given search parameters, which are a map
 * from key name to expected value.
 */
function matchesSearch(record, searchParams) {
  let matches = true;
  Object.keys(searchParams || {}).forEach(key => {
    matches = matches && (record[key] === searchParams[key]);
  });
  return matches;
}

/**
 * Reads records which match the searchParams specified by the user,
 * and passes them to onSuccess.
 * @param {string} tableName The name of the table to read from.
 * @param {string} searchParams.id Optional id of record to read.
 * @param {Object} searchParams Other search criteria. Only records
 *     whose contents match all criteria will be returned.
 * @param {function (Array)} onSuccess Function to call with an array of record
       objects.
 * @param {function (string, number)} onError Function to call with an error message
 *     and http status in case of failure.
 */
FirebaseStorage.readRecords = function (tableName, searchParams, onSuccess, onError) {
  let recordsRef = getRecordsRef(Applab.channelId, tableName);

  // Get all records in the table and filter them on the client.
  recordsRef.once('value', recordsSnapshot => {
    let recordMap = recordsSnapshot.val() || {};
    let records = [];
    // Collect all of the records matching the searchParams.
    Object.keys(recordMap).forEach(id => {
      let record = JSON.parse(recordMap[id]);
      if (matchesSearch(record, searchParams)) {
        records.push(record);
      }
    });
    onSuccess(records);
  }, onError);
};

/**
 * Updates a record in a table, accessible to all users.
 * @param {string} tableName The name of the table to update.
 * @param {string} record.id The id of the row to update.
 * @param {Object} record Object containing other properties to update
 *     on the record.
 * @param {function (Object, boolean)} onComplete Function to call on success,
 *     or if the record id is not found.
 * @param {function (string, number)} onError Function to call with an error message
 *     and http status in case of other types of failures.
 */
FirebaseStorage.updateRecord = function (tableName, record, onComplete, onError) {
  // TODO: We need to handle the 404 case, probably by attempting a read.
  getWriteRecordPromise(tableName, record.id, record)
    .then(() => onComplete(record, true), onError);
};

/**
 * Deletes a record from the specified table.
 * @param {string} tableName The name of the table to delete from.
 * @param {string} record.id The id of the record to delete.
 * @param {Object} record Object whose other properties are ignored.
 * @param {function (boolean)} onComplete Function to call on success, or if the
 *     record id is not found.
 * @param {function(string, number)} onError Function to call with an error message
 *     and http status in case of other types of failures.
 */
FirebaseStorage.deleteRecord = function (tableName, record, onComplete, onError) {
  // TODO: We need to handle the 404 case, probably by attempting a read.
  getWriteRecordPromise(tableName, record.id, null).then(() => onComplete(true), onError);
};

/**
 * Listens to tableName for any changes to the data it contains, and calls
 * onRecord with the record and eventType as follows:
 * - for 'create' events, returns the new record
 * - for 'update' events, returns the updated record
 * - for 'delete' events, returns a record containing the id of the deleted record
 * @param {string} tableName Table to listen to.
 * @param {function (Object, RecordListener.EventType)} onRecord Callback to call when
 * a change occurs with the record object (described above) and event type.
 * @param {function (string, number)} onError Callback to call with an error to show to the user and
 *   http status code.
 */
FirebaseStorage.onRecordEvent = function (tableName, onRecord, onError) {
  if (typeof onError !== 'function') {
    throw new Error('onError is a required parameter to FirebaseStorage.onRecordEvent');
  }
  if (!tableName) {
    onError('Error listening for record events: missing required parameter "tableName"', 400);
    return;
  }

  let recordsRef = getRecordsRef(Applab.channelId, tableName);
  // CONSIDER: Do we need to make sure a client doesn't hear about updates that it triggered?

  recordsRef.on('child_added', childSnapshot => {
    onRecord(JSON.parse(childSnapshot.val()), 'create');
  });

  recordsRef.on('child_changed', childSnapshot => {
    onRecord(JSON.parse(childSnapshot.val()), 'update');
  });

  recordsRef.on('child_removed', oldChildSnapshot => {
    onRecord(JSON.parse(oldChildSnapshot.val()), 'delete');
  });
};

FirebaseStorage.resetRecordListener = function () {
  FirebaseUtils.getDatabase(Applab.channelId).off();
};

/**
 * Populates a channel with table data for one or more tables
 * @param {string} jsonData The json data that represents the tables in the format of:
 *   {
 *     "table_name": [{ "name": "Trevor", "age": 30 }, { "name": "Hadi", "age": 72}],
 *     "table_name2": [{ "city": "Seattle", "state": "WA" }, { "city": "Chicago", "state": "IL"}]
 *   }
 * @param {bool} overwrite Whether to overwrite a table if it already exists.
 * @param {function ()} onSuccess Function to call on success.
 * @param {function (string, number)} onError Function to call with an error message
 *    and http status in case of failure.
 */
FirebaseStorage.populateTable = function (jsonData, overwrite, onSuccess, onError) {
  if (!jsonData || !jsonData.length) {
    return;
  }
  // TODO(dave): Respect overwrite
  let promises = [];
  let tablesRef = FirebaseUtils.getDatabase(Applab.channelId).child('storage/tables');
  let tablesMap = JSON.parse(jsonData);
  Object.keys(tablesMap).forEach(tableName => {
    let recordsMap = tablesMap[tableName];
    let recordsRef = tablesRef.child(`${tableName}/records`);
    Object.keys(recordsMap).forEach(recordId => {
      let recordString = JSON.stringify(recordsMap[recordId]);
      promises.push(recordsRef.child(recordId).set(recordString));
    });
  });
  Promise.all(promises).then(onSuccess, onError);
};

/**
 * Populates the key/value store with initial data
 * @param {string} jsonData The json data that represents the tables in the format of:
 *   {
 *     "click_count": 5,
 *     "button_color": "blue"
 *   }
 * @param {bool} overwrite Whether to overwrite a table if it already exists.
 * @param {function ()} onSuccess Function to call on success.
 * @param {function (string, number)} onError Function to call with an error message
 *    and http status in case of failure.
 */
FirebaseStorage.populateKeyValue = function (jsonData, overwrite, onSuccess, onError) {
  if (!jsonData || !jsonData.length) {
    return;
  }
  // TODO(dave): Respect overwrite
  let keysRef = getKeysRef(Applab.channelId);
  let keyValueMap = JSON.parse(jsonData);
  keysRef.update(keyValueMap).then(onSuccess, onError);
};
export default FirebaseStorage;
